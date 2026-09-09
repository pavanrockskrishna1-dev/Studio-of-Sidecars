/* ENGINE · environment.js — Phase 3. Hero + 10 Studio Backgrounds (read-only Phase-1.5 inputs),
   procedural HDR-style probe, one-click switching with fade events. */
import * as THREE from 'three';
import { ENVS, CFG, LIMITS } from './config.js';

export function init(engine) {
  engine.env = { key: 'hero', probe: null, bgTex: null, loading: false };
  engine.ENVS = ENVS;
  setEnv(engine, 'hero', { immediate: true });
}

export function byKey(key) {
  return ENVS.find(e => e.key === key) || ENVS[0];
}

/* Canvas gradient => equirect texture probe used for PMREM reflections. */
export function buildProbe(engine, pal) {
  const pm = new THREE.PMREMGenerator(engine.renderer);
  const w = 1024, h = 512;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, pal.sky);
  grad.addColorStop(0.42, pal.horizon);
  grad.addColorStop(0.62, pal.horizon);
  grad.addColorStop(1, pal.ground);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  // soft "key" glow above centre so metallic read has a hot edge
  const rg = g.createRadialGradient(w * 0.62, h * 0.34, 10, w * 0.62, h * 0.34, w * 0.5);
  rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ map: tex }));
  mesh.scale.set(-1, 1, 1);
  scene.add(mesh);
  const rt = pm.fromScene(scene, 0.04);
  if (engine.env.probe) engine.env.probe.dispose();
  engine.env.probe = rt.texture;
  engine.scene.environment = rt.texture;
  if (typeof engine.scene.environmentIntensity === 'number') {
    engine.scene.environmentIntensity = Math.max(pal.amb === '#000000' ? 0.3 : 0.75, 0.4);
  }
  pm.dispose(); scene.clear();
  // tonal ambient that also feeds the hemisphere light fallback
  return rt.texture;
}

function downscale(img, maxW) {
  const s = Math.min(1, maxW / img.naturalWidth);
  const cw = Math.max(1, Math.round(img.naturalWidth * s));
  const ch = Math.max(1, Math.round(img.naturalHeight * s));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  c.getContext('2d').drawImage(img, 0, 0, cw, ch);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();

    im.onload = () => res(im);
    im.onerror = () => rej(new Error('img ' + src));
    im.src = src;
  });
}

/* One-click environment switch; fades handled by the UI layer via bus events. */
export async function setEnv(engine, key, { immediate } = {}) {
  const c = byKey(key);
  engine.bus && engine.bus.emit('env-start', key);
  buildProbe(engine, c.pal);
  const src = c.file ? CFG.envBase + c.file : CFG.envHero;
  try {
    const im = await loadImage(src);
    if (engine.env.bgTex) engine.env.bgTex.dispose();
    const tex = downscale(im, LIMITS.maxEnvTex);
    engine.env.bgTex = tex;
    engine.scene.background = tex;
    engine.env.backgroundReady = true;
  } catch (e) {
    // graceful: flat colour backdrop from the palette
    engine.scene.background = new THREE.Color(c.pal.horizon);
    engine.env.backgroundReady = false;
    console.warn('env image fallback', key, e && e.message);
  }
  engine.env.key = key;
  engine.bus && engine.bus.emit('env-ready', key);
  if (engine.bus) engine.bus.emit('env', key);
  return c;
}

export function envList() { return ENVS; }
