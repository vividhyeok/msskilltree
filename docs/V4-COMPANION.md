# V4 Run Companion

The original fusion rules, trait stages, target conflicts, carrier/material locks, selection focus, offline storage and history remain authoritative. New optional `Run.progress` records special passives, post-MAX growth, character level, city unlock and an opt-in timer. Old version-1 saves remain readable without adding progress fields. Normal passives keep the original `levels` namespace and IDs; all ten are available in the growth dialog while the three fusion-related passives remain on the live board.

## Live decisions

- Growth dialog: ten normal, twenty-five special and nine post-MAX choices, with per-pick effects. Recorded special choices cannot be recorded twice. Normal picks and growth picks are separate; growth requires explicit MAX mode, respects 8 per type / 50 total, and prevents further fusion. Undo restores all records.
- Run setup: full class, subject and ultimate catalogs. Ultimate planning checks required fusion/class/subject independently. The secondary Run record checks city unlock and the level-100 choice opportunity. Unknown character level does not pass eligibility.
- Artifact event: searchable candidate chips complement the existing selectors. Inventory recipes calculate ten known synergies and explain which candidate completes one. Magnum Opus credit activates only after its own complete recipe. Automatic completions are derived rather than saved into the manual synergy list.
- Timer: optional, pause/resume and manual minutes correction. Phase changes update recommendations without rerunning the expensive path search every second. Editorial thresholds at 25 and 57:30 also refresh. Stop it when pausing the game; elapsed wall time continues across reloads.
- Build coverage lists recorded cooldown/survival/movement/control/economy sources. Missing records are not proof of a weak build; no invented combined stat or numerical build score is displayed.

## Data and boundaries

The supplied pack is retained verbatim in `src-data/v4-research/`. `src/companion/data.ts` adapts its catalogs and recipes; `src/companion/engine.ts` handles recorded growth, timing and eligibility; `src/companion/editorial.ts` keeps time-based opinions out of feasibility. Existing community rules retain their sources, confidence and patch freshness. Source tiers do not determine deterministic availability.

Artifact coverage is a subset merged with existing entities. Missing Korean ingredient mappings visibly use source IDs with a verification label. Normal/special candidate translations remain labelled. Manual synergy records are still accepted for compatibility and incomplete inventories; automatic counts explicitly describe inventory-derived results.

Not modeled as total stats: class upgrades and conflicting specialist scaling, global subject unlocks, research allocations, enchant targets, artifact-added passive levels/MAX, and special-passive rewards (chests, all-growth bonuses). These entries are retained as research/seed, not silently applied. Growth beyond the base 50 choices is not modeled. Character level and MAX are explicitly recorded, never inferred from a partial magic inventory.

Current sources favor the supplied newer Namu values for Arcanist (-1 choice) and Archaeologist (chest / 15 levels); older conflicting values remain documented and are not mixed into calculations. Version 0.992 is the supplied snapshot, not a claim that a later announced patch has been independently verified.

## Next patch

Update the versioned files under `src-data/v4-research/data/authoritative/` for passives, growth, class/subject/ultimate requirements and artifact/synergy recipes, and `data/meta/` for editorial time values. Update import paths when adding a new version. Preserve `source-manifest.json`, `data-status.json` and `research/DATA_CONFLICTS.md`. Existing fusion changes still belong in `src-data/{magics,passives,combinations,rules}.json`; community recommendation changes stay under `src-data/community-meta/current/`.

## Validation

Unit coverage includes legacy storage, all ultimate references, classless and class-bound eligibility, separate growth caps, no self-bootstrapping recipe credit and paused timer boundaries. Browser coverage exercises tablet recording/Undo/reload, quick artifact search and automatic completion, alongside existing recipe/trait/carrier/offline regression scenarios. Screenshots are generated in `test-results/` by Playwright.
