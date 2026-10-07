// Slice P2 — checks for the props shelf: the four prop files (real size in
// metres, weight, textures, thumbnails), the 12-prop cap, where a prop is
// dropped (on the BBQ Bike's grill grate, or on the floor in front of any other
// product), that props never overlap the product or each other (down to the
// triangles on the grill), that a prop is an ordinary Garage object (select,
// move, hide, delete, undo, layout save and load), the session round trip (and
// that an old session without props still loads), and that a Spin cycle on a
// prop plays. Plain node, no browser. The browser side (the Creator cards, the
// click-to-add flow, FPS, screenshots) is proved by a separate harness.
// Run from the app folder:  node scripts/test-props.mjs   (exit code 1 on any FAIL)
import { readFileSync, existsSync, statSync } from "node:fs";
import * as THREE from "three";
import { PROPS, MAX_PROPS, isPropId } from "../src/products/props.js";
import { PRODUCTS, getAsset } from "../src/products/registry.js";
import * as so from "../src/garage/sceneObjects.js";
import { createGarageStore } from "../src/garage/garageStore.js";
import { LAYOUT_LIMITS, serializeLayout, validateLayout } from "../src/garage/layout.js";
import * as ll from "../src/garage/layoutLibrary.js";
import { propsForSession, parseSessionProps } from "../src/garage/propsSession.js";
import * as C from "../src/animation/reelCycles.js";
import * as R from "../src/animation/reelSequence.js";
import { applyKeyed, prepareKeyed, restoreKeyed } from "../src/animation/keyedScene.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const json = (v) => JSON.stringify(v);
const pub = (p) => new URL(`../public${p}`, import.meta.url);

/* ---------------------------- a tiny GLB reader ---------------------------- */
function readGlb(url) {
  const buf = readFileSync(url);
  const jlen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jlen).toString("utf8"));
  const bo = 20 + jlen;
  const bin = buf.slice(bo + 8, bo + 8 + buf.readUInt32LE(bo));
  return { gltf, bin, bytes: buf.length };
}
const COMP = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function accessor(glb, i) {
  const a = glb.gltf.accessors[i];
  const bv = glb.gltf.bufferViews[a.bufferView];
  const [Type, size] = COMP[a.componentType];
  const n = NCOMP[a.type];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const stride = bv.byteStride && bv.byteStride !== size * n ? bv.byteStride : size * n;
  const out = new Type(a.count * n);
  const dv = new DataView(glb.bin.buffer, glb.bin.byteOffset + off, glb.bin.byteLength - off);
  const get = { 5126: "getFloat32", 5125: "getUint32", 5123: "getUint16", 5121: "getUint8", 5122: "getInt16", 5120: "getInt8" }[a.componentType];
  for (let k = 0; k < a.count; k += 1) for (let c = 0; c < n; c += 1) out[k * n + c] = dv[get](k * stride + c * size, true);
  return out;
}
const nodeMatrix = (n) => {
  const m = new THREE.Matrix4();
  if (n.matrix) return m.fromArray(n.matrix);
  return m.compose(
    new THREE.Vector3().fromArray(n.translation || [0, 0, 0]),
    new THREE.Quaternion().fromArray(n.rotation || [0, 0, 0, 1]),
    new THREE.Vector3().fromArray(n.scale || [1, 1, 1])
  );
};
// every mesh node as { name, matrix (world), meshIndex }
function meshNodes(glb) {
  const out = [];
  const nodes = glb.gltf.nodes;
  const visit = (i, parent, path) => {
    const n = nodes[i];
    const m = parent.clone().multiply(nodeMatrix(n));
    const name = n.name || `node${i}`;
    if (n.mesh !== undefined) out.push({ name, path: [...path, name], matrix: m, meshIndex: n.mesh });
    for (const c of n.children || []) visit(c, m, [...path, name]);
  };
  for (const r of glb.gltf.scenes[glb.gltf.scene ?? 0].nodes) visit(r, new THREE.Matrix4(), []);
  return out;
}
function meshBox(glb, node) {
  const box = new THREE.Box3();
  for (const p of glb.gltf.meshes[node.meshIndex].primitives) {
    const a = glb.gltf.accessors[p.attributes.POSITION];
    box.union(new THREE.Box3(new THREE.Vector3().fromArray(a.min), new THREE.Vector3().fromArray(a.max)).applyMatrix4(node.matrix));
  }
  return box;
}
// world triangles of a mesh node as a flat Float64Array (9 per triangle)
function meshTris(glb, node, offset = [0, 0, 0]) {
  const tris = [];
  const v = new THREE.Vector3();
  for (const p of glb.gltf.meshes[node.meshIndex].primitives) {
    const pos = accessor(glb, p.attributes.POSITION);
    const idx = p.indices !== undefined ? accessor(glb, p.indices) : Uint32Array.from({ length: pos.length / 3 }, (_, k) => k);
    const w = new Float64Array(pos.length);
    for (let k = 0; k < pos.length; k += 3) {
      v.set(pos[k], pos[k + 1], pos[k + 2]).applyMatrix4(node.matrix);
      w[k] = v.x + offset[0];
      w[k + 1] = v.y + offset[1];
      w[k + 2] = v.z + offset[2];
    }
    for (let k = 0; k < idx.length; k += 3) {
      const t = new Float64Array(9);
      for (let c = 0; c < 3; c += 1) for (let d = 0; d < 3; d += 1) t[c * 3 + d] = w[idx[k + c] * 3 + d];
      tris.push(t);
    }
  }
  return tris;
}
function jpgSize(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
// triangle-triangle intersection, strict (touching or sharing a plane contact does not count):
// an edge of one pierces the interior of the other (Moller-Trumbore on the segment).
function segHitsTri(p, q, t, eps) {
  const e1 = [t[3] - t[0], t[4] - t[1], t[5] - t[2]];
  const e2 = [t[6] - t[0], t[7] - t[1], t[8] - t[2]];
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const h = cr(d, e2);
  const a = dot(e1, h);
  if (Math.abs(a) < 1e-14) return false;
  const f = 1 / a;
  const s = [p[0] - t[0], p[1] - t[1], p[2] - t[2]];
  const u = f * dot(s, h);
  if (u <= eps || u >= 1 - eps) return false;
  const qv = cr(s, e1);
  const v = f * dot(d, qv);
  if (v <= eps || u + v >= 1 - eps) return false;
  const tt = f * dot(e2, qv);
  return tt > eps && tt < 1 - eps;
}
function trisIntersect(A, B) {
  const eps = 1e-7;
  for (let i = 0; i < 3; i += 1) {
    const a0 = [A[i * 3], A[i * 3 + 1], A[i * 3 + 2]];
    const a1 = [A[((i + 1) % 3) * 3], A[((i + 1) % 3) * 3 + 1], A[((i + 1) % 3) * 3 + 2]];
    if (segHitsTri(a0, a1, B, eps)) return true;
    const b0 = [B[i * 3], B[i * 3 + 1], B[i * 3 + 2]];
    const b1 = [B[((i + 1) % 3) * 3], B[((i + 1) % 3) * 3 + 1], B[((i + 1) % 3) * 3 + 2]];
    if (segHitsTri(b0, b1, A, eps)) return true;
  }
  return false;
}
const triBox = (t) => ({ min: [Math.min(t[0], t[3], t[6]), Math.min(t[1], t[4], t[7]), Math.min(t[2], t[5], t[8])], max: [Math.max(t[0], t[3], t[6]), Math.max(t[1], t[4], t[7]), Math.max(t[2], t[5], t[8])] });
const boxHit = (a, b) => [0, 1, 2].every((i) => a.min[i] <= b.max[i] && b.min[i] <= a.max[i]);

/* ============================ the four prop files ============================ */
const files = {};
check("4 props: Burger, Roll, Wings, Drumsticks (in that order)", json(PROPS.map((p) => p.label)) === json(["Burger", "Roll", "Wings", "Drumsticks"]));
check("MAX_PROPS is 12 (the registry and the rules agree)", MAX_PROPS === 12 && so.OBJECT_LIMITS.MAX_PROPS === 12);
check("prop ids are unique and start with prop-", new Set(PROPS.map((p) => p.id)).size === 4 && PROPS.every((p) => /^prop-[a-z]+$/.test(p.id)));
check("PROPS is frozen", Object.isFrozen(PROPS));
for (const p of PROPS) {
  const url = pub(p.modelPath);
  check(`${p.label}: file ${p.modelPath} exists`, existsSync(url));
  if (!existsSync(url)) continue;
  const g = readGlb(url);
  files[p.id] = g;
  check(`${p.label}: file is under 1.5 MB (${g.bytes.toLocaleString("en-US")} bytes)`, g.bytes < 1.5 * 1024 * 1024);
  const nodes = meshNodes(g);
  check(`${p.label}: one mesh node, one material`, nodes.length === 1 && g.gltf.materials.length === 1);
  const root = g.gltf.nodes;
  const scaled = root.some((n) => n.scale && n.scale.some((s) => s !== 1)) || root.some((n) => n.matrix && n.matrix.slice(0, 3).some((v, i) => i === 0 && v !== 1));
  check(`${p.label}: no scale on any node (never rescaled)`, !scaled);
  const box = meshBox(g, nodes[0]);
  const size = box.getSize(new THREE.Vector3()).toArray();
  check(`${p.label}: real size in metres ${size.map((v) => (v * 100).toFixed(1)).join(" x ")} cm matches the registry (within 0.5 mm)`, size.every((v, i) => near(v, p.size[i], 5e-4)), json(size.map((v) => +v.toFixed(4))));
  check(`${p.label}: base on y = 0 and centred on x/z (the stage re-bases it to its bottom centre anyway)`, near(box.min.y, 0, 1e-6) && near((box.min.x + box.max.x) / 2, 0, 2e-3) && near((box.min.z + box.max.z) / 2, 0, 2e-3));
  const baseIdx = g.gltf.textures[g.gltf.materials[0].pbrMetallicRoughness.baseColorTexture.index].source;
  const dims = g.gltf.images.map((im) => {
    const bv = g.gltf.bufferViews[im.bufferView];
    return jpgSize(g.bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
  });
  check(`${p.label}: every texture is JPEG and at most 1024 x 1024 (the roll base colour 2048 x 2048, so its small tagline reads) (${dims.map((d) => d.join("x")).join(", ")})`, g.gltf.images.every((im) => im.mimeType === "image/jpeg") && dims.every((d, k) => d && d[0] <= (p.id === "prop-roll" && k === baseIdx ? 2048 : 1024) && d[1] <= (p.id === "prop-roll" && k === baseIdx ? 2048 : 1024)));
  const tris = g.gltf.accessors[g.gltf.meshes[0].primitives[0].indices].count / 3;
  check(`${p.label}: light (${tris.toLocaleString("en-US")} triangles, under 20,000)`, tris < 20000);
  const th = pub(p.thumbUrl);
  const tb = existsSync(th) ? readFileSync(th) : null;
  const ts = tb ? jpgSize(tb) : null;
  check(`${p.label}: thumbnail is a 480 x 216 JPEG (the product thumbnail size)`, !!ts && ts[0] === 480 && ts[1] === 216, ts ? ts.join("x") : "missing");
  check(`${p.label}: is not a product (never a product card or main product)`, !PRODUCTS.some((x) => x.id === p.id) && isPropId(p.id));
  check(`${p.label}: getAsset finds it`, getAsset(p.id) === PROPS.find((x) => x.id === p.id));
}
check("getAsset still finds products, and null for an unknown id", getAsset("bbq-bike") === PRODUCTS.find((x) => x.id === "bbq-bike") && getAsset("nope") === null);
check("the BBQ Bike registers its grate and its lid (hinge mesh, two lid groups, 85 deg) as its prop surface", json(PRODUCTS.find((x) => x.id === "bbq-bike").propSurface) === json({ node: "Grill_Grate", lid: { hinge: "Lid_Hinge_Pins", nodes: ["Lid_Main", "Lid_Rear"], angleDeg: 85 } }));
check("no other product has a prop surface", PRODUCTS.filter((x) => x.propSurface).length === 1);

/* ================================ the cap ================================ */
check("checkPropCount(0) and (11) are ok", so.checkPropCount(0).ok && so.checkPropCount(11).ok);
const cap = so.checkPropCount(12);
check("checkPropCount(12) refuses a 13th with the visible text 'Max 12 props'", !cap.ok && cap.reason === "max-props" && /^Max 12 props/.test(cap.message), cap.message);
check("checkPropCount of junk is refused", !so.checkPropCount(-1).ok && !so.checkPropCount(NaN).ok && !so.checkPropCount("3").ok);
check("countObjects splits props from other objects", json(so.countObjects([{ assetId: "prop-burger" }, { assetId: "cessna-172" }, { assetId: "prop-roll" }, { assetId: "x" }])) === json({ objects: 2, props: 2 }));
check("5 other objects do not block a prop, and 12 props do not block an object", so.checkAddCount(so.countObjects(Array(5).fill({ assetId: "x" })).objects).ok === false && so.checkPropCount(so.countObjects(Array(5).fill({ assetId: "x" })).props).ok && so.checkAddCount(so.countObjects(Array(12).fill({ assetId: "prop-roll" })).objects).ok);
check("1 main + 5 objects + 12 props fit in the layout's 20 items", 1 + so.OBJECT_LIMITS.MAX_ADDED + MAX_PROPS <= LAYOUT_LIMITS.MAX_ITEMS);
check("checkAddProp: count first, then the triangle budget", !so.checkAddProp({ propCount: 12, currentTriangles: 0, newTriangles: 1 }).ok && so.checkAddProp({ propCount: 3, currentTriangles: 300000, newTriangles: 11000 }).ok && so.checkAddProp({ propCount: 3, currentTriangles: 999000, newTriangles: 11000 }).reason === "over-budget");
check("12 props of ~11k triangles on the 212k BBQ Bike stay under the 700,000 warning", 212762 + 12 * 11282 < so.OBJECT_LIMITS.WARN_TRIANGLES);

/* ================== the grill: where the 4 props are dropped ================== */
const bbq = readGlb(pub("/models/bbq-bike.glb"));
const bbqNodes = meshNodes(bbq);
const grate = bbqNodes.find((n) => n.name === "Grill_Grate");
const gbox = meshBox(bbq, grate);
const surface = { min: gbox.min.toArray(), max: gbox.max.toArray() };
check(`the cooking surface is the mesh Grill_Grate inside BBQ_Unit (${grate.path.join(" / ")})`, grate.path[0] === "BBQ_Unit" && grate.path.includes("Grill_Housing"));
check(`its top is y = ${surface.max[1].toFixed(4)} m (props stand on it) and it is 0.330 x 1.245 m`, near(surface.max[1], 1.2090, 5e-4) && near(surface.max[0] - surface.min[0], 0.33, 2e-3) && near(surface.max[2] - surface.min[2], 1.245, 2e-3));
const lidNames = new Set(["Lid_Main", "Lid_Rear"]);
const inLid = (n) => n.path.some((s) => lidNames.has(s));
const lidTopY = Math.min(...bbqNodes.filter(inLid).map((n) => meshBox(bbq, n).min.y));
check(`the closed lid starts only ${((lidTopY - surface.max[1]) * 100).toFixed(1)} cm above the grate, so it opens while props stand there`, lidTopY - surface.max[1] < 0.06 && bbqNodes.filter(inLid).length === 7);
const productBoxes = bbqNodes.filter((n) => !inLid(n)).map((n) => ({ n, box: meshBox(bbq, n) }));
const all = productBoxes.reduce((b, x) => b.union(x.box), new THREE.Box3());
const solid = [{ min: all.min.toArray(), max: all.max.toArray() }];
const sizeOf = (id) => PROPS.find((p) => p.id === id).size;
const GAP = so.OBJECT_LIMITS.PROP_GAP;
const dropped = [];
const placedProps = () => dropped.map((d) => d.box);
for (const p of PROPS) {
  const r = so.placeProp({ solid, props: placedProps(), objectSize: sizeOf(p.id), floorY: 0, frontAz: 0, surface });
  dropped.push({ id: p.id, ...r });
}
check("all 4 props are placed ON the surface", dropped.every((d) => d.ok && d.where === "surface"));
check("each prop's base is exactly the grate top (y)", dropped.every((d) => d.position[1] === surface.max[1]));
check("each prop is fully inside the grate's x/z rectangle", dropped.every((d) => d.box.min[0] >= surface.min[0] - 1e-9 && d.box.max[0] <= surface.max[0] + 1e-9 && d.box.min[2] >= surface.min[2] - 1e-9 && d.box.max[2] <= surface.max[2] + 1e-9));
let pairOk = true;
let minGap = Infinity;
for (let i = 0; i < 4; i += 1) {
  for (let j = i + 1; j < 4; j += 1) {
    if (so.boxesOverlap(dropped[i].box, dropped[j].box)) pairOk = false;
    const gx = Math.max(dropped[i].box.min[0] - dropped[j].box.max[0], dropped[j].box.min[0] - dropped[i].box.max[0]);
    const gz = Math.max(dropped[i].box.min[2] - dropped[j].box.max[2], dropped[j].box.min[2] - dropped[i].box.max[2]);
    minGap = Math.min(minGap, Math.max(gx, gz));
  }
}
check("no two props overlap (6 pairs)", pairOk);
check(`they stand side by side along the grill with a gap of at least ${GAP * 100} cm (smallest ${(minGap * 100).toFixed(2)} cm)`, minGap >= GAP - 1e-9);
const gcz = (surface.min[2] + surface.max[2]) / 2;
const gcx = (surface.min[0] + surface.max[0]) / 2;
check(`the FIRST prop is centred on the grate along its long axis (z ${dropped[0].position[2].toFixed(4)} vs centre ${gcz.toFixed(4)}, within 1 cm)`, Math.abs(dropped[0].position[2] - gcz) <= 0.01);
check("all 4 props stand in one row centred across the grate (x = the grate's centre line)", dropped.every((d) => near(d.position[0], gcx, 1e-9)));
const gz = dropped.map((d) => d.position[2]);
check(`the row gathers in the middle of the grate (the 4 centres span ${((Math.max(...gz) - Math.min(...gz)) * 100).toFixed(1)} cm of the 124.5 cm, and their mean is within 6 cm of the centre), not at one end`, Math.max(...gz) - Math.min(...gz) < 0.5 && Math.abs(gz.reduce((x, y) => x + y, 0) / 4 - gcz) < 0.06);
check("they alternate sides of the centre (2nd on the +z side, 3rd on the -z side)", dropped[1].position[2] > gcz && dropped[2].position[2] < gcz);
check("pass 2 (a crowded grate) also starts nearest the centre: with the row full, the next prop is within 15 cm of the centre", (() => {
  const row = [];
  for (let i = 0; i < 40; i += 1) {
    const r = so.placeProp({ solid, props: row.map((q) => q.box), objectSize: [0.05, 0.05, 0.05], floorY: 0, frontAz: 0, surface });
    if (r.where !== "surface") break;
    row.push(r);
  }
  const first2 = row.slice(0, 2);
  return row.length > 10 && first2.every((q) => Math.abs(q.position[2] - gcz) < 0.15) && row.every((q, i) => i === 0 || !row.slice(0, i).some((o) => so.boxesOverlap(o.box, q.box)));
})());
// box level against every non-lid part, then true triangles
let boxClash = [];
for (const d of dropped) for (const { n, box } of productBoxes) {
  if (so.boxesOverlap(d.box, { min: box.min.toArray(), max: box.max.toArray() })) boxClash.push(`${d.id}~${n.name}`);
}
const ringParts = new Set(boxClash.map((s) => s.split("~")[1]));
console.log(`INFO  box-level overlaps with non-lid parts (ring-shaped parts whose box spans the opening): ${[...ringParts].join(", ") || "none"}`);
let triHits = 0;
let triPairs = 0;
for (const d of dropped) {
  const pg = files[d.id];
  const pn = meshNodes(pg)[0];
  // the stage re-bases a prop to its bottom centre: shift by the position minus the file's own bottom centre
  const pbox = meshBox(pg, pn);
  const off = [d.position[0] - (pbox.min.x + pbox.max.x) / 2, d.position[1] - pbox.min.y, d.position[2] - (pbox.min.z + pbox.max.z) / 2];
  const ptris = meshTris(pg, pn, off);
  const world = { min: [d.box.min[0] - 1e-6, d.box.min[1] - 1e-6, d.box.min[2] - 1e-6], max: [d.box.max[0] + 1e-6, d.box.max[1] + 1e-6, d.box.max[2] + 1e-6] };
  for (const { n, box } of productBoxes) {
    if (!boxHit(world, { min: box.min.toArray(), max: box.max.toArray() })) continue;
    const near3 = meshTris(bbq, n).filter((t) => boxHit(world, triBox(t)));
    for (const tp of ptris) {
      const tb = triBox(tp);
      for (const tq of near3) {
        if (!boxHit(tb, triBox(tq))) continue;
        triPairs += 1;
        if (trisIntersect(tp, tq)) triHits += 1;
      }
    }
  }
}
check(`TRUE triangle test: no prop triangle crosses any BBQ Bike triangle (${triPairs.toLocaleString("en-US")} close triangle pairs tested)`, triHits === 0, `${triHits} crossings`);
check("the same triangle test does catch a real crossing (a burger sunk 4 cm into the grate)", (() => {
  const pg = files["prop-burger"];
  const pn = meshNodes(pg)[0];
  const pbox = meshBox(pg, pn);
  const d = dropped[0];
  const off = [d.position[0] - (pbox.min.x + pbox.max.x) / 2, d.position[1] - pbox.min.y - 0.04, d.position[2] - (pbox.min.z + pbox.max.z) / 2];
  const ptris = meshTris(pg, pn, off);
  const gt = meshTris(bbq, grate);
  let hit = 0;
  for (const tp of ptris) {
    const tb = triBox(tp);
    for (const tq of gt) if (boxHit(tb, triBox(tq)) && trisIntersect(tp, tq)) hit += 1;
  }
  return hit > 0;
})());
// twelve props: they fill the grill, the rest go on the floor in front, nothing overlaps
const twelve = [];
const order = ["prop-burger", "prop-roll", "prop-wings", "prop-drumsticks"];
for (let i = 0; i < 12; i += 1) {
  const r = so.placeProp({ solid, props: twelve.map((t) => t.box), objectSize: sizeOf(order[i % 4]), floorY: 0, frontAz: 0, surface });
  twelve.push({ id: order[i % 4], ...r });
}
const onGrill = twelve.filter((t) => t.where === "surface").length;
let twelveOk = twelve.every((t) => t.ok);
for (let i = 0; i < 12; i += 1) {
  for (let j = i + 1; j < 12; j += 1) if (so.boxesOverlap(twelve[i].box, twelve[j].box)) twelveOk = false;
  if (twelve[i].where === "floor" && so.boxesOverlap(twelve[i].box, solid[0])) twelveOk = false;
}
check(`12 props: all placed, no overlap among them (${onGrill} on the grill, ${12 - onGrill} on the floor in front)`, twelveOk && onGrill >= 6);
check("a prop too big for the surface falls to the floor", so.placeProp({ solid, props: [], objectSize: [0.5, 0.1, 0.5], floorY: 0, frontAz: 0, surface }).where === "floor");

/* ============ the floor: in front of any other product (platform) ============ */
const coffee = readGlb(pub("/models/the_kop_refined.glb"));
const cn = meshNodes(coffee);
const cbox = cn.reduce((b, n) => b.union(meshBox(coffee, n)), new THREE.Box3());
const coffeeBox = { min: cbox.min.toArray(), max: cbox.max.toArray() };
const FRONT = { "coffee-bike": -90, "the-kop-main": 90, "bbq-bike": 0, "cessna-172": 0 };
check(`the Coffee Bike's front is -X (frontAz -90) and it stands on y = ${cbox.min.y.toFixed(3)}`, PRODUCTS.find((x) => x.id === "coffee-bike").frontAz === FRONT["coffee-bike"]);
const onFloor = [];
for (const p of PROPS) {
  const r = so.placeProp({ solid: [coffeeBox], props: onFloor.map((o) => o.box), objectSize: sizeOf(p.id), floorY: cbox.min.y, frontAz: FRONT["coffee-bike"] });
  onFloor.push({ id: p.id, ...r });
}
check("Coffee Bike: all 4 props land on the floor (where = floor)", onFloor.every((o) => o.ok && o.where === "floor"));
check("Coffee Bike: every base is the floor height", onFloor.every((o) => o.position[1] === cbox.min.y));
check("Coffee Bike: every prop is in FRONT of the bike (beyond its -X face, the side its front faces)", onFloor.every((o) => o.box.max[0] <= coffeeBox.min[0] - GAP + 1e-9));
let floorOk = true;
for (let i = 0; i < 4; i += 1) {
  if (so.boxesOverlap(onFloor[i].box, coffeeBox)) floorOk = false;
  for (let j = i + 1; j < 4; j += 1) if (so.boxesOverlap(onFloor[i].box, onFloor[j].box)) floorOk = false;
}
check("Coffee Bike: no prop overlaps the bike or another prop", floorOk);
check("Coffee Bike: the props form a row across the front, centred on the bike", (() => {
  const mid = (coffeeBox.min[2] + coffeeBox.max[2]) / 2;
  const zs = onFloor.map((o) => (o.box.min[2] + o.box.max[2]) / 2);
  return Math.abs(zs.reduce((a, b) => a + b, 0) / 4 - mid) < 0.25;
})());
for (const az of [0, 90, 180, -90, 45]) {
  const placed = [];
  let ok = true;
  for (let i = 0; i < 12; i += 1) {
    const r = so.placeProp({ solid: [coffeeBox], props: placed.map((o) => o.box), objectSize: sizeOf(order[i % 4]), floorY: 0, frontAz: az });
    if (!r.ok) ok = false;
    else placed.push(r);
  }
  for (let i = 0; i < placed.length && ok; i += 1) {
    if (so.boxesOverlap(placed[i].box, coffeeBox)) ok = false;
    for (let j = i + 1; j < placed.length; j += 1) if (so.boxesOverlap(placed[i].box, placed[j].box)) ok = false;
  }
  check(`12 props in front at frontAz ${az}: placed, no overlap with the product or each other`, ok && placed.length === 12);
}
check("placeProp refuses bad input without throwing", !so.placeProp().ok && !so.placeProp({ solid: [], objectSize: [1, 1, 1], floorY: 0 }).ok && !so.placeProp({ solid: [coffeeBox], objectSize: [1, -1, 1], floorY: 0 }).ok && !so.placeProp({ solid: [coffeeBox], objectSize: [1, 1, 1], floorY: NaN }).ok && !so.placeProp({ solid: [coffeeBox], objectSize: [1, 1, 1], floorY: 0, surface: { min: 1 } }).ok);
check("placeProp is deterministic", json(so.placeProp({ solid, props: [], objectSize: sizeOf("prop-burger"), floorY: 0, surface })) === json(so.placeProp({ solid, props: [], objectSize: sizeOf("prop-burger"), floorY: 0, surface })));

/* ====================== the grill lid opens while props stand on the grate ====================== */
const sbox = { min: surface.min, max: surface.max };
const LID = PRODUCTS.find((x) => x.id === "bbq-bike").propSurface.lid;
const lidMeshes = bbqNodes.filter(inLid);
const hingeNode = bbqNodes.find((n) => n.name === LID.hinge);
const hingeBox = meshBox(bbq, hingeNode);
const hingeC = hingeBox.getCenter(new THREE.Vector3());
const shellBox = meshBox(bbq, lidMeshes.find((n) => n.name === "Lid_Main_Shell"));
check(`the real hinge is the mesh ${LID.hinge}: a pin along z (${((hingeBox.max.z - hingeBox.min.z) * 100).toFixed(0)} cm long, under 2 cm thick) at x ${hingeC.x.toFixed(3)}, y ${hingeC.y.toFixed(3)}, on the lid's bike-side edge`, hingeBox.max.z - hingeBox.min.z > 1 && hingeBox.max.x - hingeBox.min.x < 0.02 && hingeBox.max.y - hingeBox.min.y < 0.02 && shellBox.min.x - hingeC.x < 0.02 && Math.abs(shellBox.min.y - hingeC.y) < 0.02);
const rotAbout = (deg) => new THREE.Matrix4().makeTranslation(hingeC.x, hingeC.y, 0).multiply(new THREE.Matrix4().makeRotationZ((deg * Math.PI) / 180)).multiply(new THREE.Matrix4().makeTranslation(-hingeC.x, -hingeC.y, 0));
const lidHits = (deg, others) => {
  const R = rotAbout(deg);
  const hits = {};
  for (const l of lidMeshes) {
    const ln = { ...l, matrix: R.clone().multiply(l.matrix) };
    const lb = meshBox(bbq, ln);
    const lbox = { min: lb.min.toArray(), max: lb.max.toArray() };
    const lt = meshTris(bbq, ln);
    for (const o of others) {
      if (!boxHit(lbox, { min: o.box.min.toArray(), max: o.box.max.toArray() })) continue;
      if (!o.tris) o.tris = meshTris(bbq, o.n);
      const cand = o.tris.filter((t) => boxHit(lbox, triBox(t)));
      for (const a of lt) {
        const tb = triBox(a);
        if (cand.some((b) => boxHit(tb, triBox(b)) && trisIntersect(a, b))) {
          hits[`${l.name}~${o.n.name}`] = true;
          break;
        }
      }
    }
  }
  return Object.keys(hits);
};
const everything = productBoxes.map((x) => ({ ...x }));
const openHits = lidHits(LID.angleDeg, everything);
check(`TRUE triangle test: the lid opened ${LID.angleDeg} deg (all 7 lid meshes) crosses no triangle of the sign panel, chimney, drawers, bike, sidecar or anything else in the BBQ Bike`, openHits.length === 0, openHits.join(","));
check("... also at 80 and 82 deg (the smallest opening allowed is 80)", [80, 82].every((d) => lidHits(d, everything).length === 0));
const hit100 = lidHits(100, everything);
check("100 deg is NOT clear (the lid meets the bike's left mirror), which is why the angle is 85, not 100", hit100.length > 0 && hit100.every((h) => /Mirror_L$/.test(h)), hit100.join(","));
check("87 deg is still clear and 88 deg hits Mirror_L: 85 keeps a margin", lidHits(87, everything).length === 0 && lidHits(88, everything).length > 0 && LID.angleDeg >= 80 && LID.angleDeg <= 87);
check("the lid turns about the hinge line: the pin centre does not move and the lid's hinge edge stays within 1.5 cm of it", (() => {
  const R = rotAbout(LID.angleDeg);
  const v = new THREE.Vector3(shellBox.min.x, shellBox.min.y, 0).applyMatrix4(R);
  return hingeC.clone().applyMatrix4(R).distanceTo(hingeC) < 1e-12 && v.distanceTo(new THREE.Vector3(hingeC.x, hingeC.y, 0)) < 0.015;
})());
check("opened, the lid is clear of the four props on the grill (triangles)", (() => {
  const R = rotAbout(LID.angleDeg);
  for (const d of dropped) {
    const pg = files[d.id];
    const pn = meshNodes(pg)[0];
    const pbox = meshBox(pg, pn);
    const off = [d.position[0] - (pbox.min.x + pbox.max.x) / 2, d.position[1] - pbox.min.y, d.position[2] - (pbox.min.z + pbox.max.z) / 2];
    const pt = meshTris(pg, pn, off);
    for (const l of lidMeshes) {
      const lt = meshTris(bbq, { ...l, matrix: R.clone().multiply(l.matrix) });
      for (const a of lt) {
        const ta = triBox(a);
        if (!boxHit(ta, d.box)) continue;
        for (const b of pt) if (boxHit(ta, triBox(b)) && trisIntersect(a, b)) return false;
      }
    }
  }
  return true;
})());
// the derived rule (what the stage applies on every layout change)
const lidStore = createGarageStore();
lidStore.startLayout({ assetId: "bbq-bike", name: "x" });
const lidOpen = () => so.lidShouldOpen(lidStore.getLayout().items, sbox);
const gTop = { x: 0.8144, y: surface.max[1], z: -0.4, rx: 0, ry: 0, rz: 0, s: 1 };
check("no props: the lid is closed", lidOpen() === false);
lidStore.addItem({ assetId: "prop-burger", transform: gTop });
check("the first prop lands on the grill: the lid opens", lidOpen() === true);
lidStore.addItem({ assetId: "prop-roll", transform: { ...gTop, z: -0.2 } });
lidStore.removeItem("i1");
check("a second grill prop is there, the first is removed: still open", lidOpen() === true);
lidStore.removeItem("i2");
check("the last grill prop is removed: the lid closes", lidOpen() === false);
check("Undo of the removal reopens it and Redo closes it again (undo works both ways)", lidStore.undo().ok && lidOpen() === true && lidStore.redo().ok && lidOpen() === false);
for (let i = 0; i < 4; i += 1) lidStore.undo();
check("Undo all the way back: no props, closed", lidOpen() === false && lidStore.getLayout().items.length === 1);
lidStore.redo();
check("Redo of the first add: open", lidOpen() === true);
check("a prop on the floor does not open the lid", so.lidShouldOpen([{ itemId: "i1", assetId: "prop-burger", transform: { ...gTop, y: 0 } }], sbox) === false);
check("a prop beside the grate (x outside) does not open it", so.lidShouldOpen([{ itemId: "i1", assetId: "prop-burger", transform: { ...gTop, x: 1.5 } }], sbox) === false);
check("a hidden grill prop does not hold the lid open", so.lidShouldOpen([{ itemId: "i1", assetId: "prop-burger", hidden: true, transform: gTop }], sbox) === false);
check("a Cessna on the grill does not open it, and a product with no surface never opens", so.lidShouldOpen([{ itemId: "i1", assetId: "cessna-172", transform: gTop }], sbox) === false && so.lidShouldOpen([{ itemId: "i1", assetId: "prop-burger", transform: gTop }], null) === false);
check("moving the last grill prop off the grate closes the lid (the gizmo's own command), Undo reopens it", (() => {
  lidStore.setItemTransform("i1", { y: 0.5 });
  const closed = lidOpen() === false;
  lidStore.undo();
  return closed && lidOpen() === true;
})());
lidStore.startLayout({ assetId: "bbq-bike", name: "x" });
check("Reset / a fresh layout (startLayout): no props, the lid is closed", lidOpen() === false);
check("closing is exact: the lid mesh gets its base pose back bit for bit after opening and closing 200 times", (() => {
  const q0 = new THREE.Quaternion(0.1, 0.2, 0.3, 0.9273618495495703).normalize();
  const mesh = new THREE.Object3D();
  const D = rotAbout(LID.angleDeg);
  const pose = () => {
    mesh.position.set(0.814, 1.344, 0.3);
    mesh.quaternion.copy(q0);
    mesh.scale.set(1, 1, 1);
  };
  pose();
  const rest = json([mesh.position.toArray(), mesh.quaternion.toArray(), mesh.scale.toArray()]);
  for (let i = 0; i < 200; i += 1) {
    pose();
    new THREE.Matrix4().compose(mesh.position, mesh.quaternion, mesh.scale).premultiply(D).decompose(mesh.position, mesh.quaternion, mesh.scale);
    pose();
  }
  return json([mesh.position.toArray(), mesh.quaternion.toArray(), mesh.scale.toArray()]) === rest;
})());
check("the stage applies the open lid only inside applyOverrides, derived from the layout: no stored lid state, no hiding", (() => {
  const code = readFileSync(new URL("../src/components/StudioCanvas.jsx", import.meta.url), "utf8");
  return /lidShouldOpen\(/.test(code) && !/clearPropSurface/.test(code) && !/propSurface\.clear/.test(code);
})());

check("the lid cache is dropped whenever the parsed model or its part index changes (an effect on [modelScene, partIndex], declared before lidDeltas and the layout effect that reads it)", (() => {
  const code = readFileSync(new URL("../src/components/StudioCanvas.jsx", import.meta.url), "utf8").replace(/\r/g, "");
  const clear = code.indexOf("lidRef.current = null;\n  }, [modelScene, partIndex]);");
  return clear > 0 && clear < code.indexOf("const lidDeltas = useCallback(") && code.indexOf("const lidDeltas = useCallback(") < code.indexOf("const applyOverrides = () =>");
})());

/* ====================== a prop is an ordinary Garage object ====================== */
const store = createGarageStore();
store.startLayout({ assetId: "bbq-bike", name: "BBQ Bike" });
const burgerAt = { x: 0.8144, y: 1.209, z: -0.42, rx: 0, ry: 0, rz: 0, s: 1 };
let r = store.addItem({ assetId: "prop-burger", transform: burgerAt });
check("addItem takes a prop id like any asset (item i1, one commit)", r.ok && r.itemId === "i1" && store.getLayout().items.length === 2);
check("the add is one undo step, and undo removes the prop", store.getSnapshot().undoDepth === 1 && store.undo().ok && store.getLayout().items.length === 1 && store.redo().ok && store.getLayout().items.length === 2);
check("it is selectable (whole object, object~0)", store.select([{ itemId: "i1", partId: so.OBJECT_PART_ID }]).ok && store.getSnapshot().selectionCount === 1);
const mv = store.setItemTransform("i1", { x: 0.9, z: -0.3, ry: 30 });
check("it moves and turns (the gizmo's own command), one undo step", mv.ok && store.getLayout().items[1].transform.x === 0.9 && store.getLayout().items[1].transform.ry === 30 && store.getSnapshot().undoDepth === 2);
check("it can be hidden and shown", store.setItemHidden("i1", true).ok && store.getLayout().items[1].hidden === true && store.setItemHidden("i1", false).ok);
r = store.removeItem("i1");
check("it is deleted in one step (selection cleared), and undo brings it back at its moved pose", r.ok && store.getLayout().items.length === 1 && store.getSnapshot().selectionCount === 0 && store.undo().ok && store.getLayout().items[1].transform.x === 0.9);
r = store.addItem({ assetId: "prop-roll", transform: burgerAt, itemId: "i7", hidden: true });
check("addItem honours an item id and a hidden flag (session restore)", r.ok && r.itemId === "i7" && store.getLayout().items.find((i) => i.itemId === "i7").hidden === true);
const store2 = createGarageStore();
store2.startLayout({ assetId: "bbq-bike", name: "x" });
store2.addItem({ assetId: "prop-roll", transform: burgerAt });
check("a taken id falls back to the first free one", store2.addItem({ assetId: "prop-roll", transform: burgerAt, itemId: "i1" }).itemId === "i2" && store2.addItem({ assetId: "prop-roll", transform: burgerAt, itemId: "bad" }).itemId === "i3" && store2.addItem({ assetId: "prop-roll", transform: burgerAt, itemId: "i0" }).itemId === "i4");
check("addItem without the new fields is unchanged (next free id, not hidden)", (() => { const s = createGarageStore(); s.startLayout({ assetId: "a", name: "x" }); const q = s.addItem({ assetId: "b" }); return q.itemId === "i1" && s.getLayout().items[1].hidden === false; })());
// a part override (the lid hide) is one commit
const lidOv = { "BBQ_Unit~0/BBQ_Grill_Unit~0/Lid_Main~0/Lid_Main_Shell~0": { visible: false }, "BBQ_Unit~0/BBQ_Grill_Unit~0/Lid_Rear~0/Lid_Rear_Shell~0": { visible: false } };
const store3 = createGarageStore();
store3.startLayout({ assetId: "bbq-bike", name: "x" });
const before = store3.getSnapshot().undoDepth;
check("hiding the lid groups is ONE undo step (loadPartsOverrides) and keeps the primary's other fields", store3.loadPartsOverrides("i0", lidOv).ok && store3.getSnapshot().undoDepth === before + 1 && Object.keys(store3.getLayout().items[0].parts).length === 2);
// layouts with props
const baseLayout = (() => { const s = createGarageStore(); s.startLayout({ assetId: "bbq-bike", name: "p" }); return s.getLayout(); })();
const envOf = (items) => ({ kind: ll.ENVELOPE_KIND, formatVersion: 2, productId: "bbq-bike", name: "p", savedAt: "2026-10-07T00:00:00.000Z", layout: baseLayout, objects: items });
const oneObj = (assetId, i = 0) => ({ assetId, source: "builtin", name: assetId, transform: { x: i * 0.1, y: 1.209, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }, hidden: false });
const has = () => true;
const res12 = ll.resolveLoad(envOf(Array.from({ length: 12 }, (_, i) => oneObj(PROPS[i % 4].id, i))), "bbq-bike", has, (id) => !!getAsset(id));
check("a layout with 12 props loads (their ids are known assets)", res12.ok === true && res12.objects.length === 12, res12.reason || "");
const res13 = ll.resolveLoad(envOf(Array.from({ length: 13 }, (_, i) => oneObj(PROPS[i % 4].id, i))), "bbq-bike", has, (id) => !!getAsset(id));
check("a layout with 13 props is refused as a whole (max-props, nothing loaded)", !res13.ok && res13.reason === "max-props" && res13.count === 13 && /maximum is 12/.test(res13.message));
const res5p12 = ll.resolveLoad(envOf([...Array.from({ length: 5 }, (_, i) => oneObj("cessna-172", i)), ...Array.from({ length: 12 }, (_, i) => oneObj(PROPS[i % 4].id, i))]), "bbq-bike", has, (id) => !!getAsset(id));
check("5 objects + 12 props load together (props do not count toward the 5)", res5p12.ok === true && res5p12.objects.length === 17);
const res6 = ll.resolveLoad(envOf([...Array.from({ length: 6 }, (_, i) => oneObj("cessna-172", i)), oneObj("prop-roll")]), "bbq-bike", has, (id) => !!getAsset(id));
check("6 non-prop objects are still refused (max-objects, as before)", !res6.ok && res6.reason === "max-objects" && res6.count === 6);
check("a layout with props round-trips through serialize / validate", (() => {
  const s = createGarageStore();
  s.startLayout({ assetId: "bbq-bike", name: "p" });
  for (const p of PROPS) s.addItem({ assetId: p.id, transform: burgerAt });
  const v = validateLayout(JSON.parse(serializeLayout(s.getLayout())));
  return v.ok && v.layout.items.filter((i) => isPropId(i.assetId)).length === 4;
})());

/* ============================ the session ============================ */
const sessStore = createGarageStore();
sessStore.startLayout({ assetId: "bbq-bike", name: "x" });
sessStore.addItem({ assetId: "cessna-172", transform: burgerAt });
for (const [k, p] of PROPS.entries()) sessStore.addItem({ assetId: p.id, transform: { ...burgerAt, z: -0.4 + k * 0.2, ry: k * 15 } });
sessStore.setItemHidden("i3", true);
const saved = propsForSession(sessStore.getLayout());
check("propsForSession lists only the props (not the cessna), in layout order, with item ids", saved.length === 4 && json(saved.map((s) => s.itemId)) === json(["i2", "i3", "i4", "i5"]) && json(saved.map((s) => s.assetId)) === json(PROPS.map((p) => p.id)));
check("it carries the exact pose, the hidden flag ", saved[1].hidden === true && saved[0].hidden === false && saved[3].transform.ry === 45 && near(saved[1].transform.z, -0.2));
const back = parseSessionProps(JSON.parse(JSON.stringify(saved)));
check("a session survives JSON and parses back to the same list", json(back) === json(saved));
check("an OLD session (no props key) parses to null: the scene's props are left alone", parseSessionProps(undefined) === null && parseSessionProps(null) === null && parseSessionProps("x") === null && parseSessionProps({}) === null);
check("an empty list is a real answer (the session had no props): [] not null", json(parseSessionProps([])) === "[]");
const junk = parseSessionProps([...saved, null, 5, { assetId: "cessna-172", itemId: "i9", transform: burgerAt }, { ...saved[0], itemId: "i0" }, { ...saved[0], itemId: "bad" }, { ...saved[1] }, { ...saved[0], itemId: "i11", transform: { ...burgerAt, s: 0 } }, { ...saved[0], itemId: "i12", transform: { ...burgerAt, x: NaN } }, { ...saved[0], itemId: "i13", transform: { x: 1 } }]);
check("junk entries are dropped (not a prop, i0, bad id, duplicate id, zero scale, NaN, missing fields)", junk.length === 4, String(junk.length));
check("a session with 20 props keeps 12", parseSessionProps(Array.from({ length: 20 }, (_, i) => ({ ...saved[0], itemId: `i${i + 1}` }))).length === 12);
check("a parsed prop carries only the known fields", Object.keys(parseSessionProps([{ ...saved[0], evil: 1, transform: { ...burgerAt, extra: 2 } }])[0]).sort().join() === "assetId,hidden,itemId,transform" && Object.keys(parseSessionProps([saved[0]])[0].transform).sort().join() === "rx,ry,rz,s,x,y,z");
const src = readFileSync(new URL("../src/garage/propsSession.js", import.meta.url), "utf8");
check("propsSession.js has no import from three, react or the stage", !/from\s+["'](three|react)["']/.test(src) && !/StudioCanvas/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")));

/* ====================== Spin cycle on a prop (keyedScene) ====================== */
const world = new THREE.Group();
const product = new THREE.Group();
const model = new THREE.Group();
product.add(model);
world.add(product);
const objects = new THREE.Group();
product.add(objects);
const burger = PROPS[0];
const anchor = new THREE.Group();
const inner = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(...burger.size));
body.position.set(0, burger.size[1] / 2, 0);
inner.add(body);
anchor.add(inner);
anchor.position.set(0.8144, 1.209, -0.42);
objects.add(anchor);
world.updateMatrixWorld(true);
const rest = { p: anchor.position.toArray(), q: anchor.quaternion.toArray(), s: anchor.scale.toArray() };
const spin = C.addCycle([], { type: "spin", target: "i1", assetId: burger.id, rpm: 30 });
check("a Spin cycle on a prop (item i1, asset prop-burger) is accepted", spin.ok && spin.cycles[0].target === "i1" && spin.cycles[0].assetId === burger.id && spin.cycles[0].roll === false);
check("... and is live when the prop is in the scene, and not when it is gone", C.isCycleLive(spin.cycles[0], { productId: "bbq-bike", items: [{ itemId: "i1", assetId: burger.id }] }) && !C.isCycleLive(spin.cycles[0], { productId: "bbq-bike", items: [] }));
const seq = R.setShotCycles([{ move: "slide", startView: "Front", durationS: 4 }], 0, spin.cycles).seq;
const keyed = prepareKeyed({
  anim: R.buildReelAnim(seq, 30),
  productId: "bbq-bike",
  productNode: product,
  findObject: (id, asset) => (id === "i1" && asset === burger.id ? anchor : null),
  restFit: { center: new THREE.Vector3(0, 0.8, 0), size: new THREE.Vector3(2, 1.6, 2), footprintRadius: 1.4 },
  modelNode: model,
  frontAz: 0,
});
check("prepareKeyed finds the prop's node for the cycle", !!keyed && !!keyed.cycles && keyed.cycles.perShot[0].length === 1);
const centre = () => { world.updateMatrixWorld(true); return new THREE.Box3().setFromObject(anchor).getCenter(new THREE.Vector3()); };
const c0 = centre();
applyKeyed(keyed, 0, 0);
check("at the shot start (phase 0) the prop is at rest", anchor.position.toArray().every((v, i) => near(v, rest.p[i], 1e-12)) && near(anchor.quaternion.w, 1, 1e-12));
const angleAt = (t) => { applyKeyed(keyed, 0, t); return 2 * Math.acos(Math.min(1, Math.abs(anchor.quaternion.w))); };
check("Spin 30 rpm: a quarter turn at 0.5 s, a half turn at 1 s", near(angleAt(0.5), Math.PI / 2, 1e-9) && near(angleAt(1), Math.PI, 1e-9));
applyKeyed(keyed, 0, 0.5);
const c1 = centre();
check("the prop turns about its own centre (box centre stays put while it plays)", c1.distanceTo(c0) < 1e-9, c1.distanceTo(c0).toExponential(2));
check("it turns about the vertical axis (a burger spins like a plate)", near(Math.abs(anchor.quaternion.y), Math.sin(Math.PI / 4), 1e-9) && near(anchor.quaternion.x, 0, 1e-12) && near(anchor.quaternion.z, 0, 1e-12));
restoreKeyed(keyed);
check("restore puts the prop back exactly (position, rotation, scale)", json([anchor.position.toArray(), anchor.quaternion.toArray(), anchor.scale.toArray()]) === json([rest.p, rest.q, rest.s]));
const seqGone = R.setShotCycles([{ move: "slide", startView: "Front", durationS: 4 }], 0, spin.cycles).seq;
check("a Spin on a prop that was deleted is ignored (nothing to play)", prepareKeyed({ anim: R.buildReelAnim(seqGone, 30), productId: "bbq-bike", productNode: product, findObject: () => null, restFit: { center: new THREE.Vector3(), size: new THREE.Vector3(1, 1, 1), footprintRadius: 1 }, modelNode: model, frontAz: 0 }) === null);

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
