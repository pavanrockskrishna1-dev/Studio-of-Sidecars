/* Camera Studio (Phase 16A) — the Distance / Height sliders' state hub.
   ---------------------------------------------------------------------------
   The live three.js camera and the OrbitControls target are the ONLY source of
   truth. This module keeps nothing but a read-only snapshot recomputed from
   them (distance % and height % against the frozen baseline of the last applied
   view) plus the module-level apiRef the stage registers its commands in. Only
   the stage writes the snapshot (publish / reset); the Inspector Rail reads it
   with useSyncExternalStore (same pattern as materials/store.js) and moves the
   camera by calling setDistancePct / setHeightPct, which go through the stage.

   Distance % is |camera - target| / dist0 (dist0 = baseline distance).
   Height % is an elevation tilt at CONSTANT distance around the target, mapped
   piecewise so 0% is exactly the baseline elevation elev0:
     h > 0: phi = elev0 + h * (phiHi - elev0)      phiHi = max(75deg, elev0)
     h < 0: phi = elev0 + h * (elev0 - phiLo)      phiLo = min(-30deg, elev0)
   Known limit: from the Top preset (elev0 ~ 90deg) the "up" half has no room
   above the camera, so positive Height is a silent no-op there.

   Lock focus (Slice B): the snapshot also mirrors App's lock flag, read-only.

   The math helpers are pure (plain arrays / numbers, radians) and need no
   three.js. */

export const DISTANCE_MIN = 50;
export const DISTANCE_MAX = 200;
export const HEIGHT_MIN = -100;
export const HEIGHT_MAX = 100;

const DEG = Math.PI / 180;
const PHI_LO = -30 * DEG;
const PHI_HI = 75 * DEG;
const PHI_LIMIT = 89 * DEG;
const POLE_EPS = 1e-6;

const bounds = (elev0) => ({
  lo: Math.min(PHI_LO, elev0),
  hi: Math.max(PHI_HI, elev0),
});

// Camera offset from the target as { r, theta, phi } (theta = atan2(x, z),
// phi = elevation). r === 0 yields phi 0 instead of dividing by zero.
export function toSpherical(position, target) {
  const vx = position[0] - target[0];
  const vy = position[1] - target[1];
  const vz = position[2] - target[2];
  const r = Math.hypot(vx, vy, vz);
  return {
    r,
    theta: Math.atan2(vx, vz),
    phi: r > 0 ? Math.asin(Math.max(-1, Math.min(1, vy / r))) : 0,
    flat: Math.hypot(vx, vz),
  };
}

// Inverse of the Height mapping, clamped to [-1, 1].
export function heightFromPhi(phi, elev0) {
  const { lo, hi } = bounds(elev0);
  let h = 0;
  if (phi > elev0) h = hi > elev0 ? (phi - elev0) / (hi - elev0) : 0;
  else if (phi < elev0) h = elev0 > lo ? (phi - elev0) / (elev0 - lo) : 0;
  return Math.max(-1, Math.min(1, h));
}

// Height mapping. h in [-1, 1]. The clamp is +/-89deg, widened to include
// elev0 itself so that 0% always reproduces the baseline (Top preset).
export function phiFromHeight(h, elev0) {
  const { lo, hi } = bounds(elev0);
  const k = Math.max(-1, Math.min(1, h));
  const phi = k > 0 ? elev0 + k * (hi - elev0) : elev0 + k * (elev0 - lo);
  return Math.max(Math.min(-PHI_LIMIT, elev0), Math.min(Math.max(PHI_LIMIT, elev0), phi));
}

// { distancePct, heightPct } (rounded integers) of a camera against a baseline.
export function readMetrics(position, target, baseline) {
  const { r, phi } = toSpherical(position, target);
  return {
    distancePct: baseline.dist0 > 0 ? Math.round((r / baseline.dist0) * 100) : 100,
    heightPct: Math.round(heightFromPhi(phi, baseline.elev0) * 100),
  };
}

// Camera position at distance r from the target, same direction.
export function positionForDistance(position, target, r) {
  const { r: r0 } = toSpherical(position, target);
  if (r0 === 0) return null;
  const k = r / r0;
  return [
    target[0] + (position[0] - target[0]) * k,
    target[1] + (position[1] - target[1]) * k,
    target[2] + (position[2] - target[2]) * k,
  ];
}

// Camera position tilted to the elevation for Height h at constant distance.
// azimuth is used when the camera sits on the pole (no horizontal direction).
export function positionForHeight(position, target, elev0, h, azimuth = 0) {
  const s = toSpherical(position, target);
  if (s.r === 0) return null;
  const theta = s.flat > POLE_EPS * s.r ? s.theta : azimuth;
  const phi = phiFromHeight(h, elev0);
  return [
    target[0] + s.r * Math.cos(phi) * Math.sin(theta),
    target[1] + s.r * Math.sin(phi),
    target[2] + s.r * Math.cos(phi) * Math.cos(theta),
  ];
}

/* ---- store ---------------------------------------------------------------- */

const IDLE = Object.freeze({
  distancePct: 100,
  heightPct: 0,
  live: false,
  lock: true,
  ready: false,
});
let snapshot = IDLE;
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSnapshot = () => snapshot;

function replace(next) {
  if (
    next.distancePct === snapshot.distancePct &&
    next.heightPct === snapshot.heightPct &&
    next.live === snapshot.live &&
    next.lock === snapshot.lock &&
    next.ready === snapshot.ready
  ) {
    return;
  }
  snapshot = Object.freeze(next);
  for (const fn of listeners) fn();
}

// Stage only: replaces the snapshot ONLY if a displayed value changed, so
// azimuth-only orbiting never causes a subscriber render.
export function publish({ distancePct, heightPct, live, lock }) {
  replace({ distancePct, heightPct, live, lock, ready: true });
}

// Stage only: the stage went away (unmount / product switch).
export function reset() {
  replace(IDLE);
}

// The stage registers { readView, resetView, setDistancePct, setHeightPct,
// setLock } here; App hands this ref to StudioCanvas as cameraApiRef.
export const apiRef = { current: null };

// Null-safe commands: false when no stage is registered (Suspense, product
// switch) or the value is not a number; otherwise the stage's own result.
export function setDistancePct(pct) {
  const api = apiRef.current;
  if (!api || !api.setDistancePct || !Number.isFinite(pct)) return false;
  return api.setDistancePct(Math.max(DISTANCE_MIN, Math.min(DISTANCE_MAX, pct)));
}

export function setHeightPct(pct) {
  const api = apiRef.current;
  if (!api || !api.setHeightPct || !Number.isFinite(pct)) return false;
  return api.setHeightPct(Math.max(HEIGHT_MIN, Math.min(HEIGHT_MAX, pct)));
}

// Lock focus (Slice B). The lock itself lives in App; the stage retargets the
// controls when it is turned ON and then reports the new value to App.
export function setLock(next) {
  const api = apiRef.current;
  if (!api || !api.setLock || typeof next !== "boolean") return false;
  return api.setLock(next);
}
