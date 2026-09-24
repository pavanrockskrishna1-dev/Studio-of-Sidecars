// Cleanup slice — checks for app/src/capture/exportGate.js: the backdrop
// state machine (loading -> ready, loading -> failed, an environment or
// product switch re-engages it, no backdrop = ready at once, stale results
// ignored), the gate store the export buttons read, the Garage export lock
// helper (always released: success, throw, rejection, cancel) against the
// real garageStore, and the numeric-field scale clamp (at most 100). Plain
// node, no browser.
// Run from the app folder:  node scripts/test-cleanup.mjs   (exit code 1 on any FAIL)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as eg from "../src/capture/exportGate.js";
import * as gz from "../src/garage/gizmo.js";
import { createGarageStore } from "../src/garage/garageStore.js";

const HERE = dirname(fileURLToPath(import.meta.url));

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

const { LOADING, READY, FAILED, NONE } = eg.BACKDROP_STATUS;
const FILE_A = "/environments/propeller-pistons-loft.jpg";
const FILE_B = "/environments/vintage_garage_studio.jpg";
const run = (events, from = eg.initialBackdrop()) => events.reduce((s, e) => eg.backdropReducer(s, e), from);

/* ============================ 1. the state machine ============================ */
{
  const s0 = eg.initialBackdrop();
  check("initial state is loading (nothing loaded yet)", s0.status === LOADING && s0.file === null);
  check("initial state blocks exports", eg.exportsAllowed(s0) === false);
  check("state objects are frozen", Object.isFrozen(s0));

  const s1 = eg.backdropReducer(s0, { type: "start", file: FILE_A, token: 1 });
  check("start with a file -> loading", s1.status === LOADING && s1.file === FILE_A && s1.token === 1);
  check("loading blocks exports", eg.exportsAllowed(s1) === false);
  const s2 = eg.backdropReducer(s1, { type: "loaded", token: 1 });
  check("loading -> ready on its own token", s2.status === READY && s2.file === FILE_A);
  check("ready allows exports", eg.exportsAllowed(s2) === true);
  check("ready state is frozen", Object.isFrozen(s2));

  const f = run([{ type: "start", file: FILE_A, token: 1 }, { type: "failed", token: 1 }]);
  check("loading -> failed on its own token", f.status === FAILED && f.file === FILE_A);
  check("failed ALLOWS exports (never stuck)", eg.exportsAllowed(f) === true);
  check("a load result after failed changes nothing", eg.backdropReducer(f, { type: "loaded", token: 1 }) === f);
  check("a failure after ready changes nothing", eg.backdropReducer(s2, { type: "failed", token: 1 }) === s2);
  check("a repeated loaded changes nothing (same object)", eg.backdropReducer(s2, { type: "loaded", token: 1 }) === s2);
}

/* ============================ 2. switches re-engage the gate ============================ */
{
  // Environment switch: the stage cleanup clears the old backdrop, the new effect starts.
  const ready = run([{ type: "start", file: FILE_A, token: 1 }, { type: "loaded", token: 1 }]);
  const cleared = eg.backdropReducer(ready, { type: "clear", token: 1 });
  check("env switch: clear on the old token -> loading", cleared.status === LOADING);
  check("env switch: exports blocked while cleared", !eg.exportsAllowed(cleared));
  const started = eg.backdropReducer(cleared, { type: "start", file: FILE_B, token: 2 });
  check("env switch: the new backdrop is loading", started.status === LOADING && started.file === FILE_B && started.token === 2);
  const late = eg.backdropReducer(started, { type: "loaded", token: 1 });
  check("env switch: the OLD backdrop finishing late is ignored", late === started && late.status === LOADING);
  const lateFail = eg.backdropReducer(started, { type: "failed", token: 1 });
  check("env switch: the OLD backdrop failing late is ignored", lateFail === started);
  const done = eg.backdropReducer(started, { type: "loaded", token: 2 });
  check("env switch: the new backdrop loaded -> ready", done.status === READY && done.file === FILE_B);

  // Switching straight from ready to a new start (no clear) also re-engages.
  const direct = eg.backdropReducer(ready, { type: "start", file: FILE_B, token: 5 });
  check("a start from ready -> loading again", direct.status === LOADING && direct.token === 5);
  // From failed, too.
  const fromFail = run([{ type: "start", file: FILE_A, token: 1 }, { type: "failed", token: 1 }, { type: "start", file: FILE_A, token: 2 }]);
  check("a start from failed -> loading again", fromFail.status === LOADING && fromFail.token === 2);

  // Product switch: same environment, the stage remounts (clear, then start again).
  const product = run([
    { type: "start", file: FILE_A, token: 1 }, { type: "loaded", token: 1 },
    { type: "clear", token: 1 }, { type: "start", file: FILE_A, token: 2 },
  ]);
  check("product switch: same file re-engages the gate", product.status === LOADING && product.token === 2);
  check("product switch: then ready on the new token", eg.backdropReducer(product, { type: "loaded", token: 2 }).status === READY);

  check("clear with a stale token changes nothing", eg.backdropReducer(ready, { type: "clear", token: 9 }) === ready);
  const loading = run([{ type: "start", file: FILE_A, token: 3 }]);
  check("clear while already loading changes nothing", eg.backdropReducer(loading, { type: "clear", token: 3 }) === loading);
}

/* ============================ 3. no backdrop photo ============================ */
{
  for (const [label, file] of [["null", null], ["undefined", undefined], ["empty string", ""], ["a number", 7]]) {
    const s = eg.backdropReducer(eg.initialBackdrop(), { type: "start", file, token: 1 });
    check(`no backdrop (${label}) -> none, ready at once`, s.status === NONE && s.file === null && eg.exportsAllowed(s));
  }
  const none = eg.backdropReducer(eg.initialBackdrop(), { type: "start", file: null, token: 1 });
  check("none ignores a stray loaded", eg.backdropReducer(none, { type: "loaded", token: 1 }) === none);
  check("none ignores a stray failed", eg.backdropReducer(none, { type: "failed", token: 1 }) === none);
  const cleared = eg.backdropReducer(none, { type: "clear", token: 1 });
  check("none -> clear -> loading (the stage went away)", cleared.status === LOADING);
  check("none -> photo env -> loading", eg.backdropReducer(none, { type: "start", file: FILE_A, token: 2 }).status === LOADING);
}

/* ============================ 4. bad input never throws ============================ */
{
  const s = eg.initialBackdrop();
  let threw = false;
  let same = true;
  try {
    for (const ev of [null, undefined, 3, "x", {}, { type: "start" }, { type: "loaded", token: "1" }, { type: "nope", token: 1 }, { type: "start", file: FILE_A, token: 1.5 }]) {
      if (eg.backdropReducer(s, ev) !== s) same = false;
    }
  } catch {
    threw = true;
  }
  check("bad events never throw", !threw);
  check("bad events leave the state unchanged", same);
  const fromJunk = eg.backdropReducer(null, { type: "start", file: FILE_A, token: 1 });
  check("a missing state starts from the initial state", fromJunk.status === LOADING && fromJunk.token === 1);
  check("exportsAllowed(null) is false", eg.exportsAllowed(null) === false);
  check("exportsAllowed per status", eg.exportsAllowed({ status: READY }) && eg.exportsAllowed({ status: FAILED }) && eg.exportsAllowed({ status: NONE }) && !eg.exportsAllowed({ status: LOADING }));
}

/* ============================ 5. the gate store ============================ */
{
  const g = eg.createBackdropGate();
  let n = 0;
  const off = g.subscribe(() => {
    n += 1;
  });
  check("gate store starts loading", g.getSnapshot().status === LOADING);
  const t1 = g.begin(FILE_A);
  check("begin -> loading, one notification", g.getSnapshot().status === LOADING && g.getSnapshot().token === t1 && n === 1);
  const snapA = g.getSnapshot();
  check("getSnapshot is stable between changes", g.getSnapshot() === snapA);
  check("loaded -> ready", g.loaded(t1) === true && g.getSnapshot().status === READY && n === 2);
  check("a repeated loaded does not notify", g.loaded(t1) === false && n === 2);
  const t2 = g.begin(FILE_B);
  check("tokens increase", t2 > t1);
  check("env switch re-engages the gate", g.getSnapshot().status === LOADING);
  check("the old load finishing late is ignored", g.loaded(t1) === false && g.getSnapshot().status === LOADING);
  check("failed -> failed, exports allowed", g.failed(t2) === true && g.getSnapshot().status === FAILED && eg.exportsAllowed(g.getSnapshot()));
  g.clear(t2);
  check("clear (stage unmount) -> loading", g.getSnapshot().status === LOADING);
  const t3 = g.begin(null);
  check("no backdrop -> none at once", g.getSnapshot().status === NONE && eg.exportsAllowed(g.getSnapshot()) && t3 > t2);
  off();
  const before = n;
  g.begin(FILE_A);
  check("unsubscribe stops notifications", n === before);
  check("the app's shared gate exists", eg.backdropGate && typeof eg.backdropGate.begin === "function" && typeof eg.backdropGate.getSnapshot === "function");
  check("gate label text", eg.GATE_LABEL === "Loading backdrop...");
  check("failure warning text is set", typeof eg.BACKDROP_FAILED_WARNING === "string" && eg.BACKDROP_FAILED_WARNING.length > 20);
}

/* ============================ 6. the export lock always releases ============================ */
const A = "asset-a";
const P = (n) => `p${n}~0`;
const fresh = () => {
  const s = createGarageStore();
  s.startLayout({ assetId: A, name: "T" });
  return s;
};
{
  const s = fresh();
  let seenLocked = null;
  const r = await eg.withExportLock(s, async () => {
    seenLocked = s.getSnapshot().locked;
    return { ok: true, value: 42 };
  });
  check("success: locked while the export runs", seenLocked === true);
  check("success: released afterwards", s.getSnapshot().locked === false);
  check("success: resolves to the export's result", r && r.ok === true && r.value === 42);
}
{
  const s = fresh();
  let err = null;
  try {
    await eg.withExportLock(s, () => {
      throw new Error("render failed");
    });
  } catch (e) {
    err = e;
  }
  check("sync throw: the error is rethrown", err && err.message === "render failed");
  check("sync throw: released", s.getSnapshot().locked === false);
}
{
  const s = fresh();
  let err = null;
  try {
    await eg.withExportLock(s, async () => {
      await null;
      throw new Error("encode failed");
    });
  } catch (e) {
    err = e;
  }
  check("async rejection: the error is rethrown", err && err.message === "encode failed");
  check("async rejection: released", s.getSnapshot().locked === false);
}
{
  const s = fresh();
  const r = await eg.withExportLock(s, async () => ({ ok: false, canceled: true, error: "Export canceled" }));
  check("cancel: resolves to the cancelled result", r.canceled === true);
  check("cancel: released", s.getSnapshot().locked === false);
}
{
  const s = fresh();
  const r = await eg.withExportLock(s, async () => ({ ok: false, error: "the window was resized" }));
  check("export error result: released", r.ok === false && s.getSnapshot().locked === false);
}
{
  // fn runs synchronously in the caller's task (the PNG render must).
  const s = fresh();
  let ran = false;
  const p = eg.withExportLock(s, () => {
    ran = true;
    return 1;
  });
  check("fn is called synchronously", ran === true);
  check("the lock is engaged synchronously", s.getSnapshot().locked === true);
  await p;
  check("released after a sync fn", s.getSnapshot().locked === false);
}
{
  // A lock held by someone else is left alone.
  const s = fresh();
  s.setLocked(true);
  await eg.withExportLock(s, async () => 1);
  check("a lock the helper did not engage is not released", s.getSnapshot().locked === true);
  s.setLocked(false);
  let err = null;
  try {
    s.setLocked(true);
    await eg.withExportLock(s, async () => {
      throw new Error("x");
    });
  } catch (e) {
    err = e;
  }
  check("...also when the export fails", err && s.getSnapshot().locked === true);
}
{
  // Two back-to-back exports, and one after an error: each locks and releases.
  const s = fresh();
  await eg.withExportLock(s, async () => 1);
  await eg.withExportLock(s, async () => {
    throw new Error("y");
  }).catch(() => {});
  let again = null;
  await eg.withExportLock(s, async () => {
    again = s.getSnapshot().locked;
  });
  check("the lock engages again after an errored export", again === true && s.getSnapshot().locked === false);
}
{
  // Without a usable store the export still runs.
  const r1 = await eg.withExportLock(null, async () => "ran");
  const r2 = await eg.withExportLock({}, async () => "ran");
  check("no store: the export still runs", r1 === "ran" && r2 === "ran");
}

/* ============================ 7. every Garage edit is refused while locked ============================ */
{
  const s = fresh();
  s.setPartOverride("i0", P(1), { pos: [1, 2, 3] });
  const added = s.addItem({ assetId: "cessna-172" });
  const objId = added.itemId;
  const layoutBefore = s.exportJson();
  const snapBefore = s.getSnapshot();
  const results = {};
  await eg.withExportLock(s, async () => {
    results.part = s.setPartOverride("i0", P(2), { pos: [4, 5, 6] });
    results.reset = s.resetPart("i0", P(1));
    results.item = s.setItemTransform(objId, { x: 3 });
    results.hidden = s.setItemHidden(objId, true);
    results.add = s.addItem({ assetId: "cessna-172" });
    results.remove = s.removeItem(objId);
    results.gesture = s.beginGesture();
    results.undo = s.undo();
    results.redo = s.redo();
    results.load = s.loadLayout({ version: 1, items: [{ itemId: "i0", assetId: A, primary: true }] });
    results.loadParts = s.loadPartsOverrides("i0", {});
    results.loadItems = s.loadLayoutItems("i0", {}, []);
    results.start = s.startLayout({ assetId: "other", name: "O" });
    results.select = s.select([{ itemId: "i0", partId: P(1) }]);
  });
  for (const k of ["part", "reset", "item", "hidden", "add", "remove", "gesture", "undo", "redo", "load", "loadParts", "loadItems", "start"]) {
    check(`locked: ${k} is refused`, results[k] && results[k].ok === false && results[k].reason === "locked", JSON.stringify(results[k]).slice(0, 80));
  }
  check("locked: selection is still allowed", results.select && results.select.ok === true);
  check("locked: the layout is unchanged", s.exportJson() === layoutBefore);
  check("locked: revision and undo depth unchanged", s.getSnapshot().revision === snapBefore.revision && s.getSnapshot().undoDepth === snapBefore.undoDepth);
  check("after the export: edits work again", s.setItemTransform(objId, { x: 3 }).ok === true);
  check("after the export: undo works again", s.undo().ok === true);
}
{
  // A drag open when the export starts is cancelled exactly (no undo entry).
  const s = fresh();
  s.beginGesture();
  s.setPartOverride("i0", P(1), { pos: [9, 9, 9] });
  const depth = s.getSnapshot().undoDepth;
  await eg.withExportLock(s, async () => 1);
  check("an open gesture is cancelled by the lock", s.getSnapshot().gestureOpen !== true && s.getSnapshot().undoDepth === depth);
  check("the cancelled drag left no override", !JSON.parse(s.exportJson()).items[0].parts?.[P(1)]);
}

/* ============================ 8. the scale clamp ============================ */
{
  check("MAX_SCALE is the gizmo's (100)", eg.MAX_SCALE === gz.MAX_SCALE && eg.MAX_SCALE === 100);
  check("MIN_SCALE is the gizmo's (0.05)", eg.MIN_SCALE === gz.MIN_SCALE && eg.MIN_SCALE === 0.05);
  check("100 stays 100", eg.clampFieldScale(100) === 100);
  check("100.0001 becomes 100", eg.clampFieldScale(100.0001) === 100);
  check("1000 becomes 100", eg.clampFieldScale(1000) === 100);
  check("99.999 is kept", eg.clampFieldScale(99.999) === 99.999);
  check("1e9 becomes 100", eg.clampFieldScale(1e9) === 100);
  check("Infinity becomes 100", eg.clampFieldScale(Infinity) === 100);
  check("0.01 becomes 0.05 (the minimum is unchanged)", eg.clampFieldScale(0.01) === 0.05);
  check("-5 becomes 0.05", eg.clampFieldScale(-5) === 0.05);
  check("0.05 stays 0.05", eg.clampFieldScale(0.05) === 0.05);
  check("1.23456 is not rounded", eg.clampFieldScale(1.23456) === 1.23456);
  check("NaN gives the minimum", eg.clampFieldScale(NaN) === 0.05);
  check("a non-number gives the minimum", eg.clampFieldScale("1000") === 0.05);
  check("matches the gizmo's unsnapped clamp at 1000", eg.clampFieldScale(1000) === gz.clampScale(1000, false));
}

/* ============================ 9. hygiene ============================ */
{
  const src = readFileSync(join(HERE, "..", "src", "capture", "exportGate.js"), "utf8");
  check("exportGate.js imports only gizmo.js", [...src.matchAll(/^import .* from "(.*)";$/gm)].map((m) => m[1]).join(",") === "../garage/gizmo.js");
  check("exportGate.js has no DOM, React or three.js use", !/\b(document|window|React|THREE|useState)\b/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
  check("exportGate.js uses LF line endings", !src.includes("\r"));
  const me = readFileSync(join(HERE, "test-cleanup.mjs"), "utf8");
  check("test-cleanup.mjs uses LF line endings", !me.includes("\r"));
}

/* ============================ 10. summary ============================ */
if (failed === 0) console.log(`ALL CHECKS PASSED (${passed} PASS)`);
else console.log(`${failed} CHECK(S) FAILED (${passed} PASS, ${failed} FAIL)`);
process.exit(failed === 0 ? 0 : 1);
