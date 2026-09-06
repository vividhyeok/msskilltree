# Data merge guide for Codex

Do not blindly replace the current repo data.

Use this package as an **authoritative supplement**.

Recommended merge concept:

- Existing `magics.json` / `combinations.json`: preserve and keep `/audit`.
- Existing 3 passives: migrate into full `normal-passives` model without breaking old saves.
- Add special passives as a separate choice category.
- Add growth enhancements as a post-MAX phase, not normal pre-MAX passives.
- Replace the tiny Class/Subject/Ultimate meta sample with full catalogs where IDs can be mapped safely.
- Merge existing `community-meta/current/entities.json` with the artifact/synergy authoritative seed rather than deleting community metadata.
- Keep factual effect data and community recommendation rules in separate files/modules.

### Provenance
Every imported row should keep:
- sourceId
- gameVersion
- verification / mapping status
- editorial-vs-factual type

### Save migration
Old localStorage saves must load unchanged. New state fields should default safely.
