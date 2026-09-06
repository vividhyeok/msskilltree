import { data, magicById, comboById } from "../data";
import { emptyRun, type Run } from "../engine";
import { normalizeProgress } from "../companion/engine";
import { defaultMetaContext, normalizeMetaContext } from "../meta/data";
export type Build = { id: string; name: string; pinned: string[] };
export type Saved = {
  version: 1;
  run: Run;
  history: Run[];
  builds: Build[];
  filter: string;
  audit: Record<string, { status: string; note: string }>;
};
export const fresh = (): Saved => ({
  version: 1,
  run: { ...emptyRun(), meta: defaultMetaContext() },
  history: [],
  builds: [],
  filter: "all",
  audit: {},
});
function validRun(run: Run) {
  if (
    !run ||
    !run.levels ||
    !run.selectedTraits ||
    !Array.isArray(run.completed) ||
    !Array.isArray(run.pinned) ||
    typeof run.bonus !== "boolean"
  )
    return false;
  return (
    [...run.completed, ...run.pinned].every((id) => !!comboById[id]) &&
    new Set(run.completed).size === run.completed.length &&
    Object.entries(run.levels).every(([id, n]) => {
      const m = magicById[id] ?? data.passives.find((p) => p.id === id);
      return m && Number.isInteger(n) && n >= 0 && n <= m.maxLevel;
    }) &&
    Object.entries(run.selectedTraits).every(
      ([id, stages]) =>
        magicById[id] &&
        Object.entries(stages).every(
          ([level, trait]) =>
            Number(level) <= (run.levels[id] ?? 0) &&
            magicById[id].traitStages.some(
              (s) =>
                s.level === Number(level) &&
                s.traits.some((t) => t.id === trait),
            ),
        ),
    )
  );
}
export function deserialize(raw: string): Saved {
  const s = JSON.parse(raw) as Saved;
  if (
    s.version !== 1 ||
    !validRun(s.run) ||
    !Array.isArray(s.history) ||
    !s.history.every(validRun) ||
    !Array.isArray(s.builds) ||
    !s.builds.every(
      (b) =>
        typeof b.name === "string" &&
        Array.isArray(b.pinned) &&
        b.pinned.every((id) => !!comboById[id]),
    ) ||
    !s.audit ||
    typeof s.audit !== "object"
  )
    throw new Error("저장 데이터 형식이나 게임 버전이 맞지 않습니다.");
  const normalize = (run: Run): Run => ({
    ...run,
    ...(run.meta === undefined ? {} : { meta: normalizeMetaContext(run.meta) }),
    ...(run.progress === undefined
      ? {}
      : { progress: normalizeProgress(run.progress) }),
  });
  return {
    ...s,
    run: normalize(s.run),
    history: s.history.slice(-30).map(normalize),
  };
}
export const serialize = (s: Saved) => JSON.stringify(s);
export const STORAGE_KEY = "ms-companion-v1";
