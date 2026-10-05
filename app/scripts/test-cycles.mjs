// Slice C4a — checks for cycles (looping motions) in Reel shots:
// app/src/animation/reelCycles.js (Spin / Bob / Sway / Pulse values at known
// times, phase 0 at the shot start, the loop clock ported from MotionLab, Roll
// with movement: angle = distance / radius with the travel's direction, the
// 6-cycle limit, part groups and parent groups, missing parts, the session round
// trip) and the cycle step of app/src/animation/keyedScene.js on a small
// three.js scene (cycles composed on top of whole-object and part keys, exact
// restore, Reels without cycles unchanged). Plain node, no browser.
// Run from the app folder:  node scripts/test-cycles.mjs   (exit code 1 on any FAIL)
import { readFileSync } from "node:fs";
import * as THREE from "three";
import * as C from "../src/animation/reelCycles.js";
import * as K from "../src/animation/reelKeys.js";
import * as P from "../src/animation/partKeys.js";
import * as R from "../src/animation/reelSequence.js";
import * as store from "../src/animation/animationStore.js";
import { applyKeyed, prepareKeyed, restoreKeyed } from "../src/animation/keyedScene.js";
import { validateAnimation } from "../src/animation/path.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const json = (v) => JSON.stringify(v);
const T = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => ({ x, y, z, rx, ry, rz, s });
const MAIN = "the-kop-main";
const WHEEL = "Sidecar_wheel__axle_pivot~0";
const DOOR = ["Service_door__front~0"];
const spin = (extra = {}) => ({ type: "spin", target: C.groupTarget(WHEEL), group: WHEEL, assetId: MAIN, ...extra });
const bob = (extra = {}) => ({ type: "bob", target: K.partsTarget(DOOR), parts: DOOR, assetId: MAIN, ...extra });

/* ============================ the data ============================ */
check("4 cycle types: Spin, Bob, Sway, Pulse", json(C.CYCLE_TYPES) === json(["spin", "bob", "sway", "pulse"]) && json(Object.values(C.CYCLE_LABELS)) === json(["Spin", "Bob", "Sway", "Pulse"]));
check("at most 6 cycles per shot", C.MAX_CYCLES_PER_SHOT === 6);
let r = C.addCycle([], spin());
check("a group Spin is added with its defaults (30 rpm, Auto axis, no roll)", r.ok && r.cycles[0].rpm === 30 && r.cycles[0].axis === "auto" && r.cycles[0].roll === false && r.cycles[0].group === WHEEL);
check("the group's target id is group:<path>", r.cycles[0].target === `group:${WHEEL}`);
check("a part-group Bob gets 0.05 m / 2 s", C.addCycle([], bob()).cycles[0].amplitude === 0.05 && C.addCycle([], bob()).cycles[0].period === 2);
check("a Sway gets 10 deg / 2 s / centre / Auto", json(C.addCycle([], { ...bob(), type: "sway" }).cycles[0]) === json({ type: "sway", target: K.partsTarget(DOOR), assetId: MAIN, parts: DOOR, angle: 10, period: 2, pivot: "centre", axis: "auto" }));
check("a Pulse gets 5 % / 1 s", C.addCycle([], { ...bob(), type: "pulse" }).cycles[0].scalePct === 5);
check("a whole-object cycle (the main product) is allowed", C.addCycle([], { type: "bob", target: "product", assetId: MAIN }).ok);
check("an added object's cycle is allowed", C.addCycle([], { type: "pulse", target: "i3", assetId: "cessna-172" }).ok);
check("Roll with movement is refused on a whole object", !C.addCycle([], { type: "spin", target: "product", assetId: MAIN, roll: true }).ok);
check("Roll with movement is allowed on a part group and a parent group", C.addCycle([], { ...bob(), type: "spin", roll: true }).ok && C.addCycle([], spin({ roll: true })).ok);
check("an unknown type is refused", !C.addCycle([], { ...bob(), type: "wobble" }).ok);
check("out-of-range values are refused (rpm 601, period 0, angle 181, scale 95 %)", [spin({ rpm: 601 }), bob({ period: 0 }), { ...bob(), type: "sway", angle: 181 }, { ...bob(), type: "pulse", scalePct: 95 }].every((c) => !C.addCycle([], c).ok));
check("a group target that does not match its path is refused", !C.isCycle({ ...C.addCycle([], spin()).cycles[0], target: "group:other~0" }));
check("a part target cannot pose as a whole object", !C.addCycle([], { type: "bob", target: "parts:x~0", assetId: MAIN }).ok);
let six = [];
for (let i = 0; i < 6; i++) six = C.addCycle(six, i % 2 ? spin() : bob()).cycles;
check("6 cycles can be added (a target may have several)", six.length === 6);
r = C.addCycle(six, bob());
check("a 7th cycle is refused with the visible reason, cycles unchanged", !r.ok && r.reason === "A shot can have at most 6 cycles." && r.cycles === six, r.reason);
check("canAddCycle: refused at 6 with the same reason", !C.canAddCycle(six).ok && C.canAddCycle(six).reason === C.LIMIT_REASON && C.canAddCycle(six.slice(1)).ok);
check("deleteCycle removes one", C.deleteCycle(six, 0).cycles.length === 5 && !C.deleteCycle(six, 9).ok);
check("setCycle changes a type field", C.setCycle(six, 1, { rpm: 45 }).cycles[1].rpm === 45);
check("setCycle ignores the target and type", C.setCycle(six, 1, { type: "bob", target: "product" }).cycles[1].type === "spin" && C.setCycle(six, 1, { target: "product" }).cycles[1].group === WHEEL);
check("setCycle refuses an out-of-range value", !C.setCycle(six, 0, { amplitude: 5 }).ok);
check("setCycle: Roll with movement on", C.setCycle(six, 1, { roll: true }).cycles[1].roll === true);

/* ============================ parent groups ============================ */
check("parentPath of a nested part", C.parentPath(`${WHEEL}/Cross-laced_spoke~5`) === WHEEL && C.parentPath("Tyre~0") === "");
check("sharedParent: one part -> its parent group", C.sharedParent([`${WHEEL}/Sidecar_tyre~0`]) === WHEEL);
check("sharedParent: parts of one group -> the group; mixed or root -> none", C.sharedParent([`${WHEEL}/Sidecar_tyre~0`, `${WHEEL}/Wheel_hub~0`]) === WHEEL && C.sharedParent([`${WHEEL}/Sidecar_tyre~0`, "Tyre~0"]) === "" && C.sharedParent(["Tyre~0"]) === "");
check("groupName shows the node's name", C.groupName(WHEEL) === "Sidecar_wheel__axle_pivot" && C.groupName("Motorcycle__assembly_root~0/ParentNode~0") === "ParentNode");

/* ============================ values at known times, phase 0 ============================ */
check("loopPhase (ported from MotionLab): u and lap", near(C.loopPhase(2.5, 2).u, 0.25) && C.loopPhase(2.5, 2).lap === 1 && C.loopPhase(0, 2).u === 0);
const B = C.addCycle([], bob({ amplitude: 0.1, period: 2 })).cycles[0];
check("Bob: 0 at the shot start (phase 0)", C.cycleValue(B, 0) === 0);
check("Bob: +A at P/4, 0 at P/2, -A at 3P/4, 0 at P", near(C.cycleValue(B, 0.5), 0.1) && near(C.cycleValue(B, 1), 0, 1e-12) && near(C.cycleValue(B, 1.5), -0.1) && near(C.cycleValue(B, 2), 0, 1e-12));
check("Bob: A sin(2 pi t / P) at t = 1.3 s", near(C.cycleValue(B, 1.3), 0.1 * Math.sin((2 * Math.PI * 1.3) / 2), 1e-12));
const S = C.addCycle([], { ...bob(), type: "sway", angle: 20, period: 4 }).cycles[0];
check("Sway: 0 at start, +20 deg at P/4 (radians)", C.cycleValue(S, 0) === 0 && near(C.cycleValue(S, 1), (20 * Math.PI) / 180));
const PU = C.addCycle([], { ...bob(), type: "pulse", scalePct: 10, period: 1 }).cycles[0];
check("Pulse: scale 1 at start, 1.1 at P/4, 0.9 at 3P/4", C.cycleValue(PU, 0) === 1 && near(C.cycleValue(PU, 0.25), 1.1) && near(C.cycleValue(PU, 0.75), 0.9));
const SP = C.addCycle([], spin({ rpm: 30 })).cycles[0];
check("Spin: 30 rpm = half a turn per second (pi rad at 1 s), 0 at start", C.cycleValue(SP, 0) === 0 && near(C.cycleValue(SP, 1), Math.PI) && near(C.cycleValue(SP, 4), 4 * Math.PI));
check("Spin with Roll ignores rpm and uses the roll angle", C.cycleValue({ ...SP, roll: true }, 3, 1.25) === 1.25);

/* ============================ axes and the delta matrix ============================ */
const wbox = { min: [1.1075, 0.001, -0.593], max: [1.2325, 0.569, -0.027] }; // 0.125 x 0.568 x 0.566 (the sidecar wheel's box)
check("Auto axis = the box's thinnest side (a wheel's axle: X here)", json(C.cycleAxis(SP, wbox, 90)) === "[1,0,0]");
check("named axes follow the product's front (frontAz 90: front-back = X, left-right = Z, up = Y)", json(C.cycleAxis({ ...SP, axis: "front-back" }, wbox, 90)) === "[1,0,0]" && Math.abs(C.cycleAxis({ ...SP, axis: "left-right" }, wbox, 90)[2]) === 1 && json(C.cycleAxis({ ...SP, axis: "up-down" }, wbox, 90)) === "[0,1,0]");
check("Sway Auto on an edge pivot = that edge's direction (front-top edge runs left-right)", Math.abs(C.cycleAxis({ ...S, pivot: "front-top" }, wbox, 90)[2]) === 1 && Math.abs(C.cycleAxis({ ...S, pivot: "back-left" }, wbox, 90)[1]) === 1);
check("wheel radius = half the larger side across the axle", near(C.wheelRadius(wbox, [1, 0, 0]), 0.284));
const centre = [1.17, 0.285, -0.31];
const D = C.cycleDeltaMatrix(SP, 0.5, wbox, 90);
check("Spin keeps the box centre fixed", P.applyToPoint(D, centre).every((v, i) => near(v, centre[i], 1e-12)));
const top = P.applyToPoint(D, [centre[0], centre[1] + 0.284, centre[2]]);
check("Spin 30 rpm at 0.5 s: a quarter turn about +X (top -> +Z side)", near(top[1], centre[1], 1e-12) && near(top[2], centre[2] + 0.284, 1e-12));
const DB = C.cycleDeltaMatrix(B, 0.5, wbox, 90);
check("Bob moves straight up by A at P/4", near(DB[13], 0.1) && DB[12] === 0 && DB[14] === 0);
const SW = C.addCycle([], { ...bob(), type: "sway", angle: 90, period: 4, pivot: "back-left" }).cycles[0];
const hinge = P.pivotPoint(wbox, "back-left", 90);
check("Sway keeps its pivot edge fixed", P.applyToPoint(C.cycleDeltaMatrix(SW, 1, wbox, 90), hinge).every((v, i) => near(v, hinge[i], 1e-12)));
const DP = C.cycleDeltaMatrix(PU, 0.25, wbox, 90);
check("Pulse scales about the box centre", P.applyToPoint(DP, centre).every((v, i) => near(v, centre[i], 1e-12)) && near(DP[0], 1.1));

/* ============================ Roll with movement ============================ */
// the C3a roll-in: product z 1.0 -> 0 over 0-4 s (Smooth), hold to 8 s
const rollKeys = K.addKey(K.addKey([], { t: 0, target: "product", assetId: MAIN, transform: T(0, 0, 1) }, 8).keys, { t: 4, target: "product", assetId: MAIN, transform: T(0, 0, 0) }, 8).keys;
const table = C.rollTable(K.keysByTarget(rollKeys).product, 8);
const Rw = 0.284;
const ax = [1, 0, 0];
let rollOk = true;
for (const f of [0, 30, 60, 90, 120, 239]) {
  const t = f / 30;
  const z = K.sampleKeys(rollKeys, t).position[2];
  const at = C.rollAt(table, t);
  const ang = C.rollAngle(at.move, ax, Rw);
  if (!near(at.distance, 1 - z, 1e-12) || !near(Math.abs(ang), (1 - z) / Rw, 1e-12)) rollOk = false;
}
check("roll angle = distance travelled / radius at frames 0, 30, 60, 90, 120, 239", rollOk);
check("no product motion before the first frame: angle 0 at frame 0", C.rollAngle(C.rollAt(table, 0).move, ax, Rw) === 0);
check("the wheel stops when the product stops: frames 120 and 239 equal", C.rollAngle(C.rollAt(table, 4).move, ax, Rw) === C.rollAngle(C.rollAt(table, 239 / 30).move, ax, Rw));
const a2 = C.rollAngle(C.rollAt(table, 2).move, ax, Rw);
const topZ = Rw * Math.sin(a2); // the wheel's top point after turning a2 about +X
check("direction: travelling -Z, the wheel's top moves -Z (rolls forward, not backward)", a2 < 0 && topZ < 0);
const back2 = K.addKey(K.addKey([], { t: 0, target: "product", assetId: MAIN, transform: T(0, 0, 0) }, 8).keys, { t: 4, target: "product", assetId: MAIN, transform: T(0, 0, 1) }, 8).keys;
check("reverse travel turns the wheel the other way", near(C.rollAngle(C.rollAt(C.rollTable(K.keysByTarget(back2).product, 8), 2).move, ax, Rw), -a2, 1e-12));
const side = K.addKey(K.addKey([], { t: 0, target: "product", assetId: MAIN, transform: T(0, 0, 0) }, 8).keys, { t: 4, target: "product", assetId: MAIN, transform: T(1, 0, 0) }, 8).keys;
check("travel along the axle does not turn the wheel", near(C.rollAngle(C.rollAt(C.rollTable(K.keysByTarget(side).product, 8), 4).move, ax, Rw), 0, 1e-12));
const turned = K.addKey(K.addKey([], { t: 0, target: "product", assetId: MAIN, transform: T(0, 0, 0, 0, 90, 0) }, 8).keys, { t: 4, target: "product", assetId: MAIN, transform: T(1, 0, 0, 0, 90, 0) }, 8).keys;
check("a product turned 90 deg travelling along world X rolls its X-axle wheel by distance / radius", near(Math.abs(C.rollAngle(C.rollAt(C.rollTable(K.keysByTarget(turned).product, 8), 4).move, ax, Rw)), 1 / Rw, 1e-9));
check("no product keys: no roll table (the wheel does not turn)", C.rollTable(undefined, 8) === null && C.rollAngle(C.rollAt(null, 3).move, ax, Rw) === 0);

/* ============================ on a three.js scene ============================ */
function makeScene() {
  const world = new THREE.Group();
  const product = new THREE.Group();
  const model = new THREE.Group();
  world.add(product);
  product.add(model);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.6));
  door.name = "Service_door__front";
  door.position.set(1.05, 0.6, 0.33);
  model.add(door);
  const wheel = new THREE.Group();
  wheel.name = "Sidecar_wheel__axle_pivot";
  wheel.position.set(1.17, 0.285, -0.31);
  model.add(wheel);
  const tyre = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.566, 0.566));
  tyre.name = "Sidecar_tyre";
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.04));
  spoke.name = "Cross-laced_spoke";
  spoke.position.set(-0.03, 0.1, 0);
  wheel.add(tyre, spoke);
  world.updateMatrixWorld(true);
  const parts = { "Service_door__front~0": door, [`${WHEEL}/Sidecar_tyre~0`]: tyre, [`${WHEEL}/Cross-laced_spoke~0`]: spoke };
  return { world, product, model, door, wheel, tyre, spoke, parts };
}
const sc = makeScene();
const snap = (o) => ({ p: o.position.toArray(), r: [o.rotation.x, o.rotation.y, o.rotation.z, o.rotation.order], q: o.quaternion.toArray(), s: o.scale.toArray() });
const restSnap = [sc.product, sc.door, sc.tyre, sc.spoke].map(snap);
const prep = (anim, extra = {}) =>
  prepareKeyed({
    anim,
    productId: MAIN,
    productNode: sc.product,
    findObject: () => null,
    restFit: { center: new THREE.Vector3(0, 0.3, 0), size: new THREE.Vector3(2, 0.6, 2), footprintRadius: 1.4 },
    modelNode: sc.model,
    frontAz: 90,
    findParts: (ids) => (ids.every((id) => sc.parts[id]) ? ids.map((id) => sc.parts[id]) : null),
    findGroup: (path) => {
      const m = Object.entries(sc.parts).filter(([id]) => id.startsWith(`${path}/`)).map(([, o]) => o);
      return m.length ? m : null;
    },
    ...extra,
  });
const shotBase = { move: "slide", startView: "Front", durationS: 8 };
const doorKeys = [
  { t: 0, parts: DOOR, assetId: MAIN, pivot: "back-left", transform: T(), easing: "linear" },
  { t: 3, parts: DOOR, assetId: MAIN, pivot: "back-left", transform: T(0, 0, 0, 0, -90, 0), easing: "linear" },
];
let keysAll = rollKeys;
for (const k of doorKeys) keysAll = K.addKey(keysAll, k, 8).keys;
const cyc = [C.addCycle([], spin({ roll: true })).cycles[0], C.addCycle([], bob({ amplitude: 0.05, period: 2 })).cycles[0]];
const seqC = R.setShotCycles(R.setShotKeys([shotBase], 0, keysAll).seq, 0, cyc).seq;
const animC = R.buildReelAnim(seqC, 30);
check("a Reel with keys and cycles builds a valid anim carrying both", validateAnimation(animC).ok && animC.reel.shots[0].cycles.length === 2 && animC.reel.shots[0].keys.length === 4);
const keyed = prep(animC);
check("prepareKeyed records the cycles (2 live) and the nodes they move", !!keyed && keyed.cycles.perShot[0].length === 2 && keyed.cycles.rest.length === 2, keyed ? `${keyed.cycles?.rest.length}` : "null");
// the wheel at known times: its rotation about the axle vs distance / radius
const wheelAngleAt = (t) => {
  applyKeyed(keyed, 0, t);
  sc.world.updateMatrixWorld(true);
  const q = sc.tyre.quaternion.clone().multiply(new THREE.Quaternion().fromArray(restSnap[2].q).invert());
  return 2 * Math.atan2(q.x, q.w);
};
let sceneRoll = true;
const R0 = 0.283; // the group box: tyre 0.566 tall and deep -> radius 0.283
const rows = [];
for (const f of [0, 30, 60, 90, 120, 239]) {
  const t = f / 30;
  const dist = 1 - K.sampleKeys(rollKeys, t).position[2];
  const a = wheelAngleAt(t);
  rows.push(`${f}:${a.toFixed(4)}/${(-dist / R0).toFixed(4)}`);
  // a quaternion only tells the angle modulo a full turn
  const d = (((a + dist / R0) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  if (!near(d, 0, 1e-6)) sceneRoll = false;
}
check("scene: the wheel group turns by -distance / radius about its axle (frames 0..239)", sceneRoll, rows.join(" "));
applyKeyed(keyed, 0, 2);
sc.world.updateMatrixWorld(true);
const tyreCentre = new THREE.Vector3().setFromMatrixPosition(sc.tyre.matrixWorld);
const productPos = sc.product.position.clone();
check("scene: the wheel's centre stays on its axle while it turns (in the model frame)", tyreCentre.clone().sub(productPos).distanceTo(new THREE.Vector3(1.17, 0.285, -0.31)) < 1e-9);
const spokeLocalNow = sc.spoke.position.toArray();
check("scene: a spoke turns with the tyre (rigid group)", !near(spokeLocalNow[1], 0.1, 1e-6) && near(Math.hypot(spokeLocalNow[1], spokeLocalNow[2]), 0.1, 1e-9));
check("scene: frames 120 and 239 give the same wheel angle", wheelAngleAt(4) === wheelAngleAt(239 / 30));
// composition with keys: the door = parentToModel^-1 * Dkey * Dcycle * parentToModel * rest
applyKeyed(keyed, 0, 1.3);
sc.world.updateMatrixWorld(true);
const doorBox = { min: [1.04, 0.35, 0.03], max: [1.06, 0.85, 0.63] };
const dkey = new THREE.Matrix4().fromArray(P.partDeltaMatrix(K.sampleKeys(K.keysByTarget(keysAll)[K.partsTarget(DOOR)], 1.3), P.pivotPoint(doorBox, "back-left", 90)));
const dcyc = new THREE.Matrix4().fromArray(C.cycleDeltaMatrix(cyc[1], 1.3, doorBox, 90));
const rest = new THREE.Matrix4().compose(new THREE.Vector3().fromArray(restSnap[1].p), new THREE.Quaternion().fromArray(restSnap[1].q), new THREE.Vector3().fromArray(restSnap[1].s));
const want = dkey.clone().multiply(dcyc).multiply(rest);
sc.door.updateMatrix();
// (1e-6: three keeps BoxGeometry vertices as float32, so the measured box and pivot differ from doorBox by ~1e-9 m)
check("scene: a cycle composes on top of the part key (local = Dkey * Dcycle * rest)", sc.door.matrix.elements.every((v, i) => near(v, want.elements[i], 1e-6)));
check("scene: the product follows its keys under the cycles (z at 1.3 s)", near(sc.product.position.z, K.sampleKeys(rollKeys, 1.3).position[2], 1e-12));
// exact restore
restoreKeyed(keyed);
check("scene: exact restore of every affected node (product, door, tyre, spoke)", json([sc.product, sc.door, sc.tyre, sc.spoke].map(snap)) === json(restSnap));
// phase 0 at every shot start: a 2-shot Reel, the cycle in shot 2 at its local time 0
const seq2 = R.setShotCycles([{ ...shotBase, durationS: 4 }, { ...shotBase, durationS: 4 }], 1, [cyc[1]]).seq;
const k2 = prep(R.buildReelAnim(seq2, 30));
applyKeyed(k2, 1, 0);
check("scene: a cycle starts at phase 0 at its shot's first frame (door at rest)", json(snap(sc.door)) === json(restSnap[1]));
applyKeyed(k2, 1, 0.5);
check("scene: ... and is at +A a quarter period later", near(sc.door.position.y - restSnap[1].p[1], 0.05, 1e-12));
applyKeyed(k2, 0, 1);
check("scene: the shot without the cycle holds the door at rest", json(snap(sc.door)) === json(restSnap[1]));
restoreKeyed(k2);
// whole objects: a Bob on the main product
const kp = prep(R.buildReelAnim(R.setShotCycles([shotBase], 0, [C.addCycle([], { type: "bob", target: "product", assetId: MAIN, amplitude: 0.2, period: 4 }).cycles[0]]).seq, 30));
applyKeyed(kp, 0, 1);
check("scene: a whole-product Bob lifts the product node by A at P/4", near(sc.product.position.y, 0.2, 1e-12));
restoreKeyed(kp);
check("scene: restored after the product Bob", json(snap(sc.product)) === json(restSnap[0]));
// missing parts
const missingSeq = R.setShotCycles([shotBase], 0, [C.addCycle([], spin({ group: "Gone_wheel~0", target: C.groupTarget("Gone_wheel~0") })).cycles[0]]).seq;
check("scene: a cycle whose group is gone is ignored (a cycle-only Reel then runs the old code)", prep(R.buildReelAnim(missingSeq, 30)) === null);
const sceneHas = { productId: MAIN, items: [], hasPart: (id) => !!sc.parts[id], hasGroup: (p) => p === WHEEL };
check("isCycleLive: group present / gone / another product", C.isCycleLive(cyc[0], sceneHas) && !C.isCycleLive(missingSeq[0].cycles[0], sceneHas) && !C.isCycleLive(cyc[0], { ...sceneHas, productId: "coffee-bike" }));
check("isCycleLive: a part group needs every part", C.isCycleLive(cyc[1], sceneHas) && !C.isCycleLive({ ...cyc[1], parts: ["Nope~0"] }, sceneHas));
check("missing cycles are kept in the shot", missingSeq[0].cycles.length === 1);
// keys only: exactly the C3b path (no cycle step)
const kOnly = prep(R.buildReelAnim(R.setShotKeys([shotBase], 0, keysAll).seq, 30));
check("a Reel with keys only has no cycle step (keyed.cycles null)", !!kOnly && kOnly.cycles === null);
restoreKeyed(kOnly);
check("a Reel without keys and cycles prepares nothing", prep(R.buildReelAnim([shotBase], 30)) === null);

/* ============================ the shot list and the session ============================ */
check("setShotKeys keeps the shot's cycles", R.setShotKeys(seqC, 0, []).seq[0].cycles.length === 2 && !("keys" in R.setShotKeys(seqC, 0, []).seq[0]));
check("setShotCycles keeps the shot's keys; an empty list removes the field", R.setShotCycles(seqC, 0, []).seq[0].keys.length === 4 && !("cycles" in R.setShotCycles(seqC, 0, []).seq[0]));
check("a Reel without cycles builds exactly the old anim (no cycles field)", json(R.buildReelAnim([shotBase], 30)) === json(R.buildReelAnim(R.setShotCycles([shotBase], 0, []).seq, 30)) && !("cycles" in R.buildReelAnim([shotBase], 30).reel.shots[0]));
const lone = R.buildReelAnim(R.setShotCycles([{ move: "turntable", startView: "3/4", durationS: 4 }], 0, [cyc[1]]).seq, 30);
check("a lone Turntable carries its cycles", lone.cycles.length === 1 && validateAnimation(lone).ok);
const saved = JSON.parse(JSON.stringify(R.sequenceToSession(seqC)));
check("the session form carries the cycles (group path, parts, type fields)", saved[0].cycles[0].group === WHEEL && saved[0].cycles[0].roll === true && json(saved[0].cycles[1].parts) === json(DOOR) && saved[0].cycles[1].amplitude === 0.05);
check("restore gives back the same cycles", json(R.sequenceFromSession(saved)[0].cycles) === json(seqC[0].cycles));
check("an old session (keys, no cycles) restores unchanged", json(R.sequenceFromSession([{ ...shotBase, keys: K.keysToSession(rollKeys) }])) === json([{ ...shotBase, keys: rollKeys }]));
check("a session with a broken cycle drops only that cycle", R.sequenceFromSession([{ ...saved[0], cycles: [...saved[0].cycles, { ...saved[0].cycles[1], period: -1 }] }])[0].cycles.length === 2);
check("a session with 8 cycles keeps 6", R.sequenceFromSession([{ ...shotBase, cycles: Array.from({ length: 8 }, () => saved[0].cycles[1]) }])[0].cycles.length === 6);
// the store
store.resetSequence();
check("store: add a cycle", store.addCycle(0, spin()).ok && store.getSequence()[0].cycles[0].rpm === 30);
check("store: setCycle (Roll with movement on)", store.setCycle(0, 0, { roll: true }).ok && store.getSequence()[0].cycles[0].roll === true);
for (let i = 0; i < 5; i++) store.addCycle(0, bob());
check("store refuses a 7th cycle with the visible reason", store.addCycle(0, bob()).reason === "A shot can have at most 6 cycles.");
check("store: key edits keep the cycles", store.addKey(0, { t: 0, target: "product", assetId: MAIN, transform: T() }).ok && store.getSequence()[0].cycles.length === 6);
const back = JSON.parse(JSON.stringify({ reel: store.sequenceForSession() }));
check("store: Reset clears the cycles", store.resetSequence() && !("cycles" in store.getSequence()[0]));
check("store: Restore brings the cycles back with the same settings", store.restoreSequence(back.reel) && json(store.getSequence()[0].cycles) === json(R.sequenceFromSession(back.reel)[0].cycles) && store.getSequence()[0].cycles[0].roll === true);
check("store: deleteCycle", store.deleteCycle(0, 0).ok && store.getSequence()[0].cycles.length === 5);
const unreg = store.registerApi({ play: () => true, stop: () => true });
store.play();
check("cycle edits are refused while previewing", store.addCycle(0, bob()).reason === "Stop the preview or export first.");
store.stop();
unreg();

/* ============================ purity and attribution ============================ */
const src = readFileSync(new URL("../src/animation/reelCycles.js", import.meta.url), "utf8");
check("reelCycles.js has no import from three or react", !/from\s+["'](three|react)["']/.test(src));
check("the loop clock carries the MotionLab attribution", /ported from MotionLab v0\.19\.0 cycles-core\.js/.test(src));

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
