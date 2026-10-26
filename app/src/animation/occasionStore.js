// occasionStore.js — singleton for the active occasion pack
let state = { occasionId: 'none' };
const listeners = new Set();

export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSnapshot = () => state;

function notify() { for (const fn of listeners) fn(); }

export function setOccasion(id) {
  if (id === state.occasionId) return;
  state = { occasionId: id };
  notify();
}
