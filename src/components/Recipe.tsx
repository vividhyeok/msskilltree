import { comboById, type Combination } from "../data";
import type { Run } from "../engine";
import { describeRequirement } from "../features/game-mode/selectors";
import { RoleMark } from "./GameState";
import { MagicSymbol } from "./MagicSymbol";

export function Recipe({
  combination: c,
  run,
}: {
  combination: Combination;
  run: Run;
}) {
  return (
    <div className="recipe" aria-label={`${c.nameKo} 조합 재료`}>
      {c.requirements.map((r, i) => {
        const info = describeRequirement(r, run);
        const completedHere = info.completion?.combinationId === c.id;
        return (
          <div
            className={`recipe-ingredient ${info.met || completedHere ? "is-ready" : ""} ${info.completion && !completedHere ? "is-unusable" : ""}`}
            key={i}
          >
            <MagicSymbol id={r.magicId ?? ""} />
            <div className="ingredient-copy">
              <strong>{info.name}</strong>
              {info.completion ? (
                <span>
                  {completedHere
                    ? info.role === "carrier"
                      ? "조합 마법으로 변환"
                      : "재료로 소멸"
                    : `${comboById[info.completion.combinationId].nameKo}에 사용 · 재사용 불가`}
                </span>
              ) : (
                <span>
                  {info.traitName ??
                    (r.type === "completedCombination"
                      ? "먼저 완성"
                      : `Lv.${info.requiredLevel}`)}
                  {info.traitName && <small> · Lv.{info.stage}</small>}
                </span>
              )}
              <RoleMark role={info.role} />
            </div>
            <span className="ingredient-progress">
              {info.met || completedHere
                ? "✓"
                : r.magicId && !info.completion
                  ? `${info.currentLevel}/${info.requiredLevel}`
                  : "!"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
