import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { registerFx } from "./fxClock";
import * as garageStore from "../garage/garageStore";
import { FIREWORK, PALETTES, burstInfo, burstLocalTime, sparkPoint } from "./fireworkMath.js";

export const DIYA_POOL_GRADIENT = Object.freeze([
  { stop: 0, alpha: 0.35 },
  { stop: 0.55, alpha: 0.12 },
  { stop: 0.82, alpha: 0.04 },
  { stop: 1, alpha: 0 },
]);

export function seeded(seed, n) {
  let s = seed >>> 0;
  return Float32Array.from({ length: n }, () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), s | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  });
}

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

const streak = (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,250,215,1)");
  g.addColorStop(0.25, "rgba(255,190,80,0.8)");
  g.addColorStop(0.6, "rgba(255,120,20,0.18)");
  g.addColorStop(1, "rgba(255,80,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
};

function makeDiyaPoolTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  for (const { stop, alpha } of DIYA_POOL_GRADIENT) {
    g.addColorStop(stop, `rgba(255, 170, 80, ${alpha})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const diyasTex = () => sprite(radial([[0, "rgba(255,243,170,1)"], [0.15, "rgba(255,170,70,0.95)"], [0.6, "rgba(255,95,10,0.35)"], [1, "rgba(0,0,0,0)"]]), 96);
const diyaPoolTex = () => makeDiyaPoolTexture();
const BOKEH_STOPS = Object.freeze([
  [0, "rgba(255,235,170,0.55)"],
  [0.5, "rgba(255,190,90,0.3)"],
  [0.85, "rgba(255,150,40,0.12)"],
  [1, "rgba(255,120,20,0)"],
]);
const bokehTex = () => sprite(radial(BOKEH_STOPS), 192);
const sparkTex = () => sprite(streak, 64);

export const LOGOREVEAL_RING_MAX_RADIUS = 0.35 * 1.1;
export const LOGOREVEAL_EMBER_MAX_DISTANCE = 1.2;

function makeSoftRadialTexture(size, innerAlpha = 255, edgeAlpha = 0) {
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const d = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.max(0, 1 - d);
      const alpha = Math.max(0, falloff * falloff * falloff);
      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(alpha * innerAlpha + (1 - alpha) * edgeAlpha);
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSmokeTexture(size = 128) {
  return makeSoftRadialTexture(size, 180, 0);
}

export function getLogorevealRingPoint(i, t, rand, out = new THREE.Vector3()) {
  const cycle = ((t % 6) + 6) % 6;
  let phase = 0;
  if (cycle < 1.2) phase = cycle / 1.2;
  else if (cycle < 3.2) phase = 1;
  else if (cycle < 4.5) phase = 1 - (cycle - 3.2) / 1.3;

  const ringThickness = 0.04;
  const base = LOGOREVEAL_RING_MAX_RADIUS * (0.7 + 0.3 * phase);
  const angle = (i / 300) * Math.PI * 2 + rand[0] * 0.7;
  const radius = Math.min(LOGOREVEAL_RING_MAX_RADIUS, base + (rand[1] - 0.5) * ringThickness);
  const lift = (rand[2] - 0.5) * ringThickness * 0.35;
  out.set(Math.cos(angle) * radius, lift, Math.sin(angle) * radius);
  return out;
}

export function getLogorevealEmberPoint(i, t, rand, out = new THREE.Vector3()) {
  const cycle = ((t % 6) + 6) % 6;
  let burst = 0;
  if (cycle < 1.5) burst = cycle / 1.5;
  else if (cycle < 3.5) burst = 1 - (cycle - 1.5) / 2;

  const angle = rand[0] * Math.PI * 2 + (i / 200) * Math.PI * 2;
  const radius = Math.min(LOGOREVEAL_EMBER_MAX_DISTANCE, (0.12 + rand[1] * 0.94) * (0.2 + burst * 1.1));
  const rise = 0.08 + burst * 0.8 + rand[2] * 0.55;
  out.set(Math.cos(angle) * radius, rise, Math.sin(angle) * radius);
  return out;
}

const PREMIUM_KINDS = {
  diyas: {
    count: 12,
    bounds: { radius: 1.1, height: 0.6 },
    tex: diyasTex,
    material: { size: 0.18, opacity: 0.9, blending: THREE.AdditiveBlending, color: 0xffc978 },
    at(i, t, r, out) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const drift = Math.sin(t * 1.4 + i * 1.7) * 0.08;
      const lift = (0.06 + 0.04 * Math.sin(t * 4 + i * 2.3)) * (this.bounds?.height ?? 1);
      const spread = (col - 1.5) * 0.4 + drift;
      const depth = (row - 1.5) * 0.28 + Math.cos(t * 1.1 + i) * 0.06;
      out.set(spread * (this.bounds?.radius ?? 1), lift, depth * (this.bounds?.radius ?? 1));
    },
    look(i, t, r, c) {
      const flick = 0.7 + 0.3 * Math.sin(t * 5.5 + i * 1.9);
      c.r = 1;
      c.g = 0.8 + 0.2 * flick;
      c.b = 0.44 + 0.2 * Math.sin(t * 3.2 + i * 2.1);
      c.a = 0.35 + 0.65 * flick;
      c.s = 0.8 + 0.7 * flick;
    },
  },
  bokeh: {
    count: 24,
    bounds: { radius: 0.8, height: 1 },
    tex: bokehTex,
    material: { size: 0.45, opacity: 0.85, blending: THREE.AdditiveBlending, color: 0xffd27a },
    at(i, t, r, out) {
      const angle = r[i * 4] * Math.PI * 2 + t * 0.12;
      const z = -(0.2 + r[i * 4 + 1] * 0.8);
      const x = Math.cos(angle) * (0.18 + r[i * 4 + 2] * 0.7);
      const y = 0.2 + r[i * 4 + 3] * 0.8 + Math.sin(t * 0.8 + i) * 0.08;
      out.set(x + Math.sin(t * 0.7 + i) * 0.06, y, z + Math.cos(t * 0.6 + i) * 0.08);
    },
    look(i, t, r, c) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 1.2 + i * 1.4);
      const amber = i % 5 === 0;
      c.r = 1;
      c.g = amber ? 0.72 : 0.84;
      c.b = amber ? 0.32 : 0.46;
      c.a = 0.35 + 0.4 * pulse;
      c.s = 0.8 + 0.7 * pulse;
    },
  },
  sparkshower: {
    count: 360,
    bounds: { radius: 0.6, height: 1.2 },
    tex: sparkTex,
    material: { size: 0.05, opacity: 1, blending: THREE.AdditiveBlending, color: 0xfff4c2 },
    at(i, t, r, out) {
      const life = 1.4 + r[i * 4] * 1.1;
      const ph = ((t + r[i * 4 + 1] * life) % life) / life;
      const arc = Math.sin(Math.PI * ph);
      const angle = r[i * 4 + 2] * Math.PI * 2;
      const spread = 0.6 * arc * (0.2 + 0.8 * r[i * 4 + 3]);
      out.set(Math.cos(angle) * spread, 1.2 * arc, Math.sin(angle) * spread);
    },
    look(i, t, r, c) {
      const life = 1.4 + r[i * 4] * 1.1;
      const ph = ((t + r[i * 4 + 1] * life) % life) / life;
      const fade = 1 - ph;
      c.r = 1;
      c.g = 0.9 - fade * 0.4;
      c.b = 0.45 - fade * 0.25;
      c.a = 0.35 + 0.65 * fade;
      c.s = 0.45 + 0.75 * fade;
    },
  },
};

function PremiumEffectMesh({ effect, kind }) {
  const { geometry, material, rand } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(kind.count * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(kind.count * 4).fill(1), 4));
    g.setAttribute("aScale", new THREE.BufferAttribute(new Float32Array(kind.count).fill(1), 1));
    const m = new THREE.PointsMaterial({
      ...kind.material,
      map: kind.tex(),
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
      vertexColors: true,
    });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aScale;");
      sh.vertexShader = sh.vertexShader.replace("gl_PointSize = size;", "gl_PointSize = size * aScale;");
    };
    m.customProgramCacheKey = () => "sos-premium-fx-points";
    const seed = [...effect.id].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
    return { geometry: g, material: m, rand: seeded(seed, kind.count * 4) };
  }, [effect.id, kind]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  const v = useMemo(() => new THREE.Vector3(), []);
  const c = useMemo(() => ({}), []);

  useEffect(() => registerFx((t) => {
    const { position: pos, color: col, aScale } = geometry.attributes;
    for (let i = 0; i < kind.count; i++) {
      kind.at(i, t, rand, v);
      pos.setXYZ(i, v.x * effect.size, v.y * effect.size, v.z * effect.size);
      if (kind.look) {
        c.r = c.g = c.b = c.a = c.s = 1;
        kind.look(i, t, rand, c);
        col.setXYZW(i, c.r, c.g, c.b, Math.max(0, c.a));
        aScale.setX(i, c.s);
      }
    }
    pos.needsUpdate = true;
    if (kind.look) col.needsUpdate = aScale.needsUpdate = true;
    material.size = kind.material.size * effect.size * (effect.type === "bokeh" ? (0.9 + 0.25 * Math.sin(t * 1.5)) : 1);
  }), [geometry, kind, effect.size, effect.type, material, rand, v, c]);

  return <points geometry={geometry} material={material} position={effect.position} frustumCulled={false} />;
}

function LogoRevealEffect({ effect }) {
  const groupRef = useRef(null);
  const ringGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(300 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(300 * 4), 4));
    return g;
  }, [effect.id]);
  const emberGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(200 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(200 * 4), 4));
    return g;
  }, [effect.id]);
  const smokeTexture = useMemo(() => createSmokeTexture(128), []);
  const smokeMats = useMemo(
    () => Array.from({ length: 10 }, () => new THREE.SpriteMaterial({
      map: smokeTexture,
      color: 0xbabfc8,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })),
    [smokeTexture]
  );
  const ringMaterial = useMemo(() => new THREE.PointsMaterial({
    map: sparkTex(),
    size: 0.088 * effect.size,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  }), [effect.size]);
  const emberMaterial = useMemo(() => new THREE.PointsMaterial({
    map: sparkTex(),
    size: 0.045 * effect.size,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  }), [effect.size]);
  const lightRef = useRef(null);
  const resetPoint = useMemo(() => new THREE.Vector3(), []);
  const randRing = useMemo(() => seeded([...effect.id].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7), 300 * 4), [effect.id]);
  const randEmbers = useMemo(() => seeded([...effect.id].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 9), 200 * 4), [effect.id]);
  const clock = useRef(0);

  useEffect(() => () => {
    ringGeometry.dispose();
    emberGeometry.dispose();
    ringMaterial.dispose();
    emberMaterial.dispose();
    smokeMats.forEach((m) => m.dispose());
    smokeTexture.dispose();
  }, [ringGeometry, emberGeometry, ringMaterial, emberMaterial, smokeMats, smokeTexture]);

  const { camera } = useThree();
  useEffect(() => registerFx((t) => {
    const elapsed = t;
    const centerY = effect.position[1] + 0.02 + LOGOREVEAL_RING_MAX_RADIUS * effect.size;
    if (groupRef.current) {
      groupRef.current.position.set(effect.position[0], centerY, effect.position[2]);
      groupRef.current.quaternion.copy(camera.quaternion);
    }

    const ringPos = ringGeometry.attributes.position;
    const ringCol = ringGeometry.attributes.color;
    for (let i = 0; i < 300; i++) {
      const idx = i * 4;
      const p = getLogorevealRingPoint(i, elapsed, randRing.subarray(idx, idx + 4), resetPoint);
      const radius = (LOGOREVEAL_RING_MAX_RADIUS - 0.02 + randRing[idx + 1] * 0.04) * effect.size;
      ringPos.setXYZ(i, Math.cos((i / 300) * Math.PI * 2 + randRing[idx] * 0.7) * radius, (randRing[idx + 2] - 0.5) * 0.04 * effect.size, Math.sin((i / 300) * Math.PI * 2 + randRing[idx] * 0.7) * radius);
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 10 + i * 0.22);
      const base = 0.55 + 0.45 * pulse;
      const alpha = 0.35 + 0.65 * base;
      ringCol.setXYZW(i, 1, 0.85 + 0.15 * base, 0.3 + 0.5 * base, alpha);
    }
    ringPos.needsUpdate = true;
    ringCol.needsUpdate = true;

    const emberPos = emberGeometry.attributes.position;
    const emberCol = emberGeometry.attributes.color;
    for (let i = 0; i < 200; i++) {
      const idx = i * 4;
      const p = getLogorevealEmberPoint(i, elapsed, randEmbers.subarray(idx, idx + 4), resetPoint);
      emberPos.setXYZ(i, p.x * effect.size, p.y * effect.size, p.z * effect.size);
      const life = 1 - Math.min(1, Math.max(0, ((elapsed % 6) - 1.5) / 3.5));
      emberCol.setXYZW(i, 1, 0.65 + 0.35 * life, 0.15 + 0.35 * life, 0.25 + 0.75 * Math.max(0, life));
    }
    emberPos.needsUpdate = true;
    emberCol.needsUpdate = true;

    ringMaterial.size = 0.12 * effect.size;
    emberMaterial.size = 0.045 * effect.size;

    const cycle = (elapsed % 6 + 6) % 6;
    const ringPulse = cycle < 1.2 ? cycle / 1.2 : cycle < 3.2 ? 1 : cycle < 4.5 ? 1 - (cycle - 3.2) / 1.3 : 0;
    ringMaterial.opacity = 0.2 + 0.8 * ringPulse;
    emberMaterial.opacity = 0.25 + 0.75 * Math.max(0, 1 - Math.abs(cycle - 1.5) / 2.5);

    if (lightRef.current) {
      const pulse = 0.2 + 1.2 * ringPulse;
      lightRef.current.intensity = pulse;
      lightRef.current.position.set(effect.position[0], effect.position[1] + 0.12, effect.position[2]);
    }

    smokeMats.forEach((material, idx) => {
      const sprite = material.userData.sprite;
      if (!sprite) return;
      const phase = (elapsed + idx * 0.35) % 6;
      let alpha = 0;
      if (phase >= 0.3 && phase <= 2.5) {
        const local = (phase - 0.3) / 2.2;
        alpha = 1 - local;
      }
      const angle = (idx / smokeMats.length) * Math.PI * 2;
      const radius = (0.1 + (idx / (smokeMats.length - 1)) * 0.35) * effect.size;
      const lift = 0.08 + Math.sin(elapsed * 1.6 + idx) * 0.04;
      material.opacity = Math.max(0, alpha) * 0.3;
      sprite.scale.setScalar(0.2 + (1 - alpha) * 0.7 + idx * 0.01);
      sprite.position.set(Math.cos(angle) * radius, lift, Math.sin(angle) * radius);
    });
  }), [camera, randRing, ringGeometry, emberGeometry, ringMaterial, emberMaterial, smokeMats, effect.size, effect.position, resetPoint]);

  return (
    <group ref={groupRef}>
      <points geometry={ringGeometry} material={ringMaterial} frustumCulled={false} />
      <points geometry={emberGeometry} material={emberMaterial} frustumCulled={false} />
      {smokeMats.map((material, idx) => (
        <sprite
          key={idx}
          material={material}
          position={[0, 0.05 + idx * 0.06, 0]}
          scale={[0.2, 0.2, 1]}
          ref={(node) => { if (node) material.userData.sprite = node; }}
        />
      ))}
      <pointLight ref={lightRef} color={0xffb160} intensity={0.8} distance={3.2} decay={2} castShadow={false} />
    </group>
  );
}

export function LogoRevealAttached({ item }) {
  const { scene } = useThree();
  const groupRef = useRef(null);
  const ringGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(300 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(300 * 4), 4));
    return g;
  }, [item.itemId]);
  const emberGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(200 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(200 * 4), 4));
    return g;
  }, [item.itemId]);
  const smokeTexture = useMemo(() => createSmokeTexture(128), []);
  const smokeMats = useMemo(
    () => Array.from({ length: 10 }, () => new THREE.SpriteMaterial({
      map: smokeTexture,
      color: 0xbabfc8,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })),
    [smokeTexture]
  );
  const ringMaterial = useMemo(() => new THREE.PointsMaterial({
    map: sparkTex(),
    size: 0.12,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  }), []);
  const emberMaterial = useMemo(() => new THREE.PointsMaterial({
    map: sparkTex(),
    size: 0.045,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  }), []);
  const lightRef = useRef(null);
  const resetPoint = useMemo(() => new THREE.Vector3(), []);
  const localScale = 0.0625 / LOGOREVEAL_RING_MAX_RADIUS;
  const randRing = useMemo(() => seeded([...item.itemId].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7), 300 * 4), [item.itemId]);
  const randEmbers = useMemo(() => seeded([...item.itemId].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 9), 200 * 4), [item.itemId]);
  const clock = useRef(0);

  useEffect(() => () => {
    ringGeometry.dispose();
    emberGeometry.dispose();
    ringMaterial.dispose();
    emberMaterial.dispose();
    smokeMats.forEach((m) => m.dispose());
    smokeTexture.dispose();
  }, [ringGeometry, emberGeometry, ringMaterial, emberMaterial, smokeMats, smokeTexture]);

  const { camera } = useThree();
  useEffect(() => registerFx((t) => {
    const group = groupRef.current;
    if (!group) return;

    const anchor = scene.getObjectByName(`garage-object:${item.itemId}`);
    if (anchor) {
      if (group.parent !== anchor) {
        if (group.parent) group.parent.remove(group);
        anchor.add(group);
      }
      group.visible = true;
    } else {
      if (group.parent) group.parent.remove(group);
      group.visible = false;
      return;
    }

    const elapsed = t;
    const parent = group.parent;
    if (parent && parent.matrixWorld) {
      const parentWorldQuat = new THREE.Quaternion().setFromRotationMatrix(parent.matrixWorld);
      const localQuat = parentWorldQuat.clone().invert().multiply(camera.quaternion);
      group.quaternion.copy(localQuat);
      const scaleFactor = parent.getWorldScale(new THREE.Vector3()).length();
      const worldScale = Math.max(0.0001, scaleFactor);
      ringMaterial.size = 0.12 * localScale * worldScale;
      emberMaterial.size = 0.045 * localScale * worldScale;
    }
    group.position.set(0, 0.05, 0);

    const ringPos = ringGeometry.attributes.position;
    const ringCol = ringGeometry.attributes.color;
    for (let i = 0; i < 300; i++) {
      const idx = i * 4;
      const p = getLogorevealRingPoint(i, elapsed, randRing.subarray(idx, idx + 4), resetPoint);
      const radius = (LOGOREVEAL_RING_MAX_RADIUS - 0.02 + randRing[idx + 1] * 0.04) * localScale;
      ringPos.setXYZ(i, Math.cos((i / 300) * Math.PI * 2 + randRing[idx] * 0.7) * radius, (randRing[idx + 2] - 0.5) * 0.04 * localScale, Math.sin((i / 300) * Math.PI * 2 + randRing[idx] * 0.7) * radius);
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 10 + i * 0.22);
      const base = 0.55 + 0.45 * pulse;
      const alpha = 0.35 + 0.65 * base;
      ringCol.setXYZW(i, 1, 0.85 + 0.15 * base, 0.3 + 0.5 * base, alpha);
      if (p) {
        ringPos.setXYZ(i, p.x * localScale, p.y * localScale, p.z * localScale);
      }
    }
    ringPos.needsUpdate = true;
    ringCol.needsUpdate = true;

    const emberPos = emberGeometry.attributes.position;
    const emberCol = emberGeometry.attributes.color;
    for (let i = 0; i < 200; i++) {
      const idx = i * 4;
      const p = getLogorevealEmberPoint(i, elapsed, randEmbers.subarray(idx, idx + 4), resetPoint);
      emberPos.setXYZ(i, p.x * localScale, p.y * localScale, p.z * localScale);
      const life = 1 - Math.min(1, Math.max(0, ((elapsed % 6) - 1.5) / 3.5));
      emberCol.setXYZW(i, 1, 0.65 + 0.35 * life, 0.15 + 0.35 * life, 0.25 + 0.75 * Math.max(0, life));
    }
    emberPos.needsUpdate = true;
    emberCol.needsUpdate = true;

    const cycle = (elapsed % 6 + 6) % 6;
    const ringPulse = cycle < 1.2 ? cycle / 1.2 : cycle < 3.2 ? 1 : cycle < 4.5 ? 1 - (cycle - 3.2) / 1.3 : 0;
    ringMaterial.opacity = 0.2 + 0.8 * ringPulse;
    emberMaterial.opacity = 0.25 + 0.75 * Math.max(0, 1 - Math.abs(cycle - 1.5) / 2.5);

    if (lightRef.current) {
      const pulse = 0.2 + 1.2 * ringPulse;
      lightRef.current.intensity = pulse;
    }

    smokeMats.forEach((material, idx) => {
      const sprite = material.userData.sprite;
      if (!sprite) return;
      const phase = (elapsed + idx * 0.35) % 6;
      let alpha = 0;
      if (phase >= 0.3 && phase <= 2.5) {
        const local = (phase - 0.3) / 2.2;
        alpha = 1 - local;
      }
      const angle = (idx / smokeMats.length) * Math.PI * 2;
      const radius = 0.1 + (idx / (smokeMats.length - 1)) * 0.35;
      const lift = 0.08 + Math.sin(elapsed * 1.6 + idx) * 0.04;
      const scaleFactor = group.parent ? Math.max(0.0001, group.parent.getWorldScale(new THREE.Vector3()).length()) : 1;
      material.opacity = Math.max(0, alpha) * 0.3;
      sprite.scale.setScalar((0.2 + (1 - alpha) * 0.7 + idx * 0.01) * scaleFactor);
      sprite.position.set(Math.cos(angle) * radius * localScale * scaleFactor, lift * localScale * scaleFactor, Math.sin(angle) * radius * localScale * scaleFactor);
    });
  }), [camera, randRing, ringGeometry, emberGeometry, ringMaterial, emberMaterial, smokeMats, localScale]);

  return (
    <group ref={groupRef} visible={false}>
      <points geometry={ringGeometry} material={ringMaterial} frustumCulled={false} />
      <points geometry={emberGeometry} material={emberMaterial} frustumCulled={false} />
      {smokeMats.map((material, idx) => (
        <sprite
          key={idx}
          material={material}
          position={[0, 0.05 + idx * 0.06, 0]}
          scale={[0.2, 0.2, 1]}
          ref={(node) => { if (node) material.userData.sprite = node; }}
        />
      ))}
      <pointLight ref={lightRef} color={0xffb160} intensity={0.8} distance={3.2} decay={2} castShadow={false} />
    </group>
  );
}

export function LogoRevealHost() {
  // Subscribe to the stable snapshot of the garage store (replaced only when something
  // changes) and derive the logo items from the layout inside useMemo. Returning a freshly
  // built array (or garageStore.getLayout(), which deep-copies) from getSnapshot makes
  // React loop forever and blanks the page.
  const snapshot = useSyncExternalStore(garageStore.subscribe, garageStore.getSnapshot, garageStore.getSnapshot);
  const items = useMemo(
    () => (garageStore.getLayout()?.items ?? []).filter((item) => !item.primary && item.assetId === "prop-bbqride-logo" && item.hidden !== true),
    [snapshot]
  );

  return (
    <>
      {items.map((item) => (
        <LogoRevealAttached key={item.itemId} item={item} />
      ))}
    </>
  );
}

function FireworksEffect({ effect }) {
  const burstSeed = useMemo(() => seeded([...effect.id].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7), FIREWORK.BURSTS * FIREWORK.SPARKS * 4), [effect.id]);
  const sparkGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FIREWORK.BURSTS * FIREWORK.SPARKS * FIREWORK.TRAIL * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(FIREWORK.BURSTS * FIREWORK.SPARKS * FIREWORK.TRAIL * 4), 4));
    return geo;
  }, [effect.id]);
  const flashGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FIREWORK.BURSTS * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(FIREWORK.BURSTS * 4), 4));
    return geo;
  }, [effect.id]);
  const sparkMaterial = useMemo(() => new THREE.PointsMaterial({
    map: sparkTex(),
    size: 0.12 * effect.size,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  }), [effect.size]);
  const flashMaterial = useMemo(() => new THREE.PointsMaterial({
    map: sparkTex(),
    size: 0.32 * effect.size,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  }), [effect.size]);
  const lightRef = useRef(null);
  const clock = useRef(0);
  const tmp = useMemo(() => ({ x: 0, y: 0, z: 0, alpha: 0, size: 0 }), []);
  const palette = useMemo(() => PALETTES, []);

  useEffect(
    () => () => {
      sparkGeometry.dispose();
      flashGeometry.dispose();
      sparkMaterial.map?.dispose();
      flashMaterial.map?.dispose();
      sparkMaterial.dispose();
      flashMaterial.dispose();
    },
    [flashGeometry, flashMaterial, sparkGeometry, sparkMaterial]
  );

  useEffect(() => registerFx((t) => {
    const elapsed = t;
    const sparkPos = sparkGeometry.attributes.position;
    const sparkCol = sparkGeometry.attributes.color;
    let index = 0;
    for (let b = 0; b < FIREWORK.BURSTS; b++) {
      const burst = burstInfo(b, Math.floor(elapsed / FIREWORK.CYCLE), burstSeed);
      const cyc = elapsed % FIREWORK.CYCLE;
      for (let i = 0; i < FIREWORK.SPARKS; i++) {
        for (let k = 0; k < FIREWORK.TRAIL; k++) {
          const trailBase = (cyc - burst.start + FIREWORK.CYCLE) % FIREWORK.CYCLE;
          const sampleT = trailBase - k * 0.05;
          if (sampleT < 0) continue;
          sparkPoint(b, i, sampleT, burstSeed, tmp);
          const rgba = palette[burst.hue];
          sparkPos.setXYZ(index, effect.position[0] + tmp.x * effect.size, effect.position[1] + tmp.y * effect.size, effect.position[2] + tmp.z * effect.size);
          sparkCol.setXYZW(index, rgba[0], rgba[1], rgba[2], Math.max(0, Math.min(1, tmp.alpha)));
          index += 1;
        }
      }
    }
    sparkPos.needsUpdate = true;
    sparkCol.needsUpdate = true;
    sparkMaterial.size = 0.09 * effect.size;

    const flashPos = flashGeometry.attributes.position;
    const flashCol = flashGeometry.attributes.color;
    for (let b = 0; b < FIREWORK.BURSTS; b++) {
      const burst = burstInfo(b, Math.floor(elapsed / FIREWORK.CYCLE), burstSeed);
      const cyc = elapsed % FIREWORK.CYCLE;
      const local = burstLocalTime(elapsed, b, burstSeed);
      const alpha = local < 0.12 && local >= 0 ? 1 - local / 0.12 : 0;
      const rgba = palette[burst.hue];
      flashPos.setXYZ(b, effect.position[0] + burst.x * effect.size, effect.position[1] + burst.y * effect.size, effect.position[2] + burst.z * effect.size);
      flashCol.setXYZW(b, rgba[0], rgba[1], rgba[2], alpha);
    }
    flashPos.needsUpdate = true;
    flashCol.needsUpdate = true;
    flashMaterial.size = 0.34 * effect.size;

    if (lightRef.current) {
      const pulse = 0.1 + Math.max(0, Math.sin(elapsed * 12)) * 0.5;
      lightRef.current.intensity = pulse;
      lightRef.current.position.set(effect.position[0], effect.position[1] + 0.2, effect.position[2]);
    }
  }), [sparkGeometry, sparkMaterial, flashGeometry, flashMaterial, burstSeed, effect.position, effect.size, palette, tmp]);

  return (
    <>
      <points geometry={sparkGeometry} material={sparkMaterial} frustumCulled={false} />
      <points geometry={flashGeometry} material={flashMaterial} frustumCulled={false} />
      <pointLight ref={lightRef} color={0xffb45a} intensity={0.2} distance={8} decay={2} castShadow={false} />
    </>
  );
}

export default function PremiumEffects({ effect }) {
  if (effect.type === "fireworks") return <FireworksEffect effect={effect} />;
  if (effect.type === "logoreveal") return <LogoRevealEffect effect={effect} />;

  const kind = PREMIUM_KINDS[effect.type];
  if (!kind) return null;

  const glow = useMemo(() => {
    if (effect.type !== "diyas") return null;
    const geometry = new THREE.CircleGeometry(0.8 * effect.size, 48);
    const material = new THREE.MeshBasicMaterial({
      map: diyaPoolTex(),
      color: 0xffa84d,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    return { geometry, material };
  }, [effect.size, effect.type]);

  useEffect(
    () => () => {
      if (glow) {
        glow.geometry.dispose();
        glow.material.map?.dispose();
        glow.material.dispose();
      }
    },
    [glow]
  );

  const glowRef = useRef(null);
  const lightRef = useRef(null);
  const pulseRef = useRef(0);

  useEffect(() => registerFx((t) => {
    if (!glowRef.current && !lightRef.current) return;
    const pulse = 1 + 0.04 * Math.sin(t * 2.2 + effect.position[0] * 2);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(pulse);
      glowRef.current.material.opacity = 0.14 + 0.05 * pulse;
    }
    if (lightRef.current && (effect.type === "diyas" || effect.type === "sparkshower")) {
      const flicker = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3.5 + effect.position[2] * 2.1));
      lightRef.current.intensity = flicker;
      lightRef.current.position.set(effect.position[0], effect.position[1] + 0.25, effect.position[2]);
    }
  }), [effect.position, effect.type]);

  useEffect(() => {
    if (effect.type !== "diyas" && effect.type !== "sparkshower") return undefined;
    return () => {
      if (lightRef.current && lightRef.current.parent) {
        lightRef.current.parent.remove(lightRef.current);
      }
    };
  }, [effect.type]);

  const showLight = effect.type === "diyas" || effect.type === "sparkshower";

  return (
    <>
      <PremiumEffectMesh effect={{ ...effect, position: [effect.position[0], effect.position[1] + 0.12, effect.position[2]] }} kind={kind} />
      {effect.type === "diyas" && glow && (
        <mesh
          ref={glowRef}
          geometry={glow.geometry}
          material={glow.material}
          position={[effect.position[0], 0.02, effect.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1.08, 1.08, 1]}
          frustumCulled={false}
        />
      )}
      {showLight && (
        <pointLight
          ref={lightRef}
          position={[effect.position[0], effect.position[1] + 0.25, effect.position[2]]}
          color={0xff9a3c}
          intensity={0.8}
          distance={6}
          decay={2}
          castShadow={false}
        />
      )}
    </>
  );
}
