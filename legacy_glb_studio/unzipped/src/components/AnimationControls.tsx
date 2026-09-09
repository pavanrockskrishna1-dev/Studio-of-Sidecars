import { useState } from 'react'

interface AnimationControlsProps {
  onStartRotation: () => void
  onStopRotation: () => void
  onCapture: () => void
}

export function AnimationControls({ onStartRotation, onStopRotation, onCapture }: AnimationControlsProps) {
  const [isRotating, setIsRotating] = useState(false)

  const handleRotationToggle = () => {
    if (isRotating) {
      onStopRotation()
    } else {
      onStartRotation()
    }
    setIsRotating(!isRotating)
  }

  return (
    <div className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-white/10 shadow-2xl space-y-2">
      <button
        onClick={handleRotationToggle}
        className={`w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
          isRotating
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
        }`}
      >
        {isRotating ? '⏸️ Stop Rotation' : '▶️ Auto Rotate'}
      </button>
      
      <button
        onClick={onCapture}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
      >
        📸 Capture View
      </button>
    </div>
  )
}
