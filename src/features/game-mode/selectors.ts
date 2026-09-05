import {
  data,
  magicById,
  comboById,
  stageFor,
  type Requirement,
} from "../../data";
import {
  evaluateCombination,
  getMagicPaths,
  locks,
  requirementMet,
  type Run,
} from "../../engine";
export type NeedState =
  "not_owned" | "leveling" | "trait_needed" | "ready" | "blocked" | "consumed";
export type NeededMagic = {
  key: string;
  magicId: string;
  name: string;
  currentLevel: number;
  maxLevel: number;
  requiredLevel: number;
  requiredTraitId?: string;
  requiredTraitName?: string;
  traitStage?: number;
  targetCombinationIds: string[];
  state: NeedState;
};
export const targetBadge = (run: Run, id: string) =>
  run.pinned.includes(id)
    ? String.fromCharCode(65 + run.pinned.indexOf(id))
    : "";
export function describeRequirement(r: Requirement, run: Run) {
  const m =
    r.type === "activeMagic"
      ? magicById[r.magicId!]
      : data.passives.find((p) => p.id === r.magicId);
  const stage = r.type === "activeMagic" ? stageFor(r) : undefined;
  const trait = stage?.traits.find((t) => t.id === r.traitId);
  return {
    name: m?.nameKo ?? comboById[r.combinationId!]?.nameKo,
    currentLevel: run.levels[r.magicId!] ?? 0,
    maxLevel: m?.maxLevel ?? 0,
    requiredLevel: Math.max(r.minLevel ?? 1, stage?.level ?? 1),
    traitName: trait?.nameKo,
    stage: stage?.level,
    met: requirementMet(r, run),
    label:
      r.type === "completedCombination"
        ? `${comboById[r.combinationId!].nameKo} 완료`
        : `${m?.nameKo} ${run.levels[r.magicId!] ?? 0}/${m?.maxLevel}${trait ? ` → ${trait.nameKo}${magicById[r.magicId!]?.traitStages.length > 1 ? ` (Lv.${stage!.level})` : ""}` : ""}`,
  };
}
// Keep distinct trait stages, required levels and blocked/viable goals separate.
// A blocked goal must not make an otherwise viable shared ingredient look blocked.
export function getNeededMagicForTargets(run: Run): NeededMagic[] {
  const result = new Map<string, NeededMagic>();
  const used = locks(run);
  for (const id of run.pinned) {
    const c = comboById[id];
    const evaluation = evaluateCombination(c, run);
    for (const r of c.requirements) {
      if (!r.magicId) continue;
      const info = describeRequirement(r, run);
      const state: NeedState = used[r.magicId]
        ? "consumed"
        : evaluation.status === "BLOCKED"
          ? "blocked"
          : info.met
            ? "ready"
            : info.currentLevel === 0
              ? "not_owned"
              : info.currentLevel < info.requiredLevel
                ? "leveling"
                : "trait_needed";
      const key = [
        r.type,
        r.magicId,
        info.stage ?? "",
        r.traitId ?? "",
        info.requiredLevel,
        state,
      ].join(":");
      const existing = result.get(key);
      if (existing) existing.targetCombinationIds.push(id);
      else
        result.set(key, {
          key,
          magicId: r.magicId,
          name: info.name,
          currentLevel: info.currentLevel,
          maxLevel: info.maxLevel,
          requiredLevel: info.requiredLevel,
          requiredTraitId: r.traitId,
          requiredTraitName: info.traitName,
          traitStage: info.stage,
          targetCombinationIds: [id],
          state,
        });
    }
  }
  return [...result.values()];
}
export function getFocusedMagicPaths(run: Run, id: string) {
  if (!magicById[id]) return [];
  return getMagicPaths(id).map((path) => ({
    ...path,
    combinations: path.combinations.map((c) => ({
      id: c.id,
      name: c.nameKo,
      badge: targetBadge(run, c.id),
      ...evaluateCombination(c, run),
      partners: c.requirements
        .filter((r) => r.magicId !== id)
        .map((r) => describeRequirement(r, run)),
    })),
  }));
}
export function getMagicTargetBadges(run: Run, id: string) {
  return run.pinned
    .filter((cid) => comboById[cid].requirements.some((r) => r.magicId === id))
    .map((cid) => targetBadge(run, cid));
}
