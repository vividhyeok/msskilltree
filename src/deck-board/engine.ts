import { data, comboById } from "../data";
import { evaluateCombination, type Run } from "../engine";
import { metaData } from "../meta/data";

type RawArchetype = {
  id: string;
  nameKo: string;
  patch?: string;
  goals?: string[];
  core?: string[];
  recommended?: string[];
  commonSupport?: string[];
  confidence?: string;
  notesKo?: string;
  sourceIds?: string[];
};

export type DeckProfile = {
  id: string;
  nameKo: string;
  patch: string;
  confidence: string;
  notesKo: string;
  goals: string[];
  combinationIds: string[];
  coreCombinationIds: string[];
  magicIds: string[];
  coreMagicIds: string[];
  supportMagicIds: string[];
  sourceCount: number;
};

export type DeckCompatibility = DeckProfile & {
  score: number;
  directMatches: string[];
  adjacentMatches: string[];
  blocked: boolean;
  label: "매우 잘 맞음" | "갈 수 있음" | "관련 있음" | "탐색" | "경로 충돌";
};

const archetypes = metaData.archetypes as unknown as RawArchetype[];
const activeMappings = metaData.integration.activeMappings as Record<
  string,
  { magicId: string; traitId?: string; traitStage?: number }
>;

function combinationMagicIds(id: string) {
  return comboById[id]?.requirements
    .map((requirement) => requirement.magicId)
    .filter((value): value is string => Boolean(value)) ?? [];
}

function refMagicIds(ref: string) {
  if (ref.startsWith("combination:"))
    return combinationMagicIds(ref.slice("combination:".length));
  if (ref.startsWith("active:")) {
    const mapped = activeMappings[ref.slice("active:".length)];
    return mapped?.magicId ? [mapped.magicId] : [];
  }
  return [];
}

function refCombinationId(ref: string) {
  if (!ref.startsWith("combination:")) return null;
  const id = ref.slice("combination:".length);
  return comboById[id] ? id : null;
}

const unique = <T,>(values: T[]) => [...new Set(values)];

export function getDeckProfiles(): DeckProfile[] {
  return archetypes.map((archetype) => {
    const coreRefs = archetype.core ?? [];
    const optionalRefs = [
      ...(archetype.recommended ?? []),
      ...(archetype.commonSupport ?? []),
    ];
    const coreCombinationIds = unique(
      coreRefs.map(refCombinationId).filter((id): id is string => Boolean(id)),
    );
    const combinationIds = unique(
      [...coreRefs, ...optionalRefs]
        .map(refCombinationId)
        .filter((id): id is string => Boolean(id)),
    );
    const coreMagicIds = unique(coreRefs.flatMap(refMagicIds));
    const supportMagicIds = unique(optionalRefs.flatMap(refMagicIds));
    return {
      id: archetype.id,
      nameKo: archetype.nameKo,
      patch: archetype.patch ?? metaData.patch.targetGameVersion,
      confidence: archetype.confidence ?? "unknown",
      notesKo: archetype.notesKo ?? "",
      goals: archetype.goals ?? [],
      combinationIds,
      coreCombinationIds,
      coreMagicIds,
      supportMagicIds,
      magicIds: unique([...coreMagicIds, ...supportMagicIds]),
      sourceCount: archetype.sourceIds?.length ?? 0,
    };
  });
}

const profileCache = getDeckProfiles();

function shareCombination(a: string, b: string) {
  if (a === b) return false;
  return data.combinations.some((combination) => {
    const ids = combinationMagicIds(combination.id);
    return ids.includes(a) && ids.includes(b);
  });
}

export function rankDecks(
  selectedMagicIds: string[],
  run: Run,
): DeckCompatibility[] {
  const selected = unique(selectedMagicIds).filter((id) =>
    data.magics.some((magic) => magic.id === id),
  );
  return profileCache
    .map((profile) => {
      const directMatches = selected.filter((id) => profile.magicIds.includes(id));
      const adjacentMatches = selected.filter(
        (id) =>
          !profile.magicIds.includes(id) &&
          profile.magicIds.some((profileId) => shareCombination(id, profileId)),
      );
      const blocked = profile.coreCombinationIds.some(
        (id) => evaluateCombination(comboById[id], run).status === "BLOCKED",
      );
      const coreHits = directMatches.filter((id) => profile.coreMagicIds.includes(id)).length;
      const supportHits = directMatches.length - coreHits;
      const denominator = Math.max(1, Math.min(4, selected.length || 1));
      const evidence = coreHits * 3 + supportHits * 2 + adjacentMatches.length;
      const score = selected.length
        ? Math.min(1, evidence / (denominator * 2.4))
        : 0.36 + Math.min(0.18, profile.sourceCount * 0.025);
      const label: DeckCompatibility["label"] = blocked
        ? "경로 충돌"
        : !selected.length
          ? "탐색"
          : score >= 0.72
            ? "매우 잘 맞음"
            : score >= 0.42
              ? "갈 수 있음"
              : score >= 0.16
                ? "관련 있음"
                : "탐색";
      return {
        ...profile,
        score: blocked ? 0 : score,
        directMatches,
        adjacentMatches,
        blocked,
        label,
      };
    })
    .sort(
      (a, b) =>
        Number(a.blocked) - Number(b.blocked) ||
        b.score - a.score ||
        b.sourceCount - a.sourceCount ||
        a.nameKo.localeCompare(b.nameKo, "ko"),
    );
}

export function magicDeckHeat(
  focusMagicId: string,
  candidateMagicId: string,
) {
  if (!focusMagicId) return 0;
  if (focusMagicId === candidateMagicId) return 1;
  const sharedDecks = profileCache.filter(
    (profile) =>
      profile.magicIds.includes(focusMagicId) &&
      profile.magicIds.includes(candidateMagicId),
  ).length;
  const directCombo = shareCombination(focusMagicId, candidateMagicId) ? 1 : 0;
  const maxShared = Math.max(
    1,
    ...data.magics.map(
      (magic) =>
        profileCache.filter(
          (profile) =>
            profile.magicIds.includes(focusMagicId) &&
            profile.magicIds.includes(magic.id),
        ).length,
    ),
  );
  return Math.min(1, sharedDecks / maxShared + directCombo * 0.45);
}

export function pinnedConflictMagicIds(run: Run) {
  const targetSets = run.pinned
    .map((id) => comboById[id])
    .filter(Boolean)
    .map((combination) => new Set(combinationMagicIds(combination.id)));
  if (!targetSets.length) return new Set<string>();
  const conflicts = new Set<string>();
  for (const combination of data.combinations) {
    if (run.pinned.includes(combination.id)) continue;
    const ids = combinationMagicIds(combination.id);
    if (
      targetSets.some((target) => ids.some((id) => target.has(id)))
    ) {
      ids.forEach((id) => conflicts.add(id));
    }
  }
  return conflicts;
}

export function deckTargetIds(profile: DeckProfile) {
  return profile.combinationIds.slice(0, 3);
}
