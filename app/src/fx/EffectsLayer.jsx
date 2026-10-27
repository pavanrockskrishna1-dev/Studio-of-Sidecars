import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as effectsStore from "./effectsStore";

/* The placed 3D effects (effectsStore.js). Almost every one is a point-sprite
   system driven by the frame clock, so the export (which steps every frame
   effect by one export frame) renders them exactly like the live view. The one
   exception is "Snow ground", a still mesh lying on the floor (SnowGround
   below). Everything is in world space; positions are each effect's ground
   point. */

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
const heartShape = (ctx, s) => {
  ctx.translate(s / 2, s * 0.56);
  ctx.scale(s / 100, s / 100);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.bezierCurveTo(-44, -2, -30, -42, 0, -18);
  ctx.bezierCurveTo(30, -42, 44, -2, 0, 30);
  ctx.fill();
};
const CONFETTI = [[1, 0.25, 0.35], [1, 0.8, 0.15], [0.2, 0.75, 1], [0.45, 1, 0.4], [0.85, 0.4, 1], [1, 0.55, 0.15]];
const TRICOLOUR = [[1, 0.6, 0.1], [1, 1, 1], [0.07, 0.6, 0.25]]; // saffron, white, India green
const POWDER = [[1, 0.25, 0.5], [1, 0.82, 0.15], [0.25, 0.75, 1], [0.35, 0.9, 0.4], [0.8, 0.3, 1], [1, 0.5, 0.1]];
// 0..1 through a looping lifetime of min + r * span seconds
const life01 = (t, r, min, span) => {
  const life = min + r * span;
  return ((t + r * 7.3 * life) % life) / life;
};

// Confetti chips: one kind per palette. The sprite, the count and the tumbling
// fall are the same; only the colours the chips are picked from differ.
const confettiKind = (palette) => ({
  count: 120,
  tex: () => sprite(chip, 32),
  material: { size: 0.09, opacity: 1, blending: THREE.NormalBlending, color: 0xffffff },
  at(i, t, r, out) {
    const fall = 0.55 + r[i * 4] * 0.45;
    const y = 3.6 - ((t * fall + r[i * 4 + 1] * 3.6) % 3.6);
    out.set((r[i * 4 + 2] - 0.5) * 3 + Math.sin(t * 2.2 + i) * 0.3, y, (r[i * 4 + 3] - 0.5) * 3 + Math.cos(t * 1.8 + i) * 0.2);
  },
  look(i, t, r, c) {
    const col = palette[Math.floor(r[i * 4 + 3] * palette.length) % palette.length];
    c.r = col[0];
    c.g = col[1];
    c.b = col[2];
    c.s = 0.45 + 0.55 * Math.abs(Math.sin(t * (4 + r[i * 4] * 4) + i)); // tumbling
  },
});

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
  confetti: confettiKind(CONFETTI),
  tricolor: confettiKind(TRICOLOUR),
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
  powder: {
    count: 70,
    linear: true,
    tex: () => sprite(radial([[0, "rgba(255,255,255,0.95)"], [0.5, "rgba(255,255,255,0.4)"], [1, "rgba(255,255,255,0)"]]), 128),
    material: { size: 0.75, opacity: 0.9, blending: THREE.NormalBlending, color: 0xffffff },
    at(i, t, r, out) {
      // a puff that bursts outwards and upwards, then fades
      const ph = life01(t, r[i * 4], 2.6, 1.8);
      const a = r[i * 4 + 1] * Math.PI * 2;
      const rad = 0.2 + r[i * 4 + 2] * 0.5 + ph * 1.4;
      out.set(Math.cos(a) * rad, 0.15 + ph * (1.1 + r[i * 4 + 3] * 0.9), Math.sin(a) * rad);
    },
    look(i, t, r, c) {
      const col = POWDER[Math.floor(r[i * 4 + 2] * POWDER.length) % POWDER.length];
      c.r = col[0];
      c.g = col[1];
      c.b = col[2];
      const ph = life01(t, r[i * 4], 2.6, 1.8);
      c.s = 0.4 + ph * 1.5;
      c.a = Math.sin(ph * Math.PI) * 0.85;
    },
  },
  hearts: {
    count: 28,
    tex: () => sprite(heartShape, 64),
    material: { size: 0.22, opacity: 1, blending: THREE.NormalBlending, color: 0xff6b8a },
    at(i, t, r, out) {
      const ph = life01(t, r[i * 4], 4, 2.5);
      const a = r[i * 4 + 1] * Math.PI * 2;
      const rad = 0.25 + r[i * 4 + 2] * 0.7;
      out.set(Math.cos(a) * rad + Math.sin(t * 0.8 + i) * 0.18, 0.3 + ph * 2.2, Math.sin(a) * rad + Math.cos(t * 0.6 + i) * 0.15);
    },
    look(i, t, r, c) {
      const ph = life01(t, r[i * 4], 4, 2.5);
      c.a = Math.sin(ph * Math.PI) * 0.95;
      c.s = 0.75 + 0.35 * Math.abs(Math.sin(t * 1.4 + i)); // a soft beat
      c.g = 0.6 + 0.4 * r[i * 4 + 3];
    },
  },
  flame: {
    count: 60,
    linear: true,
    tex: () => sprite(radial([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,220,50,0.85)"], [0.65, "rgba(255,70,5,0.45)"], [1, "rgba(0,0,0,0)"]]), 64),
    material: { size: 0.32, opacity: 1, blending: THREE.AdditiveBlending, color: 0xff6010 },
    at(i, t, r, out) {
      const ph = life01(t, r[i * 4], 0.55, 0.45);
      const a = r[i * 4 + 1] * Math.PI * 2;
      const rad = 0.07 + (1 - ph) * r[i * 4 + 2] * 0.16;
      out.set(Math.cos(a) * rad + Math.sin(t * 9 + i) * 0.025 * ph, 0.04 + ph * 0.75, Math.sin(a) * rad + Math.cos(t * 7 + i) * 0.025 * ph);
    },
    look(i, t, r, c) {
      const ph = life01(t, r[i * 4], 0.55, 0.45);
      c.s = 1.6 - ph * 0.9;
      c.a = (1 - ph * ph) * 0.92;
      c.g = 0.48 - ph * 0.32;
      c.b = 0.02;
    },
  },
  steam: {
    count: 22,
    linear: true,
    tex: () => sprite(radial([[0, "rgba(255,255,255,0.55)"], [0.5, "rgba(255,255,255,0.2)"], [1, "rgba(255,255,255,0)"]]), 128),
    material: { size: 0.5, opacity: 0.42, blending: THREE.NormalBlending, color: 0xe8ecf4 },
    at(i, t, r, out) {
      const ph = life01(t, r[i * 4], 1.8, 1.4);
      const drift = Math.sin(t * 0.5 + i * 1.1) * 0.14 * ph;
      out.set((r[i * 4 + 1] - 0.5) * 0.12 + drift, 0.25 + ph * 1.9, (r[i * 4 + 2] - 0.5) * 0.12);
    },
    look(i, t, r, c) {
      const ph = life01(t, r[i * 4], 1.8, 1.4);
      c.s = 0.38 + ph * 1.5;
      c.a = Math.sin(ph * Math.PI) * 0.52;
    },
  },
  petals: {
    count: 45,
    tex: () => sprite((ctx, s) => {
      ctx.translate(s / 2, s / 2);
      ctx.fillStyle = "#ffb7c5";
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.18, s * 0.19, s * 0.3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,220,228,0.5)";
      ctx.beginPath();
      ctx.ellipse(s * 0.04, -s * 0.15, s * 0.1, s * 0.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }, 48),
    material: { size: 0.11, opacity: 0.9, blending: THREE.NormalBlending, color: 0xffffff },
    at(i, t, r, out) {
      const fall = 0.22 + r[i * 4] * 0.28;
      const y = 3.6 - ((t * fall + r[i * 4 + 1] * 3.6) % 3.6);
      out.set((r[i * 4 + 2] - 0.5) * 3.8 + Math.sin(t * 0.85 + i) * 0.45, y, (r[i * 4 + 3] - 0.5) * 3.8 + Math.cos(t * 0.65 + i) * 0.32);
    },
    look(i, t, r, c) {
      c.r = 1; c.g = 0.72 + 0.15 * r[i * 4 + 1]; c.b = 0.78 + 0.12 * r[i * 4 + 2];
      c.s = 0.75 + 0.45 * Math.abs(Math.sin(t * 1.3 + i));
    },
  },
  stars: {
    count: 90,
    tex: () => sprite(radial([[0, "rgba(255,255,255,1)"], [0.22, "rgba(255,255,255,0.55)"], [1, "rgba(0,0,0,0)"]]), 32),
    material: { size: 0.04, opacity: 1, blending: THREE.AdditiveBlending, color: 0xffffff },
    at(i, t, r, out) {
      const a = r[i * 4] * Math.PI * 2;
      const el = 0.12 + r[i * 4 + 1] * 0.68;
      const rad = 4.5 + r[i * 4 + 2] * 3.5;
      out.set(Math.cos(a) * rad * Math.cos(el * Math.PI / 2), rad * Math.sin(el * Math.PI / 2) + 0.5, Math.sin(a) * rad * Math.cos(el * Math.PI / 2));
    },
    look(i, t, r, c) {
      const tw = 0.5 + 0.5 * Math.sin(t * (1.4 + r[i * 4 + 3] * 3.2) + r[i * 4] * 20);
      c.a = 0.18 + 0.82 * tw * tw;
      c.s = 0.5 + 0.75 * tw;
      if (r[i * 4 + 1] > 0.55) { c.r = 1; c.g = 0.88; c.b = 0.68; }
      else { c.r = 0.78; c.g = 0.88; c.b = 1; }
    },
  },
  lanterns: {
    count: 8,
    linear: true,
    tex: () => sprite(radial([[0, "rgba(255,200,80,1)"], [0.45, "rgba(255,110,10,0.65)"], [1, "rgba(0,0,0,0)"]]), 64),
    material: { size: 0.55, opacity: 0.88, blending: THREE.AdditiveBlending, color: 0xff8820 },
    at(i, t, r, out) {
      const speed = 0.11 + r[i * 4] * 0.09;
      const y = (t * speed + r[i * 4 + 1] * 5.5) % 5.5;
      const sway = Math.sin(t * 0.45 + i * 1.25) * 0.32;
      out.set((r[i * 4 + 2] - 0.5) * 3.2 + sway, 0.4 + y, (r[i * 4 + 3] - 0.5) * 3.2);
    },
    look(i, t, r, c) {
      const speed = 0.11 + r[i * 4] * 0.09;
      const y = (t * speed + r[i * 4 + 1] * 5.5) % 5.5;
      const fadeTop = y > 4.5 ? (5.5 - y) : 1;
      c.a = (0.65 + 0.35 * Math.sin(t * 2.3 + i)) * fadeTop;
      c.s = 0.68 + 0.38 * Math.sin(t * 1.7 + i);
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

/* ---------------------------- the one still effect ---------------------------- */

/* "Snow ground": a blanket of snow lying on the floor, not falling snow. A flat
   lit mesh (so moonlight and the studio lights shape it), a few mm above the
   floor and with a polygon offset so it never flickers against it. The patch is
   an irregular round blanket about 5 m across at size 1, with ragged edges that
   fade out, a faint uneven surface and a couple of low mounds near the rim.
   Nothing moves, so the live view and the export match on their own. */
const SNOW_R = 2.5; // the patch's radius in metres at size 1
const SNOW_LIFT = 0.004; // metres above the floor
const MOUNDS = [[0.55, 0.6, 0.38], [-0.66, 0.26, 0.34], [0.12, -0.68, 0.3]]; // x, z, radius in patch units

// white with a faint blue tint, unevenly blotchy: the colour and the bump
const snowSurface = (ctx, s) => {
  ctx.fillStyle = "#eef2fb";
  ctx.fillRect(0, 0, s, s);
  const rand = seeded(20251226, 512);
  for (let i = 0; i < 128; i++) {
    const x = rand[i * 4] * s;
    const y = rand[i * 4 + 1] * s;
    const rad = s * (0.02 + rand[i * 4 + 2] * 0.09);
    const light = rand[i * 4 + 3] > 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, light ? "rgba(255,255,255,0.75)" : "rgba(203,214,236,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
};

// the patch's shape: an irregular disc drawn in shrinking passes, so its edge
// is ragged and fades out instead of ending on a line
const snowShape = (ctx, s) => {
  const c = s / 2;
  const passes = 26;
  const lobes = (a) => 1 + 0.12 * Math.sin(a * 3 + 0.7) + 0.08 * Math.sin(a * 5 + 2.1) + 0.05 * Math.sin(a * 9 + 4.3);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(255,255,255,${1 / passes})`;
  for (let p = 0; p < passes; p++) {
    const k = 0.7 + (0.3 * p) / (passes - 1);
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const rad = c * 0.76 * k * lobes(a);
      const x = c + Math.cos(a) * rad;
      const y = c + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.fill();
  }
};

// the two canvas textures, built once and shared by every patch
let snowTex = null;
function snowTextures() {
  if (!snowTex) {
    const shape = sprite(snowShape, 512);
    shape.colorSpace = THREE.NoColorSpace; // a mask, not a colour
    snowTex = { surface: sprite(snowSurface, 512), shape };
  }
  return snowTex;
}

function SnowGround({ effect }) {
  const { geometry, material, spin } = useMemo(() => {
    const g = new THREE.PlaneGeometry(SNOW_R * 2, SNOW_R * 2, 40, 40);
    // a few low soft mounds, so the blanket is not perfectly flat
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / SNOW_R;
      const v = pos.getY(i) / SNOW_R;
      let h = 0;
      for (const [mx, mz, mr] of MOUNDS) {
        const d = Math.hypot(u - mx, v - mz) / mr;
        h += 0.055 * Math.exp(-d * d);
      }
      pos.setZ(i, h);
    }
    g.computeVertexNormals();
    const { surface, shape } = snowTextures();
    const m = new THREE.MeshStandardMaterial({
      map: surface,
      bumpMap: surface,
      bumpScale: 0.2,
      alphaMap: shape,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      depthWrite: false, // so overlapping patches blend instead of cutting each other
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const seed = [...effect.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
    return { geometry: g, material: m, spin: seeded(seed, 1)[0] * Math.PI * 2 };
  }, [effect.id]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose(); // the textures are shared, so they are not disposed
    },
    [geometry, material]
  );
  const [x, y, z] = effect.position;
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[x, y + SNOW_LIFT, z]}
      rotation={[-Math.PI / 2, 0, spin]}
      scale={effect.size}
      frustumCulled={false}
    />
  );
}

/* ---------------------------- the particle effects ---------------------------- */

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
      {effects.map((e) =>
        e.type === "snowground" ? <SnowGround key={e.id} effect={e} /> : <Effect key={e.id} effect={e} />
      )}
    </>
  );
}
