import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { GROUND_SURFACES } from "./groundSurfaces";
import { groundTextureSet, setGroundRepeat } from "./groundTextures";

// The wide ground disc shared by the Day and Night stages (DayStage.jsx,
// NightStage.jsx): the bike and props stand on it and cast their shadows
// onto it. "soil" (the night stage's original ground, still the default
// there) is a plain dark material with no texture files; every other
// surface is a colour/normal/roughness photo texture (groundTextures.js),
// tiled at its believable real-world size for this disc's radius
// (groundSurfaces.js tileMeters). Distance fade so the tiling isn't obvious
// at the edge comes from the stage's own scene.fog, not from here.
// "fireglass": a black glass floor that mirrors the props, with an orange fire
// glow pooled around the middle of the set (soft radial, additive, a slow pulse).
function fireGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,170,60,1)");
  grad.addColorStop(0.25, "rgba(255,90,10,0.75)");
  grad.addColorStop(0.6, "rgba(190,35,0,0.28)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function FireGlass({ floorY, cx, cz, radius }) {
  const glow = useMemo(() => fireGlowTexture(), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 1 }), [glow]);
  useEffect(() => () => { glow.dispose(); mat.dispose(); }, [glow, mat]);
  useFrame(({ clock }) => { mat.opacity = 0.9 + Math.sin(clock.elapsedTime * 5.0) * 0.1; });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, floorY - 0.001, cz]} receiveShadow>
        <circleGeometry args={[radius, 96]} />
        <MeshReflectorMaterial color="#1a0805" metalness={0.9} roughness={0.35} mirror={0.9} blur={[300, 90]} mixBlur={1.2} mixStrength={2.2} resolution={512} depthScale={0.4} minDepthThreshold={0.6} maxDepthThreshold={1.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, floorY + 0.004, cz + 0.6]} material={mat} renderOrder={2}>
        <planeGeometry args={[18, 18]} />
      </mesh>
      <pointLight position={[cx, floorY + 0.7, cz + 1.0]} color="#ff6a1a" intensity={16} distance={10} decay={2} />
    </>
  );
}

export default function GroundSurface({ surface, floorY = 0, center, radius = 40 }) {
  const def = GROUND_SURFACES[surface] || GROUND_SURFACES.soil;
  const set = def.textured || def.procedural ? groundTextureSet(surface) : null;

  const material = useMemo(() => {
    if (!set) return new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.88, metalness: 0 });
    return new THREE.MeshStandardMaterial({ map: set.color, normalMap: set.normal, roughnessMap: set.roughness, roughness: 1, metalness: 0 });
    // the material only needs rebuilding when the surface (its maps) changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    if (set) setGroundRepeat(set, surface, radius);
  }, [set, surface, radius]);

  const cx = center ? center.x : 0;
  const cz = center ? center.z : 0;
  if (def.glossy) return <FireGlass floorY={floorY} cx={cx} cz={cz} radius={radius} />;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, floorY - 0.001, cz]} receiveShadow material={material}>
      <circleGeometry args={[radius, 96]} />
    </mesh>
  );
}
