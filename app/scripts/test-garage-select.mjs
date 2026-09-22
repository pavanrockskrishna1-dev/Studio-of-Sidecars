// Garage G3 — checks for partTree.js and garageMode.js (pure JS; no browser).
// Run from the app folder:  node scripts/test-garage-select.mjs   (exit code 1 on any FAIL)
// Plain node, no test framework, seeded generator only (never Math.random).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPartIndex, MAX_DEPTH } from "../src/garage/partTree.js";
import { buildPartIds } from "../src/garage/partId.js";
import * as mode from "../src/garage/garageMode.js";
import * as store from "../src/garage/garageStore.js";
import { createGarageStore } from "../src/garage/garageStore.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const info = (msg) => console.log(`INFO  ${msg}`);

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
const rand = mulberry32(20260922);

const node = (name, isMesh, children = []) => ({ name, isMesh, children });
const mesh = (name) => node(name, true);
const group = (name, children) => node(name, false, children);
const samePlain = (n) => ({ name: n.name, isMesh: n.isMesh, children: (n.children || []).map(samePlain) });

/* ---------------- partTree on synthetic trees ---------------- */
{
  // 54 siblings named like tripo_part_N
  const kids = [];
  for (let i = 0; i < 54; i += 1) kids.push(mesh(`tripo_part_${i}`));
  const root = group("Scene", kids);
  const r = buildPartIndex(root);
  check("54 siblings: ok", r.ok === true);
  check("54 siblings: 54 parts", r.ok && r.parts.length === 54, `n=${r.parts && r.parts.length}`);
  check("54 siblings: unique ids", r.ok && new Set(r.parts.map((p) => p.id)).size === 54);
  check("54 siblings: id shape", r.ok && r.parts[7].id === "tripo_part_7~0", r.parts && r.parts[7].id);
  check("54 siblings: byRef and byId agree", r.ok && r.parts.every((p) => r.byRef.get(p.ref) === p.id && r.byId.get(p.id) === p.ref));
  check("54 siblings: ref is the original node", r.ok && r.parts[3].ref === kids[3]);
}
{
  // groups holding several child meshes (a multi-primitive glTF mesh)
  const g = group("Wheel", [mesh("Wheel_0"), mesh("Wheel_1"), mesh("Wheel_2")]);
  const root = group("Scene", [g, mesh("Body")]);
  const r = buildPartIndex(root);
  check("group with 3 meshes: 4 parts (group is not a part)", r.ok && r.parts.length === 4, `n=${r.parts && r.parts.length}`);
  check("group with 3 meshes: nested ids", r.ok && r.parts[0].id === "Wheel~0/Wheel_0~0" && r.parts[3].id === "Body~0", r.parts && r.parts.map((p) => p.id).join(","));
  check("group itself has no id", r.ok && !r.byRef.has(g));
}
{
  // unnamed and duplicate names
  const root = group("Scene", [mesh(""), mesh(""), mesh("Bolt"), mesh("Bolt"), mesh("a b.c"), { isMesh: true }]);
  const r = buildPartIndex(root);
  const ids = r.ok ? r.parts.map((p) => p.id) : [];
  check("unnamed/duplicate: 6 parts", r.ok && ids.length === 6, ids.join(","));
  check("unnamed/duplicate: unique ids", new Set(ids).size === 6);
  check("unnamed/duplicate: '#' and ~n counters", ids[0] === "#~0" && ids[1] === "#~1" && ids[2] === "Bolt~0" && ids[3] === "Bolt~1", ids.join(","));
  check("unnamed/duplicate: sanitised name", ids[4] === "a_bc~0", ids[4]);
  check("nameless object: name is empty string", r.ok && r.parts[5].name === "");
}
{
  // a cycle
  const a = group("A", []);
  const b = mesh("B");
  a.children.push(b);
  b.children.push(a); // cycle back to a
  const root = group("Scene", [a]);
  const r = buildPartIndex(root);
  check("cycle: does not hang, ok:true", r.ok === true);
  check("cycle: one part", r.ok && r.parts.length === 1 && r.parts[0].id === "A~0/B~0", r.parts && r.parts.map((p) => p.id).join(","));
  const selfRoot = group("Scene", []);
  selfRoot.children.push(selfRoot, mesh("M"));
  const r2 = buildPartIndex(selfRoot);
  check("root listing itself: root excluded", r2.ok && r2.parts.length === 1 && r2.parts[0].id === "M~0");
}
{
  // depth
  let deep = mesh("leaf");
  for (let i = 0; i < 250; i += 1) deep = group(`g${i}`, [deep]);
  const r = buildPartIndex(group("Scene", [deep]));
  check("depth 250: ok:false", r.ok === false && r.reason === "too-deep", r.reason);
  let d199 = mesh("leaf");
  for (let i = 0; i < MAX_DEPTH - 2; i += 1) d199 = group(`g${i}`, [d199]);
  const r2 = buildPartIndex(group("Scene", [d199]));
  check(`depth ${MAX_DEPTH} exactly: ok`, r2.ok === true && r2.parts.length === 1, r2.reason);
  let d = mesh("leaf");
  for (let i = 0; i < 50; i += 1) d = group(`g${i}`, [d]);
  const r3 = buildPartIndex(group("Scene", [d]), { maxDepth: 10 });
  check("maxDepth option lowers the cap", r3.ok === false);
}
{
  const bad = [null, undefined, 5, "x", true, [], () => 1];
  let allOk = true;
  for (const b of bad) {
    const r = buildPartIndex(b);
    if (!(r && r.ok === false && typeof r.reason === "string")) allOk = false;
  }
  check("non-object roots give ok:false", allOk);
  const evil = { get children() { return {}.x.y; } };
  const r = buildPartIndex(evil);
  check("throwing getter gives ok:false, never raises", r.ok === false);
  const r2 = buildPartIndex({ name: "Scene", children: "nope" });
  check("non-array children: zero parts", r2.ok && r2.parts.length === 0);
  const r3 = buildPartIndex({ name: "Scene", children: [null, 3, "s", mesh("M")] });
  check("junk children skipped", r3.ok && r3.parts.length === 1);
  const r4 = buildPartIndex(group("Scene", []));
  check("empty tree: ok, no parts", r4.ok && r4.parts.length === 0 && r4.byRef.size === 0);
}

/* ---------------- ids equal buildPartIds on the same plain tree ---------------- */
{
  const words = ["Body", "Wheel", "Door", "", "Bolt", "a.b", "x y", "Glass"];
  const gen = (depth) => {
    const n = 1 + Math.floor(rand() * 5);
    const kids = [];
    for (let i = 0; i < n; i += 1) {
      const name = words[Math.floor(rand() * words.length)];
      if (depth < 4 && rand() < 0.4) kids.push(group(name, [gen(depth + 1), gen(depth + 1)].flat()));
      else kids.push(mesh(name));
    }
    return kids;
  };
  let same = 0;
  let trials = 0;
  for (let t = 0; t < 40; t += 1) {
    const root = group("Scene", gen(0));
    const r = buildPartIndex(root);
    const expect = buildPartIds(samePlain(root), { isPart: (x) => x.isMesh });
    trials += 1;
    if (r.ok && expect && r.parts.length === expect.length && r.parts.every((p, i) => p.id === expect[i].id && p.name === expect[i].node.name)) same += 1;
  }
  check("random trees: ids equal buildPartIds", same === trials, `${same}/${trials}`);
  const root = group("Scene", gen(0));
  const r = buildPartIndex(root);
  check("random tree: unique ids", r.ok && new Set(r.parts.map((p) => p.id)).size === r.parts.length, `n=${r.parts.length}`);
}

/* ---------------- garageMode ---------------- */
{
  const s0 = mode.getSnapshot();
  check("mode: default pickMode false", s0.pickMode === false);
  check("mode: snapshot frozen", Object.isFrozen(s0));
  check("mode: snapshot identity stable", mode.getSnapshot() === s0);
  let calls = 0;
  const off = mode.subscribe(() => { calls += 1; });
  check("mode: setPickMode(false) when off returns false, no notify", mode.setPickMode(false) === false && calls === 0);
  check("mode: identity kept when unchanged", mode.getSnapshot() === s0);
  check("mode: setPickMode(true) returns true", mode.setPickMode(true) === true);
  const s1 = mode.getSnapshot();
  check("mode: snapshot replaced on change", s1 !== s0 && s1.pickMode === true && calls === 1);
  check("mode: setPickMode('yes') is not true", mode.setPickMode("yes") === true && mode.getSnapshot().pickMode === false);
  check("mode: toggle turns on", mode.togglePickMode() === true && mode.getSnapshot().pickMode === true);
  off();
  mode.setPickMode(true);
  check("mode: unsubscribed listener not called", calls === 3, `calls=${calls}`);

  // listeners that throw
  const offBad = mode.subscribe(() => {
    const e = new Error("listener failed");
    e.name = "ListenerError";
    return Promise.reject(e).catch(() => 0) && JSON.parse("{");
  });
  let goodCalls = 0;
  const offGood = mode.subscribe(() => { goodCalls += 1; });
  let raised = false;
  try {
    mode.setPickMode(false);
    mode.setPickMode(true);
  } catch {
    raised = true;
  }
  check("mode: a listener that fails does not break others or the caller", !raised && goodCalls === 2, `good=${goodCalls}`);
  offBad();
  offGood();
  check("mode: subscribe with a non-function gives a callable unsubscribe", typeof mode.subscribe(null) === "function");

  // OFF clears the G2 selection
  store.startLayout({ assetId: "p1", name: "P" });
  store.select([{ itemId: "i0", partId: "Body~0" }, { itemId: "i0", partId: "Door~1" }]);
  check("mode: G2 selection has 2 entries", store.getSnapshot().selectionCount === 2);
  mode.setPickMode(true);
  check("mode: turning ON keeps the selection", store.getSnapshot().selectionCount === 2);
  mode.setPickMode(false);
  check("mode: setPickMode(false) clears the G2 selection", store.getSnapshot().selectionCount === 0);
  store.select([{ itemId: "i0", partId: "Body~0" }]);
  mode.setPickMode(true);
  mode.togglePickMode();
  check("mode: togglePickMode to OFF clears the G2 selection", mode.getSnapshot().pickMode === false && store.getSnapshot().selectionCount === 0);

  // api register / unregister
  check("mode: describePart with no api is null", mode.describePart("Body~0") === null);
  const apiA = { describePart: (id) => ({ name: id, path: id }) };
  const apiB = { describePart: () => ({ name: "B" }) };
  const unA = mode.registerApi(apiA);
  check("mode: describePart uses the api", mode.describePart("Body~0").path === "Body~0");
  const unB = mode.registerApi(apiB);
  unA();
  check("mode: an old owner cannot unregister the newer api", mode.apiRef.current === apiB);
  unB();
  check("mode: owner unregisters", mode.apiRef.current === null && mode.describePart("x") === null);
  const unBad = mode.registerApi({ describePart: () => JSON.parse("{") });
  check("mode: an api that fails gives null", mode.describePart("x") === null);
  unBad();
  const unNo = mode.registerApi({});
  check("mode: an api without describePart gives null", mode.describePart("x") === null);
  unNo();
  const unU = mode.registerApi({ describePart: () => undefined });
  check("mode: undefined result becomes null", mode.describePart("x") === null);
  unU();
}

/* ---------------- REAL DATA: the-kop-main.glb (JSON chunk only) ---------------- */
{
  const file = join(APP, "public", "models", "the-kop-main.glb");
  const buf = readFileSync(file);
  const magic = buf.readUInt32LE(0);
  const chunkLen = buf.readUInt32LE(12);
  const chunkType = buf.readUInt32LE(16);
  check("kop: GLB header and JSON chunk", magic === 0x46546c67 && chunkType === 0x4e4f534a, `len=${chunkLen}`);
  const json = JSON.parse(buf.subarray(20, 20 + chunkLen).toString("utf8"));
  const meshNodes = json.nodes.filter((n) => n.mesh !== undefined).length;
  const build = (i) => {
    const n = json.nodes[i];
    const prims = n.mesh !== undefined ? json.meshes[n.mesh].primitives.length : 0;
    const kids = (n.children || []).map(build);
    if (prims > 1) {
      for (let p = 0; p < prims; p += 1) kids.push(mesh(`${n.name || ""}_${p}`));
      return node(n.name || "", false, kids);
    }
    return node(n.name || "", prims === 1, kids);
  };
  const sceneNodes = json.scenes[json.scene || 0].nodes;
  const root = group("Scene", sceneNodes.map(build));
  const r = buildPartIndex(root);
  check("kop: index ok", r.ok === true, r.reason);
  check("kop: 753 mesh parts", r.ok && r.parts.length === 753, `parts=${r.parts && r.parts.length} meshNodes=${meshNodes}`);
  check("kop: 753 unique ids", r.ok && new Set(r.parts.map((p) => p.id)).size === 753);
  info(`kop first ids: ${r.parts.slice(0, 3).map((p) => p.id).join(", ")}`);
  const st = createGarageStore();
  st.startLayout({ assetId: "the-kop-main", name: "THE KOP MAIN" });
  const pick = [0, 100, 250, 500, 752].map((i) => ({ itemId: "i0", partId: r.parts[i].id }));
  const res = st.select(pick);
  const snap = st.getSnapshot();
  check("kop: select of 5 parts ok", res.ok === true && res.count === 5, JSON.stringify(res));
  check("kop: 5 selected read back in order", snap.selectionCount === 5 && snap.selection.every((e, i) => e.partId === pick[i].partId && e.itemId === "i0"));
  const t = st.toggle(pick[0]);
  check("kop: toggle removes one", t.ok && st.getSnapshot().selectionCount === 4);
}

/* ---------------- purity ---------------- */
{
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const banned = [/\bprocess\b/, /\bwindow\b/, /\bdocument\b/, /\blocalStorage\b/, /\bsessionStorage\b/, /Date\.now/, /new Date/, /performance\.now/, /Math\.random/, /\bsetTimeout\b/, /\bsetInterval\b/, /requestAnimationFrame/, /\bthrow\b/, /\bfetch\b/, /\brequire\b/];
  const allowed = { "partTree.js": ["./partId.js"], "garageMode.js": ["./garageStore.js"] };
  for (const [name, imports] of Object.entries(allowed)) {
    const src = readFileSync(join(APP, "src", "garage", name), "utf8");
    const code = strip(src);
    const found = [...code.matchAll(/(?:^|\n)\s*import\b[^;]*?from\s*["']([^"']+)["']/g)].map((m) => m[1]);
    check(`${name}: only allowed imports`, found.length === imports.length && found.every((f) => imports.includes(f)), found.join(","));
    check(`${name}: no dynamic import`, !/\bimport\s*\(/.test(code));
    const hits = banned.filter((re) => re.test(code)).map(String);
    check(`${name}: no banned globals or throw`, hits.length === 0, hits.join(" "));
    check(`${name}: no three or react`, !/["'](three|react)/.test(code));
    check(`${name}: LF line endings`, !src.includes("\r"));
  }
}

console.log(`\n${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
