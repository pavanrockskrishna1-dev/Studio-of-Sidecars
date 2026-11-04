// Removes the centre stand from the BBQ Bike model. The stand is not its own mesh:
// it is welded into the Engine_Frame mesh, so we delete the triangles whose centre
// lies inside a world-space box (x0,x1,y0,y1,z0,z1) and then drop any small floating
// islands left behind inside a slightly larger box.
//   node scripts/remove-bike-stand.mjs in.glb out.glb [x0,x1,y0,y1,z0,z1] [--report]
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const [inFile, outFile, boxArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const report = process.argv.includes("--report");
const box = (boxArg || "-0.17,0.17,0,0.27,-0.10,0.065").split(",").map(Number);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inFile);
const node = doc.getRoot().listNodes().find((n) => n.getName() === "Engine_Frame" && n.getMesh());
if (!node) throw new Error("Engine_Frame not found");
const prim = node.getMesh().listPrimitives()[0];
const pos = prim.getAttribute("POSITION"), idxAcc = prim.getIndices();
const m = node.getWorldMatrix();
const P = new Float32Array(pos.getCount() * 3);
const v = [0, 0, 0];
for (let i = 0; i < pos.getCount(); i++) {
  pos.getElement(i, v);
  P[i * 3] = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12];
  P[i * 3 + 1] = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13];
  P[i * 3 + 2] = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14];
}
const idx = idxAcc.getArray();
const nt = idx.length / 3;
const cen = (t) => { const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2]; return [0, 1, 2].map((d) => (P[a * 3 + d] + P[b * 3 + d] + P[c * 3 + d]) / 3); };
const inBox = (c, b) => c[0] >= b[0] && c[0] <= b[1] && c[1] >= b[2] && c[1] <= b[3] && c[2] >= b[4] && c[2] <= b[5];
if (report) {
  const wide = [box[0], box[1], 0, 0.6, box[4], box[5]];
  const bands = {};
  for (let t = 0; t < nt; t++) { const c = cen(t); if (inBox(c, wide)) { const k = (Math.floor(c[1] / 0.03) * 0.03).toFixed(2); bands[k] = (bands[k] || 0) + 1; } }
  console.log("triangles in the xz-box by height band:", JSON.stringify(bands));
}
const keep = [];
let removed = 0;
for (let t = 0; t < nt; t++) { if (inBox(cen(t), box)) removed++; else keep.push(t); }
// drop small floating islands left behind near the box
const key = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]].map((q) => Math.round(q * 2000)).join(",");
const weld = new Map(), rep = new Int32Array(pos.getCount());
for (let i = 0; i < pos.getCount(); i++) { const k = key(i); if (!weld.has(k)) weld.set(k, i); rep[i] = weld.get(k); }
const par = new Int32Array(pos.getCount()).map((_, i) => i);
const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
for (const t of keep) { const a = find(rep[idx[t * 3]]), b = find(rep[idx[t * 3 + 1]]), c = find(rep[idx[t * 3 + 2]]); par[a] = b; par[find(b)] = find(c); }
const size = new Map();
for (const t of keep) { const r = find(rep[idx[t * 3]]); size.set(r, (size.get(r) || 0) + 1); }
const near = [box[0] - 0.03, box[1] + 0.03, 0, box[3] + 0.08, box[4] - 0.03, box[5] + 0.03];
const final = [];
let islands = 0;
for (const t of keep) {
  const r = find(rep[idx[t * 3]]);
  if (size.get(r) < 400 && inBox(cen(t), near)) { islands++; continue; }
  final.push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]);
}
console.log(`removed ${removed} triangles in the box + ${islands} floating triangles; kept ${final.length / 3} of ${nt}`);
if (outFile && !report) {
  idxAcc.setArray(new idx.constructor(final));
  await io.write(outFile, doc);
  console.log("wrote", outFile);
}
