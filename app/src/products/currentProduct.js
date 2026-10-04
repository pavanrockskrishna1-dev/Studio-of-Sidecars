/* Slice C2c — the id of the product on the stage, for UI that sits outside
   App's prop tree (the Reel sheet, the Framing chips) and needs the product's
   camera preset display labels (registry.presetLabel). App writes it whenever
   its productId changes; readers use useSyncExternalStore. It holds an id
   only, never the product or any camera state. */

let current = "coffee-bike";
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSnapshot = () => current;

// App only.
export function setCurrentProductId(id) {
  if (typeof id !== "string" || id === current) return;
  current = id;
  for (const fn of listeners) fn();
}
