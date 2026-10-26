// Lights placed in the 3D scene (Garage → Lights): point, spot and area
// lights the owner drags into position with the gizmo, same as a placed prop
// or effect. Each is { id, type, color, intensity, x, y, z }. They sit beside
// the studio's own fixed lighting (StudioCanvas's ambient/directional rig)
// but are toggled, moved and removed independently of it.

export const LIGHT_TYPES = Object.freeze({
  point: { label: "Point", hint: "omnidirectional glow", color: "#ffffff" },
  spot: { label: "Spot", hint: "a cone of light, pointing down", color: "#ffcc66" },
  area: { label: "Area", hint: "a soft rectangle of fill light", color: "#aaddff" },
});
export const MAX_LIGHTS = 5;
const DEFAULT_INTENSITY = 1;

let state = { lights: [] };
let nextId = 1;
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const getSnapshot = () => state;
function set(lights) {
  state = { lights };
  for (const fn of listeners) fn();
}

const clampIntensity = (n) => Math.min(5, Math.max(0.1, Number.isFinite(n) ? n : DEFAULT_INTENSITY));

export function addLight(type) {
  if (!LIGHT_TYPES[type]) return { ok: false, message: "Unknown light." };
  if (state.lights.length >= MAX_LIGHTS) return { ok: false, message: `At most ${MAX_LIGHTS} lights. Remove one first.` };
  const l = {
    id: `lt${nextId++}`,
    type,
    color: LIGHT_TYPES[type].color,
    intensity: DEFAULT_INTENSITY,
    x: 0,
    y: 2,
    z: 0,
  };
  set([...state.lights, l]);
  return { ok: true, message: `Added "${LIGHT_TYPES[type].label}".` };
}
export const removeLight = (id) => set(state.lights.filter((l) => l.id !== id));
export const setLightColor = (id, color) => set(state.lights.map((l) => (l.id === id ? { ...l, color } : l)));
export const setLightIntensity = (id, intensity) =>
  set(state.lights.map((l) => (l.id === id ? { ...l, intensity: clampIntensity(intensity) } : l)));
export const setLightPosition = (id, x, y, z) => set(state.lights.map((l) => (l.id === id ? { ...l, x, y, z } : l)));
export const clearLights = () => set([]);

// projects: the placed lights as plain data, and back (bad entries dropped)
export const lightsForSession = () =>
  state.lights.map(({ type, color, intensity, x, y, z }) => ({ type, color, intensity, x, y, z }));
export function loadLights(list) {
  if (!Array.isArray(list)) return;
  const num = (v) => typeof v === "number" && Number.isFinite(v);
  set(
    list
      .filter((l) => l && LIGHT_TYPES[l.type] && typeof l.color === "string" && num(l.x) && num(l.y) && num(l.z))
      .slice(0, MAX_LIGHTS)
      .map((l) => ({
        id: `lt${nextId++}`,
        type: l.type,
        color: l.color,
        intensity: clampIntensity(Number(l.intensity)),
        x: l.x,
        y: l.y,
        z: l.z,
      }))
  );
}
