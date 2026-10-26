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

// per type: particle count, sprite, look, and the motion of particle i at time t
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
    const m = new THREE.PointsMaterial({ ...kind.material, map: kind.tex(), transparent: true, depthWrite: false, sizeAttenuation: true });
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
  useFrame((_, dt) => {
    clock.current += Math.min(dt, 0.1);
    const pos = geometry.attributes.position;
    for (let i = 0; i < kind.count; i++) {
      kind.at(i, clock.current, rand, v);
      pos.setXYZ(i, v.x * effect.size, v.y * effect.size, v.z * effect.size);
    }
    pos.needsUpdate = true;
    if (effect.type === "bats") material.size = kind.material.size * effect.size * (0.8 + 0.25 * Math.abs(Math.sin(clock.current * 9)));
    else material.size = kind.material.size * (effect.type === "fog" ? effect.size : Math.sqrt(effect.size));
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
