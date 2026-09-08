import { describe, it, expect } from "vitest";
import {
  companion,
  synergyProgress,
  validateCompanionRuntimeData,
} from "./data";
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

describe("verified companion facts", () => {
  it("uses corrected Korean runtime catalogs", () => {
    expect(data.passives).toHaveLength(11);
    expect(companion.special).toHaveLength(24);
    expect(companion.growth).toHaveLength(9);
    expect(companion.classes).toHaveLength(24);
    expect(companion.subjects).toHaveLength(25);
    expect(companion.ultimates).toHaveLength(24);
    expect(companion.synergies).toHaveLength(35);
    expect(validateCompanionRuntimeData()).toEqual([]);

    expect(companion.normal.find((x) => x.id === "advanced_magic")?.nameKo).toBe("상급 마법");
    expect(companion.normal.some((x) => x.id === "enchant")).toBe(true);
    expect(companion.special.some((x) => x.id === "enchant")).toBe(false);
    expect(companion.special.find((x) => x.id === "thundercloud")?.nameKo).toBe("먹구름");
    expect(companion.special.find((x) => x.id === "energy_engineering")?.nameKo).toBe("에너지공학");
    expect(companion.special.find((x) => x.id === "war_magic")?.nameKo).toBe("전쟁마법");
    expect(companion.artifacts.find((x) => x.id === "titan")?.nameKo).toBe("타이탄의 권능");
  });

  it("validates all ultimate and synergy references", () => {
    for (const u of companion.ultimates) {
      expect(comboById[u.requiredCombinationId]).toBeDefined();
      if (u.requiredClassId)
        expect(companion.classes.some((c) => c.id === u.requiredClassId)).toBe(true);
      expect(companion.subjects.some((c) => c.id === u.requiredSubjectId)).toBe(true);
    }
    for (const s of companion.synergies)
      for (const id of s.requirements)
        expect(metaData.entities.artifacts.some((a) => a.id === id)).toBe(true);
  });

  it("preserves old saves and normalizes optional progress", () => {
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

  it("keeps MAX growth separate and capped", () => {
    let run = emptyRun();
    expect(recordGrowth(run, "intelligence")).toBe(run);
    run = {
      ...run,
      levels: { intelligence: 5 },
      progress: { ...defaultProgress(), growthPhase: true },
    };
    for (const s of companion.growth)
      for (let i = 0; i < 10; i++) run = recordGrowth(run, s.id);
    expect(Object.values(run.progress!.growth).reduce((a, b) => a + b, 0)).toBe(50);
    expect(run.progress!.growth.intelligence).toBe(8);
    expect(getBlockedReason(data.combinations[0], run).join()).toContain("MAX");
  });

  it("requires ultimate conditions", () => {
    const u = companion.ultimates.find((u) => u.id === "hallucination")!;
    const run = {
      ...emptyRun(),
      completed: [u.requiredCombinationId],
      meta: { ...defaultMetaContext(), subject: u.requiredSubjectId },
      progress: { ...defaultProgress(), playerLevel: 100, cityCleared: true },
    };
    expect(ultimateRequirements(run, u.id).every((r) => r.met)).toBe(true);
  });

  it("derives artifact synergies without consuming ingredients", () => {
    const recipe = ["ouroboros", "wizard_hat", "black_cat", "hourglass"];
    expect(synergyProgress(recipe.slice(0, 3)).find((s) => s.id === "chronos")?.remaining).toBe(1);
    const complete = synergyProgress(recipe).find((s) => s.id === "chronos")!;
    expect(complete.remaining).toBe(0);
    expect(complete.requirements).toEqual(recipe);
  });

  it("pauses time and handles phase boundaries", () => {
    const p = { ...defaultProgress(), elapsed: 899, startedAt: 1000 };
    expect(timerPhase(elapsedSeconds(p, 2000))).toBe("mid");
    expect(elapsedSeconds({ ...p, startedAt: null }, 999999)).toBe(899);
    expect(normalizeProgress({ elapsed: Infinity }).elapsed).toBe(0);
  });
});
