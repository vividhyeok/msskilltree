import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { Run } from "../engine";
import { getLiveDecisions, applyDecision } from "./engine";
import { computeStats, getStatAccuracy } from "../stats/engine";
import { statAccuracyLabel } from "../stats/types";
import type { Decision } from "./types";
import "./style.css";

type Props = {
  run: Run;
  onChange: (run: Run) => void;
  onRecord: (id: string) => void;
};

function DecisionCard({
  decision,
  onPick,
}: {
  decision: Decision;
  onPick: () => void;
}) {
  return (
    <div className={`live-decision ${decision.category}`} data-ref={decision.ref}>
      <div className="live-decision-main">
        <div className="live-decision-name">
          <strong>{decision.name}</strong>
          <span className="live-decision-category">
            {categoryName(decision.category)}
          </span>
        </div>
        <button
          className="live-decision-pick"
          disabled={decision.disabled}
          onClick={onPick}
        >
          {decision.disabled ? decision.disabledReason : decision.action}
        </button>
      </div>
      <ul className="live-decision-reasons">
        {decision.reasons.map((r, i) => (
          <li key={i}>
            {r.label}
            {r.detail && <small> · {r.detail}</small>}
          </li>
        ))}
      </ul>
      {decision.impact && (
        <p className="live-decision-impact">
          {decision.impact
            .map((i) => `${i.nameKo} ${i.delta > 0 ? "+" : ""}${i.delta}${i.unit}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

function categoryName(c: Decision["category"]): string {
  switch (c) {
    case "activeMagic":
      return "액티브";
    case "normalPassive":
      return "일반 패시브";
    case "specialPassive":
      return "특수 패시브";
    case "growth":
      return "성장강화";
    case "artifact":
      return "유물";
    case "synergyArtifact":
      return "유물 · 시너지";
  }
}

export function LiveDecisionPanel({ run, onChange, onRecord }: Props) {
  const decisions = useMemo(() => getLiveDecisions(run), [run]);
  const stats = useMemo(() => computeStats(run), [run]);
  const [expanded, setExpanded] = useState(false);
  if (!decisions.length) return null;

  const top = decisions.slice(0, expanded ? 5 : 3);
  const accuracy = getStatAccuracy(stats);

  function pick(d: Decision) {
    if (d.category === "activeMagic" || d.category === "normalPassive") {
      onRecord(d.id);
      return;
    }
    onChange(applyDecision(run, d));
  }

  return (
    <section className="live-decision-panel" aria-label="지금 뜨면 고르세요">
      <button
        className="live-decision-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <h2>
          <Zap size={16} />
          지금 뜨면 고르세요
        </h2>
        <span className="live-decision-count">{decisions.length}</span>
        <span className={`stat-accuracy ${accuracy}`}>
          {statAccuracyLabel[accuracy]}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <>
          <div className="live-decision-list">
            {top.map((d) => (
              <DecisionCard key={d.ref} decision={d} onPick={() => pick(d)} />
            ))}
          </div>
          {decisions.length > 3 && (
            <button
              className="live-decision-more"
              onClick={() => setExpanded(false)}
            >
              접기 <ChevronUp size={14} />
            </button>
          )}
        </>
      )}
    </section>
  );
}
