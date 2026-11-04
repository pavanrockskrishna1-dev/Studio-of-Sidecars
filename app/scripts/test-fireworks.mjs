import assert from 'node:assert/strict';
import { FIREWORK, PALETTES, burstInfo, burstLocalTime, sparkPoint } from '../src/fx/fireworkMath.js';

const toRand = (seed) => {
  let s = seed >>> 0;
  return Float32Array.from({ length: 4096 }, () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), s | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  });
};

assert.equal(FIREWORK.BURSTS, 3);
assert.equal(FIREWORK.SPARKS, 90);
assert.equal(FIREWORK.TRAIL, 4);
assert.equal(FIREWORK.CYCLE, 7);
assert.equal(FIREWORK.BURSTS * FIREWORK.SPARKS * FIREWORK.TRAIL, 1080);
assert.equal(PALETTES.length, 5);
assert.ok(PALETTES.every((c) => c.length === 3 && c.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)));

for (let b = 0; b < FIREWORK.BURSTS; b++) {
  for (let idx = 0; idx < FIREWORK.CYCLE; idx++) {
    const info = burstInfo(b, idx, toRand(11 + b * 101 + idx));
    assert.ok(info.start >= 0 && info.start < FIREWORK.CYCLE);
    assert.ok(info.x >= -1.6 && info.x <= 1.6);
    assert.ok(info.y >= 2.2 && info.y <= 3.4);
    assert.ok(info.z >= -3.5 && info.z <= -2);
    assert.ok(info.hue >= 0 && info.hue < PALETTES.length);
  }
}

const rand = toRand(12345);
for (let b = 0; b < FIREWORK.BURSTS; b++) {
  const burst = burstInfo(b, 0, rand);
  let visibleCount = 0;
  for (let clock = 0; clock <= 40; clock += 0.05) {
    const local = burstLocalTime(clock, b, rand);
    const sample = sparkPoint(b, 0, local, rand, {});
    if (sample.alpha > 0) visibleCount += 1;
  }
  assert.ok(visibleCount > 0, `burst ${b} never visible`);
}

for (let cycle = 0; cycle < 6; cycle++) {
  const cycleStart = cycle * FIREWORK.CYCLE;
  const values = [];
  for (let clock = cycleStart; clock < cycleStart + FIREWORK.CYCLE; clock += 0.05) {
    let visible = false;
    for (let b = 0; b < FIREWORK.BURSTS; b++) {
      const local = burstLocalTime(clock, b, rand);
      const sample = sparkPoint(b, 0, local, rand, {});
      if (sample.alpha > 0) visible = true;
    }
    values.push(visible ? 1 : 0);
  }
  const visibleFrames = values.reduce((sum, v) => sum + v, 0);
  const ratio = visibleFrames / values.length;
  assert.ok(ratio >= 0.3, `cycle ${cycle} only had ${ratio * 100}% visible frames`);
}

const position = [1.25, 2.5, -3.0];
const size = 0.8;
for (let b = 0; b < FIREWORK.BURSTS; b++) {
  const local = burstLocalTime(2.4, b, rand);
  const out = sparkPoint(b, 7, local, rand, {});
  assert.ok(Number.isFinite(out.x) && Number.isFinite(out.y) && Number.isFinite(out.z));
  const x = position[0] + out.x * size;
  const y = position[1] + out.y * size;
  const z = position[2] + out.z * size;
  assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
}

for (let b = 0; b < FIREWORK.BURSTS; b++) {
  for (let i = 0; i < FIREWORK.SPARKS; i++) {
    const hidden = sparkPoint(b, i, -0.1, rand, {});
    assert.equal(hidden.alpha, 0);
    for (const t of [-0.001, 0, 0.05, 0.2, 0.9, 1.5, 2.0, 2.4]) {
      const out = sparkPoint(b, i, t, rand, {});
      assert.ok(Number.isFinite(out.x));
      assert.ok(Number.isFinite(out.y));
      assert.ok(Number.isFinite(out.z));
      assert.ok(Number.isFinite(out.alpha));
      assert.ok(out.alpha >= 0 && out.alpha <= 1);
      assert.ok(Number.isFinite(out.size) && out.size >= 0);
    }
    const after = sparkPoint(b, i, 3.0, rand, {});
    assert.equal(after.alpha, 0);
  }
}

console.log('FIREWORKS MATH OK');
