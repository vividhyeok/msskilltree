import { ChevronDown, Search, X } from "lucide-react";
import { comboById } from "../../data";
import {
  evaluateCombination,
  getCombinationConflicts,
  type Run,
} from "../../engine";
import { describeRequirement, targetBadge } from "./selectors";
import { TargetBadge } from "../../components/GameState";
import { Recipe } from "../../components/Recipe";
import { MagicSymbol } from "../../components/MagicSymbol";

export function TargetSummary({
  run,
  onPin,
  onComplete,
  onBrowse,
}: {
  run: Run;
  onPin: (id: string) => void;
  onComplete: (id: string) => void;
  onBrowse: () => void;
}) {
  const conflicts = getCombinationConflicts(run);
  return (
    <section className="target-section" aria-label="목표 조합">
      <div className="section-heading">
        <h2>
          내 조합 <span>{run.pinned.length}</span>
        </h2>
        <button onClick={onBrowse}>
          <Search size={15} /> 조합 찾기
        </button>
      </div>
      {!run.pinned.length && (
        <p className="target-empty">
          만들 조합을 정하면 필요한 마법을 기억해 드립니다.
        </p>
      )}
      <div className="target-list">
        {run.pinned.map((id) => {
          const c = comboById[id];
          const e = evaluateCombination(c, run);
          const ready = c.requirements.filter(
            (r) => describeRequirement(r, run).met,
          ).length;
          return (
            <article
              className={`target-row ${e.status.toLowerCase()}`}
              key={id}
              data-target={targetBadge(run, id)}
            >
              <details className="target-details">
                <summary
                  className="target-heading"
                  aria-label={`${c.nameKo} 재료 보기`}
                >
                  <TargetBadge badge={targetBadge(run, id)} />
                  <strong>{c.nameKo}</strong>
                  <span
                    className="target-magic-pair"
                    aria-label={c.requirements
                      .map((r) => describeRequirement(r, run).name)
                      .join(" + ")}
                  >
                    {c.requirements
                      .filter((r) => r.magicId)
                      .map((r, i) => (
                        <MagicSymbol key={i} id={r.magicId!} />
                      ))}
                  </span>
                  <span
                    className={`target-progress ${e.status === "BLOCKED" ? "blocked-label" : ""}`}
                  >
                    {e.status === "COMPLETED"
                      ? "✓ 완성"
                      : e.status === "READY"
                        ? "✓ 준비됨"
                        : e.status === "BLOCKED"
                          ? "! 조합 불가"
                          : `재료 ${ready}/${c.requirements.length}`}
                  </span>
                  <ChevronDown size={14} className="disclosure-chevron" />
                </summary>
                <Recipe combination={c} run={run} />
                {e.reasons.map((reason) => (
                  <p className="blocked-label target-reason" key={reason}>
                    {reason}
                  </p>
                ))}
                <button
                  className="remove-target"
                  aria-label={`${c.nameKo} 목표 해제`}
                  onClick={() => onPin(id)}
                >
                  <X size={14} /> 목표에서 빼기
                </button>
              </details>
              {e.status === "READY" && (
                <button
                  className="complete-target"
                  aria-label={`${c.nameKo} 조합 완료`}
                  onClick={() => onComplete(id)}
                >
                  게임에서 조합 완료했어요 ✓
                </button>
              )}
            </article>
          );
        })}
      </div>
      {conflicts.map((c) => (
        <div className="conflict" role="alert" key={c.a + c.b}>
          <strong>
            <TargetBadge badge={targetBadge(run, c.a)} /> ·{" "}
            <TargetBadge badge={targetBadge(run, c.b)} /> 동시 달성 불가
          </strong>
          <p>{c.message}</p>
        </div>
      ))}
    </section>
  );
}
