import { useMemo, useState } from "react";
import { CombinationMetaNote, MetaOverview } from "../../meta/MetaUI";
import { contextFor } from "../../meta/engine";
import { RoleMark } from "../../components/GameState";
import { data, comboById, magicById } from "../../data";
import { TargetSummary } from "./TargetSummary";
import { PickList } from "./PickList";
import { Recipe } from "../../components/Recipe";
import {
  evaluateCombination,
  locks,
  completedMagicStates,
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
  onSetup: () => void;
  onFocus: (id: string) => void;
  onRecord: (id: string) => void;
  onBrowse: () => void;
};
export function TargetPanel({
  run,
  selected,
  onPin,
  onComplete,
  onEdit,
  onClearFocus,
  onSetup,
  onFocus,
  onRecord,
  onBrowse,
}: Props) {
  const [showBlocked, setShowBlocked] = useState(false);
  const [growthOpen, setGrowthOpen] = useState(false);
  const recommendation = useMemo(
    () => (selected || !growthOpen ? null : getRecommendedPlan(run)),
    [run, selected, growthOpen],
  );
  const needed = useMemo(() => getNeededMagicForTargets(run), [run]);
  const paths = useMemo(
    () => getFocusedMagicPaths(run, selected),
    [run, selected],
  );
  const hidden = paths.reduce(
    (n, p) => n + p.combinations.filter((c) => c.status === "BLOCKED").length,
    0,
  );
  const m = magicById[selected];
  const used = locks(run);
  const completed = completedMagicStates(run);
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
      <TargetSummary
        run={run}
        onPin={onPin}
        onComplete={onComplete}
        onBrowse={onBrowse}
      />
      <PickList
        run={run}
        needed={needed}
        onRecord={onRecord}
        onEdit={onEdit}
        onFocus={onFocus}
      />
      <section className="focus-section" aria-label="선택한 마법 경로">
        <div className="focus-title">
          <h2>
            {m?.nameKo ??
              data.passives.find((p) => p.id === selected)?.nameKo ??
              "추천 조합"}
          </h2>
          {selected && <span>조합 찾기</span>}
          {selected && (
            <button className="edit-path-trait" onClick={onClearFocus}>
              전체 추천
            </button>
          )}
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
          {!selected && (
            <MetaOverview
              run={run}
              onPin={onPin}
              onFocus={onFocus}
              onSetup={onSetup}
            />
          )}
          {!selected && (
            <details
              className="recommended-plan growth-plan"
              open={growthOpen}
              onToggle={(event) => setGrowthOpen(event.currentTarget.open)}
            >
              <summary>
                찍은 마법으로 조합 계획하기
                {recommendation ? ` · 추가 ${recommendation.levels}레벨` : ""}
              </summary>
              {recommendation && (
                <>
                  <p className="hud-empty">
                    추가 레벨과 완성할 조합 수를 비교한 경로입니다. 전투 성능
                    추천과 다르며, 최적해를 보장하지는 않습니다.
                  </p>
                  {contextFor(run).remainingPicks !== null && (
                    <p
                      className={
                        recommendation.levels > contextFor(run).remainingPicks!
                          ? "meta-caveat"
                          : "muted"
                      }
                    >
                      기록한 남은 선택 {contextFor(run).remainingPicks}회
                      {recommendation.levels > contextFor(run).remainingPicks!
                        ? " · 경로 완성에 필요한 횟수가 더 많습니다."
                        : " · 선택 예산 내 경로"}
                    </p>
                  )}
                  {recommendation.steps.length ? (
                    <>
                      <p className="recommendation-summary">
                        추가 <strong>{recommendation.levels}레벨</strong>로{" "}
                        <strong>{recommendation.steps.length}개 조합</strong>{" "}
                        완성
                      </p>
                      {recommendation.steps.map((step, index) => {
                        const c = comboById[step.id];
                        const ready =
                          evaluateCombination(c, run).status === "READY";
                        return (
                          <div className="path-entry" key={step.id}>
                            <button
                              className="path-pin"
                              aria-label={`${c.nameKo} ${run.pinned.includes(c.id) ? "목표 해제" : "목표 지정"}`}
                              onClick={() => onPin(c.id)}
                            >
                              <span
                                className={
                                  run.pinned.includes(c.id) ? "badge" : "star"
                                }
                                data-target={targetBadge(run, c.id)}
                              >
                                {targetBadge(run, c.id) || "☆"}
                              </span>
                              {index + 1}. {c.nameKo}
                            </button>
                            <p>
                              {step.levels
                                ? `이 단계 추가 ${step.levels}레벨`
                                : "추가 레벨 없이 가능"}
                            </p>
                            {c.requirements.map((r, i) => (
                              <p key={i}>
                                <RoleMark
                                  role={describeRequirement(r, run).role}
                                />{" "}
                                {describeRequirement(r, run).label}
                                {r.magicId
                                  ? ` · 필요 Lv.${describeRequirement(r, run).requiredLevel}`
                                  : ""}
                              </p>
                            ))}
                            {ready && (
                              <button
                                className="complete-target"
                                onClick={() => onComplete(c.id)}
                              >
                                {c.nameKo} 조합 완료
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="hud-empty">
                      현재 특성과 남은 슬롯으로 가능한 추가 조합이 없습니다.
                    </p>
                  )}
                </>
              )}
            </details>
          )}
          {used[selected] && (
            <p
              className={`completed-focus ${completed[selected]?.role}`}
              data-target={targetBadge(run, used[selected])}
            >
              {completed[selected]?.role === "carrier"
                ? "→ 승계"
                : "× 병합·소멸"}{" "}
              · {magicById[selected]?.nameKo}
              <br />
              {comboById[used[selected]].nameKo}
              {completed[selected]?.role === "carrier"
                ? "로 이어졌습니다."
                : "에 병합되었습니다."}
              <br />
              <small>
                원본 마법의 레벨업과 다른 조합의 재료로 재사용할 수 없습니다.
              </small>
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
                      data-target={c.badge}
                    >
                      <button
                        className="path-pin"
                        aria-label={`${c.name} ${c.badge ? "목표 해제" : "목표 지정"}`}
                        onClick={() => onPin(c.id)}
                      >
                        <span
                          className={c.badge ? "badge" : "star"}
                          data-target={c.badge}
                        >
                          {c.badge || "☆"}
                        </span>
                        {c.name}
                        <RoleMark role={c.focusedRole} />
                        <span className="pin-action">
                          {c.badge ? "해제" : "목표로"}
                        </span>
                        {c.status === "READY" && <span className="met">✓</span>}
                      </button>
                      <Recipe combination={comboById[c.id]} run={run} />
                      <CombinationMetaNote run={run} id={c.id} />
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
            <div
              className="path-entry"
              key={c.id}
              data-target={targetBadge(run, c.id)}
            >
              <button className="path-pin" onClick={() => onPin(c.id)}>
                <span
                  className={targetBadge(run, c.id) ? "badge" : "star"}
                  data-target={targetBadge(run, c.id)}
                >
                  {targetBadge(run, c.id) || "☆"}
                </span>{" "}
                {c.nameKo}
              </button>
              {c.requirements
                .filter((r) => r.magicId !== selected)
                .map((r, i) => (
                  <p key={i}>
                    <RoleMark role={describeRequirement(r, run).role} />{" "}
                    {describeRequirement(r, run).label}
                  </p>
                ))}
              <CombinationMetaNote run={run} id={c.id} />
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
