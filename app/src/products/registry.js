// Product registry — the single source of truth for what the studio can show.
//
// Adding a product (or swapping in a FINAL asset) means:
//   1. a .glb file in public/models/
//   2. one entry in this list
// No component changes. Camera fit, floor, and lighting are all derived
// from whatever model is loaded.

// Slice C2c: optional DISPLAY labels for the camera presets, per product,
// keyed by preset id. Only what the user reads changes: preset ids and names,
// the camera maths, sessions, layouts, Reel shots and custom views keep using
// the preset ids / names. The two coffee bikes need them because their frontAz
// points at the cart's branding side (not the motorcycle's headlight), so the
// generic names do not match what the camera shows; the Top preset ignores
// frontAz anyway. Products without a map show the preset names.
const COFFEE_BIKE_PRESET_LABELS = Object.freeze({
  front: "Branding side",
  side: "Rear",
  "three-quarter": "Rear 3/4",
  rear: "Bike side",
  top: "Top",
  "low-hero": "Low branding side",
});

import { PROPS } from "./props.js";

export const PRODUCTS = [
  {
    id: "coffee-bike",
    name: "Coffee Bike",
    label: "Coffee Bike",
    modelPath: "/models/the_kop_refined.glb",
    // World-space azimuth (degrees) the model's FRONT faces. Camera presets
    // are defined relative to this so "Front" always shows the front. The
    // coffee cart/branding faces -X in this asset.
    frontAz: -90,
    presetLabels: COFFEE_BIKE_PRESET_LABELS,
  },
  {
    // Source: the owner's Tripo account (generated model). Terms of use for
    // commercial publication are the owner's to confirm; not checked here.
    // The model is normalised to 1.0 unit at its widest, so it carries no
    // real-world scale (a real C172 has about an 11 m wingspan).
    // The old placeholder file (public/models/cessna-172.glb) and its generator
    // (scripts/gen-c172-placeholder.mjs) are kept as a fallback: revert = restore
    // modelPath "/models/cessna-172.glb" and frontAz 90.
    id: "cessna-172",
    name: "Cessna 172",
    label: "Cessna 172",
    modelPath: "/models/cessna-172-tripo.glb",
    // Nose points +Z in this asset (length runs along z, wingspan along x).
    // Convention: azimuth 0 = the camera on the +Z side looking toward -Z, so
    // frontAz 0 shows the +Z face as "Front".
    frontAz: 0,
  },
  {
    // THE KOP coffee bike with its cart (MAIN). The file is Blender-authored
    // (generator "Blender I/O"); its 98 bike pieces are named tripo_part_N,
    // which suggests they were generated in Tripo. That is an inference: the
    // owner confirms the origin and the terms of use, not checked here. The
    // file carries no author or licence.
    // Units are unstated (the glTF standard says metres, unverified). The real
    // cart box body is 52 x 22 x 22 inches; the node "Cabinet carcass" is 1.35
    // long, within about 2 percent of 52 in if the units are metres.
    // The sign parts are named "Temporary ..." and stay as they are.
    // Heavy model: 483,311 triangles, 753 draw calls. Tested OK on the owner's
    // PC. The old "coffee-bike" entry above is kept unchanged.
    id: "the-kop-main",
    name: "THE KOP Coffee Bike (MAIN)",
    label: "THE KOP MAIN",
    modelPath: "/models/the-kop-main.glb",
    // The THE KOP sign plates sit on the +X face of "Cabinet carcass" (the bike
    // itself runs along z). Azimuth 90 = the camera on the +X side, so "Front"
    // shows the sign side.
    frontAz: 90,
    presetLabels: COFFEE_BIKE_PRESET_LABELS,
  },
  {
    // Slice B1: the BBQ Bike, assembled by the owner's team from separate
    // pieces (see HANDOFF "Slice B1"): the Royal Enfield and the sidecar wheel
    // taken unmoved from THE KOP MAIN, the BBQ grill unit v05 (no tool box) and
    // the sidecar chassis v01. Metres, Y up, tyres on y = 0, 409 meshes,
    // 339,255 triangles, 19.7 MB. The vehicle runs along z: the headlight and
    // the grill's "BBQ RIDE" front door face +Z, the sidecar and the grill's
    // branding side face +X, the bike sits at -X.
    // Source and terms of use of the parts are the owner's to confirm; not
    // checked here.
    id: "bbq-bike",
    name: "BBQ Bike",
    label: "BBQ Bike",
    modelPath: "/models/bbq-bike.glb",
    // Azimuth 0 = the camera on the +Z side, so "Front" shows the headlight
    // and the BBQ RIDE door.
    frontAz: 0,
    // Real render of the model (made with the studio itself, see HANDOFF B1)
    thumbUrl: "/models/bbq-bike-thumb.jpg",
    // Slice P2: where props are dropped. `node` is the cooking grate (a mesh
    // inside BBQ_Unit/BBQ_Grill_Unit/Grill_Housing; its top is the surface).
    // `lid`: the closed lid sits 4 cm above the grate, so while any prop stands
    // on the grate the lid OPENS (derived, not stored): the lid groups `nodes`
    // turn `angleDeg` about the real hinge line (the centre of the mesh
    // `hinge`, Lid_Hinge_Pins, along z). 85 deg: at 88 deg and more the lid
    // meets the bike's left mirror (Mirror_L); checked on triangles in
    // scripts/test-props.mjs.
    propSurface: { node: "Grill_Grate", lid: { hinge: "Lid_Hinge_Pins", nodes: ["Lid_Main", "Lid_Rear"], angleDeg: 85 } },
  },
];

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}

// Slice C2c: the label a camera preset ({ id, name }) shows for a product.
export const presetLabel = (product, preset) => product?.presetLabels?.[preset.id] ?? preset.name;

// Slice P2: every asset an added object can come from: a product (built-in or
// imported) or a prop. Props live in products/props.js, not in PRODUCTS.
export function getAsset(id) {
  return PRODUCTS.find((p) => p.id === id) ?? PROPS.find((p) => p.id === id) ?? null;
}
