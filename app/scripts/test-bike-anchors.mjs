import fs from "fs";
import path from "path";
import { BIKE_ANCHORS, anchorFromBox, bikeAnchorsFromBoxes } from "../src/fx/bikeAnchors.js";
import { createHistory, record, at } from "../src/fx/bikeAnchorHistory.js";
import { EFFECT_TYPES, addEffect, clearEffects, effectsForSession, loadEffects, getSnapshot, setEffectShots } from "../src/fx/effectsStore.js";

let passes = 0;
function pass(msg) {
  console.log(`PASS: ${msg}`);
  passes++;
}

const bikeFxCode = fs.readFileSync(path.join(process.cwd(), "src/fx/BikeFx.jsx"), "utf-8");
if (bikeFxCode.includes("Math.random") || bikeFxCode.includes("Date.now") || bikeFxCode.includes("performance.now")) {
  throw new Error("BikeFx.jsx contains forbidden functions.");
}
pass("BikeFx.jsx text check (no Math.random, etc)");

clearEffects();
addEffect("bikegrill", [0, 0, 0]);
pass("bikegrill added");
const r = addEffect("bikegrill", [0, 0, 0]);
if (r.ok) throw new Error("Duplicate attach effect should fail");
pass("Duplicate bikegrill refused");
addEffect("bikeexhaust", [0, 0, 0]);
addEffect("bikeheadlight", [0, 0, 0]);
addEffect("biketaillight", [0, 0, 0]);
const snap = getSnapshot().effects;
const id = snap[0].id;
setEffectShots(id, [1, 2]);
const session = effectsForSession();
clearEffects();
loadEffects(session);
const snap2 = getSnapshot().effects;
if (snap2.length !== 4) throw new Error("Session round trip failed");
if (snap2[0].shots[0] !== 1) throw new Error("Shots didn't round trip");
pass("effectsStore session round trip");
clearEffects();
loadEffects([{ type: "embers", position: [0, 0, 0] }]);
if (getSnapshot().effects.length !== 1) throw new Error("Old session load failed");
pass("effectsStore old session load");

const h = createHistory(6);
if (at(h, 1) !== null) throw new Error("empty history should be null");
record(h, 1, [0, 0, 0]);
record(h, 2, [10, 0, 0]);
const p1 = at(h, 1.5);
if (p1[0] !== 5) throw new Error("interpolate failed");
const p2 = at(h, 0.5);
if (p2[0] !== 0) throw new Error("clamp early failed");
const p3 = at(h, 3);
if (p3[0] !== 10) throw new Error("clamp late failed");
record(h, 1, [20, 0, 0]);
if (at(h, 1)[0] !== 20) throw new Error("time backwards failed to clear");
pass("history buffer");

const buf = fs.readFileSync(path.join(process.cwd(), "public/models/bbq-bike.glb"));
const jsonLen = buf.readUInt32LE(12);
const jsonStr = buf.toString("utf8", 20, 20 + jsonLen);
const gltf = JSON.parse(jsonStr);

function mul(a, b) {
  // column-major 4x4 (glTF / three.js): result = a * b
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = sum;
  }
  return o;
}
function transform(v, m) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]
  ];
}
function getMatrix(node) {
  // glTF local matrix: matrix, or T * R * S (column-major)
  if (node.matrix) return new Float32Array(node.matrix);
  const t = node.translation || [0, 0, 0], q = node.rotation || [0, 0, 0, 1], s = node.scale || [1, 1, 1];
  const [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  const r0 = [1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy)];
  const r1 = [2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx)];
  const r2 = [2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy)];
  return new Float32Array([
    r0[0] * s[0], r0[1] * s[0], r0[2] * s[0], 0,
    r1[0] * s[1], r1[1] * s[1], r1[2] * s[1], 0,
    r2[0] * s[2], r2[1] * s[2], r2[2] * s[2], 0,
    t[0], t[1], t[2], 1
  ]);
}

const parentMap = new Map();
gltf.nodes.forEach((n, i) => {
  if (n.children) n.children.forEach(c => parentMap.set(c, i));
});

function getWorldMatrix(idx) {
  let m = getMatrix(gltf.nodes[idx]);
  let p = parentMap.get(idx);
  while (p !== undefined) {
    m = mul(getMatrix(gltf.nodes[p]), m);
    p = parentMap.get(p);
  }
  return m;
}

const boxes = {};
const allMeshesBoxes = [];

function getMeshBounds(idx) {
  const n = gltf.nodes[idx];
  if (n.mesh !== undefined) {
    const mesh = gltf.meshes[n.mesh];
    const posAcc = gltf.accessors[mesh.primitives[0].attributes.POSITION];
    const wm = getWorldMatrix(idx);
    const bounds = [
      [posAcc.min[0], posAcc.min[1], posAcc.min[2]],
      [posAcc.max[0], posAcc.min[1], posAcc.min[2]],
      [posAcc.min[0], posAcc.max[1], posAcc.min[2]],
      [posAcc.max[0], posAcc.max[1], posAcc.min[2]],
      [posAcc.min[0], posAcc.min[1], posAcc.max[2]],
      [posAcc.max[0], posAcc.min[1], posAcc.max[2]],
      [posAcc.min[0], posAcc.max[1], posAcc.max[2]],
      [posAcc.max[0], posAcc.max[1], posAcc.max[2]]
    ].map(v => transform(v, wm));
    
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    bounds.forEach(v => {
      min[0] = Math.min(min[0], v[0]); min[1] = Math.min(min[1], v[1]); min[2] = Math.min(min[2], v[2]);
      max[0] = Math.max(max[0], v[0]); max[1] = Math.max(max[1], v[1]); max[2] = Math.max(max[2], v[2]);
    });
    return { min, max };
  }
  return null;
}

function getHierarchyBounds(nodeIdx) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  
  function visit(idx) {
    const b = getMeshBounds(idx);
    if (b) {
      min[0] = Math.min(min[0], b.min[0]); min[1] = Math.min(min[1], b.min[1]); min[2] = Math.min(min[2], b.min[2]);
      max[0] = Math.max(max[0], b.max[0]); max[1] = Math.max(max[1], b.max[1]); max[2] = Math.max(max[2], b.max[2]);
    }
    const n = gltf.nodes[idx];
    if (n.children) {
      n.children.forEach(visit);
    }
  }
  visit(nodeIdx);
  return { min, max };
}

gltf.nodes.forEach((n, i) => {
  if (["Exhaust", "Rear_Mudguard", "Handlebar_Headlamp", "Grill_Grate", "BBQ_Unit"].includes(n.name)) {
    boxes[n.name] = getHierarchyBounds(i);
  }
});


const anchors = bikeAnchorsFromBoxes(boxes);

if (!anchors.exhaust || anchors.exhaust[2] >= -0.6 || anchors.exhaust[1] >= 0.5 || anchors.exhaust[0] >= 0) throw new Error(`exhaust anchor constraint failed: ${anchors.exhaust}`);
if (!anchors.headlight || anchors.headlight[2] <= 0.55 || Math.abs(anchors.headlight[0]) >= 0.15 || anchors.headlight[1] <= 0.75 || anchors.headlight[1] >= 1.1) throw new Error(`headlight anchor constraint failed: ${anchors.headlight}`);
if (!anchors.taillight || anchors.taillight[2] >= -0.8 || anchors.taillight[1] <= 0.5 || anchors.taillight[1] >= 0.9) throw new Error(`taillight anchor constraint failed: ${anchors.taillight}`);
if (!anchors.grill || anchors.grill[1] <= 0.5 || anchors.grill[0] < boxes["BBQ_Unit"].min[0] || anchors.grill[0] > boxes["BBQ_Unit"].max[0] || anchors.grill[2] < boxes["BBQ_Unit"].min[2] || anchors.grill[2] > boxes["BBQ_Unit"].max[2]) throw new Error(`grill anchor constraint failed: ${anchors.grill}`);
if (!(anchors.grill[0] > 0.6 && anchors.grill[0] < 1.0 && anchors.grill[2] > -0.5 && anchors.grill[2] < 0.8 && anchors.grill[1] > 1.15 && anchors.grill[1] < 1.3)) throw new Error(`grill anchor is not over the grate: ${anchors.grill}`);
pass("GLB anchor boxes");

console.log("BIKE_ANCHORS:");
console.log(JSON.stringify(BIKE_ANCHORS, null, 2));
console.log("Computed Anchors:");
console.log(JSON.stringify(anchors, null, 2));

console.log(`ALL CHECKS PASSED (${passes} PASS)`);


const box = { min: [0, 0, 0], max: [10, 10, 10] };
const a1 = anchorFromBox(box, "top-centre");
if (a1[0] !== 5 || a1[1] !== 10 || a1[2] !== 5) throw new Error("top-centre failed");
const a2 = anchorFromBox(box, "rear-low");
if (Math.abs(a2[0] - 5) > 0.01 || Math.abs(a2[1] - 1.25) > 0.01 || Math.abs(a2[2] - 0) > 0.01) throw new Error("rear-low failed");
const a3 = anchorFromBox(box, "front-mid");
if (Math.abs(a3[0] - 5) > 0.01 || Math.abs(a3[1] - 3.5) > 0.01 || Math.abs(a3[2] - 10) > 0.01) throw new Error("front-mid failed");
const a4 = anchorFromBox(box, "rear-mid");
if (Math.abs(a4[0] - 5) > 0.01 || Math.abs(a4[1] - 5.5) > 0.01 || Math.abs(a4[2] - 0) > 0.01) throw new Error("rear-mid failed");
pass("anchorFromBox pure exact numbers");
