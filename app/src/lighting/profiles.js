// Mission 9 (Lighting Foundation) — per-environment default lighting profiles.
// One value per knob the Studio renderer exposes: key / fill / rim light
// intensities, ambient intensity, ground-shadow strength and tone-mapping
// exposure. These are tuned STARTING points per environment; the Lighting
// panel moves them live from there. Session-only (React state), like everything
// else in the Studio controls.

export const DEFAULT_LIGHTING = Object.freeze({
  key: 2.5,
  fill: 1.0,
  rim: 1.2,
  ambient: 0.45,
  shadow: 0.45,
  exposure: 1.0,
});

const ENV_LIGHTING_PROFILES = {
  // Warm brick loft: balanced key with a gentle contact shadow.
  "propeller-pistons-loft": {
    key: 2.7,
    fill: 1.1,
    rim: 1.3,
    ambient: 0.5,
    shadow: 0.5,
    exposure: 1.0,
  },
  // Black cyc + single beam: dramatic key, almost no fill, strong cool rim.
  "midnight-black-commercial-studio": {
    key: 3.4,
    fill: 0.3,
    rim: 2.4,
    ambient: 0.15,
    shadow: 0.65,
    exposure: 1.1,
  },
  // Daylit hangar: softer key, brighter ambient, lighter shadow.
  "aviation-heritage-hangar": {
    key: 2.3,
    fill: 0.9,
    rim: 1.5,
    ambient: 0.55,
    shadow: 0.4,
    exposure: 1.0,
  },
};

export function getLightingProfile(environmentId) {
  return {
    ...DEFAULT_LIGHTING,
    ...(ENV_LIGHTING_PROFILES[environmentId] ?? null),
  };
}

// Slider metadata for the compact Lighting panel (id, label, range, step).
export const LIGHTING_CONTROLS = [
  { id: "key", label: "Key", min: 0, max: 5, step: 0.1 },
  { id: "fill", label: "Fill", min: 0, max: 3, step: 0.1 },
  { id: "rim", label: "Rim", min: 0, max: 4, step: 0.1 },
  { id: "ambient", label: "Ambient", min: 0, max: 1.5, step: 0.05 },
  { id: "shadow", label: "Shadow", min: 0, max: 1, step: 0.05 },
  { id: "exposure", label: "Exposure", min: 0.4, max: 1.8, step: 0.05 },
];
