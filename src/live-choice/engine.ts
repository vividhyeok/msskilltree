import { data, magicById } from "../data";
import { companion } from "../companion/data";
import { normalizeProgress } from "../companion/engine";
import { locks, type Run } from "../engine";
import { getNeededMagicForTargets, targetBadge } from "../features/game-mode/selectors";
import { summarizeEffects } from "../help";
import {
  contextFor,
  evaluateMeta,
  getLiveMeta,
  type Priority,
} from "../meta/engine";
import { getTrackedStats } from "../stats/engine";

export type LiveChoiceKind = "active_magic" | "normal_passive" | "special_passive";

export type LiveChoiceOption = {
  key: string;
  id: string;
  kind: LiveChoiceKind;
  nameKo: string;
  typeLabel: string;
  summary: string;
  role: string;
};

export type RankedLiveChoice = LiveChoiceOption & {
  rank: number;
  label: "목표 우선" | "추천" | "고려" | "상황 따라";
  reasons: string[];
  detail: string;
};

const priorityScore: Record<Priority, number> = {
  core: 60,
  high: 45,
  consider: 24,
  conditional: 8,
  caution: -8,
  unknown: 0,
};

function passivePlain(effect: Record<string, unknown>) {
  const help = summarizeEffects(effect);
  const category = help.categories[0];
  const plain =
    category === "공격"
      ? "적을 더 빠르게 정리하는 쪽의 선택입니다."
      : category === "생존"
        ? "죽을 위험을 낮추는 쪽의 선택입니다."
        : category === "마법 운용"
          ? "마법을 더 자주·넓게·오래 쓰는 데 도움을 줍니다."
          : category === "이동"
            ? "회피와 거리 유지에 도움을 줍니다."
            : category === "제어"
              ? "적의 접근을 늦춰 안전한 공간을 만들기 쉽습니다."
              : category === "성장"
                ? "레벨업과 자원 회수 효율을 높이는 선택입니다."
                : category === "경제"
                  ? "상자·상점 등 Run 자원 효율을 높이는 선택입니다."
                  : "조건에 따라 가치가 달라지는 특수 효과입니다.";
  return { role: help.categories.join(" · "), summary: help.short, plain };
}

export function getLiveChoiceOptions(run: Run): LiveChoiceOption[] {
  if (run.progress?.growthPhase) return [];
  const used = locks(run);
  const progress = normalizeProgress(run.progress);

  const active = data.magics
    .filter((m) => !used[m.id] && (run.levels[m.id] ?? 0) < m.maxLevel)
    .map((m) => ({
      key: `active_magic:${m.id}`,
      id: m.id,
      kind: "active_magic" as const,
      nameKo: m.nameKo,
      typeLabel: "마법",
      summary: m.summary || "레벨과 특성을 올려 공격하거나 조합 재료로 사용하는 마법입니다.",
      role: m.category === "support" ? "지원" : "공격 마법",
    }));

  const normal = companion.normal
    .filter((p) => (run.levels[p.id] ?? 0) < p.maxLevel)
    .map((p) => {
      const help = passivePlain(p.perLevel as Record<string, unknown>);
      return {
        key: `normal_passive:${p.id}`,
        id: p.id,
        kind: "normal_passive" as const,
        nameKo: p.nameKo,
        typeLabel: "일반 패시브",
        summary: `${help.summary}. ${help.plain}`,
        role: help.role,
      };
    });

  const special = companion.special
    .filter((p) => !progress.special.includes(p.id))
    .map((p) => {
      const help = passivePlain(p.effects as Record<string, unknown>);
      return {
        key: `special_passive:${p.id}`,
        id: p.id,
        kind: "special_passive" as const,
        nameKo: p.nameKo,
        typeLabel: "특수 패시브",
        summary: `${help.summary}. ${help.plain}`,
        role: help.role,
      };
    });

  return [...active, ...normal, ...special].sort((a, b) =>
    a.nameKo.localeCompare(b.nameKo, "ko"),
  );
}

function candidateEffects(option: LiveChoiceOption): Record<string, unknown> {
  if (option.kind === "normal_passive")
    return (companion.normal.find((p) => p.id === option.id)?.perLevel ?? {}) as Record<
      string,
      unknown
    >;
  if (option.kind === "special_passive")
    return (companion.special.find((p) => p.id === option.id)?.effects ?? {}) as Record<
      string,
      unknown
    >;
  return {};
}

function metaSignal(option: LiveChoiceOption, run: Run) {
  if (option.kind === "active_magic") {
    return getLiveMeta(run).find((r) => r.magicId === option.id) ?? null;
  }
  if (option.kind === "special_passive") {
    const result = evaluateMeta(`special_passive:${option.id}`, run);
    return result.evidence.length && !result.blocked.length ? result : null;
  }
  return null;
}

export function rankLiveChoices(keys: string[], run: Run): RankedLiveChoice[] {
  const options = getLiveChoiceOptions(run);
  const byKey = new Map(options.map((o) => [o.key, o]));
  const unique = [...new Set(keys)].map((key) => byKey.get(key)).filter(Boolean) as LiveChoiceOption[];
  const needs = getNeededMagicForTargets(run);
  const stats = Object.fromEntries(getTrackedStats(run).map((s) => [s.id, s.value]));
  const context = contextFor(run);

  return unique
    .map((option, inputIndex) => {
      let score = 0;
      const reasons: string[] = [];
      const need = needs.find(
        (n) =>
          n.magicId === option.id &&
          !["ready", "consumed", "blocked"].includes(n.state),
      );
      if (need) {
        score += 100;
        const badges = need.targetCombinationIds
          .map((id) => targetBadge(run, id))
          .filter(Boolean)
          .join("/");
        reasons.push(`${badges || "목표"} 조합에 필요한 ${need.role === "carrier" ? "승계" : need.role === "material" ? "병합" : "조건"} 재료`);
        if (need.requiredTraitName) reasons.push(`필요 특성: ${need.requiredTraitName}`);
      }

      const meta = metaSignal(option, run);
      if (meta) {
        score += priorityScore[meta.priority];
        const rationale = meta.evidence.find((e) => !e.missing.length)?.rule.rationaleKo;
        if (rationale) reasons.push(rationale);
      }

      const effects = candidateEffects(option);
      const critChance = typeof effects.critChancePercent === "number" ? effects.critChancePercent : 0;
      const critMultiplier =
        typeof effects.critMultiplierPercent === "number" ? effects.critMultiplierPercent : 0;
      if (critChance > 0 && (stats.crit_multiplier ?? 0) > 0) {
        score += 16;
        reasons.push("이미 치명타 배율 투자가 있어 치명타율 증가를 활용하기 좋음");
      }
      if (critMultiplier > 0 && (stats.crit_chance ?? 0) > 0) {
        score += 16;
        reasons.push("이미 치명타율 투자가 있어 치명타 배율 증가를 활용하기 좋음");
      }
      if (
        typeof effects.moveSpeedPercent === "number" &&
        effects.moveSpeedPercent > 0 &&
        context.artifacts.includes("accelerator")
      ) {
        score += 18;
        reasons.push("엑셀러레이터 보유 · 이동속도 증가와 직접 연계");
      }
      if (
        context.phase === "early" &&
        ["manaGainPercent", "manaOrbGainPercent", "manaBeadDropPercent", "pickupRangePercent"].some(
          (key) => typeof effects[key] === "number" && (effects[key] as number) > 0,
        )
      ) {
        score += 8;
        reasons.push("초반 성장·자원 회수에 직접 도움");
      }
      if (
        ["late", "ultra_late"].includes(context.phase) &&
        ["maxHpPercent", "hpRegenPerSecondPercent", "damageTakenPercent", "evasionPercent", "revives"].some(
          (key) => typeof effects[key] === "number" && (effects[key] as number) !== 0,
        )
      ) {
        score += 8;
        reasons.push("후반 생존에 직접 영향을 주는 효과");
      }

      const current = run.levels[option.id] ?? 0;
      if (current > 0 && option.kind !== "special_passive") {
        score += 4;
        reasons.push(`이미 Lv.${current} 투자 중`);
      }

      return {
        ...option,
        rank: score,
        label: score >= 100 ? "목표 우선" : score >= 45 ? "추천" : score >= 15 ? "고려" : "상황 따라",
        reasons: reasons.length ? reasons : ["현재 기록만으로 확실한 우선 근거가 부족함"],
        detail: option.summary,
        inputIndex,
      };
    })
    .sort((a, b) => b.rank - a.rank || a.inputIndex - b.inputIndex)
    .map(({ inputIndex: _inputIndex, ...choice }) => choice);
}
