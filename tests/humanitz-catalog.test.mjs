import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  HUMANITZ_SOURCE_MANIFEST,
  assertUniqueSlugs,
  buildHumanitzCatalog,
  parseWikiTable,
  validateCatalogDataset,
} from "../scripts/generate-humanitz-catalog.mjs";

const GENERATED_SNAPSHOT_PATH = path.resolve("base44/functions/_shared/generated/humanitzCatalog.ts");

async function readGeneratedSnapshot() {
  const source = await fs.readFile(GENERATED_SNAPSHOT_PATH, "utf8");

  const extract = (name, terminatorPattern) => {
    const match = source.match(new RegExp(`export const ${name} = ([\\s\\S]*?)${terminatorPattern}`, "m"));
    assert.ok(match, `Missing ${name} export in generated snapshot`);
    return JSON.parse(match[1]);
  };

  return {
    version: extract("HUMANITZ_CATALOG_VERSION", ";"),
    sourceManifest: extract("HUMANITZ_SOURCE_MANIFEST", ";\\nexport const HUMANITZ_ITEM_CATALOG"),
    items: extract("HUMANITZ_ITEM_CATALOG", ";\\nexport const HUMANITZ_RECIPE_CATALOG"),
    recipes: extract("HUMANITZ_RECIPE_CATALOG", ";\\s*$"),
  };
}

test("parseWikiTable extracts headers and rows from vehicle tables", () => {
  const parsed = parseWikiTable(`{| class="wikitable"
! Display Name !! Vehicle ID !! Storage Slots !! Moddable
|-
| Hatchback || hatchback || 20 || Yes x2
|}`);

  assert.deepEqual(parsed.headers, ["Display Name", "Vehicle ID", "Storage Slots", "Moddable"]);
  assert.equal(parsed.rows.length, 1);
  assert.deepEqual(parsed.rows[0], ["Hatchback", "hatchback", "20", "Yes x2"]);
});

test("buildHumanitzCatalog applies overrides for build, storage, and vehicle records", () => {
  const catalog = buildHumanitzCatalog({
    catalogVersion: "2026-04-10T00:00:00.000Z",
    fandomTitles: [],
    wikiTitles: ["Building", "Cupboard Storage", "Hatchback"],
    fandomModule: "-- fixture",
    wikiPages: ["Build", "Storages", "Vehicles"],
    wikiPageMap: new Map([
      ["Build", "Stub Build enables operatives to create structures and defenses."],
      ["Storages", "Cupboard Storage (build : 6 wood, 1 scrap metal, 10 nails, 1 sheet metal). 5x8 storage space (40 total)."],
      ["Vehicles", `== Cars ==
{| class="wikitable"
! Display Name !! Vehicle ID !! Storage Slots !! Moddable
|-
| Hatchback || hatchback || 20 || Yes x2
|}`],
    ]),
  });

  const building = catalog.items.find((item) => item.slug === "building");
  const cupboard = catalog.items.find((item) => item.slug === "cupboard-storage");
  const hatchback = catalog.items.find((item) => item.slug === "hatchback");

  assert.ok(building);
  assert.equal(building.category, "building");
  assert.ok(building.aliases.includes("Build"));

  assert.ok(cupboard);
  assert.equal(cupboard.category, "storage");
  assert.equal(cupboard.storage_slots, 40);
  assert.ok(cupboard.aliases.includes("Cupboard"));
  assert.deepEqual(
    cupboard.build_materials.map((material) => ({ item_slug: material.item_slug, amount: material.amount })),
    [
      { item_slug: "wood", amount: 6 },
      { item_slug: "scrap-metal", amount: 1 },
      { item_slug: "nails", amount: 10 },
      { item_slug: "sheet-metal", amount: 1 },
    ],
  );

  assert.ok(hatchback);
  assert.equal(hatchback.category, "vehicle");
  assert.equal(hatchback.vehicle_id, "hatchback");
  assert.equal(hatchback.moddable, true);
  assert.equal(hatchback.attributes.mod_slots, 2);
});

test("catalog validation rejects duplicate slugs", () => {
  assert.throws(
    () => assertUniqueSlugs([{ slug: "medkit" }, { slug: "medkit" }], "item"),
    /Duplicate item slug: medkit/,
  );
});

test("generated snapshot passes schema validation and contains key regression fixtures", async () => {
  const snapshot = await readGeneratedSnapshot();
  validateCatalogDataset({ items: snapshot.items, recipes: snapshot.recipes });

  const manifestIds = new Set(snapshot.sourceManifest.map((entry) => entry.id));
  assert.deepEqual(
    new Set(HUMANITZ_SOURCE_MANIFEST.map((entry) => entry.id)),
    manifestIds,
  );

  const itemBySlug = new Map(snapshot.items.map((item) => [item.slug, item]));
  assert.ok(itemBySlug.has("ak47"));
  assert.ok(itemBySlug.has("medkit"));
  assert.ok(itemBySlug.has("military-backpack"));
  assert.ok(itemBySlug.has("45-acp"));
  assert.ok(snapshot.items.some((item) => item.category === "vehicle"));
  assert.ok(snapshot.items.some((item) => item.category === "storage"));
  assert.ok(snapshot.items.some((item) => item.category === "building"));

  const recipeWithIngredientSlugs = snapshot.recipes.find((recipe) => recipe.ingredients?.some((ingredient) => ingredient.item_slug));
  assert.ok(recipeWithIngredientSlugs, "Expected at least one recipe with canonical ingredient slugs");
});
