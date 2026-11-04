/* Suggestion bar for the AI Reel Builder: ready-to-send briefs that fit the scene
   the person has built (stage, occasion and the props on it). Pure JS, no imports,
   so scripts/test-brief-suggestions.mjs can check it in plain node.

   scene = { stage: "studio"|"night"|"day", occasion: id|"none", props: [{ name }] }
   -> an array of at most MAX_SUGGESTIONS short briefs, most specific first. */

export const MAX_SUGGESTIONS = 6;

const OCCASION_BRIEFS = {
  diwali: "Warm festive Diwali reel: golden light, sparks in the air, a slow push-in, finishing close on the bike",
  halloween: "Spooky Halloween reel: low dramatic angles, a slow pull-back reveal, then a close-up of the glow",
  christmas: "Cosy Christmas night reel: soft snowy glow, a slow orbit, and a warm close-up to finish",
  newyear: "New Year party reel: quick energetic cuts, sparks and confetti, ending on a big reveal",
  holi: "Bright Holi reel: colourful and joyful, a smooth orbit, then a playful close-up",
  valentine: "Romantic Valentine reel: soft warm light, slow gentle moves, ending close on the food",
  republic: "Proud Republic Day reel: clean daylight, steady confident moves, a strong front-on finish",
  eid: "Calm Eid night reel: moonlit and gentle, a slow reveal, and a warm close-up to finish",
};

const STAGE_BRIEFS = {
  night: "Moody night reel: a slow reveal of the bike, then a close-up of the glow",
  day: "Bright fresh daytime reel with a smooth orbit around the bike and a punchy finish",
  studio: "Clean premium studio reel: a slow orbit, then a tight hero close-up of the bike",
};

// word in a prop's name -> the brief it inspires. First match wins per group.
const PROP_RULES = [
  { words: ["letters"], make: () => "Start on the BBQ letters, then reveal the bike with a slow push-in" },
  { words: ["burger", "roll", "wing", "drumstick", "chicken", "box"], make: (n) => `Close-up on the ${n} first, then pull back to show the whole set` },
  { words: ["fire", "coal", "ember", "campfire", "barrel"], make: () => "Warm flickering glow: a low angle, an orbit, and a finish close on the fire" },
  { words: ["pumpkin", "crab"], make: () => "Show off the pumpkins with a low slide, then orbit up to the bike" },
  { words: ["tree"], make: () => "Frame the bike between the trees: a wide establishing shot, then a slow push-in" },
  { words: ["table", "chair"], make: () => "Open on the laid table, then orbit to the bike for the hero shot" },
];

const GENERIC = [
  "Ride-in hero reel: a wide establishing shot, an orbit, then a tight close-up of the logo",
  "Quick punchy cuts: three short shots with a different angle each time, ending on the front of the bike",
];

function lower(name) {
  return String(name || "").toLowerCase();
}

export function suggestBriefs(scene) {
  const stage = scene && STAGE_BRIEFS[scene.stage] ? scene.stage : "studio";
  const occasion = scene && typeof scene.occasion === "string" ? scene.occasion : "none";
  const props = scene && Array.isArray(scene.props) ? scene.props : [];
  const out = [];
  const add = (text) => {
    if (text && !out.includes(text)) out.push(text);
  };

  if (OCCASION_BRIEFS[occasion]) add(OCCASION_BRIEFS[occasion]);

  for (const rule of PROP_RULES) {
    const hit = props.find((p) => rule.words.some((w) => lower(p.name).includes(w)));
    if (hit) add(rule.make(lower(hit.name)));
  }
  if (props.length >= 3) add("Show off every prop: a slide along the set, then an orbit round to the bike");

  add(STAGE_BRIEFS[stage]);
  for (const g of GENERIC) add(g);
  return out.slice(0, MAX_SUGGESTIONS);
}

// "Add to my brief" phrases: small building blocks the person can tap in.
export const BRIEF_ADDONS = Object.freeze([
  { group: "Mood", label: "Warm and festive", text: "Warm and festive mood." },
  { group: "Mood", label: "Dark and dramatic", text: "Dark and dramatic mood." },
  { group: "Mood", label: "Clean and premium", text: "Clean and premium mood." },
  { group: "Mood", label: "Fun and energetic", text: "Fun and energetic mood." },
  { group: "Pace", label: "Slow and cinematic", text: "Slow, cinematic pace." },
  { group: "Pace", label: "Quick punchy cuts", text: "Quick, punchy cuts." },
  { group: "Focus", label: "The whole bike", text: "Keep the whole bike in focus." },
  { group: "Focus", label: "The food", text: "Show the food up close." },
  { group: "Focus", label: "The logo", text: "End on a close-up of the logo." },
]);

// Adds a phrase to a brief without doubling it.
export function appendToBrief(brief, text) {
  const base = String(brief || "").trim();
  if (!text) return base;
  if (base.includes(text)) return base;
  return base ? `${base} ${text}` : text;
}
