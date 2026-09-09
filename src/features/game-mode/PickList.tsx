import { CircleHelp, Plus } from "lucide-react";
import { magicById, comboById } from "../../data";
import { evaluateCombination, type Run } from "../../engine";
import { participantRoleHelp } from "../../help";
import { type NeededMagic, targetBadge } from "./selectors";
import { MagicSymbol } from "../../components/MagicSymbol";
import { TargetBadge } from "../../components/GameState";

export function PickList({
  run,
  needed,
  onRecord,
  onEdit,
  onFocus,
}: {
  run: Run;
  needed: NeededMagic[];
  onRecord: (id: string) => void;
  onEdit: (id: string, level: number) => void;
  onFocus: (id: string) => void;
}) {
  // Blocked goals are explained under My combinations, never presented as things to pick.
  const active = needed.filter(
    (n) => !["ready", "consumed", "blocked"].includes(n.state),
  );
  const visible = active.slice(0, 6);
  const ready = run.pinned.some(
    (id) => evaluateCombination(comboById[id], run).status === "READY",
  );
  const blocked = run.pinned.some(
    (id) => evaluateCombination(comboById[id], run).status === "BLOCKED",
  );
  return (
    <section className="need-section" aria-label="현재 목표에 필요한 선택">
      <div className="section-heading">
        <h2>지금 필요한 것</h2>
        <span>{run.pinned.length ? "목표 조합 기준 · +1로 기록" : "목표를 정하면 표시"}</span>
      </div>
      {!active.length && (
        <p className="pick-empty">
          {ready
            ? "✓ 재료가 모였어요. 아래 목표에서 조합을 완료하세요."
            : blocked
              ? "목표 조합이 막혔어요. 내 조합을 펼쳐 이유를 확인하세요."
              : run.pinned.length
                ? "현재 목표에 더 기록할 재료가 없습니다."
                : "조합 목표 A/B/C를 지정하면 여기에는 필요한 재료만 간단히 표시됩니다."}
        </p>
      )}
      <div className="pick-grid">
        {visible.map((n) => {
          const role = participantRoleHelp(n.role);
          const targets = n.targetCombinationIds
            .map((id) => `${targetBadge(run, id)} ${comboById[id]?.nameKo ?? id}`)
            .join(", ");
          const help = `${role.description}${targets ? ` 목표: ${targets}.` : ""}`;
          return (
            <div
              className={`need-row ${n.state}`}
              key={n.key}
              data-need-magic={n.magicId}
              data-target={targetBadge(run, n.targetCombinationIds[0])}
            >
              <button
                className="need-inspect"
                aria-label={`${n.name} 필요 조건 확인`}
                aria-description={help}
                title={help}
                onClick={() => onFocus(n.magicId)}
              >
                <MagicSymbol id={n.magicId} />
                <span className="need-copy">
                  <strong>
                    {n.name}{" "}
                    <span className="need-level">
                      {n.currentLevel}/{n.requiredLevel}
                    </span>
                  </strong>
                  <span className="need-trait">
                    {n.requiredTraitName
                      ? `${n.requiredTraitName}${magicById[n.magicId]?.traitStages.length > 1 ? ` · Lv.${n.traitStage}` : ""}`
                      : `Lv.${n.requiredLevel}까지`}
                  </span>
                  <span className={`need-role ${n.role}`}>{role.label}</span>
                </span>
                <span className="need-help" aria-hidden="true">
                  <CircleHelp size={14} />
                </span>
                <span className="need-badges">
                  {n.targetCombinationIds.map((id) => (
                    <TargetBadge key={id} badge={targetBadge(run, id)} />
                  ))}
                </span>
              </button>
              <button
                className="need-record"
                aria-label={`${n.name} ${n.state === "trait_needed" ? "필요 특성 선택" : "선택 기록"}`}
                onClick={() =>
                  n.state === "trait_needed" && n.traitStage
                    ? onEdit(n.magicId, n.traitStage)
                    : onRecord(n.magicId)
                }
              >
                {n.state === "trait_needed" ? (
                  "특성"
                ) : (
                  <>
                    <Plus size={15} />1
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
      {active.length > visible.length && (
        <p className="need-more">외 {active.length - visible.length}개 · 목표 상세에서 확인</p>
      )}
    </section>
  );
}
