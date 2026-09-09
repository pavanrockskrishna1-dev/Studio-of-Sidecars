import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows,
  useGLTF,
  Grid
} from '@react-three/drei'
import { useControls, folder } from 'leva'
import * as THREE from 'three'
import { AnimationControls } from './components/AnimationControls'
import { DownloadHelper } from './components/DownloadHelper'

// Model component
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  
  // Clone the scene to avoid issues with reusing the same geometry
  const clonedScene = scene.clone()
  
  return <primitive object={clonedScene} />
}

// Scene component
function Scene({ modelUrl, autoRotate }: { modelUrl: string; autoRotate: boolean }) {
  const {
    envPreset,
    showGrid,
    showShadows,
    backgroundColor,
    intensity,
    sunPosition,
  } = useControls({
    'Environment': folder({
      envPreset: {
        value: 'studio',
        options: ['sunset', 'dawn', 'night', 'warehouse', 'forest', 'apartment', 'studio', 'city', 'park', 'lobby'],
      },
      intensity: { value: 1, min: 0, max: 2, step: 0.1 },
    }),
    'Scene': folder({
      backgroundColor: '#1a1a1a',
      showGrid: false,
      showShadows: true,
    }),
    'Lighting': folder({
      sunPosition: { value: [10, 10, 10], step: 1 },
    }),
  })

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={sunPosition as [number, number, number]}
        intensity={intensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.3}
        penumbra={1}
        intensity={1}
        castShadow
      />

      {/* Environment */}
      <Environment preset={envPreset as any} />
      
      {/* Model */}
      {modelUrl && (
        <Suspense fallback={null}>
          <Model url={modelUrl} />
        </Suspense>
      )}

      {/* Shadows */}
      {showShadows && <ContactShadows opacity={0.5} scale={50} blur={1} far={10} resolution={256} color="#000000" />}
      
      {/* Grid */}
      {showGrid && <Grid args={[100, 100]} cellSize={1} cellThickness={0.5} />}

      {/* Camera Controls */}
      <OrbitControls 
        makeDefault 
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={50}
      />
      
      <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
    </>
  )
}

// File upload component
function FileUpload({ onFileLoad }: { onFileLoad: (url: string) => void }) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      onFileLoad(url)
    }
  }

  return (
    <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-white/10 shadow-2xl">
      <h2 className="text-white font-bold text-xl mb-3">BBQ Bike 3D Viewer</h2>
      <p className="text-gray-400 text-sm mb-4">Upload your .glb file to view</p>
      <label className="cursor-pointer block">
        <input
          type="file"
          accept=".glb,.gltf"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-center shadow-lg">
          Choose GLB File
        </div>
      </label>
    </div>
  )
}

// Instructions overlay
function Instructions() {
  const [show, setShow] = useState(true)

  if (!show) return null

  return (
    <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={() => setShow(false)}>
      <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/50 p-8 rounded-2xl max-w-2xl mx-4 shadow-2xl">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 mb-6">
          BBQ Bike 3D Showcase
        </h1>
        <div className="space-y-4 text-gray-300">
          <p className="text-lg">🚴 Professional 3D Model Viewer for your BBQ Bike Brand</p>
          
          <div className="bg-black/40 p-4 rounded-lg border border-orange-500/30">
            <h3 className="text-orange-400 font-semibold mb-2">📁 How to Use:</h3>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Click "Choose GLB File" and upload your BBQ bike .glb model</li>
              <li>Use your mouse to rotate, zoom, and pan the model</li>
              <li>Adjust lighting, environment, and effects using the panel on the right</li>
              <li>Capture screenshots for Instagram content</li>
            </ol>
          </div>

          <div className="bg-black/40 p-4 rounded-lg border border-orange-500/30">
            <h3 className="text-orange-400 font-semibold mb-2">🎮 Controls:</h3>
            <ul className="space-y-1 ml-2">
              <li><span className="text-orange-300">Left Mouse:</span> Rotate view</li>
              <li><span className="text-orange-300">Right Mouse:</span> Pan camera</li>
              <li><span className="text-orange-300">Scroll:</span> Zoom in/out</li>
            </ul>
          </div>

          <div className="bg-black/40 p-4 rounded-lg border border-orange-500/30">
            <h3 className="text-orange-400 font-semibold mb-2">✨ Features:</h3>
            <ul className="space-y-1 ml-2">
              <li>🎨 Multiple environment presets (studio, sunset, warehouse, etc.)</li>
              <li>💡 Adjustable lighting and shadows</li>
              <li>🎯 High-quality rendering for professional results</li>
              <li>📸 Perfect for creating Instagram content</li>
            </ul>
          </div>
        </div>
        
        <button
          onClick={() => setShow(false)}
          className="mt-6 w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [modelUrl, setModelUrl] = useState<string>('')
  const [autoRotate, setAutoRotate] = useState(false)

  const handleStartRotation = () => setAutoRotate(true)
  const handleStopRotation = () => setAutoRotate(false)
  const handleCapture = () => {
    alert('💡 Tip: Use your screen capture tool to record the view!\n\n- Windows: Win + G (Game Bar)\n- Mac: Cmd + Shift + 5\n- Or use screen recording software')
  }

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      <Instructions />
      <FileUpload onFileLoad={setModelUrl} />
      {modelUrl && (
        <AnimationControls
          onStartRotation={handleStartRotation}
          onStopRotation={handleStopRotation}
          onCapture={handleCapture}
        />
      )}
      
      {!modelUrl && (
        <>
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="text-center">
              <div className="text-8xl mb-4">🚴</div>
              <p className="text-gray-500 text-xl">Upload your BBQ Bike model to begin</p>
            </div>
          </div>
          <DownloadHelper />
        </>
      )}

      <Canvas
        shadows
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
        }}
        className="touch-none"
      >
        <Scene modelUrl={modelUrl} autoRotate={autoRotate} />
      </Canvas>

      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
        <p className="text-gray-400 text-sm">
          💡 Use the controls panel → to adjust environment, lighting & effects
        </p>
      </div>
    </div>
  )
}
