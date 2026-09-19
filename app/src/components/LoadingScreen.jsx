import { useProgress } from "@react-three/drei";
import "./LoadingScreen.css";

// Shown while the 3D model (GLB) and environment assets load. Driven by
// three's global LoadingManager via drei's useProgress, which useGLTF and the
// texture loaders report into, so it reflects the real load, not a timer.
// It works outside the <Canvas>, so App can mount it as a plain overlay.
//
// `total === 0` means no asset request has started yet (first paint, before
// the Canvas mounts and useGLTF begins fetching), so the screen is already up
// rather than flashing the empty stage first. Once loading finishes the
// overlay stays mounted and fades out via CSS, which keeps this stateless.
export default function LoadingScreen() {
  const { active, progress, total } = useProgress();
  const loading = active || total === 0;
  const pct = Math.round(progress);

  return (
    <div
      className="loading-screen"
      data-loading={loading}
      role="status"
      aria-live="polite"
      aria-hidden={!loading}
    >
      <div className="loading-screen__spinner" />
      <div className="loading-screen__label">Loading studio</div>
      <div className="loading-screen__bar">
        <div
          className="loading-screen__fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="loading-screen__pct">{pct}%</div>
    </div>
  );
}
