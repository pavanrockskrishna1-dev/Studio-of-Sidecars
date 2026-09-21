import { ENVIRONMENTS } from "../environments/registry";
import { PRODUCTS } from "../products/registry";
import { CAMERA_PRESETS } from "../camera/presets";
import { BBQ_CARD_THUMB } from "./bbqPack";

/* ==========================================================================
   Creator UI content (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   Same shape as the engine's registries (data in, components out) so the
   sidebar and inspector stay reusable, but every entry here is presentation
   only: no handler, no store, no side effect. When a later engine mission
   wires a section, it supplies the callback and this file becomes the seed.

   Mission 10A: the creator sidebar is now the Asset Library, and it reads the
   two engine registries directly — PRODUCTS and ENVIRONMENTS are the only
   sources of truth for what the studio can display. Nothing here duplicates a
   registry array; the maps below attach chrome copy to registry ids, and an
   id that is not in the registry can never appear as a selectable card.
   ========================================================================== */

// `name` is the mockup label, `short` the compressed label used when the row
// runs out of room, and the Vn code alone below that — so a chip is never cut
// off at any width (the one rule every responsive tier of the design keeps).
export const VERSION_TABS = [
  { id: "v1", short: "V1", name: "Classic", compact: "Classic", active: true },
  { id: "v2", short: "V2", name: "Instagram Commercial", compact: "Instagram" },
  { id: "v3", short: "V3", name: "Blender Python", compact: "Blender" },
  { id: "v4", short: "V4", name: "Creator Studio", compact: "Creator" },
  { id: "v5", short: "V5", name: "Asset Library", compact: "Assets" },
  { id: "v6", short: "V6", name: "Brand Studio", compact: "Brand" },
];

// Chrome copy keyed by registry id. The registry owns what exists (id, name,
// model file); this only supplies the subtitle line and the glyph the card
// plate uses, so a product can never appear here without existing upstream.
const PRODUCT_CATEGORY = {
  "coffee-bike": "Retail mobility · hero",
  "cessna-172": "Aviation · heritage",
  "the-kop-main": "Retail mobility · hero",
};
const PRODUCT_ICON = { "coffee-bike": "bike", "cessna-172": "plane", "the-kop-main": "bike" };

// Announced but not shipped. Deliberately NOT a registry entry: no id in
// PRODUCTS, no modelPath, nothing the engine could load — so the card can
// only ever render as the inert placeholder the sidebar already uses.
// Mission 10B adds artwork for it (a still rendered from the pack's own GLB),
// which changes how the card looks and nothing about what it is: still no id in
// PRODUCTS, no modelPath, still inert in the grid.
export const PRODUCT_PLACEHOLDERS = [
  { id: "bbq-bike", name: "BBQ Bike", icon: "flame", thumb: BBQ_CARD_THUMB },
];

function productCards() {
  return [
    ...PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      category: PRODUCT_CATEGORY[p.id] || p.category || "In the studio",
      icon: PRODUCT_ICON[p.id] || (p.source === "imported" ? "upload" : "cube"),
      // Mission 10E: imported products carry their generated thumbnail and
      // provenance on the registry entry itself, so the card shows the real
      // preview and the filters can tell imported from built-in.
      thumb: p.thumbUrl || null,
      source: p.source || "built-in",
      importedAt: p.importedAt || 0,
    })),
    ...PRODUCT_PLACEHOLDERS.map((p) => ({ ...p, placeholder: true })),
  ];
}

// Mission 10E (Feature 8) — gallery categories. Presentation-only chrome:
// built-in ids map to the library's category names, imported environments
// carry the category chosen at import time on their registry entry.
const ENV_CATEGORY = {
  "propeller-pistons-loft": "Coffee Lifestyle",
  "vintage-garage-studio": "Studio",
  "coal-and-fire-forge": "Outdoor",
  "royal-enfield-heritage-workshop": "Studio",
  "aviation-heritage-hangar": "Aviation",
};

function environmentCards() {
  return ENVIRONMENTS.map((env) => ({
    id: env.id,
    name: env.name,
    // the registry's own compressed name, exactly as the engine's chips use it
    // (`o.label ?? o.name`) — so a card never ellipsizes at 118px, and the
    // full name still carries in the tooltip.
    short: env.label ?? env.name,
    category: ENV_CATEGORY[env.id] || env.category || "Studio",
    mood: env.mood,
    thumb: env.thumbUrl || env.file,
    tag: env.hero ? "hero" : null,
    source: env.source || "built-in",
    importedAt: env.importedAt || 0,
  }));
}

/**
 * The Asset Library: what the studio can display today, as two collections.
 * `kind` is the bridge key into the engine's picker (products / environments),
 * `items` are derived from the registries on every module load, and the count
 * a group header shows is therefore always the engine's real count.
 */
// Mission 10E — groups are now BUILT on demand: the runtime registry mirrors
// imported assets into the same registry arrays, so a fresh build picks them
// up without any module reload. GROUP_DEFS keeps the stable ids/open state.
export const GROUP_DEFS = [
  {
    id: "products",
    name: "Products",
    sub: "selectable in the stage",
    icon: "cube",
    kind: "product",
    open: true,
  },
  {
    id: "backgrounds",
    name: "Studio Backgrounds",
    sub: "built-in + imported",
    icon: "frame",
    kind: "environment",
    open: true,
  },
];

export function buildLibraryGroups() {
  const cards = { product: productCards(), environment: environmentCards() };
  return GROUP_DEFS.map((def) => ({ ...def, items: cards[def.kind] }));
}

export const LIBRARY_GROUPS = buildLibraryGroups();

export const ASSET_COUNT = LIBRARY_GROUPS.reduce((n, g) => n + g.items.length, 0);

// The one product that ships no model: it must read as present but inert, on
// the same terms every other placeholder row in this shell already uses.
export const PLACEHOLDER_TAG = "Coming Soon";
export const PLACEHOLDER_HINT = "not in the studio yet";

// Inspector sections. `Camera` mirrors the engine's live preset set; the rest
// are placeholders until their engine mission lands.
export const CAMERA_FRAMINGS = CAMERA_PRESETS.map((p) => p.name);

export const INSPECTOR_PLACEHOLDERS = {
  lighting: [
    "Softbox Key",
    "Café Window",
    "Golden Hour",
    "Night Neon",
    "Backlit Rim",
  ],
  materials: ["Chrome", "Candy Red", "Matte Charcoal", "Brass", "Tan Leather"],
  render: [
    "Reel · 9:16",
    "Post · 1:1",
    "Hero · 4:5",
    "Wide · 16:9",
    "Blender Cycles",
  ],
};

export const RAIL_CHIPS = [
  // short enough to never ellipsize inside the 284-300px rail
  { id: "aspect", text: "1:1 · 1080" },
  { id: "grade", text: "Softbox" },
  { id: "fps", text: "60 fps", live: true },
];
