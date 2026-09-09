/* ENGINE · lighting.js — Phase 3. Key/fill/rim rig + one-tap looks + advanced knobs. */
import * as THREE from 'three';
import { LIGHT_PRESETS, LIGHT_LOOK } from './config.js';

export function byName(map, label) { return map[label] || Object.values(map)[0]; }

function kelvin(k) {
  const t = Math.min(Math.max(k, 1000), 40000) / 100;
  const c = new THREE.Color();
  c.setRGB(
    t <= 66 ? 1 : Math.min(Math.max(1.2929362 * Math.pow(t - 60, -0.1332047592), 0), 1),
    t <= 66 ? Math.min(Math.max(0.39008158 * Math.log(t) - 0.63184144, 0), 1)
            : Math.min(Math.max(1.1298909 * Math.pow(t - 60, -0.0755148492), 0), 1),
    t >= 66 ? 1 : (t <= 19 ? 0 : Math.min(Math.max(0.54320678 * Math.log(t - 10) - 1.1962541, 0), 1))
  );
  return c;
}

export function init(engine) {
  engine.light = {
    look: 'Softbox', override: 'Neutral', intensity: 1.0, temp: 0,
    key: null, fill: null, rim: null, hemi: null,
  };
  const key = new THREE.SpotLight(0xffffff, 1.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 40;
  key.shadow.camera.fov = 45;
  key.angle = 0.55; key.penumbra = 0.55; key.decay = 1.1;
  key.position.set(4.6, 7.4, 5.2);
  engine.scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfd4ea, 0.45);
  engine.scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 0.6);
  engine.scene.add(rim);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x05060a, 0.4);
  engine.scene.add(hemi);
  engine.light.key = key; engine.light.fill = fill; engine.light.rim = rim; engine.light.hemi = hemi;
  applyPreset(engine, 'Softbox', { silent: true });
  // tie shadow follow to the key direction only (cheap, stable)
  return { applyPreset, applyOverride, setIntensity };
}

export function applyPreset(engine, label, { silent } = {}) {
  const p = byName(LIGHT_PRESETS, label);
  const L = engine.light;
  L.look = label;
  if (!L.key) return;
  const cKey = new THREE.Color(p.key).multiplyScalar(p.keyI * 1.0);
  const cFill = new THREE.Color(p.fill).multiplyScalar(p.fillI);
  const cRim = new THREE.Color(p.rim).multiplyScalar(p.rimI);
  L.key.color.set(cKey); L.key.intensity = p.keyI;
  L.fill.color.set(cFill); L.fill.intensity = p.fillI * 1.6;
  L.rim.color.set(cRim); L.rim.intensity = p.rimI;
  L.hemi.intensity = 0.4 + (p.amb !== undefined ? 0.15 : 0);
  L.hemi.color.set(p.key).lerp(new THREE.Color(0x6aa5ff), 0.06);
  // key shadow box sized to scene
  L.key.target.position.set(0, 0.4, 0);
  engine.scene.add(L.key.target);
  const b = engine.bounds || { radius: 2 };
  const R = Math.max(b.radius, 2) * 1.8;
  L.key.position.set(4.8 * R / 3.6, 7.4 * R / 3.6 + 0.6, 5.2 * R / 3.6);
  // relative L-key colour weight already carried by cKey via temp
  L.key.color.copy(cKey).multiplyScalar(p.keyI / Math.max(p.keyI, 0.01)).clone();
  if (engine.light.override && engine.light.override !== 'Neutral') applyOverride(engine, engine.light.override, true);
  if (!silent && engine.bus) engine.bus.emit('light', label);
}

export function applyOverride(engine, which, skipBus) {
  const o = LIGHT_LOOK[which]; if (!o) return;
  engine.light.override = which;
  const L = engine.light;
  // overlay colour cast onto key+fill while keeping rig intensities
  L.key.color.set(o.key).multiplyScalar(L.key.intensity / 1.2);
  L.fill.color.set(o.fill).multiplyScalar(L.fill.intensity / 1.2);
  L.rim.color.set(o.rim).multiplyScalar(L.rim.intensity / 1.1);
  if (!skipBus && engine.bus) engine.bus.emit('light-look', which);
}

export function setIntensity(engine, v) { // 0.4..2
  engine.light.intensity = v;
  const L = engine.light;
  const base = LIGHT_PRESETS[L.look] || LIGHT_PRESETS['Softbox'];
  L.key.intensity = base.keyI * v;
  L.fill.intensity = base.fillI * 1.6 * v;
  L.rim.intensity = base.rimI * v;
  L.hemi.intensity = 0.42 * v;
}

export function setTemperature(engine, k) {
  engine.light.temp = k;
  const L = engine.light;
  const base = LIGHT_PRESETS[L.look] || LIGHT_PRESETS['Softbox'];
  if (!k) { // 0 => preset color
    applyPreset(engine, L.look, { silent: true }); return;
  }
  const c = kelvin(k);
  L.key.color.set(c).multiplyScalar(base.keyI / 1.2);
  L.fill.color.set(c).multiplyScalar(base.fillI / 1.2);
}
