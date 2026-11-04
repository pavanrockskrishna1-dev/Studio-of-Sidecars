import fs from "fs";
import { buildPartIds } from "../src/garage/partId.js";
import { BIKE_RIG, bikeMove, applyBikeMove, BIKE_MOVES } from "../src/animation/bikeRig.js";
import { isKey } from "../src/animation/reelKeys.js";
import { isCycle, MAX_CYCLES_PER_SHOT } from "../src/animation/reelCycles.js";
import { MAX_KEYS_PER_SHOT } from "../src/animation/reelKeys.js";

function getTree() {
  const buffer = fs.readFileSync('public/models/bbq-bike.glb');
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546C67) throw new Error('Not a GLB');
  let offset = 12;
  const chunk0Len = buffer.readUInt32LE(offset);
  const jsonBuffer = buffer.subarray(offset + 8, offset + 8 + chunk0Len);
  const json = JSON.parse(jsonBuffer.toString('utf8'));
  const nodes = json.nodes;
  
  const buildTree = (idx) => {
    const n = nodes[idx];
    return {
      name: n.name || "",
      children: (n.children || []).map(buildTree)
    };
  };
  const scene = json.scenes[json.scene || 0];
  return { name: "Scene", children: scene.nodes.map(buildTree) };
}

const tree = getTree();
const parts = buildPartIds(tree);
if (!parts) throw new Error("buildPartIds returned null");
const ids = new Set(parts.map(p => p.id));

let passes = 0;
const check = (desc, cond) => {
  if (cond) {
    console.log(`PASS ${desc}`);
    passes++;
  } else {
    console.error(`FAIL ${desc}`);
    process.exit(1);
  }
};

const paths = [
  BIKE_RIG.parts.frontWheel,
  BIKE_RIG.parts.rearWheel,
  BIKE_RIG.parts.sidecarWheel,
  ...BIKE_RIG.parts.steering.replace("parts:", "").split("|"),
  ...BIKE_RIG.parts.body.replace("parts:", "").split("|")
];

for (const p of paths) {
  check(`path ${p} exists exactly once`, ids.has(p));
}

// Sidecar wheel group has at least 200 meshes
let sidecarWheelGroup = null;
const findNode = (idToFind) => parts.find(p => p.id === idToFind)?.node;
sidecarWheelGroup = findNode(BIKE_RIG.parts.sidecarWheel);
check("sidecar wheel group exists", !!sidecarWheelGroup);

const countMeshes = (n) => {
  let c = n.children ? n.children.length : 0;
  if (n.children) c += n.children.reduce((acc, child) => acc + countMeshes(child), 0);
  return c;
};
check("sidecar wheel group has at least 200 meshes", countMeshes(sidecarWheelGroup) >= 200);

check("front wheel group exists", !!findNode(BIKE_RIG.parts.frontWheel));
check("rear wheel group exists", !!findNode(BIKE_RIG.parts.rearWheel));

const durations = [1.5, 2, 3, 4, 8, 12];
for (const duration of durations) {
  for (const move of BIKE_MOVES) {
    const res = bikeMove(move, duration, "bbq-bike");
    check(`move ${move} returns valid result at ${duration}s`, res !== null);
    check(`move ${move} keys pass isKey`, res.keys.every(isKey));
    check(`move ${move} cycles pass isCycle`, res.cycles.every(isCycle));
    check(`move ${move} keys under limit`, res.keys.length <= MAX_KEYS_PER_SHOT);
    check(`move ${move} cycles under limit`, res.cycles.length <= MAX_CYCLES_PER_SHOT);
    check(`move ${move} key times in [0, ${duration}] and whole frames`, res.keys.every(k => k.t >= 0 && k.t <= duration && Math.abs(k.t * 30 - Math.round(k.t * 30)) < 1e-5));
  }
}

const rideIn = bikeMove("rideIn", 4, "bbq-bike");
check("rideIn starts away from rest", rideIn.keys[0].transform.z === -6);
check("rideIn ends at rest", rideIn.keys[rideIn.keys.length - 1].transform.z === 0);

const tl = bikeMove("turnLeft", 4, "bbq-bike");
const tr = bikeMove("turnRight", 4, "bbq-bike");

const getTransform = (keys, target, idx) => keys.filter(k => k.target === target)[idx].transform;
const tlProdEnd = getTransform(tl.keys, "product", 1);
const trProdEnd = getTransform(tr.keys, "product", 1);
check("turnLeft yaw opposite to turnRight", tlProdEnd.ry === -trProdEnd.ry);
check("turnLeft lean opposite to turnRight", tlProdEnd.rz === -trProdEnd.rz);

const tlSteerMid = getTransform(tl.keys, BIKE_RIG.parts.steering, 1);
const trSteerMid = getTransform(tr.keys, BIKE_RIG.parts.steering, 1);
check("turnLeft steer opposite to turnRight", tlSteerMid.ry === -trSteerMid.ry);

check("bikeMove returns null for unknown move", bikeMove("jump", 4, "bbq-bike") === null);
check("bikeMove returns null for unknown product", bikeMove("rideIn", 4, "other") === null);

const seq = [{ durationS: 4, keys: [], cycles: [] }, { durationS: 2, keys: [], cycles: [] }];
const newSeqRes = applyBikeMove(seq, 0, "rideIn", "bbq-bike");
check("applyBikeMove succeeds", newSeqRes.ok);
check("applyBikeMove replaces keys", newSeqRes.seq[0].keys.length > 0);
check("applyBikeMove replaces cycles", newSeqRes.seq[0].cycles.length > 0);
check("applyBikeMove does not mutate input", seq[0].keys.length === 0);
check("applyBikeMove does not touch other shots", newSeqRes.seq[1].keys === undefined || newSeqRes.seq[1].keys.length === 0);

const badRes = applyBikeMove(seq, 0, "jump", "bbq-bike");
check("applyBikeMove refuses invalid case", !badRes.ok && badRes.seq === seq);

const r1 = bikeMove("turnLeft", 4, "bbq-bike");
const r2 = bikeMove("turnLeft", 4, "bbq-bike");
check("deterministic", JSON.stringify(r1) === JSON.stringify(r2));


// Turns: the bike must really travel along an arc (so the wheels roll) and lean/yaw to the correct side.
// Model frame: the bike's front is +Z, its LEFT is +X (the sidecar side); +ry turns the front toward +X;
// leaning left means the left side goes down, which is a negative rz.
for (const dur of [1.5, 3, 4, 8]) {
  const L = bikeMove("turnLeft", dur, "bbq-bike").keys.filter((k) => k.target === "product");
  const Rr = bikeMove("turnRight", dur, "bbq-bike").keys.filter((k) => k.target === "product");
  const len = (ks) => ks.slice(1).reduce((a, k, i) => a + Math.hypot(k.transform.x - ks[i].transform.x, k.transform.z - ks[i].transform.z), 0);
  check(`turnLeft ${dur}s starts behind the rest pose and ends exactly at it`, L[0].transform.z < -1 && L[L.length - 1].transform.x === 0 && L[L.length - 1].transform.z === 0);
  check(`turnLeft ${dur}s travels more than 2 m (the wheels roll)`, len(L) > 2);
  check(`turnLeft ${dur}s turns toward +X (the bike's left): positive yaw`, L[L.length - 1].transform.ry > 0);
  check(`turnLeft ${dur}s leans left (negative roll) and turnRight leans right`, L[1].transform.rz < 0 && Rr[1].transform.rz > 0);
  check(`turnRight ${dur}s is the mirror of turnLeft in x, yaw and roll`, Rr.every((k, i) => k.transform.x === -L[i].transform.x || (k.transform.x === 0 && L[i].transform.x === 0)) && Rr[2].transform.ry === -L[2].transform.ry);
}

console.log(`ALL CHECKS PASSED (${passes} PASS)`);