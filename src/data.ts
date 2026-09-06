import magics from "../src-data/magics.json";
import originalPassives from "../src-data/passives.json";
import { companion, passiveName } from "./companion/data";
const passives = companion.normal.map((p) => ({
  ...p,
  nameKo: passiveName(p.id),
  nameEn: p.id,
  summary: "",
  combinationRelevant: false,
  ...originalPassives.find((o) => o.id === p.id),
}));
import combinations from "../src-data/combinations.json";
import rules from "../src-data/rules.json";
import metadata from "../src-data/metadata.json";
export type Magic = (typeof magics)[number];
export type ParticipantRole = "carrier" | "material" | "condition";
export type Requirement = {
  type: "activeMagic" | "passiveMagic" | "completedCombination";
  magicId?: string;
  traitId?: string;
  traitStage?: number;
  minLevel?: number;
  combinationId?: string;
  role: string;
};
export function participantRole(requirement: Requirement): ParticipantRole {
  if (requirement.type !== "activeMagic") return "condition";
  return requirement.role === "primary" || requirement.role === "carrier"
    ? "carrier"
    : "material";
}
export const participantLabels: Record<ParticipantRole, string> = {
  carrier: "→ 승계",
  material: "× 병합",
  condition: "◇ 조건",
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
