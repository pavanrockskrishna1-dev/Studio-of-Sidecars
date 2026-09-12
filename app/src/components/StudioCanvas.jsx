import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PRODUCTS } from "../products/registry";
import { ENVIRONMENTS } from "../environments/registry";
import SelectionInspector from "./SelectionInspector";

const FOV = 45;

// Mission 5 — model selection tuning.
const SELECT_COLOR = 0xd9a441; // warm gold
const OUTLINE_OPACITY = 0.7; // premium rim, subtle but legible
const OUTLINE_EXPAND = 1.015; // thin inverted-hull silhouette
const RING_OPACITY = 0.95;
const CLICK_MOVE_TOLERANCE = 5; // px — below this a pointerup reads as a click

// Collect every visible mesh into a plain array FIRST. Never create outline
// shells while iterating a live Object3D.children array — that traversal bug
// (mutating the scene graph mid-iteration) was the previous implementation's
// crash source.
function collectModelMeshes(root) {
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.visible && obj.geometry) meshes.push(obj);
  });
  return meshes;
}

// Build one inverted-hull shell per collected mesh. Shells SHARE the model's
// geometry (so geometry is never disposed here) but each owns a fresh material
// that the caller disposes when selection clears. Expanding about the model's
// bounding-box center keeps the whole silhouette concentric.
function buildOutlineShells(meshes, center) {
  const expand = OUTLINE_EXPAND;
  const shells = [];
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const offset = new THREE.Vector3();

  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    mesh.matrixWorld.decompose(pos, quat, scale);
    offset.copy(pos).sub(center);
    const shell = new THREE.Mesh(
      mesh.geometry,
      new THREE.MeshBasicMaterial({
        color: SELECT_COLOR,
        side: THREE.BackSide,
        transparent: true,
        opacity: OUTLINE_OPACITY,
        depthWrite: true,
        toneMapped: false,
      })
    );
    shell.position.copy(center).addScaledVector(offset, expand);
    shell.quaternion.copy(quat);
    shell.scale.copy(scale).multiplyScalar(expand);
    shells.push(shell);
  }
  return shells;
}

function StudioStage({ product, environment, selected, onSelect, onClear }) {
  const { scene, camera, gl } = useThree();
  const controlsRef = useRef(null);

  // Local PBR environment (RoomEnvironment via PMREM — no network, no HDR download)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    return () => {
      scene.environment = null;
      envRT.dispose();
      pmrem.dispose();
    };
  }, [scene, gl]);

  const { scene: modelScene } = useGLTF(product.modelPath);

  // Environment background — locked library rule: applying an environment
  // changes ONLY the background (lighting, camera, and model stay untouched).
  // The photographic backdrops contain their own display platform, so the
  // 3D floor disc is hidden while one is active (see <mesh visible=...>).
  useEffect(() => {
    let disposed = false;
    let texture = null;
    const loader = new THREE.TextureLoader();
    loader.load(environment.file, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      texture = tex;
      scene.background = tex;
    });
    return () => {
      disposed = true;
      if (texture) texture.dispose();
      scene.background = null;
    };
  }, [scene, environment]);

  // Deterministic framing: measure the loaded model, fit camera + floor to it
  const fit = useMemo(() => {
    modelScene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(modelScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;
    const vFov = (FOV * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    // Distance needed for box height AND rotating footprint diagonal to fit
    const distV = size.y / 2 / Math.tan(vFov / 2);
    const distH =
      Math.hypot(size.x, size.z) / 2 / Math.tan(hFov / 2);
    // 0.7 => model fills ~70% of frame: comfortable product framing with
    // clear space around it (incl. the top-right controls panel).
    const distance = Math.max(distV, distH) / 0.7;
    const footprintRadius = Math.hypot(size.x, size.z) / 2;
    return { center, size, distance, footprintRadius, floorY: box.min.y };
  }, [modelScene, gl]);

  useEffect(() => {
    // Product-shot angle: slightly below model center. The offset scales with
    // model HEIGHT (not camera distance) so it reads the same at any scale —
    // a hero angle for a bike, a level eye-line for an aircraft.
    const dy = -0.1 * fit.size.y;
    const horiz = Math.sqrt(fit.distance * fit.distance - dy * dy);
    const dirH = new THREE.Vector2(0.35, 1).normalize();
    camera.position.set(
      fit.center.x + dirH.x * horiz,
      fit.center.y + dy,
      fit.center.z + dirH.y * horiz
    );
    camera.far = fit.distance * 10 + 10;
    camera.updateProjectionMatrix();
    camera.lookAt(fit.center);
    if (controlsRef.current) {
      controlsRef.current.target.copy(fit.center);
      controlsRef.current.update();
    }
  }, [fit, camera]);

  // R3F's Suspense boundary hides previously-committed scenes via
  // hideInstance(), which writes visible=false onto the model object itself.
  // With loader-cached GLBs the object outlives its hiding instance (the
  // instance is deleted when the next product commits, so unhideInstance
  // never runs) — and the next mount of the same product resurrects a
  // silently hidden model. While this stage renders this product, assert
  // ownership of its visibility every frame (a one-shot effect is not
  // enough: the hide can land asynchronously after mount).
  useFrame(() => {
    if (!modelScene.visible) modelScene.visible = true;
  });

  // Raycast targets: the model's visible meshes, collected once per model.
  const modelMeshes = useMemo(() => {
    modelScene.updateMatrixWorld(true);
    return collectModelMeshes(modelScene);
  }, [modelScene]);

  // Selection outline — built imperatively from the collected mesh list (never
  // while walking live children arrays), and fully disposed on clear/unmount.
  useEffect(() => {
    if (!selected) return undefined;
    const shells = buildOutlineShells(modelMeshes, fit.center);
    const group = new THREE.Group();
    group.name = "selection-outline";
    group.add(...shells);
    scene.add(group);
    return () => {
      scene.remove(group);
      for (const shell of shells) {
        shell.material.dispose();
      }
      // Shell geometry is shared with the model — intentionally not disposed.
    };
  }, [selected, modelMeshes, fit.center, scene]);

  // Click-to-select / click-empty-to-clear with drag guards.
  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let downButton = -1;

    const onPointerDown = (e) => {
      downX = e.clientX;
      downY = e.clientY;
      downButton = e.button;
    };

    const onPointerUp = (e) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      // A genuine click selects. Drags (orbit/pan/zoom-pinch) must NOT select.
      const isClick =
        e.button === 0 &&
        downButton === 0 &&
        moved < CLICK_MOVE_TOLERANCE;
      if (!isClick) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(modelMeshes, false);
      if (hits.length > 0) {
        onSelect({
          name: product.name,
          size: { width: fit.size.x, height: fit.size.y, depth: fit.size.z },
        });
      } else {
        onClear();
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl, camera, modelMeshes, product.name, fit.size, onSelect, onClear]);

  return (
    <>
      {/* Lighting: low ambient + key from front-above + warm fill from opposite side */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={2.5} />
      <directionalLight position={[-6, 2, -4]} intensity={1.0} color={0xffd2a1} />

      {/* Floor anchored to the model's actual base (was hardcoded at y=-1.2).
          Hidden while a photographic environment is active — its backdrop
          already contains the circular display platform. */}
      <mesh
        visible={!environment.file}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[fit.center.x, fit.floorY, fit.center.z]}
      >
        <circleGeometry args={[fit.footprintRadius * 1.4, 64]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Selection ring — thin light/gold ring around the model footprint */}
      <mesh
        visible={selected}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[fit.center.x, fit.floorY + 0.006, fit.center.z]}
      >
        <ringGeometry
          args={[
            fit.footprintRadius * 0.97,
            fit.footprintRadius * 1.03,
            128,
          ]}
        />
        <meshBasicMaterial
          color={SELECT_COLOR}
          transparent
          opacity={RING_OPACITY}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Active product model */}
      <primitive object={modelScene} />

      <OrbitControls
        ref={controlsRef}
        autoRotate
        autoRotateSpeed={1}
        enableZoom
      />
    </>
  );
}

export default function StudioCanvas({
  product = PRODUCTS[0],
  environment = ENVIRONMENTS[0],
}) {
  const [selection, setSelection] = useState(null);
  const [selectionProductId, setSelectionProductId] = useState(product.id);

  // Reset selection in the same render pass as a product switch so the
  // inspector/outline never flash stale data onto the incoming model.
  if (selectionProductId !== product.id) {
    setSelectionProductId(product.id);
    setSelection(null);
  }

  const handleSelect = useCallback((info) => setSelection(info), []);
  const handleClear = useCallback(() => setSelection(null), []);

  return (
    <>
      <Canvas
        camera={{ fov: FOV, near: 0.1, far: 500, position: [0, 2, 5] }}
        style={{
          position: "fixed",
          inset: 0,
          background: "#050505",
          zIndex: 0,
        }}
      >
        {/* key=product.id: switching products remounts the stage cleanly */}
        <StudioStage
          key={product.id}
          product={product}
          environment={environment}
          selected={selection !== null}
          onSelect={handleSelect}
          onClear={handleClear}
        />
      </Canvas>
      {selection && (
        <SelectionInspector
          name={selection.name}
          size={selection.size}
          onClear={handleClear}
        />
      )}
    </>
  );
}
