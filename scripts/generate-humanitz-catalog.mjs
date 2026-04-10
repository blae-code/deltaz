import {
  HUMANITZ_EXTRA_ITEMS,
  HUMANITZ_ITEM_OVERRIDES,
  HUMANITZ_ITEM_ALIAS_OVERRIDES,
  HUMANITZ_RECIPE_OVERRIDES,
} from "../base44/functions/_shared/humanitzCatalogOverrides.mjs";

const OUTPUT_FILE_URL = new URL("../base44/functions/_shared/generated/humanitzCatalog.ts", import.meta.url);

export const FANDOM_API = "https://humanitz.fandom.com/api.php";
export const WIKI_GG_API = "https://humanitz.wiki.gg/api.php";
export const USER_AGENT = "Codex/1.0 (+https://openai.com)";

export const FANDOM_MODULE_PAGE = "Module:ItemData";
export const WIKI_GG_PAGES = [
  "Gear",
  "Ammunition",
  "Resources",
  "Build",
  "Storages",
  "Vehicles",
  ".45 ACP",
  ".50 Cal",
  "9MM",
  "9mm",
];

const RESOURCE_HINTS = [
  {
    name: "Scrap Metal",
    description: "Harvested from wrecked cars and used in a wide range of crafting recipes.",
    subcategory: "scrap",
  },
  {
    name: "Sheet Metal",
    description: "Recovered from vehicles and used for heavier crafted items and fortifications.",
    subcategory: "scrap",
  },
  {
    name: "Fibers",
    description: "Gathered from bushes and used for rope, bandages, and improvised gear.",
    subcategory: "plant_fiber",
  },
  {
    name: "Sticks",
    description: "Gathered from bushes and used for rope, arrows, and improvised weapons.",
    subcategory: "wood",
  },
  {
    name: "Bait",
    description: "Occasionally gathered from bushes and used for fishing or animal traps.",
    subcategory: "bait",
  },
  {
    name: "Logs",
    description: "Cut from trees and processed into wood for construction and crafting.",
    subcategory: "wood",
  },
  {
    name: "Wood",
    description: "Processed lumber used in tools, arrows, weapons, and structures.",
    subcategory: "wood",
  },
  {
    name: "Copper Ore",
    description: "Mined ore that can be refined through smelting.",
    subcategory: "ore",
  },
  {
    name: "Iron Ore",
    description: "Mined ore that can be refined into iron for advanced crafting.",
    subcategory: "ore",
  },
  {
    name: "Coal",
    description: "Fuel source gathered from mining and used in smelting chains.",
    subcategory: "ore",
  },
  {
    name: "Salpeter",
    description: "Mineable crafting resource used in chemical and ammunition chains.",
    subcategory: "chemical",
  },
  {
    name: "Zinc",
    description: "Mineable metal used in brass and ammunition crafting.",
    subcategory: "ore",
  },
];

const FANDOM_PAGE_URL = `https://humanitz.fandom.com/wiki/${encodeTitle(FANDOM_MODULE_PAGE)}`;
const CRAFTING_PAGE_URL = "https://humanitz.fandom.com/wiki/Crafting";
const WIKI_GG_BASE = "https://humanitz.wiki.gg/wiki/";
export const HUMANITZ_SOURCE_MANIFEST = [
  {
    id: "humanitz-fandom-module-itemdata",
    label: "HumanitZ Fandom Module:ItemData",
    scope: "fandom",
    url: FANDOM_PAGE_URL,
    usage: "Primary structured source for food, drink, medical, backpack, clothing, and crafting recipe data.",
  },
  {
    id: "humanitz-wiki-gg-gear",
    label: "HumanitZ Wiki.gg Gear",
    scope: "wiki_gg",
    url: `${WIKI_GG_BASE}${encodeTitle("Gear")}`,
    usage: "Supplemental source for tools, weapons, ammo compatibility, and weapon weights.",
  },
  {
    id: "humanitz-wiki-gg-ammunition",
    label: "HumanitZ Wiki.gg Ammunition",
    scope: "wiki_gg",
    url: `${WIKI_GG_BASE}${encodeTitle("Ammunition")}`,
    usage: "Supplemental source for ammunition descriptions and weight references.",
  },
  {
    id: "humanitz-wiki-gg-resources",
    label: "HumanitZ Wiki.gg Resources",
    scope: "wiki_gg",
    url: `${WIKI_GG_BASE}${encodeTitle("Resources")}`,
    usage: "Supplemental source for harvesting and ore resource definitions.",
  },
  {
    id: "humanitz-wiki-gg-build",
    label: "HumanitZ Wiki.gg Build",
    scope: "wiki_gg",
    url: `${WIKI_GG_BASE}${encodeTitle("Build")}`,
    usage: "Supplemental source for buildable structure descriptions.",
  },
  {
    id: "humanitz-wiki-gg-storages",
    label: "HumanitZ Wiki.gg Storages",
    scope: "wiki_gg",
    url: `${WIKI_GG_BASE}${encodeTitle("Storages")}`,
    usage: "Supplemental source for buildable storage container recipes and capacity.",
  },
  {
    id: "humanitz-wiki-gg-vehicles",
    label: "HumanitZ Wiki.gg Vehicles",
    scope: "wiki_gg",
    url: `${WIKI_GG_BASE}${encodeTitle("Vehicles")}`,
    usage: "Supplemental source for vehicle display names, IDs, storage, and moddable status.",
  },
];

export async function generateHumanitzCatalog({
  catalogVersion = new Date().toISOString(),
  fetchJsonImpl = fetchJson,
  wikiPages = WIKI_GG_PAGES,
} = {}) {
  const sourceBundle = await fetchHumanitzSourceBundle({ fetchJsonImpl, wikiPages });
  return buildHumanitzCatalog({
    catalogVersion,
    wikiPages,
    ...sourceBundle,
  });
}

export async function fetchHumanitzSourceBundle({
  fetchJsonImpl = fetchJson,
  wikiPages = WIKI_GG_PAGES,
} = {}) {
  const [fandomTitles, wikiTitles, fandomModule] = await Promise.all([
    listAllPages(FANDOM_API, fetchJsonImpl),
    listAllPages(WIKI_GG_API, fetchJsonImpl),
    fetchWikitext(FANDOM_API, FANDOM_MODULE_PAGE, fetchJsonImpl),
  ]);

  const wikiPageMap = new Map();
  for (const title of wikiPages) {
    wikiPageMap.set(title, await fetchWikitext(WIKI_GG_API, title, fetchJsonImpl));
  }

  return {
    fandomTitles,
    wikiTitles,
    fandomModule,
    wikiPageMap,
  };
}

export function buildHumanitzCatalog({
  catalogVersion,
  fandomTitles,
  wikiTitles,
  fandomModule,
  wikiPageMap,
  wikiPages = WIKI_GG_PAGES,
}) {
  const fandomTitleSet = new Set(fandomTitles);
  const wikiTitleSet = new Set(wikiTitles);
  const fandomData = parseItemDataModule(fandomModule);

  const itemMap = new Map();
  const recipeMap = new Map();

  const addItem = (input) => upsertItem(itemMap, input, { fandomTitleSet, wikiTitleSet });
  const addRecipe = (input) => upsertRecipe(recipeMap, input);

  importMedicalItems(fandomData.MedicalSuppliesData || {}, addItem, fandomTitleSet);
  importFoodAndDrinkItems(fandomData.FoodDrinkData || {}, addItem, fandomTitleSet);
  importBackpackItems(fandomData.BackpackData || {}, addItem, fandomTitleSet);
  importClothingItems(fandomData.ClothingData || {}, addItem, fandomTitleSet);
  importTemporaryImages(fandomData.TemporaryData || {}, addItem, fandomTitleSet);

  importGearPage(wikiPageMap.get("Gear") || "", addItem, wikiTitleSet);
  importAmmunitionPage(wikiPageMap.get("Ammunition") || "", addItem, wikiTitleSet);
  importAmmoDetailPages(
    new Map(
      wikiPages
        .filter((title) => /^(\.|\d)/.test(title))
        .map((title) => [title, wikiPageMap.get(title) || ""]),
    ),
    addItem,
    wikiTitleSet,
  );
  importResourcesPage(wikiPageMap.get("Resources") || "", addItem, wikiTitleSet);
  importBuildPage(wikiPageMap.get("Build") || wikiPageMap.get("Building") || "", addItem, wikiTitleSet);
  importStoragesPage(wikiPageMap.get("Storages") || "", addItem, wikiTitleSet);
  importVehiclesPage(wikiPageMap.get("Vehicles") || "", addItem, wikiTitleSet);

  importCraftingData(fandomData.CraftingData || {}, addItem, addRecipe, fandomTitleSet, wikiTitleSet);

  for (const extraItem of HUMANITZ_EXTRA_ITEMS) {
    addItem(extraItem);
  }

  const items = finalizeItems([...itemMap.values()], catalogVersion);
  const recipes = finalizeRecipes([...recipeMap.values()], items, catalogVersion);
  const overriddenItems = assertUniqueSlugs(applyItemOverrides(items), "item");
  const overriddenRecipes = assertUniqueSlugs(applyRecipeOverrides(recipes), "recipe");

  validateCatalogDataset({
    items: overriddenItems,
    recipes: overriddenRecipes,
  });

  return {
    catalogVersion,
    sourceManifest: HUMANITZ_SOURCE_MANIFEST,
    items: overriddenItems,
    recipes: overriddenRecipes,
  };
}

export async function writeCatalogSnapshot({
  catalogVersion,
  sourceManifest,
  items,
  recipes,
}, outputFileUrl = OUTPUT_FILE_URL) {
  const [{ default: fs }, { fileURLToPath }] = await Promise.all([
    import("node:fs/promises"),
    import("node:url"),
  ]);

  const outputFilePath = fileURLToPath(outputFileUrl);
  const outputDirUrl = new URL(".", outputFileUrl);
  const outputDirPath = fileURLToPath(outputDirUrl);

  await fs.mkdir(outputDirPath, { recursive: true });
  await fs.writeFile(
    outputFilePath,
    [
      "/* eslint-disable */",
      "// Generated by scripts/generate-humanitz-catalog.mjs",
      `export const HUMANITZ_CATALOG_VERSION = ${JSON.stringify(catalogVersion)};`,
      `export const HUMANITZ_SOURCE_MANIFEST = ${JSON.stringify(sourceManifest, null, 2)};`,
      `export const HUMANITZ_ITEM_CATALOG = ${JSON.stringify(items, null, 2)};`,
      `export const HUMANITZ_RECIPE_CATALOG = ${JSON.stringify(recipes, null, 2)};`,
      "",
    ].join("\n"),
    "utf8",
  );

  return outputFilePath;
}

export function assertUniqueSlugs(records, label = "record") {
  const seen = new Set();

  for (const record of Array.isArray(records) ? records : []) {
    const slug = normalizeWhitespace(record?.slug);
    if (!slug) {
      throw new Error(`Missing ${label} slug`);
    }
    if (seen.has(slug)) {
      throw new Error(`Duplicate ${label} slug: ${slug}`);
    }
    seen.add(slug);
  }

  return records;
}

export function validateCatalogDataset({ items = [], recipes = [] }) {
  assertUniqueSlugs(items, "item");
  assertUniqueSlugs(recipes, "recipe");

  for (const item of items) {
    if (!normalizeWhitespace(item?.name)) {
      throw new Error(`Invalid item schema: missing name for slug ${item?.slug || "<unknown>"}`);
    }
    if (!normalizeToken(item?.category)) {
      throw new Error(`Invalid item schema: missing category for slug ${item.slug}`);
    }
    if (!normalizeToken(item?.inventory_category)) {
      throw new Error(`Invalid item schema: missing inventory_category for slug ${item.slug}`);
    }
  }

  for (const recipe of recipes) {
    if (!normalizeWhitespace(recipe?.name)) {
      throw new Error(`Invalid recipe schema: missing name for slug ${recipe?.slug || "<unknown>"}`);
    }
    if (!normalizeWhitespace(recipe?.item_slug)) {
      throw new Error(`Invalid recipe schema: missing item_slug for recipe ${recipe.slug}`);
    }
    if (!Array.isArray(recipe?.ingredients) || recipe.ingredients.length === 0) {
      throw new Error(`Invalid recipe schema: recipe ${recipe.slug} has no ingredients`);
    }
    for (const ingredient of recipe.ingredients) {
      if (!normalizeWhitespace(ingredient?.resource)) {
        throw new Error(`Invalid recipe schema: recipe ${recipe.slug} has ingredient without resource`);
      }
      if (!normalizeWhitespace(ingredient?.item_slug)) {
        throw new Error(`Invalid recipe schema: recipe ${recipe.slug} has ingredient without item_slug`);
      }
    }
  }

  return { items, recipes };
}

export async function fetchJson(url) {
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        return response.json();
      }

      lastError = new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
      if (response.status === 403 && url.includes("wiki.gg")) {
        return fetchJsonViaPowerShell(url);
      }
      if (![403, 429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
        throw lastError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (url.includes("wiki.gg")) {
        return fetchJsonViaPowerShell(url);
      }
      if (attempt === 2) {
        throw lastError;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  throw lastError || new Error(`Request failed for ${url}`);
}

async function fetchJsonViaPowerShell(url) {
  const [{ execFile: execFileCb }, { promisify }] = await Promise.all([
    import("node:child_process"),
    import("node:util"),
  ]);
  const execFile = promisify(execFileCb);

  const command = [
    "$ProgressPreference='SilentlyContinue'",
    `$u = ${toPowerShellString(url)}`,
    "$resp = Invoke-WebRequest -UseBasicParsing -Uri $u -Headers @{ 'User-Agent' = 'Codex/1.0'; 'Accept' = 'application/json' }",
    "Write-Output $resp.Content",
  ].join("; ");

  const { stdout } = await execFile("powershell", ["-NoProfile", "-Command", command], {
    cwd: process.cwd(),
    maxBuffer: 20 * 1024 * 1024,
  });

  return JSON.parse(stdout);
}

async function listAllPages(apiBase, fetchJsonImpl = fetchJson) {
  const titles = [];
  let cursor = "";

  while (true) {
    const url = new URL(apiBase);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "allpages");
    url.searchParams.set("apnamespace", "0");
    url.searchParams.set("aplimit", "500");
    url.searchParams.set("format", "json");

    if (cursor) {
      url.searchParams.set("apcontinue", cursor);
    }

    const payload = await fetchJsonImpl(url.toString());
    for (const page of payload?.query?.allpages || []) {
      titles.push(page.title);
    }

    cursor = payload?.continue?.apcontinue || "";
    if (!cursor) {
      return titles;
    }
  }
}

async function fetchWikitext(apiBase, title, fetchJsonImpl = fetchJson) {
  const url = new URL(apiBase);
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("format", "json");

  const payload = await fetchJsonImpl(url.toString());
  return payload?.parse?.wikitext?.["*"] || "";
}

class LuaParser {
  constructor(text, index = 0) {
    this.text = text;
    this.index = index;
  }

  peek(offset = 0) {
    return this.text[this.index + offset];
  }

  atEnd() {
    return this.index >= this.text.length;
  }

  skipWhitespace() {
    while (!this.atEnd()) {
      const ch = this.peek();
      if (/\s/.test(ch)) {
        this.index += 1;
        continue;
      }

      if (ch === "-" && this.peek(1) === "-") {
        if (this.peek(2) === "[" && this.peek(3) === "[") {
          this.index += 4;
          while (!this.atEnd() && !(this.peek() === "]" && this.peek(1) === "]")) {
            this.index += 1;
          }
          if (!this.atEnd()) {
            this.index += 2;
          }
          continue;
        }

        this.index += 2;
        while (!this.atEnd() && this.peek() !== "\n") {
          this.index += 1;
        }
        continue;
      }

      break;
    }
  }

  parseString() {
    const quote = this.peek();
    this.index += 1;
    let value = "";

    while (!this.atEnd()) {
      const ch = this.peek();
      if (ch === "\\") {
        value += this.peek(1) || "";
        this.index += 2;
        continue;
      }
      if (ch === quote) {
        this.index += 1;
        return value;
      }
      value += ch;
      this.index += 1;
    }

    throw new Error("Unterminated Lua string");
  }

  parseNumber() {
    const match = this.text.slice(this.index).match(/^-?\d+(?:\.\d+)?/);
    if (!match) {
      throw new Error(`Invalid Lua number near index ${this.index}`);
    }

    this.index += match[0].length;
    return Number(match[0]);
  }

  parseIdentifier() {
    const match = this.text.slice(this.index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (!match) {
      throw new Error(`Invalid Lua identifier near index ${this.index}`);
    }

    this.index += match[0].length;
    return match[0];
  }

  parseValue() {
    this.skipWhitespace();
    const ch = this.peek();

    if (ch === "{") {
      return this.parseTable();
    }
    if (ch === '"' || ch === "'") {
      return this.parseString();
    }
    if (/[\d-]/.test(ch)) {
      return this.parseNumber();
    }
    if (/[A-Za-z_]/.test(ch)) {
      const identifier = this.parseIdentifier();
      if (identifier === "true") return true;
      if (identifier === "false") return false;
      if (identifier === "nil") return null;
      return identifier;
    }

    throw new Error(`Unexpected Lua token "${ch}" near index ${this.index}`);
  }

  parseKey() {
    this.skipWhitespace();
    if (this.peek() === "[") {
      this.index += 1;
      const key = this.parseValue();
      this.skipWhitespace();
      if (this.peek() !== "]") {
        throw new Error(`Expected ] near index ${this.index}`);
      }
      this.index += 1;
      return key;
    }

    return this.parseIdentifier();
  }

  parseTable() {
    if (this.peek() !== "{") {
      throw new Error(`Expected { near index ${this.index}`);
    }

    this.index += 1;
    const arrayValues = [];
    const objectValues = {};
    let hasArrayEntries = false;
    let hasObjectEntries = false;

    while (!this.atEnd()) {
      this.skipWhitespace();

      if (this.peek() === "}") {
        this.index += 1;
        if (hasObjectEntries && !hasArrayEntries) {
          return objectValues;
        }
        if (!hasObjectEntries) {
          return arrayValues;
        }
        return { ...objectValues, _values: arrayValues };
      }

      let parsedKeyedEntry = false;
      if (this.peek() === "[" || /[A-Za-z_]/.test(this.peek())) {
        const checkpoint = this.index;
        try {
          const key = this.parseKey();
          this.skipWhitespace();
          if (this.peek() === "=") {
            this.index += 1;
            objectValues[String(key)] = this.parseValue();
            hasObjectEntries = true;
            parsedKeyedEntry = true;
          } else {
            this.index = checkpoint;
          }
        } catch {
          this.index = checkpoint;
        }
      }

      if (!parsedKeyedEntry) {
        arrayValues.push(this.parseValue());
        hasArrayEntries = true;
      }

      this.skipWhitespace();
      if (this.peek() === "," || this.peek() === ";") {
        this.index += 1;
      }
    }

    throw new Error("Unterminated Lua table");
  }
}

function parseItemDataModule(wikitext) {
  const datasets = {};
  const pattern = /itemData\.([A-Za-z0-9_]+)\["((?:[^"\\]|\\.)+)"\]\s*=\s*\{/g;

  for (let match = pattern.exec(wikitext); match; match = pattern.exec(wikitext)) {
    const datasetName = match[1];
    const itemName = normalizeWhitespace(match[2].replace(/\\"/g, '"'));
    const parser = new LuaParser(wikitext, match.index + match[0].length - 1);
    const value = parser.parseValue();

    datasets[datasetName] ||= {};
    datasets[datasetName][itemName] = value;

    pattern.lastIndex = parser.index;
  }

  return datasets;
}

function importMedicalItems(data, addItem, fandomTitleSet) {
  for (const [name, raw] of Object.entries(data)) {
    addItem({
      slug: slugify(name),
      name,
      category: "medical",
      subcategory: normalizeToken(raw.category) || "medical",
      inventory_category: "consumable",
      item_type: normalizeWhitespace(raw.category),
      description: normalizeWhitespace(raw.description),
      weight: normalizeNumber(raw.weight),
      stack_size: normalizeInteger(raw.stack_size),
      craftable: parseYesNo(raw.craftable),
      health: normalizeNumber(raw.health),
      thirst: normalizeNumber(raw.thirst),
      location: normalizeWhitespace(raw.location),
      rarity: normalizeRarity(raw.rarity),
      trade_value_trader: normalizeNumber(raw.trade_value?.from_trader),
      trade_value_player: normalizeNumber(raw.trade_value?.from_player),
      default_value: pickValue(raw.trade_value?.from_player, raw.trade_value?.from_trader),
      packaging: parseYesNo(raw.packaging),
      packaging_items: normalizeListString(raw.packaging_items),
      packaging_amount: normalizeInteger(raw.packaging_amount),
      image: normalizeWhitespace(raw.image),
      source_scope: "fandom",
      source_dataset: "MedicalSuppliesData",
      source_urls: buildItemSourceUrls(name, {
        fandomModule: true,
        fandomTitleSet,
      }),
      attributes: compactObject({
        source_category: normalizeWhitespace(raw.category),
        raw_stack_size: raw.stack_size,
      }),
    });
  }
}

function importFoodAndDrinkItems(data, addItem, fandomTitleSet) {
  for (const [name, raw] of Object.entries(data)) {
    addItem({
      slug: slugify(name),
      name,
      category: "consumable",
      subcategory: normalizeToken(raw.category) || "food",
      inventory_category: "consumable",
      item_type: normalizeWhitespace(raw.item_type),
      description: normalizeWhitespace(raw.description),
      weight: normalizeNumber(raw.weight),
      stack_size: normalizeInteger(raw.stack_size),
      craftable: parseYesNo(raw.craftable),
      hunger: normalizeNumber(raw.hunger),
      thirst: normalizeNumber(raw.thirst),
      stamina: normalizeNumber(raw.stamina),
      can_decay: parseYesNo(raw.can_decay),
      decay_rate: normalizeToken(raw.decay_rate),
      location: normalizeWhitespace(raw.location),
      rarity: normalizeRarity(raw.rarity),
      trade_value_trader: normalizeNumber(raw.trade_value?.from_trader),
      trade_value_player: normalizeNumber(raw.trade_value?.from_player),
      default_value: pickValue(raw.trade_value?.from_player, raw.trade_value?.from_trader),
      item_return_on_consume: normalizeListString(raw.item_return_on_consume),
      packaging_items: normalizeListString(raw.packaging_items),
      image: normalizeWhitespace(raw.image),
      source_scope: "fandom",
      source_dataset: "FoodDrinkData",
      source_urls: buildItemSourceUrls(name, {
        fandomModule: true,
        fandomTitleSet,
      }),
      attributes: compactObject({
        raw_category: normalizeWhitespace(raw.category),
        bin_compostable: parseYesNo(raw.bin_compostable),
        decay_on_open: parseYesNo(raw.decay_on_open),
      }),
    });
  }
}

function importBackpackItems(data, addItem, fandomTitleSet) {
  for (const [name, raw] of Object.entries(data)) {
    addItem({
      slug: slugify(name),
      name,
      category: "backpack",
      subcategory: "backpack",
      inventory_category: "armor",
      description: normalizeWhitespace(raw.description),
      weight: normalizeNumber(raw.weight),
      storage_slots: normalizeInteger(raw.capacity),
      craftable: parseYesNo(raw.craftable),
      location: normalizeWhitespace(raw.location),
      rarity: normalizeRarity(raw.rarity),
      image: normalizeWhitespace(raw.image),
      source_scope: "fandom",
      source_dataset: "BackpackData",
      source_urls: buildItemSourceUrls(name, {
        fandomModule: true,
        fandomTitleSet,
      }),
      attributes: compactObject({
        capacity: normalizeInteger(raw.capacity),
      }),
    });
  }
}

function importClothingItems(data, addItem, fandomTitleSet) {
  for (const [name, raw] of Object.entries(data)) {
    addItem({
      slug: slugify(name),
      name,
      category: "clothing",
      subcategory: normalizeToken(raw.category) || normalizeToken(raw.clothing_slot) || "clothing",
      inventory_category: "armor",
      item_type: normalizeWhitespace(raw.item_type),
      description: normalizeWhitespace(raw.description),
      weight: normalizeNumber(raw.weight),
      fit_in_pocket: parseYesNo(raw.fit_in_pocket),
      armor_protection: normalizeToken(raw.armor_protection),
      insulation: normalizeToken(raw.insulation),
      repairable_with: normalizeListString(raw.repairable_with),
      clothing_slot: normalizeToken(raw.clothing_slot),
      location: normalizeWhitespace(raw.location),
      rarity: normalizeRarity(raw.rarity),
      trade_value_trader: normalizeNumber(raw.trade_value?.from_trader),
      trade_value_player: normalizeNumber(raw.trade_value?.from_player),
      default_value: pickValue(raw.trade_value?.from_player, raw.trade_value?.from_trader),
      image: normalizeWhitespace(raw.image),
      source_scope: "fandom",
      source_dataset: "ClothingData",
      source_urls: buildItemSourceUrls(name, {
        fandomModule: true,
        fandomTitleSet,
      }),
      attributes: compactObject({
        craftable_to_rag: parseYesNo(raw.craftable_to_rag),
      }),
    });
  }
}

function importTemporaryImages(data, addItem, fandomTitleSet) {
  for (const [name, raw] of Object.entries(data)) {
    addItem({
      slug: slugify(name),
      name,
      category: inferCategoryFromName(name),
      subcategory: inferSubcategoryFromName(name),
      inventory_category: inferInventoryCategory(inferCategoryFromName(name)),
      image: normalizeWhitespace(raw.image),
      source_scope: "fandom",
      source_dataset: "TemporaryData",
      source_urls: buildItemSourceUrls(name, {
        fandomModule: true,
        fandomTitleSet,
      }),
    });
  }
}

function importGearPage(wikitext, addItem, wikiTitleSet) {
  const sections = splitSections(wikitext);

  for (const section of sections) {
    const tables = extractTables(section.content);
    for (const table of tables) {
      const parsedTable = parseWikiTable(table);
      if (parsedTable.rows.length === 0) {
        continue;
      }

      for (const row of parsedTable.rows) {
        const name = cleanWikiMarkup(findColumn(row, parsedTable.headers, "name"));
        if (!name) {
          continue;
        }

        const category = inferCategoryFromGearSection(section.heading);
        addItem({
          slug: slugify(name),
          name,
          category,
          subcategory: normalizeToken(section.heading) || inferSubcategoryFromName(name),
          inventory_category: inferInventoryCategory(category),
          description: cleanWikiMarkup(findColumn(row, parsedTable.headers, "description")) || undefined,
          ammo_type: cleanWikiMarkup(findColumn(row, parsedTable.headers, "ammo")) || undefined,
          weight: normalizeNumber(findColumn(row, parsedTable.headers, "weight")),
          image: extractWikiFileName(findColumn(row, parsedTable.headers, "image")) || undefined,
          source_scope: "wiki_gg",
          source_dataset: "Gear",
          source_urls: buildItemSourceUrls(name, {
            wikiGear: true,
            wikiTitleSet,
          }),
        });
      }
    }
  }
}

function importAmmunitionPage(wikitext, addItem, wikiTitleSet) {
  for (const table of extractTables(wikitext)) {
    const parsedTable = parseWikiTable(table);
    const firstHeader = normalizeToken(parsedTable.headers[1] || parsedTable.headers[0] || "");
    if (firstHeader !== "name") {
      continue;
    }

    for (const row of parsedTable.rows) {
      const name = cleanWikiMarkup(findColumn(row, parsedTable.headers, "name"));
      if (!name) {
        continue;
      }

      addItem({
        slug: slugify(name),
        name,
        category: "ammo",
        subcategory: "ammo",
        inventory_category: "ammo",
        description: cleanWikiMarkup(findColumn(row, parsedTable.headers, "description")) || undefined,
        weight: normalizeNumber(findColumn(row, parsedTable.headers, "weight")),
        source_scope: "wiki_gg",
        source_dataset: "Ammunition",
        source_urls: buildItemSourceUrls(name, {
          wikiAmmo: true,
          wikiTitleSet,
        }),
      });
    }
  }
}

function importAmmoDetailPages(pageMap, addItem, wikiTitleSet) {
  for (const [title, wikitext] of pageMap.entries()) {
    const infobox = parseInfobox(wikitext, "InfoboxAmmo");
    const tables = extractTables(wikitext).map(parseWikiTable);
    const compatibleTable = tables.find((table) =>
      table.headers.some((header) => normalizeToken(header) === "ammo"),
    );

    const compatibleItems = (compatibleTable?.rows || [])
      .map((row) => cleanWikiMarkup(findColumn(row, compatibleTable.headers, "name")))
      .filter(Boolean);

    const displayName = normalizeWhitespace(infobox.NameText || title);
    addItem({
      slug: slugify(displayName),
      name: displayName,
      category: "ammo",
      subcategory: "ammo",
      inventory_category: "ammo",
      stack_size: normalizeInteger(infobox.StackSize),
      weight: normalizeNumber(infobox.Weight),
      craftable: parseYesNo(infobox.Craftable),
      crafting_time_seconds: normalizeDurationSeconds(infobox.CraftTime),
      compatible_items: compatibleItems,
      source_scope: "wiki_gg",
      source_dataset: `AmmoDetail:${title}`,
      source_urls: buildItemSourceUrls(displayName, {
        wikiAmmoDetail: title,
        wikiTitleSet,
      }),
    });
  }
}

function importResourcesPage(wikitext, addItem, wikiTitleSet) {
  for (const resource of RESOURCE_HINTS) {
    addItem({
      slug: slugify(resource.name),
      name: resource.name,
      category: "resource",
      subcategory: resource.subcategory,
      inventory_category: "material",
      description: resource.description,
      source_scope: "wiki_gg",
      source_dataset: "Resources",
      source_urls: buildItemSourceUrls(resource.name, {
        wikiResources: true,
        wikiTitleSet,
      }),
    });
  }

  const tables = extractTables(wikitext).map(parseWikiTable);
  for (const table of tables) {
    if (!table.headers.some((header) => normalizeToken(header) === "name")) {
      continue;
    }

    for (const row of table.rows) {
      const name = cleanWikiMarkup(findColumn(row, table.headers, "name"));
      if (!name) {
        continue;
      }

      addItem({
        slug: slugify(name),
        name,
        category: "resource",
        subcategory: "ore",
        inventory_category: "material",
        source_scope: "wiki_gg",
        source_dataset: "Resources",
        source_urls: buildItemSourceUrls(name, {
          wikiResources: true,
          wikiTitleSet,
        }),
      });
    }
  }
}

function importBuildPage(wikitext, addItem, wikiTitleSet) {
  const description = cleanWikiMarkup(wikitext).replace(/^stub\s*/i, "").trim();
  if (!description) {
    return;
  }

  addItem({
    slug: "building",
    name: "Building",
    category: "building",
    subcategory: "structure",
    inventory_category: "misc",
    description,
    craftable: true,
    source_scope: "wiki_gg",
    source_dataset: "Build",
    source_urls: buildItemSourceUrls("Building", {
      wikiBuild: true,
      wikiTitleSet,
    }),
  });
}

function importStoragesPage(wikitext, addItem, wikiTitleSet) {
  const normalizedText = wikitext.replace(/\r/g, "");
  const pattern = /([A-Za-z0-9' -]+?)\s*\(build\s*:\s*([^)]+)\)\.\s*([0-9x ]+)\s*storage space(?:\s*\((\d+)\s*total\))?/gi;

  for (const match of normalizedText.matchAll(pattern)) {
    const name = normalizeWhitespace(match[1]);
    const rawMaterials = normalizeWhitespace(match[2]);
    const rawStorage = normalizeWhitespace(match[3]);
    const rawTotal = normalizeWhitespace(match[4]);
    if (!name) {
      continue;
    }

    const storageSlots = normalizeInteger(rawTotal || rawStorage.match(/\d+/)?.[0]);

    addItem({
      slug: slugify(name),
      name,
      category: "storage",
      subcategory: "container",
      inventory_category: "misc",
      description: `${name} buildable storage container.`,
      craftable: true,
      storage_slots: storageSlots,
      build_materials: parseBuildMaterials(rawMaterials),
      source_scope: "wiki_gg",
      source_dataset: "Storages",
      source_urls: buildItemSourceUrls(name, {
        wikiStorages: true,
        wikiTitleSet,
      }),
      attributes: compactObject({
        storage_layout: rawStorage,
      }),
    });
  }
}

function importVehiclesPage(wikitext, addItem, wikiTitleSet) {
  const sections = splitSections(wikitext);

  for (const section of sections) {
    const category = normalizeToken(section.heading);
    if (!category || category === "vehicles") {
      continue;
    }

    for (const table of extractTables(section.content)) {
      const parsedTable = parseWikiTable(table);
      if (!parsedTable.headers.some((header) => normalizeToken(header) === "display_name")) {
        continue;
      }

      for (const row of parsedTable.rows) {
        const name = cleanWikiMarkup(findColumn(row, parsedTable.headers, "display name") || findColumn(row, parsedTable.headers, "name"));
        const vehicleId = cleanWikiMarkup(findColumn(row, parsedTable.headers, "vehicle id"));
        if (!name || name === "<name>" || vehicleId === "<car_id>") {
          continue;
        }

        const rawStorage = cleanWikiMarkup(findColumn(row, parsedTable.headers, "storage slots"));
        const storageSlots = normalizeInteger(rawStorage.match(/\((\d+)\)/)?.[1] || rawStorage);
        const rawModdable = cleanWikiMarkup(findColumn(row, parsedTable.headers, "moddable"));
        const modSlots = normalizeInteger(rawModdable.match(/x(\d+)/i)?.[1]);

        addItem({
          slug: slugify(name),
          name,
          category: "vehicle",
          subcategory: singularizeCategory(category),
          inventory_category: "misc",
          description: `${name} vehicle.`,
          storage_slots: storageSlots,
          vehicle_id: normalizeWhitespace(vehicleId),
          moddable: /yes/i.test(rawModdable),
          source_scope: "wiki_gg",
          source_dataset: "Vehicles",
          source_urls: buildItemSourceUrls(name, {
            wikiVehicles: true,
            wikiTitleSet,
          }),
          attributes: compactObject({
            moddable_label: rawModdable,
            mod_slots: modSlots,
          }),
        });
      }
    }
  }
}

function importCraftingData(data, addItem, addRecipe, fandomTitleSet, wikiTitleSet) {
  for (const [outputName, stationMap] of Object.entries(data)) {
    const stationEntries = Object.entries(stationMap || {});
    for (const [stationKey, recipeValue] of stationEntries) {
      const variants = Array.isArray(recipeValue) ? recipeValue : [recipeValue];
      variants.forEach((variant, index) => {
        const category = inferCraftedCategory(outputName, stationKey);
        addItem({
          slug: slugify(outputName),
          name: normalizeWhitespace(outputName),
          category,
          subcategory: normalizeToken(stationKey) || inferSubcategoryFromName(outputName),
          inventory_category: inferInventoryCategory(category),
          craftable: true,
          crafting_station: normalizeStationName(stationKey),
          crafting_time_seconds: normalizeNumber(variant.crafting_time),
          crafted_amount: normalizeInteger(variant.crafted_amount),
          requires_recipe: parseYesNo(variant.requires_recipe),
          return_item: normalizeListString(variant.return_item),
          return_amount: normalizeInteger(variant.return_amount),
          source_scope: "fandom",
          source_dataset: "CraftingData",
          source_urls: buildItemSourceUrls(outputName, {
            fandomCrafting: true,
            fandomTitleSet,
            wikiTitleSet,
          }),
        });

        for (const ingredient of variant.required_items || []) {
          const ingredientName = normalizeWhitespace(ingredient.item);
          const ingredientCategory = inferCategoryFromName(ingredientName);
          addItem({
            slug: slugify(ingredientName),
            name: ingredientName,
            category: ingredientCategory,
            subcategory: inferSubcategoryFromName(ingredientName),
            inventory_category: inferInventoryCategory(ingredientCategory),
            source_scope: "derived",
            source_dataset: "CraftingIngredient",
            source_urls: [FANDOM_PAGE_URL, CRAFTING_PAGE_URL],
          });
        }

        const returnedItem = normalizeListString(variant.return_item);
        if (returnedItem) {
          const returnCategory = inferCategoryFromName(returnedItem);
          addItem({
            slug: slugify(returnedItem),
            name: returnedItem,
            category: returnCategory,
            subcategory: inferSubcategoryFromName(returnedItem),
            inventory_category: inferInventoryCategory(returnCategory),
            source_scope: "derived",
            source_dataset: "CraftingReturn",
            source_urls: [FANDOM_PAGE_URL, CRAFTING_PAGE_URL],
          });
        }

        addRecipe({
          slug: buildRecipeSlug(outputName, stationKey, variants.length > 1 ? index + 1 : 0),
          name: normalizeWhitespace(outputName),
          item_slug: slugify(outputName),
          category,
          description: `Craft ${normalizeWhitespace(outputName)} at ${normalizeStationName(stationKey)}.`,
          ingredients: (variant.required_items || []).map((ingredient) => ({
            resource: normalizeWhitespace(ingredient.item),
            amount: normalizeInteger(ingredient.quantity) || 1,
          })),
          difficulty: inferRecipeDifficulty({
            ingredientCount: (variant.required_items || []).length,
            craftingTimeSeconds: normalizeNumber(variant.crafting_time),
            requiresRecipe: parseYesNo(variant.requires_recipe),
            category,
          }),
          output_quantity: normalizeInteger(variant.crafted_amount) || 1,
          output_value: null,
          crafting_station: normalizeStationName(stationKey),
          crafting_time_seconds: normalizeNumber(variant.crafting_time),
          crafted_durability: normalizeInteger(variant.crafted_durability),
          requires_recipe: parseYesNo(variant.requires_recipe),
          return_item: returnedItem,
          return_amount: normalizeInteger(variant.return_amount),
          return_durability: normalizeInteger(variant.return_durability),
          is_available: true,
          source_scope: "fandom",
          source_dataset: "CraftingData",
          source_url: CRAFTING_PAGE_URL,
          source_urls: [FANDOM_PAGE_URL, CRAFTING_PAGE_URL],
        });
      });
    }
  }
}

function finalizeItems(items, catalogVersion) {
  return items
    .map((item) => {
      const normalized = compactObject({
        ...item,
        slug: slugify(item.slug || item.name),
        name: normalizeWhitespace(item.name),
        category: normalizeToken(item.category) || "misc",
        subcategory: normalizeToken(item.subcategory),
        inventory_category: normalizeToken(item.inventory_category) || "misc",
        item_type: normalizeWhitespace(item.item_type),
        description: normalizeWhitespace(item.description),
        weight: normalizeNumber(item.weight),
        stack_size: normalizeInteger(item.stack_size),
        storage_slots: normalizeInteger(item.storage_slots),
        build_materials: (item.build_materials || [])
          .map((material) => compactObject({
            resource: normalizeWhitespace(material.resource),
            item_slug: slugify(material.item_slug || material.resource),
            amount: normalizeInteger(material.amount) || 1,
          }))
          .filter((material) => material.resource),
        fit_in_pocket: normalizeBoolean(item.fit_in_pocket),
        craftable: normalizeBoolean(item.craftable),
        crafting_station: normalizeWhitespace(item.crafting_station),
        crafting_time_seconds: normalizeNumber(item.crafting_time_seconds),
        crafted_amount: normalizeInteger(item.crafted_amount),
        crafted_durability: normalizeInteger(item.crafted_durability),
        requires_recipe: normalizeBoolean(item.requires_recipe),
        return_item: normalizeListString(item.return_item),
        return_amount: normalizeInteger(item.return_amount),
        health: normalizeNumber(item.health),
        hunger: normalizeNumber(item.hunger),
        thirst: normalizeNumber(item.thirst),
        stamina: normalizeNumber(item.stamina),
        armor_protection: normalizeToken(item.armor_protection),
        insulation: normalizeToken(item.insulation),
        ammo_type: normalizeWhitespace(item.ammo_type),
        vehicle_id: normalizeWhitespace(item.vehicle_id),
        moddable: normalizeBoolean(item.moddable),
        compatible_items: uniqueStrings(item.compatible_items),
        location: normalizeWhitespace(item.location),
        rarity: normalizeToken(item.rarity),
        trade_value_player: normalizeNumber(item.trade_value_player),
        trade_value_trader: normalizeNumber(item.trade_value_trader),
        default_value: normalizeNumber(item.default_value),
        packaging: normalizeBoolean(item.packaging),
        packaging_items: normalizeListString(item.packaging_items),
        packaging_amount: normalizeInteger(item.packaging_amount),
        repairable_with: normalizeListString(item.repairable_with),
        clothing_slot: normalizeToken(item.clothing_slot),
        item_return_on_consume: normalizeListString(item.item_return_on_consume),
        can_decay: normalizeBoolean(item.can_decay),
        decay_rate: normalizeToken(item.decay_rate),
        image: normalizeWhitespace(item.image),
        source_scope: normalizeSourceScope(item.source_scope),
        source_dataset: normalizeWhitespace(item.source_dataset),
        source_urls: uniqueStrings(item.source_urls),
        aliases: uniqueStrings([...(item.aliases || []), item.name]),
        attributes: compactObject(item.attributes || {}),
        catalog_version: catalogVersion,
      });

      normalized.default_value ||= pickValue(
        normalized.trade_value_player,
        normalized.trade_value_trader,
      );

      normalized.subcategory ||= inferSubcategoryFromName(normalized.name);
      normalized.inventory_category ||= inferInventoryCategory(normalized.category);
      normalized.aliases = normalized.aliases.filter((entry) => entry && entry !== normalized.name);

      return normalized;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function finalizeRecipes(recipes, items, catalogVersion) {
  const itemBySlug = new Map(items.map((item) => [item.slug, item]));
  const itemByNormalizedName = new Map(items.map((item) => [normalizeGameName(item.name), item]));

  return recipes
    .map((recipe) => {
      const item = itemBySlug.get(recipe.item_slug || "");
      const normalized = compactObject({
        ...recipe,
        slug: slugify(recipe.slug || recipe.name),
        name: normalizeWhitespace(recipe.name),
        item_slug: slugify(recipe.item_slug || recipe.name),
        category: normalizeToken(recipe.category) || normalizeToken(item?.category) || "misc",
        description: normalizeWhitespace(recipe.description) || item?.description,
        difficulty: normalizeToken(recipe.difficulty) || "basic",
        ingredients: (recipe.ingredients || [])
          .map((ingredient) => compactObject({
            resource: normalizeWhitespace(ingredient.resource),
            item_slug: slugify(
              ingredient.item_slug
              || itemByNormalizedName.get(normalizeGameName(ingredient.resource))?.slug
              || ingredient.resource,
            ),
            amount: normalizeInteger(ingredient.amount) || 1,
          }))
          .filter((ingredient) => ingredient.resource),
        output_value: normalizeNumber(recipe.output_value ?? item?.default_value),
        output_quantity: normalizeInteger(recipe.output_quantity) || 1,
        crafting_station: normalizeWhitespace(recipe.crafting_station),
        crafting_time_seconds: normalizeNumber(recipe.crafting_time_seconds),
        crafted_durability: normalizeInteger(recipe.crafted_durability),
        requires_recipe: normalizeBoolean(recipe.requires_recipe),
        return_item: normalizeListString(recipe.return_item),
        return_amount: normalizeInteger(recipe.return_amount),
        return_durability: normalizeInteger(recipe.return_durability),
        is_available: recipe.is_available !== false,
        source_scope: normalizeSourceScope(recipe.source_scope),
        source_dataset: normalizeWhitespace(recipe.source_dataset),
        source_url: normalizeWhitespace(recipe.source_url),
        source_urls: uniqueStrings(recipe.source_urls),
        catalog_version: catalogVersion,
      });

      if (normalized.ingredients.length === 0) {
        return null;
      }

      return normalized;
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.name === right.name) {
        return left.slug.localeCompare(right.slug);
      }
      return left.name.localeCompare(right.name);
    });
}

function applyItemOverrides(items) {
  const overrideEntries = HUMANITZ_ITEM_OVERRIDES || {};
  const aliasEntries = HUMANITZ_ITEM_ALIAS_OVERRIDES || {};

  return items
    .map((item) => {
      const override = overrideEntries[item.slug] || {};
      const aliases = uniqueStrings([
        ...(item.aliases || []),
        ...(aliasEntries[item.slug] || []),
        ...(override.aliases || []),
      ]);

      return compactObject({
        ...item,
        ...override,
        aliases,
        source_urls: uniqueStrings([
          ...(item.source_urls || []),
          ...(override.source_urls || []),
        ]),
        attributes: compactObject({
          ...(item.attributes || {}),
          ...(override.attributes || {}),
        }),
      });
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function applyRecipeOverrides(recipes) {
  const overrideEntries = HUMANITZ_RECIPE_OVERRIDES || {};

  return recipes
    .map((recipe) => compactObject({
      ...recipe,
      ...(overrideEntries[recipe.slug] || {}),
      source_urls: uniqueStrings([
        ...(recipe.source_urls || []),
        ...((overrideEntries[recipe.slug] || {}).source_urls || []),
      ]),
    }))
    .sort((left, right) => {
      if (left.name === right.name) {
        return left.slug.localeCompare(right.slug);
      }
      return left.name.localeCompare(right.name);
    });
}

function upsertItem(map, item, { fandomTitleSet, wikiTitleSet } = {}) {
  const slug = slugify(item.slug || item.name);
  if (!slug) {
    return;
  }

  const existing = map.get(slug);
  const incoming = compactObject({
    ...item,
    slug,
    name: normalizeWhitespace(item.name) || existing?.name,
    source_urls: uniqueStrings(item.source_urls),
    aliases: uniqueStrings(item.aliases),
    attributes: compactObject(item.attributes || {}),
  });

  if (!existing) {
    map.set(slug, incoming);
    return;
  }

  const merged = compactObject({ ...existing });
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
      continue;
    }

    if (key === "source_urls" || key === "aliases" || key === "compatible_items") {
      merged[key] = uniqueStrings([...(merged[key] || []), ...value]);
      continue;
    }

    if (key === "attributes") {
      merged.attributes = compactObject({ ...(merged.attributes || {}), ...value });
      continue;
    }

    if (key === "source_scope") {
      merged.source_scope = mergeSourceScopes(merged.source_scope, value);
      continue;
    }

    if (shouldReplaceExistingValue(merged[key], value, key)) {
      merged[key] = value;
    }
  }

  if (fandomTitleSet || wikiTitleSet) {
    merged.source_urls = uniqueStrings(
      buildItemSourceUrls(merged.name, {
        fandomModule: merged.source_urls?.includes(FANDOM_PAGE_URL),
        fandomCrafting: merged.source_urls?.includes(CRAFTING_PAGE_URL),
        wikiGear: merged.source_urls?.some((url) => url?.includes("/Gear")) || false,
        wikiAmmo: merged.source_urls?.some((url) => url?.includes("/Ammunition")) || false,
        wikiResources: merged.source_urls?.some((url) => url?.includes("/Resources")) || false,
        fandomTitleSet,
        wikiTitleSet,
      }).concat(merged.source_urls || []),
    );
  }

  map.set(slug, merged);
}

function upsertRecipe(map, recipe) {
  const slug = slugify(recipe.slug || recipe.name);
  if (!slug) {
    return;
  }

  if (!map.has(slug)) {
    map.set(slug, compactObject({ ...recipe, slug }));
    return;
  }

  const existing = map.get(slug);
  const merged = compactObject({ ...existing });
  for (const [key, value] of Object.entries(recipe)) {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
      continue;
    }

    if (key === "source_urls") {
      merged.source_urls = uniqueStrings([...(merged.source_urls || []), ...value]);
      continue;
    }

    if (key === "ingredients") {
      merged.ingredients ||= value;
      continue;
    }

    if (key === "source_scope") {
      merged.source_scope = mergeSourceScopes(merged.source_scope, value);
      continue;
    }

    if (shouldReplaceExistingValue(merged[key], value, key)) {
      merged[key] = value;
    }
  }

  map.set(slug, merged);
}

function buildItemSourceUrls(name, {
  fandomModule = false,
  fandomCrafting = false,
  fandomTitleSet,
  wikiGear = false,
  wikiAmmo = false,
  wikiAmmoDetail,
  wikiResources = false,
  wikiBuild = false,
  wikiStorages = false,
  wikiVehicles = false,
  wikiTitleSet,
} = {}) {
  const urls = [];
  if (fandomModule) {
    urls.push(FANDOM_PAGE_URL);
  }
  if (fandomCrafting) {
    urls.push(CRAFTING_PAGE_URL);
  }
  if (wikiGear) {
    urls.push(`${WIKI_GG_BASE}${encodeTitle("Gear")}`);
  }
  if (wikiAmmo) {
    urls.push(`${WIKI_GG_BASE}${encodeTitle("Ammunition")}`);
  }
  if (wikiAmmoDetail) {
    urls.push(`${WIKI_GG_BASE}${encodeTitle(wikiAmmoDetail)}`);
  }
  if (wikiResources) {
    urls.push(`${WIKI_GG_BASE}${encodeTitle("Resources")}`);
  }
  if (wikiBuild) {
    urls.push(`${WIKI_GG_BASE}${encodeTitle("Build")}`);
  }
  if (wikiStorages) {
    urls.push(`${WIKI_GG_BASE}${encodeTitle("Storages")}`);
  }
  if (wikiVehicles) {
    urls.push(`${WIKI_GG_BASE}${encodeTitle("Vehicles")}`);
  }
  if (fandomTitleSet?.has(name)) {
    urls.push(`https://humanitz.fandom.com/wiki/${encodeTitle(name)}`);
  }
  if (wikiTitleSet?.has(name)) {
    urls.push(`${WIKI_GG_BASE}${encodeTitle(name)}`);
  }
  return uniqueStrings(urls);
}

export function parseWikiTable(tableWikitext) {
  const body = tableWikitext
    .replace(/^\{\|[^\n]*\n?/m, "")
    .replace(/\n?\|\}$/m, "")
    .replace(/^\|-\s*\n/, "");
  const rowChunks = body
    .split(/\n\|-\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  let headers = [];
  const rows = [];

  for (const chunk of rowChunks) {
    if (chunk.startsWith("|+")) {
      continue;
    }

    if (chunk.startsWith("!")) {
      headers = normalizeHeaderCells(chunk);
      continue;
    }

    rows.push(normalizeRowCells(chunk));
  }

  return { headers, rows };
}

function splitSections(wikitext) {
  const sections = [];
  const pattern = /^==+\s*(.*?)\s*==+\s*$/gm;
  let lastIndex = 0;
  let currentHeading = "root";
  let match;

  while ((match = pattern.exec(wikitext))) {
    sections.push({
      heading: currentHeading,
      content: wikitext.slice(lastIndex, match.index),
    });
    currentHeading = normalizeWhitespace(match[1]);
    lastIndex = pattern.lastIndex;
  }

  sections.push({
    heading: currentHeading,
    content: wikitext.slice(lastIndex),
  });

  return sections.filter((section) => section.content.trim());
}

function extractTables(wikitext) {
  return wikitext.match(/\{\|[\s\S]*?\|\}/g) || [];
}

function normalizeHeaderCells(chunk) {
  const lines = chunk
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("!"));

  const cells = [];
  for (const line of lines) {
    const body = line.replace(/^!/, "").trim();
    const parts = body.includes("!!")
      ? body.split(/!!/)
      : [body];

    for (const part of parts) {
      const cell = cleanWikiMarkup(part.includes("|") ? part.slice(part.lastIndexOf("|") + 1) : part);
      if (cell) {
        cells.push(cell);
      }
    }
  }

  return cells;
}

function normalizeRowCells(chunk) {
  const lines = chunk
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  const cells = [];
  for (const line of lines) {
    const body = line.replace(/^\|/, "").trim();
    const parts = body.includes("||")
      ? body.split(/\|\|/)
      : [body];

    for (const part of parts) {
      const cell = normalizeWhitespace(part.includes("|") ? part.slice(part.lastIndexOf("|") + 1) : part);
      if (cell) {
        cells.push(cell);
      }
    }
  }

  return cells;
}

function findColumn(row, headers, target) {
  const targetToken = normalizeToken(target);
  const headerIndex = headers.findIndex((header) => {
    const normalized = normalizeToken(header);
    return normalized === targetToken
      || normalized.startsWith(targetToken)
      || normalized.includes(targetToken);
  });

  if (headerIndex < 0) {
    return "";
  }

  return row[headerIndex] || "";
}

function parseInfobox(wikitext, templateName) {
  const match = wikitext.match(new RegExp(`\\{\\{${templateName}([\\s\\S]*?)\\n\\}\\}`));
  if (!match) {
    return {};
  }

  const lines = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  const result = {};
  for (const line of lines) {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = normalizeWhitespace(line.slice(1, separatorIndex));
    const value = normalizeWhitespace(line.slice(separatorIndex + 1));
    if (!key) {
      continue;
    }
    result[key] = value;
  }

  return result;
}

function buildRecipeSlug(name, stationKey, variantIndex = 0) {
  const base = `${slugify(name)}-${slugify(stationKey)}`;
  return variantIndex > 0 ? `${base}-${variantIndex}` : base;
}

function inferCraftedCategory(name, stationKey) {
  const fromName = inferCategoryFromName(name);
  if (fromName !== "material") {
    return fromName;
  }

  const station = normalizeToken(stationKey);
  if (station.includes("gun")) {
    return isAmmoName(name) ? "ammo" : "weapon";
  }
  if (station.includes("melee")) {
    return "weapon";
  }
  if (station.includes("campfire") || station.includes("cooking") || station.includes("distiller")) {
    return "consumable";
  }
  if (station.includes("furnace") || station.includes("workbench")) {
    return "material";
  }

  return fromName;
}

function inferRecipeDifficulty({ ingredientCount, craftingTimeSeconds, requiresRecipe, category }) {
  const time = normalizeNumber(craftingTimeSeconds) || 0;
  if (requiresRecipe || time >= 180 || ingredientCount >= 4) {
    return category === "weapon" && time >= 180 ? "masterwork" : "advanced";
  }
  if (time >= 45 || ingredientCount >= 3) {
    return "intermediate";
  }
  return "basic";
}

function normalizeStationName(value) {
  const token = normalizeToken(value);
  if (!token) {
    return "";
  }

  return token
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeDurationSeconds(value) {
  if (value == null) {
    return null;
  }

  const match = String(value).match(/(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  return Math.round(Number(match[1]));
}

function parseBuildMaterials(value) {
  const source = normalizeWhitespace(value);
  if (!source) {
    return [];
  }

  return source
    .split(/\s*,\s*/)
    .map((entry) => {
      const match = entry.match(/^(\d+)\s+(.+)$/);
      if (!match) {
        return null;
      }

      const resource = normalizeWhitespace(match[2]);
      if (!resource) {
        return null;
      }

      return compactObject({
        resource,
        item_slug: slugify(resource),
        amount: normalizeInteger(match[1]) || 1,
      });
    })
    .filter(Boolean);
}

function singularizeCategory(value) {
  const normalized = normalizeToken(value);
  if (normalized.endsWith("s")) {
    return normalized.slice(0, -1);
  }
  return normalized || "vehicle";
}

function inferCategoryFromGearSection(sectionHeading) {
  const token = normalizeToken(sectionHeading);
  if (["tools"].includes(token)) {
    return "tool";
  }
  if (["bows", "pistols", "smgs", "assault_rifles", "shotguns", "sniper_rifles", "rifles", "explosives", "melee_weapons"].includes(token)) {
    return "weapon";
  }
  return inferCategoryFromName(sectionHeading);
}

function inferCategoryFromName(name) {
  const token = normalizeToken(name);

  if (isAmmoName(name)) {
    return "ammo";
  }
  if (/(van|truck|sedan|hatchback|car|vehicle|bus|tractor|bike)\b/.test(token)) {
    return "vehicle";
  }
  if (/(storage|locker|cabinet|crate|container|cupboard)\b/.test(token)) {
    return "storage";
  }
  if (/(wall|gate|watchtower|fence|foundation|roof|stairs|building)\b/.test(token)) {
    return "building";
  }
  if (/(backpack|school_bag|sports_bag|travel_pack|pack)\b/.test(token)) {
    return "backpack";
  }
  if (/(vest|armor|helmet|mask|shirt|hoodie|jacket|pants|gloves|boots|trainers|hat|cap|bandana|beanie|shoes|tops|legs|face|head)\b/.test(token)) {
    return "clothing";
  }
  if (/(med|tablet|painkiller|bandage|antibiotic|antiseptic|multivit|syringe|plasma|acid|rag|treatment)\b/.test(token)) {
    return "medical";
  }
  if (/(apple|beans|peas|tuna|soup|nuts|bar|drink|soda|juice|coffee|liquor|milk|fish|meat|rice|potato|onion|tomato|egg|mushroom|crackers|cereal|food|honey|jam|pumpkin|carrot|cabbage|perch|salmon|pike)\b/.test(token)) {
    return "consumable";
  }
  if (/(axe|hatchet|saw|hammer|wrench|screwdriver|shovel|pick|repair_kit|gun_repair_kit|lockpick|sewing_kit|small_wrench|scissors|drill)\b/.test(token)) {
    return "tool";
  }
  if (/(pistol|rifle|shotgun|uzi|ump|revolver|bow|crossbow|sword|machete|bat|crowbar|knife|spear|mine|molotov|bomb|knuckles|shiv|weapon|fire_axe)\b/.test(token)) {
    return "weapon";
  }
  if (/(ore|metal|iron|steel|zinc|copper|coal|saltpeter|salt|wood|log|fiber|rope|nail|nails|sheet|scrap|duct_tape|cable|electronics|gunpowder|parts|glass|bottle|jar|fuel|oil|thread|stone|battery|watch|needle)\b/.test(token)) {
    return "material";
  }

  return "material";
}

function inferSubcategoryFromName(name) {
  const token = normalizeToken(name);
  if (!token) {
    return "misc";
  }
  if (/(van|truck|sedan|hatchback|car|vehicle|bus|tractor|bike)\b/.test(token)) return "vehicle";
  if (/(storage|locker|cabinet|crate|container|cupboard)\b/.test(token)) return "container";
  if (/(wall|gate|watchtower|fence|foundation|roof|stairs|building)\b/.test(token)) return "structure";
  if (isAmmoName(name)) return "ammo";
  if (/(backpack|school_bag|sports_bag|travel_pack|pack)\b/.test(token)) return "backpack";
  if (/(vest|armor)\b/.test(token)) return "vest";
  if (/(helmet|mask|hat|cap|beanie|bandana)\b/.test(token)) return "headgear";
  if (/(shirt|hoodie|jacket)\b/.test(token)) return "tops";
  if (/(pants)\b/.test(token)) return "legs";
  if (/(gloves)\b/.test(token)) return "gloves";
  if (/(boots|trainers|shoes)\b/.test(token)) return "feet";
  if (/(pistol|revolver)\b/.test(token)) return "pistol";
  if (/(uzi|ump|smg)\b/.test(token)) return "smg";
  if (/(rifle|shotgun)\b/.test(token)) return "rifle";
  if (/(bow|arrow|bolt)\b/.test(token)) return "archery";
  if (/(axe|hatchet|hammer|saw|shovel|pick|wrench|screwdriver|knife|crowbar|repair_kit|lockpick)\b/.test(token)) return "tool";
  if (/(acid|plasma|syringe|treatment|bandage|tablet|pill|med|rag)\b/.test(token)) return "medical";
  if (/(ore|coal|metal|iron|zinc|copper|wood|fiber|rope|nail|sheet|scrap|electronics|parts|powder|battery|oil|stone|glass|jar|bottle)\b/.test(token)) return "resource";
  if (/(food|drink|soup|juice|soda|coffee|liquor|meat|fish|fruit|vegetable|bar|cereal|nuts|beans|peas|tuna|potato|carrot|onion|tomato|egg|milk|mushroom|crackers|jam|honey)\b/.test(token)) return "food";
  return "misc";
}

function inferInventoryCategory(category) {
  const token = normalizeToken(category);
  if (token === "weapon") return "weapon";
  if (["clothing", "backpack", "armor"].includes(token)) return "armor";
  if (token === "tool") return "tool";
  if (["medical", "consumable"].includes(token)) return "consumable";
  if (token === "ammo") return "ammo";
  if (["material", "resource"].includes(token)) return "material";
  return "misc";
}

function normalizeGameName(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isAmmoName(name) {
  const token = normalizeToken(name);
  return [
    "308_win",
    "357_magnum",
    "357",
    "45_acp",
    "50_cal",
    "5_56mm",
    "7_62mm",
    "9mm",
    "12_gauge_shells",
    "arrow",
    "improvised_arrow",
    "fire_arrow",
    "crossbow_bolt",
    "bolt",
  ].includes(token);
}

function pickValue(...values) {
  for (const value of values) {
    const normalized = normalizeNumber(value);
    if (normalized != null) {
      return normalized;
    }
  }
  return null;
}

function parseYesNo(value) {
  if (value == null || value === "") {
    return null;
  }

  const normalized = normalizeToken(value);
  if (normalized === "yes") return true;
  if (normalized === "no") return false;
  return null;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  return parseYesNo(value);
}

function normalizeRarity(value) {
  if (!value) {
    return "";
  }

  const templateMatch = String(value).match(/\{\{Rarity\|([^}]+)\}\}/i);
  if (templateMatch) {
    return normalizeToken(templateMatch[1]);
  }
  return normalizeToken(value);
}

function normalizeNumber(value) {
  if (value == null || value === "" || value === "-" || value === "N/A") {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = cleanWikiMarkup(String(value));
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  return Number(match[0]);
}

function normalizeInteger(value) {
  const number = normalizeNumber(value);
  if (number == null) {
    return null;
  }
  return Math.round(number);
}

function normalizeWhitespace(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
}

function normalizeToken(value) {
  return normalizeWhitespace(value)
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function normalizeListString(value) {
  const normalized = cleanWikiMarkup(value);
  if (!normalized || normalized === "-" || normalized === "N/A") {
    return "";
  }
  return normalized;
}

function cleanWikiMarkup(value) {
  if (typeof value !== "string") {
    return "";
  }

  return normalizeWhitespace(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[\[(?:File|Image):[^|\]]+(?:\|[^\]]*)?\]\]/gi, " ")
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\{\{Rarity\|([^}]+)\}\}/gi, "$1")
      .replace(/\{\{Armor\|([^}]+)\}\}/gi, "$1")
      .replace(/\{\{Insulation\|([^}]+)\}\}/gi, "$1")
      .replace(/\{\{[^}]+\}\}/g, " ")
      .replace(/'''/g, "")
      .replace(/''/g, "")
      .replace(/\|thumb/gi, " ")
      .replace(/NO IAMGE|NO IMAGE/gi, " ")
      .replace(/\s+/g, " "),
  );
}

function extractWikiFileName(value) {
  if (typeof value !== "string") {
    return "";
  }
  const match = value.match(/\[\[(?:File|Image):([^|\]]+)/i);
  return normalizeWhitespace(match?.[1] || "");
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (values || [])
        .map((entry) => normalizeWhitespace(entry))
        .filter(Boolean),
    ),
  );
}

function compactObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry == null || entry === "") {
      continue;
    }
    if (Array.isArray(entry) && entry.length === 0) {
      continue;
    }
    if (typeof entry === "object" && !Array.isArray(entry)) {
      const nested = compactObject(entry);
      if (nested && Object.keys(nested).length > 0) {
        output[key] = nested;
      }
      continue;
    }
    output[key] = entry;
  }
  return output;
}

function shouldReplaceExistingValue(existingValue, incomingValue, key) {
  if (existingValue == null || existingValue === "" || (Array.isArray(existingValue) && existingValue.length === 0)) {
    return true;
  }

  if (key === "description" && typeof incomingValue === "string") {
    const existing = normalizeWhitespace(existingValue);
    const incoming = normalizeWhitespace(incomingValue);
    return !existing || existing.startsWith("Craft ") || existing.length < incoming.length;
  }

  return false;
}

function mergeSourceScopes(left, right) {
  const scopes = new Set(
    [left, right]
      .map((scope) => normalizeSourceScope(scope))
      .filter(Boolean),
  );
  if (scopes.size === 0) return "";
  if (scopes.size === 1) return [...scopes][0];
  return "hybrid";
}

function normalizeSourceScope(value) {
  const token = normalizeToken(value);
  if (["fandom", "wiki_gg", "derived", "hybrid"].includes(token)) {
    return token;
  }
  return token || "";
}

function slugify(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function encodeTitle(title) {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

function toPowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const catalog = await generateHumanitzCatalog();
  const outputFilePath = await writeCatalogSnapshot(catalog);
  console.log(
    `Generated ${outputFilePath} with ${catalog.items.length} items and ${catalog.recipes.length} recipes.`,
  );
}

const isDirectRun = (() => {
  try {
    if (typeof process === "undefined" || !process.argv?.[1]) {
      return false;
    }
    const normalizedArgvPath = String(process.argv[1]).replace(/\\/g, "/");
    return import.meta.url.endsWith(normalizedArgvPath);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
