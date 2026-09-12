import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function Stage() {
  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={2} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

    {/* Coffee Bike Model */}
<primitive object={useGLTF('/models/the_kop_refined.glb').scene} />
    </>
  );
}

export default function StudioCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 45 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "#050505",
        zIndex: 0,
      }}
    >
      <Stage />
      <OrbitControls autoRotate autoRotateSpeed={1} enableZoom />
    </Canvas>
  );
}