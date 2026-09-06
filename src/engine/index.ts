import {
  data,
  magicById,
  comboById,
  stageFor,
  requirementLabel,
  type Combination,
  type Requirement,
  participantRole,
  type ParticipantRole,
} from "../data";
import type { MetaContext } from "../meta/data";
export type Run = {
  meta?: MetaContext;
  levels: Record<string, number>;
  selectedTraits: Record<string, Record<number, string>>;
  completed: string[];
  pinned: string[];
  bonus: boolean;
};
export type Status =
  "READY" | "IN_PROGRESS" | "AVAILABLE" | "BLOCKED" | "COMPLETED";
export const emptyRun = (): Run => ({
  levels: {},
  selectedTraits: {},
  completed: [],
  pinned: [],
  bonus: false,
});
export function applyEffects(run: Run) {
  const effects = run.completed.flatMap((id) => comboById[id].effects);
  return {
    slots:
      data.rules.combinationSlots.baseMaximum +
      (run.bonus
        ? data.rules.combinationSlots.knownBonusArtifact.addSlots
        : 0) +
      effects
        .filter((e) => e.type === "addCombinationSlots")
        .reduce((n, e) => n + Number(e.value), 0),
    used: run.completed.reduce((n, id) => n + comboById[id].slotCost, 0),
    blocked: effects.some(
      (e) => e.type === "blockFurtherCombinations" && e.value,
    ),
    extraLevels: effects
      .filter((e) => e.type === "addMaxPlayerLevel")
      .reduce((n, e) => n + Number(e.value), 0),
    disabled: effects.some(
      (e) => e.type === "disableNonCombinationActiveMagic" && e.value,
    ),
  };
}
export function locks(run: Run) {
  return Object.fromEntries(
    run.completed.flatMap((id) =>
      comboById[id].activeMagicLocks.map((m) => [m, id]),
    ),
  );
}
export type CompletedMagicState = {
  magicId: string;
  combinationId: string;
  role: Exclude<ParticipantRole, "condition">;
  carrierIds: string[];
  materialIds: string[];
};
// Completion provenance is separate from reusability: both active roles stay locked.
// Meta rules can use these roles later without guessing which artifact effects survive.
export function completedMagicStates(
  run: Run,
): Record<string, CompletedMagicState> {
  const states: Record<string, CompletedMagicState> = {};
  for (const combinationId of run.completed) {
    const c = comboById[combinationId];
    const active = c.requirements.filter((r) => r.type === "activeMagic");
    const carrierIds = [
      ...new Set(
        active
          .filter((r) => participantRole(r) === "carrier")
          .map((r) => r.magicId!),
      ),
    ];
    const materialIds = [
      ...new Set(
        active
          .filter((r) => participantRole(r) === "material")
          .map((r) => r.magicId!),
      ),
    ];
    for (const r of active)
      states[r.magicId!] = {
        magicId: r.magicId!,
        combinationId,
        role: participantRole(r) as "carrier" | "material",
        carrierIds,
        materialIds,
      };
  }
  return states;
}
export function requirementMet(r: Requirement, run: Run) {
  if (r.type === "completedCombination")
    return run.completed.includes(r.combinationId!);
  const stage = r.type === "activeMagic" && r.traitId ? stageFor(r) : undefined;
  return (
    (run.levels[r.magicId!] ?? 0) >=
      Math.max(r.minLevel ?? 1, stage?.level ?? 1) &&
    (!stage || run.selectedTraits[r.magicId!]?.[stage.level] === r.traitId)
  );
}
export function getBlockedReason(c: Combination, run: Run) {
  const reasons: string[] = [];
  const state = applyEffects(run);
  const used = locks(run);
  if (state.blocked)
    reasons.push("특수 조합 효과로 이후 조합이 차단되었습니다.");
  if (state.used + c.slotCost > state.slots)
    reasons.push("남은 조합 슬롯이 없습니다.");
  for (const condition of c.conditions) {
    if (
      condition.type === "combinationOrder" &&
      run.completed.length + 1 !== condition.value
    )
      reasons.push(
        `${condition.value}번째 조합에서만 완성할 수 있습니다. 현재 ${run.completed.length + 1}번째입니다.`,
      );
  }
  for (const r of c.requirements) {
    if (r.type === "completedCombination" && !requirementMet(r, run))
      reasons.push(`${requirementLabel(r)}가 필요합니다.`);
    if (r.type === "activeMagic") {
      if (used[r.magicId!])
        reasons.push(
          `${magicById[r.magicId!].nameKo}: '${comboById[used[r.magicId!]].nameKo}'에 이미 사용됨`,
        );
      const stage = stageFor(r);
      const selected = stage && run.selectedTraits[r.magicId!]?.[stage.level];
      if (r.traitId && selected && selected !== r.traitId)
        reasons.push(
          `${magicById[r.magicId!].nameKo}: '${stage?.traits.find((t) => t.id === selected)?.nameKo}' 선택됨. 필요: ${requirementLabel(r)}`,
        );
    }
  }
  return reasons;
}
export function evaluateCombination(c: Combination, run: Run) {
  const missing = c.requirements.filter((r) => !requirementMet(r, run));
  const reasons = run.completed.includes(c.id) ? [] : getBlockedReason(c, run);
  const status: Status = run.completed.includes(c.id)
    ? "COMPLETED"
    : reasons.length
      ? "BLOCKED"
      : !missing.length
        ? "READY"
        : c.requirements.some((r) =>
              r.type === "completedCombination"
                ? requirementMet(r, run)
                : (run.levels[r.magicId!] ?? 0) > 0,
            )
          ? "IN_PROGRESS"
          : "AVAILABLE";
  return { status, reasons, missing };
}
export function completeCombination(run: Run, id: string): Run {
  if (evaluateCombination(comboById[id], run).status !== "READY")
    throw new Error("아직 완성할 수 없는 조합입니다.");
  return { ...run, completed: [...run.completed, id] };
}
export function getCombinationConflicts(run: Run) {
  const result: { a: string; b: string; message: string }[] = [];
  run.pinned.forEach((a, i) =>
    run.pinned.slice(i + 1).forEach((b) => {
      const shared = comboById[a].activeMagicLocks.filter((id) =>
        comboById[b].activeMagicLocks.includes(id),
      );
      if (shared.length)
        result.push({
          a,
          b,
          message: `${shared.map((id) => magicById[id].nameKo).join(", ")} 공통 사용 · 동시 달성 불가`,
        });
    }),
  );
  return result;
}
export function getMagicPaths(id: string) {
  return magicById[id].traitStages
    .flatMap((s) =>
      s.traits.map((t) => ({
        stage: s.level,
        trait: t,
        combinations: data.combinations.filter((c) =>
          c.requirements.some(
            (r) =>
              r.magicId === id &&
              r.traitId === t.id &&
              stageFor(r)?.level === s.level,
          ),
        ),
      })),
    )
    .filter((p) => p.combinations.length);
}
export function getRelevantCombinations(run: Run, selected: string) {
  const rank = (c: Combination) => {
    const e = evaluateCombination(c, run);
    return run.pinned.includes(c.id)
      ? 0
      : e.status === "READY"
        ? 1
        : e.status === "IN_PROGRESS" &&
            c.requirements.some((r) => r.magicId === selected)
          ? 2
          : e.missing.length === 1 && e.status !== "BLOCKED"
            ? 3
            : e.status === "BLOCKED"
              ? 6
              : e.status === "COMPLETED"
                ? 5
                : 4;
  };
  return [...data.combinations].sort((a, b) => rank(a) - rank(b));
}
export function validateGameData(d = data) {
  const assert = (ok: unknown, message: string) => {
    if (!ok) throw new Error(`데이터 오류: ${message}`);
  };
  for (const list of [d.magics, d.passives, d.combinations])
    assert(new Set(list.map((x) => x.id)).size === list.length, "중복 ID");
  for (const m of d.magics) {
    assert(
      new Set(m.traitStages.map((s) => s.level)).size === m.traitStages.length,
      `${m.id} 중복 단계`,
    );
    for (const s of m.traitStages) {
      assert(s.level <= m.maxLevel, `${m.id} 단계 레벨`);
      assert(
        new Set(s.traits.map((t) => t.id)).size === s.traits.length,
        `${m.id} 중복 특성`,
      );
    }
  }
  for (const c of d.combinations) {
    assert(
      Number.isInteger(c.slotCost) && c.slotCost >= 0,
      `${c.id} 슬롯 비용`,
    );
    for (const r of c.requirements) {
      assert(
        r.type === "activeMagic"
          ? ["primary", "carrier", "material"].includes(r.role)
          : r.role === "condition",
        `${c.id} 참여 역할`,
      );
      assert(
        ["activeMagic", "passiveMagic", "completedCombination"].includes(
          r.type,
        ),
        `${c.id} 알 수 없는 requirement`,
      );
      if (r.type === "activeMagic") {
        const m = d.magics.find((m) => m.id === r.magicId);
        assert(m, `${c.id} 마법 참조`);
        if (r.traitId)
          assert(
            m?.traitStages.some(
              (s) =>
                (!r.traitStage || s.level === r.traitStage) &&
                s.traits.some((t) => t.id === r.traitId),
            ),
            `${c.id} 특성/단계 참조`,
          );
      }
      if (r.type === "passiveMagic")
        assert(
          d.passives.some((p) => p.id === r.magicId),
          `${c.id} 패시브 참조`,
        );
      if (r.type === "completedCombination")
        assert(
          d.combinations.some((x) => x.id === r.combinationId),
          `${c.id} 조합 참조`,
        );
    }
    const participants = [
      ...new Set(
        c.requirements
          .filter((r) => r.type === "activeMagic")
          .map((r) => r.magicId),
      ),
    ].sort();
    assert(
      JSON.stringify([...c.activeMagicLocks].sort()) ===
        JSON.stringify(participants),
      `${c.id} 잠금 불일치`,
    );
    for (const e of c.effects)
      assert(
        [
          "addCombinationSlots",
          "addMaxPlayerLevel",
          "blockFurtherCombinations",
          "disableNonCombinationActiveMagic",
        ].includes(e.type),
        `${c.id} 알 수 없는 effect`,
      );
    for (const cond of c.conditions)
      assert(cond.type === "combinationOrder", `${c.id} 알 수 없는 condition`);
  }
}
