// app/src/fx/gradeStore.js
let state = { gradeId: "raw" };
const listeners = new Set();
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getSnapshot = () => state;
export function setGrade(id) {
  if (id === state.gradeId) return;
  state = { gradeId: id };
  for (const fn of listeners) fn();
}