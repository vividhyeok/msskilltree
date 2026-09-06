import { useMemo, useState } from "react";
import { data, comboById, magicById } from "../../data";
import {
  evaluateCombination,
  getCombinationConflicts,
  locks,
  type Run,
} from "../../engine";
import {
  describeRequirement,
  getNeededMagicForTargets,
  getFocusedMagicPaths,
  targetBadge,
  getRecommendedPlan,
} from "./selectors";
type Props = {
  run: Run;
  selected: string;
  onPin: (id: string) => void;
  onComplete: (id: string) => void;
  onEdit: (id: string, level: number) => void;
  onClearFocus: () => void;
};
export function TargetPanel({
  run,
  selected,
  onPin,
  onComplete,
  onEdit,
  onClearFocus,
}: Props) {
  const [showBlocked, setShowBlocked] = useState(false);
  const recommendation = useMemo(() => selected ? null : getRecommendedPlan(run), [run, selected]);
  const needed = useMemo(() => getNeededMagicForTargets(run), [run]);
  const paths = useMemo(
    () => getFocusedMagicPaths(run, selected),
    [run, selected],
  );
  const hidden = paths.reduce(
    (n, p) => n + p.combinations.filter((c) => c.status === "BLOCKED").length,
    0,
  );
  const conflicts = getCombinationConflicts(run);
  const m = magicById[selected];
  const used = locks(run);
  const activeNeeds = needed.filter(
    (n) => !["ready", "consumed"].includes(n.state),
  );
  const passivePaths =
    !m && selected
      ? data.combinations.filter(
          (c) =>
            c.requirements.some((r) => r.magicId === selected) &&
            evaluateCombination(c, run).status !== "BLOCKED",
        )
      : [];
  return (
    <div className="hud-panel">
      <section className="target-section" aria-label="목표 조합">
        <h2 className="hud-label">
          TARGET <span>{run.pinned.length || "목표 없음"}</span>
        </h2>
        {!run.pinned.length && (
          <p className="hud-empty">마법을 눌러 조합 경로를 확인하세요.</p>
        )}
        {run.pinned.map((id) => {
          const c = comboById[id];
          const e = evaluateCombination(c, run);
          return (
            <article
              className={`target-row ${e.status.toLowerCase()}`}
              key={id}
            >
              <div className="target-heading">
                <button
                  className="target-name"
                  aria-label={`${c.nameKo} 목표 해제`}
                  onClick={() => onPin(id)}
                >
                  <b className="badge">{targetBadge(run, id)}</b>
                  <strong>{c.nameKo}</strong>
                </button>
                {e.status === "COMPLETED" ? (
                  <span className="met">✓ 완료</span>
                ) : e.status === "READY" ? (
                  <button
                    className="complete-target"
                    aria-label={`${c.nameKo} 조합 완료`}
                    onClick={() => onComplete(id)}
                  >
                    ✓ 준비 · 완료
                  </button>
                ) : e.status === "BLOCKED" ? (
                  <span className="blocked-label">× 불가</span>
                ) : null}
              </div>
              {e.status !== "COMPLETED" &&
                c.requirements.map((r, i) => {
                  const info = describeRequirement(r, run);
                  return (
                    <div
                      className={`target-requirement ${info.met ? "met" : ""}`}
                      key={i}
                    >
                      {info.met ? "✓" : "○"} {info.label}
                    </div>
                  );
                })}
              {e.status === "BLOCKED" && (
                <details className="blocked-detail">
                  <summary>막힌 이유</summary>
                  {e.reasons.map((reason) => (
                    <p key={reason}>{reason}</p>
                  ))}
                </details>
              )}
            </article>
          );
        })}
        {conflicts.map((c) => (
          <div className="conflict" role="alert" key={c.a + c.b}>
            <strong>
              ⚠ {targetBadge(run, c.a)} · {targetBadge(run, c.b)} 충돌
            </strong>
            <p>{c.message}</p>
          </div>
        ))}
      </section>
      <section className="need-section" aria-label="지금 필요한 마법">
        <h2 className="hud-label">
          NEED NOW <span>지금 필요한 것</span>
        </h2>
        {!activeNeeds.length && (
          <p className="hud-empty">
            {run.pinned.length
              ? run.pinned.every((id) =>
                  ["READY", "COMPLETED"].includes(
                    evaluateCombination(comboById[id], run).status,
                  ),
                )
                ? "✓ 목표 재료 준비 완료"
                : "목표의 선행 조합 / 막힌 이유 확인"
              : "목표를 지정하면 필요한 재료가 표시됩니다."}
          </p>
        )}
        {activeNeeds.map((n) => (
          <div
            className={`need-row ${n.state}`}
            key={n.key}
            data-need-magic={n.magicId}
          >
            <span className="need-badges">
              {n.targetCombinationIds.map((id) => (
                <b className="badge" key={id}>
                  {targetBadge(run, id)}
                </b>
              ))}
            </span>
            <strong>{n.name}</strong>
            <span className="need-level">
              {n.currentLevel}/{n.maxLevel}
            </span>
            <span className="need-trait">
              {n.state === "blocked"
                ? "× 경로 막힘"
                : n.requiredTraitName
                  ? `→ ${n.requiredTraitName}${magicById[n.magicId]?.traitStages.length > 1 ? ` · Lv.${n.traitStage}` : ""}`
                  : `→ Lv.${n.requiredLevel}`}
            </span>
          </div>
        ))}
      </section>
      <section className="focus-section" aria-label="선택한 마법 경로">
        <div className="focus-title">
          <h2>
            {m?.nameKo ??
              data.passives.find((p) => p.id === selected)?.nameKo ??
              "마법 경로"}
          </h2>
          <span>PATHS</span>
          {selected && <button className="edit-path-trait" onClick={onClearFocus}>전체 추천</button>}
          {m &&
            !used[selected] &&
            m.traitStages
              .filter((s) => s.level <= (run.levels[selected] ?? 0))
              .map((s) => (
                <button
                  className="edit-path-trait"
                  key={s.level}
                  aria-label={`${m.nameKo} Lv.${s.level} 특성 수정`}
                  onClick={() => onEdit(selected, s.level)}
                >
                  Lv.{s.level} 특성
                </button>
              ))}
        </div>
        <div className="path-scroll">
          {!selected && recommendation && (
            <div className="recommended-plan">
              <h3>현재 레벨 기반 조합 추천</h3>
              <p className="hud-empty">조합 수 → 추가 레벨 → 기존 투자 순으로 후보를 비교합니다. 특성 선택은 별도로 필요하며, 모든 경로의 최적해를 보장하지는 않습니다.</p>
              {recommendation.steps.length ? <>
                <p className="recommendation-summary">추가 <strong>{recommendation.levels}레벨</strong>로 <strong>{recommendation.steps.length}개 조합</strong> 완성</p>
                {recommendation.steps.map((step, index) => {
                  const c = comboById[step.id];
                  const ready = evaluateCombination(c, run).status === "READY";
                  return <div className="path-entry" key={step.id}>
                    <button className="path-pin" aria-label={`${c.nameKo} ${run.pinned.includes(c.id) ? "목표 해제" : "목표 지정"}`} onClick={() => onPin(c.id)}>
                      <span className={run.pinned.includes(c.id) ? "badge" : "star"}>{targetBadge(run, c.id) || "☆"}</span>
                      {index + 1}. {c.nameKo}
                    </button>
                    <p>{step.levels ? `이 단계 추가 ${step.levels}레벨` : "추가 레벨 없이 가능"}</p>
                    {c.requirements.map((r, i) => <p key={i}>{describeRequirement(r, run).label}{r.magicId ? ` · 필요 Lv.${describeRequirement(r, run).requiredLevel}` : ""}</p>)}
                    {ready && <button className="complete-target" onClick={() => onComplete(c.id)}>{c.nameKo} 조합 완료</button>}
                  </div>;
                })}
              </> : <p className="hud-empty">현재 특성과 남은 슬롯으로 가능한 추가 조합이 없습니다.</p>}
            </div>
          )}
          {used[selected] && (
            <p className="hud-empty">
              ✓ {comboById[used[selected]].nameKo}에 사용됨
            </p>
          )}
          {paths
            .filter((p) =>
              p.combinations.some(
                (c) =>
                  showBlocked ||
                  (c.status !== "BLOCKED" && c.status !== "COMPLETED"),
              ),
            )
            .map((p) => (
              <div className="path-group" key={p.stage + p.trait.id}>
                <h3>
                  {p.trait.nameKo}
                  <small>Lv.{p.stage}</small>
                </h3>
                {p.combinations
                  .filter((c) =>
                    showBlocked
                      ? c.status !== "COMPLETED"
                      : c.status !== "BLOCKED" && c.status !== "COMPLETED",
                  )
                  .map((c) => (
                    <div
                      className={`path-entry ${c.status.toLowerCase()}`}
                      key={c.id}
                    >
                      <button
                        className="path-pin"
                        aria-label={`${c.name} ${c.badge ? "목표 해제" : "목표 지정"}`}
                        onClick={() => onPin(c.id)}
                      >
                        <span className={c.badge ? "badge" : "star"}>
                          {c.badge || "☆"}
                        </span>
                        {c.name}
                        {c.status === "READY" && <span className="met">✓</span>}
                      </button>
                      {c.partners.map((r, i) => (
                        <p key={i} className={r.met ? "met" : ""}>
                          + {r.label}
                        </p>
                      ))}
                      {c.status === "BLOCKED" &&
                        c.reasons.map((r) => (
                          <p className="blocked-label" key={r}>
                            {r}
                          </p>
                        ))}
                    </div>
                  ))}
              </div>
            ))}
          {passivePaths.map((c) => (
            <div className="path-entry" key={c.id}>
              <button className="path-pin" onClick={() => onPin(c.id)}>
                {targetBadge(run, c.id) || "☆"} {c.nameKo}
              </button>
              {c.requirements
                .filter((r) => r.magicId !== selected)
                .map((r, i) => (
                  <p key={i}>+ {describeRequirement(r, run).label}</p>
                ))}
            </div>
          ))}
          {selected &&
            !paths.some((p) =>
              p.combinations.some(
                (c) => c.status !== "BLOCKED" && c.status !== "COMPLETED",
              ),
            ) &&
            !passivePaths.length && (
              <p className="hud-empty">현재 가능한 경로 없음</p>
            )}
          {hidden > 0 && (
            <button
              className="blocked-toggle"
              aria-pressed={showBlocked}
              onClick={() => setShowBlocked(!showBlocked)}
            >
              {showBlocked ? "불가능한 경로 숨기기" : `불가능 ${hidden}`}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
