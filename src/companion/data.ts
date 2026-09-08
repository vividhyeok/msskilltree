import normal from "../../src-data/game-data/v0.992/normal-passives.json";
import special from "../../src-data/game-data/v0.992/special-passives.json";
import artifacts from "../../src-data/game-data/v0.992/artifacts.json";
import synergies from "../../src-data/game-data/v0.992/synergies.json";
import growth from "../../src-data/v4-research/data/authoritative/growth-enhancements.v0.992.json";
import classes from "../../src-data/v4-research/data/authoritative/classes.v0.992.json";
import subjects from "../../src-data/v4-research/data/authoritative/subjects.v0.992.json";
import ultimates from "../../src-data/v4-research/data/authoritative/ultimates.v0.992.json";

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
  return p?.nameKo ?? id;
};

export const artifactName = (id: string) =>
  artifacts.items.find((a) => a.id === id)?.nameKo ?? id;

export function synergyProgress(inventory: string[]) {
  const owned = new Set(inventory);
  return synergies.items.map((s) => {
    const missing = s.requirements.filter((id) => !owned.has(id));
    return {
      ...s,
      missing,
      remaining: missing.length,
      complete: missing.length === 0,
    };
  });
}

export function validateCompanionRuntimeData() {
  const errors: string[] = [];
  const artifactIds = new Set(artifacts.items.map((a) => a.id));
  const unique = (label: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) errors.push(`${label} 중복 ID`);
  };
  unique("일반 패시브", normal.items.map((x) => x.id));
  unique("특수 패시브", special.items.map((x) => x.id));
  unique("아티팩트", artifacts.items.map((x) => x.id));
  unique("시너지", synergies.items.map((x) => x.id));

  for (const s of synergies.items)
    for (const id of s.requirements)
      if (!artifactIds.has(id))
        errors.push(`${s.nameKo}: 아티팩트 참조 누락 ${id}`);

  if (normal.items.some((x) => !x.nameKo) || special.items.some((x) => !x.nameKo))
    errors.push("한국어 런타임 명칭 누락");

  return errors;
}
