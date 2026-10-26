// The studio's Look (one finish for the live view AND the Reel/MP4 export) and
// Smooth mode (lighter live rendering while editing; exports always render at
// full quality). Both are remembered in this browser.

export const LOOK_PRESETS = Object.freeze({
  off: { label: "Off" },
  moonlit: { label: "Moonlit night", exposure: 1.1, contrast: 1.18, saturation: 1.12, bloom: 0.55, vignette: 0.3, warmth: -0.15, sharpen: 0.35 },
  sunset: { label: "Warm sunset", exposure: 1.0, contrast: 1.1, saturation: 1.2, bloom: 0.4, vignette: 0.22, warmth: 0.35, sharpen: 0.3 },
  studio: { label: "Crisp studio", exposure: 1.0, contrast: 1.08, saturation: 1.06, bloom: 0.15, vignette: 0.12, warmth: 0, sharpen: 0.35 },
});
export const LOOK_IDS = Object.keys(LOOK_PRESETS);

// slider ranges (also the clamp for saved values)
export const LOOK_RANGES = Object.freeze({
  exposure: [0.5, 2],
  contrast: [0.7, 1.6],
  saturation: [0, 2],
  bloom: [0, 2],
  vignette: [0, 0.8],
  warmth: [-1, 1],
  sharpen: [0, 1],
});
const NEUTRAL = { exposure: 1, contrast: 1, saturation: 1, bloom: 0, vignette: 0, warmth: 0, sharpen: 0 };

const KEY = "sos.look.v1";
const lowMemory = typeof navigator !== "undefined" && navigator.deviceMemory && navigator.deviceMemory <= 4;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      const params = { ...NEUTRAL };
      for (const k of Object.keys(LOOK_RANGES)) {
        const v = raw.params?.[k];
        if (typeof v === "number" && Number.isFinite(v)) params[k] = Math.min(LOOK_RANGES[k][1], Math.max(LOOK_RANGES[k][0], v));
      }
      return {
        preset: LOOK_IDS.includes(raw.preset) || raw.preset === "custom" ? raw.preset : "off",
        params,
        smooth: typeof raw.smooth === "boolean" ? raw.smooth : !!lowMemory,
      };
    }
  } catch {
    /* no saved look */
  }
  return { preset: "off", params: { ...NEUTRAL }, smooth: !!lowMemory };
}

let state = load();
const listeners = new Set();

function set(next) {
  state = Object.freeze(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: the look still applies this visit */
  }
  for (const fn of listeners) fn();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const getSnapshot = () => state;
export const isLookActive = (s = state) => s.preset !== "off";

export function setLookPreset(id) {
  if (!LOOK_IDS.includes(id)) return;
  const p = LOOK_PRESETS[id];
  const params = id === "off" ? { ...state.params } : Object.fromEntries(Object.keys(NEUTRAL).map((k) => [k, p[k]]));
  set({ ...state, preset: id, params });
}

// a slider move: the look becomes "custom" (still active)
export function setLookParam(key, value) {
  if (!(key in LOOK_RANGES) || !Number.isFinite(value)) return;
  const [lo, hi] = LOOK_RANGES[key];
  set({ ...state, preset: "custom", params: { ...state.params, [key]: Math.min(hi, Math.max(lo, value)) } });
}

export function setSmooth(on) {
  if (!!on === state.smooth) return;
  set({ ...state, smooth: !!on });
}

// warmth -1..1 -> an RGB tint (cool blue .. warm amber)
export const warmthTint = (w) => [1 + 0.12 * w, 1 + 0.02 * w, 1 - 0.14 * w];
