import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import * as lookStore from "./lookStore";
import * as animation from "../animation/animationStore";

// The "night" stage look: its own sky, a wide soil ground the props stand on
// (it takes their shadows), cold moonlight from behind, a soft key on the
// product. No backdrop photo or HDRI. The moon itself is drawn by the occasion
// overlay (live and in the Reel export), so it is not repeated here.

function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#03050c");
  g.addColorStop(0.55, "#0a1230");
  g.addColorStop(0.8, "#141c3d");
  g.addColorStop(1, "#0b0f1f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function NightStage({ floorY = 0, center }) {
  const scene = useThree((s) => s.scene);
  const sky = useMemo(skyTexture, []);
  const ground = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.88, metalness: 0 }), []);

  useEffect(() => {
    const prevBg = scene.background;
    const prevEnv = scene.environmentIntensity;
    scene.background = sky;
    scene.environmentIntensity = 0.12; // the studio's HDRI/probe barely reaches a night set
    return () => {
      if (scene.background === sky) scene.background = prevBg;
      scene.environmentIntensity = prevEnv ?? 1;
    };
  }, [scene, sky]);

  useEffect(() => () => {
    sky.dispose();
    ground.dispose();
  }, [sky, ground]);

  // Smooth mode: a 1024 moon shadow map while editing; exports always get 2048.
  const smooth = useSyncExternalStore(lookStore.subscribe, lookStore.getSnapshot, lookStore.getSnapshot).smooth;
  const exporting = useSyncExternalStore(animation.subscribe, animation.getSnapshot, animation.getSnapshot).mode === "exporting";
  const mapSize = smooth && !exporting ? 1024 : 2048;
  const moon = useRef(null);
  useEffect(() => {
    const l = moon.current;
    if (!l || l.shadow.mapSize.x === mapSize) return;
    l.shadow.mapSize.set(mapSize, mapSize);
    if (l.shadow.map) {
      l.shadow.map.dispose();
      l.shadow.map = null; // re-created at the new size on the next render
    }
  }, [mapSize]);

  const cx = center ? center.x : 0;
  const cz = center ? center.z : 0;
  return (
    <>
      <hemisphereLight args={[0x7488dc, 0x14100c, 1.1]} />
      {/* moonlight from high behind: rims the set and throws long shadows forward */}
      <directionalLight
        ref={moon}
        position={[cx - 5, floorY + 9, cz - 9]}
        intensity={2.2}
        color={0xb3c4ff}
        castShadow
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* cold fill from the front-left, a soft moonlit key on the product from the front-right */}
      {/* cold rim from behind-right: outlines the bike and props against the dark */}
      <directionalLight position={[cx + 5, floorY + 4, cz - 6]} intensity={1.8} color={0xa8c0ff} />
      <directionalLight position={[cx - 4, floorY + 3, cz + 6]} intensity={0.9} color={0x6a80d8} />
      <directionalLight position={[cx + 4, floorY + 4, cz + 5]} intensity={1.8} color={0xd6dcff} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, floorY - 0.001, cz]} receiveShadow material={ground}>
        <circleGeometry args={[40, 96]} />
      </mesh>
    </>
  );
}
