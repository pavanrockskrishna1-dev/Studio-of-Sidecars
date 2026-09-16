// Mission 13C (Inspector Lighting Presets) — the five one-click mood presets
// for the Inspector Rail's Lighting section.
//
// Each preset sets the SAME six values the Studio's lighting rig already
// exposes (key / fill / rim / ambient / shadow / exposure — profiles.js), so
// applying a preset means "drive the existing sliders", never a second
// lighting system. The chip labels themselves live in ui/content.js
// (INSPECTOR_PLACEHOLDERS.lighting) and are deliberately NOT duplicated here:
// the join between a chip and its preset is a label -> id slug, so a label
// that leaves the content list can never match a preset, and this file stays
// presentation-free (plain exported data, no JSX — same pattern as profiles.js).
//
// Values are calibrated against the rig's proven range, not invented: the
// per-environment profiles in profiles.js (key 2.3–3.4, fill 0.3–1.1,
// rim 1.2–2.4, ambient 0.15–0.55, shadow 0.4–0.65, exposure 1.0–1.1), and
// every value sits on the step grid of its slider in LIGHTING_CONTROLS.
// Session-only, like the rest of the Studio lighting state.

// The six knobs every preset touches, in the order the rig exposes them.
export const MOOD_KNOBS = Object.freeze([
  "key",
  "fill",
  "rim",
  "ambient",
  "shadow",
  "exposure",
]);

export const MOOD_PRESETS = Object.freeze([
  // Even, low-contrast studio portrait: the loft's balanced rig with fill
  // held at its proven maximum and the shadow at its proven softest.
  {
    id: "softbox-key",
    values: Object.freeze({
      key: 2.4,
      fill: 1.1,
      rim: 1.2,
      ambient: 0.5,
      shadow: 0.4,
      exposure: 1.0,
    }),
  },
  // A single bright window: moderate key, below-average fill (window light
  // is contrasty), interior bounce at the hangar's brighter ambient.
  {
    id: "cafe-window",
    values: Object.freeze({
      key: 2.6,
      fill: 0.7,
      rim: 1.3,
      ambient: 0.45,
      shadow: 0.5,
      exposure: 1.0,
    }),
  },
  // Low warm sun: strong key, thin fill, long hard shadows at the rig's
  // proven maximum, the dramatic one-notch exposure step.
  {
    id: "golden-hour",
    values: Object.freeze({
      key: 3.2,
      fill: 0.5,
      rim: 1.8,
      ambient: 0.4,
      shadow: 0.65,
      exposure: 1.1,
    }),
  },
  // The midnight-studio character (near-black ambient, rim pushed to its
  // proven maximum) read as neon.
  {
    id: "night-neon",
    values: Object.freeze({
      key: 3.0,
      fill: 0.3,
      rim: 2.4,
      ambient: 0.15,
      shadow: 0.6,
      exposure: 1.1,
    }),
  },
  // Subject lit from behind: rim at its proven maximum, key and fill at the
  // bottom of the proven band, ambient just above black so the face reads.
  {
    id: "backlit-rim",
    values: Object.freeze({
      key: 2.3,
      fill: 0.4,
      rim: 2.4,
      ambient: 0.3,
      shadow: 0.55,
      exposure: 1.05,
    }),
  },
]);

// "Café Window" -> "cafe-window" — diacritics-insensitive, so the join never
// depends on the exact accented spelling surviving a copy-paste.
const slugify = (label) =>
  label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** The registry id a chip label maps to (or null — unknown label, no preset). */
export function moodPresetId(label) {
  const preset = MOOD_PRESETS.find((p) => p.id === slugify(label));
  return preset ? preset.id : null;
}

/** The full preset a chip label maps to, or null when no preset exists for it. */
export function moodPresetForLabel(label) {
  const id = moodPresetId(label);
  return id ? MOOD_PRESETS.find((p) => p.id === id) : null;
}

// Tolerance is under half the coarsest slider step (0.1 / 2), so only values
// the rig can actually rest on count as "the preset".
const MATCH_EPSILON = 0.01;

/**
 * Which preset (if any) matches the given live knob values — the data for the
 * rail's active-chip highlight. null means "none of the five" (the default
 * and every manually adjusted state).
 */
export function findActiveMoodPreset(liveValues) {
  if (!liveValues) return null;
  return (
    MOOD_PRESETS.find((p) =>
      MOOD_KNOBS.every((k) => Math.abs(liveValues[k] - p.values[k]) < MATCH_EPSILON)
    ) ?? null
  );
}
