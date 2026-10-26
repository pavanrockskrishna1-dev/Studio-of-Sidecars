// Mission 9 (Lighting Foundation) — per-environment lighting profiles.
// Each profile is the starting rig state for an environment (six knobs:
// key, fill, rim, ambient, shadow, exposure). See moodPresets.js for the
// one-click mood presets that override these same knobs.

const p = (key, fill, rim, ambient, shadow, exposure) =>
  Object.freeze({ key, fill, rim, ambient, shadow, exposure });

const PROFILES = {
  "propeller-pistons-loft":          p(2.6, 0.8, 1.6, 0.45, 0.5,  1.0),
  "vintage-garage-studio":           p(2.8, 0.6, 1.8, 0.35, 0.55, 1.0),
  "coal-and-fire-forge":             p(3.2, 0.4, 2.0, 0.2,  0.6,  1.05),
  "royal-enfield-heritage-workshop": p(2.5, 0.7, 1.5, 0.4,  0.5,  1.0),
  "aviation-heritage-hangar":        p(2.4, 0.9, 1.4, 0.5,  0.45, 1.0),
  "industrial-steel-factory":        p(2.7, 0.7, 1.7, 0.4,  0.55, 1.0),
  "midnight-black-commercial-studio":p(3.4, 0.3, 2.4, 0.15, 0.65, 1.1),
  "luxury-brick-loft-museum":        p(2.6, 0.8, 1.5, 0.45, 0.5,  1.0),
  "coffee-roastery-workshop":        p(2.8, 0.6, 1.6, 0.4,  0.5,  1.05),
  "matte-white-photography-studio":  p(2.3, 1.1, 1.2, 0.55, 0.4,  1.0),
  "marble-luxury-showroom":          p(2.5, 0.9, 1.4, 0.5,  0.45, 1.0),
};

export const DEFAULT_LIGHTING = PROFILES["propeller-pistons-loft"];

export function getLightingProfile(environmentId) {
  return PROFILES[environmentId] ?? DEFAULT_LIGHTING;
}

export const LIGHTING_CONTROLS = Object.freeze([
  { id: "key",      label: "Key",      min: 1.0, max: 4.0, step: 0.1 },
  { id: "fill",     label: "Fill",     min: 0.1, max: 1.5, step: 0.1 },
  { id: "rim",      label: "Rim",      min: 0.5, max: 3.0, step: 0.1 },
  { id: "ambient",  label: "Ambient",  min: 0.05, max: 0.7, step: 0.05 },
  { id: "shadow",   label: "Shadow",   min: 0.2, max: 0.8, step: 0.05 },
  { id: "exposure", label: "Exposure", min: 0.8, max: 1.4, step: 0.05 },
]);
