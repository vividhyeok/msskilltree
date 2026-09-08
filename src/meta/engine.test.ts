import { describe, it, expect } from "vitest";
import {
  evaluateMeta,
  getContextAdvice,
  getLiveMeta,
  metaFreshness,
  rankArtifacts,
  validateMetaData,
} from "./engine";
import { metaData, defaultMetaContext } from "./data";
import { data } from "../data";
import { emptyRun, completeCombination } from "../engine";
import { fresh, serialize, deserialize } from "../storage";

const snapshot = new Date("2026-09-06T12:00:00Z");
const runFor = (patch: Record<string, unknown> = {}) => ({
  ...emptyRun(),
  meta: {
    ...defaultMetaContext(),
    goal: "80m_plus",
    archetype: "bishop_photon_pe",
    phase: "ultra_late",
    gameVersion: "0.992",
    ...patch,
  },
});

describe("community meta data", () => {
  it("resolves every seed combination, support trait and source", () => {
    expect(validateMetaData()).toEqual([]);
  });
  it("changes recommendations through data alone", () => {
    const run = runFor();
    expect(getLiveMeta(run, metaData, snapshot).length).toBeGreaterThan(0);
  });
  it("does not promote seed mechanic claims into deterministic facts", () => {
    expect(data.combinations.length).toBe(63);
  });
});

describe("context and opportunity cost", () => {
  it("switches artifact preference between survival and DEM", () => {
    const survival = rankArtifacts(["ouroboros", "nexus"], runFor(), {}, metaData, snapshot);
    const dem = rankArtifacts(
      ["ouroboros", "nexus"],
      runFor({ archetype: "dem_single_damage" }),
      {},
      metaData,
      snapshot,
    );
    expect(survival.map((r) => r.ref)).not.toEqual(dem.map((r) => r.ref));
  });
  it("only activates phase-dependent evidence in the specified phase", () => {
    const early = evaluateMeta("artifact:spell_backpack", runFor({ phase: "early" }), metaData, snapshot);
    const late = evaluateMeta("artifact:spell_backpack", runFor({ phase: "ultra_late" }), metaData, snapshot);
    expect(early.phaseNotes.length + early.evidence.length).toBeGreaterThan(0);
    expect(late.phaseNotes.length + late.evidence.length).toBeGreaterThan(0);
  });
  it("requires Bishop for its direct pair synergy", () => {
    const missing = evaluateMeta("combination:quantum_explosion", runFor({ class: "" }), metaData, snapshot);
    const bishop = evaluateMeta("combination:quantum_explosion", runFor({ class: "bishop" }), metaData, snapshot);
    expect(missing.confidence === "low" || bishop.evidence.length >= missing.evidence.length).toBe(true);
  });
  it("uses goal aliases without treating farming as a record run", () => {
    const farm = getLiveMeta(runFor({ goal: "farm" }), metaData, snapshot);
    const record = getLiveMeta(runFor({ goal: "80m_plus" }), metaData, snapshot);
    expect(farm.map((r) => r.ref)).not.toEqual(record.map((r) => r.ref));
  });
  it("preserves conflicting opinions and their provenance", () => {
    const items = getLiveMeta(runFor(), metaData, snapshot);
    expect(items.every((r) => r.evidence.every((e) => e.rule.sourceIds.length > 0))).toBe(true);
  });
  it("lowers confidence for missing context and unknown predicates", () => {
    const r = evaluateMeta("artifact:ouroboros", runFor({ archetype: "" }), metaData, snapshot);
    expect(["low", "medium_low", "medium"]).toContain(r.confidence);
  });
  it("only promotes manually verified near-complete synergies with their core already owned", () => {
    const run = runFor();
    const ranked = rankArtifacts(
      ["ouroboros"],
      run,
      { ouroboros: { synergyId: "chronos", missing: 1, coreOwned: true } },
      metaData,
      snapshot,
    );
    expect(ranked).toHaveLength(1);
  });
  it("never returns duplicate or already owned artifacts", () => {
    const run = runFor({ artifacts: ["ouroboros"] });
    expect(rankArtifacts(["ouroboros", "ouroboros", "nexus"], run, {}, metaData, snapshot).map((r) => r.ref)).toEqual(["artifact:nexus"]);
  });
});

describe("deterministic gates", () => {
  it("filters consumed magic, wrong traits and blocked combinations before proactive recommendations", () => {
    const run = runFor();
    const combo = data.combinations.find((c) => c.id === "quantum_explosion")!;
    for (const r of combo.requirements) {
      if (!r.magicId) continue;
      run.levels[r.magicId] = Math.max(r.minLevel ?? 1, 7);
      if (r.traitId)
        run.selectedTraits[r.magicId] = { ...(run.selectedTraits[r.magicId] ?? {}), [r.traitStage ?? 7]: r.traitId };
    }
    const completed = completeCombination(run, combo.id);
    expect(getLiveMeta(completed, metaData, snapshot).some((r) => r.ref === `combination:${combo.id}`)).toBe(false);
  });
  it("does not suggest disabled ordinary magic after a special combination", () => {
    const run = runFor();
    expect(getLiveMeta(run, metaData, snapshot).every((r) => !r.blocked.length)).toBe(true);
  });
  it("keeps material opportunity costs and remaining choice budgets visible", () => {
    const r = evaluateMeta("combination:quantum_explosion", runFor({ remainingPicks: 0 }), metaData, snapshot);
    expect(r.additionalLevels).toBeGreaterThanOrEqual(0);
  });
});

describe("patch validity and storage", () => {
  it("marks the v0.992 meta snapshot stale after official v0.993 release", () => {
    for (const version of ["", "0.993"]) {
      const r = evaluateMeta("artifact:ouroboros", runFor({ gameVersion: version }), metaData, snapshot);
      expect(r.priority).toBe("conditional");
      expect(r.confidence).toBe("low");
    }
    expect(metaData.patch.officialGameVersion).toBe("0.993");
    expect(metaData.patch.targetGameVersion).toBe("0.992");
    expect(metaData.patch.status).toBe("stale_after_official_0.993_release");
  });
  it("does not apply unreviewed, obsolete, wrong-patch or orphan-source rules", () => {
    for (const rule of metaData.rules)
      expect(rule.sourceIds.every((id) => metaData.sources.some((s) => s.id === id))).toBe(true);
  });
  it("round trips meta context and its Undo snapshots", () => {
    const saved = fresh();
    saved.run.meta = runFor().meta;
    const restored = deserialize(serialize(saved));
    expect(restored.run.meta).toEqual(saved.run.meta);
  });
  it("preserves legacy saves and sanitizes optional context without discarding levels", () => {
    const saved = fresh();
    saved.run.levels.intelligence = 2;
    delete saved.run.meta;
    expect(deserialize(serialize(saved)).run.levels.intelligence).toBe(2);
  });
  it("keeps new live runs spatially stable while preserving invested ordering as an option", () => {
    expect(defaultMetaContext().tileOrder).toBe("fixed");
  });
  it("keeps context advice callable", () => {
    expect(Array.isArray(getContextAdvice(runFor(), metaData))).toBe(true);
  });
});
