import { ENVIRONMENTS } from "../environments/registry";
import { CAMERA_PRESETS } from "../camera/presets";

/* ==========================================================================
   Creator UI content (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   Same shape as the engine's registries (data in, components out) so the
   sidebar and inspector stay reusable, but every entry here is presentation
   only: no handler, no store, no side effect. When a later engine mission
   wires a section, it supplies the callback and this file becomes the seed.

   Studio Backgrounds intentionally READ the locked environment registry — the
   UI must never invent its own list of what the studio can actually load.
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

function row(id, name, meta, icon, extra = {}) {
  return { id, name, meta, icon, ...extra };
}

export const SIDEBAR_GROUPS = [
  {
    id: "furniture",
    name: "Furniture",
    sub: "stage dressing",
    icon: "sofa",
    open: false,
    items: [
      row("sling-chair", "Sling Chair", "walnut · leather", "sofa"),
      row("cafe-table", "Café Table", "round · steel base", "sofa"),
      row("leather-loveseat", "Leather Loveseat", "tan · patina", "sofa"),
      row("brass-floor-lamp", "Brass Floor Lamp", "warm practical", "bulb"),
      row("turntable-plinth", "Turntable Plinth", "gloss black", "cube"),
    ],
  },
  {
    id: "lighting",
    name: "Lighting",
    sub: "cinematic looks",
    icon: "bulb",
    open: false,
    items: [
      row("softbox", "Softbox Key", "45° · 2.5", "sun"),
      row("cafe-window", "Café Window", "cool daylight", "sun"),
      row("golden-hour", "Golden Hour", "warm rim", "sun"),
      row("night-neon", "Night Neon", "blue haze", "sun"),
      row("backlit-rim", "Backlit Rim", "silhouette", "sun"),
    ],
  },
  {
    id: "scenes",
    name: "Scenes",
    sub: "saved shot sets",
    icon: "film",
    open: false,
    items: [
      row("showroom-01", "Showroom 01", "hero · front", "frame"),
      row("loft-reveal", "Loft Reveal", "orbit · 12s", "film"),
      row("reel-9-16", "Reel 9:16", "vertical cut", "render"),
      row("detail-macro", "Detail Macro", "part close-up", "camera"),
    ],
  },
  {
    id: "projects",
    name: "Projects",
    sub: "this device",
    icon: "folder",
    open: false,
    items: [
      row("coffee-bike-launch", "Coffee Bike Launch", "edited 2h ago", "folder"),
      row("cessna-heritage", "Cessna Heritage", "edited yesterday", "folder"),
      row("kop-refined", "The KOP · Refined", "locked", "lock"),
    ],
  },
  {
    id: "backgrounds",
    name: "Studio Backgrounds",
    sub: "locked library",
    icon: "frame",
    open: true,
    // Real studio imagery, read straight from the environment registry so the
    // chrome can never drift from what the engine is able to load.
    items: ENVIRONMENTS.map((env) =>
      row(env.id, env.name, env.mood, "frame", {
        thumb: env.file,
        tag: env.hero ? "hero" : null,
      })
    ),
  },
];

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
