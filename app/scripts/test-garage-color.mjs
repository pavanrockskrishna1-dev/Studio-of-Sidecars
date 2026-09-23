// Garage G6 — checks for the per-part colour override at the STORE level:
// garageStore.setPartOverride + layout.js's validateLayout already carry the
// material sub-object schema (color, roughness, metalness, opacity,
// ignoreVertexColors) from G1 onward. This script proves that schema round
// trips exactly the way G6's live-material application in StudioCanvas.jsx
// depends on: partial overrides survive, a cleared field truly disappears
// (not just reverts to a default written back into the store), and resetPart
// removes the whole part entry. It does NOT touch three.js or the DOM — the
// authoritative-copy application to a live material is a StudioCanvas.jsx
// runtime concern, verified separately by hand/CDP, not by this script.
// Plain node, no browser, no three, seeded generator only (never Math.random).
// Run from the app folder:  node scripts/test-garage-color.mjs   (exit 1 on any FAIL)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createGarageStore } from "../src/garage/garageStore.js";
import { serializeLayout, validateLayout } from "../src/garage/layout.js";

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
  return { r, range, int: (n) => Math.floor(r() * n) };
};

const A = "asset-a";
const P = (n) => `p${n}~0`;
const fresh = () => {
  const s = createGarageStore();
  s.startLayout({ assetId: A, name: "T" });
  return s;
};
const lay = (s) => serializeLayout(s.getLayout());

/* ---------------- 1. a fresh material override round-trips through the store ---------------- */
{
  const s = fresh();
  const pid = P(0);
  const start = lay(s);

  const r1 = s.setPartOverride("i0", pid, { material: { color: "#a1b2c3", metalness: 0.4, roughness: 0.7, opacity: 0.9, ignoreVertexColors: true } });
  check("setPartOverride(material): ok and changed", r1.ok && r1.changed, J(r1));
  const mat1 = s.getLayout().items[0].parts[pid].material;
  check(
    "material round-trips exactly: color lowercased, numbers kept, boolean kept",
    mat1.color === "#a1b2c3" && mat1.metalness === 0.4 && mat1.roughness === 0.7 && mat1.opacity === 0.9 && mat1.ignoreVertexColors === true,
    J(mat1)
  );

  const r2 = s.resetPart("i0", pid);
  check("resetPart: ok and changed", r2.ok && r2.changed, J(r2));
  check("resetPart: the whole part entry is gone (material sub-object included)", !has(s.getLayout().items[0].parts, pid));
  check("resetPart: the layout is back to the start state", lay(s) === start);
}

/* ---------------- 2. clamping and rejection match layout.js's own rules ---------------- */
{
  const s = fresh();
  const pid = P(0);

  const rOor = s.setPartOverride("i0", pid, { material: { metalness: 1.7, roughness: -0.3, opacity: 2 } });
  check("out-of-range 0..1 numbers are still accepted (clamped, not rejected)", rOor.ok && rOor.changed, J(rOor));
  const clamped = s.getLayout().items[0].parts[pid].material;
  check("metalness 1.7 clamps to 1", clamped.metalness === 1, J(clamped));
  check("roughness -0.3 clamps to 0", clamped.roughness === 0, J(clamped));
  check("opacity 2 clamps to 1", clamped.opacity === 1, J(clamped));

  const s2 = fresh();
  const rBadColor = s2.setPartOverride("i0", pid, { material: { color: "#zzzzzz" } });
  check(
    "an invalid #rrggbb color is rejected (bad-input), not silently dropped",
    rBadColor.ok === false && rBadColor.reason === "bad-input",
    J(rBadColor)
  );
  check("a rejected color left no override behind", !has(s2.getLayout().items[0].parts, pid));

  const rBadColorShort = s2.setPartOverride("i0", pid, { material: { color: "#fff" } });
  check("a 3-digit shorthand color is rejected the same way", rBadColorShort.ok === false && rBadColorShort.reason === "bad-input", J(rBadColorShort));

  const rBadNum = s2.setPartOverride("i0", pid, { material: { metalness: "shiny" } });
  check("a non-numeric metalness is rejected (bad-input)", rBadNum.ok === false && rBadNum.reason === "bad-input", J(rBadNum));

  const rBadBool = s2.setPartOverride("i0", pid, { material: { ignoreVertexColors: "yes" } });
  check("a non-boolean ignoreVertexColors is rejected (bad-input)", rBadBool.ok === false && rBadBool.reason === "bad-input", J(rBadBool));

  const rBadShape = s2.setPartOverride("i0", pid, { material: "red" });
  check("a non-object material patch is rejected (bad-input)", rBadShape.ok === false && rBadShape.reason === "bad-input", J(rBadShape));

  check("none of the rejected patches left any part entry behind", !has(s2.getLayout().items[0].parts, pid));
}

/* ---------------- 3. partial clear: one field cleared, another survives untouched ---------------- */
{
  const s = fresh();
  const pid = P(0);
  s.setPartOverride("i0", pid, { material: { color: "#112233", roughness: 0.6 } });
  const before = s.getLayout().items[0].parts[pid].material;
  check("both fields present before the clear", before.color === "#112233" && before.roughness === 0.6, J(before));

  const r = s.setPartOverride("i0", pid, { material: { color: null } });
  check("clearing just color: ok and changed", r.ok && r.changed, J(r));
  const after = s.getLayout().items[0].parts[pid].material;
  check("color key is gone entirely (not reset to a default value, absent)", after && !has(after, "color"), J(after));
  check("roughness survives the clear, exact value kept", after && after.roughness === 0.6, J(after));

  // clearing the LAST remaining material field removes the whole sub-object,
  // never an empty {} left behind — matches layout.js's cleanMaterial return.
  const r2 = s.setPartOverride("i0", pid, { material: { roughness: null } });
  check("clearing the last material field: ok and changed", r2.ok && r2.changed, J(r2));
  const part = s.getLayout().items[0].parts[pid];
  check("no empty material object left behind once every field is cleared", !part || !has(part, "material"), J(part));
}

/* ---------------- 4. clearing the WHOLE material key at once (the "Reset colour" path) ---------------- */
{
  const s = fresh();
  const pid = P(0);
  s.setPartOverride("i0", pid, { pos: [1, 1, 1], material: { color: "#445566", metalness: 0.2 } });
  const withBoth = s.getLayout().items[0].parts[pid];
  check("pos and material both present before the whole-material clear", J(withBoth.pos) === J([1, 1, 1]) && !!withBoth.material, J(withBoth));

  const r = s.setPartOverride("i0", pid, { material: null });
  check("material: null clears the whole sub-object in one commit: ok and changed", r.ok && r.changed, J(r));
  const part = s.getLayout().items[0].parts[pid];
  check("material key is gone", part && !has(part, "material"), J(part));
  check("pos survives — the transform override is untouched by a colour reset", part && J(part.pos) === J([1, 1, 1]), J(part));
}

/* ---------------- 5. a no-op patch changes nothing and bumps no history ---------------- */
{
  const s = fresh();
  const pid = P(0);
  s.setPartOverride("i0", pid, { material: { color: "#ff0000" } });
  const depthBefore = s.getSnapshot().undoDepth;
  const r = s.setPartOverride("i0", pid, { material: { color: "#ff0000" } });
  check("re-setting the identical material patch is a no-op (changed: false)", r.ok && r.changed === false, J(r));
  check("a no-op leaves undo depth unchanged", s.getSnapshot().undoDepth === depthBefore, String(s.getSnapshot().undoDepth));
}

/* ---------------- 6. 20 random valid material edits, then 20 undos ---------------- */
{
  const s = fresh();
  const R = mkRand(920250611);
  const partIds = [P(0), P(1), P(2)];
  const start = lay(s);
  const states = [start];

  for (let i = 0; i < 20; i += 1) {
    const pid = partIds[R.int(partIds.length)];
    const k = R.int(4);
    let material;
    if (k === 0) material = { color: `#${R.int(0xffffff).toString(16).padStart(6, "0")}` };
    else if (k === 1) material = { metalness: R.range(0, 1) };
    else if (k === 2) material = { roughness: R.range(0, 1) };
    else material = { opacity: R.range(0, 1), ignoreVertexColors: R.int(2) === 1 };
    const r = s.setPartOverride("i0", pid, { material });
    check(`edit ${i}: setPartOverride(material) ok and changed`, r.ok && r.changed, J({ pid, material, r }));
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
}

/* ---------------- 7. validateLayout directly: the material schema on a raw layout ---------------- */
{
  const raw = {
    version: 1,
    items: [
      {
        itemId: "i0",
        assetId: A,
        parts: {
          [P(0)]: { material: { color: "#00FF00", metalness: 0.5, roughness: 1.4, opacity: -1, ignoreVertexColors: false } },
          [P(1)]: { material: {} },
          [P(2)]: { material: { color: "not-a-color", metalness: 0.3 } },
        },
      },
    ],
  };
  const v = validateLayout(raw);
  check("validateLayout: ok despite an invalid part (the layout as a whole is still valid)", v.ok, J(v.errors));
  const p0 = v.layout.items[0].parts[P(0)];
  check("validateLayout: color is lowercased", p0.material.color === "#00ff00", J(p0));
  check("validateLayout: roughness 1.4 clamps to 1", p0.material.roughness === 1, J(p0));
  check("validateLayout: opacity -1 clamps to 0", p0.material.opacity === 0, J(p0));
  check("validateLayout: ignoreVertexColors:false round-trips (not dropped as falsy)", p0.material.ignoreVertexColors === false, J(p0));
  check("validateLayout: an empty material object drops the whole part (nothing to keep)", !has(v.layout.items[0].parts, P(1)), J(v.layout.items[0].parts));
  const p2 = v.layout.items[0].parts[P(2)];
  check("validateLayout: an invalid color is dropped but a valid sibling field survives", p2 && !has(p2.material, "color") && p2.material.metalness === 0.3, J(p2));
  check("validateLayout: at least one warning was raised for the dropped fields", v.warnings.length > 0, String(v.warnings.length));
}

/* ---------------- 8. this script's own line endings ---------------- */
{
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  check("test-garage-color.mjs: LF line endings", !src.includes("\r"));
}

console.log(`\n${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
