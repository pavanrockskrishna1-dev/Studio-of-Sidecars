import { useEffect, useMemo } from "react";
import * as THREE from "three";
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
export default function GroundSurface({ surface, floorY = 0, center, radius = 40 }) {
  const def = GROUND_SURFACES[surface] || GROUND_SURFACES.soil;
  const set = def.textured ? groundTextureSet(surface) : null;

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
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, floorY - 0.001, cz]} receiveShadow material={material}>
      <circleGeometry args={[radius, 96]} />
    </mesh>
  );
}
