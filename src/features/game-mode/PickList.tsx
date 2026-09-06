import { Plus } from "lucide-react";
import { magicById, comboById } from "../../data";
import { evaluateCombination, type Run } from "../../engine";
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
  const ready = run.pinned.some(
    (id) => evaluateCombination(comboById[id], run).status === "READY",
  );
  const blocked = run.pinned.some(
    (id) => evaluateCombination(comboById[id], run).status === "BLOCKED",
  );
  return (
    <section className="need-section" aria-label="지금 필요한 마법">
      <div className="section-heading">
        <h2>지금 뜨면 고르세요</h2>
        <span>고른 뒤 +1 기록</span>
      </div>
      {!active.length && (
        <p className="pick-empty">
          {ready
            ? "✓ 재료가 모였어요. 아래에서 조합을 완료하세요."
            : blocked
              ? "목표 조합이 막혔어요. 내 조합을 펼쳐 이유를 확인하세요."
              : run.pinned.length
                ? "남은 재료 없음 · 내 조합 상태를 확인하세요."
                : "마법 이름을 누르면 연결되는 조합을 볼 수 있어요."}
        </p>
      )}
      <div className="pick-grid">
        {active.map((n) => (
          <div
            className={`need-row ${n.state}`}
            key={n.key}
            data-need-magic={n.magicId}
            data-target={targetBadge(run, n.targetCombinationIds[0])}
          >
            <button
              className="need-inspect"
              aria-label={`${n.name} 필요 특성 확인`}
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
        ))}
      </div>
    </section>
  );
}
