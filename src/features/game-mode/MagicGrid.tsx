import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { data, comboById } from "../../data";
import { completedMagicStates, locks, type Run } from "../../engine";
import {
  getMagicTargetBadges,
  getSortedMagics,
  getNeededMagicForTargets,
  targetBadge,
} from "./selectors";
import { TargetBadge } from "../../components/GameState";
type Props = {
  run: Run;
  selected: string;
  onFocus: (id: string) => void;
  onRecord: (id: string) => void;
  contextBar?: ReactNode;
};
export function MagicGrid({
  run,
  selected,
  onFocus,
  onRecord,
  contextBar,
}: Props) {
  const used = locks(run);
  const completed = completedMagicStates(run);
  const needed = new Set(
    getNeededMagicForTargets(run)
      .filter((n) =>
        ["not_owned", "leveling", "trait_needed"].includes(n.state),
      )
      .map((n) => n.magicId),
  );
  return (
    <section className="magic-workspace" aria-label="마법 기록">
      <div className="hud-label">
        <h1>
          MAGIC <span>현재 Run</span>
        </h1>
        <span className="game-state-legend">→ 승계 · × 병합 · + 기록</span>
      </div>
      {contextBar}
      <div className="magic-grid">
        {getSortedMagics(run).map((m) => {
          const completion = completed[m.id];
          const badges = getMagicTargetBadges(run, m.id);
          const linkBadge = completion
            ? targetBadge(run, completion.combinationId)
            : badges[0];
          const completionText = completion
            ? `${m.nameKo} ${completion.role === "carrier" ? "→" : "×"} ${comboById[completion.combinationId].nameKo}${completion.role === "carrier" ? "로 승계됨" : "에 병합되어 소멸"} · 원본 재사용 불가`
            : "";
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
              className={`magic-tile ${level > 0 ? "invested" : ""} ${selected === m.id ? "selected" : ""} ${used[m.id] ? `consumed ${completion?.role}` : ""} ${needed.has(m.id) ? "is-needed" : ""}`}
              key={m.id}
              data-magic-id={m.id}
              data-target={linkBadge}
              data-completion-role={completion?.role}
            >
              <button
                className="tile-inspect"
                aria-label={`${m.nameKo} 경로 보기`}
                aria-pressed={selected === m.id}
                aria-description={completionText || undefined}
                title={completionText || undefined}
                onClick={() => onFocus(m.id)}
              >
                <strong>{m.nameKo}</strong>
                <span
                  className={`tile-value ${completion ? "completed-value" : ""}`}
                >
                  {completion ? (
                    <>
                      <span className="completion-kind">
                        {completion.role === "carrier"
                          ? "→ 승계"
                          : "× 병합·소멸"}
                      </span>
                      <span className="completion-name">
                        {comboById[completion.combinationId].nameKo}
                      </span>
                    </>
                  ) : level === m.maxLevel && !pending ? (
                    traits.join(" · ") || "특성 선택"
                  ) : (
                    `${level}/${m.maxLevel}`
                  )}
                </span>
                <span className="tile-badges">
                  {badges.map((b) => (
                    <TargetBadge badge={b} key={b} />
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
          <div
            className={`passive-tile ${needed.has(p.id) ? "is-needed" : ""}`}
            key={p.id}
            data-magic-id={p.id}
            data-target={getMagicTargetBadges(run, p.id)[0]}
          >
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
                <TargetBadge badge={b} key={b} />
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
