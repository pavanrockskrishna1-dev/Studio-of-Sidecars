// Mission 10C (Presentation Studio) — export framing + quality options.
// These are EXPORT dimensions only: they never move the camera and never add
// camera presets. The live camera framing (presets, custom view, orbit) is
// reused exactly as-is; a presentation preset only re-fits the projection to
// the target aspect ratio at export time.

export const EXPORT_PRESETS = [
  { id: "current", label: "Current view", width: 0, height: 0 },
  { id: "ig-square", label: "Instagram Square", width: 1080, height: 1080 },
  { id: "ig-portrait", label: "Instagram Portrait", width: 1080, height: 1350 },
  { id: "story-reel", label: "Story / Reel", width: 1080, height: 1920 },
  { id: "web-hero", label: "Website Hero", width: 1600, height: 900 },
  { id: "thumbnail", label: "Thumbnail", width: 1280, height: 720 },
];

export const EXPORT_SCALES = [1, 2, 4];

// Phase 16B (Slice C) — the Reel video frame: 1080x1920 at 30 fps. fovDeg is
// the stage's fixed vertical field of view (the FOV constant in
// components/StudioCanvas.jsx, which is not exported).
export const REEL_EXPORT = { width: 1080, height: 1920, fps: 30, fovDeg: 45 };

export const DEFAULT_EXPORT_OPTS = {
  background: "studio", // "studio" | "transparent"
  scale: 1, // 1x | 2x | 4x (applies to Current view only)
  presetId: "current",
};

// Pure: final PNG pixel dimensions for the given options. Presentation
// presets are exact spec sizes; Current view scales the live backing store.
export function computeExportSize(baseWidth, baseHeight, opts = {}) {
  const preset = EXPORT_PRESETS.find((p) => p.id === opts.presetId);
  if (preset && preset.width > 0) return [preset.width, preset.height];
  const scale = EXPORT_SCALES.includes(opts.scale) ? opts.scale : 1;
  return [Math.round(baseWidth * scale), Math.round(baseHeight * scale)];
}

export function exportFilename(opts = {}, transparent = false) {
  const preset = EXPORT_PRESETS.find((p) => p.id === opts.presetId);
  const parts = ["studio-capture"];
  if (preset && preset.width > 0) parts.push(preset.id);
  else if (opts.scale > 1) parts.push(`${opts.scale}x`);
  if (transparent || opts.background === "transparent") parts.push("transparent");
  return `${parts.join("-")}.png`;
}

// Phase 16B (Slice E3) - the three fixed social presets whose PNG uses exactly
// the framing the Reel MP4 uses (StudioCanvas.jsx computeReelView). "current",
// the landscape presets and unknown ids keep the live camera framing.
export const REEL_FRAMED_PRESETS = ["story-reel", "ig-portrait", "ig-square"];

// True only for one of those ids with a finite, positive, portrait-or-square
// size (width / height <= 1).
export function usesReelFraming(presetId, width, height) {
  if (!REEL_FRAMED_PRESETS.includes(presetId)) return false;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
  return width / height <= 1 + 1e-9;
}
