let reelTime = null;
const registry = new Set();

export function registerFx(fn) {
  registry.add(fn);
  return () => {
    registry.delete(fn);
  };
}

export function tickFx(t) {
  for (const fn of registry) {
    try {
      fn(t);
    } catch (err) {
      console.error("Error ticking fx:", err);
    }
  }
}

export function setReelTime(t) {
  reelTime = t;
}

export function getReelTime() {
  return reelTime;
}
