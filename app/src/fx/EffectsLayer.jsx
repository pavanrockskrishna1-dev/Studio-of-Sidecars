import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as effectsStore from "./effectsStore";

/* The placed 3D effects (effectsStore.js). Each is a point-sprite system
   driven by the frame clock, so the export (which steps every frame effect
   by one export frame) renders them exactly like the live view. Everything is
   in world space; positions are each effect's ground point. */

function sprite(draw, size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const radial = (stops) => (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
};
const leafShape = (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.rotate(0.6);
  ctx.fillStyle = "#c8601c";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.42);
  ctx.quadraticCurveTo(s * 0.3, -s * 0.1, 0, s * 0.42);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.1, 0, -s * 0.42);
  ctx.fill();
};
const batShape = (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = "#14081f";
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.07, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(d * s * 0.04, -s * 0.03);
    ctx.quadraticCurveTo(d * s * 0.28, -s * 0.2, d * s * 0.46, -s * 0.02);
    ctx.quadraticCurveTo(d * s * 0.3, s * 0.02, d * s * 0.04, s * 0.06);
    ctx.fill();
  }
};

const streak = (ctx, s) => {
  const g = ctx.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,255,255,0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(s / 2 - 1, 0, 2, s);
};
const chip = (ctx, s) => {
  ctx.fillStyle = "#fff";
  ctx.fillRect(s * 0.3, s * 0.15, s * 0.4, s * 0.7);
};
const CONFETTI = [[1, 0.25, 0.35], [1, 0.8, 0.15], [0.2, 0.75, 1], [0.45, 1, 0.4], [0.85, 0.4, 1], [1, 0.55, 0.15]];
// 0..1 through a looping lifetime of min + r * span seconds
const life01 = (t, r, min, span) => {
  const life = min + r * span;
  return ((t + r * 7.3 * life) % life) / life;
};

// per type: particle count, sprite, look, the motion of particle i at time t
// (`at`), and optionally its own colour / alpha / size (`look` sets c.r c.g
// c.b c.a c.s; defaults white, 1, 1). `linear` sizes the sprite with the
// effect's size slider instead of its square root.
const KINDS = {
  fog: {
    count: 36,
    tex: () => sprite(radial([[0, "rgba(170,185,225,0.55)"], [1, "rgba(170,185,225,0)"]]), 128),
    material: { size: 1.6, opacity: 0.22, blending: THREE.NormalBlending, color: 0x9aa8d8 },
    at(i, t, r, out) {
      const a = r[i * 4] * Math.PI * 2 + t * 0.05 * (r[i * 4 + 1] - 0.5);
      const rad = 0.3 + r[i * 4 + 2] * 1.6;
      out.set(Math.cos(a) * rad + Math.sin(t * 0.2 + i) * 0.15, 0.15 + r[i * 4 + 3] * 0.6, Math.sin(a) * rad);
    },
  },
  embers: {
    count: 70,
    tex: () => sprite(radial([[0, "rgba(255,190,80,1)"], [0.5, "rgba(255,90,10,0.6)"], [1, "rgba(0,0,0,0)"]]), 32),
    material: { size: 0.05, opacity: 1, blending: THREE.AdditiveBlending, color: 0xff8a2a },
    at(i, t, r, out) {
      const life = 1.4 + r[i * 4] * 1.4;
      const ph = ((t + r[i * 4 + 1] * life) % life) / life;
      out.set((r[i * 4 + 2] - 0.5) * 0.35 + Math.sin(t * 3 + i) * 0.05 * ph, ph * 1.8, (r[i * 4 + 3] - 0.5) * 0.35 + Math.cos(t * 2.5 + i) * 0.05 * ph);
    },
  },
  leaves: {
    count: 50,
    tex: () => sprite(leafShape, 48),
    material: { size: 0.12, opacity: 1, blending: THREE.NormalBlending, color: 0xffffff },
    at(i, t, r, out) {
      const fall = 0.35 + r[i * 4] * 0.4;
      const y = 3.2 - ((t * fall + r[i * 4 + 1] * 3.2) % 3.2);
      out.set((r[i * 4 + 2] - 0.5) * 3 + Math.sin(t * 1.3 + i) * 0.25, y, (r[i * 4 + 3] - 0.5) * 3 + Math.cos(t * 0.9 + i) * 0.15);
    },
  },
  bats: {
    count: 12,
    tex: () => sprite(batShape, 64),
    material: { size: 0.32, opacity: 1, blending: THREE.NormalBlending, color: 0xffffff },
    at(i, t, r, out) {
      const speed = (0.5 + r[i * 4] * 0.6) * (i % 2 ? 1 : -1);
      const a = r[i * 4 + 1] * Math.PI * 2 + t * speed;
      const rad = 0.8 + r[i * 4 + 2] * 1.4;
      out.set(Math.cos(a) * rad, 2 + r[i * 4 + 3] * 1.4 + Math.sin(t * 2 + i) * 0.15, Math.sin(a) * rad);
    },
  },
  smoke: {
    count: 40,
    linear: true,
    tex: () => sprite(radial([[0, "rgba(255,255,255,0.7)"], [0.6, "rgba(255,255,255,0.25)"], [1, "rgba(255,255,255,0)"]]), 128),
    material: { size: 0.9, opacity: 0.55, blending: THREE.NormalBlending, color: 0x8b9099 },
    at(i, t, r, out) {
      const ph = life01(t, r[i * 4], 4, 2.5);
      out.set((r[i * 4 + 1] - 0.5) * 0.25 + ph * ph * 0.7 + Math.sin(t * 0.7 + i) * 0.08 * ph, 0.2 + ph * 2.6, (r[i * 4 + 2] - 0.5) * 0.25 + Math.cos(t * 0.5 + i) * 0.1 * ph);
    },
    look(i, t, r, c) {
      const ph = life01(t, r[i * 4], 4, 2.5);
      c.s = 0.35 + ph * 1.9;
      c.a = Math.sin(ph * Math.PI) * 0.9;
    },
  },
  sparks: {
    count: 90,
    tex: () => sprite(radial([[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,0.5)"], [1, "rgba(0,0,0,0)"]]), 32),
    material: { size: 0.045, opacity: 1, blending: THREE.AdditiveBlending, color: 0xffffff },
    at(i, t, r, out) {
      // a ballistic arc that lands back on the ground at the end of its life
      const vy = 2.6 + r[i * 4 + 1] * 1.4;
      const life = (2 * vy) / 6;
      const tt = (t + r[i * 4] * life) % life;
      const a = r[i * 4 + 2] * Math.PI * 2;
      const vh = 0.3 + r[i * 4 + 3] * 0.9;
      out.set(Math.cos(a) * vh * tt, Math.max(0, vy * tt - 3 * tt * tt), Math.sin(a) * vh * tt);
    },
    look(i, t, r, c) {
      const vy = 2.6 + r[i * 4 + 1] * 1.4;
      const life = (2 * vy) / 6;
      const ph = ((t + r[i * 4] * life) % life) / life;
      c.g = 0.9 - ph * 0.55;
      c.b = 0.45 - ph * 0.4;
      c.a = 1 - ph * 0.7;
    },
  },
  fireflies: {
    count: 40,
    tex: () => sprite(radial([[0, "rgba(255,255,255,1)"], [0.3, "rgba(255,255,255,0.6)"], [1, "rgba(0,0,0,0)"]]), 32),
    material: { size: 0.08, opacity: 1, blending: THREE.AdditiveBlending, color: 0xd2ff6e },
    at(i, t, r, out) {
      const k = 0.15 + r[i * 4] * 0.2;
      out.set((r[i * 4 + 1] - 0.5) * 3.6 + Math.sin(t * k * 2.1 + i) * 0.5, 0.3 + r[i * 4 + 2] * 1.5 + Math.sin(t * k * 3.3 + i * 2) * 0.25, (r[i * 4 + 3] - 0.5) * 3.6 + Math.cos(t * k * 1.7 + i) * 0.5);
    },
    look(i, t, r, c) {
      const p = Math.max(0, Math.sin(t * (1.2 + r[i * 4] * 1.5) + r[i * 4 + 1] * 20));
      c.a = 0.1 + 0.9 * p * p * p;
    },
  },
  wisps: {
    count: 14,
    linear: true,
    tex: () => sprite(radial([[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,0.55)"], [1, "rgba(0,0,0,0)"]]), 64),
    material: { size: 0.4, opacity: 0.9, blending: THREE.AdditiveBlending, color: 0x86d4ff },
    at(i, t, r, out) {
      const a = r[i * 4] * Math.PI * 2 + t * (0.15 + r[i * 4 + 1] * 0.2) * (i % 2 ? 1 : -1);
      const rad = 0.6 + r[i * 4 + 2] * 1.5;
      out.set(Math.cos(a) * rad, 0.5 + r[i * 4 + 3] * 1.2 + Math.sin(t * 0.8 + i) * 0.25, Math.sin(a) * rad);
    },
    look(i, t, r, c) {
      c.a = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7));
      c.s = 0.8 + 0.3 * Math.sin(t * 2.1 + i);
      c.r = 0.75 + 0.25 * r[i * 4 + 1];
    },
  },
  snow: {
    count: 160,
    tex: () => sprite(radial([[0, "rgba(255,255,255,1)"], [0.5, "rgba(255,255,255,0.8)"], [1, "rgba(255,255,255,0)"]]), 32),
    material: { size: 0.05, opacity: 0.95, blending: THREE.NormalBlending, color: 0xffffff },
    at(i, t, r, out) {
      const fall = 0.45 + r[i * 4] * 0.45;
      const y = 4 - ((t * fall + r[i * 4 + 1] * 4) % 4);
      out.set((r[i * 4 + 2] - 0.5) * 4 + Math.sin(t * 0.9 + i) * 0.2, y, (r[i * 4 + 3] - 0.5) * 4 + Math.cos(t * 0.7 + i) * 0.2);
    },
  },
  rain: {
    count: 220,
    tex: () => sprite(streak, 64),
    material: { size: 0.2, opacity: 0.55, blending: THREE.NormalBlending, color: 0xb4c8e6 },
    at(i, t, r, out) {
      const fall = 7 + r[i * 4] * 2.5;
      const y = 4 - ((t * fall + r[i * 4 + 1] * 4) % 4);
      out.set((r[i * 4 + 2] - 0.5) * 4, y, (r[i * 4 + 3] - 0.5) * 4);
    },
  },
  confetti: {
    count: 120,
    tex: () => sprite(chip, 32),
    material: { size: 0.09, opacity: 1, blending: THREE.NormalBlending, color: 0xffffff },
    at(i, t, r, out) {
      const fall = 0.55 + r[i * 4] * 0.45;
      const y = 3.6 - ((t * fall + r[i * 4 + 1] * 3.6) % 3.6);
      out.set((r[i * 4 + 2] - 0.5) * 3 + Math.sin(t * 2.2 + i) * 0.3, y, (r[i * 4 + 3] - 0.5) * 3 + Math.cos(t * 1.8 + i) * 0.2);
    },
    look(i, t, r, c) {
      const col = CONFETTI[Math.floor(r[i * 4 + 3] * CONFETTI.length) % CONFETTI.length];
      c.r = col[0];
      c.g = col[1];
      c.b = col[2];
      c.s = 0.45 + 0.55 * Math.abs(Math.sin(t * (4 + r[i * 4] * 4) + i)); // tumbling
    },
  },
  dust: {
    count: 80,
    tex: () => sprite(radial([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.5)"], [1, "rgba(0,0,0,0)"]]), 32),
    material: { size: 0.06, opacity: 1, blending: THREE.AdditiveBlending, color: 0xffd27a },
    at(i, t, r, out) {
      const ph = life01(t, r[i * 4], 2.5, 2);
      const a = r[i * 4 + 1] * Math.PI * 2 + ph * 5;
      const rad = 0.25 + r[i * 4 + 2] * 0.5 + ph * 0.3;
      out.set(Math.cos(a) * rad, ph * 2.4, Math.sin(a) * rad);
    },
    look(i, t, r, c) {
      const ph = life01(t, r[i * 4], 2.5, 2);
      c.a = Math.sin(ph * Math.PI) * (0.4 + 0.6 * Math.abs(Math.sin(t * 7 + i * 3)));
    },
  },
};

function seeded(seed, n) {
  let s = seed >>> 0;
  return Float32Array.from({ length: n }, () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), s | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  });
}

function Effect({ effect }) {
  const kind = KINDS[effect.type];
  const { geometry, material, rand } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(kind.count * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(kind.count * 4).fill(1), 4));
    g.setAttribute("aScale", new THREE.BufferAttribute(new Float32Array(kind.count).fill(1), 1));
    const m = new THREE.PointsMaterial({ ...kind.material, map: kind.tex(), transparent: true, depthWrite: false, sizeAttenuation: true, vertexColors: true });
    // per-particle size (aScale); alpha rides on the RGBA vertex colour
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aScale;")
        .replace("gl_PointSize = size;", "gl_PointSize = size * aScale;");
    };
    m.customProgramCacheKey = () => "sos-fx-points";
    const seed = [...effect.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
    return { geometry: g, material: m, rand: seeded(seed, kind.count * 4) };
  }, [kind, effect.id]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material]
  );
  const clock = useRef(0);
  const v = useMemo(() => new THREE.Vector3(), []);
  const c = useMemo(() => ({}), []);
  useFrame((_, dt) => {
    clock.current += Math.min(dt, 0.1);
    const { position: pos, color: col, aScale } = geometry.attributes;
    for (let i = 0; i < kind.count; i++) {
      kind.at(i, clock.current, rand, v);
      pos.setXYZ(i, v.x * effect.size, v.y * effect.size, v.z * effect.size);
      if (kind.look) {
        c.r = c.g = c.b = c.a = c.s = 1;
        kind.look(i, clock.current, rand, c);
        col.setXYZW(i, c.r, c.g, c.b, Math.max(0, c.a));
        aScale.setX(i, c.s);
      }
    }
    pos.needsUpdate = true;
    if (kind.look) col.needsUpdate = aScale.needsUpdate = true;
    if (effect.type === "bats") material.size = kind.material.size * effect.size * (0.8 + 0.25 * Math.abs(Math.sin(clock.current * 9)));
    else material.size = kind.material.size * (kind.linear || effect.type === "fog" ? effect.size : Math.sqrt(effect.size));
  });
  return <points geometry={geometry} material={material} position={effect.position} frustumCulled={false} />;
}

export default function EffectsLayer() {
  const { effects } = useSyncExternalStore(effectsStore.subscribe, effectsStore.getSnapshot, effectsStore.getSnapshot);
  return (
    <>
      {effects.map((e) => (
        <Effect key={e.id} effect={e} />
      ))}
    </>
  );
}
