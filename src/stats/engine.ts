import type { Run } from "../engine";
import { companion, synergyProgress } from "../companion/data";
import { normalizeProgress } from "../companion/engine";
import { normalizeMetaContext } from "../meta/data";

export type TrackedOperation = "additive" | "multiplicative";
export type TrackedStatId =
  | "attack"
  | "attack_amp"
  | "all_magic_damage"
  | "combination_magic_damage"
  | "cooldown"
  | "magic_size"
  | "duration"
  | "crit_chance"
  | "crit_multiplier"
  | "max_hp"
  | "hp_regen"
  | "damage_taken"
  | "evade"
  | "move_speed"
  | "enemy_move_speed"
  | "enemy_max_hp"
  | "mana_gain"
  | "mana_orb_gain"
  | "mana_orb_drop"
  | "pickup_range";

type Spec = {
  id: TrackedStatId;
  nameKo: string;
  key: string;
  operation: TrackedOperation;
  unit: "%";
  partialWhenNegative?: boolean;
};

export const trackedStatSpecs: Spec[] = [
  { id: "attack", nameKo: "공격력", key: "attackPercent", operation: "additive", unit: "%" },
  { id: "attack_amp", nameKo: "공격력 증폭", key: "attackAmplificationPercent", operation: "additive", unit: "%" },
  { id: "all_magic_damage", nameKo: "모든 마법 피해량", key: "allMagicDamagePercent", operation: "additive", unit: "%" },
  { id: "combination_magic_damage", nameKo: "조합 마법 피해량", key: "combinationMagicDamagePercent", operation: "additive", unit: "%" },
  { id: "cooldown", nameKo: "모든 마법 쿨타임", key: "cooldownPercent", operation: "multiplicative", unit: "%" },
  { id: "magic_size", nameKo: "모든 마법 크기", key: "magicSizePercent", operation: "additive", unit: "%" },
  { id: "duration", nameKo: "모든 마법 지속시간", key: "durationPercent", operation: "additive", unit: "%" },
  { id: "crit_chance", nameKo: "치명타율", key: "critChancePercent", operation: "additive", unit: "%" },
  { id: "crit_multiplier", nameKo: "치명타 배율", key: "critMultiplierPercent", operation: "additive", unit: "%" },
  { id: "max_hp", nameKo: "최대 체력", key: "maxHpPercent", operation: "additive", unit: "%", partialWhenNegative: true },
  { id: "hp_regen", nameKo: "초당 체력회복률", key: "hpRegenPerSecondPercent", operation: "additive", unit: "%" },
  { id: "damage_taken", nameKo: "받는 피해량", key: "damageTakenPercent", operation: "multiplicative", unit: "%" },
  { id: "evade", nameKo: "회피율", key: "evasionPercent", operation: "additive", unit: "%" },
  { id: "move_speed", nameKo: "이동속도", key: "moveSpeedPercent", operation: "additive", unit: "%" },
  { id: "enemy_move_speed", nameKo: "모든 적 이동속도", key: "enemyMoveSpeedPercent", operation: "multiplicative", unit: "%" },
  { id: "enemy_max_hp", nameKo: "적의 최대 체력", key: "enemyMaxHpPercent", operation: "additive", unit: "%" },
  { id: "mana_gain", nameKo: "마나 획득량", key: "manaGainPercent", operation: "additive", unit: "%" },
  { id: "mana_orb_gain", nameKo: "마나 구슬 획득량", key: "manaOrbGainPercent", operation: "additive", unit: "%" },
  { id: "mana_orb_drop", nameKo: "마나 구슬 드랍률", key: "manaBeadDropPercent", operation: "additive", unit: "%" },
  { id: "pickup_range", nameKo: "아이템 획득반경", key: "pickupRangePercent", operation: "additive", unit: "%" },
];

type EffectSource = {
  name: string;
  effects: Record<string, unknown>;
  multiplier: number;
};

export type TrackedStat = Spec & {
  value: number;
  sources: { name: string; value: number }[];
  partial: boolean;
};

function effectSources(run: Run): EffectSource[] {
  const p = normalizeProgress(run.progress);
  const context = normalizeMetaContext(run.meta);
  const activeSynergies = synergyProgress(context.artifacts).filter((s) => s.complete);
  return [
    ...companion.normal
      .filter((x) => (run.levels[x.id] ?? 0) > 0)
      .map((x) => ({
        name: x.nameKo,
        effects: x.perLevel as Record<string, unknown>,
        multiplier: run.levels[x.id] ?? 0,
      })),
    ...companion.special
      .filter((x) => p.special.includes(x.id))
      .map((x) => ({ name: x.nameKo, effects: x.effects as Record<string, unknown>, multiplier: 1 })),
    ...companion.growth
      .filter((x) => (p.growth[x.id] ?? 0) > 0)
      .map((x) => ({
        name: `${companion.normal.find((n) => n.id === x.id)?.nameKo ?? x.id} · 성장`,
        effects: x.perLevel as Record<string, unknown>,
        multiplier: p.growth[x.id] ?? 0,
      })),
    ...companion.artifacts
      .filter((x) => context.artifacts.includes(x.id))
      .map((x) => ({ name: x.nameKo, effects: x.effects as Record<string, unknown>, multiplier: 1 })),
    ...activeSynergies.map((x) => ({
      name: `${x.nameKo} · 시너지`,
      effects: x.effects as Record<string, unknown>,
      multiplier: 1,
    })),
  ];
}

export function getTrackedStats(run: Run): TrackedStat[] {
  const sources = effectSources(run);
  return trackedStatSpecs
    .map((spec) => {
      const values: { name: string; value: number }[] = [];
      let partial = false;
      for (const source of sources) {
        const raw = source.effects[spec.key];
        if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
        const value = raw * source.multiplier;
        if (spec.partialWhenNegative && value < 0) {
          partial = true;
          continue;
        }
        values.push({ name: source.name, value });
      }
      const value =
        spec.operation === "multiplicative"
          ? (values.reduce((factor, item) => factor * (1 + item.value / 100), 1) - 1) * 100
          : values.reduce((sum, item) => sum + item.value, 0);
      return { ...spec, value, sources: values, partial };
    })
    .filter((stat) => stat.sources.length || stat.partial);
}

export function formatTrackedValue(value: number) {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
  return `${value > 0 ? "+" : ""}${Number(rounded)}%`;
}
