import type { Run } from "../engine";
import { companion } from "./data";
export type Progress = {
  growthPhase: boolean;
  growth: Record<string, number>;
  special: string[];
  playerLevel: number | null;
  cityCleared: boolean;
  elapsed: number;
  startedAt: number | null;
};
export const defaultProgress = (): Progress => ({
  growthPhase: false,
  growth: {},
  special: [],
  playerLevel: null,
  cityCleared: false,
  elapsed: 0,
  startedAt: null,
});
export function normalizeProgress(value: unknown): Progress {
  const p = (
    value && typeof value === "object" ? value : {}
  ) as Partial<Progress>;
  const growth: Record<string, number> = {};
  let remaining = 50;
  for (const item of companion.growth) {
    const n = p.growth?.[item.id];
    if (typeof n === "number" && Number.isInteger(n) && n >= 0) {
      growth[item.id] = Math.min(n, item.maxLevel, remaining);
      remaining -= growth[item.id];
    }
  }
  return {
    growthPhase: p.growthPhase === true,
    growth,
    special: Array.isArray(p.special)
      ? [
          ...new Set(
            p.special.filter((id) =>
              companion.special.some((s) => s.id === id),
            ),
          ),
        ]
      : [],
    playerLevel:
      typeof p.playerLevel === "number" &&
      Number.isInteger(p.playerLevel) &&
      p.playerLevel >= 1 &&
      p.playerLevel <= 200
        ? p.playerLevel
        : null,
    cityCleared: p.cityCleared === true,
    elapsed:
      typeof p.elapsed === "number" &&
      Number.isFinite(p.elapsed) &&
      p.elapsed >= 0
        ? p.elapsed
        : 0,
    startedAt:
      typeof p.startedAt === "number" &&
      Number.isFinite(p.startedAt) &&
      p.startedAt > 0
        ? p.startedAt
        : null,
  };
}
export const elapsedSeconds = (p: Progress, now = Date.now()) =>
  p.elapsed +
  (p.startedAt === null ? 0 : Math.max(0, (now - p.startedAt) / 1000));
export const timerPhase = (seconds: number) =>
  seconds < 900
    ? "early"
    : seconds < 2400
      ? "mid"
      : seconds < 3600
        ? "late"
        : "ultra_late";
export function recordGrowth(run: Run, id: string): Run {
  const p = normalizeProgress(run.progress);
  const item = companion.growth.find((s) => s.id === id);
  if (
    !p.growthPhase ||
    !item ||
    (p.growth[id] ?? 0) >= item.maxLevel ||
    Object.values(p.growth).reduce((a, b) => a + b, 0) >= 50
  )
    return run;
  return {
    ...run,
    progress: { ...p, growth: { ...p.growth, [id]: (p.growth[id] ?? 0) + 1 } },
  };
}
export function ultimateRequirements(run: Run, id: string) {
  const u = companion.ultimates.find((u) => u.id === id);
  if (!u) return [];
  const p = normalizeProgress(run.progress);
  return [
    {
      label: "필수 조합",
      id: u.requiredCombinationId,
      met: run.completed.includes(u.requiredCombinationId),
    },
    {
      label: "클래스",
      id: u.requiredClassId,
      met: u.requiredClassId === null || run.meta?.class === u.requiredClassId,
    },
    {
      label: "실험체",
      id: u.requiredSubjectId,
      met:
        (run.meta?.subject === "archaeologist_subject"
          ? "archaeologist"
          : run.meta?.subject) === u.requiredSubjectId,
    },
    { label: "도시 클리어", id: "", met: p.cityCleared },
    {
      label: "레벨 100 선택 기회",
      id: "",
      met: p.playerLevel === 100 && !p.growthPhase,
    },
  ];
}
