import { describe, it, expect } from "vitest";
import { data, comboById, stageFor } from "../../data";
import { emptyRun, completeCombination } from "../../engine";
import {
  getNeededMagicForTargets,
  getFocusedMagicPaths,
  getSortedMagics,
  getRecommendedPlan,
} from "./selectors";

describe("overview recommendations", () => {
  it("sorts invested magic first, unused next and consumed last, alphabetically within each group", () => {
    const run = emptyRun();
    run.levels = { spirit: 3, thunderstorm: 1, fireball: 7 };
    run.completed = ["demon_equation"];
    const sorted = getSortedMagics(run);
    expect(sorted.slice(0, 2).map((m) => m.id)).toEqual([
      "thunderstorm",
      "spirit",
    ]);
    expect(new Set(sorted.slice(-2).map((m) => m.id))).toEqual(
      new Set(["fireball", "energy_bolt"]),
    );
    const names = sorted.slice(2, -2).map((m) => m.nameKo);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "ko")));
  });
  it("produces an executable sequence with exact shared level costs without mutating the run", () => {
    const run = target();
    run.levels = { fireball: 7, energy_bolt: 6 };
    run.selectedTraits = { fireball: { 7: "big_explosion" } };
    const before = structuredClone(run);
    const plan = getRecommendedPlan(run);
    expect(plan.steps.length).toBeGreaterThanOrEqual(3);
    let simulated = structuredClone(run);
    let cost = 0;
    for (const step of plan.steps) {
      for (const r of comboById[step.id].requirements) {
        if (!r.magicId) continue;
        const stage = r.traitId ? stageFor(r) : undefined;
        const level = Math.max(r.minLevel ?? 1, stage?.level ?? 1);
        cost += Math.max(0, level - (simulated.levels[r.magicId] ?? 0));
        simulated.levels[r.magicId] = Math.max(
          level,
          simulated.levels[r.magicId] ?? 0,
        );
        if (stage && r.traitId)
          simulated.selectedTraits[r.magicId] = {
            ...simulated.selectedTraits[r.magicId],
            [stage.level]: r.traitId,
          };
      }
      simulated = completeCombination(simulated, step.id);
    }
    expect(cost).toBe(plan.levels);
    expect(run).toEqual(before);
  });
  it("returns no extra combinations after a blocking special combination", () => {
    const run = emptyRun();
    const blocking = data.combinations.find((c) =>
      c.effects.some((e) => e.type === "blockFurtherCombinations" && e.value),
    )!;
    run.completed = [blocking.id];
    expect(getRecommendedPlan(run).steps).toEqual([]);
  });
});
const target = () => ({ ...emptyRun(), pinned: ["demon_equation"] });
describe("target shopping list", () => {
  it("shows canonical ingredients immediately after loading goals", () => {
    const needs = getNeededMagicForTargets(target());
    expect(needs.map((n) => n.magicId)).toEqual(["fireball", "energy_bolt"]);
    expect(needs.map((n) => n.requiredTraitName)).toEqual(["대폭발", "플레어"]);
    expect(needs.every((n) => n.state === "not_owned")).toBe(true);
  });
  it("tracks leveling, missing trait and ready separately", () => {
    const run = target();
    run.levels.fireball = 4;
    expect(getNeededMagicForTargets(run)[0].state).toBe("leveling");
    run.levels.fireball = 7;
    expect(getNeededMagicForTargets(run)[0].state).toBe("trait_needed");
    run.selectedTraits.fireball = { 7: "big_explosion" };
    expect(getNeededMagicForTargets(run)[0].state).toBe("ready");
  });
  it("flags all shopping rows of a blocked target instead of asking for unusable materials", () => {
    const run = target();
    run.levels.fireball = 7;
    run.selectedTraits.fireball = { 7: "toxic_gas" };
    expect(
      getNeededMagicForTargets(run).every((n) => n.state === "blocked"),
    ).toBe(true);
  });
  it("separates shared requirements when their target roles differ", () => {
    const other = data.combinations.find(
      (c) =>
        c.id !== "demon_equation" &&
        c.requirements.some(
          (r) => r.magicId === "energy_bolt" && r.traitId === "flare",
        ),
    )!;
    const run = { ...target(), pinned: ["demon_equation", other.id] };
    const needs = getNeededMagicForTargets(run).filter(
      (n) => n.magicId === "energy_bolt",
    );
    expect(needs).toHaveLength(2);
    expect(new Set(needs.map((n) => n.role))).toEqual(
      new Set(["carrier", "material"]),
    );
    expect(needs.flatMap((n) => n.targetCombinationIds)).toEqual(run.pinned);
  });
  it("marks completed materials consumed", () => {
    const run = target();
    run.levels = { fireball: 7, energy_bolt: 7 };
    run.selectedTraits = {
      fireball: { 7: "big_explosion" },
      energy_bolt: { 7: "flare" },
    };
    expect(
      getNeededMagicForTargets(
        completeCombination(run, "demon_equation"),
      ).every((n) => n.state === "consumed"),
    ).toBe(true);
  });
  it("supports passive requirements and required level", () => {
    const run = { ...emptyRun(), pinned: ["quantum_explosion"] };
    const passive = getNeededMagicForTargets(run).find(
      (n) => n.magicId === "arcane_effuse",
    )!;
    expect(passive.requiredLevel).toBe(1);
    run.levels.arcane_effuse = 1;
    expect(
      getNeededMagicForTargets(run).find((n) => n.magicId === "arcane_effuse")!
        .state,
    ).toBe("ready");
  });
  it("keeps magic bolt Lv4 and Lv7 requirements distinct", () => {
    const ids = data.combinations
      .filter((c) =>
        c.requirements.some(
          (r) =>
            r.magicId === "magic_bolt" &&
            (r.traitId === "fireworks" || r.traitId === "barrage"),
        ),
      )
      .map((c) => c.id);
    const run = { ...emptyRun(), pinned: ids };
    run.levels.magic_bolt = 7;
    run.selectedTraits.magic_bolt = { 4: "fireworks", 7: "barrage" };
    const needs = getNeededMagicForTargets(run).filter(
      (n) => n.magicId === "magic_bolt",
    );
    expect(new Set(needs.map((n) => n.traitStage))).toEqual(new Set([4, 7]));
    expect(needs.every((n) => n.state === "ready")).toBe(true);
  });
  it("keeps viable shared materials separate from a blocked goal", () => {
    const other = data.combinations.find(
      (c) =>
        c.id !== "demon_equation" &&
        c.requirements.some(
          (r) => r.magicId === "energy_bolt" && r.traitId === "flare",
        ) &&
        !c.activeMagicLocks.includes("fireball"),
    )!;
    const run = { ...target(), pinned: ["demon_equation", other.id] };
    run.levels.fireball = 7;
    run.selectedTraits.fireball = { 7: "toxic_gas" };
    const states = getNeededMagicForTargets(run)
      .filter((n) => n.magicId === "energy_bolt")
      .map((n) => n.state);
    expect(states).toContain("blocked");
    expect(states).toContain("not_owned");
  });
});
describe("focused paths", () => {
  it("provides partner levels, traits, target badges without mutating the run", () => {
    const run = target();
    const before = structuredClone(run);
    const combo = getFocusedMagicPaths(run, "fireball")
      .flatMap((p) => p.combinations)
      .find((c) => c.id === "demon_equation")!;
    expect(combo.badge).toBe("A");
    expect(combo.partners[0].label).toBe("에너지탄 0/7 → 플레어");
    expect(run).toEqual(before);
  });
  it("marks consumed paths blocked using existing engine", () => {
    const run = target();
    run.completed = ["demon_equation"];
    expect(
      getFocusedMagicPaths(run, "energy_bolt")
        .flatMap((p) => p.combinations)
        .filter((c) => c.id !== "demon_equation")
        .every((c) => c.status === "BLOCKED"),
    ).toBe(true);
  });
});
