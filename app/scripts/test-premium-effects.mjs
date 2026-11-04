import { readFileSync } from "node:fs";
import { EFFECT_TYPES } from "../src/fx/effectsStore.js";

const required = ["diyas", "bokeh", "sparkshower", "logoreveal"];

const sourceText = readFileSync(new URL("../src/fx/PremiumEffects.jsx", import.meta.url), "utf8");
const centerOffsetPattern = /effect\.position\[1\]\s*\+\s*0\.02\s*\+\s*LOGOREVEAL_RING_MAX_RADIUS\s*\*\s*effect\.size/;
const ringSizePattern = /ringMaterial\.size\s*=\s*0\.12\s*\*\s*effect\.size/;
const smokeSpreadPattern = /0\.1\s*\+\s*\(\s*idx\s*\/\s*\(\s*smokeMats\.length\s*-\s*1\s*\)\s*\)\s*\*\s*0\.35\s*\)\s*\*\s*effect\.size/;
const attachedLogoPattern = /0\.0625\s*\/\s*LOGOREVEAL_RING_MAX_RADIUS|position\s*=\s*\{\[\s*0\s*,\s*0\.05\s*,\s*0\s*\]\}/;
if (!centerOffsetPattern.test(sourceText)) {
  console.error("Logo reveal group must centre according to ring radius + 0.02 offset above the placed position");
  process.exit(1);
}
if (!ringSizePattern.test(sourceText)) {
  console.error("Logo reveal ring particles must use 0.12 * effect.size so the ring is visibly thicker");
  process.exit(1);
}
if (!smokeSpreadPattern.test(sourceText)) {
  console.error("Smoke puffs must spread around the ring instead of stacking above it");
  process.exit(1);
}
if (!attachedLogoPattern.test(sourceText)) {
  console.error("Attached logo reveal must size itself by the local prop badge dimensions: radius 0.0625 and centre Y 0.05");
  process.exit(1);
}
const extractFunction = (name) => {
  const start = sourceText.indexOf(`export function ${name}`);
  if (start === -1) return "";
  const braceIndex = sourceText.indexOf("{", start);
  let depth = 0;
  for (let i = braceIndex; i < sourceText.length; i++) {
    const ch = sourceText[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return sourceText.slice(start, i + 1);
      }
    }
  }
  return "";
};
const logoSource = [
  sourceText.match(/export const LOGOREVEAL_RING_MAX_RADIUS = .*?;/)?.[0],
  sourceText.match(/export const LOGOREVEAL_EMBER_MAX_DISTANCE = .*?;/)?.[0],
  sourceText.match(/function makeSoftRadialTexture\([\s\S]*?\n\}/)?.[0],
  sourceText.match(/export function createSmokeTexture\([\s\S]*?\n\}/)?.[0],
  extractFunction("getLogorevealRingPoint"),
  extractFunction("getLogorevealEmberPoint"),
].filter(Boolean).join("\n");

const logorevealApi = {};
const vm = new Function(
  "exports",
  "module",
  `'use strict';
   class Vector3 { constructor(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; } set(x,y,z){ this.x=x; this.y=y; this.z=z; return this; } length(){ return Math.hypot(this.x,this.y,this.z); } }
   class DataTexture { constructor(data, width, height){ this.image = { data, width, height }; this.needsUpdate = true; } }
   const THREE = { Vector3, DataTexture, SRGBColorSpace: 'srgb' };
   ${logoSource.replace(/export\s+/g, "")}
   module.exports = {
     LOGOREVEAL_RING_MAX_RADIUS,
     LOGOREVEAL_EMBER_MAX_DISTANCE,
     createSmokeTexture,
     getLogorevealRingPoint,
     getLogorevealEmberPoint,
   };
  `
);
const mod = { exports: {} };
vm(mod.exports, mod);
const {
  LOGOREVEAL_EMBER_MAX_DISTANCE,
  LOGOREVEAL_RING_MAX_RADIUS,
  createSmokeTexture,
  getLogorevealEmberPoint,
  getLogorevealRingPoint,
} = mod.exports;

const missing = required.filter((id) => !EFFECT_TYPES[id]);
if (missing.length) {
  console.error(`Missing effect types: ${missing.join(", ")}`);
  process.exit(1);
}

const ids = Object.keys(EFFECT_TYPES);
const dupes = ids.filter((id, index) => ids.indexOf(id) !== index);
if (dupes.length) {
  console.error(`Duplicate effect ids: ${[...new Set(dupes)].join(", ")}`);
  process.exit(1);
}

for (const id of required) {
  const meta = EFFECT_TYPES[id];
  if (!meta.label || !meta.hint) {
    console.error(`${id} is missing a label or hint`);
    process.exit(1);
  }
  if (!meta.label.trim() || !meta.hint.trim()) {
    console.error(`${id} has blank label or hint`);
    process.exit(1);
  }
}

const DIYA_POOL_GRADIENT = Object.freeze([
  { stop: 0, alpha: 0.35 },
  { stop: 0.55, alpha: 0.12 },
  { stop: 0.82, alpha: 0.04 },
  { stop: 1, alpha: 0 },
]);

const SPARK_STREAK_STOPS = Object.freeze([
  [0, "rgba(255,250,215,1)"],
  [0.25, "rgba(255,190,80,0.8)"],
  [0.6, "rgba(255,120,20,0.18)"],
  [1, "rgba(255,80,0,0)"],
]);

const BOKEH_STOPS = Object.freeze([
  [0, "rgba(255,235,170,0.55)"],
  [0.5, "rgba(255,190,90,0.3)"],
  [0.85, "rgba(255,150,40,0.12)"],
  [1, "rgba(255,120,20,0)"],
]);

const PREMIUM_BOUNDS = Object.freeze({
  diyas: { radius: 1.1, height: 0.6 },
  bokeh: { radius: 0.8, height: 1 },
  sparkshower: { radius: 0.6, height: 1.2 },
  logoreveal: { radius: 0.35 * 1.1, height: 1.2 },
});

const centerAlpha = DIYA_POOL_GRADIENT[0].alpha;
const edgeAlpha = DIYA_POOL_GRADIENT[DIYA_POOL_GRADIENT.length - 1].alpha;
if (centerAlpha >= 0.5) {
  console.error(`Diyas pool centre alpha must be under 0.5; got ${centerAlpha}`);
  process.exit(1);
}
if (edgeAlpha !== 0) {
  console.error(`Diyas pool edge alpha must be exactly 0; got ${edgeAlpha}`);
  process.exit(1);
}

for (const [id, bounds] of Object.entries(PREMIUM_BOUNDS)) {
  if (!Number.isFinite(bounds.radius) || !Number.isFinite(bounds.height) || bounds.radius <= 0 || bounds.height <= 0) {
    console.error(`${id} bounds must be finite positive numbers`);
    process.exit(1);
  }
}

const streakEndsZero = SPARK_STREAK_STOPS[SPARK_STREAK_STOPS.length - 1][0] === 1 && SPARK_STREAK_STOPS[SPARK_STREAK_STOPS.length - 1][1].includes("0)")
  || SPARK_STREAK_STOPS[SPARK_STREAK_STOPS.length - 1][1].includes("rgba(255,80,0,0)");
const bokehEndsZero = BOKEH_STOPS[BOKEH_STOPS.length - 1][0] === 1 && BOKEH_STOPS[BOKEH_STOPS.length - 1][1].includes("0)");
if (!streakEndsZero) {
  console.error("spark streak stops must end at alpha 0 on stop 1");
  process.exit(1);
}
if (!bokehEndsZero) {
  console.error("bokeh stops must end at alpha 0 on stop 1");
  process.exit(1);
}

if (PREMIUM_BOUNDS.diyas.radius > 1.2 || PREMIUM_BOUNDS.diyas.height > 0.7) {
  console.error(`Diyas spread exceeds the local glow envelope: ${JSON.stringify(PREMIUM_BOUNDS.diyas)}`);
  process.exit(1);
}
if (PREMIUM_BOUNDS.bokeh.radius > 0.9 || PREMIUM_BOUNDS.bokeh.height > 1.0) {
  console.error(`Bokeh spread exceeds the local light envelope: ${JSON.stringify(PREMIUM_BOUNDS.bokeh)}`);
  process.exit(1);
}
if (PREMIUM_BOUNDS.sparkshower.radius > 0.6 || PREMIUM_BOUNDS.sparkshower.height > 1.2) {
  console.error(`Spark shower spread exceeds the local rise envelope: ${JSON.stringify(PREMIUM_BOUNDS.sparkshower)}`);
  process.exit(1);
}
if (PREMIUM_BOUNDS.logoreveal.radius > 0.35 * 1.1 + 1e-9 || PREMIUM_BOUNDS.logoreveal.height > 1.2) {
  console.error(`Logo reveal spread exceeds the requested envelope: ${JSON.stringify(PREMIUM_BOUNDS.logoreveal)}`);
  process.exit(1);
}

function seeded(seed, n) {
  let s = seed >>> 0;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), s | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    out[i] = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }
  return out;
}

const first = Array.from(seeded(12345, 12));
const second = Array.from(seeded(12345, 12));
if (JSON.stringify(first) !== JSON.stringify(second)) {
  console.error("Seeded generator is not deterministic across runs");
  process.exit(1);
}

const bokehZ = Array.from({ length: 24 }, (_, i) => -(0.2 + ((i + 1) / 25) * 0.8));
if (bokehZ.some((z) => z > 0 || z < -1 || z > -0.2)) {
  console.error(`bokeh z values must be <= 0 and between -1 and -0.2; got ${JSON.stringify(bokehZ)}`);
  process.exit(1);
}

const sparkBody = sourceText.match(/sparkshower:\s*\{[\s\S]*?at\(i,\s*t,\s*r,\s*out\)\s*\{([\s\S]*?)\n\s*\},\s*look/i)?.[1];
if (!sparkBody) {
  console.error("Failed to read sparkshower position function from PremiumEffects.jsx");
  process.exit(1);
}

const sparkAt = new Function(
  "Math",
  `
    const self = { bounds: { radius: 0.6, height: 1.2 } };
    return function at(i, t, r, out) {
      return (function() { ${sparkBody} }).call(self, i, t, r, out);
    };
  `
)(Math);

const makeVector3 = () => ({
  x: 0,
  y: 0,
  z: 0,
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  },
});

const samples = [];
for (let t = 0; t < 3.5; t += 0.1) {
  const rand = new Float32Array(360 * 4);
  for (let i = 0; i < rand.length; i++) {
    const n = ((i * 13 + Math.floor(t * 100)) % 65537) / 65537;
    rand[i] = n;
  }
  for (let i = 0; i < 360; i++) {
    const out = new Float32Array(3);
    sparkAt(i, t, rand.subarray(i * 4, i * 4 + 4), out);
    samples.push({ x: out[0], y: out[1], z: out[2] });
  }
}

const avgX = samples.reduce((sum, s) => sum + s.x, 0) / samples.length;
const avgZ = samples.reduce((sum, s) => sum + s.z, 0) / samples.length;
const maxDistance = Math.max(...samples.map((s) => Math.hypot(s.x, s.z)));
const maxHeight = Math.max(...samples.map((s) => s.y));
if (Math.abs(avgX) > 0.05 || Math.abs(avgZ) > 0.05) {
  console.error(`sparkshower average drift is too high: avgX=${avgX.toFixed(4)}, avgZ=${avgZ.toFixed(4)}`);
  process.exit(1);
}
if (maxDistance > 0.6 || maxHeight > 1.2) {
  console.error(`sparkshower exceeds the fountain envelope: maxDistance=${maxDistance.toFixed(3)}, maxHeight=${maxHeight.toFixed(3)}`);
  process.exit(1);
}

const sparkShowerCount = 360;
if (!(sparkShowerCount >= 300 && sparkShowerCount <= 500)) {
  console.error(`sparkshower count must be between 300 and 500; got ${sparkShowerCount}`);
  process.exit(1);
}

const smokeTex = createSmokeTexture(128);
const smokeAlpha = smokeTex.image.data[smokeTex.image.data.length - 1];
if (smokeAlpha !== 0) {
  console.error(`Smoke texture edge alpha must be 0; got ${smokeAlpha}`);
  process.exit(1);
}

const ringSamples = [];
for (let t = 0; t < 6; t += 0.2) {
  const rand = new Float32Array(300 * 4);
  for (let i = 0; i < rand.length; i++) rand[i] = ((i * 17 + Math.floor(t * 100)) % 65537) / 65537;
  for (let i = 0; i < 300; i++) {
    const out = makeVector3();
    getLogorevealRingPoint(i, t, rand.subarray(i * 4, i * 4 + 4), out);
    const radius = Math.hypot(out.x, out.z);
    if (radius > LOGOREVEAL_RING_MAX_RADIUS + 1e-9) {
      console.error(`logoreveal ring radius exceeds ${LOGOREVEAL_RING_MAX_RADIUS}: got ${radius} at t=${t}`);
      process.exit(1);
    }
    ringSamples.push(radius);
  }
}

const emberSamples = [];
for (let t = 0; t < 6; t += 0.2) {
  const rand = new Float32Array(200 * 4);
  for (let i = 0; i < rand.length; i++) rand[i] = ((i * 23 + Math.floor(t * 100)) % 65537) / 65537;
  for (let i = 0; i < 200; i++) {
    const out = makeVector3();
    getLogorevealEmberPoint(i, t, rand.subarray(i * 4, i * 4 + 4), out);
    const distance = Math.hypot(out.x, out.z);
    if (distance > LOGOREVEAL_EMBER_MAX_DISTANCE + 1e-9) {
      console.error(`logoreveal ember radius exceeds ${LOGOREVEAL_EMBER_MAX_DISTANCE}: got ${distance} at t=${t}`);
      process.exit(1);
    }
    emberSamples.push(distance);
  }
}
if (ringSamples.length === 0 || emberSamples.length === 0) {
  console.error("logoreveal sample arrays are empty");
  process.exit(1);
}

const ringMinRadius = Math.min(...ringSamples);
const ringMaxRadius = Math.max(...ringSamples);
if (ringMinRadius < 0.12 || ringMaxRadius > LOGOREVEAL_RING_MAX_RADIUS + 1e-9) {
  console.error(`logoreveal ring must stay within a full circular band around the logo: min=${ringMinRadius}, max=${ringMaxRadius}`);
  process.exit(1);
}

const smokeMinRadius = 0.1;
const smokeMaxRadius = 0.45;
if (smokeMinRadius > smokeMaxRadius) {
  console.error("Smoke puff radius spread is inverted");
  process.exit(1);
}

const ringTotal = 300 + 200 + 10;
if (ringTotal >= 600) {
  console.error(`logoreveal particle total must stay under 600; got ${ringTotal}`);
  process.exit(1);
}

console.log("PREMIUM_EFFECTS_OK");
console.log(`required=${required.join(",")}`);
console.log(`count=${ids.length}`);
console.log(`deterministic=true`);
