import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Smoke puffs, embers and a flickering glow rising from the BBQ Bike's grate.

function makeSprite(size, stops) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2 - 1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// count particles spawning over a W x D patch; rise = [min, extra] m/s; life = [min, extra] s
function makeSystem(count, rise, life, spread) {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const age = new Float32Array(count);
  const maxAge = new Float32Array(count);
  const respawn = (i, randomAge) => {
    pos[i * 3] = (Math.random() - 0.5) * 0.3;
    pos[i * 3 + 1] = -0.02 + Math.random() * 0.04;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    vel[i * 3] = (Math.random() - 0.5) * spread;
    vel[i * 3 + 1] = rise[0] + Math.random() * rise[1];
    vel[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.7;
    maxAge[i] = life[0] + Math.random() * life[1];
    age[i] = randomAge ? Math.random() * maxAge[i] : 0;
  };
  for (let i = 0; i < count; i++) respawn(i, true);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return { pos, vel, age, maxAge, respawn, geometry, count };
}

function step(sys, dt, gravity) {
  for (let i = 0; i < sys.count; i++) {
    sys.age[i] += dt;
    if (sys.age[i] >= sys.maxAge[i]) {
      sys.respawn(i, false);
      continue;
    }
    sys.vel[i * 3 + 1] -= dt * gravity;
    sys.pos[i * 3] += sys.vel[i * 3] * dt;
    sys.pos[i * 3 + 1] += sys.vel[i * 3 + 1] * dt;
    sys.pos[i * 3 + 2] += sys.vel[i * 3 + 2] * dt;
  }
  sys.geometry.attributes.position.needsUpdate = true;
}

export default function BbqFx({ grateWorldPos }) {
  const smoke = useMemo(() => makeSystem(60, [0.15, 0.25], [1.5, 1.5], 0.06), []);
  const embers = useMemo(() => makeSystem(12, [0.3, 0.3], [1, 1], 0.08), []);
  const smokeTex = useMemo(() => makeSprite(32, [[0, "rgba(200,200,220,1)"], [0.5, "rgba(150,150,180,0.7)"], [1, "rgba(0,0,0,0)"]]), []);
  const emberTex = useMemo(() => makeSprite(16, [[0, "rgba(255,160,0,1)"], [0.7, "rgba(255,80,0,0.6)"], [1, "rgba(0,0,0,0)"]]), []);
  const light = useRef();
  const clock = useRef(0);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    clock.current += d;
    step(smoke, d, 0.02);
    step(embers, d, 0.04);
    if (light.current) {
      const t = clock.current;
      light.current.intensity = 0.6 + Math.sin(t * 3.1) * 0.4 + Math.sin(t * 1.7) * 0.2;
    }
  });

  useEffect(
    () => () => {
      smoke.geometry.dispose();
      embers.geometry.dispose();
      smokeTex.dispose();
      emberTex.dispose();
    },
    [smoke, embers, smokeTex, emberTex]
  );

  const p = grateWorldPos ?? new THREE.Vector3();
  return (
    <group position={[p.x, p.y, p.z]}>
      <points geometry={smoke.geometry} frustumCulled={false}>
        <pointsMaterial map={smokeTex} size={0.08} sizeAttenuation transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} color={0xccccff} toneMapped={false} />
      </points>
      <points geometry={embers.geometry} frustumCulled={false}>
        <pointsMaterial map={emberTex} size={0.03} sizeAttenuation transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} color={0xff8000} toneMapped={false} />
      </points>
      <pointLight ref={light} color="#ff6600" intensity={1} distance={0.9} position={[0, 0.05, 0]} />
    </group>
  );
}
