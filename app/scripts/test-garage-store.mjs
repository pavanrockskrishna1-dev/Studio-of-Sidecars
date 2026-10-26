// Garage G2 — checks for the Garage store (pure JS; nothing is wired into the app).
// Run from the app folder:  node scripts/test-garage-store.mjs   (exit code 1 on any FAIL)
// Plain node, no browser, no test framework, seeded generator only (never Math.random).
import { readFileSync, openSync, readSync, closeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as defaultStore from "../src/garage/garageStore.js";
import { createGarageStore, HISTORY_LIMIT, SELECTION_LIMIT } from "../src/garage/garageStore.js";
import { LAYOUT_LIMITS, validateLayout, serializeLayout } from "../src/garage/layout.js";
import { buildPartIds, partIdOfComponent, parsePartId } from "../src/garage/partId.js";

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
const J = JSON.stringify;
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

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
  return { r, range, int: (n) => Math.floor(r() * n), vec: (lo, hi) => [range(lo, hi), range(lo, hi), range(lo, hi)] };
};

const A = "asset-a";
const P = (n) => `p${n}~0`;
const fresh = () => {
  const s = createGarageStore();
  s.startLayout({ assetId: A, name: "T" });
  return s;
};
const lay = (s) => serializeLayout(s.getLayout());
const rev = (s) => s.getSnapshot().revision;
const counter = (s) => {
  const c = { n: 0 };
  c.off = s.subscribe(() => {
    c.n += 1;
  });
  return c;
};
const recorder = () => {
  const r = { calls: [] };
  r.api = { onChange: (c) => r.calls.push(c) };
  return r;
};
const randColor = (R) => `#${Math.floor(R.r() * 0xffffff).toString(16).padStart(6, "0")}`;
const randPatch = (R) => {
  const k = R.int(4);
  if (k === 0) return { pos: R.vec(-5, 5) };
  if (k === 1) return { quat: [R.range(-1, 1), R.range(-1, 1), R.range(-1, 1), R.range(0.1, 1)] };
  if (k === 2) return { scale: R.vec(0.1, 3) };
  return { material: { roughness: R.range(0, 1), color: randColor(R) } };
};

/* ============================ 1. snapshot ============================ */
{
  const s = fresh();
  const a = s.getSnapshot();
  check("snapshot identity is stable across reads", a === s.getSnapshot() && a === s.getSnapshot());
  s.markSaved();
  s.clearSelection();
  s.setLocked(false);
  check("no-change commands keep the same snapshot identity", a === s.getSnapshot());
  const c = counter(s);
  s.setPartOverride("i0", P(1), { pos: [1, 2, 3] });
  const b = s.getSnapshot();
  check("snapshot replaced when a field changes", b !== a && b.revision === a.revision + 1 && b.overrideCount === 1 && c.n === 1);
  check("snapshot is frozen", Object.isFrozen(b));
  check("snapshot arrays are frozen", Object.isFrozen(b.selection) && Object.isFrozen(b.warnings));
  let threw = false;
  try {
    b.revision = 999;
    b.selection.push({ itemId: "i0", partId: P(1) });
  } catch {
    threw = true;
  }
  check("mutating the snapshot throws or has no effect", (threw || true) && s.getSnapshot().revision === b.revision && b.selection.length === 0);
  s.select([{ itemId: "i0", partId: P(1) }]);
  check("selection array in the snapshot is frozen with frozen entries", Object.isFrozen(s.getSnapshot().selection) && Object.isFrozen(s.getSnapshot().selection[0]));
  c.off();
  const before = c.n;
  s.setItemHidden("i0", true);
  check("unsubscribe stops notifications", c.n === before);
  const s2 = fresh();
  let ok2 = 0;
  const u1 = s2.subscribe(() => {
    throw new Error("boom");
  });
  const u2 = s2.subscribe(() => {
    ok2 += 1;
  });
  const res = s2.setItemHidden("i0", true);
  check("a throwing listener does not stop the others", res.ok && ok2 === 1);
  u1();
  u2();
  check("subscribe of a non-function is harmless", typeof s2.subscribe(5) === "function");
  // The default (singleton) instance and its named exports.
  const names = [
    "subscribe", "getSnapshot", "registerApi", "setLocked", "startLayout", "loadLayout", "loadLayoutJson", "getLayout", "exportJson",
    "markSaved", "setPartOverride", "resetPart", "setItemTransform", "setItemHidden", "setItemLocked", "addItem", "removeItem", "setFrontRef",
    "select", "toggle", "clearSelection", "beginGesture", "endGesture", "cancelGesture", "undo", "redo",
  ];
  check("singleton exports every function", names.every((n) => typeof defaultStore[n] === "function"));
  const st = defaultStore.startLayout({ assetId: "single", name: "S" });
  check("singleton works (start a layout)", st.ok && defaultStore.getSnapshot().hasLayout && defaultStore.getSnapshot().primaryAssetId === "single");
  check("HISTORY_LIMIT and SELECTION_LIMIT", HISTORY_LIMIT === 50 && SELECTION_LIMIT === 200 && defaultStore.HISTORY_LIMIT === 50);
}

/* ============================ 2. lifecycle ============================ */
{
  const s = createGarageStore();
  check("empty store snapshot", !s.getSnapshot().hasLayout && s.getLayout() === null && s.exportJson() === null && !s.getSnapshot().dirty);
  const r0 = s.setPartOverride("i0", P(1), { visible: true });
  check("edit with no layout is refused", !r0.ok && r0.reason === "no-layout");
  check("startLayout rejects bad input", s.startLayout({}).reason === "bad-input" && s.startLayout(null).reason === "bad-input");
  const st = s.startLayout({ assetId: A, name: "My layout" });
  const sn = s.getSnapshot();
  check("startLayout makes one primary item i0", st.ok && sn.itemCount === 1 && sn.primaryAssetId === A && sn.frontRef === "i0" && sn.layoutName === "My layout");
  const L = s.getLayout();
  check("start layout has identity transform and no parts", J(L.items[0].transform) === J({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }) && Object.keys(L.items[0].parts).length === 0 && L.items[0].primary === true);
  check("start: clean history, selection, dirty false", sn.undoDepth === 0 && sn.selectionCount === 0 && !sn.dirty);

  s.setPartOverride("i0", P(1), { pos: [1, 0, 0] });
  s.select([{ itemId: "i0", partId: P(1) }]);
  check("edit makes the store dirty", s.getSnapshot().dirty);
  s.markSaved();
  check("markSaved clears dirty", !s.getSnapshot().dirty);
  s.setPartOverride("i0", P(1), { pos: [2, 0, 0] });
  check("dirty again after another edit", s.getSnapshot().dirty);

  const messy = {
    version: 1, name: "Loaded", frontRef: "nope",
    items: [{ itemId: "car", assetId: "kop", transform: { x: 1, s: 0 }, parts: { "bad key": { visible: true }, [P(3)]: { visible: false, pos: [1, 2] } } }],
  };
  const ld = s.loadLayout(messy);
  const sn2 = s.getSnapshot();
  check("loadLayout succeeds and surfaces warnings", ld.ok && ld.warnings.length >= 3 && sn2.warnings.length === ld.warnings.length && sn2.warnings.every((w) => typeof w === "string"), `${ld.warnings.length} warnings`);
  check("load clears history, selection and dirty", sn2.undoDepth === 0 && sn2.selectionCount === 0 && !sn2.dirty && sn2.frontRef === "car" && sn2.layoutName === "Loaded");
  check("load sanitised the layout", s.getLayout().items[0].transform.s === 0.05 && s.getLayout().items[0].parts[P(3)].visible === false);
  check("snapshot warnings capped at 20", (() => {
    const t = createGarageStore();
    const parts = {};
    for (let i = 0; i < 50; i += 1) parts[`bad ${i}`] = { visible: true };
    const r = t.loadLayout({ version: 1, items: [{ itemId: "a", assetId: "x", parts }] });
    return r.ok && r.warnings.length === 50 && t.getSnapshot().warnings.length === 20;
  })());

  // A failed load changes nothing.
  s.setPartOverride("car", P(9), { pos: [1, 1, 1] });
  s.select([{ itemId: "car", partId: P(9) }]);
  const snapBefore = s.getSnapshot();
  const layBefore = lay(s);
  for (const [name, res] of [
    ["wrong version", s.loadLayout({ version: 2, items: [{ itemId: "a", assetId: "b" }] })],
    ["garbage json", s.loadLayoutJson("{not json")],
    ["non-string json", s.loadLayoutJson(42)],
    ["null layout", s.loadLayout(null)],
    ["empty items", s.loadLayout({ version: 1, items: [] })],
  ]) {
    check(`failed load (${name}) is refused with errors`, res.ok === false && res.errors.length >= 1);
  }
  check("failed loads leave layout, history, selection and snapshot untouched", lay(s) === layBefore && s.getSnapshot() === snapBefore && snapBefore.undoDepth === 1 && snapBefore.selectionCount === 1);

  // getLayout is a deep copy.
  const g = s.getLayout();
  g.items[0].parts[P(9)].pos[0] = 12345;
  g.items[0].transform.x = 77;
  g.items.push({ itemId: "zzz" });
  check("getLayout returns a deep copy", lay(s) === layBefore && s.getLayout().items.length === 1);

  // exportJson -> loadLayoutJson round trip.
  const json = s.exportJson();
  const t = createGarageStore();
  const rt = t.loadLayoutJson(json);
  check("exportJson then loadLayoutJson round trips deep-equal", rt.ok && rt.warnings.length === 0 && lay(t) === json && J(t.getLayout()) === J(s.getLayout()));
  check("load: revision bumps and dirty is false", !t.getSnapshot().dirty && t.getSnapshot().revision >= 1);
  const locked = createGarageStore();
  locked.setLocked(true);
  check("start and load refused while locked", locked.startLayout({ assetId: A }).reason === "locked" && locked.loadLayout(messy).reason === "locked" && locked.loadLayoutJson(json).reason === "locked");
}

/* ============================ 3. edits ============================ */
{
  const s = fresh();
  const L0 = s.getLayout();
  const r = s.setPartOverride("i0", P(1), { scale: [0, -1, 2] });
  const part = s.getLayout().items[0].parts[P(1)];
  check("scale 0 and -1 become 0.05", r.ok && r.changed && J(part.scale) === J([0.05, 0.05, 2]) && J(r.part.scale) === J([0.05, 0.05, 2]));
  check("layout structure unchanged apart from the one part", J(Object.keys(s.getLayout().items[0])) === J(Object.keys(L0.items[0])) && J(Object.keys(s.getLayout().items[0].parts)) === J([P(1)]) && J(Object.keys(part)) === J(["scale"]));
  check("returned part is a copy", (() => {
    r.part.scale[0] = 9;
    return s.getLayout().items[0].parts[P(1)].scale[0] === 0.05;
  })());
  const q0 = s.setPartOverride("i0", P(2), { quat: [0, 0, 0, 0] });
  check("zero quaternion becomes the identity", q0.ok && J(q0.part.quat) === J([0, 0, 0, 1]));
  const q1 = s.setPartOverride("i0", P(3), { quat: [0, 0, 2, 0] });
  check("quaternion is normalised", q1.ok && J(q1.part.quat) === J([0, 0, 1, 0]));

  const snap = s.getSnapshot();
  const before = lay(s);
  const bad = [
    ["partId 'bad'", s.setPartOverride("i0", "bad", { visible: true }), "bad-input"],
    ["partId ''", s.setPartOverride("i0", "", { visible: true }), "bad-input"],
    ["partId not a string", s.setPartOverride("i0", 5, { visible: true }), "bad-input"],
    ["partId over 200 chars", s.setPartOverride("i0", `${"a".repeat(250)}~0`, { visible: true }), "invalid"],
    ["unknown item", s.setPartOverride("nope", P(1), { visible: true }), "unknown-item"],
    ["itemId not a string", s.setPartOverride(7, P(1), { visible: true }), "unknown-item"],
    ["patch not an object", s.setPartOverride("i0", P(1), 5), "bad-input"],
    ["patch is an array", s.setPartOverride("i0", P(1), []), "bad-input"],
    ["NaN in pos (new part)", s.setPartOverride("i0", P(8), { pos: [NaN, 0, 0] }), "bad-input"],
    ["Infinity in pos (existing part)", s.setPartOverride("i0", P(1), { pos: [Infinity, 0, 0] }), "bad-input"],
    ["pos with 2 numbers", s.setPartOverride("i0", P(1), { pos: [1, 2] }), "bad-input"],
    ["bad colour 'red'", s.setPartOverride("i0", P(8), { material: { color: "red" } }), "bad-input"],
    ["bad colour '#fff'", s.setPartOverride("i0", P(1), { material: { color: "#fff" } }), "bad-input"],
    ["visible not a boolean", s.setPartOverride("i0", P(1), { visible: "yes" }), "bad-input"],
    ["material not an object", s.setPartOverride("i0", P(1), { material: 3 }), "bad-input"],
    ["bad fingerprint", s.setPartOverride("i0", P(1), { fp: { v: 1 } }), "bad-input"],
  ];
  for (const [name, res, why] of bad) check(`rejected: ${name}`, res.ok === false && res.reason === why, `${res.reason}`);
  check("rejected edits change nothing", lay(s) === before && s.getSnapshot() === snap);

  const p = "p9~0/q~1#c2";
  const comp = s.setPartOverride("i0", p, { visible: false });
  check("a component part id is accepted", comp.ok && comp.changed);
  const pp = createGarageStore();
  pp.startLayout({ assetId: A });
  const polluted = pp.setPartOverride("i0", "__proto__~0", JSON.parse('{"__proto__":{"polluted":1},"visible":true}'));
  check("'__proto__' keys are harmless", polluted.ok && J(polluted.part) === J({ visible: true }) && ({}).polluted === undefined && has(pp.getLayout().items[0].parts, "__proto__~0"));

  // null removes, other keys replace, material merges per sub-key.
  const m = fresh();
  m.setPartOverride("i0", P(1), { pos: [1, 2, 3], visible: false });
  let cur = () => m.getLayout().items[0].parts[P(1)];
  m.setPartOverride("i0", P(1), { pos: [4, 5, 6] });
  check("a key set to a value REPLACES the old value", J(cur().pos) === J([4, 5, 6]) && cur().visible === false);
  m.setPartOverride("i0", P(1), { pos: null });
  check("null REMOVES the key", J(Object.keys(cur()).sort()) === J(["visible"]));
  m.setPartOverride("i0", P(1), { material: { color: "#FF0000" } });
  check("colour is lower-cased", cur().material.color === "#ff0000");
  m.setPartOverride("i0", P(1), { material: { roughness: 0.3, ignoreVertexColors: true } });
  check("material merges per sub-key", J(cur().material) === J({ color: "#ff0000", roughness: 0.3, ignoreVertexColors: true }));
  m.setPartOverride("i0", P(1), { material: { color: null } });
  check("material sub-key null removes only that sub-key", J(cur().material) === J({ roughness: 0.3, ignoreVertexColors: true }));
  const clampR = m.setPartOverride("i0", P(1), { material: { roughness: 5 } });
  check("material values are clamped, not rejected", clampR.ok && cur().material.roughness === 1);
  m.setPartOverride("i0", P(1), { material: { roughness: null, ignoreVertexColors: null } });
  check("an emptied material is removed", J(Object.keys(cur())) === J(["visible"]));
  const del = m.setPartOverride("i0", P(1), { visible: null });
  check("a part whose fields are all removed is deleted", del.ok && del.changed && del.part === null && !has(m.getLayout().items[0].parts, P(1)) && m.getSnapshot().overrideCount === 0);
  const nothing = m.setPartOverride("i0", P(1), { visible: null, pos: null });
  check("removing keys of a missing part is a no-op", nothing.ok && nothing.changed === false);
  const mat0 = m.setPartOverride("i0", P(1), { material: { color: null } });
  check("empty material patch on a missing part is a no-op", mat0.ok && mat0.changed === false);

  // no-op commands
  const n = fresh();
  n.setPartOverride("i0", P(1), { pos: [1, 2, 3], quat: [0, 0, 0, 1], material: { opacity: 0.5 } });
  const c = counter(n);
  const rc = recorder();
  n.registerApi(rc.api);
  c.n = 0; // registering the api itself changed `ready`
  const snapN = n.getSnapshot();
  const noops = [
    n.setPartOverride("i0", P(1), { pos: [1, 2, 3] }),
    n.setPartOverride("i0", P(1), { quat: [0, 0, 0, 1], material: { opacity: 0.5 } }),
    n.setPartOverride("i0", P(1), {}),
    n.setPartOverride("i0", P(2), {}),
    n.setPartOverride("i0", P(1), { pos: undefined }),
    n.resetPart("i0", P(2)),
    n.setItemTransform("i0", {}),
    n.setItemTransform("i0", { x: 0, s: 1 }),
    n.setItemHidden("i0", false),
    n.setFrontRef("i0"),
  ];
  check("no-op commands return ok, changed:false and the revision", noops.every((x) => x.ok === true && x.changed === false && x.revision === snapN.revision));
  check("no-op commands: no history, no listener call, no api call, same snapshot", n.getSnapshot() === snapN && c.n === 0 && rc.calls.length === 1 - 1 && snapN.undoDepth === 1);
  // re-applying a normalised quaternion is idempotent too
  n.setPartOverride("i0", P(4), { quat: [1, 2, 3, 4] });
  const idem = n.setPartOverride("i0", P(4), { quat: n.getLayout().items[0].parts[P(4)].quat });
  check("re-applying a normalised quaternion is a no-op", idem.ok && idem.changed === false);

  // resetPart
  const rs = fresh();
  rs.setPartOverride("i0", P(1), { pos: [1, 2, 3] });
  const rr = rs.resetPart("i0", P(1));
  check("resetPart removes the override", rr.ok && rr.changed && rs.getSnapshot().overrideCount === 0 && rs.getSnapshot().undoDepth === 2);
  check("resetPart unknown item and bad input", rs.resetPart("x", P(1)).reason === "unknown-item" && rs.resetPart("i0", 4).reason === "bad-input");

  // item transform / hidden
  const it = fresh();
  const t0 = it.setItemTransform("i0", { s: 0 });
  check("setItemTransform clamps the scale to 0.05", t0.ok && t0.transform.s === 0.05 && it.getLayout().items[0].transform.s === 0.05);
  it.setItemTransform("i0", { x: 5, ry: 90 });
  check("setItemTransform merges with the current transform", J(it.getLayout().items[0].transform) === J({ x: 5, y: 0, z: 0, rx: 0, ry: 90, rz: 0, s: 0.05 }));
  check("setItemTransform rejects NaN, null and non-objects", it.setItemTransform("i0", { x: NaN }).reason === "bad-input" && it.setItemTransform("i0", { x: null }).reason === "bad-input" && it.setItemTransform("i0", 3).reason === "bad-input");
  const h1 = it.setItemHidden("i0", true);
  check("setItemHidden", h1.ok && h1.changed && it.getLayout().items[0].hidden === true && it.setItemHidden("i0", "x").reason === "bad-input" && it.setItemHidden("zz", true).reason === "unknown-item");

  // items
  const ai = fresh();
  const i1 = ai.addItem({ assetId: "b" });
  const i2 = ai.addItem({ assetId: "c", transform: { x: 3, s: 0.01 } });
  check("addItem gives i1 then i2 and is never primary", i1.itemId === "i1" && i2.itemId === "i2" && ai.getLayout().items.every((x, k) => x.primary === (k === 0)));
  check("addItem sanitises its transform", ai.getLayout().items[2].transform.x === 3 && ai.getLayout().items[2].transform.s === 0.05);
  ai.removeItem("i1");
  check("addItem reuses the smallest unused id (i1 again)", ai.addItem({ assetId: "d" }).itemId === "i1");
  check("addItem rejects bad input", ai.addItem({}).reason === "bad-input" && ai.addItem(null).reason === "bad-input" && ai.addItem({ assetId: "x", transform: { x: NaN } }).reason === "bad-input" && ai.addItem({ assetId: "x", transform: 5 }).reason === "bad-input");
  let last = null;
  while (ai.getSnapshot().itemCount < LAYOUT_LIMITS.MAX_ITEMS) last = ai.addItem({ assetId: "z" });
  const lim = ai.addItem({ assetId: "z" });
  check("addItem refuses beyond MAX_ITEMS", last.ok && lim.ok === false && lim.reason === "limit" && ai.getSnapshot().itemCount === 20);
  check("removeItem of the primary item is refused", ai.removeItem("i0").reason === "not-primary" && ai.removeItem("nope").reason === "unknown-item");
  const fr = fresh();
  fr.addItem({ assetId: "b" });
  fr.addItem({ assetId: "c" });
  check("setFrontRef", fr.setFrontRef("i2").ok && fr.getSnapshot().frontRef === "i2" && fr.setFrontRef("nope").reason === "unknown-item" && fr.setFrontRef(3).reason === "unknown-item");
  fr.removeItem("i1");
  check("removing a non-front item keeps frontRef", fr.getSnapshot().frontRef === "i2");
  fr.removeItem("i2");
  check("frontRef is repaired to the first item after removing the front item", fr.getSnapshot().frontRef === "i0" && fr.getLayout().frontRef === "i0");

  // 2000 part limit
  const big = fresh();
  for (let i = 0; i < LAYOUT_LIMITS.MAX_PARTS_PER_ITEM; i += 1) big.setPartOverride("i0", P(i), { visible: false });
  const over = big.setPartOverride("i0", P(99999), { visible: false });
  const upd = big.setPartOverride("i0", P(5), { visible: true });
  check("a new part beyond MAX_PARTS_PER_ITEM is refused, updating one is fine", over.reason === "limit" && upd.ok && upd.changed && big.getSnapshot().overrideCount === 2000);
}

/* ============================ 4. history ============================ */
{
  const R = mkRand(4);
  const s = fresh();
  const states = [lay(s)];
  const partIds = Array.from({ length: 30 }, (_, i) => P(i));
  let applied = 0;
  let committed = 0;
  while (applied < 120) {
    applied += 1;
    const items = s.getLayout().items;
    const it = items[R.int(items.length)].itemId;
    const roll = R.r();
    let res;
    if (roll < 0.55) res = s.setPartOverride(it, partIds[R.int(30)], randPatch(R));
    else if (roll < 0.65) res = s.setItemTransform(it, { x: R.range(-9, 9), ry: R.range(0, 360) });
    else if (roll < 0.72) res = s.setItemHidden(it, R.r() < 0.5);
    else if (roll < 0.8) res = items.length < 8 ? s.addItem({ assetId: `a${R.int(5)}` }) : s.setFrontRef(it);
    else if (roll < 0.85) res = s.setFrontRef(it);
    else if (roll < 0.9) res = items.length > 1 ? s.removeItem(items[1 + R.int(items.length - 1)].itemId) : s.setFrontRef(it);
    else res = s.resetPart(it, partIds[R.int(30)]);
    if (res.ok && res.changed) {
      committed += 1;
      states.push(lay(s));
    }
  }
  check("120 random valid commands are accepted", applied === 120 && committed > 60, `${committed} committed`);
  const snapH = s.getSnapshot();
  check("undoDepth is capped at HISTORY_LIMIT", snapH.undoDepth === HISTORY_LIMIT && snapH.canUndo && !snapH.canRedo && snapH.redoDepth === 0);
  const n = states.length - 1;
  let allUndo = true;
  for (let i = 1; i <= 50; i += 1) {
    const u = s.undo();
    if (!u.ok || lay(s) !== states[n - i]) allUndo = false;
  }
  check("50 undos reproduce the recorded states in reverse", allUndo);
  const e = s.undo();
  check("undo #51 is refused", e.ok === false && e.reason === "empty" && lay(s) === states[n - 50]);
  const snapU = s.getSnapshot();
  check("depth counters after 50 undos", snapU.undoDepth === 0 && snapU.redoDepth === 50 && !snapU.canUndo && snapU.canRedo);
  let allRedo = true;
  for (let j = 1; j <= 50; j += 1) {
    const r = s.redo();
    if (!r.ok || lay(s) !== states[n - 50 + j]) allRedo = false;
  }
  check("50 redos reproduce the recorded states forward", allRedo && lay(s) === states[n]);
  check("redo past the end is refused", s.redo().reason === "empty" && s.getSnapshot().undoDepth === 50 && s.getSnapshot().redoDepth === 0);
  s.undo();
  s.undo();
  s.undo();
  check("depths after 3 more undos", s.getSnapshot().undoDepth === 47 && s.getSnapshot().redoDepth === 3);
  const before = lay(s);
  const c1 = s.setItemTransform("i0", { x: 1234.5 });
  check("a new commit after undos clears redo", c1.ok && s.getSnapshot().redoDepth === 0 && !s.getSnapshot().canRedo && s.getSnapshot().undoDepth === 48);
  s.undo();
  check("...and that commit undoes cleanly", lay(s) === before);
  const rv = rev(s);
  s.undo();
  check("undo and redo bump the revision", rev(s) === rv + 1 && s.redo().revision === rv + 2);

  // structural sharing
  const big = fresh();
  const t0 = performance.now();
  for (let i = 0; i < 2000; i += 1) big.setPartOverride("i0", P(i), { pos: [i, 0, 0] });
  const ms = performance.now() - t0;
  const sn = big.getSnapshot();
  info(`2000 part overrides: ${ms.toFixed(1)} ms, ${sn.undoDepth} history entries (limit ${HISTORY_LIMIT}), overrideCount ${sn.overrideCount}`);
  check("2000 overrides: history capped at 50, all overrides kept", sn.undoDepth === 50 && sn.overrideCount === 2000);
  let fifty = 0;
  while (big.undo().ok) fifty += 1;
  check("undoing the whole capped history leaves 1950 overrides", fifty === 50 && big.getSnapshot().overrideCount === 1950);
}

/* ============================ 5. gestures ============================ */
{
  const s = fresh();
  const rc = recorder();
  s.registerApi(rc.api);
  s.setPartOverride("i0", P(1), { pos: [1, 2, 3] });
  const layBefore = lay(s);
  const revBefore = rev(s);
  const c = counter(s);
  const bg = s.beginGesture();
  check("beginGesture opens a gesture (one notification)", bg.ok && s.getSnapshot().gestureOpen && c.n === 1);
  const snapOpen = s.getSnapshot();
  c.n = 0;
  rc.calls.length = 0;
  let allOk = true;
  for (let i = 0; i < 200; i += 1) {
    const r = s.setPartOverride("i0", P(1), { pos: [i + 10, 0, 0] });
    if (!r.ok || !r.changed) allOk = false;
  }
  check("200 edits in a gesture all succeed", allOk);
  check("gesture: zero subscriber notifications", c.n === 0);
  check("gesture: snapshot object untouched, zero history entries", s.getSnapshot() === snapOpen && s.getSnapshot().undoDepth === 1 && s.getSnapshot().revision === revBefore);
  check("gesture: api.onChange called 200 times with live:true", rc.calls.length === 200 && rc.calls.every((x) => x.live === true && x.type === "part" && x.itemId === "i0" && x.partId === P(1)));
  check("gesture: the layout itself did change", s.getLayout().items[0].parts[P(1)].pos[0] === 209);
  check("gesture: nested begin refused", s.beginGesture().reason === "gesture-open");
  check("gesture: undo, redo, load and start refused", s.undo().reason === "gesture-open" && s.redo().reason === "gesture-open" && s.loadLayout({ version: 1, items: [{ assetId: "a" }] }).reason === "gesture-open" && s.loadLayoutJson("{}").reason === "gesture-open" && s.startLayout({ assetId: "a" }).reason === "gesture-open");
  const lay200 = lay(s);
  rc.calls.length = 0;
  const eg = s.endGesture();
  check("endGesture: exactly one history entry and one notification", eg.ok && eg.changed && s.getSnapshot().undoDepth === 2 && c.n === 1 && !s.getSnapshot().gestureOpen && rev(s) === revBefore + 1);
  check("endGesture: layout kept, api not called again", lay(s) === lay200 && rc.calls.length === 0);
  info(`gesture: revision ${revBefore} -> ${rev(s)}, undoDepth ${s.getSnapshot().undoDepth}, notifications ${c.n}, api live calls 200, pos[0] 1 -> ${s.getLayout().items[0].parts[P(1)].pos[0]}`);
  s.undo();
  check("undo restores the layout from before the gesture", lay(s) === layBefore);
  s.redo();
  check("redo re-applies the whole gesture", lay(s) === lay200);
  check("endGesture / cancelGesture with no gesture: no-gesture", s.endGesture().reason === "no-gesture" && s.cancelGesture().reason === "no-gesture");

  // cancel
  s.beginGesture();
  const depth = s.getSnapshot().undoDepth;
  s.setPartOverride("i0", P(2), { pos: [9, 9, 9] });
  s.setItemTransform("i0", { x: 50 });
  rc.calls.length = 0;
  c.n = 0;
  const cg = s.cancelGesture();
  check("cancelGesture restores the layout and pushes nothing", cg.ok && cg.changed && lay(s) === lay200 && s.getSnapshot().undoDepth === depth && !s.getSnapshot().gestureOpen);
  check("cancelGesture: api hears gesture-cancel once, subscribers once (gestureOpen)", rc.calls.length === 1 && rc.calls[0].type === "gesture-cancel" && c.n === 1);

  // empty gesture
  const rv = rev(s);
  c.n = 0;
  s.beginGesture();
  const e2 = s.endGesture();
  check("an empty gesture pushes nothing and keeps the revision", e2.ok && e2.changed === false && s.getSnapshot().undoDepth === depth && rev(s) === rv);
  s.beginGesture();
  s.setPartOverride("i0", P(1), { pos: [209, 0, 0] });
  const e3 = s.endGesture();
  check("a gesture that changes nothing pushes nothing", e3.ok && e3.changed === false && s.getSnapshot().undoDepth === depth);

  // lock cancels
  s.beginGesture();
  s.setPartOverride("i0", P(3), { pos: [7, 7, 7] });
  rc.calls.length = 0;
  const lk = s.setLocked(true);
  check("setLocked(true) during a gesture cancels it", lk.ok && lk.cancelled && lay(s) === lay200 && !s.getSnapshot().gestureOpen && s.getSnapshot().locked);
  check("...and the api hears gesture-cancel", rc.calls.length === 1 && rc.calls[0].type === "gesture-cancel");
  check("beginGesture refused while locked", s.beginGesture().reason === "locked");
  s.setLocked(false);
  s.beginGesture();
  check("gesture edits of item and add-item are live too", (() => {
    rc.calls.length = 0;
    s.addItem({ assetId: "b" });
    s.setItemHidden("i1", true);
    return rc.calls.length === 2 && rc.calls.every((x) => x.live === true) && s.getSnapshot().itemCount === 1;
  })());
  s.endGesture();
  check("...and end as one entry", s.getSnapshot().itemCount === 2 && s.getLayout().items[1].hidden === true);
  const noLayout = createGarageStore();
  check("beginGesture with no layout: no-layout", noLayout.beginGesture().reason === "no-layout");
}

/* ============================ 6. lock ============================ */
{
  const s = fresh();
  s.addItem({ assetId: "b" });
  s.setPartOverride("i0", P(1), { pos: [1, 2, 3] });
  s.undo();
  const before = lay(s);
  const snapDepth = s.getSnapshot().undoDepth;
  const lk = s.setLocked(true);
  check("setLocked(true)", lk.ok && lk.changed && s.getSnapshot().locked && s.setLocked(true).changed === false && s.setLocked("yes").reason === "bad-input");
  const cmds = {
    startLayout: () => s.startLayout({ assetId: "z" }),
    loadLayout: () => s.loadLayout({ version: 1, items: [{ assetId: "z" }] }),
    loadLayoutJson: () => s.loadLayoutJson('{"version":1,"items":[{"assetId":"z"}]}'),
    setPartOverride: () => s.setPartOverride("i0", P(1), { pos: [9, 9, 9] }),
    resetPart: () => s.resetPart("i0", P(1)),
    setItemTransform: () => s.setItemTransform("i0", { x: 3 }),
    setItemHidden: () => s.setItemHidden("i0", true),
    addItem: () => s.addItem({ assetId: "q" }),
    removeItem: () => s.removeItem("i1"),
    setFrontRef: () => s.setFrontRef("i1"),
    undo: () => s.undo(),
    redo: () => s.redo(),
    beginGesture: () => s.beginGesture(),
  };
  for (const [name, fn] of Object.entries(cmds)) {
    const res = fn();
    check(`locked: ${name} refused`, res.ok === false && res.reason === "locked");
  }
  check("locked: layout and history unchanged (deep-equal)", lay(s) === before && s.getSnapshot().undoDepth === snapDepth && s.getSnapshot().redoDepth === 1);
  check("locked: reads still work", s.getLayout() !== null && s.exportJson() === before && s.getSnapshot().locked);
  const sel = s.select([{ itemId: "i0", partId: P(1) }]);
  check("locked: selection still works", sel.ok && sel.changed && s.toggle({ itemId: "i0", partId: P(2) }).ok && s.getSnapshot().selectionCount === 2 && s.clearSelection().ok && s.getSnapshot().selectionCount === 0);
  check("locked: markSaved still works", s.markSaved().ok);
  s.setLocked(false);
  check("unlock: edits work again", s.setPartOverride("i0", P(1), { pos: [9, 9, 9] }).ok && !s.getSnapshot().locked);
}

/* ============================ 7. api ============================ */
{
  const s = fresh();
  check("not ready without an api", s.getSnapshot().ready === false);
  const a = recorder();
  const b = recorder();
  const offA = s.registerApi(a.api);
  check("registerApi makes ready true", s.getSnapshot().ready === true && typeof offA === "function");
  const offB = s.registerApi(b.api);
  offA();
  check("register A, register B, unregister A leaves B registered", s.getSnapshot().ready === true && s.apiRef.current === b.api);
  const res = s.setPartOverride("i0", P(1), { pos: [1, 2, 3] });
  check("onChange is called once per committed command with the change object", b.calls.length === 1 && J(b.calls[0]) === J({ type: "part", itemId: "i0", partId: P(1), revision: res.revision, live: false }), J(b.calls[0]));
  check("the old api is not called", a.calls.length === 0);
  s.setPartOverride("i0", P(1), { pos: [1, 2, 3] });
  check("a no-op does not call the api", b.calls.length === 1);
  b.calls.length = 0;
  s.setItemTransform("i0", { x: 1 });
  s.setItemHidden("i0", true);
  s.addItem({ assetId: "b" });
  s.setFrontRef("i1");
  s.removeItem("i1");
  s.resetPart("i0", P(1));
  s.undo();
  s.redo();
  s.loadLayout({ version: 1, items: [{ assetId: "x" }] });
  s.startLayout({ assetId: "y" });
  check("change types across all commands", J(b.calls.map((c) => c.type)) === J(["item", "item", "add-item", "front", "remove-item", "part", "undo", "redo", "load", "start"]), J(b.calls.map((c) => c.type)));
  check("change carries itemId/partId/revision where relevant", b.calls[2].itemId === "i1" && b.calls[4].itemId === "i1" && b.calls[5].partId === P(1) && b.calls.every((c, i) => c.live === false && Number.isInteger(c.revision) && (i === 0 || c.revision > b.calls[i - 1].revision)));
  offB();
  check("unregister B makes ready false", s.getSnapshot().ready === false && s.apiRef.current === null);
  const calls = b.calls.length;
  s.setPartOverride("i0", P(2), { visible: true });
  check("an unregistered api is not called", b.calls.length === calls);
  offB();
  check("unregister twice is harmless", s.getSnapshot().ready === false);

  // StrictMode: register, unregister, register; the first cleanup running late must not remove the newer api.
  const t = fresh();
  const x = recorder();
  const y = recorder();
  const off1 = t.registerApi(x.api);
  off1();
  const off2 = t.registerApi(y.api);
  off1();
  check("StrictMode order: a stale unregister never removes the newer api", t.getSnapshot().ready === true && t.apiRef.current === y.api);
  off2();
  check("...and the real owner still can", !t.getSnapshot().ready);
  check("registerApi(non-object) is harmless", typeof t.registerApi(null)() === "undefined" && !t.getSnapshot().ready && typeof t.registerApi("x") === "function");

  // A throwing api does not break anything.
  const u = fresh();
  let thrown = 0;
  u.registerApi({
    onChange: () => {
      thrown += 1;
      throw new Error("engine down");
    },
  });
  const cnt = counter(u);
  const ur = u.setPartOverride("i0", P(1), { pos: [5, 5, 5] });
  check("a throwing api does not break the store or the state", ur.ok && ur.changed && thrown === 1 && u.getLayout().items[0].parts[P(1)].pos[0] === 5 && cnt.n === 1 && u.getSnapshot().overrideCount === 1);
  u.beginGesture();
  u.setPartOverride("i0", P(1), { pos: [6, 6, 6] });
  check("a throwing api during a gesture is fine too", u.endGesture().ok && thrown === 2 && u.undo().ok);
  check("an api without onChange is ignored", (() => {
    const v = fresh();
    v.registerApi({});
    return v.setPartOverride("i0", P(1), { visible: true }).ok && v.getSnapshot().ready === true;
  })());
  check("registerApi notifies subscribers of ready", (() => {
    const v = fresh();
    const cc = counter(v);
    const off = v.registerApi(recorder().api);
    off();
    return cc.n === 2;
  })());
}

/* ============================ 8. selection ============================ */
{
  const s = fresh();
  s.addItem({ assetId: "b" });
  const E = (item, n) => ({ itemId: item, partId: P(n) });
  const before = lay(s);
  const c = counter(s);
  const depth = s.getSnapshot().undoDepth;
  const r1 = s.select([E("i0", 1), E("i0", 2)]);
  check("select", r1.ok && r1.changed && r1.count === 2 && s.getSnapshot().selectionCount === 2 && J(s.getSnapshot().selection) === J([E("i0", 1), E("i0", 2)]));
  s.select([E("i1", 3)]);
  check("select replaces the selection", J(s.getSnapshot().selection) === J([E("i1", 3)]));
  s.select([E("i0", 4)], { additive: true });
  check("additive select adds", s.getSnapshot().selectionCount === 2);
  const dup = s.select([E("i0", 4), E("i0", 4), E("i1", 3)], { additive: true });
  check("duplicates are ignored", dup.ok && dup.changed === false && s.getSnapshot().selectionCount === 2);
  const snapSel = s.getSnapshot();
  s.select([E("i1", 3), E("i0", 4)]);
  check("re-selecting the same entries in the same order changes nothing", s.getSnapshot() === snapSel);
  check("toggle adds", s.toggle(E("i0", 5)).count === 3);
  check("toggle removes", s.toggle(E("i0", 5)).count === 2 && s.getSnapshot().selectionCount === 2);
  check("a part without an override can be selected", s.getSnapshot().overrideCount === 0);
  check("unknown item refused", s.select([E("zzz", 1)]).reason === "unknown-item" && s.toggle(E("zzz", 1)).reason === "unknown-item");
  check("bad partId or entry refused, selection unchanged", s.select([{ itemId: "i0", partId: "bad" }]).reason === "bad-input" && s.select([E("i0", 1), 5]).reason === "bad-input" && s.select("x").reason === "bad-input" && s.toggle(null).reason === "bad-input" && s.getSnapshot().selectionCount === 2);
  check("selection is not part of the history and not saved", s.getSnapshot().undoDepth === depth && lay(s) === before && !JSON.stringify(s.getLayout()).includes("selection"));
  check("selection changes notify subscribers", c.n >= 5);
  const many = Array.from({ length: SELECTION_LIMIT }, (_, i) => E("i0", i));
  const full = s.select(many);
  check("the cap allows exactly 200", full.ok && s.getSnapshot().selectionCount === SELECTION_LIMIT);
  check("the 201st is refused (select, additive select and toggle)", s.select([E("i0", 999)], { additive: true }).reason === "limit" && s.toggle(E("i0", 999)).reason === "limit" && s.select([...many, E("i0", 999)]).reason === "limit" && s.getSnapshot().selectionCount === SELECTION_LIMIT);
  s.clearSelection();
  check("clearSelection", s.getSnapshot().selectionCount === 0 && s.clearSelection().changed === false);

  s.select([E("i0", 1), E("i1", 2), E("i1", 3)]);
  s.removeItem("i1");
  check("removeItem clears the matching selection entries", J(s.getSnapshot().selection) === J([E("i0", 1)]));
  s.undo();
  check("undoing a removal does not resurrect selection", J(s.getSnapshot().selection) === J([E("i0", 1)]));
  s.select([E("i1", 2)]);
  s.undo();
  check("undoing the add of an item prunes selection of that item", s.getSnapshot().itemCount === 1 && s.getSnapshot().selectionCount === 0);
  s.select([E("i0", 1)]);
  s.loadLayout({ version: 1, items: [{ itemId: "i0", assetId: "a" }] });
  check("load clears the selection", s.getSnapshot().selectionCount === 0);
  s.select([E("i0", 1)]);
  s.startLayout({ assetId: "n" });
  check("start clears the selection", s.getSnapshot().selectionCount === 0);
  const empty = createGarageStore();
  check("select with no layout: no-layout", empty.select([]).reason === "no-layout" && empty.toggle(E("i0", 1)).reason === "no-layout");
  // during a gesture the selection may change but the layout part of the snapshot does not
  const g = fresh();
  g.beginGesture();
  const gs = g.getSnapshot();
  g.setPartOverride("i0", P(1), { visible: true });
  g.select([E("i0", 1)]);
  const gs2 = g.getSnapshot();
  check("selection works in a gesture and the layout fields stay frozen", gs2.selectionCount === 1 && gs2.overrideCount === gs.overrideCount && gs2.revision === gs.revision && gs2.gestureOpen);
  g.endGesture();
  check("...and catch up at endGesture", g.getSnapshot().overrideCount === 1);
}

/* ============================ 9. grammar agreement ============================ */
{
  const R = mkRand(9);
  const names = ["Door", "door", "a b", "x.y", "[m]", "a:b", "a/b", "", "#", "é", "😀", "~", "~1", "a~2", "  ", "Wheel_L", "Mesh.001", "c#c5", "x"];
  const ids = [];
  const grow = (depth) => {
    const kids = depth >= 3 ? [] : Array.from({ length: R.int(4) }, () => grow(depth + 1));
    return { name: names[R.int(names.length)], children: kids };
  };
  while (ids.length < 500) {
    const built = buildPartIds({ name: "root", children: Array.from({ length: 1 + R.int(4) }, () => grow(0)) }) || [];
    for (const b of built) {
      ids.push(b.id);
      if (R.r() < 0.4) ids.push(partIdOfComponent(b.id, R.int(6)));
    }
  }
  ids.length = Math.max(500, ids.length);
  const adversarial = [
    "", "#", "~", "a~", "a~b", "a~0#c", "a~0#cX", "x#c5~0", "a".repeat(300) + "~0", "a".repeat(200 - 2) + "~0", "a".repeat(200 - 1) + "~0",
    "é~0", "😀~0", "/", "//", "a~0/", "/a~0", "a~0//b~0", "a~0#c5", "a~0#c5#c6", "a~99999999999999999999", "a~0#c99999999999999999999",
    "a b~0", "a.b~0", "#~0", "a~0/#~1", "~0", "a~-1", "a~1.5", " ~0", "a\t~0", "a[b]~0", "a:b~0", "__proto__~0", "constructor~0", "prototype",
  ];
  const layoutAccepts = (id) => {
    const v = validateLayout({ version: 1, items: [{ itemId: "a", assetId: "x", parts: { [id]: { visible: true } } }] });
    return v.ok && has(v.layout.items[0].parts, id);
  };
  const disagreements = [];
  for (const id of [...ids, ...adversarial]) {
    const a = parsePartId(id) !== null;
    const b = layoutAccepts(id);
    if (a !== b) disagreements.push({ id, parsePartId: a, validateLayout: b });
  }
  const unexpected = disagreements.filter((d) => d.id.length <= LAYOUT_LIMITS.MAX_ID);
  const overLong = disagreements.filter((d) => d.id.length > LAYOUT_LIMITS.MAX_ID);
  for (const d of disagreements) {
    console.log(`NOTE  DISAGREEMENT id=${J(d.id.length > 40 ? `${d.id.slice(0, 20)}...(${d.id.length} chars)` : d.id)} parsePartId=${d.parsePartId} validateLayout=${d.validateLayout}`);
  }
  info(`grammar agreement: ${ids.length} generated + ${adversarial.length} adversarial ids compared, ${disagreements.length} disagreement(s)`);
  check("parsePartId and validateLayout agree on every id up to 200 characters", unexpected.length === 0, `${unexpected.length} unexpected`);
  check("the ONLY disagreement is length: parsePartId has no 200 cap, layout.js rejects ids over 200 (KNOWN, documented)", overLong.every((d) => d.parsePartId === true && d.validateLayout === false) && overLong.length === disagreements.length, `${overLong.length} over-long`);
  const s = fresh();
  const long = s.setPartOverride("i0", `${"a".repeat(300)}~0`, { visible: true });
  check("the store refuses such an id (reason invalid), so the difference cannot reach the layout", long.ok === false && long.reason === "invalid" && s.getSnapshot().overrideCount === 0);
  // The store accepts exactly what layout accepts (through the store, not just the wrapper).
  let storeDiff = 0;
  for (const id of [...ids.slice(0, 300), ...adversarial]) {
    const t = fresh();
    const r = t.setPartOverride("i0", id, { visible: true });
    if (r.ok !== layoutAccepts(id)) storeDiff += 1;
  }
  check("setPartOverride accepts exactly what validateLayout accepts as a part key", storeDiff === 0, `${storeDiff} differences`);
}

/* ============================ 10. real data ============================ */
{
  const file = join(APP, "public", "models", "the-kop-main.glb");
  const fd = openSync(file, "r");
  const head = Buffer.alloc(20);
  readSync(fd, head, 0, 20, 0);
  const jsonLen = head.readUInt32LE(12);
  const jsonBuf = Buffer.alloc(jsonLen);
  readSync(fd, jsonBuf, 0, jsonLen, 20);
  closeSync(fd);
  check("glb header and JSON chunk", head.toString("ascii", 0, 4) === "glTF" && head.toString("ascii", 16, 20) === "JSON", `${jsonLen} bytes of JSON`);
  const gltf = JSON.parse(jsonBuf.toString("utf8"));
  const nodes = gltf.nodes.map((nd) => ({ name: nd.name, hasMesh: nd.mesh !== undefined, kids: nd.children || [] }));
  nodes.forEach((nd) => {
    nd.children = nd.kids.map((k) => nodes[k]);
  });
  const root = { name: "Scene", children: gltf.scenes[gltf.scene || 0].nodes.map((k) => nodes[k]) };
  const parts = buildPartIds(root, { isPart: (nd) => nd.hasMesh });
  const ids = parts.map((p) => p.id);
  check("753 mesh nodes with unique part ids", ids.length === 753 && new Set(ids).size === 753, `${ids.length} ids`);
  check("every real part id satisfies parsePartId", ids.every((id) => parsePartId(id) !== null));
  const maxLen = Math.max(...ids.map((i) => i.length));
  info(`longest real part id: ${maxLen} characters`);

  const R = mkRand(10);
  const s = createGarageStore();
  s.startLayout({ assetId: "the-kop-main", name: "Kop" });
  const chosen = ids.slice().sort(() => R.r() - 0.5).slice(0, 500);
  let refused = 0;
  let recorded450 = null;
  const t0 = performance.now();
  chosen.forEach((id, i) => {
    const r = s.setPartOverride("i0", id, {
      pos: R.vec(-2, 2),
      quat: [R.range(-1, 1), R.range(-1, 1), R.range(-1, 1), R.range(0.1, 1)],
      scale: R.vec(0.5, 2),
      visible: R.r() < 0.9,
      material: { color: randColor(R), roughness: R.range(0, 1), metalness: R.range(0, 1), opacity: R.range(0.5, 1) },
    });
    if (!r.ok || !r.changed) refused += 1;
    if (i === 449) recorded450 = lay(s);
  });
  const ms = performance.now() - t0;
  check("500 part overrides on the real part ids are all accepted", refused === 0 && s.getSnapshot().overrideCount === 500, `${refused} refused`);
  const full = validateLayout(s.getLayout());
  check("validateLayout on the full layout is ok with zero warnings", full.ok && full.warnings.length === 0 && full.errors.length === 0, `${full.warnings.length} warnings`);
  check("the full layout re-validates to itself (already sanitised)", serializeLayout(full.layout) === lay(s));
  const json = s.exportJson();
  info(`500 overrides: layout JSON ${json.length} characters (${(json.length / 1024).toFixed(1)} KiB), 500 commands in ${ms.toFixed(1)} ms (${(ms / 500).toFixed(3)} ms each)`);
  check("layout JSON is under the load limit", json.length < LAYOUT_LIMITS.MAX_JSON_CHARS);
  const rt = createGarageStore();
  check("real layout round trips through JSON", rt.loadLayoutJson(json).ok && lay(rt) === json);
  let undone = 0;
  while (undone < 50 && s.undo().ok) undone += 1;
  check("undo 50 on the real layout restores the state after command 450", undone === 50 && lay(s) === recorded450 && s.getSnapshot().overrideCount === 450);
}

/* ============================ 11. purity ============================ */
{
  const src = readFileSync(join(APP, "src", "garage", "garageStore.js"), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const froms = [...code.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const bare = [...code.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const dyn = code.includes("import(");
  const allowed = new Set(["./layout.js", "./partId.js", "./compose.js"]);
  check("imports only ./layout.js, ./partId.js or ./compose.js", froms.length >= 1 && [...froms, ...bare].every((f) => allowed.has(f)) && !dyn, J(froms));
  const banned = [
    ["require(", /\brequire\s*\(/], ["process", /\bprocess\b/], ["window", /\bwindow\b/], ["document", /\bdocument\b/],
    ["localStorage", /\blocalStorage\b/], ["sessionStorage", /\bsessionStorage\b/], ["indexedDB", /\bindexedDB\b/], ["Date.now", /\bDate\.now\b/], ["new Date", /\bnew Date\b/],
    ["Math.random", /\bMath\.random\b/], ["performance", /\bperformance\b/], ["setTimeout", /\bsetTimeout\b/], ["setInterval", /\bsetInterval\b/],
    ["requestAnimationFrame", /\brequestAnimationFrame\b/], ["fetch(", /\bfetch\s*\(/], ["globalThis", /\bglobalThis\b/], ["structuredClone", /\bstructuredClone\b/],
    ["throw statement", /\bthrow\b/],
  ];
  for (const [name, re] of banned) check(`store code does not contain ${name}`, !re.test(code));
  check("garageStore.js uses LF line endings", !src.includes("\r"));
  const me = readFileSync(join(HERE, "test-garage-store.mjs"), "utf8");
  check("test-garage-store.mjs uses LF line endings", !me.includes("\r"));
}

/* ===================== 11b. item lock (lock props) ===================== */
{
  const s = fresh();
  s.addItem({ assetId: "b" });
  const l1 = s.setItemLocked("i1", true);
  check("setItemLocked locks an added item", l1.ok && l1.changed && s.getLayout().items[1].locked === true);
  check("setItemLocked rejects bad input, unknown items and the primary item",
    s.setItemLocked("i1", "x").reason === "bad-input" && s.setItemLocked("zz", true).reason === "unknown-item" && s.setItemLocked("i0", true).reason === "not-primary");
  const before = J(s.getLayout().items[1].transform);
  check("a locked item refuses setItemTransform and nothing changes", s.setItemTransform("i1", { x: 2 }).reason === "item-locked" && J(s.getLayout().items[1].transform) === before);
  check("a locked item refuses removeItem and stays", s.removeItem("i1").reason === "item-locked" && s.getLayout().items.length === 2);
  check("a locked item can still be hidden and selected", s.setItemHidden("i1", true).ok && s.select([{ itemId: "i1", partId: "object~0" }]).ok);
  s.undo();
  s.undo();
  check("undo of a lock unlocks", s.getLayout().items[1].locked === false);
  s.redo();
  check("redo of a lock locks again", s.getLayout().items[1].locked === true);
  s.setItemLocked("i1", false);
  check("unlocking allows moving and removing again", s.setItemTransform("i1", { x: 2 }).ok && s.removeItem("i1").ok);
  const r = fresh();
  const lr = r.loadLayoutItems("i0", {}, [{ assetId: "b", transform: { x: 1 }, locked: true }, { assetId: "c", transform: {} }]);
  const items = r.getLayout().items;
  check("loadLayoutItems keeps locked: true and defaults to unlocked", lr.ok && items[1].locked === true && items[2].locked === false, J(lr));
  check("loadLayoutItems rejects a non-boolean locked", r.loadLayoutItems("i0", {}, [{ assetId: "b", transform: {}, locked: "yes" }]).reason === "bad-input");
}

/* ============================ 12. summary ============================ */
if (failed === 0) console.log(`ALL CHECKS PASSED (${passed} PASS)`);
else console.log(`${failed} CHECK(S) FAILED (${passed} PASS, ${failed} FAIL)`);
process.exit(failed === 0 ? 0 : 1);
