let current = null;
const listeners = new Set();

// Setting the shot tells every listener at once (synchronously), so effects
// show/hide in the same call, in the live preview and during export, where the
// render loop is stopped and no useFrame runs.
export const setCurrentShot = (index) => {
  if (index === current) return;
  current = index;
  for (const fn of listeners) fn(index);
};

export const getCurrentShot = () => current;

export const subscribeShot = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const isVisibleInShot = (effectShots, currentShot) => {
  if (currentShot === null) return true;
  if (!effectShots || effectShots.length === 0) return true;
  return effectShots.includes(currentShot);
};
