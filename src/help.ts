export type EffectHelp = {
  categories: string[];
  short: string;
};

const effectLabels: Record<string, string> = {
  attackPercent: "공격력",
  attackAmplificationPercent: "공격력 증폭",
  attackAmpPercent: "공격력 증폭",
  allMagicDamagePercent: "모든 마법 피해량",
  combinationMagicDamagePercent: "조합 마법 피해량",
  magicDamagePercent: "해당 마법 피해량",
  cooldownPercent: "모든 마법 쿨타임",
  artifactCooldownPercent: "아티팩트 쿨타임",
  durationPercent: "모든 마법 지속시간",
  runeDurationPercent: "룬 효과 지속시간",
  magicSizePercent: "모든 마법 크기",
  critChancePercent: "치명타율",
  critMultiplierPercent: "치명타 배율",
  maxHpPercent: "최대 체력",
  hpRegenPerSecondPercent: "초당 체력회복률",
  lifeOrbHealPercent: "생명의 구슬 회복량",
  damageTakenPercent: "받는 피해량",
  evasionPercent: "회피율",
  moveSpeedPercent: "이동속도",
  enemyMoveSpeedPercent: "적 이동속도",
  enemyMaxHpPercent: "적 최대 체력",
  eliteMaxHpPercent: "엘리트 최대 체력",
  manaGainPercent: "마나 획득량",
  manaOrbGainPercent: "마나 구슬 획득량",
  manaBeadDropPercent: "마나 구슬 드랍률",
  pickupRangePercent: "아이템 획득반경",
  merchantDiscountPercent: "상인 할인",
  revives: "부활 횟수",
  maxPlayerLevel: "최대 레벨",
  currentPlayerLevel: "현재 레벨",
  currentAndMaxPlayerLevel: "현재·최대 레벨",
  allGrowthEnhancementLevels: "성장 패시브 레벨",
  spawnNormalChest: "일반 보물상자",
};

const effectCategory: Record<string, string> = {
  attackPercent: "공격",
  attackAmplificationPercent: "공격",
  attackAmpPercent: "공격",
  allMagicDamagePercent: "공격",
  combinationMagicDamagePercent: "공격",
  magicDamagePercent: "공격",
  critChancePercent: "공격",
  critMultiplierPercent: "공격",
  cooldownPercent: "마법 운용",
  artifactCooldownPercent: "마법 운용",
  durationPercent: "마법 운용",
  runeDurationPercent: "마법 운용",
  magicSizePercent: "마법 운용",
  maxHpPercent: "생존",
  hpRegenPerSecondPercent: "생존",
  lifeOrbHealPercent: "생존",
  damageTakenPercent: "생존",
  evasionPercent: "생존",
  revives: "생존",
  moveSpeedPercent: "이동",
  enemyMoveSpeedPercent: "제어",
  enemyMaxHpPercent: "공격",
  eliteMaxHpPercent: "공격",
  manaGainPercent: "성장",
  manaOrbGainPercent: "성장",
  manaBeadDropPercent: "성장",
  pickupRangePercent: "성장",
  maxPlayerLevel: "성장",
  currentPlayerLevel: "성장",
  currentAndMaxPlayerLevel: "성장",
  allGrowthEnhancementLevels: "성장",
  merchantDiscountPercent: "경제",
  spawnNormalChest: "경제",
};

function formatValue(key: string, value: number) {
  const suffix = key.includes("Percent") ? "%" : "";
  return `${effectLabels[key] ?? key} ${value > 0 ? "+" : ""}${value}${suffix}`;
}

export function summarizeEffects(effect: Record<string, unknown>): EffectHelp {
  const entries = Object.entries(effect).filter(([, value]) => typeof value === "number");
  const categories = [
    ...new Set(entries.map(([key]) => effectCategory[key]).filter(Boolean)),
  ];
  const parts = entries
    .slice(0, 3)
    .map(([key, value]) => formatValue(key, value as number));
  return {
    categories: categories.length ? categories : ["특수 효과"],
    short: parts.length ? parts.join(" · ") : "조건부·특수 효과 · 상세 설명 확인",
  };
}

export function participantRoleHelp(role: "carrier" | "material" | "condition") {
  if (role === "carrier")
    return {
      label: "승계",
      description: "조합을 완성한 뒤 결과 마법으로 이어지는 핵심 마법입니다.",
    };
  if (role === "material")
    return {
      label: "병합",
      description: "조합을 완성하면 병합되어 원본을 다시 사용할 수 없는 재료 마법입니다.",
    };
  return {
    label: "조건",
    description: "조합을 열기 위해 필요한 보조 조건입니다.",
  };
}
