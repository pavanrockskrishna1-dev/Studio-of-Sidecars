// The stage's look. "studio" (default): the environment's backdrop photo and
// the studio lights. "night": the stage's own night set (NightStage.jsx) - a
// dark sky, a soil ground, moonlight - with no backdrop photo or HDRI.
let state = { look: "studio" };
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const getSnapshot = () => state;
export function setStageLook(look) {
  const next = look === "night" ? "night" : "studio";
  if (next === state.look) return;
  state = { look: next };
  for (const fn of listeners) fn();
}
