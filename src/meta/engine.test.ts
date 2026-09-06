import { describe, expect, it } from "vitest";
import { data, comboById } from "../data";
import { emptyRun, evaluateCombination, type Run } from "../engine";
import { deserialize, fresh, serialize } from "../storage";
import { getSortedMagics } from "../features/game-mode/selectors";
import {
  defaultMetaContext,
  metaData,
  normalizeMetaContext,
  type MetaContext,
} from "./data";
import {
  evaluateMeta,
  getLiveMeta,
  metaFreshness,
  rankArtifacts,
  validateMetaData,
} from "./engine";

const snapshot = new Date("2026-09-06T00:00:00Z");
const runFor = (changes: Partial<MetaContext> = {}): Run => ({
  ...emptyRun(),
  meta: {
    ...defaultMetaContext(),
    goal: "stable_pb",
    archetype: "ultimate_survival_pe",
    phase: "mid",
    gameVersion: "0.992",
    ...changes,
  },
});

describe("community meta data", () => {
  it("resolves every seed combination, support trait and source", () =>
    expect(validateMetaData()).toEqual([]));
  it("changes recommendations through data alone", () => {
    const run = runFor();
    expect(
      rankArtifacts(["nexus", "ouroboros"], run, {}, metaData, snapshot)[0].ref,
    ).toBe("artifact:ouroboros");
    const changed = structuredClone(metaData);
    changed.rules = changed.rules.filter(
      (r) => r.id !== "accelerator_ouroboros",
    );
    const nexus = changed.rules.find((r) => r.id === "dem_nexus")!;
    nexus.context.archetype = ["ultimate_survival_pe"];
    nexus.rationaleKo = "갱신된 자료의 추천 이유";
    const ranked = rankArtifacts(
      ["nexus", "ouroboros"],
      run,
      {},
      changed,
      snapshot,
    );
    expect(ranked[0].ref).toBe("artifact:nexus");
    expect(ranked[0].evidence[0].rule.rationaleKo).toBe(nexus.rationaleKo);
  });
  it("does not promote seed mechanic claims into deterministic facts", () => {
    const run = runFor();
    expect(
      evaluateMeta(
        "mechanic:ultimate_consumes_level100_choice",
        run,
        metaData,
        snapshot,
      ).evidence,
    ).toEqual([]);
    expect(run.meta!.remainingPicks).toBeNull();
  });
});
describe("context and opportunity cost", () => {
  it("switches artifact preference between survival and DEM", () => {
    const candidates = ["nexus", "ouroboros", "gear"];
    expect(
      rankArtifacts(candidates, runFor(), {}, metaData, snapshot)[0].ref,
    ).toBe("artifact:ouroboros");
    expect(
      rankArtifacts(
        candidates,
        runFor({ archetype: "dem_single_damage", goal: "farm" }),
        {},
        metaData,
        snapshot,
      )[0].ref,
    ).toBe("artifact:nexus");
  });
  it("only activates phase-dependent evidence in the specified phase", () => {
    const early = rankArtifacts(
      ["spell_backpack", "gear"],
      runFor({ phase: "early" }),
      {},
      metaData,
      snapshot,
    );
    const late = rankArtifacts(
      ["spell_backpack", "gear"],
      runFor({ phase: "ultra_late" }),
      {},
      metaData,
      snapshot,
    );
    expect(early[0].ref).toBe("artifact:spell_backpack");
    expect(late[0].ref).toBe("artifact:gear");
    expect(
      late.find((r) => r.ref === "artifact:spell_backpack")!.evidence,
    ).toEqual([]);
    expect(
      late.find((r) => r.ref === "artifact:spell_backpack")!.phaseNotes,
    ).toHaveLength(1);
  });
  it("requires Bishop for its direct pair synergy", () => {
    expect(
      evaluateMeta(
        "combination:quantum_explosion",
        runFor({ class: "bishop" }),
        metaData,
        snapshot,
      ).priority,
    ).toBe("core");
    expect(
      evaluateMeta(
        "combination:quantum_explosion",
        runFor({ class: "battlemage" }),
        metaData,
        snapshot,
      ).evidence,
    ).toEqual([]);
    expect(
      evaluateMeta(
        "combination:quantum_explosion",
        runFor(),
        metaData,
        snapshot,
      ).priority,
    ).toBe("conditional");
  });
  it("uses goal aliases without treating farming as a record run", () => {
    expect(
      evaluateMeta(
        "combination:perpetual_engine",
        runFor({ goal: "first_60m" }),
        metaData,
        snapshot,
      ).evidence.length,
    ).toBeGreaterThan(0);
    expect(
      evaluateMeta(
        "combination:perpetual_engine",
        runFor({ goal: "farm" }),
        metaData,
        snapshot,
      ).evidence,
    ).toEqual([]);
  });
  it("preserves conflicting opinions and their provenance", () => {
    const r = evaluateMeta(
      "combination:meissner_effect",
      runFor(),
      metaData,
      snapshot,
    );
    expect(r.disputed).toBe(true);
    expect(r.priority).toBe("consider");
    expect(r.evidence[0].rule.caveatKo).toContain("의견 갈림");
    expect(r.evidence[0].rule.sourceIds.length).toBeGreaterThan(0);
  });
  it("lowers confidence for missing context and unknown predicates", () => {
    const r = evaluateMeta(
      "artifact:ouroboros",
      runFor({ archetype: "" }),
      metaData,
      snapshot,
    );
    expect(r.priority).toBe("conditional");
    expect(r.confidence).toBe("low");
    const changed = structuredClone(metaData);
    changed.rules.find(
      (r) => r.id === "accelerator_ouroboros",
    )!.context.unknownPredicate = ["x"];
    expect(
      evaluateMeta("artifact:ouroboros", runFor(), changed, snapshot).evidence,
    ).toEqual([]);
  });
  it("only promotes manually verified near-complete synergies with their core already owned", () => {
    const near = { gear: { synergyId: "oracle", missing: 1, coreOwned: true } };
    expect(
      rankArtifacts(["gear"], runFor(), near, metaData, snapshot)[0].priority,
    ).toBe("high");
    expect(
      rankArtifacts(
        ["gear"],
        runFor(),
        { gear: { ...near.gear, coreOwned: false } },
        metaData,
        snapshot,
      )[0].priority,
    ).toBe("unknown");
    expect(
      rankArtifacts(
        ["gear"],
        runFor(),
        { gear: { ...near.gear, missing: 3 } },
        metaData,
        snapshot,
      )[0].priority,
    ).toBe("unknown");
    expect(
      rankArtifacts(
        ["gear"],
        runFor({ synergies: ["oracle"] }),
        near,
        metaData,
        snapshot,
      )[0].priority,
    ).toBe("unknown");
  });
  it("never returns duplicate or already owned artifacts", () => {
    const result = rankArtifacts(
      ["gear", "gear", "ouroboros", "not_known"],
      runFor({ artifacts: ["ouroboros"] }),
      {},
      metaData,
      snapshot,
    );
    expect(result.map((r) => r.ref)).toEqual(["artifact:gear"]);
  });
});
describe("deterministic gates", () => {
  it("filters consumed magic, wrong traits and blocked combinations before proactive recommendations", () => {
    const run = runFor();
    run.completed = ["quantum_explosion"];
    run.levels = { shield: 5, frost_nova: 7 };
    run.selectedTraits = {
      shield: { 5: "destruction_field" },
      frost_nova: { 7: "ice_age" },
    };
    const before = structuredClone(run);
    expect(
      getLiveMeta(run, metaData, snapshot).some(
        (r) =>
          r.ref === "active:shield_reconstruction" ||
          r.ref === "active:frost_nova_absolute_zero",
      ),
    ).toBe(false);
    expect(
      evaluateMeta(
        "active:shield_reconstruction",
        run,
        metaData,
        snapshot,
      ).blocked.join(),
    ).toContain("재사용 불가");
    for (const r of getLiveMeta(run, metaData, snapshot).filter((r) =>
      r.ref.startsWith("combination:"),
    ))
      expect(
        evaluateCombination(comboById[r.ref.split(":")[1]], run).status,
      ).not.toBe("BLOCKED");
    expect(run).toEqual(before);
  });
  it("does not suggest disabled ordinary magic after a special combination", () => {
    const run = runFor();
    run.completed = [
      data.combinations.find((c) =>
        c.effects.some(
          (e) => e.type === "disableNonCombinationActiveMagic" && e.value,
        ),
      )!.id,
    ];
    expect(
      getLiveMeta(run, metaData, snapshot).some((r) =>
        r.ref.startsWith("active:"),
      ),
    ).toBe(false);
  });
  it("keeps material opportunity costs and remaining choice budgets visible", () => {
    const run = runFor({ remainingPicks: 2 });
    run.pinned = ["quantum_explosion"];
    const support = evaluateMeta(
      "active:shield_reconstruction",
      run,
      metaData,
      snapshot,
    );
    expect(support.priority).toBe("caution");
    expect(support.notes.join()).toContain("조합 재료");
    expect(support.notes.join()).toContain("남은 선택 2회");
    expect(
      getLiveMeta(run, metaData, snapshot).some((r) => r.ref === support.ref),
    ).toBe(false);
  });
});
describe("patch validity and storage", () => {
  it("reduces confidence for unknown versions, mismatches and the supplied patch watch date", () => {
    for (const version of ["", "0.993"]) {
      const r = evaluateMeta(
        "artifact:ouroboros",
        runFor({ gameVersion: version }),
        metaData,
        snapshot,
      );
      expect(r.priority).toBe("conditional");
      expect(r.confidence).toBe("low");
    }
    expect(
      metaFreshness(runFor().meta!, metaData, new Date("2026-09-07T01:00:00Z"))
        .limited,
    ).toBe(true);
    expect(metaFreshness(runFor().meta!, metaData, snapshot).limited).toBe(
      false,
    );
  });
  it("does not apply unreviewed, obsolete, wrong-patch or orphan-source rules", () => {
    for (const mutation of [
      { reviewStatus: "obsolete" },
      { reviewStatus: "unknown" },
      { patch: "0.993" },
      { sourceIds: ["missing"] },
    ] as const) {
      const dataset = structuredClone(metaData);
      Object.assign(
        dataset.rules.find((r) => r.id === "accelerator_ouroboros")!,
        mutation,
      );
      expect(
        evaluateMeta("artifact:ouroboros", runFor(), dataset, snapshot)
          .evidence,
      ).toEqual([]);
    }
  });
  it("round trips meta context and its Undo snapshots", () => {
    const s = fresh();
    s.run = runFor({
      artifacts: ["gear"],
      synergies: ["oracle"],
      remainingPicks: 9,
    });
    s.history = [runFor({ remainingPicks: 10 })];
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it("preserves legacy saves and sanitizes optional context without discarding levels", () => {
    const s = fresh();
    s.run = { ...emptyRun(), levels: { fireball: 4 } };
    expect(deserialize(serialize(s))).toEqual(s);
    const corrupt = JSON.parse(serialize(s));
    corrupt.run.meta = {
      remainingPicks: -4,
      artifacts: ["gear", "gear", "nope"],
      archetype: "bad",
      tileOrder: "fixed",
    };
    const recovered = deserialize(JSON.stringify(corrupt));
    expect(recovered.run.levels.fireball).toBe(4);
    expect(recovered.run.meta!.artifacts).toEqual(["gear"]);
    expect(recovered.run.meta!.remainingPicks).toBeNull();
    expect(normalizeMetaContext(null).tileOrder).toBe("invested");
  });
  it("keeps new live runs spatially stable while preserving invested ordering as an option", () => {
    const run = fresh().run;
    const before = getSortedMagics(run).map((m) => m.id);
    run.levels.fireball = 3;
    expect(getSortedMagics(run).map((m) => m.id)).toEqual(before);
    run.meta!.tileOrder = "invested";
    expect(getSortedMagics(run)[0].id).toBe("fireball");
  });
});
