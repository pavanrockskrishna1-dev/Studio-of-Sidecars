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

// Mission 6 (Transform Foundation) — the original transform reference. The
// transform layer is a wrapper group starting at identity, so identity is the
// exact original placement/rotation/scale of every model.
const DEFAULT_TRANSFORM = Object.freeze({
  x: 0,
  y: 0,
  z: 0,
  rx: 0, // degrees (Euler XYZ)
  ry: 0,
  rz: 0,
  s: 1, // uniform scale
});

const degToRad = THREE.MathUtils.degToRad;

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

// Build one inverted-hull shell per collected mesh, expressed in the transform
// group's LOCAL space so the outline follows the model when it is transformed.
// Shells SHARE the model's geometry (so geometry is never disposed here) but
// each owns a fresh material that the caller disposes when selection clears.
function buildOutlineShells(meshes, center, parent) {
  parent.updateWorldMatrix(true, false);
  const invParent = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const shells = [];

  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    m.copy(mesh.matrixWorld).premultiply(invParent);
    m.decompose(pos, quat, scale);
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
    shell.position.copy(center).addScaledVector(offset, OUTLINE_EXPAND);
    shell.quaternion.copy(quat);
    shell.scale.copy(scale).multiplyScalar(OUTLINE_EXPAND);
    shells.push(shell);
  }
  return shells;
}

function StudioStage({ product, environment, transform, selected, onSelect, onClear }) {
  const { scene, camera, gl } = useThree();
  const controlsRef = useRef(null);
  const transformRef = useRef(null);

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
  // while walking live children arrays), parented to the transform group so it
  // follows transforms, and fully disposed on clear/unmount.
  useEffect(() => {
    if (!selected) return undefined;
    const parent = transformRef.current;
    if (!parent) return undefined;
    const shells = buildOutlineShells(modelMeshes, fit.center, parent);
    const group = new THREE.Group();
    group.name = "selection-outline";
    group.add(...shells);
    parent.add(group);
    return () => {
      parent.remove(group);
      for (const shell of shells) {
        shell.material.dispose();
      }
      // Shell geometry is shared with the model — intentionally not disposed.
    };
  }, [selected, modelMeshes, fit.center]);

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
      // Refresh world matrices (incl. the transform group) so raycasts always
      // hit the model where it currently is, even right after a transform.
      modelScene.updateWorldMatrix(true, true);
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
  }, [gl, camera, modelMeshes, modelScene, product.name, fit.size, onSelect, onClear]);

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

      {/* Transform layer — applies only to the selected model's wrapper group.
          Identity === the model's exact original transform (reset reference). */}
      <group
        ref={transformRef}
        position={[transform.x, transform.y, transform.z]}
        rotation={[degToRad(transform.rx), degToRad(transform.ry), degToRad(transform.rz)]}
        scale={[transform.s, transform.s, transform.s]}
      >
        <primitive object={modelScene} />
      </group>

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
  const [transform, setTransform] = useState({ ...DEFAULT_TRANSFORM });
  const [selectionProductId, setSelectionProductId] = useState(product.id);

  // Reset selection AND transform state in the same render pass as a product
  // switch, so nothing leaks from one model to another and the inspector never
  // flashes stale data onto the incoming model.
  if (selectionProductId !== product.id) {
    setSelectionProductId(product.id);
    setSelection(null);
    setTransform({ ...DEFAULT_TRANSFORM });
  }

  const handleSelect = useCallback((info) => setSelection(info), []);
  // Clearing selection leaves the model where it is — it must not corrupt or
  // unexpectedly modify the current transform.
  const handleClear = useCallback(() => setSelection(null), []);
  const handleTransformChange = useCallback(
    (patch) => setTransform((prev) => ({ ...prev, ...patch })),
    []
  );
  const handleResetTransform = useCallback(
    () => setTransform({ ...DEFAULT_TRANSFORM }),
    []
  );

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
          transform={transform}
          selected={selection !== null}
          onSelect={handleSelect}
          onClear={handleClear}
        />
      </Canvas>
      {selection && (
        <SelectionInspector
          name={selection.name}
          size={selection.size}
          transform={transform}
          onTransformChange={handleTransformChange}
          onResetTransform={handleResetTransform}
          onClear={handleClear}
        />
      )}
    </>
  );
}
