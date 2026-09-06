import { Plus, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { MagicSymbol } from "../../components/MagicSymbol";
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "owned" | "target">("all");
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
          내 마법 <span>이름은 조합 보기 · +1은 기록</span>
        </h1>
      </div>
      {contextBar}
      <div className="magic-toolbar">
        <div className="magic-filters" role="group" aria-label="마법 필터">
          {(
            [
              ["all", "전체"],
              ["owned", "찍은 마법"],
              ["target", "목표 재료"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="magic-search">
          <Search size={15} />
          <input
            aria-label="마법 검색"
            placeholder="마법 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="magic-grid">
        {getSortedMagics(run)
          .filter(
            (m) =>
              m.nameKo.replace(/\s/g, "").includes(query.replace(/\s/g, "")) &&
              (filter === "all" ||
                (filter === "owned"
                  ? (run.levels[m.id] ?? 0) > 0 || !!used[m.id]
                  : getMagicTargetBadges(run, m.id).length > 0)),
          )
          .map((m) => {
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
                  <MagicSymbol id={m.id} />
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
                    {pending ? (
                      "특성"
                    ) : (
                      <>
                        <Plus size={15} />1
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
      </div>
      <p className="magic-no-results">
        해당하는 마법이 없습니다. 검색어나 필터를 바꿔보세요.
      </p>
      <div className="hud-label passive-label">
        <h2>보조 능력</h2>
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
