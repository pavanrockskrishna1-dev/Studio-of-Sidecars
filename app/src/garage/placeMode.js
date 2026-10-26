// Garage prop shelf: "click the ground to place". While assetId is set, the
// next click on the stage drops that prop where the ground was clicked.
let state = { assetId: null, message: "" };
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const getSnapshot = () => state;
function set(next) {
  state = next;
  for (const fn of listeners) fn();
}
export const startPlacing = (assetId) => set({ assetId, message: "" });
export const stopPlacing = (message = "") => set({ assetId: null, message });
