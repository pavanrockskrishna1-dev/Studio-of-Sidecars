import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { useSyncExternalStore } from "react";
import * as THREE from "three";
import * as animeModeStore from "./animeModeStore.js";

const PALETTES = {
  ink: [0x333333, 0x787878, 0xbebebe, 0xf2f2f2],
  warm: [0x4a3728, 0xc47a3c, 0xe8b87d, 0xfff0d0],
  cool: [0x1a1f3a, 0x3d4a8c, 0x7a8fcc, 0xc8d4f0],
};

function makeToonGradient(palette = "ink") {
  const stops = PALETTES[palette] || PALETTES.ink;
  const px = new Uint8Array(16);
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Color(stops[i]);
    px[i * 4] = Math.round(c.r * 255);
    px[i * 4 + 1] = Math.round(c.g * 255);
    px[i * 4 + 2] = Math.round(c.b * 255);
    px[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, 4, 1);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export default function AnimeOverlay() {
  const { scene } = useThree();
  const { anime, toonPalette } = useSyncExternalStore(animeModeStore.subscribe, animeModeStore.getSnapshot, animeModeStore.getSnapshot);
  const savedMatsRef = useRef(new Map()); // uuid → original material
  const outlineMeshesRef = useRef([]);    // THREE.Mesh[] of outline shells to remove
  const gradientRef = useRef(null);

  useEffect(() => {
    if (!anime) return;

    // Rebuild the gradient each time so a palette change takes effect.
    if (gradientRef.current) gradientRef.current.dispose();
    gradientRef.current = makeToonGradient(toonPalette);
    const gradient = gradientRef.current;

    const meshes = [];
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      if (obj.userData.isAnimeOutline) return;
      const mat = obj.material;
      if (!mat) return;
      if (Array.isArray(mat) ? mat.some(m => m.side === THREE.BackSide) : mat.side === THREE.BackSide) return;
      meshes.push(obj);
    });

    for (const mesh of meshes) {
      const origMat = mesh.material;
      savedMatsRef.current.set(mesh.uuid, origMat);

      const makeToon = (src) => {
        const color = src.color ? src.color.clone() : new THREE.Color(0xcccccc);
        return new THREE.MeshToonMaterial({ color, gradientMap: gradient });
      };
      mesh.material = Array.isArray(origMat) ? origMat.map(makeToon) : makeToon(origMat);

      const outlineMesh = new THREE.Mesh(
        mesh.geometry,
        new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide })
      );
      outlineMesh.userData.isAnimeOutline = true;
      outlineMesh.raycast = () => {};
      outlineMesh.position.copy(mesh.position);
      outlineMesh.rotation.copy(mesh.rotation);
      outlineMesh.quaternion.copy(mesh.quaternion);
      outlineMesh.scale.copy(mesh.scale).multiplyScalar(1.055);
      mesh.parent?.add(outlineMesh);
      outlineMeshesRef.current.push(outlineMesh);
    }

    return () => {
      scene.traverse((obj) => {
        if (!obj.isMesh || obj.userData.isAnimeOutline) return;
        const orig = savedMatsRef.current.get(obj.uuid);
        if (!orig) return;
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
        obj.material = orig;
      });
      savedMatsRef.current.clear();

      for (const om of outlineMeshesRef.current) {
        om.removeFromParent();
        om.material.dispose();
      }
      outlineMeshesRef.current = [];

      if (gradientRef.current) {
        gradientRef.current.dispose();
        gradientRef.current = null;
      }
    };
  }, [anime, scene, toonPalette]);

  return null;
}
