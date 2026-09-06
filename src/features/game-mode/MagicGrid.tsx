import { Plus } from "lucide-react";
import { data } from "../../data";
import { locks, type Run } from "../../engine";
import { getMagicTargetBadges, getSortedMagics } from "./selectors";
type Props = {
  run: Run;
  selected: string;
  onFocus: (id: string) => void;
  onRecord: (id: string) => void;
};
export function MagicGrid({ run, selected, onFocus, onRecord }: Props) {
  const used = locks(run);
  return (
    <section className="magic-workspace" aria-label="마법 기록">
      <div className="hud-label">
        <h1>
          MAGIC <span>현재 Run</span>
        </h1>
        <span>살펴보기 · + 기록</span>
      </div>
      <div className="magic-grid">
        {getSortedMagics(run).map((m) => {
          const level = run.levels[m.id] ?? 0;
          const traits = m.traitStages.flatMap((s) =>
            s.traits
              .filter((t) => t.id === run.selectedTraits[m.id]?.[s.level])
              .map((t) => t.nameKo),
          );
          const pending = m.traitStages.some(
            (s) => s.level <= level && !run.selectedTraits[m.id]?.[s.level],
          );
          return (
            <div
              className={`magic-tile ${level > 0 ? "invested" : ""} ${selected === m.id ? "selected" : ""} ${used[m.id] ? "consumed" : ""}`}
              key={m.id}
              data-magic-id={m.id}
            >
              <button
                className="tile-inspect"
                aria-label={`${m.nameKo} 경로 보기`}
                aria-pressed={selected === m.id}
                onClick={() => onFocus(m.id)}
              >
                <strong>{m.nameKo}</strong>
                <span className="tile-value">
                  {used[m.id]
                    ? "✓ 조합됨"
                    : level === m.maxLevel && !pending
                      ? traits.join(" · ") || "특성 선택"
                      : `${level}/${m.maxLevel}`}
                </span>
                <span className="tile-badges">
                  {getMagicTargetBadges(run, m.id).map((b) => (
                    <b className="badge" key={b}>
                      {b}
                    </b>
                  ))}
                </span>
              </button>
              {!used[m.id] && (level < m.maxLevel || pending) && (
                <button
                  className="tile-add"
                  aria-label={`${m.nameKo} 레벨 올리기`}
                  onClick={() => onRecord(m.id)}
                >
                  {pending ? "선택" : <Plus size={18} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="hud-label passive-label">
        <h2>PASSIVE</h2>
      </div>
      <div className="passive-row">
        {data.passives.map((p) => (
          <div className="passive-tile" key={p.id} data-magic-id={p.id}>
            <button
              className="passive-inspect"
              aria-label={`${p.nameKo} 경로 보기`}
              onClick={() => onFocus(p.id)}
            >
              <strong>{p.nameKo}</strong>
              <span>
                {run.levels[p.id] ?? 0}/{p.maxLevel}
              </span>
              {getMagicTargetBadges(run, p.id).map((b) => (
                <b className="badge" key={b}>
                  {b}
                </b>
              ))}
            </button>
            <button
              className="passive-add"
              aria-label={`${p.nameKo} 레벨 올리기`}
              disabled={(run.levels[p.id] ?? 0) >= p.maxLevel}
              onClick={() => onRecord(p.id)}
            >
              <Plus size={18} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
