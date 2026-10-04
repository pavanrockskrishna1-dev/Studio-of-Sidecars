/* Slice C3b - part keys: pivots and the relative part transform (pure: no
   three.js, no DOM, no React).
   ---------------------------------------------------------------------------
   A part key moves a GROUP of the main product's parts (the Garage parts that
   were selected when it was keyed, e.g. a door and its handle) as one rigid
   piece. Its transform is RELATIVE to the group's rest pose (the pose the parts
   have when Play or an export starts, Garage part edits included), in the
   product's MODEL frame (the model file's own axes):
     x, y, z     a move in metres
     rx, ry, rz  a rotation in degrees (Euler XYZ) about the group's pivot
     s           a uniform scale factor about the pivot
   The pivot is the centre of the group's box or the middle of one of its 12
   edges. Edges are named from the product's FRONT (its frontAz, the same front
   the camera presets use): front / back, left / right (as seen from the
   front), top / bottom. The delta matrix keeps the pivot point fixed when the
   key has no move, so a rotation key swings the group on that hinge. */

import { matFromTRS, matMul } from "../garage/compose.js";

export const PIVOT_IDS = Object.freeze([
  "centre",
  "front-left",
  "front-right",
  "back-left",
  "back-right",
  "front-top",
  "front-bottom",
  "back-top",
  "back-bottom",
  "left-top",
  "left-bottom",
  "right-top",
  "right-bottom",
]);

export const PIVOT_LABELS = Object.freeze({
  centre: "Centre",
  "front-left": "front-left edge (vertical)",
  "front-right": "front-right edge (vertical)",
  "back-left": "back-left edge (vertical)",
  "back-right": "back-right edge (vertical)",
  "front-top": "front-top edge",
  "front-bottom": "front-bottom edge",
  "back-top": "back-top edge",
  "back-bottom": "back-bottom edge",
  "left-top": "left-top edge",
  "left-bottom": "left-bottom edge",
  "right-top": "right-top edge",
  "right-bottom": "right-bottom edge",
});

const isNum = (n) => typeof n === "number" && Number.isFinite(n);

// The product's front, right (as seen from the front) and up directions in the
// model frame, snapped to the nearest model axis (every product's frontAz is a
// multiple of 90 degrees). Azimuth 0 = +Z, 90 = +X (the camera presets' rule).
export function frontAxes(frontAzDeg = 0) {
  const a = ((isNum(frontAzDeg) ? frontAzDeg : 0) * Math.PI) / 180;
  const fx = Math.round(Math.sin(a));
  const fz = Math.abs(fx) === 1 ? 0 : Math.round(Math.cos(a)) || 1;
  const F = [fx, 0, fz];
  // a viewer in front looks along -F: right = (-F) x up
  const R = [fz, 0, -fx];
  return { F, R, U: [0, 1, 0] };
}

// The box coordinate of a side ("front" | "back" | "right" | "left" | "top" |
// "bottom"): axis index and the box min / max value on that side.
function side(box, name, axes) {
  const v = { front: axes.F, back: axes.F.map((c) => -c), right: axes.R, left: axes.R.map((c) => -c), top: axes.U, bottom: axes.U.map((c) => -c) }[name];
  const i = v.findIndex((c) => c !== 0);
  return { i, value: v[i] > 0 ? box.max[i] : box.min[i] };
}

// The pivot point (model frame) of a box { min:[3], max:[3] }: its centre, or
// the middle of the named edge. null for an unknown id or a bad box.
export function pivotPoint(box, pivotId, frontAzDeg = 0) {
  const vec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
  if (!box || !vec3(box.min) || !vec3(box.max)) return null;
  if (!PIVOT_IDS.includes(pivotId)) return null;
  const p = [0, 1, 2].map((i) => (box.min[i] + box.max[i]) / 2);
  if (pivotId === "centre") return p;
  const axes = frontAxes(frontAzDeg);
  for (const name of pivotId.split("-")) {
    const s = side(box, name, axes);
    p[s.i] = s.value;
  }
  return p;
}

// The relative transform of a part group as a column-major 4x4 (the layout
// three's Matrix4.elements uses), in the model frame:
//   move(position) * translate(pivot) * rotate(quaternion) * scale * translate(-pivot)
// pose = { position:[3], quaternion:[4], scale:[3] } (reelKeys sampleKeys).
export function partDeltaMatrix(pose, pivot) {
  if (!pose || !Array.isArray(pivot) || pivot.length !== 3) return null;
  const toPivot = matFromTRS(pivot, [0, 0, 0, 1], [1, 1, 1]);
  const fromPivot = matFromTRS([-pivot[0], -pivot[1], -pivot[2]], [0, 0, 0, 1], [1, 1, 1]);
  const rs = matFromTRS([0, 0, 0], pose.quaternion, pose.scale);
  const move = matFromTRS(pose.position, [0, 0, 0, 1], [1, 1, 1]);
  if (!toPivot || !fromPivot || !rs || !move) return null;
  return matMul(move, matMul(toPivot, matMul(rs, fromPivot)));
}

// A point through a column-major 4x4.
export function applyToPoint(m, p) {
  return [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
}
