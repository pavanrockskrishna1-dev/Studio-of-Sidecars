export const FIREWORK = Object.freeze({
  BURSTS: 3,
  SPARKS: 90,
  TRAIL: 4,
  CYCLE: 7,
});

export const PALETTES = Object.freeze([
  [1.0, 0.75, 0.0],
  [1.0, 0.5, 0.0],
  [1.0, 0.38, 0.7],
  [0.2, 0.85, 1.0],
  [1.0, 1.0, 1.0],
]);

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const randAt = (rand, n) => {
  if (!Array.isArray(rand) && !(rand instanceof Float32Array)) return 0;
  const i = Math.abs(Math.floor(n)) % rand.length;
  return rand[i] ?? 0;
};

export function burstInfo(b, cycleIndex, rand) {
  const cycle = Number.isFinite(cycleIndex) ? cycleIndex : 0;
  const jitter = (randAt(rand, b * 19 + 3) - 0.5) * 1.2;
  const start = ((cycle + b * 2.0 + jitter) % FIREWORK.CYCLE + FIREWORK.CYCLE) % FIREWORK.CYCLE;
  const paletteRoll = randAt(rand, b * 13 + 9);
  const hue = paletteRoll < 0.42 ? 0 : paletteRoll < 0.72 ? 1 : paletteRoll < 0.9 ? 2 : paletteRoll < 0.97 ? 3 : 4;

  return {
    start,
    x: (randAt(rand, b * 23 + 5) * 2 - 1) * 1.6,
    y: 2.2 + randAt(rand, b * 31 + 7) * 1.2,
    z: -3.5 + randAt(rand, b * 43 + 11) * 1.5,
    hue,
  };
}

export function burstLocalTime(clock, b, rand) {
  const burst = burstInfo(b, 0, rand);
  const cyc = ((clock % FIREWORK.CYCLE) + FIREWORK.CYCLE) % FIREWORK.CYCLE;
  return (cyc - burst.start + FIREWORK.CYCLE) % FIREWORK.CYCLE;
}

export function sparkPoint(b, i, t, rand, out = {}) {
  if (t < 0) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    out.alpha = 0;
    out.size = 0;
    return out;
  }

  const burst = burstInfo(b, 0, rand);
  const u = randAt(rand, b * 101 + i * 17 + 3);
  const v = randAt(rand, b * 127 + i * 19 + 7);
  const w = randAt(rand, b * 139 + i * 23 + 11);
  const azimuth = u * Math.PI * 2;
  const theta = Math.acos(clamp(2 * v - 1, -1, 1));
  const speed = 1.2 + w * 0.8;
  const vx = Math.sin(theta) * Math.cos(azimuth) * speed;
  const vy = Math.cos(theta) * speed;
  const vz = Math.sin(theta) * Math.sin(azimuth) * speed;

  const drag = Math.exp(-1.4 * t);
  const driftX = (vx / 1.4) * (1 - drag);
  const driftY = (vy / 1.4) * (1 - drag) - 0.5 * 1.5 * t * t;
  const driftZ = (vz / 1.4) * (1 - drag);

  const life = 1.8 + randAt(rand, b * 151 + i * 29 + 13) * 0.8;
  const pX = burst.x + driftX;
  const pZ = burst.z + driftZ;
  const radius = Math.hypot(pX - burst.x, pZ - burst.z);
  const radiusScale = radius > 2.2 ? 2.2 / Math.max(radius, 1e-6) : 1;
  const x = burst.x + (pX - burst.x) * radiusScale;
  const y = Math.max(0.4, burst.y + driftY);
  const z = burst.z + (pZ - burst.z) * radiusScale;

  const flash = Math.max(0, 1 - t / 0.12);
  const alphaLife = clamp(1 - t / life, 0, 1);
  const alpha = t >= life ? 0 : clamp(alphaLife + flash * 0.85, 0, 1);
  const size = 0.04 + (1 - clamp(t / life, 0, 1)) * 0.18 + flash * 0.28;

  out.x = x;
  out.y = y;
  out.z = z;
  out.alpha = alpha;
  out.size = size;
  return out;
}
