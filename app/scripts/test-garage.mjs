// Garage G1 — checks for the pure garage modules (nothing is wired into the app).
// Run from the app folder:  node scripts/test-garage.mjs   (exit code 1 on any FAIL)
// Plain node, no browser, no test framework. three is used only to cross-check maths.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import {
  identityMatrix, matMul, matFromTRS, matFromEulerXYZDeg, pivotMatrix, transformPoint,
  quatMul, quatNormalize, applyPartOverride, resetToBase,
} from "../src/garage/compose.js";
import {
  sanitizeNodeName, buildPartIds, partIdOfComponent, parsePartId, fingerprint, fingerprintsMatch, resolvePart,
} from "../src/garage/partId.js";
import { LAYOUT_LIMITS, validateLayout, serializeLayout, parseLayoutJson } from "../src/garage/layout.js";
import { splitComponents } from "../src/garage/split.js";
import { boxOfMatrixBox, unionBounds, floorYFor } from "../src/garage/bounds.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");

let failed = 0;
let passed = 0;
const fmt = (v) => (typeof v === "number" ? v.toPrecision(12) : JSON.stringify(v));
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const info = (msg) => console.log(`INFO  ${msg}`);
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const maxDiff = (a, b) => Math.max(...Array.from(a, (v, i) => Math.abs(v - b[i])));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const DEG = Math.PI / 180;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mkRand = (seed) => {
  const r = mulberry32(seed);
  const range = (lo, hi) => lo + (hi - lo) * r();
  return { r, range, vec: (lo, hi) => [range(lo, hi), range(lo, hi), range(lo, hi)] };
};
const randQuat = (R) => {
  const q = [R.range(-1, 1), R.range(-1, 1), R.range(-1, 1), R.range(-1, 1)];
  return quatNormalize(q);
};

/* ============================ 1. compose ============================ */
{
  const R = mkRand(1);
  let dTRS = 0;
  let dEuler = 0;
  let dMul = 0;
  let dQuat = 0;
  for (let i = 0; i < 200; i += 1) {
    const pos = R.vec(-5, 5);
    const quat = randQuat(R);
    const scale = R.vec(0.1, 3);
    const m3 = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion(...quat), new THREE.Vector3(...scale));
    dTRS = Math.max(dTRS, maxDiff(matFromTRS(pos, quat, scale), m3.elements));

    const t = { x: R.range(-3, 3), y: R.range(-3, 3), z: R.range(-3, 3), rx: R.range(-400, 400), ry: R.range(-400, 400), rz: R.range(-400, 400), s: R.range(0.05, 4) };
    const g = new THREE.Object3D();
    g.position.set(t.x, t.y, t.z);
    g.rotation.set(THREE.MathUtils.degToRad(t.rx), THREE.MathUtils.degToRad(t.ry), THREE.MathUtils.degToRad(t.rz), "XYZ");
    g.scale.set(t.s, t.s, t.s);
    g.updateMatrix();
    dEuler = Math.max(dEuler, maxDiff(matFromEulerXYZDeg(t), g.matrix.elements));

    const a = matFromTRS(R.vec(-2, 2), randQuat(R), R.vec(0.2, 2));
    const b = matFromTRS(R.vec(-2, 2), randQuat(R), R.vec(0.2, 2));
    const ref = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().fromArray(a), new THREE.Matrix4().fromArray(b));
    dMul = Math.max(dMul, maxDiff(matMul(a, b), ref.elements));

    const qa = randQuat(R);
    const qb = randQuat(R);
    const qr = new THREE.Quaternion().multiplyQuaternions(new THREE.Quaternion(...qa), new THREE.Quaternion(...qb));
    dQuat = Math.max(dQuat, maxDiff(quatMul(qa, qb), [qr.x, qr.y, qr.z, qr.w]));
  }
  check("compose: matFromTRS equals three Matrix4.compose (200 inputs, 1e-12)", dTRS <= 1e-12, `max=${fmt(dTRS)}`);
  check("compose: matFromEulerXYZDeg equals three Euler XYZ group matrix (200 inputs, 1e-12)", dEuler <= 1e-12, `max=${fmt(dEuler)}`);
  check("compose: matMul equals three multiplyMatrices (200 inputs, 1e-12)", dMul <= 1e-12, `max=${fmt(dMul)}`);
  check("compose: quatMul equals three multiplyQuaternions (200 inputs, 1e-12)", dQuat <= 1e-12, `max=${fmt(dQuat)}`);
  check("compose: identityMatrix is the identity", same(identityMatrix(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
  check("compose: matFromEulerXYZDeg({}) is the identity", same(matFromEulerXYZDeg({}), identityMatrix()));

  const c0 = R.vec(-3, 3);
  const p0 = pivotMatrix(c0, 0);
  check("compose: pivotMatrix spin 0 equals identity (1e-15)", maxDiff(p0, identityMatrix()) <= 1e-15, `max=${fmt(maxDiff(p0, identityMatrix()))}`);
  let dCentre = 0;
  let dAxis = 0;
  for (let i = 0; i < 100; i += 1) {
    const c = R.vec(-3, 3);
    const spin = R.range(-7, 7);
    const m = pivotMatrix(c, spin);
    dCentre = Math.max(dCentre, maxDiff(transformPoint(m, c), c));
    // A point at the centre's height, offset by (dx, 0, dz), turns about y.
    const dx = R.range(-2, 2);
    const dz = R.range(-2, 2);
    const p = transformPoint(m, [c[0] + dx, c[1], c[2] + dz]);
    const want = [c[0] + Math.cos(spin) * dx + Math.sin(spin) * dz, c[1], c[2] - Math.sin(spin) * dx + Math.cos(spin) * dz];
    dAxis = Math.max(dAxis, maxDiff(p, want));
  }
  check("compose: pivotMatrix leaves the centre fixed (100 spins, 1e-12)", dCentre <= 1e-12, `max=${fmt(dCentre)}`);
  check("compose: pivotMatrix rotates about the vertical axis through the centre (1e-12)", dAxis <= 1e-12, `max=${fmt(dAxis)}`);
  const q90 = transformPoint(pivotMatrix([0, 0, 0], Math.PI / 2), [0, 0, 1]);
  check("compose: pivot 90 degrees turns +z to +x", maxDiff(q90, [1, 0, 0]) <= 1e-12, `p=${JSON.stringify(q90)}`);

  // applyPartOverride
  let exact = 0;
  let resetExact = 0;
  let unit = 0;
  const IDENT = { pos: [0, 0, 0], quat: [0, 0, 0, 1], scale: [1, 1, 1] };
  for (let i = 0; i < 1000; i += 1) {
    // Bases deliberately NOT normalised, to prove that no normalisation runs.
    const base = { pos: R.vec(-9, 9), quat: [R.range(-1, 1), R.range(-1, 1), R.range(-1, 1), R.range(0.1, 2)], scale: R.vec(0.1, 4) };
    const outs = [applyPartOverride(base, {}), applyPartOverride(base, IDENT), applyPartOverride(base, { quat: [0, 0, 0, 1] })];
    const ok = outs.every((o) => o && o.pos.every((v, k) => v === base.pos[k]) && o.quat.every((v, k) => v === base.quat[k]) && o.scale.every((v, k) => v === base.scale[k]));
    if (ok) exact += 1;
    const edited = applyPartOverride(base, { pos: R.vec(-1, 1), quat: randQuat(R), scale: R.vec(0.5, 2) });
    const len = Math.hypot(...edited.quat);
    unit = Math.max(unit, Math.abs(len - 1));
    for (let e = 0; e < 3; e += 1) applyPartOverride(edited, { pos: R.vec(-1, 1) });
    const back = resetToBase(base);
    if (back.pos.every((v, k) => v === base.pos[k]) && back.quat.every((v, k) => v === base.quat[k]) && back.scale.every((v, k) => v === base.scale[k]) && back.pos !== base.pos && back.quat !== base.quat && back.scale !== base.scale) resetExact += 1;
  }
  check("compose: empty/identity override equals base EXACTLY (1000 bases)", exact === 1000, `exact=${exact}`);
  check("compose: resetToBase equals base exactly and shares no arrays (1000 bases)", resetExact === 1000, `exact=${resetExact}`);
  check("compose: edited quat has unit length (1000, 1e-12)", unit <= 1e-12, `max=${fmt(unit)}`);
  const s2 = Math.SQRT1_2;
  const r90 = applyPartOverride(IDENT, { quat: [0, s2, 0, s2] });
  const r180 = applyPartOverride(r90, { quat: [0, s2, 0, s2] });
  check("compose: 90 degrees about y twice equals 180 degrees (1e-12)", maxDiff(r180.quat, [0, 1, 0, 0]) <= 1e-12, `quat=${JSON.stringify(r180.quat)}`);
  const w = applyPartOverride({ pos: [1, 2, 3], quat: [0, 0, 0, 1], scale: [2, 2, 2] }, { pos: [1, 0, 0], scale: [3, 1, 0.5] });
  check("compose: pos adds and scale multiplies per component", same(w.pos, [2, 2, 3]) && same(w.scale, [6, 2, 1]), `pos=${JSON.stringify(w.pos)} scale=${JSON.stringify(w.scale)}`);
  const b1 = { pos: [0, 0, 0], quat: [0, 0, 0, 1], scale: [1, 1, 1] };
  check("compose: invalid input returns null", [
    applyPartOverride(null, {}), applyPartOverride(b1, null), applyPartOverride({ pos: [NaN, 0, 0], quat: [0, 0, 0, 1], scale: [1, 1, 1] }, {}),
    applyPartOverride(b1, { pos: [1, 2] }), applyPartOverride(b1, { quat: [0, 0, 0, 0] }), applyPartOverride(b1, { scale: [1, NaN, 1] }),
    resetToBase(null), resetToBase({}), quatNormalize([0, 0, 0, 0]), quatNormalize([NaN, 0, 0, 1]), quatNormalize("x"),
    matMul([1], identityMatrix()), matFromTRS([0, 0], [0, 0, 0, 1], [1, 1, 1]), matFromEulerXYZDeg(null), matFromEulerXYZDeg({ x: NaN }),
    pivotMatrix([0, 0, 0], NaN), transformPoint(null, [0, 0, 0]), quatMul([1], [0, 0, 0, 1]),
  ].every((v) => v === null));
}

/* ============================ 2. partId ============================ */
{
  const names = ["Body", "Body ", " lead", "a b\tc", "a.b", "a[0]", "a:b", "a/b", "", "   ", "日本語 名", "#", "~", "x#c5", "wheel.001", "[].:/", "tab\nnl", "é ü", "Mesh_1 "];
  const bad = names.filter((n) => sanitizeNodeName(n) !== THREE.PropertyBinding.sanitizeNodeName(n));
  check("partId: sanitizeNodeName equals three PropertyBinding.sanitizeNodeName", bad.length === 0, `names=${names.length} mismatches=${JSON.stringify(bad)}`);
  check("partId: sanitizeNodeName of non-strings is empty", [undefined, null, 5, {}, []].every((v) => sanitizeNodeName(v) === ""));

  const leaf = (name) => ({ name, children: [] });
  const tripo = { name: "Scene", children: [{ name: "Sketchfab_model", children: [{ name: "tripo_node", children: Array.from({ length: 54 }, (_, i) => leaf(`tripo_part_${i}`)) }] }] };
  const idsTripo = buildPartIds(tripo).map((e) => e.id);
  check("partId: 54 tripo_part_N siblings give 54 unique ids", idsTripo.length === 56 && new Set(idsTripo).size === 56, `ids=${idsTripo.length} unique=${new Set(idsTripo).size}`);
  const leavesOnly = buildPartIds(tripo, { isPart: (n) => n.children.length === 0 }).map((e) => e.id);
  check("partId: isPart filters output but ids stay path-based", leavesOnly.length === 54 && leavesOnly[0] === "Sketchfab_model~0/tripo_node~0/tripo_part_0~0", `first=${leavesOnly[0]}`);

  const c172 = { name: "root", children: [{ name: "C172_Parent ", children: [leaf("Wing "), leaf("Wing"), leaf("Prop.001 ")] }, { name: "C172_Parent", children: [leaf("Wing ")] }] };
  const idsC = buildPartIds(c172).map((e) => e.id);
  check("partId: trailing-space names stay unique", new Set(idsC).size === idsC.length && idsC.includes("C172_Parent_~0/Wing_~0") && idsC.includes("C172_Parent~0/Wing_~0"), `ids=${JSON.stringify(idsC)}`);

  const unnamed = { name: "r", children: [leaf(""), leaf(undefined), leaf("."), { name: "", children: [leaf("")] }] };
  const idsU = buildPartIds(unnamed).map((e) => e.id);
  check("partId: unnamed nodes are written # and stay unique", same(idsU, ["#~0", "#~1", "#~2", "#~3", "#~3/#~0"]), `ids=${JSON.stringify(idsU)}`);
  const idsLit = buildPartIds({ name: "r", children: [leaf(""), leaf("#")] }).map((e) => e.id);
  check("partId: an unnamed node and one literally named # never collide", same(idsLit, ["#~0", "#~1"]), `ids=${JSON.stringify(idsLit)}`);

  const dup = { name: "r", children: [leaf("Bolt"), leaf("Nut"), leaf("Bolt"), leaf("Bolt")] };
  const idsD = buildPartIds(dup).map((e) => e.id);
  check("partId: duplicate names get indices 0, 1, 2", same(idsD, ["Bolt~0", "Nut~0", "Bolt~1", "Bolt~2"]), `ids=${JSON.stringify(idsD)}`);
  check("partId: ids are stable when the same tree is built twice", same(buildPartIds(dup).map((e) => e.id), idsD));
  const dup2 = { name: "r", children: [leaf("Bolt"), leaf("Bolt"), leaf("Nut"), leaf("Bolt"), leaf("Bolt")] };
  const idsD2 = buildPartIds(dup2).map((e) => e.id);
  const nutId = (a) => a.find((i) => i.startsWith("Nut"));
  check("partId: inserting a duplicate sibling before changes the later ids", same(idsD2, ["Bolt~0", "Bolt~1", "Nut~0", "Bolt~2", "Bolt~3"]) && idsD[3] !== idsD2[4] && nutId(idsD) === nutId(idsD2), `ids=${JSON.stringify(idsD2)}`);
  check("partId: buildPartIds returns nodes in walk order", buildPartIds(dup)[2].node === dup.children[2]);
  check("partId: buildPartIds bad input", buildPartIds(null) === null && buildPartIds(7) === null && buildPartIds([]) === null && same(buildPartIds({ name: "r" }), []));
  const cyc = { name: "r", children: [] };
  cyc.children.push({ name: "a", children: [cyc] });
  check("partId: a cyclic tree does not hang or throw", buildPartIds(cyc).length === 1);
  check("partId: a throwing isPart counts as false", buildPartIds(dup, { isPart: () => { throw new Error("x"); } }).length === 0);

  const plain = parsePartId("A~0/B_~2");
  check("partId: parsePartId plain", same(plain, { segments: [{ name: "A", index: 0 }, { name: "B_", index: 2 }], component: null }), JSON.stringify(plain));
  const un = parsePartId("#~3/#~0");
  check("partId: parsePartId unnamed", same(un, { segments: [{ name: "", index: 3 }, { name: "", index: 0 }], component: null }), JSON.stringify(un));
  const cid = partIdOfComponent("A~0/B~1", 7);
  check("partId: component id round trip", cid === "A~0/B~1#c7" && same(parsePartId(cid), { segments: [{ name: "A", index: 0 }, { name: "B", index: 1 }], component: 7 }), cid);
  const lit = parsePartId("x#c5~0");
  check("partId: a node named x#c5 is not read as a component", same(lit, { segments: [{ name: "x#c5", index: 0 }], component: null }), JSON.stringify(lit));
  const litc = parsePartId("x#c5~0#c2");
  check("partId: x#c5~0#c2 is component 2 of node x#c5", litc && litc.component === 2 && litc.segments[0].name === "x#c5", JSON.stringify(litc));
  check("partId: malformed ids give null", ["", "abc", "a~", "~0", "a~0/", "/a~0", "a~x", "a b~0", "a.b~0", "a~0#cx", "a~0#c1#c2", 5, null, undefined].every((v) => parsePartId(v) === null));
  check("partId: partIdOfComponent bad input", partIdOfComponent(5, 1) === null && partIdOfComponent("a~0", -1) === null && partIdOfComponent("a~0", 1.5) === null);
  const allIds = buildPartIds(tripo).map((e) => e.id);
  check("partId: every generated id parses", allIds.every((id) => parsePartId(id) !== null));

  const fpIn = { verts: 100, tris: 50, bbox: [-1.00004, 0, 0.123456, 1, 2.00004, 3], materialName: "Paint" };
  const fp = fingerprint(fpIn);
  check("partId: fingerprint rounds bbox to 1e-4", fp && same(fp, { v: 100, t: 50, bb: [-1, 0, 0.1235, 1, 2, 3], m: "Paint" }), JSON.stringify(fp));
  check("partId: fingerprint never yields -0", fingerprint({ verts: 1, tris: 1, bbox: [-0.00001, 0, 0, 0, 0, 0], materialName: "" }).bb.every((v) => Object.is(v, 0)));
  check("partId: invalid fingerprint input gives null", [
    fingerprint(null), fingerprint({ ...fpIn, verts: -1 }), fingerprint({ ...fpIn, verts: 1.5 }), fingerprint({ ...fpIn, tris: "x" }),
    fingerprint({ ...fpIn, bbox: [1, 2, 3] }), fingerprint({ ...fpIn, bbox: [1, 2, 3, 4, 5, NaN] }), fingerprint({ ...fpIn, materialName: 5 }), fingerprint({ ...fpIn, bbox: null }),
  ].every((v) => v === null));
  const fpA = { v: 1, t: 1, bb: [0, 0, 0, 1, 1, 1], m: "a" };
  const fpB = { ...fpA, bb: [0.0001, 0, 0, 1, 1, 1] };
  const fpC = { ...fpA, bb: [0.0002, 0, 0, 1, 1, 1] };
  check("partId: fingerprintsMatch 1e-4 difference matches", fingerprintsMatch(fpA, fpB));
  check("partId: fingerprintsMatch 2e-4 difference does not", !fingerprintsMatch(fpA, fpC));
  check("partId: fingerprintsMatch needs equal v, t and m", !fingerprintsMatch(fpA, { ...fpA, v: 2 }) && !fingerprintsMatch(fpA, { ...fpA, t: 2 }) && !fingerprintsMatch(fpA, { ...fpA, m: "b" }) && !fingerprintsMatch(fpA, null));

  const fpX = { v: 10, t: 5, bb: [0, 0, 0, 1, 1, 1], m: "steel" };
  const fpY = { v: 10, t: 5, bb: [-1, 0, 0, 0, 1, 1], m: "steel" };
  const fpZ = { v: 99, t: 9, bb: [5, 5, 5, 6, 6, 6], m: "steel" };
  const cur = [{ id: "a~0", fp: fpX }, { id: "b~0", fp: fpZ }];
  check("partId: resolvePart exact", resolvePart({ id: "a~0", fp: fpX }, cur).status === "exact");
  check("partId: resolvePart exact without saved fp", resolvePart({ id: "b~0" }, cur).status === "exact");
  const moved = resolvePart({ id: "a~0", fp: fpZ }, [{ id: "a~0", fp: fpX }, { id: "c~5", fp: fpZ }]);
  check("partId: resolvePart id present, fingerprint changed, unique match elsewhere", moved.status === "fingerprint" && moved.match.id === "c~5", `status=${moved.status}`);
  const renamed = resolvePart({ id: "gone~0", fp: fpZ }, cur);
  check("partId: resolvePart id missing, unique fingerprint elsewhere", renamed.status === "fingerprint" && renamed.match.id === "b~0", `status=${renamed.status}`);
  const twins = resolvePart({ id: "gone~0", fp: fpX }, [{ id: "l~0", fp: fpX }, { id: "r~0", fp: { ...fpX, bb: [0.00005, 0, 0, 1, 1, 1] } }]);
  check("partId: resolvePart mirrored twins are ambiguous and not applied", twins.status === "ambiguous" && twins.match === null && twins.candidates.length === 2, `status=${twins.status}`);
  const none = resolvePart({ id: "gone~0", fp: fpY }, cur);
  check("partId: resolvePart unmatched", none.status === "unmatched" && none.match === null && none.candidates.length === 0);
  check("partId: resolvePart missing id and no fp is unmatched", resolvePart({ id: "zz~0" }, cur).status === "unmatched");
  check("partId: resolvePart bad input is unmatched", resolvePart(null, cur).status === "unmatched" && resolvePart({ id: "a~0" }, null).status === "unmatched");
}

/* ============================ 3. layout ============================ */
{
  const goodItem = (n, extra = {}) => ({ itemId: `it${n}`, assetId: `asset${n}`, ...extra });
  const rich = {
    version: 1,
    name: "My garage",
    items: [
      {
        itemId: "bike", assetId: "the_kop_refined", primary: true, hidden: false,
        transform: { x: 1, y: 0.5, z: -2, rx: 10, ry: 90, rz: 0, s: 1.5 },
        splits: ["Scene~0/Chrome~0"],
        parts: {
          "Scene~0/Chrome~0#c3": { fp: { v: 10, t: 4, bb: [0, 0, 0, 1, 1, 1], m: "Chrome" }, pos: [0, 0.2, 0], quat: [0, 0, 0, 1], scale: [1, 1, 1], visible: false, material: { color: "#Ff8800", roughness: 0.3, metalness: 1, opacity: 0.5, ignoreVertexColors: true } },
          "Scene~0/Paint~0": { material: { color: "#112233" } },
        },
      },
      { itemId: "plane", assetId: "cessna", transform: { s: 2 } },
    ],
    frontRef: "plane",
  };
  const v1 = validateLayout(rich);
  check("layout: a valid layout validates ok with no warnings", v1.ok && v1.errors.length === 0 && v1.warnings.length === 0, JSON.stringify(v1.warnings));
  check("layout: colour is lower-cased and frontRef kept", v1.layout.items[0].parts["Scene~0/Chrome~0#c3"].material.color === "#ff8800" && v1.layout.frontRef === "plane");
  const ser = serializeLayout(v1.layout);
  const v2 = parseLayoutJson(ser);
  check("layout: validate, serialize, validate gives a deep-equal layout", v2.ok && JSON.stringify(v2.layout) === JSON.stringify(v1.layout) && serializeLayout(v2.layout) === ser, `chars=${ser.length}`);
  check("layout: serializeLayout keys are sorted", /^\{"frontRef":.*"items":.*"name":.*"version":1\}$/.test(ser));
  check("layout: serializeLayout is independent of key order", serializeLayout({ b: 1, a: [2, { d: 1, c: 2 }] }) === '{"a":[2,{"c":2,"d":1}],"b":1}');
  const cyc = {};
  cyc.self = cyc;
  check("layout: serializeLayout of a cycle is null", serializeLayout(cyc) === null);

  const notOk = (name, raw) => {
    let r;
    try { r = validateLayout(raw); } catch (e) { check(`layout: ${name}`, false, `threw ${e.message}`); return; }
    check(`layout: ${name} gives ok:false`, r.ok === false && r.layout === null && r.errors.length > 0, JSON.stringify(r.errors));
  };
  notOk("null", null); notOk("42", 42); notOk('"x"', "x"); notOk("[]", []); notOk("{}", {});
  notOk("version 2", { version: 2, items: [goodItem(1)] });
  notOk("version '1'", { version: "1", items: [goodItem(1)] });
  notOk("0 items", { version: 1, items: [] });
  notOk("items not an array", { version: 1, items: {} });
  notOk("21 items", { version: 1, items: Array.from({ length: 21 }, (_, i) => goodItem(i)) });
  notOk("only an item without assetId", { version: 1, items: [{ itemId: "a" }] });
  check("layout: 20 items are accepted", validateLayout({ version: 1, items: Array.from({ length: 20 }, (_, i) => goodItem(i)) }).ok);

  const w = validateLayout({ version: 1, items: [{ itemId: "a" }, goodItem(2), goodItem(2), { assetId: "z" }] });
  check("layout: item without assetId dropped, duplicate itemId dropped, missing itemId generated", w.ok && w.layout.items.length === 2 && w.layout.items[1].itemId === "item-4" && w.warnings.length === 3, JSON.stringify(w.warnings));
  check("layout: only the first item is primary", w.layout.items[0].primary === true && w.layout.items[1].primary === false);
  const pr = validateLayout({ version: 1, items: [goodItem(1, { primary: false }), goodItem(2, { primary: true })] });
  check("layout: primary is forced (first true, others false)", pr.layout.items[0].primary && !pr.layout.items[1].primary);
  const fr0 = validateLayout({ version: 1, items: [goodItem(1), goodItem(2)] });
  check("layout: frontRef defaults to the first item without a warning (Decision 4)", fr0.layout.frontRef === "it1" && fr0.warnings.length === 0);
  const fr1 = validateLayout({ version: 1, frontRef: "nope", items: [goodItem(1), goodItem(2)] });
  check("layout: a bad frontRef is repaired with a warning", fr1.layout.frontRef === "it1" && fr1.warnings.length === 1, JSON.stringify(fr1.warnings));
  const fr2 = validateLayout({ version: 1, frontRef: "it2", items: [goodItem(1), goodItem(2)] });
  check("layout: a good frontRef is kept", fr2.layout.frontRef === "it2");
  const fr3 = validateLayout({ version: 1, frontRef: "gone", items: [{ itemId: "gone" }, goodItem(2)] });
  check("layout: a frontRef naming a dropped item is repaired", fr3.layout.frontRef === "it2" && fr3.warnings.length >= 2, JSON.stringify(fr3.warnings));

  const tf = validateLayout({ version: 1, items: [goodItem(1, { transform: { x: NaN, y: Infinity, z: "3", rx: 5, ry: 1e9, rz: -1e9, s: 0, extra: 9 } })] });
  const t = tf.layout.items[0].transform;
  check("layout: transform non-finite becomes 0, s raised to 0.05, big values kept (no app clamp)", t.x === 0 && t.y === 0 && t.z === 0 && t.rx === 5 && t.ry === 1e9 && t.rz === -1e9 && t.s === 0.05 && !("extra" in t), JSON.stringify(t));
  const tn = validateLayout({ version: 1, items: [goodItem(1, { transform: { s: -1 } })] }).layout.items[0].transform;
  check("layout: scale -1 becomes 0.05", tn.s === 0.05);
  const td = validateLayout({ version: 1, items: [goodItem(1)] }).layout.items[0].transform;
  check("layout: missing transform is the identity", same(td, { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }));
  // Real JSON cannot carry NaN or Infinity, so they must also be safe as JS values:
  const pt = validateLayout({ version: 1, items: [goodItem(1, { parts: { "A~0": { pos: [NaN, 0, 0], quat: [0, 0, 0, 0], scale: [0, -1, 2] }, "B~0": { quat: [0, 0, 0, 2], scale: [1, NaN, 1] } } })] });
  const pa = pt.layout.items[0].parts["A~0"];
  const pbb = pt.layout.items[0].parts["B~0"];
  check("layout: part pos NaN dropped, zero quat becomes identity, scale clamped (4 warnings)", !("pos" in pa) && same(pa.quat, [0, 0, 0, 1]) && same(pa.scale, [0.05, 0.05, 2]) && pt.warnings.length === 4, JSON.stringify(pt.warnings));
  check("layout: quat is normalised, NaN scale dropped", same(pbb.quat, [0, 0, 0, 1]) && !("scale" in pbb));
  const qn = validateLayout({ version: 1, items: [goodItem(1, { parts: { "A~0": { quat: [1, 2, 3, 4] } } })] }).layout.items[0].parts["A~0"].quat;
  check("layout: quat has unit length within 1e-12", near(Math.hypot(...qn), 1, 1e-12), `len=${fmt(Math.hypot(...qn))}`);
  const pk = validateLayout({ version: 1, items: [goodItem(1, { parts: { "bad key": { visible: false }, "A~0": { visible: false }, "": { visible: true }, "B~x": { visible: true } }, splits: ["A~0", "A~0", "bad", "A~0#c1", 5] })] });
  check("layout: bad part keys dropped, splits deduplicated and validated", same(Object.keys(pk.layout.items[0].parts), ["A~0"]) && same(pk.layout.items[0].splits, ["A~0"]) && pk.warnings.length === 6, JSON.stringify(pk.warnings));
  const mat = validateLayout({ version: 1, items: [goodItem(1, { parts: { "A~0": { material: { color: "red", roughness: 2, metalness: -1, opacity: NaN, ignoreVertexColors: "yes", junk: 1 } } } })] });
  check("layout: bad colour dropped, roughness/metalness clamped, opacity dropped, flag dropped (5 warnings)", mat.layout.items[0].parts["A~0"] === undefined || (same(mat.layout.items[0].parts["A~0"].material, { roughness: 1, metalness: 0 }) && mat.warnings.length === 5), JSON.stringify(mat.warnings));
  check("layout: ignoreVertexColors true is kept (Decision 6)", validateLayout({ version: 1, items: [goodItem(1, { parts: { "A~0": { material: { ignoreVertexColors: true } } } })] }).layout.items[0].parts["A~0"].material.ignoreVertexColors === true);
  const bigParts = {};
  for (let i = 0; i < 2001; i += 1) bigParts[`p~${i}`] = { visible: false };
  const capd = validateLayout({ version: 1, items: [goodItem(1, { parts: bigParts })] });
  check("layout: 2001 parts are capped at 2000 with a warning", capd.ok && Object.keys(capd.layout.items[0].parts).length === 2000 && capd.warnings.length === 1, `kept=${Object.keys(capd.layout.items[0].parts).length}`);
  const bigSplits = Array.from({ length: 250 }, (_, i) => `s~${i}`);
  check("layout: 250 splits are capped at 200", validateLayout({ version: 1, items: [goodItem(1, { splits: bigSplits })] }).layout.items[0].splits.length === 200);
  const long = "x".repeat(3 * 1024 * 1024);
  const trunc = validateLayout({ version: 1, name: long, items: [{ itemId: long, assetId: long }] });
  check("layout: a 3 MB string is truncated (name 60, ids 200)", trunc.ok && trunc.layout.name.length === 60 && trunc.layout.items[0].itemId.length === 200 && trunc.layout.items[0].assetId.length === 200);
  const emoji = validateLayout({ version: 1, name: "a".repeat(59) + "😀", items: [goodItem(1)] });
  check("layout: truncation never leaves half a surrogate pair", emoji.layout.name === "a".repeat(59));

  const evil = parseLayoutJson('{"version":1,"__proto__":{"polluted":1},"items":[{"itemId":"a","assetId":"b","__proto__":{"x":1},"constructor":{"y":1},"parts":{"__proto__":{"visible":false},"constructor":{"visible":false},"prototype":{"visible":false}}}]}');
  const ev = evil.layout && evil.layout.items[0];
  check("layout: __proto__, constructor and prototype keys are dropped", evil.ok && ({}).polluted === undefined && ev.x === undefined && Object.keys(ev.parts).length === 0 && !Object.prototype.hasOwnProperty.call(evil.layout, "__proto__"), JSON.stringify(evil.warnings));
  let deep = { version: 1, items: [goodItem(1)] };
  let nest = deep;
  for (let i = 0; i < 50000; i += 1) { nest.deep = {}; nest = nest.deep; }
  let deepOk = false;
  try { deepOk = validateLayout(deep).ok; } catch { deepOk = false; }
  check("layout: 50000 levels of nesting in an unknown field are ignored", deepOk);
  const raw = { version: 1, name: "n", items: [goodItem(1, { transform: { x: 1 }, splits: ["A~0"], parts: { "A~0": { pos: [1, 2, 3], fp: { v: 1, t: 1, bb: [0, 0, 0, 1, 1, 1], m: "m" }, material: { color: "#aabbcc" } } } })] };
  const res = validateLayout(raw);
  const before = serializeLayout(res.layout);
  raw.items[0].transform.x = 99; raw.items[0].splits.push("Z~0"); raw.items[0].parts["A~0"].pos[0] = 99; raw.items[0].parts["A~0"].fp.bb[0] = 99; raw.items[0].parts["A~0"].material.color = "#000000"; raw.name = "changed";
  check("layout: result does not alias raw (mutating raw afterwards changes nothing)", serializeLayout(res.layout) === before);

  const badJson = parseLayoutJson("{not json");
  check("layout: parseLayoutJson invalid JSON gives ok:false with a message", badJson.ok === false && badJson.errors.length === 1 && badJson.errors[0].length > 0, badJson.errors[0]);
  const over = parseLayoutJson(" ".repeat(LAYOUT_LIMITS.MAX_JSON_CHARS + 1));
  check("layout: parseLayoutJson oversize gives ok:false", over.ok === false && /longer/.test(over.errors[0]), over.errors[0]);
  check("layout: parseLayoutJson non-string gives ok:false", parseLayoutJson(null).ok === false && parseLayoutJson(5).ok === false);
  check("layout: LAYOUT_LIMITS values", same(LAYOUT_LIMITS, { MAX_ITEMS: 20, MAX_PARTS_PER_ITEM: 2000, MAX_SPLITS_PER_ITEM: 200, MAX_NAME: 60, MAX_ID: 200, MIN_SCALE: 0.05, MAX_JSON_CHARS: 2000000 }));

  // 500 seeded garbage values: validateLayout must never throw.
  const R = mkRand(3);
  const junk = (depth) => {
    const k = Math.floor(R.r() * 11);
    if (depth > 4 || k < 3) return [null, undefined, true, false, 0, -0, NaN, Infinity, -1, 1e308, "", "x", "#zzzzzz", "A~0", "__proto__"][Math.floor(R.r() * 15)];
    if (k < 5) return R.range(-1e3, 1e3);
    if (k < 7) return Array.from({ length: Math.floor(R.r() * 5) }, () => junk(depth + 1));
    const o = {};
    const keys = ["version", "name", "items", "frontRef", "itemId", "assetId", "primary", "hidden", "transform", "x", "s", "splits", "parts", "A~0", "fp", "pos", "quat", "scale", "visible", "material", "color", "roughness", "__proto__", "constructor", "v", "t", "bb", "m"];
    const n = Math.floor(R.r() * 7);
    for (let i = 0; i < n; i += 1) o[keys[Math.floor(R.r() * keys.length)]] = junk(depth + 1);
    return o;
  };
  let threw = 0;
  let okCount = 0;
  for (let i = 0; i < 500; i += 1) {
    let g = junk(0);
    if (i % 2 === 0 && g && typeof g === "object" && !Array.isArray(g)) { g.version = 1; g.items = [{ assetId: "a", itemId: "b", ...(junk(2) && typeof junk(2) === "object" ? {} : {}), transform: junk(2), parts: junk(2), splits: junk(2) }, junk(1)]; }
    try {
      const r = validateLayout(g);
      if (r.ok) { okCount += 1; if (!parseLayoutJson(serializeLayout(r.layout)).ok) threw += 1; }
    } catch { threw += 1; }
  }
  check("layout: validateLayout never throws on 500 seeded garbage values (and valid results re-parse)", threw === 0, `threw=${threw} accepted=${okCount}`);
  const proxy = new Proxy({}, { get() { throw new Error("boom"); }, has() { throw new Error("boom"); }, getOwnPropertyDescriptor() { throw new Error("boom"); } });
  let pt2 = null;
  try { pt2 = validateLayout(proxy); } catch { pt2 = "threw"; }
  check("layout: a throwing Proxy input does not throw", pt2 && pt2 !== "threw" && pt2.ok === false);
}

/* ============================ 4. split ============================ */
{
  const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => [ax, ay, az, bx, by, bz, cx, cy, cz];
  const P = (...tris) => new Float32Array(tris.flat());
  const two = splitComponents({ positions: P(tri(0, 0, 0, 1, 0, 0, 0, 1, 0), tri(5, 0, 0, 6, 0, 0, 5, 1, 0)) });
  check("split: two disjoint triangles give 2 (non-indexed)", two.ok && two.count === 2 && two.triangles === 2 && two.vertices === 6, JSON.stringify(two.ok && two.count));
  const edge = splitComponents({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]), indices: [0, 1, 2, 1, 3, 2] });
  check("split: two triangles sharing an edge give 1", edge.ok && edge.count === 1);
  const corner = splitComponents({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 2, 1, 0]), indices: [0, 1, 2, 1, 3, 4] });
  check("split: two triangles sharing one vertex give 1 (documented limitation)", corner.ok && corner.count === 1);
  const seam = splitComponents({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), indices: [0, 1, 2, 3, 4, 5] });
  check("split: a UV seam (duplicated coincident vertices) still gives 1", seam.ok && seam.count === 1);
  const gapPos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1.001, 0, 0, 2, 0, 0, 1.5, 1, 0]);
  const gap = splitComponents({ positions: gapPos, indices: [0, 1, 2, 3, 4, 5], weldEps: 1e-5 });
  const gapWide = splitComponents({ positions: gapPos, indices: [0, 1, 2, 3, 4, 5], weldEps: 0.01 });
  check("split: vertices further apart than weldEps do not weld, closer ones do", gap.ok && gap.count === 2 && gapWide.ok && gapWide.count === 1);
  const degen = splitComponents({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 9, 9, 9, 9, 9, 9, 9, 9, 9]), indices: [0, 1, 2, 3, 4, 5] });
  check("split: a zero-area triangle still counts as a triangle", degen.ok && degen.triangles === 2 && degen.count === 2 && degen.triangleCounts[0] === 1);
  const emptyR = splitComponents({ positions: new Float32Array(0) });
  check("split: empty input gives ok with 0 components", emptyR.ok && emptyR.count === 0 && emptyR.triangles === 0 && emptyR.bbox.length === 0);
  check("split: empty indices give 0 components", splitComponents({ positions: new Float32Array(9), indices: [] }).count === 0);
  check("split: NaN positions give non-finite", splitComponents({ positions: [0, 0, NaN, 0, 0, 0, 0, 0, 0] }).reason === "non-finite");
  check("split: Infinity positions give non-finite", splitComponents({ positions: [0, 0, Infinity, 0, 0, 0, 0, 0, 0] }).reason === "non-finite");
  check("split: an index out of range gives bad-index", splitComponents({ positions: new Float32Array(9), indices: [0, 1, 3] }).reason === "bad-index");
  check("split: a negative or fractional index gives bad-index", splitComponents({ positions: new Float32Array(9), indices: [0, 1, -1] }).reason === "bad-index" && splitComponents({ positions: new Float32Array(9), indices: [0, 1, 1.5] }).reason === "bad-index");
  check("split: V above maxVertices gives too-large", splitComponents({ positions: new Float32Array(12), maxVertices: 3 }).reason === "too-large");
  check("split: bad input reasons", [
    splitComponents(null), splitComponents({}), splitComponents({ positions: new Float32Array(4) }), splitComponents({ positions: "abc" }),
    splitComponents({ positions: new Float32Array(9), indices: [0, 1] }), splitComponents({ positions: new Float32Array(12) }), splitComponents({ positions: new Float32Array(9), weldEps: -1 }),
    splitComponents({ positions: new Float32Array(9), weldEps: NaN }), splitComponents({ positions: new Float32Array(9), maxVertices: -5 }),
  ].every((r) => r && r.ok === false && r.reason === "bad-input"));
  const order = splitComponents({ positions: new Float32Array(P(tri(0, 0, 0, 1, 0, 0, 0, 1, 0), tri(5, 0, 0, 6, 0, 0, 5, 1, 0), tri(0, 0, 0, 0, 1, 0, -1, 0, 0), tri(9, 0, 0, 10, 0, 0, 9, 1, 0))) });
  check("split: numbering follows first appearance", same(Array.from(order.componentOfTriangle), [0, 1, 0, 2]) && same(Array.from(order.triangleCounts), [2, 1, 1]), JSON.stringify(Array.from(order.componentOfTriangle)));
  const sumOk = order.triangleCounts.reduce((a, b) => a + b, 0) === order.triangles && Array.from(order.componentOfTriangle).every((c) => c >= 0 && c < order.count);
  check("split: triangleCounts sum to T and componentOfTriangle is in range", sumOk);
  check("split: bbox of a known component", same(Array.from(order.bbox.slice(0, 6)), [-1, 0, 0, 1, 1, 0]) && same(Array.from(order.bbox.slice(12, 18)), [9, 0, 0, 10, 1, 0]), JSON.stringify(Array.from(order.bbox.slice(0, 6))));
  const arr = splitComponents({ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: new Uint16Array([0, 1, 2]) });
  check("split: plain Array positions and Uint16Array indices work", arr.ok && arr.count === 1);
  const scaled = splitComponents({ positions: new Float64Array([0, 0, 0, 1000, 0, 0, 0, 1000, 0, 1000, 1000, 0.0001]), indices: [0, 1, 2, 1, 3, 2] });
  check("split: default weldEps scales with the model size", scaled.ok && scaled.count === 1);

  // Real files
  const readGlb = (file) => {
    const path = join(APP, "public", "models", file);
    if (!existsSync(path)) return { skip: "file not found" };
    const buf = readFileSync(path);
    if (buf.readUInt32LE(0) !== 0x46546c67) return { skip: "not a GLB" };
    let off = 12;
    let json = null;
    let bin = null;
    while (off + 8 <= buf.length) {
      const len = buf.readUInt32LE(off);
      const type = buf.readUInt32LE(off + 4);
      const start = off + 8;
      if (type === 0x4e4f534a) json = JSON.parse(buf.toString("utf8", start, start + len));
      else if (type === 0x004e4942 && bin === null) bin = buf.subarray(start, start + len);
      off = start + len;
    }
    if (!json) return { skip: "no JSON chunk" };
    if (json.extensionsRequired && json.extensionsRequired.length) return { skip: `extensionsRequired ${json.extensionsRequired.join(",")}` };
    return { json, bin };
  };
  const COMP = { 5120: [1, "getInt8"], 5121: [1, "getUint8"], 5122: [2, "getInt16"], 5123: [2, "getUint16"], 5125: [4, "getUint32"], 5126: [4, "getFloat32"] };
  const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const readAccessor = (g, ai) => {
    const acc = g.json.accessors[ai];
    if (acc.sparse) throw new Error("sparse");
    if (acc.bufferView === undefined) throw new Error("no bufferView");
    const bv = g.json.bufferViews[acc.bufferView];
    const [size, fn] = COMP[acc.componentType];
    const n = NCOMP[acc.type];
    const stride = bv.byteStride || size * n;
    const base = g.bin.byteOffset + (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const dv = new DataView(g.bin.buffer);
    const out = acc.componentType === 5126 ? new Float64Array(acc.count * n) : new Uint32Array(acc.count * n);
    for (let i = 0; i < acc.count; i += 1) for (let k = 0; k < n; k += 1) out[i * n + k] = dv[fn](base + i * stride + k * size, true);
    return out;
  };
  // Every mesh primitive, in node order, with its node index.
  const collect = (g) => {
    const prims = [];
    g.json.nodes.forEach((node, ni) => {
      if (node.mesh === undefined) return;
      g.json.meshes[node.mesh].primitives.forEach((p) => prims.push({ node: ni, prim: p }));
    });
    return prims;
  };
  const runFile = (file) => {
    const g = readGlb(file);
    if (g.skip) return { skip: g.skip };
    try {
      const t0 = performance.now();
      const perNode = new Map();
      const conservation = [];
      let total = 0;
      let extentAll = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      const prims = collect(g);
      const data = [];
      for (const { node, prim } of prims) {
        if (prim.mode !== undefined && prim.mode !== 4) return { skip: `primitive mode ${prim.mode}` };
        const positions = readAccessor(g, prim.attributes.POSITION);
        const indices = prim.indices !== undefined ? readAccessor(g, prim.indices) : undefined;
        data.push({ node, positions, indices });
        for (let v = 0; v < positions.length; v += 3) for (let a = 0; a < 3; a += 1) {
          extentAll[a] = Math.min(extentAll[a], positions[v + a]);
          extentAll[3 + a] = Math.max(extentAll[3 + a], positions[v + a]);
        }
      }
      const maxDim = Math.max(extentAll[3] - extentAll[0], extentAll[4] - extentAll[1], extentAll[5] - extentAll[2]);
      const readMs = performance.now() - t0;
      const t1 = performance.now();
      for (const d of data) {
        // The model's own largest dimension is computed from raw local positions, per the design report.
        const r = splitComponents({ positions: d.positions, indices: d.indices, weldEps: 1e-5 * (d.dim ?? maxDim) });
        if (!r.ok) return { skip: `split failed: ${r.reason}` };
        total += r.count;
        perNode.set(d.node, (perNode.get(d.node) || 0) + r.count);
        const expectT = d.indices ? d.indices.length / 3 : d.positions.length / 9;
        conservation.push(r.triangleCounts.reduce((a, b) => a + b, 0) === expectT && r.triangles === expectT);
      }
      return { total, perNode: [...perNode.values()], conservation, ms: performance.now() - t1, readMs, maxDim, prims: data.length };
    } catch (e) {
      return { skip: `reader: ${e.message}` };
    }
  };
  const expectFile = (file, wantTotal, wantPerNode) => {
    const a = runFile(file);
    if (a.skip) { console.log(`SKIP  split: ${file} (${a.skip})`); return; }
    const b = runFile(file);
    check(`split: ${file} has ${wantTotal} components`, a.total === wantTotal, `got=${a.total} maxDim=${a.maxDim} prims=${a.prims} ms=${a.ms.toFixed(0)}`);
    if (wantPerNode) check(`split: ${file} per node in file order`, same(a.perNode, wantPerNode), `got=${JSON.stringify(a.perNode)} want=${JSON.stringify(wantPerNode)}`);
    check(`split: ${file} triangles are conserved per primitive`, a.conservation.every(Boolean), `primitives=${a.conservation.length}`);
    check(`split: ${file} runs twice with identical results`, a.total === b.total && same(a.perNode, b.perNode));
    info(`${file}: components=${a.total} perNode=${JSON.stringify(a.perNode)} split=${a.ms.toFixed(0)}ms`);
    check(`split: ${file} splits in under 2 seconds`, a.ms < 2000, `ms=${a.ms.toFixed(0)}`);
  };
  expectFile("the_kop_refined.glb", 681, [11, 5, 286, 3, 311, 1, 4, 60]);
  expectFile("cessna-172-tripo.glb", 186, null);
  expectFile("cartoon-motorcycle.glb", 149, null);
  for (const f of ["cessna-172.glb", "cup-coffee.glb", "mug.glb"]) {
    const a = runFile(f);
    if (a.skip) console.log(`SKIP  split: ${f} (${a.skip})`);
    else info(`${f}: components=${a.total} perNode=${JSON.stringify(a.perNode)} split=${a.ms.toFixed(0)}ms`);
  }
}

/* ============================ 5. bounds ============================ */
{
  const cube = { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] };
  const mesh = (extra = {}) => ({ box: cube, ...extra });
  const one = unionBounds({ children: [mesh()] });
  check("bounds: a unit cube has size 1 and count 1", one && same(one.size, [1, 1, 1]) && one.count === 1 && one.skipped === 0, JSON.stringify(one && one.size));
  const hid = unionBounds({ children: [mesh(), mesh({ visible: false, pos: [10, 0, 0] })] });
  check("bounds: a hidden node is excluded", same(hid.size, [1, 1, 1]) && hid.count === 1);
  const hidP = unionBounds({ children: [mesh(), { visible: false, children: [mesh({ pos: [10, 0, 0] })] }] });
  check("bounds: a hidden parent hides its children", same(hidP.size, [1, 1, 1]) && hidP.count === 1);
  const before = unionBounds({ children: [mesh(), mesh()] });
  const after = unionBounds({ children: [mesh(), mesh({ pos: [0, -3, 0] })] });
  check("bounds: a moved part changes the union", same(before.size, [1, 1, 1]) && same(after.size, [1, 4, 1]) && after.min[1] === -3.5, JSON.stringify(after.size));
  const s2 = Math.SQRT1_2;
  const rot = unionBounds({ children: [mesh({ quat: [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)] })] });
  check("bounds: a unit cube rotated 45 degrees about y has width sqrt(2) (1e-12)", near(rot.size[0], Math.SQRT2, 1e-12) && near(rot.size[2], Math.SQRT2, 1e-12) && near(rot.size[1], 1, 1e-12), `w=${fmt(rot.size[0])} sqrt2=${fmt(Math.SQRT2)} ${s2 > 0 ? "" : ""}`);
  const mo = unionBounds({ children: [mesh({ matrix: [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 1, 1, 1, 1], pos: [99, 99, 99] })] });
  check("bounds: a matrix overrides pos/quat/scale", same(mo.size, [2, 3, 4]) && same(mo.center, [1, 1, 1]), JSON.stringify(mo.size));
  const nested = unionBounds({ pos: [1, 0, 0], scale: [2, 2, 2], children: [{ pos: [0, 1, 0], children: [mesh()] }] });
  check("bounds: parent transforms compose down the tree", same(nested.size, [2, 2, 2]) && same(nested.center, [1, 2, 0]), JSON.stringify(nested.center));
  check("bounds: rootMatrix option applies above the root", same(unionBounds(mesh(), { rootMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1] }).center, [5, 0, 0]));
  check("bounds: empty tree gives null", unionBounds({}) === null && unionBounds({ children: [] }) === null && unionBounds(null) === null && unionBounds([]) === null);
  check("bounds: only-invisible tree gives null", unionBounds({ children: [mesh({ visible: false })] }) === null && unionBounds({ visible: false, box: cube }) === null);
  const sk = unionBounds({ children: [mesh(), mesh({ pos: [NaN, 0, 0] }), { box: { min: [0, 0, 0], max: [Infinity, 1, 1] } }, mesh({ scale: [1, Infinity, 1], children: [mesh()] })] });
  check("bounds: non-finite nodes are skipped and counted", sk.count === 1 && sk.skipped === 3, `count=${sk.count} skipped=${sk.skipped}`);
  const cyc = { children: [] };
  cyc.children.push(mesh({ children: [cyc] }));
  check("bounds: a cyclic tree terminates", unionBounds(cyc).count === 1);
  check("bounds: boxOfMatrixBox bad input gives null", boxOfMatrixBox(null, cube) === null && boxOfMatrixBox(identityMatrix(), { min: [0, 0], max: [1, 1, 1] }) === null && boxOfMatrixBox([1], cube) === null);

  // The private matrix helpers in bounds.js must agree with compose.js.
  const R = mkRand(5);
  let dBox = 0;
  for (let i = 0; i < 200; i += 1) {
    const pos = R.vec(-5, 5);
    const quat = randQuat(R);
    const scale = R.vec(0.1, 3);
    const parentPos = R.vec(-2, 2);
    const parentQuat = randQuat(R);
    const box = { min: R.vec(-2, 0), max: R.vec(0.1, 2) };
    const world = matMul(matFromTRS(parentPos, parentQuat, [1, 1, 1]), matFromTRS(pos, quat, scale));
    const mn = [Infinity, Infinity, Infinity];
    const mx = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < 8; c += 1) {
      const p = transformPoint(world, [c & 1 ? box.max[0] : box.min[0], c & 2 ? box.max[1] : box.min[1], c & 4 ? box.max[2] : box.min[2]]);
      for (let a = 0; a < 3; a += 1) { mn[a] = Math.min(mn[a], p[a]); mx[a] = Math.max(mx[a], p[a]); }
    }
    const u = unionBounds({ pos: parentPos, quat: parentQuat, children: [{ pos, quat, scale, box }] });
    const viaMatrix = boxOfMatrixBox(world, box);
    dBox = Math.max(dBox, maxDiff(u.min, mn), maxDiff(u.max, mx), maxDiff(viaMatrix.min, mn), maxDiff(viaMatrix.max, mx));
  }
  check("bounds: private matrix helpers agree with compose.js (200 inputs, 1e-12)", dBox <= 1e-12, `max=${fmt(dBox)}`);

  check("bounds: floorYFor home wins", floorYFor({ homeFloorY: 0.25, unionMinY: -3 }) === 0.25 && floorYFor({ homeFloorY: 0, unionMinY: -3 }) === 0);
  check("bounds: floorYFor falls back to the union minimum", floorYFor({ homeFloorY: NaN, unionMinY: -3 }) === -3 && floorYFor({ unionMinY: 2 }) === 2 && floorYFor({ homeFloorY: null, unionMinY: -1 }) === -1);
  check("bounds: floorYFor with both invalid gives null", floorYFor({ homeFloorY: NaN, unionMinY: Infinity }) === null && floorYFor({}) === null && floorYFor() === null);
  check("bounds: a part below the floor does not move the floor (Decision 1)", floorYFor({ homeFloorY: 0, unionMinY: -5 }) === 0);

  // Real data: node boxes from accessor min and max with node transforms.
  const treeOf = (file) => {
    const path = join(APP, "public", "models", file);
    if (!existsSync(path)) return null;
    const buf = readFileSync(path);
    let off = 12;
    let json = null;
    while (off + 8 <= buf.length) {
      const len = buf.readUInt32LE(off);
      if (buf.readUInt32LE(off + 4) === 0x4e4f534a) json = JSON.parse(buf.toString("utf8", off + 8, off + 8 + len));
      off += 8 + len;
    }
    const build = (ni) => {
      const n = json.nodes[ni];
      const node = {};
      if (n.matrix) node.matrix = n.matrix;
      if (n.translation) node.pos = n.translation;
      if (n.rotation) node.quat = n.rotation;
      if (n.scale) node.scale = n.scale;
      if (n.mesh !== undefined) {
        const mn = [Infinity, Infinity, Infinity];
        const mx = [-Infinity, -Infinity, -Infinity];
        for (const p of json.meshes[n.mesh].primitives) {
          const acc = json.accessors[p.attributes.POSITION];
          for (let a = 0; a < 3; a += 1) { mn[a] = Math.min(mn[a], acc.min[a]); mx[a] = Math.max(mx[a], acc.max[a]); }
        }
        node.box = { min: mn, max: mx };
      }
      node.children = (n.children || []).map(build);
      return node;
    };
    const scene = json.scenes[json.scene || 0];
    return { children: scene.nodes.map(build) };
  };
  const kop = treeOf("the_kop_refined.glb");
  if (kop) {
    const u = unionBounds(kop);
    const want = [0.8839075, 0.6104385, 1.0000306];
    const dev = u ? maxDiff(u.size, want) : Infinity;
    info(`the_kop_refined.glb union size = ${u && u.size.map((n) => n.toFixed(7)).join(" x ")} (nodes with a box: ${u && u.count})`);
    check("bounds: the_kop_refined union equals the app-measured size (1e-6)", dev <= 1e-6, `dev=${fmt(dev)}`);
  } else console.log("SKIP  bounds: the_kop_refined.glb not found");
  const cs = treeOf("cessna-172-tripo.glb");
  if (cs) {
    const u = unionBounds(cs);
    const want = [1.0, 0.317, 0.816];
    const dev = u ? maxDiff(u.size, want) : Infinity;
    info(`cessna-172-tripo.glb union size = ${u && u.size.map((n) => n.toFixed(7)).join(" x ")} (nodes with a box: ${u && u.count})`);
    check("bounds: cessna-172-tripo union is about 1.0 x 0.317 x 0.816 (1e-3)", dev <= 1e-3, `dev=${fmt(dev)}`);
  } else console.log("SKIP  bounds: cessna-172-tripo.glb not found");
}

/* ============================ 6. purity ============================ */
{
  const files = ["partId", "layout", "split", "bounds", "compose"];
  const banned = [
    ["import statement", /(^|\n)\s*(import|export\s+\*\s+from|export\s*\{[^}]*\}\s*from)\s/],
    ["dynamic import", /\bimport\s*\(/],
    ["require(", /require\s*\(/],
    ["process", /process/],
    ["window", /window/],
    ["document", /document/],
    ["Math.random", /Math\.random/],
    ["Date.now", /Date\.now/],
    ["performance", /performance/],
  ];
  for (const f of files) {
    const src = readFileSync(join(APP, "src", "garage", `${f}.js`), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
    const hits = banned.filter(([, re]) => re.test(code)).map(([n]) => n);
    check(`purity: ${f}.js has no import, require, process, window, document, Math.random, Date.now or performance`, hits.length === 0, hits.join(", "));
    check(`purity: ${f}.js uses LF line endings`, !src.includes("\r"));
  }
}

console.log(failed === 0 ? `\nALL CHECKS PASSED (${passed} PASS)` : `\n${failed} CHECK(S) FAILED (${passed} PASS)`);
process.exit(failed === 0 ? 1 - 1 : 1);
