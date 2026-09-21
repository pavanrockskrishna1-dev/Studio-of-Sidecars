// Product registry — the single source of truth for what the studio can show.
//
// Adding a product (or swapping in a FINAL asset) means:
//   1. a .glb file in public/models/
//   2. one entry in this list
// No component changes. Camera fit, floor, and lighting are all derived
// from whatever model is loaded.
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
];

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}
