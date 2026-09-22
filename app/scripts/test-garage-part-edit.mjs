// Garage G4 — checks for per-part numeric editing: the store + compose.js
// round trip a position/rotation/scale/hidden override exactly, and
// garageMode.js's new additive exports (singleSelectedPart, getPartTransform,
// commitPartEdit) behave like describePart already does in test-garage-select.mjs.
// Plain node, no browser, no three, seeded generator only (never Math.random).
// Run from the app folder:  node scripts/test-garage-part-edit.mjs   (exit 1 on any FAIL)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createGarageStore } from "../src/garage/garageStore.js";
import { LAYOUT_LIMITS, serializeLayout } from "../src/garage/layout.js";
import { applyPartOverride, resetToBase, quatNormalize } from "../src/garage/compose.js";
import * as mode from "../src/garage/garageMode.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
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

/* ---------------- 1. singleSelectedPart (pure) ---------------- */
{
  check("singleSelectedPart: null for a snapshot with no selection field", mode.singleSelectedPart({}) === null);
  check("singleSelectedPart: null for an empty selection", mode.singleSelectedPart({ selection: [] }) === null);
  check(
    "singleSelectedPart: null for 2 selected",
    mode.singleSelectedPart({
      selection: [
        { itemId: "i0", partId: "a~0" },
        { itemId: "i0", partId: "b~0" },
      ],
    }) === null
  );
  const snap = { selection: [{ itemId: "i0", partId: "a~0" }] };
  const one = mode.singleSelectedPart(snap);
  check("singleSelectedPart: {itemId,partId} for exactly one selected", one && one.itemId === "i0" && one.partId === "a~0", J(one));
  check("singleSelectedPart: a fresh object, never the snapshot's own entry", one !== snap.selection[0]);
  check(
    "singleSelectedPart: null for a malformed entry",
    mode.singleSelectedPart({ selection: [{ itemId: 1, partId: "a~0" }] }) === null
  );
  check("singleSelectedPart: null for null or undefined", mode.singleSelectedPart(null) === null && mode.singleSelectedPart(undefined) === null);
}

/* ---------------- 2. getPartTransform / commitPartEdit wrappers ---------------- */
{
  check("getPartTransform: null with no api registered", mode.getPartTransform("i0", "a~0") === null);
  check("commitPartEdit: null with no api registered", mode.commitPartEdit("i0", "a~0", { pos: [1, 2, 3] }) === null);

  const calls = [];
  const api = {
    getPartTransform: (itemId, partId) => ({
      itemId,
      partId,
      pos: [1, 2, 3],
      rot: [0, 0, 0],
      scale: [1, 1, 1],
      hidden: false,
      overridden: false,
    }),
    commitPartEdit: (itemId, partId, patch) => {
      calls.push([itemId, partId, patch]);
      return { ok: true, changed: true };
    },
  };
  const un = mode.registerApi(api);
  const t = mode.getPartTransform("i0", "a~0");
  check("getPartTransform: delegates to the registered api", t && t.pos[0] === 1 && t.itemId === "i0", J(t));
  const r = mode.commitPartEdit("i0", "a~0", { pos: [4, 5, 6] });
  check(
    "commitPartEdit: delegates to the registered api",
    r && r.ok === true && calls.length === 1 && calls[0][0] === "i0" && calls[0][1] === "a~0" && J(calls[0][2]) === J({ pos: [4, 5, 6] })
  );
  un();

  const unBad = mode.registerApi({
    getPartTransform: () => JSON.parse("{"),
    commitPartEdit: () => JSON.parse("{"),
  });
  check("getPartTransform: a throwing api gives null", mode.getPartTransform("i0", "a~0") === null);
  check("commitPartEdit: a throwing api gives null", mode.commitPartEdit("i0", "a~0", {}) === null);
  unBad();

  const unU = mode.registerApi({ getPartTransform: () => undefined, commitPartEdit: () => undefined });
  check("getPartTransform: undefined result becomes null", mode.getPartTransform("i0", "a~0") === null);
  check("commitPartEdit: undefined result becomes null", mode.commitPartEdit("i0", "a~0", {}) === null);
  unU();

  const unNo = mode.registerApi({});
  check("getPartTransform: an api without the method gives null", mode.getPartTransform("i0", "a~0") === null);
  check("commitPartEdit: an api without the method gives null", mode.commitPartEdit("i0", "a~0", {}) === null);
  unNo();
  check("no api left registered after every unregister", mode.apiRef.current === null);
}

/* ---------------- 3. store round trip: set, read back, reset ---------------- */
{
  const s = fresh();
  const pid = P(0);
  const start = lay(s);

  const r1 = s.setPartOverride("i0", pid, { pos: [1, 2, 3] });
  check("setPartOverride: ok and changed", r1.ok && r1.changed, J(r1));
  const layout1 = s.getLayout();
  check("getLayout: shows the position override", J(layout1.items[0].parts[pid].pos) === J([1, 2, 3]));

  const r2 = s.resetPart("i0", pid);
  check("resetPart: ok and changed", r2.ok && r2.changed, J(r2));
  check("resetPart: the part entry is gone", !has(s.getLayout().items[0].parts, pid));
  check("resetPart: the layout is back to the start state", lay(s) === start);

  const r3 = s.resetPart("i0", pid);
  check("resetPart: a second reset with nothing to reset is a no-op", r3.ok && r3.changed === false);
}

/* ---------------- 4. 20 random valid edits, then 20 undos ---------------- */
{
  const s = fresh();
  const R = mkRand(20240611);
  const partIds = [P(0), P(1), P(2)];
  const start = lay(s);
  const states = [start];

  for (let i = 0; i < 20; i += 1) {
    const pid = partIds[R.int(partIds.length)];
    const k = R.int(3);
    let patch;
    if (k === 0) patch = { pos: R.vec(-5, 5) };
    else if (k === 1) {
      const q = quatNormalize([R.range(-1, 1), R.range(-1, 1), R.range(-1, 1), R.range(0.2, 1)]);
      patch = { quat: q };
    } else patch = { scale: R.vec(0.1, 3) };
    const r = s.setPartOverride("i0", pid, patch);
    check(`edit ${i}: setPartOverride ok and changed`, r.ok && r.changed, J({ pid, patch, r }));
    states.push(lay(s));
  }
  check("after 20 edits: 20 history entries", s.getSnapshot().undoDepth === 20, String(s.getSnapshot().undoDepth));

  let allUndo = true;
  for (let i = 0; i < 20; i += 1) {
    const u = s.undo();
    const want = states[states.length - 2 - i];
    if (!u.ok || lay(s) !== want) allUndo = false;
  }
  check("20 undos reproduce the recorded states in reverse (deep-equal each step)", allUndo);
  check("after 20 undos: back to the exact start state", lay(s) === start);
  check("after 20 undos: nothing left to undo", s.getSnapshot().canUndo === false);
}

/* ---------------- 5. scale clamps to LAYOUT_LIMITS.MIN_SCALE (reused, not reimplemented) ---------------- */
{
  const s = fresh();
  const pid = P(0);
  const r = s.setPartOverride("i0", pid, { scale: [0.001, 5, -3] });
  check("setPartOverride with an out-of-range scale is still ok", r.ok, J(r));
  const got = s.getLayout().items[0].parts[pid].scale;
  check("scale: a too-small component clamps to LAYOUT_LIMITS.MIN_SCALE", got[0] === LAYOUT_LIMITS.MIN_SCALE, J(got));
  check("scale: an in-range component is kept exactly", got[1] === 5, J(got));
  check("scale: a negative component clamps to LAYOUT_LIMITS.MIN_SCALE too", got[2] === LAYOUT_LIMITS.MIN_SCALE, J(got));
}

/* ---------------- 6. hidden (visible) round-trips true / false / absent ---------------- */
{
  const s = fresh();
  const pid = P(0);
  s.setPartOverride("i0", pid, { pos: [1, 1, 1], visible: true });
  check("hidden: visible:true round-trips", s.getLayout().items[0].parts[pid].visible === true);
  s.setPartOverride("i0", pid, { visible: false });
  check("hidden: visible:false round-trips", s.getLayout().items[0].parts[pid].visible === false);
  s.setPartOverride("i0", pid, { visible: null });
  const part = s.getLayout().items[0].parts[pid];
  check("hidden: visible:null removes just the visible key (absent)", part && !has(part, "visible"), J(part));
  check("hidden: the rest of the override survives removing visible", part && J(part.pos) === J([1, 1, 1]));
}

/* ---------------- 7. compose.js integration: the exact functions G4 reuses ---------------- */
{
  const base = { pos: [1, 2, 3], quat: [0, 0, 0, 1], scale: [2, 2, 2] };
  const s = fresh();
  const pid = P(0);
  s.setPartOverride("i0", pid, { pos: [0.5, -0.5, 0] });
  const ov = s.getLayout().items[0].parts[pid];
  const pose = applyPartOverride(base, ov);
  check("applyPartOverride: composes the stored pos override onto a base", J(pose.pos) === J([1.5, 1.5, 3]), J(pose));
  check(
    "applyPartOverride: base quat/scale are kept when the override omits them",
    J(pose.quat) === J(base.quat) && J(pose.scale) === J(base.scale)
  );
  const back = resetToBase(base);
  check("resetToBase: an exact but fresh copy of base", J(back) === J(base) && back !== base && back.pos !== base.pos);
}

/* ---------------- 8. purity: garageMode.js's new exports changed no import ---------------- */
{
  const strip = (str) => str.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const banned = [
    /\bprocess\b/,
    /\bwindow\b/,
    /\bdocument\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /Date\.now/,
    /new Date/,
    /performance\.now/,
    /Math\.random/,
    /\bsetTimeout\b/,
    /\bsetInterval\b/,
    /requestAnimationFrame/,
    /\bthrow\b/,
    /\bfetch\b/,
    /\brequire\b/,
  ];
  const src = readFileSync(join(APP, "src", "garage", "garageMode.js"), "utf8");
  const code = strip(src);
  const found = [...code.matchAll(/(?:^|\n)\s*import\b[^;]*?from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  check("garageMode.js: only allowed import (./garageStore.js)", found.length === 1 && found[0] === "./garageStore.js", found.join(","));
  check("garageMode.js: no dynamic import", !/\bimport\s*\(/.test(code));
  const hits = banned.filter((re) => re.test(code)).map(String);
  check("garageMode.js: no banned globals or throw", hits.length === 0, hits.join(" "));
  check("garageMode.js: no three or react", !/["'](three|react)/.test(code));
  check("garageMode.js: LF line endings", !src.includes("\r"));
}

/* ---------------- 9. this script's own line endings ---------------- */
{
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  check("test-garage-part-edit.mjs: LF line endings", !src.includes("\r"));
}

console.log(`\n${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
