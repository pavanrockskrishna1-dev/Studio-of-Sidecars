/* Camera director: a Reel shot may carry its own camera path,
   shot.cam = { keys: [{ t, position: [x,y,z], target: [x,y,z] }] }, in the
   stage's world frame, t in seconds into the shot. When a shot has camera keys
   the camera follows them (eased from key to key) instead of the shot's move.
   Pure: no three.js, no DOM. */

export const MAX_CAM_KEYS = 8;
const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isVec = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);

export const hasCamKeys = (shot) => !!(shot && shot.cam && Array.isArray(shot.cam.keys) && shot.cam.keys.length > 0);

// A clean, time-sorted copy (null when nothing valid is left).
export function sanitizeCam(cam) {
  if (!cam || !Array.isArray(cam.keys)) return null;
  const keys = cam.keys
    .filter((k) => k && isNum(k.t) && k.t >= 0 && k.t <= 60 && isVec(k.position) && isVec(k.target))
    .map((k) => ({ t: Math.round(k.t * 30) / 30, position: k.position.map(Number), target: k.target.map(Number) }))
    .sort((a, b) => a.t - b.t)
    .slice(0, MAX_CAM_KEYS);
  return keys.length ? { keys } : null;
}

const smooth = (k) => k * k * (3 - 2 * k);
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// { position, target } at t seconds into the shot.
export function sampleCam(keys, t) {
  if (!keys.length) return null;
  if (t <= keys[0].t) return { position: keys[0].position, target: keys[0].target };
  const last = keys[keys.length - 1];
  if (t >= last.t) return { position: last.position, target: last.target };
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].t) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  const k = smooth((t - a.t) / Math.max(1e-6, b.t - a.t));
  return { position: lerp3(a.position, b.position, k), target: lerp3(a.target, b.target, k) };
}

/* ---- director moves: keys generated around a subject box ----
   box: { center: [x,y,z], size: [x,y,z] } (world). from: the current camera
   position, which sets the side the move is filmed from. Distances fit the
   subject in the Reel's 9:16 portrait frame (vertical field of view 45 deg). */

const VFOV = (45 * Math.PI) / 180;
const HFOV = 2 * Math.atan(Math.tan(VFOV / 2) * (9 / 16));

function fitDistance(size) {
  const h = size[1] / 2 / Math.tan(VFOV / 2);
  const w = Math.max(size[0], size[2]) / 2 / Math.tan(HFOV / 2);
  return Math.max(h, w, 0.4) * 1.1;
}

// unit direction from the subject toward `from`, flattened, at `elevDeg`
function sideDir(center, from, elevDeg) {
  let dx = from ? from[0] - center[0] : 0;
  let dz = from ? from[2] - center[2] : 1;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  const e = (elevDeg * Math.PI) / 180;
  return [dx * Math.cos(e), Math.sin(e), dz * Math.cos(e)];
}
const along = (c, d, dist) => [c[0] + d[0] * dist, c[1] + d[1] * dist, c[2] + d[2] * dist];
const rotY = (d, deg) => {
  const a = (deg * Math.PI) / 180;
  return [d[0] * Math.cos(a) + d[2] * Math.sin(a), d[1], -d[0] * Math.sin(a) + d[2] * Math.cos(a)];
};

export const DIRECTOR_MOVES = Object.freeze({
  closeup: "Close-up push-in",
  orbit: "Orbit around it",
  hero: "Low hero reveal",
  flythrough: "Fly-through",
});

export function directorKeys(move, box, from, durationS) {
  const c = box.center;
  const fit = fitDistance(box.size);
  const T = durationS;
  if (move === "closeup") {
    const d = sideDir(c, from, 14);
    return [
      { t: 0, position: along(c, d, fit * 1.7), target: c },
      { t: T, position: along(c, d, fit * 0.85), target: c },
    ];
  }
  if (move === "orbit") {
    const d = sideDir(c, from, 18);
    return [-60, -20, 20, 60].map((deg, i) => ({ t: (T * i) / 3, position: along(c, rotY(d, deg), fit * 1.25), target: c }));
  }
  if (move === "hero") {
    const d = sideDir(c, from, 4);
    const low = [c[0], c[1] - box.size[1] * 0.35, c[2]];
    const p0 = along(c, d, fit * 0.9);
    p0[1] = c[1] - box.size[1] * 0.4;
    const p1 = along(c, d, fit * 1.5);
    p1[1] = c[1] + box.size[1] * 0.25;
    return [
      { t: 0, position: p0, target: low },
      { t: T, position: p1, target: c },
    ];
  }
  // fly-through: sweep in across the set from high and wide to low and close
  const d = sideDir(c, from, 25);
  const p0 = along(c, rotY(d, -55), fit * 2.2);
  const p1 = along(c, rotY(d, -15), fit * 1.4);
  p1[1] = c[1] + box.size[1] * 0.1;
  const p2 = along(c, rotY(d, 30), fit * 0.9);
  p2[1] = c[1] - box.size[1] * 0.15;
  return [
    { t: 0, position: p0, target: c },
    { t: T * 0.5, position: p1, target: c },
    { t: T, position: p2, target: c },
  ];
}
