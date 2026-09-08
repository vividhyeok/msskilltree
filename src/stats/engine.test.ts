import { describe, it, expect } from "vitest";
import { emptyRun } from "../engine";
import { computeStats, getStatTotal } from "./engine";

describe("stat engine", () => {
  it("starts empty", () => {
    const s = computeStats(emptyRun());
    expect(s.tracked).toBe(false);
    expect(s.hasPartial).toBe(false);
  });

  it("sums normal passive per-level effects", () => {
    const run = emptyRun();
    run.levels.intelligence = 3;
    const s = computeStats(run);
    expect(getStatTotal(s, "attackPercent")).toBe(30);
    expect(s.stats.attackPercent?.sources.some((x) => x.id === "intelligence"))
      .toBe(true);
  });

  it("stacks multiple additive sources", () => {
    const run = emptyRun();
    run.levels.haste = 2;
    run.levels.exploration = 2;
    const s = computeStats(run);
    expect(getStatTotal(s, "moveSpeedPercent")).toBe(20);
    expect(getStatTotal(s, "pickupRangePercent")).toBe(66);
  });

  it("tracks special passives once", () => {
    const run = emptyRun();
    run.progress = {
      growthPhase: false,
      growth: {},
      special: ["adrenaline"],
      playerLevel: null,
      cityCleared: false,
      elapsed: 0,
      startedAt: null,
    };
    const s = computeStats(run);
    expect(getStatTotal(s, "attackPercent")).toBe(5);
    expect(getStatTotal(s, "critChancePercent")).toBe(5);
    expect(getStatTotal(s, "moveSpeedPercent")).toBe(5);
  });

  it("marks complex artifact effects as partial", () => {
    const run = emptyRun();
    run.meta = { artifacts: ["ouroboros"] } as ReturnType<
      typeof import("../meta/data").normalizeMetaContext
    >;
    const s = computeStats(run);
    expect(getStatTotal(s, "cooldownPercent")).toBe(-15);
  });

  it("separates magic-specific and all-magic damage", () => {
    const run = emptyRun();
    run.levels.advanced_magic = 2;
    const s = computeStats(run);
    expect(getStatTotal(s, "allMagicDamagePercent")).toBe(30);
  });
});
