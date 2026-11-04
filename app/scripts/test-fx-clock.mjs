import fs from "fs";
import { registerFx, setReelTime, getReelTime, tickFx } from "../src/fx/fxClock.js";
import { burstInfo, burstLocalTime, sparkPoint } from "../src/fx/fireworkMath.js";

let passes = 0;
function pass(msg) {
  console.log(`PASS ${msg}`);
  passes++;
}
function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

// 1. fxClock registry tests
let a = 0, b = 0;
const fn1 = (t) => { a = t; };
const fn2 = (t) => { throw new Error("test"); };
const fn3 = (t) => { b = t; };

const unreg1 = registerFx(fn1);
const unreg2 = registerFx(fn2);
const unreg3 = registerFx(fn3);

const oldError = console.error;
console.error = () => {}; // suppress the expected error from fn2
tickFx(1.5);
console.error = oldError;

if (a !== 1.5) fail("fn1 not called");
if (b !== 1.5) fail("fn3 not called (fn2 threw)");
pass("registry ticks and survives errors");

unreg1();
tickFx(2.5);
if (a !== 1.5) fail("fn1 still called");
if (b !== 2.5) fail("fn3 not called");
pass("registry unregisters");

setReelTime(3.14);
if (getReelTime() !== 3.14) fail("getReelTime");
pass("setReelTime/getReelTime");

// 2. Math purity check
const rand = new Float32Array(1000).fill(0).map(() => Math.random());
const t1 = 3.5;
const p1_1 = sparkPoint(0, 0, t1, rand, {});
const p1_2 = sparkPoint(0, 0, t1, rand, {});
if (p1_1.x !== p1_2.x || p1_1.alpha !== p1_2.alpha) fail("sparkPoint not pure");
pass("fireworkMath sparkPoint pure");

const b1 = burstInfo(0, 5, rand);
const b2 = burstInfo(0, 5, rand);
if (b1.start !== b2.start) fail("burstInfo not pure");
pass("fireworkMath burstInfo pure");

const blt1 = burstLocalTime(10, 0, rand);
const blt2 = burstLocalTime(10, 0, rand);
if (blt1 !== blt2) fail("burstLocalTime not pure");
pass("fireworkMath burstLocalTime pure");

// 3. source check
const effL = fs.readFileSync("./src/fx/EffectsLayer.jsx", "utf-8");
const premE = fs.readFileSync("./src/fx/PremiumEffects.jsx", "utf-8");

if (effL.match(/clock\.current \+=/)) fail("EffectsLayer.jsx still has clock.current +=");
if (premE.match(/clock\.current \+=/)) fail("PremiumEffects.jsx still has clock.current +=");
if (effL.match(/pulseRef\.current \+=/)) fail("EffectsLayer.jsx still has pulseRef.current +=");
if (premE.match(/pulseRef\.current \+=/)) fail("PremiumEffects.jsx still has pulseRef.current +=");

pass("no clock.current += found (text check)");
console.log(`ALL CHECKS PASSED (${passes} PASS)`);
