import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import * as lightsStore from "./lightsStore";
import * as lookStore from "./lookStore";

// RectAreaLight needs its shader uniforms initialised once before any
// instance renders (three.js's own requirement); done here, at module scope,
// so it happens exactly once regardless of how many area lights are placed.
RectAreaLightUniformsLib.init();

const HANDLE_NAME = "placed-light-handle";
const GIZMO_NAME = "placed-light-gizmo";
const HANDLE_RADIUS = 0.09;

// A spot light's direction is read from its `target` object, not its own
// rotation; a sibling object3D at local (0,-1,0) — inside the SAME group the
// light sits in — keeps it pointed straight down wherever the light is moved.
function PlacedSpotLight({ color, intensity, castShadow }) {
  const lightRef = useRef(null);
  const targetRef = useRef(null);
  useEffect(() => {
    if (lightRef.current && targetRef.current) lightRef.current.target = targetRef.current;
  }, []);
  return (
    <>
      <spotLight ref={lightRef} color={color} intensity={intensity} angle={0.55} penumbra={0.45} castShadow={castShadow} />
      <object3D ref={targetRef} position={[0, -1, 0]} />
    </>
  );
}

function LightFixture({ light, smooth }) {
  const { type, color, intensity } = light;
  if (type === "point") return <pointLight color={color} intensity={intensity} castShadow={!smooth} />;
  if (type === "spot") return <PlacedSpotLight color={color} intensity={intensity} castShadow={!smooth} />;
  // RectAreaLight has no shadow support in three.js, and shines along its own
  // local -Z; tipped down so it works as soft overhead/fill light.
  return <rectAreaLight color={color} intensity={intensity} width={2} height={2} rotation={[-Math.PI / 2, 0, 0]} />;
}

// Placeable Lights (fx/lightsStore.js): point, spot and area lights the owner
// drags into position in the view, the same way a placed prop is dragged.
// Each is a small group at its own x/y/z holding the real three.js light plus
// a coloured handle sphere (click to select it); the selected light gets its
// own translate-only gizmo — lights only move, they never rotate or scale, so
// this is a far smaller version of the Garage gizmo (StudioCanvas's own
// resolveTarget effect), written straight to lightsStore with no undo
// history, the same as an effect's size slider.
export default function PlacedLights({ controlsRef }) {
  const { lights } = useSyncExternalStore(lightsStore.subscribe, lightsStore.getSnapshot, lightsStore.getSnapshot);
  const smooth = useSyncExternalStore(lookStore.subscribe, lookStore.getSnapshot, lookStore.getSnapshot).smooth;
  const { camera, gl, scene } = useThree();
  const [selectedId, setSelectedId] = useState(null);
  const groupRefs = useRef(new Map());

  // A removed light can never stay "selected" (its gizmo would hang on a
  // detached group).
  useEffect(() => {
    if (selectedId && !lights.some((l) => l.id === selectedId)) setSelectedId(null);
  }, [lights, selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const obj = groupRefs.current.get(selectedId);
    if (!obj) return undefined;
    const tc = new TransformControls(camera, gl.domElement);
    tc.setMode("translate");
    const helper = tc.getHelper();
    helper.name = GIZMO_NAME;
    scene.add(helper);
    tc.attach(obj);
    const onDown = () => {
      if (controlsRef.current) controlsRef.current.enabled = false;
    };
    const onUp = () => {
      if (controlsRef.current) controlsRef.current.enabled = true;
      lightsStore.setLightPosition(selectedId, obj.position.x, obj.position.y, obj.position.z);
    };
    tc.addEventListener("mouseDown", onDown);
    tc.addEventListener("mouseUp", onUp);
    return () => {
      tc.removeEventListener("mouseDown", onDown);
      tc.removeEventListener("mouseUp", onUp);
      tc.detach();
      if (helper.parent) helper.parent.remove(helper);
      tc.dispose();
      if (controlsRef.current) controlsRef.current.enabled = true;
    };
  }, [selectedId, camera, gl, scene, controlsRef]);

  return (
    <>
      {lights.map((light) => (
        <group
          key={light.id}
          ref={(o) => {
            if (o) groupRefs.current.set(light.id, o);
            else groupRefs.current.delete(light.id);
          }}
          position={[light.x, light.y, light.z]}
        >
          <LightFixture light={light} smooth={smooth} />
          <mesh
            name={HANDLE_NAME}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(light.id);
            }}
          >
            <sphereGeometry args={[HANDLE_RADIUS, 16, 16]} />
            <meshBasicMaterial
              color={light.color}
              transparent
              opacity={light.id === selectedId ? 0.95 : 0.55}
              toneMapped={false}
              depthTest={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
