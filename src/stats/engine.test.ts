import { describe, expect, it } from "vitest";
import { emptyRun } from "../engine";
import { defaultMetaContext } from "../meta/data";
import { getTrackedStats } from "./engine";

describe("tracked stats", () => {
  it("uses canonical Korean labels and additive values", () => {
    const run = {
      ...emptyRun(),
      levels: { intelligence: 1, snipe: 1 },
      meta: { ...defaultMetaContext(), artifacts: ["ruby"] },
    };
    const stats = getTrackedStats(run);
    expect(stats.find((s) => s.nameKo === "공격력")?.value).toBe(22);
    expect(stats.find((s) => s.nameKo === "치명타율")?.value).toBe(5);
  });

  it("combines cooldown reductions multiplicatively", () => {
    const run = {
      ...emptyRun(),
      levels: { fast_casting: 1 },
      meta: { ...defaultMetaContext(), artifacts: ["black_cat"] },
    };
    const cooldown = getTrackedStats(run).find((s) => s.id === "cooldown")!;
    expect(cooldown.operation).toBe("multiplicative");
    expect(cooldown.value).toBeCloseTo(-13.55, 2);
  });

  it("derives non-combination artifact synergies from inventory", () => {
    const run = {
      ...emptyRun(),
      meta: {
        ...defaultMetaContext(),
        artifacts: ["ouroboros", "wizard_hat", "black_cat", "hourglass"],
      },
    };
    const cooldown = getTrackedStats(run).find((s) => s.id === "cooldown")!;
    expect(cooldown.sources.some((s) => s.name.includes("크로노스"))).toBe(true);
  });
});
