import normal from "../../src-data/v4-research/data/authoritative/normal-passives.v0.992.json";
import special from "../../src-data/v4-research/data/authoritative/special-passives.v0.992.json";
import growth from "../../src-data/v4-research/data/authoritative/growth-enhancements.v0.992.json";
import classes from "../../src-data/v4-research/data/authoritative/classes.v0.992.json";
import subjects from "../../src-data/v4-research/data/authoritative/subjects.v0.992.json";
import ultimates from "../../src-data/v4-research/data/authoritative/ultimates.v0.992.json";
import artifacts from "../../src-data/v4-research/data/authoritative/artifact-priority-seed.v0.992.json";
import synergies from "../../src-data/v4-research/data/authoritative/synergy-priority-seed.v0.992.json";
export const companion = {
  normal: normal.items,
  special: special.items,
  growth: growth.items,
  classes: classes.items,
  subjects: subjects.items,
  ultimates: ultimates.items,
  artifacts: artifacts.items,
  synergies: synergies.items,
};
export const passiveName = (id: string) => {
  const p = normal.items.find((p) => p.id === id);
  return p?.nameKo ?? p?.nameKoCandidate ?? id;
};
// Editorial tier fields remain in the source snapshot; no feasibility calculation uses them.
export function synergyProgress(inventory: string[]) {
  const owned = new Set(inventory);
  const credit = synergies.items
    .find((s) => s.id === "magnum_opus")!
    .requirements.every((id) => owned.has(id))
    ? 1
    : 0;
  return synergies.items.map((s) => {
    const missing = s.requirements.filter((id) => !owned.has(id));
    return {
      ...s,
      missing,
      remaining: Math.max(
        0,
        missing.length - (s.id === "magnum_opus" ? 0 : credit),
      ),
    };
  });
}
