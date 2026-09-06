import { magicById } from "../data";
import type { Run } from "../engine";
import { getFocusedMagicPaths } from "../features/game-mode/selectors";
import { TraitMetaHint } from "../meta/MetaUI";
import { RoleMark, TargetBadge } from "./GameState";

export function TraitChoices({
  run,
  magicId,
  level,
  onChoose,
}: {
  run: Run;
  magicId: string;
  level: number;
  onChoose: (id: string) => void;
}) {
  const paths = getFocusedMagicPaths(run, magicId);
  const traits = magicById[magicId].traitStages.find(
    (s) => s.level === level,
  )!.traits;
  return (
    <div className="trait-choices">
      <p className="choice-instruction">
        게임에서 고른 특성을 눌러 기록하세요.
      </p>
      {traits.map((t) => {
        const combinations =
          paths.find((p) => p.stage === level && p.trait.id === t.id)
            ?.combinations ?? [];
        const targets = combinations.filter(
          (c) => c.badge && c.status !== "COMPLETED",
        );
        const chosen = run.selectedTraits[magicId]?.[level] === t.id;
        return (
          <article
            className={`trait-choice ${targets.length ? "for-target" : ""} ${chosen ? "is-chosen" : ""}`}
            key={t.id}
          >
            <button
              className="trait-option"
              aria-label={`${t.nameKo} 선택`}
              onClick={() => onChoose(t.id)}
            >
              <span className="trait-choice-heading">
                <strong>{t.nameKo}</strong>
                <span className="trait-select-label">
                  {chosen ? "✓ 선택됨" : "선택"}
                </span>
              </span>
              {targets.length ? (
                <span className="trait-target-hint">
                  {targets.map((c) => (
                    <span key={c.id}>
                      <TargetBadge badge={c.badge} /> {c.name}
                      {c.status === "BLOCKED" ? " · 조합 불가" : "에 필요"}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="trait-neutral-hint">
                  {combinations.filter((c) => c.status !== "BLOCKED").length
                    ? `연결되는 조합 ${combinations.filter((c) => c.status !== "BLOCKED").length}개`
                    : "현재 목표에 필요한 특성은 아님"}
                </span>
              )}
              <TraitMetaHint run={run} magicId={magicId} traitId={t.id} />
            </button>
            <details className="trait-recipe-details">
              <summary>{t.nameKo} 조합·효과 보기</summary>
              {combinations.map((c) => (
                <div
                  className={`picker-path ${c.partners.some((r) => r.consumedBy) ? "consumed-path" : ""}`}
                  key={c.id}
                  data-target={c.badge}
                >
                  <b>
                    {c.badge && <TargetBadge badge={c.badge} />}
                    <RoleMark role={c.focusedRole} /> {c.name}
                    {c.status === "BLOCKED" && " · 조합 불가"}
                  </b>
                  {c.partners.map((r, i) => (
                    <small key={i}>
                      <RoleMark role={r.role} /> {r.consumedLabel ?? r.label}
                    </small>
                  ))}
                </div>
              ))}
              <p className="trait-effect">{t.effectSummary.join(" · ")}</p>
            </details>
          </article>
        );
      })}
    </div>
  );
}
