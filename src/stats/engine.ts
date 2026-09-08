import type { Run } from "../engine";
import { companion, passiveName } from "../companion/data";
import { normalizeProgress } from "../companion/engine";
import { normalizeMetaContext } from "../meta/data";
import {
  statRegistry,
  type StatId,
  type StatSnapshot,
  type StatSource,
  type StatSourceKind,
  type StatEntry,
} from "./types";

const additiveStatIds = new Set<StatId>(Object.keys(statRegistry) as StatId[]);

// Effect keys that we intentionally track even if their name is not in the registry.
const recognizedPartialKeys = new Set<string>([
  "executeBelowHpPercent",
  "spawnNormalChests",
  "spawnRelicChests",
  "cooldownPercentPerMoveSpeedGain3",
  "allMagicDamagePercentPerMaxActive",
  "firstHitInstantKillChancePercent",
  "currentAndMaxPlayerLevel",
  "attackAmpPercentPerCurrentLevel2",
  "allNormalPassiveCurrentAndMaxLevel",
  "atFullHpAttackAmpPercent",
  "atFullHpDamageTakenPercent",
  "attackIncreaseMultiplier",
  "attackPercentPerMaxHp20",
  "randomRuneCooldownSeconds",
  "attackAmpPerEpicArtifactPercent",
  "attackAmpPerSpecialArtifactPercent",
  "maxBonusDamageByMissingEnemyHpPercent",
  "chosenAttackMagicDamagePercent",
  "chooseCombatMagicToEnhance",
  "maxPlayerLevel",
  "revives",
  "spawnNormalChest",
  "allGrowthEnhancementLevels",
]);

function addSource(
  entries: Record<StatId, StatEntry>,
  statId: StatId,
  source: StatSource,
) {
  const entry = entries[statId] ?? {
    statId,
    ...statRegistry[statId],
    additive: 0,
    sources: [],
    partial: false,
  };
  entry.additive += source.amount;
  entry.sources.push(source);
  entries[statId] = entry;
}

function recordPartial(
  entries: Record<StatId, StatEntry>,
  statId: StatId,
  source: { kind: StatSourceKind; id: string; name: string; amount?: number },
) {
  const entry = entries[statId] ?? {
    statId,
    ...statRegistry[statId],
    additive: 0,
    sources: [],
    partial: false,
  };
  entry.partial = true;
  entry.sources.push({
    ...source,
    amount: source.amount ?? 0,
    statId,
  });
  entries[statId] = entry;
}

function mergeEffects(
  entries: Record<StatId, StatEntry>,
  effects: Record<string, number | boolean | string[]>,
  kind: StatSource["kind"],
  id: string,
  name: string,
  level: number,
) {
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value !== "number") {
      if (recognizedPartialKeys.has(key)) {
        // Some non-numeric keys still have a numeric meaning that we can't fold exactly.
        recordPartial(entries, "attackAmpPercent" as StatId, {
          kind,
          id,
          name,
        });
      }
      continue;
    }
    if (additiveStatIds.has(key as StatId)) {
      addSource(entries, key as StatId, {
        kind,
        id,
        name,
        amount: value * level,
        statId: key as StatId,
      });
    } else if (recognizedPartialKeys.has(key)) {
      // Numeric but complex scaling; record as partial on the closest stat.
      const mapped: StatId =
        key === "maxPlayerLevel"
          ? "attackAmpPercent"
          : key === "revives"
            ? "maxHpPercent"
            : "attackAmpPercent";
      recordPartial(entries, mapped, { kind, id, name, amount: value * level });
    }
  }
}

export function computeStats(run: Run): StatSnapshot {
  const entries: Record<StatId, StatEntry> = {} as Record<StatId, StatEntry>;
  const meta = normalizeMetaContext(run.meta);

  // Normal passives
  for (const p of companion.normal) {
    const level = run.levels[p.id] ?? 0;
    if (level <= 0) continue;
    mergeEffects(
      entries,
      p.perLevel as unknown as Record<string, number | boolean | string[]>,
      "normalPassive",
      p.id,
      passiveName(p.id),
      level,
    );
  }

  // Special passives
  const progress = normalizeProgress(run.progress);
  for (const p of companion.special) {
    if (!progress.special.includes(p.id)) continue;
    mergeEffects(
      entries,
      p.effects as unknown as Record<string, number | boolean | string[]>,
      "specialPassive",
      p.id,
      p.nameKoCandidate,
      1,
    );
  }

  // Growth
  for (const p of companion.growth) {
    const level = progress.growth[p.id] ?? 0;
    if (level <= 0) continue;
    mergeEffects(
      entries,
      p.perLevel as unknown as Record<string, number | boolean | string[]>,
      "growth",
      p.id,
      passiveName(p.id),
      level,
    );
  }

  // Artifacts
  for (const artifactId of meta.artifacts) {
    const a = companion.artifacts.find((x) => x.id === artifactId);
    if (!a) continue;
    mergeEffects(
      entries,
      a.effects as unknown as Record<string, number | boolean | string[]>,
      "artifact",
      a.id,
      a.nameKo,
      1,
    );
  }

  return {
    stats: entries,
    baseline: {},
    tracked: Object.keys(entries).length > 0,
    hasPartial: Object.values(entries).some((e) => e.partial),
  };
}

export function getStatAccuracy(snapshot: StatSnapshot): "synced" | "tracked" | "partial" {
  if (!snapshot.tracked) return snapshot.baseline.attackAmpPercent !== undefined ? "synced" : "tracked";
  return snapshot.hasPartial ? "partial" : "tracked";
}

export function getStatTotal(snapshot: StatSnapshot, statId: StatId): number {
  return snapshot.stats[statId]?.additive ?? 0;
}

export function getStatSources(snapshot: StatSnapshot, statId: StatId): StatSource[] {
  return snapshot.stats[statId]?.sources ?? [];
}
