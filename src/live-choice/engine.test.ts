import { describe, expect, it } from "vitest";
import { emptyRun } from "../engine";
import { getLiveChoiceOptions, rankLiveChoices } from "./engine";

describe("live level-up choices", () => {
  it("covers active magic, normal passive and special passive without setup", () => {
    const options = getLiveChoiceOptions(emptyRun());
    expect(options.some((o) => o.key === "active_magic:fireball")).toBe(true);
    expect(options.some((o) => o.key === "normal_passive:haste")).toBe(true);
    expect(options.some((o) => o.key === "special_passive:seal")).toBe(true);
  });

  it("puts a deterministic target ingredient ahead of unrelated choices", () => {
    const run = emptyRun();
    run.pinned = ["demon_equation"];
    const ranked = rankLiveChoices(
      ["normal_passive:haste", "active_magic:fireball", "normal_passive:fast_casting"],
      run,
    );
    expect(ranked[0].key).toBe("active_magic:fireball");
    expect(ranked[0].label).toBe("목표 우선");
    expect(ranked[0].reasons.join(" ")).toContain("A 조합");
    expect(ranked[0].reasons.join(" ")).toContain("대폭발");
  });

  it("uses recorded stat investment only as an explainable complement signal", () => {
    const run = emptyRun();
    run.levels.rupture = 1;
    const ranked = rankLiveChoices(
      ["normal_passive:haste", "normal_passive:snipe"],
      run,
    );
    expect(ranked[0].key).toBe("normal_passive:snipe");
    expect(ranked[0].reasons.join(" ")).toContain("치명타 배율");
  });

  it("does not offer normal level-up choices after MAX growth mode starts", () => {
    const run = emptyRun();
    run.progress = { ...(run.progress ?? {}), growthPhase: true } as typeof run.progress;
    expect(getLiveChoiceOptions(run)).toEqual([]);
  });
});
