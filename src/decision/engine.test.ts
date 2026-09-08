import { describe, it, expect } from "vitest";
import { emptyRun } from "../engine";
import { getLiveDecisions, applyDecision } from "./engine";

describe("live decision engine", () => {
  it("returns normal passive recommendations without setup", () => {
    const run = emptyRun();
    const decisions = getLiveDecisions(run);
    const normal = decisions.filter((d) => d.category === "normalPassive");
    expect(normal.length).toBeGreaterThan(0);
    expect(normal.some((d) => d.id === "haste" || d.id === "fast_casting")).toBe(
      true,
    );
  });

  it("returns active magic material recommendations for pinned targets", () => {
    const run = { ...emptyRun(), pinned: ["demon_equation"] };
    const decisions = getLiveDecisions(run);
    const active = decisions.filter((d) => d.category === "activeMagic");
    expect(active.some((d) => d.id === "fireball" || d.id === "energy_bolt")).toBe(
      true,
    );
  });

  it("records a normal passive pick", () => {
    const run = emptyRun();
    const decisions = getLiveDecisions(run).filter(
      (d) => d.category === "normalPassive",
    );
    const next = applyDecision(run, decisions[0]);
    expect(next.levels[decisions[0].id]).toBe(1);
  });

  it("records a special passive pick", () => {
    const run = emptyRun();
    const decision = getLiveDecisions(run).find(
      (d) => d.category === "specialPassive",
    )!;
    const next = applyDecision(run, decision);
    expect(next.progress?.special).toContain(decision.id);
  });

  it("does not duplicate owned passives", () => {
    const run = emptyRun();
    run.levels.haste = 2;
    const decisions = getLiveDecisions(run).filter(
      (d) => d.category === "normalPassive" && d.id === "haste",
    );
    expect(decisions).toHaveLength(0);
  });

  it("prioritizes synergy-completing artifacts", () => {
    const run = emptyRun();
    run.meta = { artifacts: ["ouroboros"] } as ReturnType<
      typeof import("../meta/data").normalizeMetaContext
    >;
    const decisions = getLiveDecisions(run).filter(
      (d) => d.category === "synergyArtifact" || d.category === "artifact",
    );
    expect(decisions.length).toBeGreaterThan(0);
  });

  it("does not repeat the same active magic for multiple combinations", () => {
    // Several combinations share energy_bolt as a material.
    const run = { ...emptyRun(), pinned: ["demon_equation", "lightning_blast"] };
    const active = getLiveDecisions(run).filter(
      (d) => d.category === "activeMagic" && d.id === "energy_bolt",
    );
    expect(active).toHaveLength(1);
  });

  it("mixes categories instead of showing only active magic", () => {
    const run = emptyRun();
    const decisions = getLiveDecisions(run).slice(0, 6);
    const categories = new Set(decisions.map((d) => d.category));
    expect(categories.size).toBeGreaterThanOrEqual(2);
  });
});
