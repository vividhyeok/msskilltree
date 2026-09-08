export type StatId =
  | "attackPercent"
  | "attackAmpPercent"
  | "allMagicDamagePercent"
  | "magicDamagePercent"
  | "critChancePercent"
  | "critMultiplierPercent"
  | "cooldownPercent"
  | "maxHpPercent"
  | "lifeOrbHealPercent"
  | "damageTakenPercent"
  | "evasionPercent"
  | "moveSpeedPercent"
  | "manaGainPercent"
  | "pickupRangePercent"
  | "magicSizePercent"
  | "durationPercent"
  | "enemyMoveSpeedPercent"
  | "enemyMaxHpPercent"
  | "hpRegenPerSecondPercent"
  | "runeDurationPercent";

export type StatSourceKind =
  | "normalPassive"
  | "specialPassive"
  | "growth"
  | "artifact"
  | "class"
  | "subject"
  | "research"
  | "enchant"
  | "synced";

export type StatSource = {
  kind: StatSourceKind;
  id: string;
  name: string;
  amount: number;
  statId: StatId;
};

export type StatEntry = {
  statId: StatId;
  nameKo: string;
  unit: "%" | "pt";
  additive: number;
  sources: StatSource[];
  partial: boolean;
};

export type StatSnapshot = {
  stats: Record<StatId, StatEntry>;
  baseline: {
    attackAmpPercent?: number;
  };
  tracked: boolean;
  hasPartial: boolean;
};

export type StatAccuracy = "synced" | "tracked" | "partial";

export const statAccuracyLabel: Record<StatAccuracy, string> = {
  synced: "동기화됨",
  tracked: "기록분만",
  partial: "일부 미계산",
};

export const statRegistry: Record<
  StatId,
  { nameKo: string; unit: "%" | "pt" }
> = {
  attackPercent: { nameKo: "공격력", unit: "%" },
  attackAmpPercent: { nameKo: "공격력 증폭", unit: "%" },
  allMagicDamagePercent: { nameKo: "전체 마법 피해", unit: "%" },
  magicDamagePercent: { nameKo: "해당 마법 피해", unit: "%" },
  critChancePercent: { nameKo: "치명타율", unit: "%" },
  critMultiplierPercent: { nameKo: "치명타 배율", unit: "%" },
  cooldownPercent: { nameKo: "재사용 대기시간", unit: "%" },
  maxHpPercent: { nameKo: "최대 체력", unit: "%" },
  lifeOrbHealPercent: { nameKo: "생명 구슬 회복", unit: "%" },
  damageTakenPercent: { nameKo: "받는 피해", unit: "%" },
  evasionPercent: { nameKo: "회피", unit: "%" },
  moveSpeedPercent: { nameKo: "이동속도", unit: "%" },
  manaGainPercent: { nameKo: "마나 획득", unit: "%" },
  pickupRangePercent: { nameKo: "획득반경", unit: "%" },
  magicSizePercent: { nameKo: "마법 크기", unit: "%" },
  durationPercent: { nameKo: "지속 시간", unit: "%" },
  enemyMoveSpeedPercent: { nameKo: "적 이동속도", unit: "%" },
  enemyMaxHpPercent: { nameKo: "적 최대 체력", unit: "%" },
  hpRegenPerSecondPercent: { nameKo: "초당 체력 회복", unit: "%" },
  runeDurationPercent: { nameKo: "룬 지속 시간", unit: "%" },
};
