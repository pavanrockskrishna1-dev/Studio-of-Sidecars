// Effects placed in the 3D scene (Garage → Effects): fog, embers, leaves,
// bats, smoke, sparks, fireflies, ghost lights, snow, rain, confetti, dust,
// colour powder, hearts, tricolour confetti, snow ground. Each is { id, type, position: [x,y,z]
// (world, on the ground), size (1 = default) }. They live in the scene, so the
// live view, the Reel preview and the export all show them.

export const EFFECT_TYPES = Object.freeze({
  fog: { label: "Fog patch", hint: "low drifting mist" },
  embers: { label: "Ember burst", hint: "sparks rising from a point" },
  leaves: { label: "Falling leaves", hint: "autumn leaves drifting down" },
  bats: { label: "Bat swarm", hint: "bats circling overhead" },
  smoke: { label: "Grill smoke", hint: "soft smoke rising and spreading" },
  sparks: { label: "Spark fountain", hint: "hot sparks shooting up and falling" },
  fireflies: { label: "Fireflies", hint: "glowing bugs blinking in the dark" },
  wisps: { label: "Ghost lights", hint: "spooky blue spirit lights floating" },
  snow: { label: "Snowfall", hint: "snow drifting down" },
  rain: { label: "Rain", hint: "rain falling" },
  confetti: { label: "Confetti", hint: "colourful party confetti" },
  dust: { label: "Magic dust", hint: "golden sparkles swirling up" },
  powder: { label: "Colour powder", hint: "Holi powder bursting into a colour cloud" },
  hearts: { label: "Floating hearts", hint: "soft hearts drifting up" },
  tricolor: { label: "Tricolour confetti", hint: "saffron, white and green confetti" },
  snowground: { label: "Snow ground", hint: "a blanket of snow on the ground" },
  flame: { label: "Flame", hint: "hot orange flame rising from a point" },
  steam: { label: "Steam", hint: "thin wisps of steam drifting upward" },
  petals: { label: "Cherry petals", hint: "pink blossom petals drifting down" },
  stars: { label: "Night stars", hint: "twinkling stars overhead" },
  lanterns: { label: "Sky lanterns", hint: "warm glowing lanterns floating up" },
});
export const MAX_EFFECTS = 20;

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
