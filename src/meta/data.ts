import rawRules from "../../src-data/community-meta/current/rules.json";
import originalEntities from "../../src-data/community-meta/current/entities.json";
import { companion } from "../companion/data";

const merge = <T extends { id: string; nameKo: string }>(
  old: T[],
  next: { id: string; nameKo: string }[],
): T[] => [
  ...old.map((o) => {
    const verified = next.find((n) => n.id === o.id);
    return verified ? ({ ...o, ...verified } as T) : o;
  }),
  ...next.filter((n) => !old.some((o) => o.id === n.id)).map((n) => n as T),
];

const artifacts = merge(originalEntities.artifacts, companion.artifacts);
const artifactIds = new Set(artifacts.map((a) => a.id));
const missingArtifactRefs = [
  ...new Set(companion.synergies.flatMap((s) => s.requirements)),
].filter((id) => !artifactIds.has(id));

const entities = {
  ...originalEntities,
  classes: merge(originalEntities.classes, companion.classes),
  subjects: merge(originalEntities.subjects, companion.subjects),
  ultimates: merge(originalEntities.ultimates, companion.ultimates),
  artifacts: [
    ...artifacts,
    ...missingArtifactRefs.map((id) => ({
      id,
      nameKo: `데이터 누락 · ${id}`,
    })),
  ],
  synergies: merge(originalEntities.synergies, companion.synergies),
};

import archetypes from "../../src-data/community-meta/current/archetypes.json";
import phases from "../../src-data/community-meta/current/phases.json";
import sources from "../../src-data/community-meta/current/sources.json";
import patch from "../../src-data/community-meta/current/patch.json";
import integration from "../../src-data/community-meta/current/integration.json";

export type MetaRule = {
  id: string;
  patch: string;
  kind: string;
  subject: { type: string; id?: string; members?: string[] };
  relation: string;
  context: Record<string, string | string[]>;
  strength: string;
  confidence: "high" | "medium_high" | "medium" | "medium_low" | "low";
  rationaleKo: string;
  caveatKo?: string;
  sourceIds: string[];
  reviewStatus?: "still_valid" | "changed" | "unknown" | "obsolete";
};
export type MetaPatch = {
  datasetVersion: string;
  createdAt: string;
  targetGameVersion: string;
  officialGameVersion?: string;
  status: string;
  nextPatchWatch?: {
    version: string;
    reportedReleaseDate: string;
    sourceIds: string[];
    action: string;
  } | null;
  coverage: Record<string, string>;
  important?: string;
};
export type MetaDataset = {
  rules: MetaRule[];
  entities: typeof entities;
  archetypes: typeof archetypes;
  phases: typeof phases;
  sources: typeof sources;
  patch: MetaPatch;
  integration: typeof integration;
};
export const metaData: MetaDataset = {
  rules: rawRules as unknown as MetaRule[],
  entities,
  archetypes,
  phases,
  sources,
  patch,
  integration,
};

export type MetaContext = {
  goal: string;
  archetype: string;
  phase: string;
  gameVersion: string;
  class: string;
  subject: string;
  ultimate: string;
  map: string;
  artifacts: string[];
  synergies: string[];
  remainingPicks: number | null;
  tileOrder: "fixed" | "invested";
};
export const defaultMetaContext = (): MetaContext => ({
  goal: "",
  archetype: "",
  phase: "",
  gameVersion: "",
  class: "",
  subject: "",
  ultimate: "",
  map: "",
  artifacts: [],
  synergies: [],
  remainingPicks: null,
  tileOrder: "fixed",
});

// Old saves keep their existing order; invalid optional context never erases a Run.
export function normalizeMetaContext(value: unknown): MetaContext {
  const base = defaultMetaContext();
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ...base, tileOrder: "invested" };
  const v = value as Record<string, unknown>;
  const member = (key: string, options: { id: string }[]) =>
    options.some((o) => o.id === v[key]) ? String(v[key]) : "";
  const list = (key: string, options: { id: string }[]) =>
    Array.isArray(v[key])
      ? [
          ...new Set(
            (v[key] as unknown[]).filter(
              (id): id is string =>
                typeof id === "string" && options.some((o) => o.id === id),
            ),
          ),
        ]
      : [];
  return {
    goal: member("goal", integration.goalOptions),
    archetype: member("archetype", archetypes),
    phase: member("phase", phases),
    class: member("class", entities.classes),
    subject: member("subject", entities.subjects),
    ultimate: member("ultimate", entities.ultimates),
    map: ["terra", "terra_hard"].includes(String(v.map)) ? String(v.map) : "",
    gameVersion:
      typeof v.gameVersion === "string" &&
      /^\d+\.\d+(?:\.\d+)?$/.test(v.gameVersion)
        ? v.gameVersion
        : "",
    artifacts: list("artifacts", entities.artifacts),
    synergies: list("synergies", entities.synergies),
    remainingPicks:
      typeof v.remainingPicks === "number" &&
      Number.isInteger(v.remainingPicks) &&
      v.remainingPicks >= 0 &&
      v.remainingPicks <= 200
        ? v.remainingPicks
        : null,
    tileOrder: v.tileOrder === "fixed" ? "fixed" : "invested",
  };
}
