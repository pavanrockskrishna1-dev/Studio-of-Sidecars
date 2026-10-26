import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const FIRE_COUNT = 130;
const EMBER_COUNT = 50;
const COAL_COUNT  = 60; // glowing coal-bed layer visible from above

// Canvas-painted billboard textures — no external assets needed.
function makeFireSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(32, 40, 1, 32, 40, 30);
  g.addColorStop(0.0, "rgba(255,255,200,1.0)");
  g.addColorStop(0.2, "rgba(255,160,20,0.9)");
  g.addColorStop(0.5, "rgba(255,60,0,0.5)");
  g.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeCoalSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
  g.addColorStop(0,   "rgba(255,120,10,1)");
  g.addColorStop(0.4, "rgba(200,40,0,0.7)");
  g.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeEmberSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 7);
  g.addColorStop(0, "rgba(255,220,80,1)");
  g.addColorStop(0.6, "rgba(255,80,0,0.5)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Initialise per-particle state buffers.
function initFire() {
  const pos = new Float32Array(FIRE_COUNT * 3);
  const vel = new Float32Array(FIRE_COUNT * 3); // vx, vy, vz
  const phase = new Float32Array(FIRE_COUNT);   // life phase [0,1]
  const life = new Float32Array(FIRE_COUNT);    // individual life span in seconds
  const W = 0.28; // grill width (m)
  const D = 0.18; // grill depth (m)
  for (let i = 0; i < FIRE_COUNT; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * W;
    pos[i * 3 + 1] = Math.random() * 0.35;
    pos[i * 3 + 2] = (Math.random() - 0.5) * D;
    vel[i * 3]     = (Math.random() - 0.5) * 0.04;
    vel[i * 3 + 1] = 0.25 + Math.random() * 0.45;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
    phase[i]       = Math.random();
    life[i]        = 0.5 + Math.random() * 0.9;
  }
  return { pos, vel, phase, life };
}

// Coal-bed particles sit nearly flat on the grate, pulsing gently.
function initCoals() {
  const pos   = new Float32Array(COAL_COUNT * 3);
  const phase = new Float32Array(COAL_COUNT);
  const W = 0.26;
  const D = 0.17;
  for (let i = 0; i < COAL_COUNT; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * W;
    pos[i * 3 + 1] = -0.02 + Math.random() * 0.02; // just below / at grate level
    pos[i * 3 + 2] = (Math.random() - 0.5) * D;
    phase[i]       = Math.random() * Math.PI * 2;
  }
  return { pos, phase };
}

function initEmbers() {
  const pos = new Float32Array(EMBER_COUNT * 3);
  const vel = new Float32Array(EMBER_COUNT * 3);
  const phase = new Float32Array(EMBER_COUNT);
  const life = new Float32Array(EMBER_COUNT);
  const W = 0.2;
  const D = 0.14;
  for (let i = 0; i < EMBER_COUNT; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * W;
    pos[i * 3 + 1] = Math.random() * 0.6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * D;
    vel[i * 3]     = (Math.random() - 0.5) * 0.08;
    vel[i * 3 + 1] = 0.15 + Math.random() * 0.3;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
    phase[i]       = Math.random();
    life[i]        = 1.0 + Math.random() * 2.0;
  }
  return { pos, vel, phase, life };
}

// Find the TOP-SURFACE world position of Grill_Grate.
// Uses the bounding box max-Y so the fire spawns at the cooking surface,
// not at the mesh pivot (which may be at the bottom or centre of the node).
function grillWorldPos(modelScene) {
  if (!modelScene) return new THREE.Vector3(0, 0.85, 0);
  const grate = modelScene.getObjectByName("Grill_Grate");
  if (grate) {
    modelScene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(grate);
    if (!box.isEmpty()) {
      return new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        box.max.y,
        (box.min.z + box.max.z) / 2
      );
    }
    grate.updateWorldMatrix(true, false);
    return new THREE.Vector3().setFromMatrixPosition(grate.matrixWorld);
  }
  return new THREE.Vector3(0, 0.85, 0);
}

export default function FireRig({ modelScene }) {
  const fireRef  = useRef(null);
  const emberRef = useRef(null);
  const coalRef  = useRef(null);
  const l1Ref    = useRef(null);
  const l2Ref    = useRef(null);
  const l3Ref    = useRef(null);
  const l4Ref    = useRef(null); // interior coal glow light
  const clockRef = useRef(0);

  const grillPos = useMemo(() => grillWorldPos(modelScene), [modelScene]);

  const fireState  = useMemo(initFire, []);
  const emberState = useMemo(initEmbers, []);
  const coalState  = useMemo(initCoals, []);

  const fireTex  = useMemo(makeFireSprite, []);
  const emberTex = useMemo(makeEmberSprite, []);
  const coalTex  = useMemo(makeCoalSprite, []);

  // Sizes for fire Points
  const fireSizes = useMemo(() => {
    const arr = new Float32Array(FIRE_COUNT);
    for (let i = 0; i < FIRE_COUNT; i++) arr[i] = 0.06 + Math.random() * 0.10;
    return arr;
  }, []);

  // Coal geometry — positions pulsed every frame
  const coalGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(coalState.pos.slice(), 3));
    return geo;
  }, [coalState]);

  // Fire geometry — positions updated every frame
  const fireGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(fireState.pos.slice(), 3));
    geo.setAttribute("size", new THREE.BufferAttribute(fireSizes, 1));
    return geo;
  }, [fireState, fireSizes]);

  const emberGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(emberState.pos.slice(), 3));
    return geo;
  }, [emberState]);

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      fireTex.dispose();
      emberTex.dispose();
      coalTex.dispose();
    };
  }, [fireTex, emberTex, coalTex]);

  useFrame((_, dt) => {
    clockRef.current += dt;
    const t = clockRef.current;

    // ---- fire particles ----
    const fp = fireGeo.attributes.position;
    const { pos: fPos, vel: fVel, phase: fPhase, life: fLife } = fireState;
    const W = 0.28; const D = 0.18;

    for (let i = 0; i < FIRE_COUNT; i++) {
      fPhase[i] += dt / fLife[i];
      if (fPhase[i] >= 1) {
        // respawn at base
        fPos[i * 3]     = (Math.random() - 0.5) * W;
        fPos[i * 3 + 1] = 0;
        fPos[i * 3 + 2] = (Math.random() - 0.5) * D;
        fVel[i * 3]     = (Math.random() - 0.5) * 0.04;
        fVel[i * 3 + 1] = 0.25 + Math.random() * 0.45;
        fVel[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
        fLife[i]        = 0.5 + Math.random() * 0.9;
        fPhase[i]       = 0;
      }
      const ph = fPhase[i];
      // Slight sway
      fPos[i * 3]     += fVel[i * 3] * dt + Math.sin(t * 3.5 + i) * 0.0006;
      fPos[i * 3 + 1] += fVel[i * 3 + 1] * dt;
      fPos[i * 3 + 2] += fVel[i * 3 + 2] * dt;
      fp.array[i * 3]     = fPos[i * 3];
      fp.array[i * 3 + 1] = fPos[i * 3 + 1];
      fp.array[i * 3 + 2] = fPos[i * 3 + 2];
    }
    fp.needsUpdate = true;

    // ---- ember particles ----
    const ep = emberGeo.attributes.position;
    const { pos: ePos, vel: eVel, phase: ePh, life: eLife } = emberState;
    const EW = 0.2; const ED = 0.14;

    for (let i = 0; i < EMBER_COUNT; i++) {
      ePh[i] += dt / eLife[i];
      if (ePh[i] >= 1) {
        ePos[i * 3]     = (Math.random() - 0.5) * EW;
        ePos[i * 3 + 1] = 0;
        ePos[i * 3 + 2] = (Math.random() - 0.5) * ED;
        eVel[i * 3]     = (Math.random() - 0.5) * 0.08;
        eVel[i * 3 + 1] = 0.15 + Math.random() * 0.3;
        eVel[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
        eLife[i]        = 1.0 + Math.random() * 2.0;
        ePh[i]          = 0;
      }
      ePos[i * 3]     += eVel[i * 3] * dt + Math.sin(t * 5 + i * 0.7) * 0.001;
      ePos[i * 3 + 1] += eVel[i * 3 + 1] * dt;
      ePos[i * 3 + 2] += eVel[i * 3 + 2] * dt;
      ep.array[i * 3]     = ePos[i * 3];
      ep.array[i * 3 + 1] = ePos[i * 3 + 1];
      ep.array[i * 3 + 2] = ePos[i * 3 + 2];
    }
    ep.needsUpdate = true;

    // ---- coal-bed pulse ----
    const cp = coalRef.current?.geometry?.attributes?.position;
    if (cp) {
      const { pos: cPos, phase: cPh } = coalState;
      for (let i = 0; i < COAL_COUNT; i++) {
        // Very slow upward drift + gentle bob
        cPos[i * 3 + 1] = -0.02 + Math.sin(t * 1.4 + cPh[i]) * 0.006;
        cp.array[i * 3]     = cPos[i * 3];
        cp.array[i * 3 + 1] = cPos[i * 3 + 1];
        cp.array[i * 3 + 2] = cPos[i * 3 + 2];
      }
      cp.needsUpdate = true;
    }

    // Coal interior light — pulses slowly beneath the grate level
    if (l4Ref.current) {
      l4Ref.current.intensity = 2.2 + Math.sin(t * 3.1) * 0.8 + Math.sin(t * 1.7 + 0.5) * 0.4;
    }

    // ---- flicker lights ----
    // Primary orange underlight — positioned at the grill grate level
    if (l1Ref.current) {
      l1Ref.current.intensity = 3.5 + Math.sin(t * 11.3) * 1.2 + Math.sin(t * 7.1) * 0.6;
    }
    // Secondary fill — slight offset, different flicker
    if (l2Ref.current) {
      l2Ref.current.intensity = 1.8 + Math.sin(t * 9.7 + 1.2) * 0.9 + Math.sin(t * 5.3) * 0.4;
    }
    // Warm kick from the side (sidecar direction)
    if (l3Ref.current) {
      l3Ref.current.intensity = 1.2 + Math.sin(t * 13.1 + 0.7) * 0.5;
    }
  });

  const origin = grillPos;

  return (
    <group position={[origin.x, origin.y, origin.z]}>
      {/* Fire particles */}
      <points ref={fireRef} geometry={fireGeo} frustumCulled={false}>
        <pointsMaterial
          map={fireTex}
          size={0.12}
          sizeAttenuation
          vertexColors={false}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={0xff8820}
          toneMapped={false}
        />
      </points>

      {/* Ember particles */}
      <points ref={emberRef} geometry={emberGeo} frustumCulled={false}>
        <pointsMaterial
          map={emberTex}
          size={0.04}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={0xffcc40}
          toneMapped={false}
        />
      </points>

      {/* Coal-bed layer — visible when looking down into the open grill */}
      <points ref={coalRef} geometry={coalGeo} frustumCulled={false}>
        <pointsMaterial
          map={coalTex}
          size={0.09}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={0xff3300}
          toneMapped={false}
        />
      </points>

      {/* Interior coal glow light — illuminates the inside of the grill */}
      <pointLight
        ref={l4Ref}
        color={0xff2200}
        intensity={2.2}
        distance={0.9}
        decay={2}
        position={[0, -0.04, 0]}
        castShadow={false}
      />

      {/* Flickering point lights for BBQ atmosphere */}
      <pointLight
        ref={l1Ref}
        color={0xff6010}
        intensity={3.5}
        distance={2.8}
        decay={2}
        position={[0, 0.15, 0]}
        castShadow={false}
      />
      <pointLight
        ref={l2Ref}
        color={0xff4400}
        intensity={1.8}
        distance={2.0}
        decay={2}
        position={[0.15, 0.3, 0.05]}
        castShadow={false}
      />
      <pointLight
        ref={l3Ref}
        color={0xff9000}
        intensity={1.2}
        distance={1.6}
        decay={2}
        position={[-0.1, 0.35, -0.08]}
        castShadow={false}
      />
    </group>
  );
}
