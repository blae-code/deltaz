# HumanitZ Game Data Pipeline

This app now ships with a canonical HumanitZ reference catalog generated from live community sources and seeded into Base44 through `gameDataOps`.

## Sources

- HumanitZ Fandom `Module:ItemData`
  - URL: `https://humanitz.fandom.com/wiki/Module:ItemData`
  - Used for structured food, drink, medical, backpack, clothing, and crafting data.
- HumanitZ wiki.gg `Gear`
  - URL: `https://humanitz.wiki.gg/wiki/Gear`
  - Used to enrich tools, weapons, ammo compatibility, and weight hints.
- HumanitZ wiki.gg `Ammunition`
  - URL: `https://humanitz.wiki.gg/wiki/Ammunition`
  - Used to enrich ammo descriptions and weights.
- HumanitZ wiki.gg `Resources`
  - URL: `https://humanitz.wiki.gg/wiki/Resources`
  - Used to enrich harvestable and ore resource references.
- HumanitZ wiki.gg `Build`
  - URL: `https://humanitz.wiki.gg/wiki/Build`
  - Used to seed building/structure reference metadata.
- HumanitZ wiki.gg `Storages`
  - URL: `https://humanitz.wiki.gg/wiki/Storages`
  - Used to seed buildable storage container recipes and slot counts.
- HumanitZ wiki.gg `Vehicles`
  - URL: `https://humanitz.wiki.gg/wiki/Vehicles`
  - Used to seed vehicle IDs, storage, and moddable metadata.

## Generated Assets

- Generator script: `scripts/generate-humanitz-catalog.mjs`
- Generated snapshot: `base44/functions/_shared/generated/humanitzCatalog.ts`
- Local overrides: `base44/functions/_shared/humanitzCatalogOverrides.mjs`
- Canonical entity: `base44/entities/GameItem.jsonc`
- Seed function: `base44/functions/gameDataOps/entry.ts`

## Current Coverage

The generated snapshot currently contains:

- `345` canonical `GameItem` records
- `99` canonical `Recipe` records

Coverage includes:

- Ammunition
- Weapons
- Tools
- Medical supplies
- Food and drink
- Backpacks
- Clothing and armor
- Raw resources and crafting materials
- Vehicles
- Buildables and structures
- Buildable storage objects
- Crafting outputs and ingredient graphs

## Runtime Behavior

- `AppShell` invokes `gameDataOps` with `action: "bootstrap_catalog"` after auth resolves.
- `bootstrap_catalog` is idempotent. It ensures the checked-in snapshot is present and then advances canonical slug backfill in chunks.
- `gameDataOps` supports admin-triggered `sync_snapshot`, `sync_live`, `backfill_references`, and `get_status`.
- Legacy handcrafted starter recipes are automatically disabled when the real catalog is seeded.
- Inventory add, bulk add, screenshot import, workbench flows, and trade flows now reference canonical item slugs.
- Admins can manage catalog state, attribution, and backfill progress in Systems/Economy → Catalog Ops.

## Refresh Workflow

1. Run `npm run data:sync:humanitz`.
2. Review the diff in `base44/functions/_shared/generated/humanitzCatalog.ts`.
3. Run `npm run test:data`.
4. Deploy or run the app so `gameDataOps` bootstraps the snapshot and resumes backfill.
5. Verify inventory, workbench, and trade flows against the updated catalog.

## Override Precedence

Final catalog data is resolved in this order:

1. Parsed upstream community sources
2. Local overrides in `humanitzCatalogOverrides.mjs`
3. Snapshot generation into `humanitzCatalog.ts`
4. Base44 upsert through `gameDataOps`

This keeps manual fixes small and auditable instead of editing the generated snapshot directly.

## Known Limits

- wiki.gg blocks some direct programmatic requests; the generator includes a PowerShell fallback for that host in this environment.
- Community data is incomplete for some weapon and material pages, so a subset of records are derived from crafting graphs and then enriched when source metadata exists.
- The app inventory model still uses player-facing categories (`weapon`, `armor`, `tool`, `consumable`, `material`, `ammo`, `misc`), so `GameItem.inventory_category` maps richer reference categories into the existing player inventory taxonomy.
- Live sync is intentionally allowlisted to the specific HumanitZ source pages above.
