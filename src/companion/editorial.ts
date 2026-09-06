import phases from "../../src-data/v4-research/data/meta/phase-dependent-artifacts.v0.992.json";
// These are source opinions, deliberately excluded from deterministic eligibility.
export function phaseOpinion(
  id: string,
  seconds: number | null,
): string | null {
  const item = phases.items.find((i) => i.artifactId === id);
  if (!item || seconds === null) return null;
  const minutes = seconds / 60;
  if (item.after57_30)
    return `AtWiki 시간대 평가: ${minutes >= 57.5 ? item.after57_30.tier : item.early.tier} · 57분 30초 이후 고평가`;
  if (item.after40)
    return `AtWiki 시간대 평가: ${minutes >= 40 ? item.after40.tier : minutes >= 25 ? "가치 하락" : item.early.tier} · 마나 수집 목적`;
  return `AtWiki 시간대 평가: 초반 ${item.early.tier} / 후반 ${item.late?.tier} · 후반에는 시너지 재료 용도`;
}
