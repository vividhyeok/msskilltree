import magics from "../src-data/magics.json";
import passives from "../src-data/passives.json";
import combinations from "../src-data/combinations.json";
import rules from "../src-data/rules.json";
import metadata from "../src-data/metadata.json";
export type Magic = (typeof magics)[number];
export type Requirement = {
  type: "activeMagic" | "passiveMagic" | "completedCombination";
  magicId?: string;
  traitId?: string;
  traitStage?: number;
  minLevel?: number;
  combinationId?: string;
  role: string;
};
export type Combination = {
  id: string;
  nameKo: string;
  requirements: Requirement[];
  activeMagicLocks: string[];
  slotCost: number;
  conditions: { type: string; value: number }[];
  effects: { type: string; value: number | boolean }[];
  verification: { status: string; gameVersion: string };
  note?: string;
};
export const data = {
  magics,
  passives,
  combinations: combinations as Combination[],
  rules,
  metadata,
};
export const magicById = Object.fromEntries(magics.map((m) => [m.id, m]));
export const comboById = Object.fromEntries(
  data.combinations.map((c) => [c.id, c]),
);
export function stageFor(r: Requirement) {
  return magicById[r.magicId!]?.traitStages.find((s) =>
    r.traitStage
      ? s.level === r.traitStage
      : s.traits.some((t) => t.id === r.traitId),
  );
}
export function requirementLabel(r: Requirement) {
  if (r.type === "completedCombination")
    return `${comboById[r.combinationId!]?.nameKo} 완료`;
  const m =
    r.type === "activeMagic"
      ? magicById[r.magicId!]
      : passives.find((p) => p.id === r.magicId);
  return `${m?.nameKo} · ${r.traitId ? stageFor(r)?.traits.find((t) => t.id === r.traitId)?.nameKo : `Lv.${r.minLevel ?? 1}`}`;
}
