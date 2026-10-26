/* The ready-made occasion sets: what each set is made of, as plain data with no
   imports, so scripts/test-occasion-sets.mjs can check it in plain node and the
   builder (occasionSets.js) only has to read it.

   One entry per occasion id in animation/occasionDefs.js (except "none"):
     name, emoji, blurb  what the Occasions sheet shows on the button
     stage               fx/stageLook.js: "night" (its own sky/ground/moon),
                         "day" (its own sky/ground/sun) or "studio"
     ground              optional fx/groundSurfaces.js surface id for a
                         night/day stage; left out keeps/falls back to that
                         stage's own default (soil for night, grass for day)
     look                fx/lookStore.js preset: moonlit | sunset | studio
     props               [assetId, x, y, z, turnDeg, scale] - at most MAX_SET_PROPS.
                         Coordinates are the stage's model frame (metres, Y up, the
                         bike's front +Z). Every prop GLB is normalised to about
                         1 unit, so scale is roughly the prop's biggest side in metres.
     effects             [type, x, z, size] placed on the ground (fx/effectsStore.js).
                         LEFT OUT (not []) means "don't touch the placed effects":
                         Halloween Night has none of its own and must not clear them.
     shots               the Reel, 1..5 shots of 4, 8 or 12 s, at most 30 s in total
     rideIn              the bike rides in from behind along -Z, or null for none
     door                the cabinet door flipping open, or null for none
     productKeys         optional extra keys on the bike itself, as offsets from its
                         rest pose (x y z rx ry rz), so each shot starts and ends at rest

   Keep the bike the hero: props stay clear of the 3/4 and Front views and of the
   ride-in path (x about 0, z from -5.5 to 0). */

export const SET_PRODUCT_ID = "bbq-bike";
export const MAX_SET_PROPS = 30; // products/props.js MAX_PROPS
export const MAX_SET_EFFECTS = 20; // fx/effectsStore.js MAX_EFFECTS
export const MAX_SET_SHOTS = 5; // animation/reelSequence.js MAX_SHOTS
export const MAX_SET_REEL_S = 30; // animation/reelSequence.js MAX_TOTAL_S

// 28 s, five shots - the Halloween Reel, and the default for every set
export const DEFAULT_SHOTS = [
  { move: "push-in", startView: "3/4", durationS: 8 }, // the bike rides in and stops
  { move: "orbit", startView: "Low Hero", durationS: 4 },
  { move: "crane", startView: "Top", durationS: 4 }, // the food on the grate
  { move: "slide", startView: "Side", durationS: 4 },
  { move: "pull-back", startView: "Front", durationS: 8 }, // the door flips open
];
export const RIDE_IN = { shot: 0, distance: 5.5, arriveS: 5.5 };
export const DOOR_OPEN = { shot: 4, startS: 0.6, openS: 1.2, angleDeg: -100 };

// the utensils hang on the grill's side; food sits on the grate at y 1.21
const UTENSILS = ["prop-bbqsmith-utensils", 1.07, 0.66, 0.15, 90, 0.6];
const GRATE = [
  ["prop-bbq-chicken-drumsticks", 0.82, 1.21, 0.378, 10, 0.26],
  ["prop-bbq-chicken-wing", 0.8, 1.21, -0.02, 70, 0.19],
  ["prop-bbq-chicken-burger", 0.81, 1.21, 0.66, 0, 0.14],
];

export const OCCASION_SETS = Object.freeze({
  halloween: {
    name: "Halloween Night", emoji: "🎃", stage: "night", look: "moonlit",
    blurb: "Bare trees, barrels, the pumpkin crab and food. The bike rides in, its door flips open in the finale.",
    props: [
      ["prop-bbqsmith-bare-tree", -1.75, 0, -1.55, 20, 3.4],
      ["prop-bbqsmith-bare-tree", 2.55, 0, -1.45, -40, 3.0],
      ["prop-halloween-pumpkin-crab", -0.83, 0, 0.91, -41, 0.924],
      ["prop-bbqsmith-whisky-barrel", 1.95, 0, 1.83, 15, 0.85],
      ["prop-bbqsmith-whisky-barrel", -1.45, 0, 0.55, -25, 0.75],
      ["prop-bbqsmith-half-barrel", -1.53, 0.75, 0.734, -76, 0.7], // stacked on the barrel above
      ["prop-bbq-chicken-burger-v2", 0.98, 0, 1.7, -15, 0.16],
      ["prop-bbq-chicken-drumsticks", 0.55, 0, 2.0, 30, 0.22],
      UTENSILS,
      ...GRATE,
    ],
    // no effects of its own: the bats are the occasion pack's overlay, so the
    // placed effects are left exactly as the owner left them
    shots: DEFAULT_SHOTS,
    rideIn: RIDE_IN,
    door: DOOR_OPEN,
  },

  christmas: {
    name: "Christmas Eve", emoji: "🎄", stage: "night", look: "moonlit",
    blurb: "Snowy night: bare trees, firewood, a food table and BBQ letters in sparkles, on snow-covered ground. The bike rides in through the snow.",
    props: [
      ["prop-bbqsmith-bare-tree", -1.75, 0, -1.55, 20, 3.4],
      ["prop-bbqsmith-bare-tree", 2.55, 0, -1.45, -40, 3.0],
      ["prop-firewood-storage", -2.0, 0, 0.3, 70, 0.8],
      ["prop-bbqsmith-barrel-table", 1.9, 0, 1.5, 0, 0.9],
      ["prop-bbq-chicken-burger-v2", 1.9, 0.9, 1.5, -15, 0.16],
      ["prop-bbqsmith-bbq-letters", -0.9, 0, 1.9, 15, 0.85],
      ["prop-bbqsmith-whisky-barrel", 2.3, 0, 0.2, 15, 0.85],
      ...GRATE,
    ],
    effects: [
      ["snowground", -0.6, -0.4, 1.3], // the ground under and behind the bike
      ["snowground", 1.5, 1.3, 0.9], // out to the food table
      ["snow", 0, 0, 1.6],
      ["dust", -0.9, 1.9, 0.5],
    ],
    shots: DEFAULT_SHOTS,
    rideIn: RIDE_IN,
    door: DOOR_OPEN,
  },

  diwali: {
    name: "Diwali Lights", emoji: "🪔", stage: "night", look: "sunset",
    blurb: "Festival night: spark fountains, golden dust and glowing lights around barrels, the smoker and a coal bed.",
    props: [
      ["prop-bbqsmith-smoker-wagon", 2.4, 0, -1.2, -30, 1.2],
      ["prop-bbqsmith-whisky-barrel", -1.6, 0, 0.4, -25, 0.8],
      ["prop-bbqsmith-half-barrel", 1.9, 0, 1.2, 10, 0.5],
      ["prop-bbq-coal-bed", -0.9, 0, 1.6, 0, 0.45],
      ["prop-bbqsmith-bbq-letters", -1.2, 0, 2.0, 20, 0.85],
      ...GRATE,
    ],
    effects: [["sparks", -1.3, 1.6, 0.5], ["sparks", 1.4, 1.8, 0.5], ["dust", 0, 2.2, 0.6], ["fireflies", 0, 0, 1.0]],
    shots: DEFAULT_SHOTS,
    rideIn: RIDE_IN,
    door: DOOR_OPEN,
  },

  newyear: {
    name: "New Year Party", emoji: "🎆", stage: "night", look: "moonlit",
    blurb: "Party night: confetti, spark fountains, two food tables and BBQ letters. The door opens at midnight.",
    props: [
      ["prop-bbqsmith-barrel-table", -1.8, 0, 1.2, 0, 0.9],
      ["prop-bbq-chicken-burger-v2", -1.8, 0.9, 1.2, 0, 0.16],
      ["prop-bbqsmith-barrel-table", 1.9, 0, 1.4, 0, 0.9],
      ["prop-bbq-chicken-drumsticks", 1.9, 0.9, 1.4, 30, 0.22],
      ["prop-bbqsmith-firewood", -2.1, 0, -1.9, 30, 0.8], // off the ride-in path
      ["prop-bbqsmith-bbq-letters", 2.4, 0, -0.6, -50, 0.85],
      UTENSILS,
      ...GRATE,
    ],
    effects: [["confetti", 0, 0.5, 1.4], ["sparks", -1.5, 1.5, 0.5], ["sparks", 1.6, 1.4, 0.5], ["dust", 0, -1, 0.8]],
    shots: DEFAULT_SHOTS,
    rideIn: RIDE_IN,
    door: DOOR_OPEN,
  },

  holi: {
    name: "Holi Colours", emoji: "🌈", stage: "day", ground: "grass", look: "studio",
    blurb: "Bright daylight: the bike rides out of a cloud of colour powder, past a food table and a half barrel, and shakes the colour off.",
    props: [
      ["prop-bbqsmith-barrel-table", -1.9, 0, 1.3, 0, 0.9],
      ["prop-bbq-box-open", -1.9, 0.9, 1.3, 20, 0.18],
      ["prop-bbqsmith-half-barrel", 2.0, 0, 1.4, -15, 0.5],
      ["prop-bbq-chicken-roll", 2.0, 0.45, 1.4, 40, 0.15],
      ["prop-bbqsmith-whisky-barrel", -2.1, 0, -0.3, 25, 0.5],
      ["prop-bbqsmith-bbq-letters", 1.5, 0, 2.1, -25, 0.85],
      UTENSILS,
      ...GRATE,
    ],
    effects: [
      ["powder", 0, -2.6, 1.3], // the cloud the bike rides out of
      ["powder", -1.5, 0.8, 1.0],
      ["powder", 1.6, 0.9, 1.0],
      ["powder", 0.2, 2.4, 0.8],
    ],
    shots: DEFAULT_SHOTS,
    rideIn: RIDE_IN,
    door: DOOR_OPEN,
    // shot 2 (the low orbit): a short bounce, as if shaking the powder off
    productKeys: [
      { shot: 1, t: 0, offset: {}, easing: "out" },
      { shot: 1, t: 1, offset: { y: 0.12 }, easing: "in" },
      { shot: 1, t: 2, offset: {}, easing: "hold" },
    ],
  },

  valentine: {
    name: "Valentine's Night", emoji: "❤️", stage: "night", look: "sunset",
    blurb: "Warm and intimate: two laid tables for two, soft mist and fireflies, and hearts floating up over the food.",
    props: [
      ["prop-bbqsmith-barrel-table", -1.7, 0, 1.4, 0, 0.9],
      ["prop-bbq-chicken-burger-v2", -1.7, 0.9, 1.4, -20, 0.16],
      ["prop-bbqsmith-barrel-table", 1.8, 0, 1.5, 0, 0.9],
      ["prop-bbq-chicken-burger", 1.8, 0.9, 1.5, 25, 0.14],
      ["prop-bbqsmith-whisky-barrel", -2.2, 0, -0.2, -20, 0.5],
      ["prop-bbqsmith-half-barrel", 2.3, 0, -0.4, 15, 0.5],
      ["prop-bbqsmith-bbq-letters", -0.7, 0, 2.2, 12, 0.85],
      UTENSILS,
      ...GRATE,
    ],
    effects: [
      ["hearts", -1.7, 1.4, 0.9],
      ["hearts", 1.8, 1.5, 0.9],
      ["embers", 1.5, -0.8, 0.5], // a warm glow off to the side
      ["fireflies", 0, 0, 1.0],
      ["fog", 0, 0.4, 1.2],
    ],
    shots: DEFAULT_SHOTS,
    rideIn: RIDE_IN,
    door: DOOR_OPEN,
  },

  republic: {
    name: "Republic Day", emoji: "🇮🇳", stage: "day", ground: "cobblestone", look: "studio",
    blurb: "Clean daylight, proudly plain: the smoker to one side, one laid table, BBQ letters, and saffron-white-green confetti over the whole stage.",
    props: [
      ["prop-bbqsmith-smoker-wagon", -2.5, 0, -1.3, 35, 1.2],
      ["prop-bbqsmith-barrel-table", 2.0, 0, 1.4, 0, 0.9],
      ["prop-bbq-chicken-drumsticks", 2.0, 0.9, 1.4, 25, 0.22],
      ["prop-bbqsmith-bbq-letters", -1.4, 0, 1.9, 25, 0.85],
      ["prop-bbqsmith-whisky-barrel", 2.4, 0, -0.5, -20, 0.5],
      UTENSILS,
      ...GRATE,
    ],
    effects: [["tricolor", 0, 0, 1.5], ["tricolor", -1.9, -1.6, 0.9], ["tricolor", 2.0, -1.5, 0.9]],
    shots: [
      { move: "push-in", startView: "3/4", durationS: 8 },
      { move: "slide", startView: "Side", durationS: 4 },
      { move: "crane", startView: "Top", durationS: 4 },
      { move: "orbit", startView: "Low Hero", durationS: 4 },
      { move: "pull-back", startView: "Front", durationS: 8 },
    ],
    rideIn: RIDE_IN,
    door: DOOR_OPEN,
  },

  eid: {
    name: "Eid Night", emoji: "🌙", stage: "night", look: "moonlit",
    blurb: "Calm moonlit night: a generous spread on tables and barrels, lantern-like lights, fireflies and soft smoke off the grill.",
    props: [
      ["prop-bbqsmith-barrel-table", -1.8, 0, 1.3, 0, 0.9],
      ["prop-bbq-box-open", -1.8, 0.9, 1.3, 15, 0.18],
      ["prop-bbqsmith-barrel-table", 1.9, 0, 1.4, 0, 0.9],
      ["prop-bbq-chicken-roll", 1.9, 0.9, 1.4, -30, 0.15],
      ["prop-bbqsmith-half-barrel", -2.4, 0, 0.1, -25, 0.5],
      ["prop-bbq-box-closed", -2.4, 0.45, 0.1, 10, 0.18],
      ["prop-bbqsmith-whisky-barrel", 2.5, 0, 0.3, 20, 0.5],
      ["prop-bbqsmith-firewood", -2.2, 0, -1.6, 45, 0.8],
      ["prop-bbqsmith-bbq-letters", 0.9, 0, 2.2, -15, 0.85],
      UTENSILS,
      ...GRATE,
    ],
    effects: [
      ["wisps", -1.8, 1.3, 0.8],
      ["wisps", 1.9, 1.4, 0.8],
      ["fireflies", 0, 0, 1.2],
      ["smoke", 1.6, -0.6, 0.5],
    ],
    shots: DEFAULT_SHOTS,
    rideIn: RIDE_IN,
    door: DOOR_OPEN,
  },
});

export const SET_IDS = Object.keys(OCCASION_SETS);
