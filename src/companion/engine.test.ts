import { describe, it, expect } from "vitest";
import { companion, synergyProgress } from "./data";
import {
  defaultProgress,
  normalizeProgress,
  recordGrowth,
  elapsedSeconds,
  timerPhase,
  ultimateRequirements,
} from "./engine";
import { emptyRun, getBlockedReason } from "../engine";
import { data, comboById } from "../data";
import { fresh, serialize, deserialize } from "../storage";
import { metaData, defaultMetaContext } from "../meta/data";
describe("V4 companion facts", () => {
  it("validates catalog sizes and all ultimate references", () => {
    expect(data.passives).toHaveLength(10);
    expect(companion.special).toHaveLength(25);
    expect(companion.growth).toHaveLength(9);
    expect(companion.classes).toHaveLength(24);
    expect(companion.subjects).toHaveLength(25);
    expect(companion.ultimates).toHaveLength(24);
    for (const u of companion.ultimates) {
      expect(comboById[u.requiredCombinationId]).toBeDefined();
      if (u.requiredClassId)
        expect(companion.classes.some((c) => c.id === u.requiredClassId)).toBe(
          true,
        );
      expect(companion.subjects.some((c) => c.id === u.requiredSubjectId)).toBe(
        true,
      );
    }
    for (const s of companion.synergies)
      for (const id of s.requirements)
        expect(metaData.entities.artifacts.some((a) => a.id === id)).toBe(true);
  });
  it("preserves old saves and normalizes optional progress without losing the run", () => {
    const old = fresh();
    delete old.run.meta;
    expect(deserialize(serialize(old))).toEqual(old);
    const s = fresh();
    s.run.levels.fast_casting = 2;
    s.run.progress = { ...defaultProgress(), growth: { intelligence: 999 } };
    const restored = deserialize(serialize(s));
    expect(restored.run.levels.fast_casting).toBe(2);
    expect(restored.run.progress?.growth.intelligence).toBe(8);
  });
  it("keeps growth separate and enforces stage, per-item and total caps", () => {
    let run = emptyRun();
    expect(recordGrowth(run, "intelligence")).toBe(run);
    run = {
      ...run,
      levels: { intelligence: 5 },
      progress: { ...defaultProgress(), growthPhase: true },
    };
    for (const s of companion.growth)
      for (let i = 0; i < 10; i++) run = recordGrowth(run, s.id);
    expect(Object.values(run.progress!.growth).reduce((a, b) => a + b, 0)).toBe(
      50,
    );
    expect(run.levels.intelligence).toBe(5);
    expect(run.progress!.growth.intelligence).toBe(8);
    expect(getBlockedReason(data.combinations[0], run).join()).toContain("MAX");
  });
  it("requires all ultimate conditions and treats classless hallucination correctly", () => {
    const u = companion.ultimates.find((u) => u.id === "hallucination")!;
    const run = {
      ...emptyRun(),
      completed: [u.requiredCombinationId],
      meta: { ...defaultMetaContext(), subject: u.requiredSubjectId },
      progress: { ...defaultProgress(), playerLevel: 100, cityCleared: true },
    };
    expect(ultimateRequirements(run, u.id).every((r) => r.met)).toBe(true);
    for (const changed of [
      { ...run, completed: [] },
      { ...run, meta: { ...run.meta, subject: "" } },
      { ...run, progress: { ...run.progress, playerLevel: 101 } },
      { ...run, progress: { ...run.progress, growthPhase: true } },
    ])
      expect(ultimateRequirements(changed, u.id).every((r) => r.met)).toBe(
        false,
      );
    const b = companion.ultimates.find((u) => u.id === "berserk")!;
    expect(
      ultimateRequirements(
        {
          ...run,
          completed: [b.requiredCombinationId],
          meta: { ...run.meta, subject: b.requiredSubjectId },
        },
        b.id,
      ).find((r) => r.label === "클래스")?.met,
    ).toBe(false);
  });
  it("computes inventory proximity without self-bootstrapping magnum opus", () => {
    const m = companion.synergies.find((s) => s.id === "magnum_opus")!;
    expect(
      synergyProgress(m.requirements.slice(1)).find((s) => s.id === m.id)
        ?.remaining,
    ).toBe(1);
    const inv = [...m.requirements, "second_heart", "bio_shield"];
    expect(
      synergyProgress(inv).find((s) => s.id === "healing_factor")?.remaining,
    ).toBe(0);
    expect(
      synergyProgress(["second_heart", "bio_shield"]).find(
        (s) => s.id === "healing_factor",
      )?.remaining,
    ).toBe(1);
  });
  it("pauses time and handles phase boundaries", () => {
    const p = { ...defaultProgress(), elapsed: 899, startedAt: 1000 };
    expect(timerPhase(elapsedSeconds(p, 2000))).toBe("mid");
    expect(elapsedSeconds({ ...p, startedAt: null }, 999999)).toBe(899);
    expect(normalizeProgress({ elapsed: Infinity }).elapsed).toBe(0);
  });
});
