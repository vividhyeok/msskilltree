# Data conflicts / caution

## Arcanist
- AtWiki 2026-03: magic choices -2
- Namu 2026-07: magic choices -1
- **adopt: -1**, because the Korean page is newer and explicitly notes the current behavior.

## Archaeologist
- AtWiki 2026-03: chest every 20 player levels
- Namu 2026-07: chest every 15 player levels
- **adopt: 15**.

## Specialist class scaling
AtWiki class table still describes the older `+5% / 3 levels` pattern while current Namu examples show `+3% / 5 levels`. This pack stores the current Namu pattern but flags per-class verification.

## Tier tables
AtWiki explicitly labels its tier judgments as editorial. Never merge `tier` into deterministic availability.

## Korean artifact names
Some artifact IDs in Subject/Synergy recipe data are normalized from Japanese/English names and are marked candidate. Reuse an already verified Korean name from the current repo when available; otherwise preserve the source name until game-side verification.
