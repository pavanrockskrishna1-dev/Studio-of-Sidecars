// test-transitions.mjs - checks for 2D transitions: app/src/animation/transitions.js
// Plain node, no browser, no DOM canvas (uses a tiny fake ctx recording calls).
// Run from the app folder:  node scripts/test-transitions.mjs   (exit code 1 on any FAIL)

import {
  TRANSITION_TYPES,
  TRANSITION_FRAMES,
  flashAlpha,
  dipAlpha,
  drawTransition,
} from "../src/animation/transitions.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const json = (v) => JSON.stringify(v);

/* ============================ constants ============================ */
check("types are cut, flash, dip, whip", json(TRANSITION_TYPES) === json(["cut", "flash", "dip", "whip"]));
check("frames are 6, 9, 12, 18", json(TRANSITION_FRAMES) === json([6, 9, 12, 18]));

/* ============================ alpha functions ============================ */
check("flashAlpha(0) === 0", flashAlpha(0) === 0);
check("flashAlpha peaks at 1 at p = 0.2", Math.abs(flashAlpha(0.2) - 1.0) < 1e-6);
check("flashAlpha(1) === 0", flashAlpha(1) === 0);
check("flashAlpha(0.1) is halfway to peak (0.5)", Math.abs(flashAlpha(0.1) - 0.5) < 1e-6);
check("flashAlpha(0.6) is halfway down (0.5)", Math.abs(flashAlpha(0.6) - 0.5) < 1e-6);
check("flashAlpha outside 0..1 returns 0", flashAlpha(-0.1) === 0 && flashAlpha(1.1) === 0);

check("dipAlpha(0) === 0", dipAlpha(0) === 0);
check("dipAlpha is 1 at p = 0.5", Math.abs(dipAlpha(0.5) - 1.0) < 1e-6);
check("dipAlpha(1) === 0", dipAlpha(1) === 0);
check("dipAlpha(0.25) === 0.5", Math.abs(dipAlpha(0.25) - 0.5) < 1e-6);
check("dipAlpha(0.75) === 0.5", Math.abs(dipAlpha(0.75) - 0.5) < 1e-6);
check("dipAlpha outside 0..1 returns 0", dipAlpha(-0.1) === 0 && dipAlpha(1.1) === 0);

/* ============================ fake ctx ============================ */
function makeFakeCtx(canvasObj = null) {
  const calls = [];
  const stateStack = [];
  let current = {
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#000000",
  };
  return {
    canvas: canvasObj,
    get calls() { return calls; },
    get globalAlpha() { return current.globalAlpha; },
    set globalAlpha(v) { current.globalAlpha = v; calls.push({ op: "setAlpha", val: v }); },
    get globalCompositeOperation() { return current.globalCompositeOperation; },
    set globalCompositeOperation(v) { current.globalCompositeOperation = v; calls.push({ op: "setGCO", val: v }); },
    get fillStyle() { return current.fillStyle; },
    set fillStyle(v) { current.fillStyle = v; calls.push({ op: "setFillStyle", val: v }); },
    save() {
      stateStack.push({ ...current });
      calls.push({ op: "save" });
    },
    restore() {
      if (stateStack.length) {
        current = stateStack.pop();
      }
      calls.push({ op: "restore" });
    },
    fillRect(x, y, w, h) {
      calls.push({ op: "fillRect", x, y, w, h });
    },
    drawImage(...args) {
      calls.push({ op: "drawImage", argsCount: args.length });
    },
    get stackDepth() { return stateStack.length; },
  };
}

/* ============================ boundary progress ============================ */
for (const type of TRANSITION_TYPES) {
  const ctx0 = makeFakeCtx();
  drawTransition(ctx0, type, 0, 100, 100, {});
  check(`progress 0 draws nothing for type "${type}"`, ctx0.calls.length === 0);

  const ctx1 = makeFakeCtx();
  drawTransition(ctx1, type, 1, 100, 100, {});
  check(`progress 1 draws nothing for type "${type}"`, ctx1.calls.length === 0);
}

/* ============================ whip with prev = null ============================ */
const ctxWhipNull = makeFakeCtx();
drawTransition(ctxWhipNull, "whip", 0.2, 100, 100, null);

const ctxFlash = makeFakeCtx();
drawTransition(ctxFlash, "flash", 0.2, 100, 100, null);

check(
  "whip with prev = null behaves like flash",
  json(ctxWhipNull.calls) === json(ctxFlash.calls) && ctxWhipNull.calls.length > 0
);

/* ============================ ctx state restoration ============================ */
for (const [type, prev] of [
  ["flash", null],
  ["dip", null],
  ["whip", null],
  ["whip", { id: "prevCanvas" }],
]) {
  for (const p of [0.1, 0.2, 0.4, 0.5, 0.7, 0.9]) {
    const ctx = makeFakeCtx({ id: "currentCanvas" });
    drawTransition(ctx, type, p, 100, 100, prev);
    const saves = ctx.calls.filter((c) => c.op === "save").length;
    const restores = ctx.calls.filter((c) => c.op === "restore").length;
    const balanced = saves === restores && ctx.stackDepth === 0;
    const restoredAlpha = ctx.globalAlpha === 1;
    const restoredGCO = ctx.globalCompositeOperation === "source-over";
    if (!balanced || !restoredAlpha || !restoredGCO) {
      check(`ctx state is restored for ${type} at p=${p}`, false, `saves=${saves} restores=${restores} alpha=${ctx.globalAlpha} gco=${ctx.globalCompositeOperation}`);
      break;
    }
  }
}
check("the ctx state is restored after every call", true);

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
