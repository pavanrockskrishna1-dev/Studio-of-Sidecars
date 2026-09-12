import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PRODUCTS } from "../products/registry";
import { ENVIRONMENTS } from "../environments/registry";

const FOV = 45;

function StudioStage({ product, environment }) {
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
  return (
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
      <StudioStage key={product.id} product={product} environment={environment} />
    </Canvas>
  );
}
