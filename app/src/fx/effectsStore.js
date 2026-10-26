// Effects placed in the 3D scene (Garage → Effects): fog patches, ember
// bursts, falling leaves, bat swarms. Each is { id, type, position: [x,y,z]
// (world, on the ground), size (1 = default) }. They live in the scene, so the
// live view, the Reel preview and the export all show them.

export const EFFECT_TYPES = Object.freeze({
  fog: { label: "Fog patch", hint: "low drifting mist" },
  embers: { label: "Ember burst", hint: "sparks rising from a point" },
  leaves: { label: "Falling leaves", hint: "autumn leaves drifting down" },
  bats: { label: "Bat swarm", hint: "bats circling overhead" },
});
export const MAX_EFFECTS = 12;

let state = { effects: [] };
let nextId = 1;
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const getSnapshot = () => state;
function set(effects) {
  state = { effects };
  for (const fn of listeners) fn();
}

export function addEffect(type, position) {
  if (!EFFECT_TYPES[type]) return { ok: false, message: "Unknown effect." };
  if (state.effects.length >= MAX_EFFECTS) return { ok: false, message: `At most ${MAX_EFFECTS} effects. Remove one first.` };
  const e = { id: `fx${nextId++}`, type, position: position.slice(0, 3), size: 1 };
  set([...state.effects, e]);
  return { ok: true, message: `Added "${EFFECT_TYPES[type].label}".` };
}
export const removeEffect = (id) => set(state.effects.filter((e) => e.id !== id));
export const setEffectSize = (id, size) =>
  set(state.effects.map((e) => (e.id === id ? { ...e, size: Math.min(4, Math.max(0.25, size)) } : e)));
export const clearEffects = () => set([]);

// projects: the placed effects as plain data, and back (bad entries dropped)
export const effectsForSession = () => state.effects.map(({ type, position, size }) => ({ type, position: [...position], size }));
export function loadEffects(list) {
  if (!Array.isArray(list)) return;
  const ok = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));
  set(
    list
      .filter((e) => e && EFFECT_TYPES[e.type] && ok(e.position))
      .slice(0, MAX_EFFECTS)
      .map((e) => ({ id: `fx${nextId++}`, type: e.type, position: e.position.slice(0, 3), size: Math.min(4, Math.max(0.25, Number(e.size) || 1)) }))
  );
}
