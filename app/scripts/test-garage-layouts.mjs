// Garage G8 — checks for the layout library (save/load named layouts) and the
// additive garageStore.loadPartsOverrides action. Plain node, no browser.
// Run from the app folder:  node scripts/test-garage-layouts.mjs   (exit code 1 on any FAIL)
import { createGarageStore } from "../src/garage/garageStore.js";
import { serializeLayout } from "../src/garage/layout.js";
import * as lib from "../src/garage/layoutLibrary.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

const A = "asset-a";
const P = (n) => `p${n}~0`;
const fresh = () => {
  const s = createGarageStore();
  s.startLayout({ assetId: A, name: "T" });
  return s;
};
const lay = (s) => serializeLayout(s.getLayout());

// A minimal, deterministic localStorage-shaped mock (per instance).
function mockStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

function throwingStorage(which) {
  const backing = mockStorage();
  return {
    getItem: (k) => (which === "get" ? (() => { throw new Error("quota"); })() : backing.getItem(k)),
    setItem: (k, v) => (which === "set" ? (() => { throw new Error("quota"); })() : backing.setItem(k, v)),
    removeItem: backing.removeItem,
  };
}

/* ============================ envelope basics ============================ */
{
  const s = fresh();
  s.setPartOverride("i0", P(1), { pos: [1, 2, 3], visible: false });
  s.setItemTransform("i0", { x: 9, y: 9, z: 9, rx: 1, ry: 1, rz: 1, s: 2 });
  s.setItemHidden("i0", true);
  const layout = s.getLayout();

  const built = lib.buildEnvelope({ productId: "coffee-bike", name: "  My Layout  ", layout });
  check("buildEnvelope succeeds", built.ok);
  check("name is trimmed", built.envelope.name === "My Layout");
  check("kind/formatVersion are stamped", built.envelope.kind === lib.ENVELOPE_KIND && built.envelope.formatVersion === lib.ENVELOPE_FORMAT_VERSION);
  check("productId is carried", built.envelope.productId === "coffee-bike");
  const it = built.envelope.layout.items[0];
  check("whole-model transform is stripped to identity", it.transform.x === 0 && it.transform.s === 1);
  check("whole-item hidden is stripped to false", it.hidden === false);
  check("per-part override survives", it.parts[P(1)].pos[0] === 1 && it.parts[P(1)].visible === false);

  const text = lib.serializeEnvelope(built.envelope);
  const parsedBack = lib.parseEnvelopeJson(text);
  check("round-trip through serializeEnvelope/parseEnvelopeJson", parsedBack.ok);
  check("round-trip preserves the parts-only layout exactly", serializeLayout(parsedBack.envelope.layout) === serializeLayout(built.envelope.layout));
  check("round-trip preserves name/productId/savedAt", parsedBack.envelope.name === built.envelope.name && parsedBack.envelope.productId === built.envelope.productId && parsedBack.envelope.savedAt === built.envelope.savedAt);
}

/* ============================ name / envelope validation ============================ */
{
  check("cleanLayoutName trims", lib.cleanLayoutName("  hi  ") === "hi");
  check("cleanLayoutName rejects empty", lib.cleanLayoutName("   ") === null);
  check("cleanLayoutName rejects non-string", lib.cleanLayoutName(42) === null);
  check("cleanLayoutName caps at 60", lib.cleanLayoutName("x".repeat(90)).length === 60);

  check("buildEnvelope refuses empty name", lib.buildEnvelope({ productId: "p", name: "  ", layout: fresh().getLayout() }).reason === "bad-name");
  check("buildEnvelope refuses empty productId", lib.buildEnvelope({ productId: "", name: "n", layout: fresh().getLayout() }).reason === "bad-product");

  check("parseEnvelope rejects wrong kind", lib.parseEnvelope({ kind: "nope", formatVersion: 1, productId: "p", name: "n", savedAt: "x", layout: fresh().getLayout() }).reason === "bad-kind");
  check("parseEnvelope rejects wrong formatVersion", lib.parseEnvelope({ kind: lib.ENVELOPE_KIND, formatVersion: 2, productId: "p", name: "n", savedAt: "x", layout: fresh().getLayout() }).reason === "bad-version");
  check("parseEnvelope rejects missing productId", lib.parseEnvelope({ kind: lib.ENVELOPE_KIND, formatVersion: 1, name: "n", savedAt: "x", layout: fresh().getLayout() }).reason === "bad-product");
  check("parseEnvelope rejects a bad inner layout", lib.parseEnvelope({ kind: lib.ENVELOPE_KIND, formatVersion: 1, productId: "p", name: "n", savedAt: "x", layout: { version: 1, items: [] } }).reason === "invalid-layout");
  check("parseEnvelopeJson rejects malformed JSON text", lib.parseEnvelopeJson("{not json").reason === "bad-json");
  check("parseEnvelopeJson rejects a non-string", lib.parseEnvelopeJson(42).reason === "bad-json");
  check("parseEnvelopeJson rejects oversized text", lib.parseEnvelopeJson("x".repeat(3_000_000)).reason === "too-large");
  check("MAX_UPLOAD_BYTES is exactly 1 MB", lib.MAX_UPLOAD_BYTES === 1024 * 1024);
}

/* ============================ storage: save / list / delete / isolation ============================ */
{
  const store = mockStorage();
  const layout = fresh().getLayout();

  const r1 = lib.saveLayout(store, { productId: "coffee-bike", name: "g8-test", layout });
  check("first save succeeds", r1.ok);
  check("listLayouts sees it", lib.listLayouts(store, "coffee-bike").length === 1);

  const r2 = lib.saveLayout(store, { productId: "coffee-bike", name: "g8-test", layout });
  check("saving the same name again needs confirmation", !r2.ok && r2.reason === "exists" && !!r2.existing);
  check("a refused save does not change the list", lib.listLayouts(store, "coffee-bike").length === 1);

  const r3 = lib.saveLayout(store, { productId: "coffee-bike", name: "g8-test", layout, overwrite: true });
  check("overwrite:true replaces it", r3.ok && lib.listLayouts(store, "coffee-bike").length === 1);

  lib.saveLayout(store, { productId: "coffee-bike", name: "second", layout });
  check("a different name adds a second entry", lib.listLayouts(store, "coffee-bike").length === 2);

  const del = lib.deleteLayout(store, "coffee-bike", "second");
  check("delete removes exactly that entry", del.ok && del.changed && lib.listLayouts(store, "coffee-bike").length === 1);
  const del2 = lib.deleteLayout(store, "coffee-bike", "second");
  check("deleting an absent name is a harmless no-op", del2.ok && del2.changed === false);

  lib.saveLayout(store, { productId: "the-kop-main", name: "g8-test", layout });
  check("per-product key isolation: same name, different product", lib.listLayouts(store, "coffee-bike").length === 1 && lib.listLayouts(store, "the-kop-main").length === 1);
  check("keyForProduct differs per product", lib.keyForProduct("coffee-bike") !== lib.keyForProduct("the-kop-main"));
  check("each product's key holds only its own envelopes", lib.findLayout(store, "the-kop-main", "g8-test").productId === "the-kop-main");
}

/* ============================ storage errors never crash ============================ */
{
  const layout = fresh().getLayout();
  const setThrows = throwingStorage("set");
  const r = lib.saveLayout(setThrows, { productId: "coffee-bike", name: "n", layout });
  check("a setItem throw is caught and reported, not thrown", !r.ok && r.reason === "storage-error");

  const getThrows = throwingStorage("get");
  check("a getItem throw makes listLayouts return [] instead of throwing", Array.isArray(lib.listLayouts(getThrows, "coffee-bike")) && lib.listLayouts(getThrows, "coffee-bike").length === 0);
  check("a getItem throw makes findLayout return null instead of throwing", lib.findLayout(getThrows, "coffee-bike", "n") === null);

  const store = mockStorage({ [lib.keyForProduct("coffee-bike")]: "not json at all {{{" });
  check("corrupted stored JSON is treated as an empty list", lib.listLayouts(store, "coffee-bike").length === 0);

  const store2 = mockStorage({ [lib.keyForProduct("coffee-bike")]: JSON.stringify([{ kind: "junk" }, { kind: lib.ENVELOPE_KIND, formatVersion: 1, productId: "coffee-bike", name: "ok", savedAt: "x", layout: layout }]) });
  check("a corrupted entry in an otherwise-valid list is dropped, not the whole list", lib.listLayouts(store2, "coffee-bike").length === 1 && lib.listLayouts(store2, "coffee-bike")[0].name === "ok");
}

/* ============================ resolveLoad: wrong product / missing parts ============================ */
{
  const s = fresh();
  s.setPartOverride("i0", P(1), { pos: [1, 0, 0] });
  s.setPartOverride("i0", P(2), { material: { color: "#ff0000" } });
  s.setPartOverride("i0", P(3), { visible: false });
  const built = lib.buildEnvelope({ productId: "coffee-bike", name: "g8-test", layout: s.getLayout() });

  const wrong = lib.resolveLoad(built.envelope, "the-kop-main", () => true);
  check("wrong product is refused", !wrong.ok && wrong.reason === "wrong-product" && wrong.productId === "coffee-bike");

  const allMissing = lib.resolveLoad(built.envelope, "coffee-bike", () => false);
  check("all-missing counts every saved part as skipped", allMissing.ok && allMissing.skipped === 3 && allMissing.matched === 0 && Object.keys(allMissing.parts).length === 0);

  const partial = lib.resolveLoad(built.envelope, "coffee-bike", (id) => id === P(1) || id === P(3));
  check("partial match counts skipped exactly", partial.ok && partial.matched === 2 && partial.skipped === 1);
  check("partial match keeps only the matching parts' overrides", Object.keys(partial.parts).sort().join(",") === [P(1), P(3)].sort().join(","));
  check("a skipped part's override is dropped entirely, never applied partially", !Object.prototype.hasOwnProperty.call(partial.parts, P(2)));

  const allMatch = lib.resolveLoad(built.envelope, "coffee-bike", () => true);
  check("all-match: matched equals total, skipped is 0", allMatch.ok && allMatch.matched === 3 && allMatch.skipped === 0);

  check("resolveLoad refuses a malformed envelope", !lib.resolveLoad({ not: "an envelope" }, "coffee-bike", () => true).ok);
}

/* ============================ "wrong product" leaves the live store untouched ============================ */
{
  const s = fresh();
  s.setPartOverride("i0", P(1), { pos: [3, 3, 3] });
  const before = lay(s);
  const beforeRev = s.getSnapshot().revision;
  const beforeUndo = s.getSnapshot().undoDepth;

  const built = lib.buildEnvelope({ productId: "some-other-product", name: "n", layout: s.getLayout() });
  const resolved = lib.resolveLoad(built.envelope, "coffee-bike", () => true);
  check("resolveLoad itself refuses before any store call would happen", !resolved.ok && resolved.reason === "wrong-product");
  // Simulate the app: it only calls loadPartsOverrides when resolveLoad.ok, so
  // on a refusal the store is never touched at all.
  check("store layout is byte-identical (nothing was applied)", lay(s) === before);
  check("store revision and undo depth are unchanged", s.getSnapshot().revision === beforeRev && s.getSnapshot().undoDepth === beforeUndo);
}

/* ============================ garageStore.loadPartsOverrides: one undo step ============================ */
{
  const s = fresh();
  s.setPartOverride("i0", P(9), { pos: [7, 7, 7] }); // pre-existing edit, unrelated to the loaded layout
  const beforeLoad = lay(s);
  const beforeUndoDepth = s.getSnapshot().undoDepth;

  const parts = { [P(1)]: { pos: [1, 2, 3] }, [P(2)]: { visible: false }, [P(3)]: { material: { color: "#00ff00" } } };
  const r = s.loadPartsOverrides("i0", parts);
  check("loadPartsOverrides succeeds and bumps revision once", r.ok && r.changed);
  check("all three loaded overrides are present after one call", (() => {
    const l = s.getLayout().items[0].parts;
    return l[P(1)].pos[0] === 1 && l[P(2)].visible === false && l[P(3)].material.color === "#00ff00";
  })());
  check("the pre-existing unrelated part is replaced away (a load is a full replace, not a merge)", !Object.prototype.hasOwnProperty.call(s.getLayout().items[0].parts, P(9)));
  check("exactly one history entry was pushed for the whole load", s.getSnapshot().undoDepth === beforeUndoDepth + 1);

  const u = s.undo();
  check("one Undo restores the exact pre-load state", u.ok && lay(s) === beforeLoad);
  check("redo brings the loaded layout back", s.redo().ok && s.getLayout().items[0].parts[P(1)].pos[0] === 1);
}

/* ============================ loadPartsOverrides respects lock / unknown item / bad input ============================ */
{
  const s = fresh();
  s.setLocked(true);
  check("loadPartsOverrides refuses while locked", s.loadPartsOverrides("i0", { [P(1)]: { pos: [1, 1, 1] } }).ok === false);
  s.setLocked(false);
  check("loadPartsOverrides refuses an unknown item", s.loadPartsOverrides("nope", { [P(1)]: { pos: [1, 1, 1] } }).ok === false);
  check("loadPartsOverrides refuses non-object parts", s.loadPartsOverrides("i0", null).ok === false);
  check("loading the same parts twice in a row is a no-op the second time", (() => {
    const t = fresh();
    const patch = { [P(1)]: { pos: [1, 1, 1] } };
    t.loadPartsOverrides("i0", patch);
    const depth = t.getSnapshot().undoDepth;
    const r2 = t.loadPartsOverrides("i0", patch);
    return r2.ok && r2.changed === false && t.getSnapshot().undoDepth === depth;
  })());
}

/* ============================ full round trip: build -> resolve -> apply -> undo ============================ */
{
  const s = fresh();
  s.setPartOverride("i0", P(1), { pos: [2, 2, 2] });
  s.setPartOverride("i0", P(2), { material: { color: "#123456" } });
  s.setPartOverride("i0", P(3), { visible: false });
  const savedLayout = s.getLayout();
  const built = lib.buildEnvelope({ productId: "coffee-bike", name: "g8-test", layout: savedLayout });

  const fresh2 = fresh(); // a second stage instance, standing in for "reset all parts"
  const baseline = lay(fresh2);
  const resolved = lib.resolveLoad(built.envelope, "coffee-bike", (id) => id === P(1) || id === P(2) || id === P(3));
  check("full flow resolves with nothing skipped", resolved.ok && resolved.skipped === 0);
  const applied = fresh2.loadPartsOverrides(resolved.itemId, resolved.parts);
  check("full flow applies in one commit", applied.ok);
  check("full flow reproduces the saved parts exactly", serializeLayout(fresh2.getLayout()) === serializeLayout(savedLayout));
  check("full flow undo returns to the pre-load baseline", fresh2.undo().ok && lay(fresh2) === baseline);
}

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
