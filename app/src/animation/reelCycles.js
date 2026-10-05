/* Slice C4a - cycles: looping motions on part groups or whole objects in Reel
   shots (pure: no three.js, no DOM, no React).
   ---------------------------------------------------------------------------
   A cycle runs for its whole shot, starting at phase 0 at the shot's first
   frame. It is { type, target, assetId, ...target fields, ...type fields }:
     target   "product" (the main product), a Garage item id (an added object),
              "parts:<id>|<id>..." with parts: [part ids] (the C3b part group),
              or "group:<path>" with group: <path> (Slice C4a owner decision: a
              selected part's named parent group, e.g. the 220 meshes under
              Sidecar_wheel__axle_pivot, which the Garage cannot select one by one)
     assetId  the product id (product, parts, group) or the object's asset id
     spin     rpm (turns per minute, + = right-handed about the axis), axis, and
              roll: true = "Roll with movement" (parts / groups only): the angle
              is the distance the main product travels along its keyed path
              (this shot's product keys) divided by the wheel radius (half the
              group box's larger side across the axis), signed so the wheel rolls
              the way it travels; rpm is then ignored
     bob      amplitude (m) and period (s): a move along up, A sin(2 pi t / P)
     sway     angle (deg) and period (s): a rotation A sin(2 pi t / P) about the
              axis through the pivot (a C3b pivot: centre or an edge)
     pulse    scalePct and period (s): a uniform scale 1 + pct/100 sin(2 pi t / P)
              about the box centre
   axis (spin, sway): "auto" (spin: the box's thinnest side, a wheel's axle;
   sway: the pivot edge's own direction, or the thinnest side for the centre),
   "front-back", "left-right" or "up-down" (named from the product's front, as
   the C3b pivots are). Part and group cycles work in the model frame on the
   group's rest box; whole-object cycles in the object node's own frame on its
   rest box. A shot holds at most MAX_CYCLES_PER_SHOT cycles. Cycles apply on
   top of the shot camera, the whole-object keys and the part keys. */

import { matFromTRS, matMul } from "../garage/compose.js";
import { frontAxes, pivotPoint, PIVOT_IDS } from "./partKeys.js";
import { isPartKey, partsTarget, PRODUCT_TARGET, sampleKeys } from "./reelKeys.js";

export const MAX_CYCLES_PER_SHOT = 6;
export const CYCLE_TYPES = Object.freeze(["spin", "bob", "sway", "pulse"]);
export const CYCLE_LABELS = Object.freeze({ spin: "Spin", bob: "Bob", sway: "Sway", pulse: "Pulse" });
export const CYCLE_AXES = Object.freeze(["auto", "front-back", "left-right", "up-down"]);
export const AXIS_LABELS = Object.freeze({ auto: "Auto", "front-back": "Front-back", "left-right": "Left-right", "up-down": "Up-down" });
export const GROUP_PREFIX = "group:";
export const LIMIT_REASON = `A shot can have at most ${MAX_CYCLES_PER_SHOT} cycles.`;

// The value ranges (the UI clamps nothing: an out-of-range value is refused).
export const CYCLE_RANGES = Object.freeze({
  rpm: [-600, 600],
  amplitude: [0, 2],
  angle: [0, 180],
  scalePct: [0, 90],
  period: [0.1, 60],
});
export const CYCLE_DEFAULTS = Object.freeze({
  spin: Object.freeze({ rpm: 30, axis: "auto", roll: false }),
  bob: Object.freeze({ amplitude: 0.05, period: 2 }),
  sway: Object.freeze({ angle: 10, period: 2, pivot: "centre", axis: "auto" }),
  pulse: Object.freeze({ scalePct: 5, period: 1 }),
});
const TYPE_FIELDS = Object.freeze({ spin: ["rpm", "axis", "roll"], bob: ["amplitude", "period"], sway: ["angle", "period", "pivot", "axis"], pulse: ["scalePct", "period"] });
const MAX_GROUP_PARTS = 400;

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const inRange = (v, [lo, hi]) => isNum(v) && v >= lo && v <= hi;

export const groupTarget = (path) => `${GROUP_PREFIX}${path}`;
export const isGroupCycle = (c) => !!c && typeof c.group === "string";
export const isPartsCycle = (c) => isPartKey(c);
// The parent group path of a part id ("a~0/b~0/c~3" -> "a~0/b~0"), or "" at the model root.
export const parentPath = (partId) => (typeof partId === "string" && partId.includes("/") ? partId.slice(0, partId.lastIndexOf("/")) : "");
// The shared parent group of some part ids, or "" when they differ or sit at the root.
export function sharedParent(partIds) {
  if (!Array.isArray(partIds) || !partIds.length) return "";
  const p = parentPath(partIds[0]);
  return p && partIds.every((id) => parentPath(id) === p) ? p : "";
}
export const groupName = (path) => (typeof path === "string" ? path.slice(path.lastIndexOf("/") + 1).replace(/~\d+$/, "") : "");

function isTargetOk(c) {
  if (typeof c.target !== "string" || !c.target.length || typeof c.assetId !== "string" || c.assetId.length > 200) return false;
  if (isPartKey(c)) {
    return (
      c.parts.length >= 1 &&
      c.parts.length <= MAX_GROUP_PARTS &&
      c.parts.every((id) => typeof id === "string" && id.length > 0 && id.length <= 200) &&
      new Set(c.parts).size === c.parts.length &&
      c.target === partsTarget(c.parts)
    );
  }
  if (isGroupCycle(c)) return c.group.length > 0 && c.group.length <= 400 && c.target === groupTarget(c.group);
  return c.target.length <= 64 && !c.target.startsWith("parts:") && !c.target.startsWith(GROUP_PREFIX);
}

const onParts = (c) => isPartKey(c) || isGroupCycle(c);

export function isCycle(c) {
  if (!c || !CYCLE_TYPES.includes(c.type) || !isTargetOk(c)) return false;
  switch (c.type) {
    case "spin":
      return inRange(c.rpm, CYCLE_RANGES.rpm) && CYCLE_AXES.includes(c.axis) && typeof c.roll === "boolean" && (!c.roll || onParts(c));
    case "bob":
      return inRange(c.amplitude, CYCLE_RANGES.amplitude) && inRange(c.period, CYCLE_RANGES.period);
    case "sway":
      return inRange(c.angle, CYCLE_RANGES.angle) && inRange(c.period, CYCLE_RANGES.period) && PIVOT_IDS.includes(c.pivot) && CYCLE_AXES.includes(c.axis);
    default:
      return inRange(c.scalePct, CYCLE_RANGES.scalePct) && inRange(c.period, CYCLE_RANGES.period);
  }
}

const cleanCycle = (c) =>
  Object.freeze({
    type: c.type,
    target: c.target,
    assetId: c.assetId,
    ...(isPartKey(c) ? { parts: Object.freeze([...c.parts].sort()) } : {}),
    ...(isGroupCycle(c) ? { group: c.group } : {}),
    ...Object.fromEntries(TYPE_FIELDS[c.type].map((f) => [f, c[f]])),
  });

const done = (cycles) => ({ cycles: Object.freeze([...cycles]), ok: true, reason: "" });
const refuse = (cycles, reason) => ({ cycles, ok: false, reason });

export const canAddCycle = (cycles) =>
  (cycles || []).length < MAX_CYCLES_PER_SHOT ? { ok: true, reason: "" } : { ok: false, reason: LIMIT_REASON };

// Adds a cycle (missing type fields take the type's defaults). Targets may have
// several cycles (e.g. a wheel that spins and bobs); all count toward the limit.
export function addCycle(cycles, cycle) {
  const list = Array.isArray(cycles) ? cycles : [];
  const c = { ...(CYCLE_DEFAULTS[cycle?.type] || {}), ...cycle };
  if (isPartKey(c)) c.target = partsTarget(c.parts);
  if (isGroupCycle(c)) c.target = groupTarget(c.group);
  if (!isCycle(c)) return refuse(list, "That cycle is not valid.");
  if (list.length >= MAX_CYCLES_PER_SHOT) return refuse(list, LIMIT_REASON);
  return done([...list, cleanCycle(c)]);
}

export function deleteCycle(cycles, i) {
  const list = Array.isArray(cycles) ? cycles : [];
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return refuse(list, "No such cycle.");
  return done(list.filter((_, n) => n !== i));
}

// Changes the type fields of cycle i (the target and type stay).
export function setCycle(cycles, i, patch) {
  const list = Array.isArray(cycles) ? cycles : [];
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return refuse(list, "No such cycle.");
  const fields = TYPE_FIELDS[list[i].type];
  const next = { ...list[i] };
  for (const [f, v] of Object.entries(patch || {})) if (fields.includes(f)) next[f] = v;
  if (!isCycle(next)) return refuse(list, "That value is out of range.");
  return done(list.map((o, n) => (n === i ? cleanCycle(next) : o)));
}

// The saved form: valid cycles only, at most MAX_CYCLES_PER_SHOT; null when none.
export function sanitizeCycles(raw) {
  if (!Array.isArray(raw)) return null;
  let out = [];
  for (const c of raw) {
    if (!isCycle(c)) continue;
    const r = addCycle(out, c);
    if (r.ok) out = r.cycles;
  }
  return out.length ? out : null;
}

export const cyclesToSession = (cycles) =>
  cycles.map((c) => ({ ...c, ...(isPartKey(c) ? { parts: [...c.parts] } : {}) }));

// scene = { productId, items: [{ itemId, assetId }], hasPart(id), hasGroup(path) }.
export function isCycleLive(c, scene) {
  if (!c || !scene) return false;
  if (c.target === PRODUCT_TARGET) return c.assetId === scene.productId;
  if (isPartKey(c)) return c.assetId === scene.productId && typeof scene.hasPart === "function" && c.parts.every((id) => scene.hasPart(id));
  if (isGroupCycle(c)) return c.assetId === scene.productId && typeof scene.hasGroup === "function" && !!scene.hasGroup(c.group);
  return (scene.items || []).some((it) => it.itemId === c.target && it.assetId === c.assetId);
}

/* ---- timing ---- */

// ported from MotionLab v0.19.0 cycles-core.js (cycleParameters, the "loop"
// branch): the clock in periods plus the phase; lap = whole periods done,
// u = progress in the current period (0..1).
export function loopPhase(t, period, phase = 0) {
  const clock = Math.max(0, t) / period;
  const z = clock + phase;
  const lap = Math.floor(z);
  return { u: z - lap, lap };
}

const wave = (t, period) => Math.sin(2 * Math.PI * loopPhase(t, period).u);

// The cycle's value at shot time t (spin with roll needs rollAngleRad):
// spin -> angle (rad), bob -> offset (m), sway -> angle (rad), pulse -> scale.
export function cycleValue(c, t, rollAngleRad = 0) {
  const tt = isNum(t) ? Math.max(0, t) : 0;
  switch (c.type) {
    case "spin":
      return c.roll ? rollAngleRad : (2 * Math.PI * c.rpm * tt) / 60;
    case "bob":
      return c.amplitude * wave(tt, c.period);
    case "sway":
      return ((c.angle * Math.PI) / 180) * wave(tt, c.period);
    default:
      return 1 + (c.scalePct / 100) * wave(tt, c.period);
  }
}

/* ---- axes, pivots and the delta matrix ---- */

const size = (box) => [0, 1, 2].map((i) => box.max[i] - box.min[i]);
const unitOf = (i) => [0, 1, 2].map((k) => (k === i ? 1 : 0));

// The axis (a unit vector in the box's frame) a spin or sway turns about.
export function cycleAxis(c, box, frontAzDeg = 0) {
  const axes = frontAxes(frontAzDeg);
  if (c.axis === "front-back") return axes.F;
  if (c.axis === "left-right") return axes.R;
  if (c.axis === "up-down") return axes.U;
  if (c.type === "sway" && c.pivot !== "centre") {
    // the pivot edge's own direction: the axis neither named side fixes
    const fixed = c.pivot.split("-").map((n) => ({ front: axes.F, back: axes.F, left: axes.R, right: axes.R, top: axes.U, bottom: axes.U })[n].findIndex((v) => v !== 0));
    return unitOf([0, 1, 2].find((i) => !fixed.includes(i)));
  }
  const s = size(box);
  return unitOf(s.indexOf(Math.min(...s)));
}

// A wheel's radius from its box: half the larger side across the axis.
export function wheelRadius(box, axis) {
  const s = size(box);
  const i = axis.findIndex((v) => v !== 0);
  return Math.max(...s.filter((_, k) => k !== i)) / 2;
}

const centreOf = (box) => [0, 1, 2].map((i) => (box.min[i] + box.max[i]) / 2);
const axisQuat = (a, th) => [a[0] * Math.sin(th / 2), a[1] * Math.sin(th / 2), a[2] * Math.sin(th / 2), Math.cos(th / 2)];
const about = (p, m) => matMul(matFromTRS(p, [0, 0, 0, 1], [1, 1, 1]), matMul(m, matFromTRS([-p[0], -p[1], -p[2]], [0, 0, 0, 1], [1, 1, 1])));

// The cycle's relative transform at shot time t as a column-major 4x4 in the
// box's frame (model frame for parts / groups, the node's frame for objects).
// box = { min, max } at rest; rollAngleRad: Roll with movement's angle.
export function cycleDeltaMatrix(c, t, box, frontAzDeg = 0, rollAngleRad = 0) {
  const v = cycleValue(c, t, rollAngleRad);
  if (c.type === "bob") {
    const up = frontAxes(frontAzDeg).U;
    return matFromTRS(up.map((u) => u * v), [0, 0, 0, 1], [1, 1, 1]);
  }
  if (c.type === "pulse") return about(centreOf(box), matFromTRS([0, 0, 0], [0, 0, 0, 1], [v, v, v]));
  const a = cycleAxis(c, box, frontAzDeg);
  const p = c.type === "sway" ? pivotPoint(box, c.pivot, frontAzDeg) : centreOf(box);
  if (!p) return null;
  return about(p, matFromTRS([0, 0, 0], axisQuat(a, v), [1, 1, 1]));
}

/* ---- Roll with movement ---- */

export const ROLL_STEPS_PER_S = 240; // 8 sub-steps per 30 fps frame: export frames land on table entries

const qConj = (q) => [-q[0], -q[1], -q[2], q[3]];
function qMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}
function qRotate(q, v) {
  const r = qMul(qMul(q, [v[0], v[1], v[2], 0]), qConj(q));
  return [r[0], r[1], r[2]];
}

// The main product's travel through one shot from its keys (sorted by time):
// per sub-step the move in the MODEL frame (the product's key rotation and
// scale and the model's rest placement inside the product node, inner =
// { quaternion, scale }, undone) accumulated, and the path length in the
// product node's parent frame. null when the shot has no product keys.
export function rollTable(productKeys, durationS, inner = { quaternion: [0, 0, 0, 1], scale: 1 }) {
  if (!Array.isArray(productKeys) || !productKeys.length || !isNum(durationS) || durationS <= 0) return null;
  const n = Math.round(durationS * ROLL_STEPS_PER_S);
  const cum = new Float64Array((n + 1) * 3);
  const dist = new Float64Array(n + 1);
  let prev = sampleKeys(productKeys, 0);
  for (let i = 1; i <= n; i++) {
    const cur = sampleKeys(productKeys, i / ROLL_STEPS_PER_S);
    const d = [0, 1, 2].map((k) => cur.position[k] - prev.position[k]);
    const s = ((prev.scale[0] + cur.scale[0]) / 2) * inner.scale;
    const q = qMul(cur.quaternion, inner.quaternion);
    const m = qRotate(qConj(q), d).map((x) => x / s);
    for (let k = 0; k < 3; k++) cum[i * 3 + k] = cum[(i - 1) * 3 + k] + m[k];
    dist[i] = dist[i - 1] + Math.hypot(d[0], d[1], d[2]);
    prev = cur;
  }
  return { n, cum, dist };
}

// At shot time t: { move: [3] (model frame, since the shot started), distance }.
export function rollAt(table, t) {
  if (!table) return { move: [0, 0, 0], distance: 0 };
  const x = Math.min(Math.max(0, isNum(t) ? t : 0) * ROLL_STEPS_PER_S, table.n);
  const i = Math.floor(x);
  const f = x - i;
  const j = Math.min(i + 1, table.n);
  const at = (arr, k, stride, o) => arr[k * stride + o];
  return {
    move: [0, 1, 2].map((k) => at(table.cum, i, 3, k) + (at(table.cum, j, 3, k) - at(table.cum, i, 3, k)) * f),
    distance: table.dist[i] + (table.dist[j] - table.dist[i]) * f,
  };
}

// The rolling angle (rad, about `axis`) after the product moved `move` (model
// frame): no-slip rolling turns the wheel by (move . (axis x up)) / radius, so
// a forward travel turns it forward; travel along the axle turns nothing.
export function rollAngle(move, axis, radius, up = [0, 1, 0]) {
  if (!(radius > 0)) return 0;
  const dir = [axis[1] * up[2] - axis[2] * up[1], axis[2] * up[0] - axis[0] * up[2], axis[0] * up[1] - axis[1] * up[0]];
  return (move[0] * dir[0] + move[1] * dir[1] + move[2] * dir[2]) / radius;
}
