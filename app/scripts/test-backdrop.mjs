// Phase 16B Slice C2 - checks for the backdrop cover crop.
// Run from the app folder:  node scripts/test-backdrop.mjs   (exit code 1 on any FAIL)
// Plain node, no dependencies.
import { readFileSync } from "node:fs";
import { coverCrop, needsCoverCrop, withBackdropCrop } from "../src/capture/backdropCrop.js";

let failed = 0;
const fmt = (v) => (typeof v === "number" ? v.toPrecision(12) : JSON.stringify(v));
function check(name, ok, detail = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ---- coverCrop ---- */
const c = coverCrop(1.5, 9 / 16);
check("coverCrop(1.5, 9/16): repeatX 0.375, repeatY 1", near(c.repeatX, 0.375, 1e-12) && c.repeatY === 1, `repeatX=${fmt(c.repeatX)} repeatY=${c.repeatY}`);
check("coverCrop(1.5, 9/16): offsetX 0.3125, offsetY 0", near(c.offsetX, 0.3125, 1e-12) && c.offsetY === 0, `offsetX=${fmt(c.offsetX)} offsetY=${c.offsetY}`);

const targets = [9 / 16, 4 / 5, 1, 0.5, 1.2, 2];
const images = [1.5, 2 / 3];
for (const ia of images) {
  for (const ta of targets) {
    const k = coverCrop(ia, ta);
    const shown = (k.repeatX * ia) / k.repeatY;
    const inside =
      k.repeatX > 0 && k.repeatX <= 1 && k.repeatY > 0 && k.repeatY <= 1 &&
      k.offsetX >= 0 && k.offsetY >= 0 &&
      k.offsetX + k.repeatX <= 1 + 1e-12 && k.offsetY + k.repeatY <= 1 + 1e-12;
    check(
      `image ${ia.toFixed(4)} target ${ta.toFixed(4)}: shown aspect equals target, window inside [0,1]`,
      near(shown, ta, 1e-12) && inside,
      `shown=${fmt(shown)} rep=(${fmt(k.repeatX)}, ${fmt(k.repeatY)}) off=(${fmt(k.offsetX)}, ${fmt(k.offsetY)})`
    );
  }
}
{
  const a = coverCrop(1.5, 9 / 16, { x: 0, y: 0 });
  const b = coverCrop(1.5, 9 / 16, { x: 1, y: 1 });
  check("focus x = 0 gives offsetX 0", a.offsetX === 0, `offsetX=${a.offsetX}`);
  check("focus x = 1 gives offsetX = 1 - repeatX", near(b.offsetX, 1 - b.repeatX, 1e-12), `offsetX=${fmt(b.offsetX)} 1-repeatX=${fmt(1 - b.repeatX)}`);
  const w = coverCrop(1.5, 2, { x: 0.3, y: 1 });
  check("focus y = 1 on a landscape target gives offsetY = 1 - repeatY", near(w.offsetY, 1 - w.repeatY, 1e-12), `offsetY=${fmt(w.offsetY)} 1-repeatY=${fmt(1 - w.repeatY)}`);
  const clampCase = coverCrop(1.5, 9 / 16, { x: 5, y: -3 });
  check("focus is clamped to [0, 1]", near(clampCase.offsetX, 1 - clampCase.repeatX, 1e-12) && clampCase.offsetY === 0);
  const same = coverCrop(1.5, 1.5);
  check("equal aspects give the full image", same.repeatX === 1 && same.repeatY === 1 && same.offsetX === 0 && same.offsetY === 0);
}
for (const [label, ia, ta] of [
  ["imageAspect 0", 0, 0.5],
  ["targetAspect 0", 1.5, 0],
  ["imageAspect NaN", NaN, 0.5],
  ["targetAspect NaN", 1.5, NaN],
  ["imageAspect negative", -1.5, 0.5],
  ["targetAspect negative", 1.5, -0.5],
  ["imageAspect Infinity", Infinity, 0.5],
  ["targetAspect Infinity", 1.5, Infinity],
  ["imageAspect undefined", undefined, 0.5],
]) {
  check(`coverCrop returns null for ${label}`, coverCrop(ia, ta) === null);
}

/* ---- needsCoverCrop ---- */
for (const [label, v, want] of [
  ["9/16", 9 / 16, true],
  ["4/5", 4 / 5, true],
  ["1", 1, true],
  ["1.29", 1.29, false],
  ["1.5", 1.5, false],
  ["16/9", 16 / 9, false],
  ["NaN", NaN, false],
  ["0", 0, false],
  ["-1", -1, false],
  ["Infinity", Infinity, false],
]) {
  check(`needsCoverCrop(${label}) is ${want}`, needsCoverCrop(v) === want);
}

/* ---- withBackdropCrop ---- */
function fakeScene(over = {}, orig = { rx: 1, ry: 1, ox: 0.1, oy: 0.2 }) {
  const tex = {
    isTexture: true,
    mapping: 300,
    rotation: 0,
    image: { width: 1920, height: 1280 },
    repeat: { x: orig.rx, y: orig.ry, set(x, y) { this.x = x; this.y = y; } },
    offset: { x: orig.ox, y: orig.oy, set(x, y) { this.x = x; this.y = y; } },
    updates: 0,
    updateMatrix() { this.updates += 1; },
    ...over,
  };
  return { background: tex };
}
const snap = (t) => [t.repeat.x, t.repeat.y, t.offset.x, t.offset.y];
const same = (a, b) => a.every((v, i) => v === b[i]);

{
  const scene = fakeScene();
  const orig = snap(scene.background);
  let calls = 0;
  let inside = null;
  const ret = withBackdropCrop(scene, 9 / 16, () => {
    calls += 1;
    inside = snap(scene.background);
    return "render-result";
  });
  check("crop active INSIDE render: repeat (0.375, 1), offset (0.3125, 0)", near(inside[0], 0.375, 1e-12) && inside[1] === 1 && near(inside[2], 0.3125, 1e-12) && inside[3] === 0, `inside=${fmt(inside)}`);
  check("original repeat/offset restored AFTER render (non-default originals)", same(snap(scene.background), orig), `after=${fmt(snap(scene.background))} orig=${fmt(orig)}`);
  check("render called exactly once", calls === 1, `calls=${calls}`);
  check("render's return value is passed through", ret === "render-result");
  check("updateMatrix called before and after", scene.background.updates === 2, `updates=${scene.background.updates}`);
}
{
  const scene = fakeScene();
  const orig = snap(scene.background);
  let calls = 0;
  let threw = false;
  try {
    withBackdropCrop(scene, 9 / 16, () => {
      calls += 1;
      throw new Error("boom");
    });
  } catch (e) {
    threw = e.message === "boom";
  }
  check("render that throws: the error propagates", threw);
  check("render that throws: original values restored", same(snap(scene.background), orig), `after=${fmt(snap(scene.background))}`);
  check("render that throws: called exactly once", calls === 1);
  check("render that throws: updateMatrix called for the restore too", scene.background.updates === 2, `updates=${scene.background.updates}`);
}
{
  const scene = fakeScene();
  let inside = null;
  withBackdropCrop(scene, 1, () => {
    inside = snap(scene.background);
  });
  check("1:1 gets the crop (repeatX 2/3, offsetX 1/6)", near(inside[0], 2 / 3, 1e-12) && inside[1] === 1 && near(inside[2], 1 / 6, 1e-12), `inside=${fmt(inside)}`);
  const s2 = fakeScene();
  withBackdropCrop(s2, 4 / 5, () => {
    inside = snap(s2.background);
  });
  check("4:5 gets the crop (repeatX 0.5333.., offsetX 0.2333..)", near(inside[0], (4 / 5) / 1.5, 1e-12) && near(inside[2], (1 - (4 / 5) / 1.5) / 2, 1e-12), `inside=${fmt(inside)}`);
}
{
  const noOps = [
    ["a null background", { background: null }],
    ["an undefined scene", null],
    ["a background with isTexture false", fakeScene({ isTexture: false })],
    ["a Color-like background (no isTexture)", { background: { r: 0, g: 0, b: 0 } }],
    ["mapping other than 300", fakeScene({ mapping: 301 })],
    ["rotation not 0", fakeScene({ rotation: 0.5 })],
    ["missing image", fakeScene({ image: null })],
    ["image without a size", fakeScene({ image: {} })],
    ["image size 0", fakeScene({ image: { width: 0, height: 0 } })],
  ];
  for (const [label, scene] of noOps) {
    let calls = 0;
    let inside = null;
    const bg = scene && scene.background;
    const before = bg && bg.repeat ? snap(bg) : null;
    const ret = withBackdropCrop(scene, 9 / 16, () => {
      calls += 1;
      inside = bg && bg.repeat ? snap(bg) : null;
      return 42;
    });
    const untouched = before === null || same(inside, before);
    check(`no-op for ${label}`, calls === 1 && ret === 42 && untouched && (!bg || !bg.updates), `calls=${calls}`);
  }
  // image sized only through naturalWidth / naturalHeight still works
  const nat = fakeScene({ image: { naturalWidth: 1920, naturalHeight: 1280 } });
  let inside = null;
  withBackdropCrop(nat, 9 / 16, () => {
    inside = snap(nat.background);
  });
  check("image sized by naturalWidth / naturalHeight is cropped", near(inside[0], 0.375, 1e-12), `inside=${fmt(inside)}`);
  for (const [label, a] of [["landscape 1.29", 1.29], ["3:2 (1.5)", 1.5], ["16:9", 16 / 9], ["NaN", NaN], ["0", 0]]) {
    const scene = fakeScene();
    const orig = snap(scene.background);
    let calls = 0;
    let insideL = null;
    withBackdropCrop(scene, a, () => {
      calls += 1;
      insideL = snap(scene.background);
    });
    check(`no-op for aspect ${label}: values inside render equal the originals`, calls === 1 && same(insideL, orig) && scene.background.updates === 0, `inside=${fmt(insideL)}`);
  }
}

/* ---- purity ---- */
const src = readFileSync(new URL("../src/capture/backdropCrop.js", import.meta.url), "utf8");
const bad = /from\s+["'](three|react)["']|import\s*\(?\s*["'](three|react)["']|require\(\s*["'](three|react)["']\s*\)/.test(src);
check("backdropCrop.js has no import from three or react", !bad);
check("backdropCrop.js has no import statements at all", !/^\s*import\s/m.test(src));

console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
