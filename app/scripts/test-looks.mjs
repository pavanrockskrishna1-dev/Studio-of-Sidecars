import { strict as assert } from "node:assert";
import { isLook, normLook, drawLook } from "../src/animation/looks.js";
import { defaultSequence, setLook, sequenceToSession, sequenceFromSession } from "../src/animation/reelSequence.js";

let passes = 0;
const PASS = (msg) => {
  console.log(`PASS: ${msg}`);
  passes += 1;
};

// 1. normLook
assert.deepEqual(normLook({ type: "warm", vignette: false }), { type: "warm", vignette: false });
assert.deepEqual(normLook({ type: "none", vignette: true }), { type: "none", vignette: true });
assert.equal(normLook({ type: "none", vignette: false }), undefined);
assert.equal(normLook(undefined), undefined);
assert.equal(normLook({ type: "junk", vignette: false }), undefined);
assert.equal(normLook({ type: "warm" }), undefined); // missing vignette
PASS("normLook");

// 2. drawLook
let saves = 0;
let restores = 0;
let drawn = [];
let compOp = null;
const fakeCtx = {
  save: () => { saves += 1; },
  restore: () => { restores += 1; },
  set globalCompositeOperation(op) { compOp = op; },
  get globalCompositeOperation() { return compOp; },
  fillRect: (x, y, w, h) => drawn.push({ x, y, w, h, fill: fakeCtx.fillStyle }),
  createRadialGradient: () => ({ addColorStop: () => {} })
};

// nothing drawn for undefined or none without vignette
drawLook(fakeCtx, undefined, 100, 100);
drawLook(fakeCtx, { type: "none", vignette: false }, 100, 100);
assert.equal(saves, 0);
assert.equal(drawn.length, 0);

// cinema draws two bars and a wash
drawLook(fakeCtx, { type: "cinema", vignette: false }, 100, 100);
assert.equal(saves, 1);
assert.equal(restores, 1);
assert.equal(compOp, "source-over");
assert.equal(drawn.length, 3);
assert.equal(drawn[0].h, 9); // 9% of 100
assert.equal(drawn[1].h, 9);
assert.equal(drawn[2].h, 100);
PASS("drawLook");

// 3. setLook
const seq = [...defaultSequence(), ...defaultSequence(), ...defaultSequence()];
assert.equal(seq.length, 3);
const s1 = setLook(seq, 0, { type: "warm", vignette: true });
assert.equal(s1.ok, true);
assert.deepEqual(s1.seq[0].look, { type: "warm", vignette: true });
assert.notEqual(s1.seq, seq);

const s2 = setLook(seq, 2, { type: "cool", vignette: false });
assert.equal(s2.ok, true);
assert.deepEqual(s2.seq[2].look, { type: "cool", vignette: false });

const cleared = setLook(s1.seq, 0, { type: "none", vignette: false });
assert.equal(cleared.ok, true);
assert.equal(cleared.seq[0].look, undefined);

const junk = setLook(seq, 1, { type: "junk", vignette: false });
assert.equal(junk.ok, false);
assert.equal(junk.reason, "That setting is not available.");
PASS("setLook");

// 4. Session round trip
const s3 = setLook(s2.seq, 0, { type: "warm", vignette: true }).seq;
const saved = sequenceToSession(s3);
const loaded = sequenceFromSession(saved);
assert.deepEqual(loaded[0].look, { type: "warm", vignette: true });
assert.equal(loaded[1].look, undefined);
assert.deepEqual(loaded[2].look, { type: "cool", vignette: false });
PASS("Session save/load");

// 5. Byte identical
const savedOrig = sequenceToSession(seq);
assert.equal(JSON.stringify(savedOrig).includes("look"), false);
PASS("Byte-identical without look");

console.log(`ALL CHECKS PASSED (${passes} PASS)`);
