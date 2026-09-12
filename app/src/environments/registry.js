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
    mood: "riveted hangar · light shafts · aviation decor",
  },
  {
    id: "industrial-steel-factory",
    name: "Industrial Steel Factory",
    label: "Steel Factory",
    file: "/environments/industrial_steel_factory.jpg",
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
];

export const DEFAULT_ENVIRONMENT_ID = "propeller-pistons-loft";

export function getEnvironment(id) {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0];
}
