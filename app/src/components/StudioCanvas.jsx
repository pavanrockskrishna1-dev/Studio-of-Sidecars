import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const MODEL_PATH = "/models/the_kop_refined.glb";
const FOV = 45;

function StudioStage() {
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

  const { scene: modelScene } = useGLTF(MODEL_PATH);

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
    // 0.8 => model fills ~80% of frame
    const distance = Math.max(distV, distH) / 0.8;
    const footprintRadius = Math.hypot(size.x, size.z) / 2;
    return { center, size, distance, footprintRadius, floorY: box.min.y };
  }, [modelScene, gl]);

  useEffect(() => {
    // Product-shot angle: slightly below model center, pulled back toward the camera
    const dir = new THREE.Vector3(0.35, -0.1, 1).normalize();
    camera.position.copy(fit.center).addScaledVector(dir, fit.distance);
    camera.far = fit.distance * 10 + 10;
    camera.updateProjectionMatrix();
    camera.lookAt(fit.center);
    if (controlsRef.current) {
      controlsRef.current.target.copy(fit.center);
      controlsRef.current.update();
    }
  }, [fit, camera]);

  return (
    <>
      {/* Lighting: low ambient + key from front-above + warm fill from opposite side */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={2.5} />
      <directionalLight position={[-6, 2, -4]} intensity={1.0} color={0xffd2a1} />

      {/* Floor anchored to the model's actual base (was hardcoded at y=-1.2) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[fit.center.x, fit.floorY, fit.center.z]}
      >
        <circleGeometry args={[fit.footprintRadius * 1.4, 64]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Coffee Bike Model */}
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

export default function StudioCanvas() {
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
      <StudioStage />
    </Canvas>
  );
}