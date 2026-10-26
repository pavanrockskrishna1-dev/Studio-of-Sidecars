import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import * as lookStore from "./lookStore";
import * as animation from "../animation/animationStore";
import GroundSurface from "./GroundSurface";

// The "day" stage look: an outdoor daylight stage in the same spirit as
// NightStage - its own sky, a wide ground the props stand on (the
// selectable surface - grass by default - is the same GroundSurface the
// night stage uses), a warm sun throwing clear shadows, a cool sky fill.
// No backdrop photo or HDRI; the bike's metal and paint still reflect the
// sky through the canvas's own studio environment probe (StudioCanvas's
// EnvironmentLighting - a RoomEnvironment PMREM generated in code, not a
// loaded HDR file), just turned up brighter than the night stage leaves it.

function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#2f7fd6"); // deep sky blue overhead
  g.addColorStop(0.45, "#6fb3ec");
  g.addColorStop(0.75, "#bfe0f5"); // hazy toward the horizon
  g.addColorStop(1, "#eef6f2"); // bright horizon haze
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function DayStage({ floorY = 0, center, ground = "grass" }) {
  const scene = useThree((s) => s.scene);
  const sky = useMemo(skyTexture, []);

  useEffect(() => {
    const prevBg = scene.background;
    const prevEnv = scene.environmentIntensity;
    const prevFog = scene.fog;
    scene.background = sky;
    scene.environmentIntensity = 1; // full brightness: crisp reflections on the bike's paint and chrome
    // a light haze fades the ground and far props toward the horizon colour
    // near the edge of the ground disc, so its texture tiling is never obvious
    scene.fog = new THREE.Fog(0xcfe6f0, 18, 40);
    return () => {
      if (scene.background === sky) scene.background = prevBg;
      scene.environmentIntensity = prevEnv ?? 1;
      scene.fog = prevFog ?? null;
    };
  }, [scene, sky]);

  useEffect(() => () => sky.dispose(), [sky]);

  // Smooth mode: a lighter 1024 sun shadow map while editing; exports always get 2048.
  const smooth = useSyncExternalStore(lookStore.subscribe, lookStore.getSnapshot, lookStore.getSnapshot).smooth;
  const exporting = useSyncExternalStore(animation.subscribe, animation.getSnapshot, animation.getSnapshot).mode === "exporting";
  const mapSize = smooth && !exporting ? 1024 : 2048;
  const sun = useRef(null);
  useEffect(() => {
    const l = sun.current;
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
      {/* sky blue from above, warm ground bounce from below */}
      <hemisphereLight args={[0xaee3ff, 0xd9c9a0, 1.2]} />
      {/* the sun: high front-side, warm and bright, the only shadow caster
          (one shadow-casting light keeps this cheap on a slow laptop) */}
      <directionalLight
        ref={sun}
        position={[cx + 6, floorY + 10, cz + 4]}
        intensity={3.2}
        color={0xfff0d2}
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
      {/* cool sky fill from the opposite side, softening the shadow side */}
      <directionalLight position={[cx - 5, floorY + 5, cz - 5]} intensity={0.9} color={0xbfe0ff} />
      {/* a touch of warm bounce from the ground, in front */}
      <directionalLight position={[cx, floorY + 2, cz + 6]} intensity={0.5} color={0xffe9c2} />
      <GroundSurface surface={ground} floorY={floorY} center={center} radius={40} />
    </>
  );
}
