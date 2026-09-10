import { describe, expect, it } from "vitest";
import { emptyRun } from "../engine";
import { getDeckProfiles, magicDeckHeat, rankDecks } from "./engine";

describe("deck board", () => {
  it("turns existing community archetypes into browseable profiles", () => {
    const profiles = getDeckProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(5);
    expect(profiles.some((profile) => profile.id === "ultimate_survival_pe")).toBe(true);
    expect(
      profiles.find((profile) => profile.id === "ultimate_survival_pe")?.combinationIds,
    ).toContain("perpetual_engine");
  });

  it("raises decks that directly contain the selected magic", () => {
    const ranked = rankDecks(["shield"], emptyRun());
    const survival = ranked.find((deck) => deck.id === "ultimate_survival_pe")!;
    expect(survival.directMatches).toContain("shield");
    expect(survival.score).toBeGreaterThan(0);
  });

  it("uses shared deck or direct combination relationships as visual heat", () => {
    expect(magicDeckHeat("shield", "cloaking")).toBeGreaterThan(0);
    expect(magicDeckHeat("shield", "shield")).toBe(1);
  });
});
