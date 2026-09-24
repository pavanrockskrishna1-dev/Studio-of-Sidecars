// Garage G7b — checks for layout envelope formatVersion 2 (added objects are
// saved and loaded) and the additive garageStore.loadLayoutItems action.
// Plain node, no browser.
// Run from the app folder:  node scripts/test-garage-layouts-v2.mjs   (exit code 1 on any FAIL)
import { createGarageStore } from "../src/garage/garageStore.js";
import { serializeLayout } from "../src/garage/layout.js";
import { OBJECT_LIMITS } from "../src/garage/sceneObjects.js";
import * as lib from "../src/garage/layoutLibrary.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

const A = "coffee-bike";
const P = (n) => `p${n}~0`;
const T = (x = 0, extra = {}) => ({ x, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, ...extra });
const fresh = () => {
  const s = createGarageStore();
  s.startLayout({ assetId: A, name: "T" });
  return s;
};
const lay = (s) => serializeLayout(s.getLayout());
const added = (s) => s.getLayout().items.filter((i) => !i.primary);
const REGISTRY = {
  "cessna-172": { source: "builtin", name: "Cessna 172" },
  "the-kop-main": { source: "builtin", name: "THE KOP Coffee Bike (MAIN)" },
  "imported-mug": { source: "imported", name: "mug" },
};
const describeAsset = (id) => REGISTRY[id] || null;
const obj = (assetId, x = 0, extra = {}) => ({
  assetId,
  source: REGISTRY[assetId] ? REGISTRY[assetId].source : "builtin",
  name: REGISTRY[assetId] ? REGISTRY[assetId].name : assetId,
  transform: T(x),
  hidden: false,
  ...extra,
});
const env2 = (objects, over = {}) => ({
  kind: lib.ENVELOPE_KIND,
  formatVersion: 2,
  productId: A,
  name: "v2-test",
  savedAt: "2026-09-24T00:00:00.000Z",
  layout: fresh().getLayout(),
  objects,
  ...over,
});

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

// A store in the "b" state: a part recoloured, a Cessna moved, an imported mug.
function sceneB() {
  const s = fresh();
  s.setPartOverride("i0", P(1), { material: { color: "#ff0000" } });
  s.addItem({ assetId: "cessna-172", transform: T(2) });
  s.addItem({ assetId: "imported-mug", transform: T(-2) });
  s.setItemTransform("i1", { x: 2.5, ry: 30, s: 1.5 });
  return s;
}

/* ============================ v2 envelope: build and round-trip ============================ */
{
  const s = sceneB();
  s.setItemTransform("i0", { x: 9, s: 2 }); // the old whole-model transform is never saved
  const built = lib.buildEnvelope({ productId: A, name: "v2-test", layout: s.getLayout(), describeAsset });
  check("buildEnvelope succeeds with added objects", built.ok);
  const e = built.envelope;
  check("formatVersion is 2 (every save writes format 2)", e.formatVersion === 2 && lib.ENVELOPE_FORMAT_VERSION === 2);
  check("layout holds only the main product", e.layout.items.length === 1 && e.layout.items[0].primary === true && e.layout.items[0].itemId === "i0");
  check("main whole-model transform is stripped to identity", e.layout.items[0].transform.x === 0 && e.layout.items[0].transform.s === 1);
  check("main part edit is saved", e.layout.items[0].parts[P(1)].material.color === "#ff0000");
  check("two objects are saved, in layout order", e.objects.length === 2 && e.objects[0].assetId === "cessna-172" && e.objects[1].assetId === "imported-mug");
  check("object source: built-in vs imported", e.objects[0].source === "builtin" && e.objects[1].source === "imported");
  check("object name comes from the registry", e.objects[0].name === "Cessna 172" && e.objects[1].name === "mug");
  check("object position/rotation/uniform scale are saved", e.objects[0].transform.x === 2.5 && e.objects[0].transform.ry === 30 && e.objects[0].transform.s === 1.5);
  check("object hidden flag is saved", e.objects[0].hidden === false);
  check("objects carry no per-part edits or item ids", !("parts" in e.objects[0]) && !("itemId" in e.objects[0]));

  const text = lib.serializeEnvelope(e);
  const back = lib.parseEnvelopeJson(text);
  check("v2 round-trip parses", back.ok && back.envelope.formatVersion === 2);
  check("v2 round-trip preserves the objects exactly", JSON.stringify(back.envelope.objects) === JSON.stringify(e.objects));
  check("v2 round-trip preserves the main layout exactly", serializeLayout(back.envelope.layout) === serializeLayout(e.layout));
  check("v2 serialisation is stable (serialise twice, same text)", lib.serializeEnvelope(back.envelope) === text);
  check("the downloaded JSON shows formatVersion 2 and an objects array", (() => {
    const j = JSON.parse(text);
    return j.formatVersion === 2 && Array.isArray(j.objects) && j.objects.length === 2;
  })());

  const none = lib.buildEnvelope({ productId: A, name: "n", layout: fresh().getLayout() });
  check("no added objects saves objects: []", none.ok && Array.isArray(none.envelope.objects) && none.envelope.objects.length === 0);
  const noLookup = lib.buildEnvelope({ productId: A, name: "n", layout: s.getLayout() });
  check("without describeAsset an object saves as built-in named by its id", noLookup.envelope.objects[1].source === "builtin" && noLookup.envelope.objects[1].name === "imported-mug");
  const throwing = lib.buildEnvelope({ productId: A, name: "n", layout: s.getLayout(), describeAsset: () => { throw new Error("x"); } });
  check("a throwing describeAsset never throws out of buildEnvelope", throwing.ok);
  const hiddenS = sceneB();
  hiddenS.setItemHidden("i2", true);
  check("a hidden object saves hidden:true", lib.buildEnvelope({ productId: A, name: "n", layout: hiddenS.getLayout(), describeAsset }).envelope.objects[1].hidden === true);
}

/* ============================ storage writes format 2; reads 1 and 2 ============================ */
{
  const store = mockStorage();
  const r = lib.saveLayout(store, { productId: A, name: "v2-test", layout: sceneB().getLayout(), describeAsset });
  check("saveLayout writes a format-2 envelope", r.ok && JSON.parse(store.data[lib.keyForProduct(A)])[0].formatVersion === 2);
  check("the stored envelope holds both objects", JSON.parse(store.data[lib.keyForProduct(A)])[0].objects.length === 2);
  const v1 = { kind: lib.ENVELOPE_KIND, formatVersion: 1, productId: A, name: "old-g8", savedAt: "2026-01-01T00:00:00.000Z", layout: fresh().getLayout() };
  const list = JSON.parse(store.data[lib.keyForProduct(A)]);
  list.push(v1);
  store.data[lib.keyForProduct(A)] = JSON.stringify(list);
  const got = lib.listLayouts(store, A);
  check("a list mixing format 1 and 2 keeps both", got.length === 2);
  const old = lib.findLayout(store, A, "old-g8");
  check("a stored format-1 envelope keeps formatVersion 1 and has no objects", old.formatVersion === 1 && !("objects" in old));
  check("serialising a format-1 envelope writes no objects key", !("objects" in JSON.parse(lib.serializeEnvelope(old))));
}

/* ============================ malformed v2 is refused ============================ */
{
  const bad = (label, envelope, reason) => {
    const r = lib.parseEnvelope(envelope);
    check(`malformed v2 refused: ${label}`, !r.ok && r.reason === reason, JSON.stringify(r.reason));
    check(`malformed v2 refused by resolveLoad: ${label}`, lib.resolveLoad(envelope, A, () => true, () => true).reason === "invalid");
  };
  bad("no objects array", env2(undefined), "bad-version");
  bad("objects not an array", env2({}), "bad-version");
  bad("formatVersion 3", env2([], { formatVersion: 3 }), "bad-version");
  bad("object is not an object", env2([42]), "bad-objects");
  bad("empty assetId", env2([obj("", 0)]), "bad-objects");
  bad("unknown source", env2([obj("cessna-172", 0, { source: "web" })]), "bad-objects");
  bad("missing transform key", env2([obj("cessna-172", 0, { transform: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 } })]), "bad-objects");
  bad("non-finite transform", env2([obj("cessna-172", 0, { transform: T(Infinity) })]), "bad-objects");
  bad("string transform value", env2([obj("cessna-172", 0, { transform: T("1") })]), "bad-objects");
  bad("hidden not a boolean", env2([obj("cessna-172", 0, { hidden: "no" })]), "bad-objects");
  bad("name not a string", env2([obj("cessna-172", 0, { name: 7 })]), "bad-objects");
  bad(`more than ${lib.MAX_ENVELOPE_OBJECTS} objects`, env2(Array.from({ length: lib.MAX_ENVELOPE_OBJECTS + 1 }, () => obj("cessna-172"))), "bad-objects");
  check("malformed JSON text still refused", lib.parseEnvelopeJson("{ nope").reason === "bad-json");
  const small = lib.parseEnvelope(env2([obj("cessna-172", 0, { transform: T(0, { s: 0.001 }) })]));
  check("an object's scale is raised to the 0.05 floor (layout.js cleaning)", small.ok && small.envelope.objects[0].transform.s === 0.05);
  const longName = lib.parseEnvelope(env2([obj("cessna-172", 0, { name: "  " + "n".repeat(500) })]));
  check("an object name is trimmed and capped", longName.ok && longName.envelope.objects[0].name.length === lib.MAX_OBJECT_NAME);
  const blank = lib.parseEnvelope(env2([obj("cessna-172", 0, { name: "   " })]));
  check("a blank object name falls back to its asset id", blank.ok && blank.envelope.objects[0].name === "cessna-172");
}

/* ============================ resolveLoad: wrong product, max objects, missing objects ============================ */
{
  const built = lib.buildEnvelope({ productId: A, name: "v2-test", layout: sceneB().getLayout(), describeAsset }).envelope;
  const wrong = lib.resolveLoad(built, "the-kop-main", () => true, () => true);
  check("wrong product is refused exactly as in G8", !wrong.ok && wrong.reason === "wrong-product" && wrong.productId === A);
  const wrongMany = lib.resolveLoad(env2(Array.from({ length: 7 }, () => obj("cessna-172"))), "the-kop-main", () => true, () => true);
  check("wrong product is refused before the object count is looked at", wrongMany.reason === "wrong-product");

  const five = lib.resolveLoad(env2(Array.from({ length: 5 }, () => obj("cessna-172"))), A, () => true, () => true);
  check("5 objects (the maximum) resolve", five.ok && five.objects.length === 5);
  const six = lib.resolveLoad(env2(Array.from({ length: 6 }, () => obj("cessna-172"))), A, () => true, () => true);
  check("6 objects refuse the whole load", !six.ok && six.reason === "max-objects" && six.count === 6);
  check("max-objects message text", six.message === "Refused: this layout has 6 added objects; the maximum is 5. Nothing was changed.", six.message);
  let asked = 0;
  lib.resolveLoad(env2(Array.from({ length: 6 }, () => obj("cessna-172"))), A, () => { asked += 1; return true; }, () => { asked += 1; return true; });
  check("max-objects is decided from the envelope before any part or asset lookup", asked === 0);
  const sixMissing = lib.resolveLoad(env2([...Array.from({ length: 5 }, () => obj("cessna-172")), obj("imported-gone")]), A, () => true, (id) => id !== "imported-gone");
  check("6 objects are refused even when one of them would be skipped", sixMissing.reason === "max-objects");

  const missing = lib.resolveLoad(built, A, () => true, (id) => id !== "imported-mug");
  check("a missing object is skipped, the rest kept", missing.ok && missing.objects.length === 1 && missing.objects[0].assetId === "cessna-172");
  check("the skipped object is counted with its name and reason", missing.skippedObjects.length === 1 && missing.skippedObjects[0].name === "mug" && missing.skippedObjects[0].reason === "missing");
  check("objectsTotal counts every saved object", missing.objectsTotal === 2);
  check("parts still resolve when an object is skipped", missing.parts[P(1)].material.color === "#ff0000" && missing.skipped === 0);
  const allGone = lib.resolveLoad(built, A, () => true, () => false);
  check("all objects missing: none kept, all counted", allGone.ok && allGone.objects.length === 0 && allGone.skippedObjects.length === 2);
  const throwsFn = lib.resolveLoad(built, A, () => true, () => { throw new Error("x"); });
  check("a throwing assetExistsFn counts as missing, never throws", throwsFn.ok && throwsFn.skippedObjects.length === 2);
  const noFn = lib.resolveLoad(built, A, () => true);
  check("without assetExistsFn every object is kept", noFn.ok && noFn.objects.length === 2);
  check("resolved objects are the saved ones (transform/hidden/source)", noFn.objects[0].transform.ry === 30 && noFn.objects[0].hidden === false && noFn.objects[1].source === "imported");
}

/* ============================ v1 still resolves exactly as in G8 ============================ */
{
  const s = fresh();
  s.setPartOverride("i0", P(1), { pos: [1, 0, 0] });
  const v1 = { kind: lib.ENVELOPE_KIND, formatVersion: 1, productId: A, name: "g8", savedAt: "x", layout: s.getLayout() };
  const r = lib.resolveLoad(v1, A, () => true, () => false);
  check("v1 resolves", r.ok && r.formatVersion === 1);
  check("v1 resolves objects: null (added objects untouched)", r.objects === null && r.skippedObjects.length === 0);
  check("v1 parts resolve as in G8", r.parts[P(1)].pos[0] === 1 && r.matched === 1 && r.skipped === 0);
  check("v1 wrong product still refused", lib.resolveLoad(v1, "the-kop-main", () => true).reason === "wrong-product");

  // Apply a v1 layout (G8 path: loadPartsOverrides) with an added object present.
  const t = fresh();
  t.addItem({ assetId: "cessna-172", transform: T(3) });
  const before = JSON.stringify(added(t));
  const depth = t.getSnapshot().undoDepth;
  t.loadPartsOverrides(r.itemId, r.parts);
  check("v1 load applies the parts", t.getLayout().items[0].parts[P(1)].pos[0] === 1);
  check("v1 load leaves the added object untouched", JSON.stringify(added(t)) === before);
  check("v1 load is one undo step", t.getSnapshot().undoDepth === depth + 1);
}

/* ============================ budget: running check edges ============================ */
{
  const MAX = OBJECT_LIMITS.MAX_TRIANGLES;
  check("the limit is 1,000,000", MAX === 1000000);
  const a = lib.loadBudgetStep(999999, 1);
  check("exactly 1,000,000 is allowed", a.ok && a.total === 1000000);
  const b = lib.loadBudgetStep(999999, 2);
  check("1,000,001 refuses the whole load", !b.ok && b.reason === "over-budget" && b.total === 1000001);
  check("over-budget message text", b.message === "Refused: loading this layout would make the scene at least 1,000,001 triangles, over the 1,000,000 limit. Nothing was changed.", b.message);
  check("a zero-triangle object at exactly the limit is allowed", lib.loadBudgetStep(MAX, 0).ok);
  check("bad counts refuse", !lib.loadBudgetStep(-1, 5).ok && !lib.loadBudgetStep(10, NaN).ok && !lib.loadBudgetStep(1.5, 1).ok);
  // The stage's loop: main visible + each loaded object, stop at the first overflow.
  const run = (main, objs) => {
    let running = main;
    const loaded = [];
    for (const n of objs) {
      const st = lib.loadBudgetStep(running, n);
      if (!st.ok) return { ok: false, loaded: loaded.length, total: st.total };
      running = st.total;
      loaded.push(n);
    }
    return { ok: true, loaded: loaded.length, total: running };
  };
  const kop = 483311;
  const two = run(kop, [kop, kop]);
  check("THE KOP MAIN + two copies stops at the second copy", !two.ok && two.loaded === 1 && two.total === kop * 3);
  check("THE KOP MAIN + one copy fits", run(kop, [kop]).ok);
  check("a layout landing exactly on 1,000,000 fits", run(400000, [300000, 300000]).ok);
  check("a layout landing on 1,000,001 is refused at the last object", (() => { const r = run(400000, [300000, 300001]); return !r.ok && r.loaded === 1; })());
}

/* ============================ messages ============================ */
{
  check("plain loaded message", lib.loadResultMessage({ name: "v2-test" }) === 'Loaded "v2-test".');
  check("parts-only skipped message matches G8", lib.loadResultMessage({ name: "x", partsSkipped: 2 }) === 'Loaded "x" — 2 parts skipped.');
  check("1 object skipped message", lib.loadResultMessage({ name: "v2-test", skippedObjects: [{ name: "mug", reason: "missing" }] }) === "Loaded \"v2-test\" — 1 object skipped (mug: not in this browser's Asset Library).");
  check("parts and objects skipped together", lib.loadResultMessage({ name: "x", partsSkipped: 1, skippedObjects: [{ name: "a", reason: "missing" }, { name: "b", reason: "load-failed" }] }) === 'Loaded "x" — 1 part skipped, 2 objects skipped (a: not in this browser\'s Asset Library; b: could not be loaded).');
}

/* ============================ garageStore.loadLayoutItems: replace, one undo step ============================ */
{
  const s = fresh();
  s.setPartOverride("i0", P(9), { pos: [7, 7, 7] });
  s.addItem({ assetId: "the-kop-main", transform: T(5) }); // a different extra object
  const pre = lay(s);
  const depth = s.getSnapshot().undoDepth;
  const rev = s.getSnapshot().revision;
  const r = s.loadLayoutItems("i0", { [P(1)]: { material: { color: "#00ff00" } } }, [
    { assetId: "cessna-172", transform: T(2.5, { ry: 30, s: 1.5 }), hidden: false },
    { assetId: "imported-mug", transform: T(-2), hidden: true },
  ]);
  check("loadLayoutItems succeeds", r.ok && r.changed);
  const now = added(s);
  check("replace, not merge: exactly the layout's 2 objects remain", now.length === 2 && now[0].assetId === "cessna-172" && now[1].assetId === "imported-mug");
  check("the old extra object is gone", !now.some((i) => i.assetId === "the-kop-main"));
  check("new item ids are the lowest free ids", r.itemIds.join(",") === "i1,i2" && now[0].itemId === "i1");
  check("object transforms and hidden flags are applied", now[0].transform.ry === 30 && now[0].transform.s === 1.5 && now[1].hidden === true);
  check("the main parts map is replaced too (not merged)", (() => { const p = s.getLayout().items[0].parts; return p[P(1)].material.color === "#00ff00" && !(P(9) in p); })());
  check("the primary item stays first and primary", s.getLayout().items[0].itemId === "i0" && s.getLayout().items[0].primary === true);
  check("exactly one history entry for the whole load", s.getSnapshot().undoDepth === depth + 1 && s.getSnapshot().revision === rev + 1);
  check("one Undo restores the exact pre-load state (objects and parts)", s.undo().ok && lay(s) === pre);
  check("Redo brings the whole load back", s.redo().ok && added(s).length === 2 && added(s)[0].assetId === "cessna-172");
  const again = s.loadLayoutItems("i0", { [P(1)]: { material: { color: "#00ff00" } } }, [
    { assetId: "cessna-172", transform: T(2.5, { ry: 30, s: 1.5 }), hidden: false },
    { assetId: "imported-mug", transform: T(-2), hidden: true },
  ]);
  check("loading the same state again is a no-op (no history entry)", again.ok && again.changed === false && s.getSnapshot().undoDepth === depth + 1);
  const empty = s.loadLayoutItems("i0", {}, []);
  check("a layout with no objects removes every added object", empty.ok && added(s).length === 0 && Object.keys(s.getLayout().items[0].parts).length === 0);
}

/* ============================ loadLayoutItems: refusals change nothing ============================ */
{
  const s = fresh();
  s.addItem({ assetId: "cessna-172", transform: T(1) });
  const pre = lay(s);
  const snap = () => [s.getSnapshot().revision, s.getSnapshot().undoDepth].join("/");
  const before = snap();
  const refused = (label, r) => check(`refused (${label}) and nothing changed`, !r.ok && lay(s) === pre && snap() === before, r.reason);
  refused("bad parts", s.loadLayoutItems("i0", null, []));
  refused("objects not an array", s.loadLayoutItems("i0", {}, {}));
  refused("object without assetId", s.loadLayoutItems("i0", {}, [{ transform: T() }]));
  refused("object without transform", s.loadLayoutItems("i0", {}, [{ assetId: "x" }]));
  refused("non-finite transform", s.loadLayoutItems("i0", {}, [{ assetId: "x", transform: T(NaN) }]));
  refused("hidden not boolean", s.loadLayoutItems("i0", {}, [{ assetId: "x", transform: T(), hidden: 1 }]));
  refused("unknown item", s.loadLayoutItems("nope", {}, []));
  refused("not the primary item", s.loadLayoutItems("i1", {}, []));
  refused("over the layout item limit", s.loadLayoutItems("i0", {}, Array.from({ length: 20 }, () => ({ assetId: "x", transform: T() }))));
  s.setLocked(true);
  refused("locked", s.loadLayoutItems("i0", {}, []));
  s.setLocked(false);
  s.beginGesture();
  const g = s.loadLayoutItems("i0", {}, []);
  s.cancelGesture();
  check("refused while a gesture is open and nothing changed", !g.ok && g.reason === "gesture-open" && lay(s) === pre);
}

/* ============================ loadLayoutItems: selection and front ============================ */
{
  const s = fresh();
  s.addItem({ assetId: "cessna-172", transform: T(1) });
  s.setFrontRef("i1");
  s.select([{ itemId: "i0", partId: P(1) }, { itemId: "i1", partId: "object~0" }]);
  s.loadLayoutItems("i0", {}, [{ assetId: "cessna-172", transform: T(4) }]);
  check("selection entries on replaced objects are dropped, main-part ones kept", s.getSnapshot().selection.length === 1 && s.getSnapshot().selection[0].itemId === "i0");
  check("the front falls back to the main product", s.getSnapshot().frontRef === "i0");
}

/* ============================ full flow: save on one stage, load on another ============================ */
{
  const src = sceneB();
  const text = lib.serializeEnvelope(lib.buildEnvelope({ productId: A, name: "v2-test", layout: src.getLayout(), describeAsset }).envelope);
  const dst = fresh();
  dst.addItem({ assetId: "the-kop-main", transform: T(9) });
  const pre = lay(dst);
  const parsed = lib.parseEnvelopeJson(text);
  const resolved = lib.resolveLoad(parsed.envelope, A, () => true, () => true);
  const r = dst.loadLayoutItems(resolved.itemId, resolved.parts, resolved.objects);
  check("full flow applies in one commit", r.ok && r.changed);
  const strip = (l) => ({ parts: l.items[0].parts, objects: l.items.filter((i) => !i.primary).map((i) => ({ assetId: i.assetId, transform: i.transform, hidden: i.hidden })) });
  check("full flow reproduces the saved objects and parts exactly", JSON.stringify(strip(dst.getLayout())) === JSON.stringify(strip(src.getLayout())));
  check("full flow: one Undo returns to the exact pre-load state", dst.undo().ok && lay(dst) === pre);

  // Missing object on the other stage (a fresh browser without the imported asset).
  const dst2 = fresh();
  const res2 = lib.resolveLoad(parsed.envelope, A, () => true, (id) => id !== "imported-mug");
  dst2.loadLayoutItems(res2.itemId, res2.parts, res2.objects);
  check("missing-object flow: the Cessna and the part edit load", added(dst2).length === 1 && added(dst2)[0].assetId === "cessna-172" && dst2.getLayout().items[0].parts[P(1)].material.color === "#ff0000");
  check("missing-object flow message", lib.loadResultMessage({ name: res2.name, partsSkipped: res2.skipped, skippedObjects: res2.skippedObjects }) === "Loaded \"v2-test\" — 1 object skipped (mug: not in this browser's Asset Library).");
}

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
