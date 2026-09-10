import { useState } from "react";
import { Plus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { MagicSymbol } from "../../components/MagicSymbol";
import { data, comboById } from "../../data";
import { completedMagicStates, locks, type Run } from "../../engine";
import { summarizeEffects } from "../../help";
import { LiveChoiceDialog } from "../../live-choice/LiveChoiceDialog";
import type { LiveChoiceKind } from "../../live-choice/engine";
import { magicDeckHeat } from "../../deck-board/engine";
import {
  getMagicTargetBadges,
  getNeededMagicForTargets,
  targetBadge,
} from "./selectors";
import { TargetBadge } from "../../components/GameState";
import "./live-refine.css";
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
  const [choiceOpen, setChoiceOpen] = useState(false);
  const used = locks(run);
  const completed = completedMagicStates(run);
  const needs = getNeededMagicForTargets(run).filter((n) =>
    ["not_owned", "leveling", "trait_needed"].includes(n.state),
  );
  const needed = new Set(needs.map((n) => n.magicId));
  const liveMagics = [...data.magics].sort((a, b) =>
    a.nameKo.localeCompare(b.nameKo, "ko"),
  );
  const focusIsMagic = liveMagics.some((magic) => magic.id === selected);
  function recordChoice(kind: LiveChoiceKind, id: string) {
    if (kind === "special_passive") {
      const passiveButton = [...document.querySelectorAll<HTMLButtonElement>(".companion-actions button")].find(
        (button) => button.textContent?.includes("패시브 · 성장"),
      );
      passiveButton?.click();
      return;
    }
    onRecord(id);
  }
  return (
    <section className="magic-workspace" aria-label="마법 기록">
      <div className="hud-label live-hud-title">
        <h1>
          내 마법 <span>세부 기록은 여기서 · 전체 덱은 빠른 탐색으로</span>
        </h1>
        <div className="live-hud-actions">
          <a
            className="deck-board-launch"
            href="/deck-board.html"
            aria-label="중급자용 전체 덱 빠르게 보기"
          >
            <span className="deck-board-launch-kicker">중급자 · 빠른 탐색</span>
            <strong>전체 덱 보기</strong>
            <small>레벨 입력 없이 덱·조합 후보 확인</small>
          </a>
          <button
            className="live-choice-launch primary"
            onClick={() => setChoiceOpen(true)}
            disabled={run.progress?.growthPhase}
          >
            이번 3택 비교
          </button>
        </div>
      </div>
      {contextBar}
      <div className="mobile-now-strip" aria-label="모바일 지금 필요한 것">
        <strong>지금</strong>
        {needs.slice(0, 2).map((n) => (
          <button key={n.key} onClick={() => onFocus(n.magicId)}>
            {n.name}
            <span>
              {n.targetCombinationIds
                .map((id) => targetBadge(run, id))
                .filter(Boolean)
                .join("/") || `Lv.${n.requiredLevel}`}
            </span>
          </button>
        ))}
        {!needs.length && (
          <span className="mobile-now-empty">
            {run.pinned.length ? "목표 재료 기록 완료" : "목표를 정하면 필요한 선택이 보여요"}
          </span>
        )}
      </div>
      {focusIsMagic && (
        <div className="relationship-hint">
          <strong>{liveMagics.find((magic) => magic.id === selected)?.nameKo}</strong>
          <span>기준 · 같은 조합이나 같은 덱에서 연결되는 마법일수록 더 선명하게 표시</span>
        </div>
      )}
      <div className={`magic-grid ${focusIsMagic ? "is-relating" : ""}`}>
        {liveMagics.map((m) => {
          const completion = completed[m.id];
          const badges = getMagicTargetBadges(run, m.id);
          const linkBadge = completion
            ? targetBadge(run, completion.combinationId)
            : badges[0];
          const completionText = completion
            ? `${m.nameKo} ${completion.role === "carrier" ? "→" : "×"} ${comboById[completion.combinationId].nameKo}${completion.role === "carrier" ? "로 승계됨" : "에 병합되어 소멸"} · 원본 재사용 불가`
            : "";
          const relation = focusIsMagic ? magicDeckHeat(selected, m.id) : 0;
          const relationText =
            focusIsMagic && selected !== m.id
              ? relation >= 0.75
                ? "직접 조합 또는 같은 덱에서 강하게 연결됩니다."
                : relation >= 0.3
                  ? "일부 덱에서 함께 쓰이는 연결이 있습니다."
                  : "현재 선택과의 직접 연결은 적습니다."
              : "";
          const targetText = badges.length
            ? `현재 목표 ${badges.join("/")} 조합에 필요한 마법입니다. ${m.summary} 이름을 누르면 필요한 레벨·특성과 조합 후 승계/병합 여부를 볼 수 있습니다.`
            : `${m.summary} 이름을 누르면 이 마법으로 갈 수 있는 조합과 필요한 특성을 볼 수 있습니다.`;
          const level = run.levels[m.id] ?? 0;
          const traits = m.traitStages.flatMap((s) =>
            s.traits
              .filter((t) => t.id === run.selectedTraits[m.id]?.[s.level])
              .map((t) => t.nameKo),
          );
          const pending = m.traitStages.some(
            (s) => s.level <= level && !run.selectedTraits[m.id]?.[s.level],
          );
          const relationStyle = focusIsMagic
            ? ({ "--live-relation": Math.max(0.08, relation) } as CSSProperties)
            : undefined;
          return (
            <div
              className={`magic-tile ${level > 0 ? "invested" : ""} ${selected === m.id ? "selected" : ""} ${used[m.id] ? `consumed ${completion?.role}` : ""} ${needed.has(m.id) ? "is-needed" : ""} ${focusIsMagic ? "relationship-tile" : ""}`}
              key={m.id}
              style={relationStyle}
              data-magic-id={m.id}
              data-target={linkBadge}
              data-completion-role={completion?.role}
              data-relation={focusIsMagic ? (relation >= 0.75 ? "strong" : relation >= 0.3 ? "medium" : "weak") : undefined}
            >
              <button
                className="tile-inspect"
                aria-label={`${m.nameKo} 경로 보기`}
                aria-pressed={selected === m.id}
                aria-description={completionText || `${targetText} ${relationText}`.trim()}
                title={completionText || `${targetText} ${relationText}`.trim()}
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
                  disabled={run.progress?.growthPhase}
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
      <div className="hud-label passive-label">
        <h2>조합 조건 패시브</h2>
      </div>
      <div className="passive-row">
        {data.passives
          .filter((p) => p.combinationRelevant)
          .map((p) => {
            const help = summarizeEffects(p.perLevel as Record<string, unknown>);
            const description = `${help.categories.join(" · ")} · ${help.short}. 조합 조건으로도 쓰일 수 있습니다.`;
            return (
              <div
                className={`passive-tile ${needed.has(p.id) ? "is-needed" : ""}`}
                key={p.id}
                data-magic-id={p.id}
                data-target={getMagicTargetBadges(run, p.id)[0]}
              >
                <button
                  className="passive-inspect"
                  aria-label={`${p.nameKo} 경로 보기`}
                  aria-description={description}
                  title={description}
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
                  disabled={run.progress?.growthPhase || (run.levels[p.id] ?? 0) >= p.maxLevel}
                  onClick={() => onRecord(p.id)}
                >
                  <Plus size={18} />
                </button>
              </div>
            );
          })}
      </div>
      {choiceOpen && (
        <LiveChoiceDialog
          run={run}
          onRecord={recordChoice}
          onClose={() => setChoiceOpen(false)}
        />
      )}
    </section>
  );
}
