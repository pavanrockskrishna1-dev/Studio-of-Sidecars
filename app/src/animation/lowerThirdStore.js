// app/src/animation/lowerThirdStore.js
let state = {
  enabled: true,
  title: "BBQ Bike",
  subtitle: "Street Food. Reimagined.",
};
const listeners = new Set();
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSnapshot = () => state;
function notify() { for (const fn of listeners) fn(); }
export function setEnabled(v) {
  if (state.enabled === v) return;
  state = { ...state, enabled: v };
  notify();
}
export function setContent(title, subtitle) {
  state = { ...state, title, subtitle };
  notify();
}
