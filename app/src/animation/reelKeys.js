/* Slice C3a - keyframes for whole objects in Reel shots (pure: no three.js,
   no DOM, no React).
   ---------------------------------------------------------------------------
   A key is { t, target, assetId, transform, easing }:
     t          seconds into its shot, on a whole frame at 30 fps
     target     "product" (the main product, posed by the whole-model Transform
                panel values) or a Garage item id of an added object
     assetId    the product id (product keys) or the object's asset id; a key
                whose target is not in the scene with that asset is kept but
                ignored (isKeyLive)
     transform  { x, y, z, rx, ry, rz, s }: the same fields as the Transform
                panel and a Garage item (degrees, Euler XYZ, uniform scale)
     easing     the segment from this key to the next key of the SAME target:
                smooth | linear | in | out | hold
   A shot holds at most MAX_KEYS_PER_SHOT keys in total (all targets). Before a
   target's first key it holds that key, after its last key it holds that key.
   Position and scale move linearly through the eased progress; rotation is a
   quaternion slerp.

   Slice C3b adds:
     part keys  { ..., target: "parts:<id>|<id>...", parts: [part ids], pivot }:
                a group of the main product's parts moved RELATIVE to its rest
                pose about a pivot (partKeys.js); assetId is the product id
     "custom"   easing with bezier: [x1, y1, x2, y2] (a CSS-style cubic Bezier,
                solved with the code ported from MotionLab, below); x1 and x2
                are clamped to 0..1 so time always moves forward
   and the limit becomes 16 keys per shot in total (owner decision). */

import { smoothstep } from "./path.js";
import { PIVOT_IDS } from "./partKeys.js";

export const MAX_KEYS_PER_SHOT = 16;
export const KEY_FPS = 30;
export const PRODUCT_TARGET = "product";
export const KEY_EASINGS = Object.freeze(["smooth", "linear", "in", "out", "hold"]);
export const EASING_LABELS = Object.freeze({ smooth: "Smooth", linear: "Linear", in: "Ease in", out: "Ease out", hold: "Hold" });
const TRANSFORM_KEYS = ["x", "y", "z", "rx", "ry", "rz", "s"];
const MAX_KEY_TIME_S = 12; // the longest shot

const isNum = (n) => typeof n === "number" && Number.isFinite(n);

// t snapped to a whole frame and clamped to [0, durationS].
export function snapTime(t, durationS, fps = KEY_FPS) {
  if (!isNum(t)) return 0;
  const max = isNum(durationS) && durationS > 0 ? durationS : MAX_KEY_TIME_S;
  const f = Math.round(t * fps);
  return Math.min(Math.max(f, 0), Math.round(max * fps)) / fps;
}

export const frameOf = (t, fps = KEY_FPS) => Math.round(t * fps);

export function isTransform(tr) {
  return !!tr && TRANSFORM_KEYS.every((k) => isNum(tr[k])) && tr.s > 0;
}

/* ---- Slice C3b: part groups and the Custom curve ---- */

export const CUSTOM_EASING = "custom";
export const CUSTOM_LABEL = "Custom";
export const DEFAULT_BEZIER = Object.freeze([0.42, 0, 0.58, 1]);
export const BEZIER_Y_RANGE = Object.freeze([-0.5, 1.5]);
const MAX_GROUP_PARTS = 400;

// Handles clamped: time (x1, x2) to 0..1 so x(t) never runs backwards, and
// progress (y1, y2) to the graph's range.
export function clampBezier(b) {
  if (!Array.isArray(b) || b.length !== 4 || !b.every(isNum)) return [...DEFAULT_BEZIER];
  const cx = (v) => Math.min(1, Math.max(0, v));
  const cy = (v) => Math.min(BEZIER_Y_RANGE[1], Math.max(BEZIER_Y_RANGE[0], v));
  return [cx(b[0]), cy(b[1]), cx(b[2]), cy(b[3])];
}
const isBezier = (b) => Array.isArray(b) && b.length === 4 && b.every(isNum);

// The target id of a group of parts (order-independent).
export const partsTarget = (parts) => `parts:${[...parts].sort().join("|")}`;
export const isPartKey = (k) => !!k && Array.isArray(k.parts);

function isPartFields(k) {
  return (
    Array.isArray(k.parts) &&
    k.parts.length >= 1 &&
    k.parts.length <= MAX_GROUP_PARTS &&
    k.parts.every((id) => typeof id === "string" && id.length > 0 && id.length <= 200) &&
    new Set(k.parts).size === k.parts.length &&
    k.target === partsTarget(k.parts) &&
    PIVOT_IDS.includes(k.pivot)
  );
}

export function isKey(k) {
  return (
    !!k &&
    isNum(k.t) &&
    k.t >= 0 &&
    k.t <= MAX_KEY_TIME_S &&
    typeof k.target === "string" &&
    k.target.length > 0 &&
    (isPartKey(k) ? isPartFields(k) : k.target.length <= 64) &&
    typeof k.assetId === "string" &&
    k.assetId.length <= 200 &&
    isTransform(k.transform) &&
    (KEY_EASINGS.includes(k.easing) || (k.easing === CUSTOM_EASING && isBezier(k.bezier)))
  );
}

const cleanKey = (k) =>
  Object.freeze({
    t: snapTime(k.t, MAX_KEY_TIME_S),
    target: k.target,
    assetId: k.assetId,
    ...(isPartKey(k) ? { parts: Object.freeze([...k.parts].sort()), pivot: k.pivot } : {}),
    transform: Object.freeze(Object.fromEntries(TRANSFORM_KEYS.map((n) => [n, k.transform[n]]))),
    easing: k.easing,
    ...(k.easing === CUSTOM_EASING ? { bezier: Object.freeze(clampBezier(k.bezier)) } : {}),
  });

const byTime = (a, b) => a.t - b.t || (a.target < b.target ? -1 : a.target > b.target ? 1 : 0);
const done = (keys) => ({ keys: Object.freeze([...keys].sort(byTime)), ok: true, reason: "" });
const refuse = (keys, reason) => ({ keys, ok: false, reason });

// Adds a key (t snapped to a frame inside the shot). A key for the same target
// on the same frame is replaced (its easing kept unless one is given), so it
// does not count twice toward the limit.
export function addKey(keys, key, durationS) {
  const list = Array.isArray(keys) ? keys : [];
  const k = { ...key, easing: key?.easing ?? "smooth", t: snapTime(key?.t, durationS) };
  if (isPartKey(k)) k.target = partsTarget(k.parts);
  if (!isKey(k)) return refuse(list, "That key is not valid.");
  const at = list.findIndex((o) => o.target === k.target && frameOf(o.t) === frameOf(k.t));
  if (at >= 0) {
    const easing = key.easing ?? list[at].easing;
    const bezier = key.easing ? key.bezier : list[at].bezier;
    return done(list.map((o, i) => (i === at ? cleanKey({ ...k, easing, bezier }) : o)));
  }
  if (list.length >= MAX_KEYS_PER_SHOT) return refuse(list, `A shot can have at most ${MAX_KEYS_PER_SHOT} keys.`);
  return done([...list, cleanKey(k)]);
}

export const canAddKey = (keys, target, t) =>
  (keys || []).length < MAX_KEYS_PER_SHOT || (keys || []).some((o) => o.target === target && frameOf(o.t) === frameOf(t))
    ? { ok: true, reason: "" }
    : { ok: false, reason: `A shot can have at most ${MAX_KEYS_PER_SHOT} keys.` };

export function deleteKey(keys, i) {
  const list = Array.isArray(keys) ? keys : [];
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return refuse(list, "No such key.");
  return done(list.filter((_, n) => n !== i));
}

export function setKeyEasing(keys, i, easing) {
  const list = Array.isArray(keys) ? keys : [];
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return refuse(list, "No such key.");
  if (easing === CUSTOM_EASING) return setKeyCurve(list, i, list[i].bezier ?? DEFAULT_BEZIER);
  if (!KEY_EASINGS.includes(easing)) return refuse(list, "Unknown easing.");
  return done(list.map((o, n) => (n === i ? cleanKey({ ...o, easing, bezier: undefined }) : o)));
}

// Slice C3b: the Custom easing with its (clamped) Bezier handles.
export function setKeyCurve(keys, i, bezier) {
  const list = Array.isArray(keys) ? keys : [];
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return refuse(list, "No such key.");
  if (!isBezier(bezier)) return refuse(list, "Bad curve.");
  return done(list.map((o, n) => (n === i ? cleanKey({ ...o, easing: CUSTOM_EASING, bezier: clampBezier(bezier) }) : o)));
}

// Slice C3b: one pivot for every key of a part group in this shot.
export function setKeyPivot(keys, target, pivot) {
  const list = Array.isArray(keys) ? keys : [];
  if (!PIVOT_IDS.includes(pivot)) return refuse(list, "Unknown pivot.");
  if (!list.some((o) => o.target === target && isPartKey(o))) return refuse(list, "No such part group.");
  return done(list.map((o) => (o.target === target && isPartKey(o) ? cleanKey({ ...o, pivot }) : o)));
}

// The UI's easing chip: the 5 presets, then Custom.
export const nextEasingWithCustom = (easing) =>
  easing === "hold" ? CUSTOM_EASING : easing === CUSTOM_EASING ? "smooth" : KEY_EASINGS[(KEY_EASINGS.indexOf(easing) + 1) % KEY_EASINGS.length];
export const easingLabel = (easing) => (easing === CUSTOM_EASING ? CUSTOM_LABEL : EASING_LABELS[easing]);

// Slice C3a: a shot with main-product keys is framed (start views, platform
// anchor, safe area) on the keyed product pose at its first frame ("start") or
// its last exported frame ("end", the default). The time in the shot:
export const FRAME_ON = Object.freeze(["start", "end"]);
export const frameTimeOf = (durationS, frameOn) =>
  frameOn === "start" ? 0 : (Math.max(1, Math.round((isNum(durationS) ? durationS : 0) * KEY_FPS)) - 1) / KEY_FPS;

export const nextEasing = (easing) => KEY_EASINGS[(KEY_EASINGS.indexOf(easing) + 1) % KEY_EASINGS.length];

// The saved form: valid keys only, at most MAX_KEYS_PER_SHOT, one per target
// and frame; null when nothing usable is there.
export function sanitizeKeys(raw) {
  if (!Array.isArray(raw)) return null;
  let out = [];
  for (const k of raw) {
    if (!isKey(k)) continue;
    const r = addKey(out, k, MAX_KEY_TIME_S);
    if (r.ok) out = r.keys;
  }
  return out.length ? out : null;
}

export const keysToSession = (keys) =>
  keys.map((k) => ({
    t: k.t,
    target: k.target,
    assetId: k.assetId,
    ...(isPartKey(k) ? { parts: [...k.parts], pivot: k.pivot } : {}),
    transform: { ...k.transform },
    easing: k.easing,
    ...(k.easing === CUSTOM_EASING ? { bezier: [...k.bezier] } : {}),
  }));

/* ---- which keys can play ---- */

// scene = { productId, items: [{ itemId, assetId }] } (the added objects now in
// the scene). A product key needs the same product; an object key needs an
// added object with the same item id AND asset id.
// Slice C3b: a part key needs the same product and every one of its parts
// (scene.hasPart(id), from the stage's part index).
export function isKeyLive(key, scene) {
  if (!key || !scene) return false;
  if (key.target === PRODUCT_TARGET) return key.assetId === scene.productId;
  if (isPartKey(key)) return key.assetId === scene.productId && typeof scene.hasPart === "function" && key.parts.every((id) => scene.hasPart(id));
  return (scene.items || []).some((it) => it.itemId === key.target && it.assetId === key.assetId);
}

// { [target]: keys sorted by time } for the given keys.
export function keysByTarget(keys) {
  const out = {};
  for (const k of keys || []) (out[k.target] ||= []).push(k);
  for (const t of Object.keys(out)) out[t].sort((a, b) => a.t - b.t);
  return out;
}

/* ---- easing ---- */

// ported from MotionLab v0.19.0 curves-core.js (compileCurveEase and the
// "Custom Bezier" branch of curveProgress): a CSS-style cubic Bezier, solving
// x(t) = u with a bounded Newton / bisection hybrid, then returning y(t).
function compileBezier(x1, y1, x2, y2) {
  return { ax: 1 + 3 * x1 - 3 * x2, bx: 3 * x2 - 6 * x1, cx: 3 * x1, ay: 1 + 3 * y1 - 3 * y2, by: 3 * y2 - 6 * y1, cy: 3 * y1 };
}
function bezierProgress(c, u) {
  if (u <= 0 || u >= 1) return u;
  let t = u;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const x = ((c.ax * t + c.bx) * t + c.cx) * t;
    const err = x - u;
    if (Math.abs(err) < 1e-12) break;
    if (err < 0) lo = t;
    else hi = t;
    const derivative = (3 * c.ax * t + 2 * c.bx) * t + c.cx;
    const next = derivative > 1e-9 ? t - err / derivative : NaN;
    t = next > lo && next < hi ? next : (lo + hi) / 2;
  }
  return ((c.ay * t + c.by) * t + c.cy) * t;
}
// the standard CSS ease-in / ease-out handles
const EASE_IN = compileBezier(0.42, 0, 1, 1);
const EASE_OUT = compileBezier(0, 0, 0.58, 1);

// Eased progress for u in [0, 1]. Hold stays at 0 until the next key. Custom
// (Slice C3b) follows the key's clamped Bezier handles.
export function easeProgress(easing, u, bezier) {
  const v = Math.max(0, Math.min(1, isNum(u) ? u : 0));
  if (easing === "hold") return v >= 1 ? 1 : 0;
  if (easing === CUSTOM_EASING) return bezierProgress(compileBezier(...clampBezier(bezier)), v);
  if (easing === "linear") return v;
  if (easing === "in") return bezierProgress(EASE_IN, v);
  if (easing === "out") return bezierProgress(EASE_OUT, v);
  return smoothstep(v); // smooth: MotionLab's "Smooth" curve (path.js)
}

/* ---- rotation ---- */

const RAD = Math.PI / 180;

// [x, y, z, w] for Euler angles in degrees, order XYZ (the order the Transform
// panel and Garage objects use; the same formula as three's setFromEuler).
export function eulerDegToQuat(rx, ry, rz) {
  const c1 = Math.cos((rx * RAD) / 2);
  const c2 = Math.cos((ry * RAD) / 2);
  const c3 = Math.cos((rz * RAD) / 2);
  const s1 = Math.sin((rx * RAD) / 2);
  const s2 = Math.sin((ry * RAD) / 2);
  const s3 = Math.sin((rz * RAD) / 2);
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}

// Spherical interpolation between unit quaternions a and b (shortest path).
export function slerp(a, b, u) {
  let [bx, by, bz, bw] = b;
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  let k0;
  let k1;
  if (cos > 0.9999995) {
    k0 = 1 - u;
    k1 = u;
  } else {
    const th = Math.acos(Math.min(1, cos));
    const s = Math.sin(th);
    k0 = Math.sin((1 - u) * th) / s;
    k1 = Math.sin(u * th) / s;
  }
  const q = [a[0] * k0 + bx * k1, a[1] * k0 + by * k1, a[2] * k0 + bz * k1, a[3] * k0 + bw * k1];
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return q.map((v) => v / n);
}

/* ---- sampling ---- */

export const poseOfKey = (k) => ({
  position: [k.transform.x, k.transform.y, k.transform.z],
  quaternion: eulerDegToQuat(k.transform.rx, k.transform.ry, k.transform.rz),
  scale: [k.transform.s, k.transform.s, k.transform.s],
});

// The pose of ONE target at shot time t from its keys (sorted by time), or
// null when there are none: { position:[3], quaternion:[4], scale:[3] }.
export function sampleKeys(keys, t) {
  if (!Array.isArray(keys) || keys.length === 0) return null;
  const tt = isNum(t) ? t : 0;
  if (tt <= keys[0].t) return poseOfKey(keys[0]);
  const last = keys[keys.length - 1];
  if (tt >= last.t) return poseOfKey(last);
  let i = 0;
  while (tt >= keys[i + 1].t) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  const e = easeProgress(a.easing, (tt - a.t) / (b.t - a.t), a.bezier);
  const pa = poseOfKey(a);
  const pb = poseOfKey(b);
  const lerp = (x, y) => x + (y - x) * e;
  return {
    position: pa.position.map((v, j) => lerp(v, pb.position[j])),
    quaternion: slerp(pa.quaternion, pb.quaternion, e),
    scale: pa.scale.map((v, j) => lerp(v, pb.scale[j])),
  };
}
