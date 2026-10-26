// Studio environment registry.
//
// Source of truth (LOCKED): design/environments/assets/studio_backgrounds/_manifest.json
// — Environment Library v2 · Phase 1.5 · LOCKED · APPROVED.
//
// Files under /environments/ are 1920px web derivatives of the locked 4K
// masters, produced by app/scripts/build-environment-derivatives.py. The
// masters themselves are never modified. Adding an environment later =
// new entry here + derivative in app/public/environments/.
export const ENVIRONMENTS = [
  {
    // Canonical default — "first scene users see on app open" (locked hero).
    id: "propeller-pistons-loft",
    name: "Propeller & Pistons Loft",
    label: "Pistons Loft",
    file: "/environments/propeller-pistons-loft.jpg",
    // Phase 16B Slice E2 - the round platform painted into the photo, for the
    // Reel MP4 (model on the platform). ESTIMATES measured from the JPG (design
    // report, plus or minus 3-4 px): fractions of the PHOTO, origin top-left,
    // y down. floorAngleDeg is the photo's implied camera elevation (about 8,
    // plus or minus 1.5). reelAnchorRy moves the model's base down by that many
    // platform ry from the platform centre (0 = centre, 0.33 = about the front
    // third). Environments without these fields keep today's Reel framing.
    platform: { cx: 0.4996, cy: 0.7268, rx: 0.2282, ry: 0.0478 },
    floorAngleDeg: 8,
    reelAnchorRy: 0,
    mood: "hero environment · locked",
    hero: true,
  },
  {
    id: "vintage-garage-studio",
    name: "Vintage Garage Studio",
    label: "Vintage Garage",
    file: "/environments/vintage_garage_studio.jpg",
    mood: "warm tungsten workshop · amber on charcoal",
  },
  {
    id: "coal-and-fire-forge",
    name: "Coal & Fire Forge",
    label: "Coal & Fire Forge",
    file: "/environments/coal_and_fire_forge.jpg",
    mood: "blacksmith forge · molten furnace glow",
  },
  {
    id: "royal-enfield-heritage-workshop",
    name: "Royal Enfield Heritage Workshop",
    label: "Heritage Workshop",
    file: "/environments/royal_enfield_heritage_workshop.jpg",
    mood: "heritage workshop · green & brass · no logos",
  },
  {
    id: "aviation-heritage-hangar",
    name: "Aviation Heritage Hangar",
    label: "Aviation Hangar",
    file: "/environments/aviation_heritage_hangar.jpg",
    // Slice E2 platform data (estimates, same meaning as on the Pistons Loft).
    platform: { cx: 0.4992, cy: 0.7264, rx: 0.2284, ry: 0.0472 },
    floorAngleDeg: 8,
    reelAnchorRy: 0,
    // Optional real equirect HDR that lights the model (image-based lighting);
    // the JPG above stays the visible backdrop. Entries without one use the
    // built-in RoomEnvironment probe.
    hdri: "/environments/hangar_interior_2k.hdr",
    mood: "riveted hangar · light shafts · aviation decor",
  },
  {
    id: "industrial-steel-factory",
    name: "Industrial Steel Factory",
    label: "Steel Factory",
    file: "/environments/industrial_steel_factory.jpg",
    // Real equirect HDR that lights the model (the JPG stays the backdrop).
    hdri: "/environments/industrial_pipe_and_valve_01_2k.hdr",
    mood: "steel hall · cool daylight + warm lamps",
  },
  {
    id: "midnight-black-commercial-studio",
    name: "Midnight Black Commercial Studio",
    label: "Midnight Studio",
    file: "/environments/midnight_black_commercial_studio.jpg",
    mood: "black cyc · single beam · blue rim",
  },
  {
    id: "luxury-brick-loft-museum",
    name: "Luxury Brick Loft Museum",
    label: "Brick Loft",
    file: "/environments/luxury_brick_loft_museum.jpg",
    mood: "brick loft · brass track light · alcoves",
  },
  {
    id: "coffee-roastery-workshop",
    name: "Coffee Roastery Workshop",
    label: "Roastery",
    file: "/environments/coffee_roastery_workshop.jpg",
    mood: "copper roaster · burlap · warm haze",
  },
  {
    id: "matte-white-photography-studio",
    name: "Matte White Photography Studio",
    label: "White Studio",
    file: "/environments/matte_white_photography_studio.jpg",
    mood: "seamless matte white cyc · soft light",
  },
  {
    id: "marble-luxury-showroom",
    name: "Marble Luxury Showroom",
    label: "Marble Showroom",
    file: "/environments/marble_luxury_showroom.jpg",
    mood: "marble · cove light · brass accents",
  },

  // ── BBQ / Street-food environments (ASSETS PENDING) ──────────────────────
  // For each entry below:
  //   1. Download the HDR from the Poly Haven URL in the comment
  //   2. Drop it into app/public/environments/
  //   3. Run: python app/scripts/build-environment-derivatives.py
  //      to generate the 1920px JPG derivative (the `file` path below)
  // Until the JPG exists the environment will fail to load its backdrop
  // (the HDR-based IBL lighting will still work once the .hdr file is present).

  {
    id: "bbq-sunset-terrace",
    name: "BBQ Sunset Terrace",
    label: "Sunset Terrace",
    file: "/environments/bbq_sunset_terrace.jpg",
    hdri: "/environments/sunflowers_puresky_2k.hdr",
    mood: "outdoor sunset terrace · warm golden hour · long shadows",
  },
  {
    id: "night-street-food-market",
    name: "Night Street-Food Market",
    label: "Night Market",
    file: "/environments/night_street_food_market.jpg",
    hdri: "/environments/blaubeuren_night_2k.hdr",
    mood: "night market · warm neon glow · lanterns · street food atmosphere",
  },
  {
    id: "park-festival-lawn",
    name: "Park Festival Lawn",
    label: "Festival Lawn",
    file: "/environments/park_festival_lawn.jpg",
    hdri: "/environments/meadow_2k.hdr",
    mood: "bright overcast day · open park lawn · festival vibes",
  },
  {
    id: "industrial-rooftop-bbq",
    name: "Industrial Rooftop BBQ",
    label: "Rooftop BBQ",
    file: "/environments/industrial_rooftop_bbq.jpg",
    hdri: "/environments/rooftop_night_2k.hdr",
    mood: "urban rooftop · city skyline at dusk · industrial railings",
  },
  {
    id: "beach-dusk",
    name: "Beach at Dusk",
    label: "Beach Dusk",
    file: "/environments/beach_dusk.jpg",
    hdri: "/environments/venice_sunset_2k.hdr",
    mood: "beach at dusk · cool blue horizon · warm sand · last light",
  },
];

export const DEFAULT_ENVIRONMENT_ID = "propeller-pistons-loft";

export function getEnvironment(id) {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0];
}
