// Garage G11 — checks for the gizmo rules in app/src/garage/gizmo.js: snap
// rounding, the 0.05 minimum scale, uniform scale for added objects, the
// conversion of a gizmo result into the G4 / G7a field conventions (metres,
// degrees Euler XYZ, one scale factor) and back, which selection gets a
// gizmo, the W/E/R filter, the settings store, and that one drag through
// garageStore's gesture API is exactly one undo step. Plain node, no
// browser; three.js is used only to cross-check the maths and to play the
// part TransformControls plays (moving an Object3D).
// Run from the app folder:  node scripts/test-garage-gizmo.mjs   (exit code 1 on any FAIL)
import * as THREE from "three";
import * as gz from "../src/garage/gizmo.js";
import { createGarageStore } from "../src/garage/garageStore.js";
import { applyPartOverride } from "../src/garage/compose.js";
import { OBJECT_PART_ID } from "../src/garage/sceneObjects.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const nearVec = (a, b, eps) => a.length === b.length && a.every((v, i) => near(v, b[i], eps));
// v is an exact multiple of step as the fields read it: a 3-decimal value
// whose thousandths are a whole number of steps.
const isMultiple = (v, step) => {
  const t = Math.round(v * 1000);
  return v === t / 1000 && t % Math.round(step * 1000) === 0;
};
const is3dp = (v) => v === Math.round(v * 1000) / 1000;

// A small deterministic PRNG, so every run checks the same cases.
let seed = 20260924;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const between = (a, b) => a + (b - a) * rand();

const liveOf = (obj) => ({ pos: obj.position.toArray(), quat: obj.quaternion.toArray(), scale: obj.scale.toArray() });
const objectFrom = (fields) => {
  const o = new THREE.Object3D();
  o.position.fromArray(fields.pos);
  o.quaternion.setFromEuler(new THREE.Euler(...fields.rot.map(THREE.MathUtils.degToRad), "XYZ"));
  o.scale.fromArray(fields.scale);
  return o;
};

/* ============================== constants ============================== */
check("snap steps are 0.05 m, 15 degrees, 0.1", gz.SNAP.translate === 0.05 && gz.SNAP.rotate === 15 && gz.SNAP.scale === 0.1);
check("MIN_SCALE is 0.05", gz.MIN_SCALE === 0.05);
check("modes are Move / Rotate / Scale in that order", same(gz.GIZMO_MODES, ["translate", "rotate", "scale"]) && gz.MODE_LABELS.translate === "Move");
check("W / E / R map to the three modes", gz.MODE_KEYS.w === "translate" && gz.MODE_KEYS.e === "rotate" && gz.MODE_KEYS.r === "scale");
check("constant tables are frozen", [gz.SNAP, gz.GIZMO_MODES, gz.GIZMO_SPACES, gz.MODE_LABELS, gz.MODE_KEYS].every(Object.isFrozen));

/* ============================ quantize / snap =========================== */
check("quantize rounds to the fields' 3 decimals", gz.quantize(0.1234567) === 0.123 && gz.quantize(1.0005) === 1.001 && gz.quantize(-2.34567) === -2.346);
check("quantize never returns -0", Object.is(gz.quantize(-0.0001), 0) && Object.is(gz.quantize(-0), 0));
check("quantize of junk is 0", gz.quantize(NaN) === 0 && gz.quantize(Infinity) === 0 && gz.quantize("1") === 0);
check("snap 0.149 m -> 0.15 (the same double as typing 0.15)", gz.snapTo(0.149, 0.05) === 0.15);
check("snap 0.024 m -> 0, 0.026 m -> 0.05", Object.is(gz.snapTo(0.024, 0.05), 0) && gz.snapTo(0.026, 0.05) === 0.05);
check("snap -0.074 m -> -0.05, -0.076 m -> -0.1", gz.snapTo(-0.074, 0.05) === -0.05 && gz.snapTo(-0.076, 0.05) === -0.1);
check("snap 22.4 deg -> 15, 22.6 deg -> 30, -7.6 deg -> -15", gz.snapTo(22.4, 15) === 15 && gz.snapTo(22.6, 15) === 30 && gz.snapTo(-7.6, 15) === -15);
check("snap scale 0.26 -> 0.3 and 1.04 -> 1", gz.snapTo(0.26, 0.1) === 0.3 && gz.snapTo(1.04, 0.1) === 1);
{
  let ok = true;
  let bad = "";
  for (let i = 0; i < 2000; i += 1) {
    const v = between(-50, 50);
    for (const step of [0.05, 15, 0.1]) {
      const r = gz.snapTo(v, step);
      if (!isMultiple(r, step) || Math.abs(r - v) > step / 2 + 1e-9) {
        ok = false;
        bad = `${v} step ${step} -> ${r}`;
      }
    }
  }
  check("2000 random values snap to exact multiples, never more than half a step away", ok, bad);
}

/* ============================= minimum scale ============================ */
check("scale below 0.05 is raised to 0.05", gz.clampScale(0.01, false) === 0.05 && gz.clampScale(0.0499, false) === 0.05);
check("negative or zero scale becomes 0.05", gz.clampScale(-3, false) === 0.05 && gz.clampScale(0, false) === 0.05);
check("scale above the floor is rounded to 3 decimals", gz.clampScale(1.234567, false) === 1.235 && gz.clampScale(0.05, false) === 0.05);
check("with snap, the floor is one snap step (0.1, the smallest multiple >= 0.05)", gz.clampScale(0.01, true) === 0.1 && gz.clampScale(0.04, true) === 0.1 && gz.clampScale(-1, true) === 0.1);
check("with snap, scale goes to multiples of 0.1", gz.clampScale(0.16, true) === 0.2 && gz.clampScale(2.349, true) === 2.3);

/* ============================ maximum scale ============================= */
check("MAX_SCALE is 100", gz.MAX_SCALE === 100);
check("scale above 100 is capped at 100 (snap off and on)", gz.clampScale(21174888.33, false) === 100 && gz.clampScale(100.4, false) === 100 && gz.clampScale(1e9, true) === 100);
check("exactly 100 stays 100; just below stays itself", gz.clampScale(100, false) === 100 && gz.clampScale(99.999, false) === 99.999 && gz.clampScale(99.96, true) === 100);
check("junk never escapes the range", gz.clampScale(NaN, false) === 0.05 && gz.clampScale(Infinity, false) === 100 && gz.clampScale(-Infinity, true) === 0.1);
{
  // The near-centre uniform-cube press: |end| / |start| explodes (the browser
  // produced 21174888.33 before the cap).
  const start = { pos: [0.175, 0, 1.15], rot: [0, 0, 0], scale: [1, 1, 1] };
  const o = objectFrom(start);
  o.scale.set(21174888.33, 21174888.33, 21174888.33);
  const f = gz.resolveDrag({ kind: "object", mode: "scale", start, live: liveOf(o), snap: false });
  check("object: the exploding uniform drag is capped at 100 on all axes", same(f.scale, [100, 100, 100]));
  o.scale.set(1, 5e7, 1);
  const g = gz.resolveDrag({ kind: "object", mode: "scale", start, live: liveOf(o), snap: true });
  check("object with snap: capped at 100, uniform", same(g.scale, [100, 100, 100]));
  o.scale.set(3e6, 1, 0.5);
  const p = gz.resolveDrag({ kind: "part", mode: "scale", start, live: liveOf(o), snap: false });
  check("part per-axis: only the exploding axis is capped (100, 1, 0.5)", same(p.scale, [100, 1, 0.5]));
  o.scale.set(2e7, 2e7, 2e7);
  const q = gz.resolveDrag({ kind: "part", mode: "scale", start, live: liveOf(o), snap: false });
  check("part uniform cube: capped at 100 on every axis", same(q.scale, [100, 100, 100]));
  check("a capped drag leaves position and rotation untouched", same(f.pos, start.pos) && same(f.rot, start.rot) && same(p.pos, start.pos));
  let ok = true;
  for (let i = 0; i < 300; i += 1) {
    o.scale.set(10 ** between(-4, 9), 10 ** between(-4, 9), 10 ** between(-4, 9));
    const snap = rand() < 0.5;
    for (const kind of ["part", "object"]) {
      const r = gz.resolveDrag({ kind, mode: "scale", start, live: liveOf(o), snap });
      if (!r.scale.every((s) => s >= 0.05 && s <= 100)) ok = false;
    }
  }
  check("600 random scale drags from 0.0001 to 1e9: every axis within 0.05 to 100", ok);
}

/* ======================= rotations vs three.js ======================== */
{
  let qOk = true;
  let eOk = true;
  for (let i = 0; i < 500; i += 1) {
    const rot = [between(-180, 180), between(-89, 89), between(-180, 180)];
    const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot.map(THREE.MathUtils.degToRad), "XYZ"));
    if (!nearVec(gz.quatFromEulerDeg(rot), tq.toArray(), 1e-15)) qOk = false;
    const te = new THREE.Euler().setFromQuaternion(tq, "XYZ");
    const mine = gz.eulerDegFromQuat(tq.toArray());
    const theirs = [te.x, te.y, te.z].map(THREE.MathUtils.radToDeg);
    if (!nearVec(mine, theirs, 1e-9)) eOk = false;
  }
  check("quatFromEulerDeg matches three's Quaternion.setFromEuler (500 cases)", qOk);
  check("eulerDegFromQuat matches three's Euler.setFromQuaternion (500 cases)", eOk);
}
check("identity quaternion is 0, 0, 0 degrees", same(gz.eulerDegFromQuat([0, 0, 0, 1]), [0, 0, 0]));
check("bad rotation input gives identity, never throws", same(gz.quatFromEulerDeg(null), [0, 0, 0, 1]) && same(gz.eulerDegFromQuat("x"), [0, 0, 0]));
{
  const rot = gz.nearestEuler(gz.eulerDegFromQuat(gz.quatFromEulerDeg([200, 0, 0])), [200, 0, 0]);
  check("nearestEuler keeps an object stored at 200 degrees near 200 (not -160)", nearVec(rot, [200, 0, 0], 1e-9), rot.join(","));
  const flip = gz.nearestEuler([10, 20, 30], [190, 160, 210]);
  check("nearestEuler picks the (x+180, 180-y, z+180) solution when it is closer", nearVec(flip, [190, 160, 210], 1e-9), flip.join(","));
  let ok = true;
  for (let i = 0; i < 300; i += 1) {
    const start = [between(-400, 400), between(-80, 80), between(-400, 400)];
    const back = gz.nearestEuler(gz.eulerDegFromQuat(gz.quatFromEulerDeg(start)), start);
    if (!nearVec(back, start, 1e-8)) ok = false;
  }
  check("an unchanged orientation always reads back as its start angles (300 cases, any range)", ok);
}

/* ======================== who gets a gizmo ============================= */
{
  const P = "i0";
  const t = (pickMode, selection) => gz.gizmoTarget({ pickMode, selection, primaryItemId: P, objectPartId: OBJECT_PART_ID });
  const part = { itemId: "i0", partId: "Body~0" };
  const obj = { itemId: "i1", partId: OBJECT_PART_ID };
  check("nothing selected: no gizmo", t(true, []) === null);
  check("two things selected: no gizmo", t(true, [part, obj]) === null && t(true, [part, { itemId: "i0", partId: "Wheel~0" }]) === null);
  check("one part with Parts on: a part gizmo", same(t(true, [part]), { kind: "part", itemId: "i0", partId: "Body~0" }));
  check("one part with Parts off: no gizmo", t(false, [part]) === null);
  check("one added object: an object gizmo (Parts on or off)", same(t(true, [obj]), { kind: "object", itemId: "i1", partId: OBJECT_PART_ID }) && same(t(false, [obj]), t(true, [obj])));
  check("a part id inside an added object: no gizmo (per-part edits there are out of scope)", t(true, [{ itemId: "i1", partId: "Body~0" }]) === null);
  check("junk selection: no gizmo, no throw", t(true, null) === null && t(true, [null]) === null && gz.gizmoTarget() === null);
}
check("scale always uses local axes; move / rotate follow the toggle", gz.effectiveSpace("scale", "world") === "local" && gz.effectiveSpace("translate", "world") === "world" && gz.effectiveSpace("rotate", "local") === "local" && gz.effectiveSpace("translate", "junk") === "world");

/* ============================= W / E / R =============================== */
{
  const k = (key, extra = {}) => gz.shortcutMode({ key, targetTag: "BODY", ...extra });
  check("w / e / r pick Move / Rotate / Scale", k("w") === "translate" && k("e") === "rotate" && k("r") === "scale");
  check("upper case (Shift or Caps Lock) works too", k("W") === "translate" && k("R") === "scale");
  check("Ctrl / Meta / Alt combinations are left to the browser (Ctrl+R, Ctrl+W)", k("r", { ctrlKey: true }) === null && k("w", { metaKey: true }) === null && k("e", { altKey: true }) === null);
  check("never while typing in an input, textarea, select or editable element", k("w", { targetTag: "INPUT" }) === null && k("e", { targetTag: "textarea" }) === null && k("r", { targetTag: "SELECT" }) === null && k("w", { isContentEditable: true }) === null);
  check("other keys do nothing", k("q") === null && k("Escape") === null && k("") === null && gz.shortcutMode() === null);
}

/* ======================= a drag -> field values ======================== */
{
  const start = { pos: [0.1234567, 1, 2], rot: [0, 0, 0], scale: [1, 1, 1] };
  const o = objectFrom(start);
  o.position.x = 0.5555555; // what a Move drag on X does
  const f = gz.resolveDrag({ kind: "part", mode: "translate", start, live: liveOf(o), snap: false });
  check("move on X: X is the new value at 3 decimals", f.pos[0] === 0.556);
  check("move on X: Y and Z keep their start values exactly", f.pos[1] === 1 && f.pos[2] === 2);
  check("move: rotation and scale are untouched (same values)", same(f.rot, start.rot) && same(f.scale, start.scale));
  const g = gz.resolveDrag({ kind: "part", mode: "translate", start, live: liveOf(o), snap: true });
  check("move with snap: X lands on a multiple of 0.05", g.pos[0] === 0.55 && isMultiple(g.pos[0], 0.05));
  const unchanged = gz.resolveDrag({ kind: "part", mode: "translate", start, live: liveOf(objectFrom(start)), snap: true });
  check("a drag that moved nothing changes nothing (even with snap, even off-grid starts)", same(unchanged, start));
}
{
  const start = { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };
  const o = objectFrom(start);
  o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(37.123456)));
  const f = gz.resolveDrag({ kind: "object", mode: "rotate", start, live: liveOf(o), snap: false });
  check("rotate about world X: only the X angle changes", f.rot[0] === 37.123 && f.rot[1] === 0 && f.rot[2] === 0, f.rot.join(","));
  const g = gz.resolveDrag({ kind: "object", mode: "rotate", start, live: liveOf(o), snap: true });
  check("rotate with snap: a multiple of 15 degrees", g.rot[0] === 30 && isMultiple(g.rot[0], 15) && g.rot[1] === 0 && g.rot[2] === 0);
  check("rotate: position and scale are untouched", same(f.pos, start.pos) && same(f.scale, start.scale));
}
{
  const start = { pos: [0, 0, 0], rot: [200, 0, 0], scale: [1, 1, 1] };
  const o = objectFrom(start);
  o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(10)));
  const f = gz.resolveDrag({ kind: "object", mode: "rotate", start, live: liveOf(o), snap: false });
  check("rotate an object stored at 200 degrees by +10 about X: 210, 0, 0", same(f.rot, [210, 0, 0]), f.rot.join(","));
}
{
  const start = { pos: [0, 0, 0], rot: [30, 40, 50], scale: [1, 1, 1] };
  const o = objectFrom(start);
  o.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(20)));
  const f = gz.resolveDrag({ kind: "part", mode: "rotate", start, live: liveOf(o), snap: false });
  check("rotate about the object's own Z (Local): only the Z angle changes", f.rot[0] === 30 && f.rot[1] === 40 && f.rot[2] === 70, f.rot.join(","));
}
{
  const start = { pos: [0, 0, 0], rot: [0, 45, 0], scale: [1, 1, 1] };
  const o = objectFrom(start);
  // Local X move on an object turned 45 degrees about Y: along its own X axis.
  const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion);
  o.position.addScaledVector(axis, 0.5);
  const f = gz.resolveDrag({ kind: "object", mode: "translate", start, live: liveOf(o), snap: false });
  check("Local move on an object turned 45 degrees: it goes along its own axis (x = z-offset = 0.354)", f.pos[0] === 0.354 && f.pos[1] === 0 && f.pos[2] === -0.354, f.pos.join(","));
}
{
  const start = { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };
  const o = objectFrom(start);
  o.scale.x = 2.3456;
  const f = gz.resolveDrag({ kind: "part", mode: "scale", start, live: liveOf(o), snap: false });
  check("part scale on X: per-axis, only X changes", same(f.scale, [2.346, 1, 1]));
  const g = gz.resolveDrag({ kind: "part", mode: "scale", start, live: liveOf(o), snap: true });
  check("part scale with snap: a multiple of 0.1", same(g.scale, [2.3, 1, 1]) && isMultiple(g.scale[0], 0.1));
  o.scale.set(-0.4, 0.02, 1);
  const h = gz.resolveDrag({ kind: "part", mode: "scale", start, live: liveOf(o), snap: false });
  check("part scale never below 0.05 (a flipped or tiny axis becomes 0.05)", same(h.scale, [0.05, 0.05, 1]));
  check("scale: position and rotation are untouched", same(f.pos, start.pos) && same(f.rot, start.rot));
}
{
  const s0 = 1.25;
  const start = { pos: [1, 0, 2], rot: [0, 90, 0], scale: [s0, s0, s0] };
  const o = objectFrom(start);
  o.scale.set(1.8, s0, s0); // a single-axis handle on an added object
  const f = gz.resolveDrag({ kind: "object", mode: "scale", start, live: liveOf(o), snap: false });
  check("object scale from a single-axis handle becomes uniform (x = y = z = 1.8)", same(f.scale, [1.8, 1.8, 1.8]));
  o.scale.set(s0, s0 * 0.5, s0);
  const g = gz.resolveDrag({ kind: "object", mode: "scale", start, live: liveOf(o), snap: false });
  check("object scale follows the axis the drag moved most (Y halved -> 0.625 everywhere)", same(g.scale, [0.625, 0.625, 0.625]));
  o.scale.set(0.001, 0.001, 0.001);
  const h = gz.resolveDrag({ kind: "object", mode: "scale", start, live: liveOf(o), snap: false });
  check("object scale never below 0.05 and still uniform", same(h.scale, [0.05, 0.05, 0.05]));
  let ok = true;
  for (let i = 0; i < 300; i += 1) {
    o.scale.set(between(-3, 5), between(-3, 5), between(-3, 5));
    const snap = rand() < 0.5;
    const r = gz.resolveDrag({ kind: "object", mode: "scale", start, live: liveOf(o), snap });
    const s = r.scale[0];
    if (!(r.scale[1] === s && r.scale[2] === s && s >= 0.05 && is3dp(s) && (!snap || isMultiple(s, 0.1)))) ok = false;
  }
  check("300 random object scale drags: always uniform, >= 0.05, 3 decimals (snap: multiples of 0.1)", ok);
}
{
  const start = { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };
  const o = objectFrom(start);
  check("bad input gives null, never throws", gz.resolveDrag({ kind: "part", mode: "bend", start, live: liveOf(o) }) === null && gz.resolveDrag({}) === null && gz.resolveDrag() === null && gz.resolveDrag({ mode: "translate", start: { pos: [0, 0] }, live: liveOf(o) }) === null);
}
{
  // Snap on: every changed value is an exact multiple, over many random drags.
  let ok = true;
  let bad = "";
  for (let i = 0; i < 300; i += 1) {
    const start = { pos: [between(-2, 2), between(0, 2), between(-2, 2)], rot: [between(-90, 90), between(-60, 60), between(-90, 90)], scale: [1, 1, 1] };
    const o = objectFrom(start);
    o.position.x += between(-1, 1);
    const m = gz.resolveDrag({ kind: "part", mode: "translate", start, live: liveOf(o), snap: true });
    if (!isMultiple(m.pos[0], 0.05) || m.pos[1] !== start.pos[1] || m.pos[2] !== start.pos[2]) {
      ok = false;
      bad = `move ${m.pos}`;
    }
    const o2 = objectFrom(start);
    o2.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), between(-2, 2)));
    const r = gz.resolveDrag({ kind: "part", mode: "rotate", start, live: liveOf(o2), snap: true });
    if (!isMultiple(r.rot[2], 15) || r.rot[0] !== start.rot[0] || r.rot[1] !== start.rot[1]) {
      ok = false;
      bad = `rotate ${r.rot}`;
    }
  }
  check("300 random snapped drags: the moved value is an exact multiple, the others are untouched", ok, bad);
}

/* ================ round trips: the G4 / G7a conventions ================ */
{
  const t = { x: 1.25, y: 0, z: -0.8, rx: 12.5, ry: -90, rz: 180, s: 0.75 };
  const f = gz.fieldsFromItemTransform(t);
  check("item transform -> fields: metres, degrees, [s, s, s]", same(f, { pos: [1.25, 0, -0.8], rot: [12.5, -90, 180], scale: [0.75, 0.75, 0.75] }));
  const back = { ...gz.itemPatchFromFields(f, "translate"), ...gz.itemPatchFromFields(f, "rotate"), ...gz.itemPatchFromFields(f, "scale") };
  check("fields -> item transform round-trips exactly", same(back, t));
  check("each mode patches only its own keys", same(Object.keys(gz.itemPatchFromFields(f, "translate")), ["x", "y", "z"]) && same(Object.keys(gz.itemPatchFromFields(f, "rotate")), ["rx", "ry", "rz"]) && same(Object.keys(gz.itemPatchFromFields(f, "scale")), ["s"]));
  check("part patches carry only the mode's own key, as fresh arrays", same(Object.keys(gz.partPatchFromFields(f, "rotate")), ["rot"]) && gz.partPatchFromFields(f, "translate").pos !== f.pos);
  check("junk in the converters gives null", gz.fieldsFromItemTransform(null) === null && gz.itemPatchFromFields(f, "bend") === null && gz.partPatchFromFields(null, "rotate") === null);
}
{
  // Through the real store: what the gizmo commits is exactly what the fields read back.
  const s = createGarageStore();
  s.startLayout({ assetId: "main" });
  s.addItem({ assetId: "cup", transform: { x: 2, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 } });
  let ok = true;
  for (let i = 0; i < 100; i += 1) {
    const start = gz.fieldsFromItemTransform(s.getLayout().items[1].transform);
    const o = objectFrom(start);
    const mode = gz.GIZMO_MODES[i % 3];
    if (mode === "translate") o.position.set(between(-3, 3), between(0, 1), between(-3, 3));
    else if (mode === "rotate") o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(rand(), rand(), rand()).normalize(), between(-1, 1)));
    else o.scale.multiplyScalar(between(0.2, 3));
    const f = gz.resolveDrag({ kind: "object", mode, start, live: liveOf(o), snap: rand() < 0.3 });
    s.setItemTransform("i1", gz.itemPatchFromFields(f, mode));
    if (!same(gz.fieldsFromItemTransform(s.getLayout().items[1].transform), f)) ok = false;
  }
  check("100 object drags through garageStore: the stored transform reads back as the exact fields", ok);
}
{
  // The mid-drag preview pose resolves back to the very same fields (the
  // commit and the picture never disagree, and a second pass changes nothing).
  let ok = true;
  for (let i = 0; i < 300; i += 1) {
    const start = { pos: [between(-2, 2), between(-2, 2), between(-2, 2)], rot: [between(-170, 170), between(-80, 80), between(-170, 170)], scale: [1, 1, 1] };
    const o = objectFrom(start);
    o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), between(-1, 1)));
    const f = gz.resolveDrag({ kind: "part", mode: "rotate", start, live: liveOf(o), snap: false });
    const pose = gz.poseFromFields(f);
    const again = gz.resolveDrag({ kind: "part", mode: "rotate", start, live: { pos: pose.pos, quat: pose.quat, scale: pose.scale }, snap: false });
    const idle = gz.resolveDrag({ kind: "part", mode: "rotate", start: f, live: { pos: pose.pos, quat: pose.quat, scale: pose.scale }, snap: false });
    if (!same(again, f) || !same(idle, f)) ok = false;
  }
  check("300 rotations: the preview pose re-resolves to identical fields", ok);
}
{
  // G4's part path: commitPartEdit turns absolute field values into an
  // override against the part's base pose; applyPartOverride composes it;
  // the rail reads it back through three's Euler. The gizmo's fields must
  // survive that round trip at the fields' own 3 decimals.
  const commitPartEdit = (base, fields) => {
    const desired = new THREE.Quaternion().setFromEuler(new THREE.Euler(...fields.rot.map(THREE.MathUtils.degToRad), "XYZ"));
    const ovQ = desired.multiply(new THREE.Quaternion(...base.quat).invert());
    return {
      pos: fields.pos.map((v, i) => v - base.pos[i]),
      quat: [ovQ.x, ovQ.y, ovQ.z, ovQ.w],
      scale: fields.scale.map((v, i) => Math.max(0.05, v) / base.scale[i]),
    };
  };
  const readBack = (pose) => {
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...pose.quat), "XYZ");
    return { pos: pose.pos, rot: [e.x, e.y, e.z].map(THREE.MathUtils.radToDeg), scale: pose.scale };
  };
  let ok = true;
  let bad = "";
  for (let i = 0; i < 300; i += 1) {
    const baseQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(between(-1, 1), between(-1, 1), between(-1, 1)));
    const base = { pos: [between(-1, 1), between(-1, 1), between(-1, 1)], quat: baseQ.toArray(), scale: [between(0.5, 2), between(0.5, 2), between(0.5, 2)] };
    const start = readBack(base);
    const o = objectFrom(start);
    o.position.y += between(-1, 1);
    o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), between(-1, 1)));
    o.scale.z *= between(0.3, 2);
    const fields = {
      pos: gz.resolveDrag({ kind: "part", mode: "translate", start, live: liveOf(o) }).pos,
      rot: gz.resolveDrag({ kind: "part", mode: "rotate", start, live: liveOf(o) }).rot,
      scale: gz.resolveDrag({ kind: "part", mode: "scale", start, live: liveOf(o) }).scale,
    };
    const shown = readBack(applyPartOverride(base, commitPartEdit(base, fields)));
    const q = (v) => v.map(gz.quantize);
    if (!same(q(shown.pos), q(fields.pos)) || !same(q(shown.rot), q(fields.rot)) || !same(q(shown.scale), q(fields.scale))) {
      ok = false;
      bad = JSON.stringify({ fields, shown });
    }
  }
  check("300 part drags through G4's override maths read back as the same 3-decimal field values", ok, bad.slice(0, 200));
}

/* ================== one drag = one gesture = one undo ================== */
{
  const s = createGarageStore();
  s.startLayout({ assetId: "main" });
  s.addItem({ assetId: "cup", transform: { x: 2, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 } });
  const before = s.getLayout();
  const d0 = s.getSnapshot().undoDepth;
  const rev0 = s.getSnapshot().revision;
  const revisions = [];
  s.subscribe(() => revisions.push(s.getSnapshot().revision));
  const session = gz.createDragSession(s);
  check("a drag session opens one gesture", session.begin().ok && session.open && s.getSnapshot().gestureOpen);
  check("a second begin while the drag is open is refused", session.begin().ok === false);
  check("undo is refused mid-drag", s.undo().reason === "gesture-open");
  const r = session.finish(() => {
    // several commits inside one drag (the worst case) are still one step
    s.setItemTransform("i1", { x: 2.5 });
    s.setItemTransform("i1", { x: 3 });
    return s.setItemTransform("i1", { x: 3.25 });
  });
  check("finishing a drag that changed the layout: exactly one new undo entry", r.ok && r.changed && s.getSnapshot().undoDepth === d0 + 1);
  check("the committed value is in the layout", s.getLayout().items[1].transform.x === 3.25);
  check("the store notified with a new revision exactly once (the G5 refit trigger)", revisions.filter((v) => v !== rev0).length === 1 && s.getSnapshot().revision === rev0 + 1, revisions.join(","));
  s.undo();
  check("one undo restores the exact pre-drag layout", same(s.getLayout(), before));
}
{
  const s = createGarageStore();
  s.startLayout({ assetId: "main" });
  s.addItem({ assetId: "cup", transform: { x: 2, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 } });
  s.setItemTransform("i1", { ry: 30 }); // leaves a redo-able history behind it
  s.undo();
  const before = s.getLayout();
  const depth = s.getSnapshot().undoDepth;
  const redo = s.getSnapshot().redoDepth;
  const session = gz.createDragSession(s);
  session.begin();
  s.setItemTransform("i1", { x: 9 });
  const c = session.cancel();
  check("Esc (cancel) restores the exact pre-drag layout", c.ok && same(s.getLayout(), before));
  check("cancel leaves no undo entry and keeps the redo stack", s.getSnapshot().undoDepth === depth && s.getSnapshot().redoDepth === redo && !s.getSnapshot().gestureOpen);
  session.begin();
  const n = session.finish(() => null);
  check("a drag that commits nothing leaves no undo entry", n.ok && !n.changed && s.getSnapshot().undoDepth === depth);
  session.begin();
  const u = session.finish(() => s.setItemTransform("i1", { x: 2 }));
  check("a drag that ends where it started leaves no undo entry", u.ok && !u.changed && s.getSnapshot().undoDepth === depth);
  session.begin();
  const t = session.finish(() => {
    throw new Error("boom");
  });
  check("a throwing commit still closes the gesture", t.ok && !s.getSnapshot().gestureOpen);
  check("finish / cancel without an open drag are refused", session.finish().ok === false && session.cancel().ok === false);
  s.setLocked(true);
  check("a locked store refuses to start a drag", session.begin().ok === false && !session.open);
}

/* ============================ settings store =========================== */
{
  const st = gz.createGizmoSettings();
  check("defaults: Move, World, Snap off", same(st.getSnapshot(), { mode: "translate", space: "world", snap: false }));
  check("the snapshot is frozen", Object.isFrozen(st.getSnapshot()));
  let calls = 0;
  const un = st.subscribe(() => {
    calls += 1;
  });
  const first = st.getSnapshot();
  check("setMode rotate notifies once and replaces the snapshot", st.setMode("rotate") && calls === 1 && st.getSnapshot() !== first && st.getSnapshot().mode === "rotate");
  check("setting the same mode again changes nothing", st.setMode("rotate") === false && calls === 1);
  check("an unknown mode is refused", st.setMode("bend") === false && st.getSnapshot().mode === "rotate");
  check("toggleSpace flips World <-> Local", st.toggleSpace() && st.getSnapshot().space === "local" && st.toggleSpace() && st.getSnapshot().space === "world");
  check("setSpace refuses junk", st.setSpace("up") === false);
  check("toggleSnap / setSnap", st.toggleSnap() && st.getSnapshot().snap === true && st.setSnap(false) && st.getSnapshot().snap === false && st.setSnap("yes") === false);
  un();
  st.setMode("scale");
  check("an unsubscribed listener hears nothing more", calls === 5);
  check("the app's shared instance starts at the defaults", same(gz.getSnapshot(), { mode: "translate", space: "world", snap: false }));
}

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
