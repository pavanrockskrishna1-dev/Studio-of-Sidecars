import { useEffect, useSyncExternalStore } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import * as occasionStore from "../animation/occasionStore";

// Night mist for occasions that want it: thickens with distance over the props
// and floor (the backdrop photo is scene.background, which fog leaves alone).
// Rendered in the WebGL frame itself, so live view and Reel export both get it.
const FOGS = {
  // Reel cameras sit 6-10 m out: denser fog turns the whole set into a silhouette
  halloween: { color: 0x141a33, density: 0.018 },
};

export default function OccasionFog() {
  const { occasionId } = useSyncExternalStore(occasionStore.subscribe, occasionStore.getSnapshot, occasionStore.getSnapshot);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const spec = FOGS[occasionId];
    if (!spec) return undefined;
    const prev = scene.fog;
    scene.fog = new THREE.FogExp2(spec.color, spec.density);
    return () => {
      scene.fog = prev;
    };
  }, [occasionId, scene]);
  return null;
}
