/* ENGINE · camera.js — Phase 3. Perspective rig + cinematic preset framings. */
import * as THREE from 'three';
import { CAM_PRESETS } from './config.js';

export function init(engine) {
  const cam = new THREE.PerspectiveCamera(36, engine.cssW / engine.cssH || 16 / 10, 0.05, 300);
  cam.position.set(0, 1.6, 6);
  engine.camera = cam;
  engine.cameraMode = 'hero';
  engine.animCam = null; // {t,dur,from,to}
  return cam;
}

/* Smoothly tween to a spherical pose around the fitted target. */
export function setPreset(engine, label, { instant } = {}) {
  const P = CAM_PRESETS[label] || CAM_PRESETS['¾ hero'];
  engine.cameraMode = label;
  const b = engine.bounds || { center: new THREE.Vector3(0, 0.75, 0), radius: 2.2 };
  const r = b.radius;
  const dist = Math.max(P.dist * 0.72 * r, 2.4);
  const to = b.center.clone().add(new THREE.Vector3(0, r * 0.12, 0));
  const tgt = new THREE.Spherical(dist, Math.PI / 2 - P.el, P.az);
  const from = new THREE.Vector3().setFromSpherical(tgt).add(to);
  if (P.orbit) { startOrbit(engine); return; }
  stopOrbit(engine);
  if (instant) snap(engine, from, to);
  else tweenTo(engine, from, to, 0.62, label);
  if (engine.controls) engine.controls.target.copy(to);
  if (engine.bus) engine.bus.emit('camera', label);
}

function tweenTo(engine, pos, target, dur, tag) {
  const s = engine.camera.position.clone();
  engine.animCam = { t: 0, dur, fromPos: s, toPos: pos, tag };
  engine.animTarget = target;
}

export function snap(engine, pos, target) {
  stopOrbit(engine);
  engine.camera.position.copy(pos);
  engine.animCam = null;
  if (engine.controls) { engine.controls.target.copy(target); engine.controls.update(); }
  engine.camera.lookAt(target);
}

let orbitTimer = null;
export function startOrbit(engine) {
  stopOrbit(engine);
  const dur = 30000;
  const st = performance.now();
  const fn = () => {
    const el = (performance.now() - st) / dur;
    if (!engine.controls) return;
    const t = (el % 1) * Math.PI * 2;
    const r = engine.bounds ? Math.max(engine.bounds.radius * 2.7, 4) : 5;
    const y = engine.bounds ? engine.bounds.center.y + engine.bounds.radius * 0.4 : 0.9;
    engine.camera.position.set(Math.sin(t) * r, y, Math.cos(t) * r);
    engine.camera.lookAt(engine.controls.target);
    orbitTimer = requestAnimationFrame(fn);
  };
  orbitTimer = requestAnimationFrame(fn);
}
export function stopOrbit(engine) { if (orbitTimer) cancelAnimationFrame(orbitTimer); orbitTimer = null; }

/* Called by the app's rAF loop. */
export function updateAnim(engine, dt) {
  if (!engine.animCam) return;
  const a = engine.animCam;
  a.t += dt / a.dur;
  const k = Math.min(a.t, 1);
  const e = 1 - Math.pow(1 - k, 3); // ease-out cubic
  engine.camera.position.lerpVectors(a.fromPos, a.toPos, e);
  const t = a.toPos.clone().lerp(engine.bounds ? engine.bounds.center : new THREE.Vector3(), 0);
  if (engine.controls) engine.controls.target.lerp(a.toPosTarget || t, 0.0);
  if (k >= 1) { engine.animCam = null; engine.controls && engine.controls.update(); }
}

export function resetView(engine) { setPreset(engine, '¾ hero'); }
