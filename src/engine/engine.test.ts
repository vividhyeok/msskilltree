import { describe, it, expect } from "vitest";
import { data, comboById, stageFor, type Combination } from "../data";
import {
  emptyRun,
  evaluateCombination,
  completeCombination,
  applyEffects,
  getCombinationConflicts,
  validateGameData,
  type Run,
} from "./index";
import { fresh, serialize, deserialize } from "../storage";
function prepared(c: Combination, base = emptyRun()) {
  const r = structuredClone(base);
  for (const req of c.requirements) {
    if (req.magicId) {
      const stage = stageFor(req);
      r.levels[req.magicId] = Math.max(req.minLevel ?? 1, stage?.level ?? 1);
      if (req.traitId && stage)
        r.selectedTraits[req.magicId] = {
          ...r.selectedTraits[req.magicId],
          [stage.level]: req.traitId,
        };
    }
  }
  return r;
}
const find = (id: string) => comboById[id];
describe("data validation", () => {
  it("validates all 21 magics and 63 combinations", () => {
    expect(data.magics).toHaveLength(21);
    expect(data.combinations).toHaveLength(63);
    expect(() => validateGameData()).not.toThrow();
  });
  it.each(["requirement", "effect", "trait", "lock", "duplicate"])(
    "rejects invalid %s",
    (kind) => {
      const d = structuredClone(data);
      if (kind === "requirement")
        d.combinations[0].requirements[0].type = "unknown" as never;
      if (kind === "effect")
        d.combinations[0].effects.push({ type: "unknown", value: true });
      if (kind === "trait") d.combinations[0].requirements[0].traitStage = 99;
      if (kind === "lock") d.combinations[0].activeMagicLocks = [];
      if (kind === "duplicate") d.magics.push(d.magics[0]);
      expect(() => validateGameData(d)).toThrow();
    },
  );
});
describe("combination engine", () => {
  it("wrong fireball trait blocks a goal", () => {
    const c = find("demon_equation");
    const r = prepared(c);
    r.selectedTraits.fireball[7] = "toxic_gas";
    expect(evaluateCombination(c, r).status).toBe("BLOCKED");
    expect(evaluateCombination(c, r).reasons.join()).toContain("독가스");
  });
  it("completed materials lock other combinations", () => {
    const c = find("demon_equation");
    const r = completeCombination(prepared(c), c.id);
    const other = data.combinations.find(
      (x) => x.id !== c.id && x.activeMagicLocks.includes("energy_bolt"),
    )!;
    expect(evaluateCombination(other, r).status).toBe("BLOCKED");
    expect(evaluateCombination(c, r).status).toBe("COMPLETED");
  });
  it("Lv4 trait ignores Lv7 choice", () => {
    const c = data.combinations.find((c) =>
      c.requirements.some(
        (r) => r.magicId === "magic_bolt" && r.traitStage === 4,
      ),
    )!;
    const r = prepared(c);
    r.levels.magic_bolt = 7;
    r.selectedTraits.magic_bolt[7] = "barrage";
    expect(evaluateCombination(c, r).status).toBe("READY");
  });
  it("Lv7 trait ignores Lv4 choice", () => {
    const c = data.combinations.find((c) =>
      c.requirements.some(
        (r) => r.magicId === "magic_bolt" && r.traitId === "barrage",
      ),
    )!;
    const r = prepared(c);
    r.selectedTraits.magic_bolt[4] = "magic_arrow";
    expect(evaluateCombination(c, r).status).toBe("READY");
  });
  it("quantum explosion needs its passive", () => {
    const c = find("quantum_explosion");
    const r = prepared(c);
    r.levels.arcane_effuse = 0;
    expect(evaluateCombination(c, r).status).toBe("IN_PROGRESS");
    r.levels.arcane_effuse = 1;
    expect(evaluateCombination(c, r).status).toBe("READY");
  });
  it("gate adds two slots", () => {
    const c = find("gate_of_creation");
    const r = completeCombination(prepared(c), c.id);
    expect(applyEffects(r).slots).toBe(5);
    expect(applyEffects(r).extraLevels).toBe(5);
  });
  it("deus requires overmind and third position, then blocks further", () => {
    const c = find("deus_ex_machina");
    expect(evaluateCombination(c, emptyRun()).status).toBe("BLOCKED");
    let r: Run = { ...emptyRun(), completed: ["overmind"] };
    expect(evaluateCombination(c, r).status).toBe("BLOCKED");
    r.completed.push("demon_equation");
    expect(evaluateCombination(c, r).status).toBe("READY");
    r = completeCombination(r, c.id);
    expect(applyEffects(r).blocked).toBe(true);
    expect(evaluateCombination(find("quantum_explosion"), r).status).toBe(
      "BLOCKED",
    );
  });
  it("shared targets report conflicts", () => {
    const r = emptyRun();
    r.pinned = [
      "demon_equation",
      data.combinations.find(
        (c) =>
          c.id !== "demon_equation" &&
          c.activeMagicLocks.includes("energy_bolt"),
      )!.id,
    ];
    expect(getCombinationConflicts(r)).toHaveLength(1);
  });
  it("slot limit rejects completion and bonus increases capacity", () => {
    const r = {
      ...emptyRun(),
      completed: ["demon_equation", "quantum_explosion", "teleport"],
    };
    expect(
      evaluateCombination(
        find("gate_of_creation"),
        prepared(find("gate_of_creation"), r),
      ).status,
    ).toBe("BLOCKED");
    r.bonus = true;
    expect(
      evaluateCombination(
        find("gate_of_creation"),
        prepared(find("gate_of_creation"), r),
      ).status,
    ).toBe("READY");
  });
  it("refuses incomplete completion", () =>
    expect(() => completeCombination(emptyRun(), "demon_equation")).toThrow());
});
describe("persistence", () => {
  it("round-trips run, multi-stage traits, builds, history, audit", () => {
    const s = fresh();
    s.run = prepared(find("demon_equation"));
    s.history = [emptyRun()];
    s.builds = [{ id: "1", name: "화염", pinned: ["demon_equation"] }];
    s.audit = { demon_equation: { status: "match", note: "확인" } };
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it("rejects corrupt and unknown saves", () => {
    expect(() => deserialize("{")).toThrow();
    const s = fresh();
    s.run.levels.fireball = 999;
    expect(() => deserialize(serialize(s))).toThrow();
  });
});
