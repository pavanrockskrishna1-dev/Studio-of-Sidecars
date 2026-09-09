/* ENGINE · controls.js — Phase 3. Orbit/pan/zoom/dolly with design-system easings. */
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function init(engine) {
  const c = new OrbitControls(engine.camera, engine.canvas);
  c.enableDamping = true;
  c.dampingFactor = 0.09;
  c.minDistance = 0.35;
  c.maxDistance = 60;
  c.maxPolarAngle = Math.PI * 0.92;
  c.minPolarAngle = 0.04;
  c.zoomSpeed = 1.1;
  c.panSpeed = 1.0;
  c.target.set(0, 0.8, 0);
  engine.controls = c;

  c.addEventListener('start', () => { engine.ui && engine.ui.setOrbiting(true); });
  c.addEventListener('end', () => { engine.ui && engine.ui.setOrbiting(false); });
  return c;
}

export function frameRadius(engine) {
  const b = engine.bounds || { center: { x: 0, y: 0.8, z: 0 }, radius: 2.2 };
  return Math.max(b.radius, 1.2);
}

export function reset(engine) {
  engine.controls.reset();
  engine.controls.update();
}
