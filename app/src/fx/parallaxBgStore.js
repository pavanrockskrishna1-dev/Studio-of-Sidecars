// Active parallax environment id, or null (off).
let state = { env: null };
const listeners = new Set();

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const getSnapshot = () => state;

export function setEnv(id) {
  if (state.env === id) return;
  state = { env: id };
  for (const fn of listeners) fn();
}
export const clearEnv = () => setEnv(null);
