import type { Run } from "../engine";
import { data, magicById, comboById } from "../data";
import {
  evaluateCombination,
  locks,
  completedMagicStates,
  applyEffects,
} from "../engine";
import { companion, passiveName, synergyProgress } from "../companion/data";
import { normalizeProgress, recordGrowth } from "../companion/engine";
import { normalizeMetaContext, metaData } from "../meta/data";
import {
  contextFor,
  evaluateMeta,
  getLiveMeta,
  rankArtifacts,
} from "../meta/engine";
import { computeStats, getStatTotal } from "../stats/engine";
import { statRegistry } from "../stats/types";
import type { Decision, DecisionCategory } from "./types";

// Lower number = higher priority.
const CATEGORY_ORDER: Record<DecisionCategory, number> = {
  activeMagic: 1,
  synergyArtifact: 2,
  artifact: 3,
  specialPassive: 4,
  normalPassive: 5,
  growth: 6,
};

function categoryLabel(c: DecisionCategory): string {
  switch (c) {
    case "activeMagic":
      return "액티브 마법";
    case "normalPassive":
      return "일반 패시브";
    case "specialPassive":
      return "특수 패시브";
    case "growth":
      return "성장강화";
    case "artifact":
      return "유물";
    case "synergyArtifact":
      return "유물";
  }
}

function impactFromEffects(
  effects: Record<string, number | boolean | string[]>,
  level = 1,
) {
  return Object.entries(effects)
    .filter(([, v]) => typeof v === "number")
    .map(([statId, v]) => {
      const reg = statRegistry[statId as keyof typeof statRegistry];
      return {
        statId,
        nameKo: reg?.nameKo ?? statId,
        delta: (v as number) * level,
        unit: reg?.unit ?? "%",
      };
    });
}

function activeMagicDecisions(run: Run): Decision[] {
  const used = locks(run);
  const byMagic = new Map<string, Decision>();
  const pinnedIds = new Set(run.pinned);

  for (const c of data.combinations) {
    if (run.completed.includes(c.id)) continue;
    const e = evaluateCombination(c, run);
    if (e.status === "BLOCKED") continue;
    for (const r of c.requirements) {
      if (r.type !== "activeMagic" || !r.magicId) continue;
      const m = magicById[r.magicId];
      if (!m) continue;
      if (used[r.magicId]) continue;
      const current = run.levels[r.magicId] ?? 0;
      const stage = r.traitId
        ? m.traitStages.find((s) => s.traits.some((t) => t.id === r.traitId))
        : undefined;
      const required = Math.max(r.minLevel ?? 1, stage?.level ?? 1);
      if (current >= required) continue;
      const isCarrier = r.role === "primary" || r.role === "carrier";
      const isPinnedTarget = pinnedIds.has(c.id);
      const existing = byMagic.get(r.magicId);
      const label = isCarrier
        ? `${c.nameKo} 승계 재료`
        : `${c.nameKo} 병합 재료`;
      if (existing) {
        if (!existing.reasons.some((x) => x.label === label)) {
          existing.reasons.push({ label });
        }
        // Pinned target material gets higher priority.
        if (isPinnedTarget) existing.priority = CATEGORY_ORDER.activeMagic;
        continue;
      }
      byMagic.set(r.magicId, {
        id: r.magicId,
        ref: `active:${r.magicId}`,
        name: m.nameKo,
        category: "activeMagic",
        priority: isPinnedTarget
          ? CATEGORY_ORDER.activeMagic
          : CATEGORY_ORDER.activeMagic + 1,
        reasons: [{ label }],
        action: "+1 기록",
      });
    }
  }

  // Include active support recommendations from meta when unlocked and not already listed.
  for (const rec of getLiveMeta(run).filter((r) => r.magicId)) {
    if (used[rec.magicId!]) continue;
    if (run.levels[rec.magicId!] ?? 0 > 0) continue;
    if (byMagic.has(rec.magicId!)) continue;
    byMagic.set(rec.magicId!, {
      id: rec.magicId!,
      ref: rec.ref,
      name: rec.name,
      category: "activeMagic",
      priority: CATEGORY_ORDER.activeMagic + 2,
      reasons: [{ label: rec.evidence[0]?.rule.rationaleKo ?? "상황별 추천" }],
      action: "+1 기록",
    });
  }

  return [...byMagic.values()]
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "ko"))
    .slice(0, 6);
}

function normalPassiveDecisions(run: Run): Decision[] {
  const progress = normalizeProgress(run.progress);
  if (progress.growthPhase) return [];
  const snapshot = computeStats(run);
  return companion.normal
    .filter((p) => (run.levels[p.id] ?? 0) < p.maxLevel)
    .map((p) => {
      const level = (run.levels[p.id] ?? 0) + 1;
      const impact = impactFromEffects(
        p.perLevel as unknown as Record<string, number | boolean | string[]>,
      );
      const reasons: Decision["reasons"] = [];
      for (const { statId, delta, nameKo } of impact) {
        const current = getStatTotal(snapshot, statId as import("../stats/types").StatId);
        const low = statId === "cooldownPercent" || statId === "moveSpeedPercent";
        if (low && Math.abs(current) < 20) {
          reasons.push({
            label: `${nameKo} 보완`,
            detail: `현재 ${current}%`,
          });
        }
      }
      if (!reasons.length) {
        reasons.push({
          label: "선택 시 스탯 변화",
          detail: impact.map((i) => `${i.nameKo} ${i.delta > 0 ? "+" : ""}${i.delta}${i.unit}`).join(" · "),
        });
      }
      return {
        id: p.id,
        ref: `normalPassive:${p.id}`,
        name: passiveName(p.id),
        category: "normalPassive",
        priority: CATEGORY_ORDER.normalPassive,
        reasons,
        action: "+1 기록",
        impact,
      };
    });
}

function specialPassiveDecisions(run: Run): Decision[] {
  const progress = normalizeProgress(run.progress);
  if (progress.growthPhase) return [];
  return companion.special
    .filter((p) => !progress.special.includes(p.id))
    .map((p) => {
      const impact = impactFromEffects(
        p.effects as unknown as Record<string, number | boolean | string[]>,
      );
      return {
        id: p.id,
        ref: `specialPassive:${p.id}`,
        name: p.nameKoCandidate,
        category: "specialPassive",
        priority: CATEGORY_ORDER.specialPassive,
        reasons: [
          {
            label: "특수 패시브",
            detail: impact.length
              ? impact
                  .map((i) => `${i.nameKo} ${i.delta > 0 ? "+" : ""}${i.delta}${i.unit}`)
                  .join(" · ")
              : "선택형 효과",
          },
        ],
        action: "선택 기록",
        impact,
      };
    });
}

function growthDecisions(run: Run): Decision[] {
  const progress = normalizeProgress(run.progress);
  if (!progress.growthPhase) return [];
  const total = Object.values(progress.growth).reduce((a, b) => a + b, 0);
  return companion.growth
    .filter((p) => (progress.growth[p.id] ?? 0) < p.maxLevel)
    .map((p) => {
      const impact = impactFromEffects(
        p.perLevel as unknown as Record<string, number | boolean | string[]>,
      );
      return {
        id: p.id,
        ref: `growth:${p.id}`,
        name: passiveName(p.id),
        category: "growth",
        priority: CATEGORY_ORDER.growth,
        reasons: [
          {
            label: "MAX 성장강화",
            detail: `${total} / 50회`,
          },
        ],
        action: "+1 기록",
        impact,
        disabled: total >= 50,
        disabledReason: total >= 50 ? "성장강화 총 횟수 초과" : undefined,
      };
    });
}

function artifactDecisions(run: Run): Decision[] {
  const context = contextFor(run);
  const options = metaData.entities.artifacts
    .filter((a) => !context.artifacts.includes(a.id))
    .map((a) => a.id);
  const ranked = rankArtifacts(options, run);
  const result: Decision[] = [];
  for (const r of ranked.slice(0, 8)) {
    const id = r.ref.split(":")[1];
    const before = synergyProgress(context.artifacts);
    const after = synergyProgress([...context.artifacts, id]);
    const completes = after.filter(
      (s) =>
        s.remaining === 0 && before.find((b) => b.id === s.id)!.remaining > 0,
    );
    const reasons: Decision["reasons"] = [];
    if (completes.length) {
      reasons.push({
        label: `이걸 먹으면 ${completes.map((s) => s.nameKo).join(", ")} 완성`,
      });
    }
    if (r.evidence[0] && !r.evidence[0].missing.length) {
      reasons.push({ label: r.evidence[0].rule.rationaleKo });
    }
    if (!reasons.length) {
      reasons.push({ label: "상황별 유물 후보" });
    }
    result.push({
      id,
      ref: r.ref,
      name: r.name,
      category: completes.length ? "synergyArtifact" : "artifact",
      priority: completes.length
        ? CATEGORY_ORDER.synergyArtifact
        : CATEGORY_ORDER.artifact,
      reasons,
      action: "유물 기록",
    });
  }
  return result;
}

export function getLiveDecisions(run: Run): Decision[] {
  const active = activeMagicDecisions(run).slice(0, 3);
  const normal = normalPassiveDecisions(run);
  const special = specialPassiveDecisions(run);
  const growth = growthDecisions(run);
  const artifacts = artifactDecisions(run).slice(0, 3);

  // Round-robin mix so one category does not dominate the glance view.
  const byCategory: Record<DecisionCategory, Decision[]> = {
    activeMagic: active,
    synergyArtifact: artifacts.filter((d) => d.category === "synergyArtifact"),
    artifact: artifacts.filter((d) => d.category === "artifact"),
    specialPassive: special,
    normalPassive: normal,
    growth,
  };

  const mixed: Decision[] = [];
  const categories: DecisionCategory[] = [
    "activeMagic",
    "synergyArtifact",
    "artifact",
    "specialPassive",
    "normalPassive",
    "growth",
  ];
  let added = true;
  while (added) {
    added = false;
    for (const cat of categories) {
      const next = byCategory[cat].shift();
      if (next) {
        mixed.push(next);
        added = true;
      }
    }
  }

  return mixed;
}

export function applyDecision(run: Run, decision: Decision): Run {
  switch (decision.category) {
    case "activeMagic":
    case "normalPassive":
      return {
        ...run,
        levels: {
          ...run.levels,
          [decision.id]: Math.min(
            (run.levels[decision.id] ?? 0) + 1,
            companion.normal.find((p) => p.id === decision.id)?.maxLevel ??
              magicById[decision.id]?.maxLevel ??
              99,
          ),
        },
      };
    case "specialPassive": {
      const p = normalizeProgress(run.progress);
      return {
        ...run,
        progress: { ...p, special: [...p.special, decision.id] },
      };
    }
    case "growth":
      return recordGrowth(run, decision.id);
    case "artifact":
    case "synergyArtifact": {
      const meta = normalizeMetaContext(run.meta);
      return { ...run, meta: { ...meta, artifacts: [...meta.artifacts, decision.id] } };
    }
  }
}
