import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DEMOS } from '../demo_models.js';
import { ASSETMAP } from '../assets_library.js';
import { $, clamp, lerp, easeInOutCubic, toast } from './ui.js';

/* =========================================================================
 *  SHARED ENGINE — one renderer/scene/camera; all Studio Versions plug into
 *  this object. Nothing here knows about a specific "version".
 * ========================================================================= */

export const FORMATS = {
  '9:16': { w: 1080, h: 1920, label: '9:16 Reels' },
  '1:1':  { w: 1080, h: 1080, label: '1:1 Post' },
  '16:9': { w: 1920, h: 1080, label: '16:9 Video' },
};

export function createStudio() {
  const S = { FORMATS };

  /* ---- edit/history hook: markEdit() after user edits so the Creator Hub
     undo manager can snapshot. Muted during programmatic restores. ---- */
  let historyMute = false;
  let editHook = null;
  function markEdit() { if (historyMute || !editHook) return; try { editHook(); } catch (e) { console.warn(e); } }
  function setHistoryMute(m) { historyMute = !!m; }
  function onEdit(fn) { editHook = fn; return () => { if (editHook === fn) editHook = null; }; }

  /* ---------------- renderer / scene / camera ---------------- */
  const canvas = document.getElementById('cv');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true, premultipliedAlpha: false });
  } catch (e) { toast('WebGL could not start: ' + e.message, true); throw e; }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#14161c');
  scene.environmentIntensity = 1;

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 300);
  camera.position.set(5.6, 3.4, 7.4);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.15;
  controls.maxDistance = 150;
  controls.target.set(0, 0.7, 0);

  function setCanvasSize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  setCanvasSize();

  /* ---------------- shared stage (floor / grid / gloss) ---------------- */
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.4, color: 0x000000 });
  const groundShadow = new THREE.Mesh(new THREE.CircleGeometry(90, 80), shadowMat);
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = -0.835;
  groundShadow.receiveShadow = true;
  scene.add(groundShadow);

  const glossMat = new THREE.MeshStandardMaterial({
    color: 0x0d0e12, roughness: 0.14, metalness: 0.55, envMapIntensity: 1.2, side: THREE.DoubleSide,
  });
  const groundGloss = new THREE.Mesh(new THREE.CircleGeometry(90, 80), glossMat);
  groundGloss.rotation.x = -Math.PI / 2;
  groundGloss.position.y = -0.835;
  groundGloss.receiveShadow = true;
  groundGloss.visible = false;
  scene.add(groundGloss);

  const gridHelper = new THREE.GridHelper(50, 50, 0x3a3f4a, 0x22262e);
  gridHelper.position.y = -0.83;
  gridHelper.visible = false;
  scene.add(gridHelper);

  /* ---------------- lights ---------------- */
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(6, 9, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -9; keyLight.shadow.camera.right = 9;
  keyLight.shadow.camera.top = 9; keyLight.shadow.camera.bottom = -9;
  keyLight.shadow.radius = 1;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-7, 3, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
  rimLight.position.set(0, 1.5, -8);
  scene.add(rimLight);

  const topSoft = new THREE.DirectionalLight(0xffffff, 0.4);
  topSoft.position.set(0, 12, 0);
  scene.add(topSoft);

  const amb = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(amb);

  /* ------- colour temperature ------- */
  function kelvinToRGB(k) {
    const t = clamp(k, 1000, 40000) / 100;
    let r, g, b;
    if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
    else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
    return new THREE.Color(r / 255, g / 255, b / 255);
  }

  /* ------- procedural environment studio scenes ------- */
  function makePanel(w, h, x, y, z, ry, rx, color, intensity) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    m.material.color.multiplyScalar(intensity);
    m.position.set(x, y, z); m.rotation.y = ry || 0; m.rotation.x = rx || 0;
    return m;
  }
  function buildEnvScene(kind) {
    const s = new THREE.Scene();
    const boxMat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, side: THREE.BackSide });
    const L = 22;
    if (kind === 'softbox' || kind === 'studio') {
      s.add(new THREE.Mesh(new THREE.BoxGeometry(L, L, L), boxMat(0x0a0a10)));
      s.add(makePanel(3.4, 2.2, -6.5, 2.0, 0, 0.42, -0.15, 0xffffff, 2.2));
      s.add(makePanel(3.4, 2.2, 6.5, 2.0, 0, -0.42, -0.15, 0xfff4e0, 2.2));
      s.add(makePanel(9, 1.6, 0, 7.2, 0, 0, Math.PI / 2, 0xffffff, 2.6));
      s.add(makePanel(1.8, 1.8, 0, 2.4, -7.4, 0, 0, 0xffeedd, 1.3));
    } else if (kind === 'coffeeshop') {
      s.add(new THREE.Mesh(new THREE.BoxGeometry(L, L, L), boxMat(0x171007)));
      s.add(makePanel(3.2, 3.2, 8.2, 2.6, 0, -0.5, 0, 0xffe9c4, 3.2));
      s.add(makePanel(0.5, 3.4, 9.2, 2.6, 0, -0.5, 0, 0xffd9a0, 1.0));
      s.add(makePanel(0.5, 3.4, 7.2, 2.6, 0, -0.5, 0, 0xffd9a0, 1.0));
      s.add(makePanel(1.0, 1.0, 0, 8.4, 0, 0, Math.PI / 2, 0xffc27a, 4));
      s.add(makePanel(1.0, 1.0, 2.6, 8.4, 1.8, 0, Math.PI / 2, 0xffc27a, 3));
      s.add(makePanel(1.0, 1.0, -2.4, 8.4, -2, 0, Math.PI / 2, 0xffc27a, 3));
      s.add(makePanel(4, 1.2, -8, 1.4, 0, 0.4, 0.2, 0x6b4a2b, 1.1));
    } else if (kind === 'morning') {
      s.add(new THREE.Mesh(new THREE.BoxGeometry(L, L, L), new THREE.MeshBasicMaterial({ color: 0xbcd8ff, toneMapped: false, side: THREE.BackSide })));
      s.add(makePanel(2.6, 2.6, -7, 5, 0, 0.35, -0.3, 0xfff2cc, 5.2));
      s.add(makePanel(9, 1.4, 0, 10, 0, 0, Math.PI / 2, 0xeaf4ff, 2.6));
      s.add(makePanel(12, 2.2, 0, 0.4, -9, 0, 0, 0xdff0ff, 1.4));
      s.add(makePanel(5, 1.6, 7, 1.2, 3, -0.6, 0, 0x8fc2a0, 1.0));
    } else if (kind === 'nightcafe') {
      s.add(new THREE.Mesh(new THREE.BoxGeometry(L, L, L), boxMat(0x05040c)));
      s.add(makePanel(0.14, 1.6, -6.8, 3.1, 2.4, Math.PI / 2 - 0.1, 0, 0xff9a5a, 6));
      s.add(makePanel(0.14, 0.5, -6.9, 1.6, 0.4, Math.PI / 2 - 0.1, 0, 0xffd0a0, 3));
      s.add(makePanel(1.8, 1.0, 6.8, 2.2, 0, -0.5, 0, 0x7aa2ff, 3.2));
      s.add(makePanel(1.8, 1.0, 6.8, 0.9, 0, -0.5, 0, 0x9db8ff, 1.6));
      for (let i = -2; i <= 2; i++) {
        s.add(makePanel(0.45, 0.45, i * 2.2, 7.6, 0, 0, Math.PI / 2, 0xffc27a, 3.4));
        s.add(makePanel(0.45, 0.45, i * 2.2 - 1.1, 7.6, 2.2, 0, Math.PI / 2, 0x9db8ff, 1.4));
      }
    } else {
      s.add(new THREE.Mesh(new THREE.BoxGeometry(L, L, L), boxMat(0x0b0d12)));
      s.add(makePanel(9, 2.0, 0, 8, 0, 0, Math.PI / 2, 0xffffff, 2.4));
    }
    return s;
  }

  const envCache = {};
  function envFor(kind) {
    if (envCache[kind]) return envCache[kind];
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envCache[kind] = pmrem.fromScene(buildEnvScene(kind), 0.02).texture;
      return envCache[kind];
    } catch (e) {
      console.warn('env build fallback', kind, e);
      if (!envCache._base) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        envCache._base = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
      }
      return envCache._base;
    }
  }

  const LIGHT_PRESETS = {
    softbox:   { env: 'softbox', bg: 0x14161c, amb: 0.5, key: 2.0, fill: 0.65, rim: 0.85, top: 0.5, keyC: 0xffffff, fillC: 0xffffff, rimC: 0xffffff, temp: 5400 },
    coffeeshop:{ env: 'coffeeshop', bg: 0x221810, amb: 0.55, key: 1.7, fill: 0.5, rim: 1.0, top: 0.22, keyC: 0xffd9ad, fillC: 0xffcfa8, rimC: 0xffb27a, temp: 4000 },
    morning:   { env: 'morning', bg: 0x2a3340, amb: 0.65, key: 2.0, fill: 0.7, rim: 0.6, top: 0.7, keyC: 0xfff3d6, fillC: 0xcfe3ff, rimC: 0xfff7e6, temp: 6800 },
    nightcafe: { env: 'nightcafe', bg: 0x0c0a16, amb: 0.5, key: 1.6, fill: 0.35, rim: 1.6, top: 0.3, keyC: 0xffc27a, fillC: 0x8fa8ff, rimC: 0xff9a5a, temp: 3100 },
    studio:    { env: 'studio', bg: 0x181b22, amb: 0.5, key: 2.0, fill: 0.6, rim: 0.8, top: 0.45, keyC: 0xffffff, fillC: 0xffffff, rimC: 0xffffff, temp: 5600 },
    sunset:    { env: 'morning', bg: 0x2c1d15, amb: 0.6, key: 1.8, fill: 0.5, rim: 1.1, top: 0.25, keyC: 0xff9a55, fillC: 0xffc9a0, rimC: 0xffc37a, temp: 3400 },
    dawn:      { env: 'softbox', bg: 0x281d2b, amb: 0.6, key: 1.6, fill: 0.65, rim: 0.9, top: 0.35, keyC: 0xffa9b4, fillC: 0xffc3d0, rimC: 0xfff0ff, temp: 4700 },
    night:     { env: 'nightcafe', bg: 0x0b0f1c, amb: 0.4, key: 1.2, fill: 0.35, rim: 1.4, top: 0.25, keyC: 0xbfd2ff, fillC: 0x445a8a, rimC: 0xaac8ff, temp: 8000 },
    warehouse: { env: 'studio', bg: 0x171717, amb: 0.55, key: 1.8, fill: 0.7, rim: 0.6, top: 0.6, keyC: 0xffe2b3, fillC: 0xcfc9be, rimC: 0xffffff, temp: 4300 },
    forest:    { env: 'morning', bg: 0x111c14, amb: 0.7, key: 1.7, fill: 0.65, rim: 0.6, top: 0.4, keyC: 0xfff3d6, fillC: 0xa5cf96, rimC: 0xddf2cf, temp: 6200 },
    ocean:     { env: 'morning', bg: 0x101a26, amb: 0.65, key: 1.8, fill: 0.7, rim: 0.65, top: 0.45, keyC: 0xfff0d0, fillC: 0x9fd4ff, rimC: 0xdff4ff, temp: 7200 },
    classic:   { env: 'softbox', bg: 0x1a1a22, amb: 0.6, key: 1.7, fill: 0.6, rim: 0.6, top: 0.4, keyC: 0xffffff, fillC: 0xdcdce6, rimC: 0xffffff, temp: 5600 },
  };

  const S_light = {
    state: { userTemp: 5600, envName: 'softbox' },
    scene, renderer, camera, controls, kelvinToRGB, LIGHT_PRESETS,
    keyLight, fillLight, rimLight, topSoft, amb, shadowMat,
  };

  let hdriActive = false;
  function setLightingPreset(name, silent) {
    const p = LIGHT_PRESETS[name] || LIGHT_PRESETS.classic;
    S_light.state.envName = name;
    if (!hdriActive) {
      try { scene.environment = envFor(p.env); scene.background = new THREE.Color(p.bg); } catch (e) { console.warn('env', e); }
    }
    amb.color.set(0xffffff);
    amb.intensity = p.amb;
    keyLight.color.copy(p.keyC).lerp(kelvinToRGB(p.temp || 5600), 0.5);
    keyLight.intensity = p.key;
    fillLight.color.copy(p.fillC).lerp(kelvinToRGB(p.temp || 5600), 0.4);
    fillLight.intensity = p.fill;
    rimLight.color.copy(p.rimC).lerp(kelvinToRGB(p.temp || 5600), 0.3);
    rimLight.intensity = p.rim;
    topSoft.color.copy(kelvinToRGB(p.temp || 5600));
    topSoft.intensity = p.top;
    if (p.temp) S_light.state.userTemp = p.temp;
    if (!silent) toast('💡 ' + name.toUpperCase() + ' lighting');
    S_light.state.envName = name;
  }

  function applyMasterIntensity(mult, tempK, envMult, shadowSoft, shadowsOn) {
    const p = LIGHT_PRESETS[S_light.state.envName] || LIGHT_PRESETS.classic;
    const I = (mult === undefined || mult === null) ? 1 : mult;
    amb.intensity = p.amb * I;
    keyLight.intensity = p.key * I;
    fillLight.intensity = p.fill * I;
    rimLight.intensity = p.rim * I;
    topSoft.intensity = p.top * I;
    const K = kelvinToRGB(tempK || S_light.state.userTemp || 5600);
    keyLight.color.copy(K).lerp(new THREE.Color(0xffffff), 0.42);
    fillLight.color.copy(K).lerp(new THREE.Color(0xffffff), 0.45);
    rimLight.color.copy(K).lerp(new THREE.Color(0xffffff), 0.3);
    if (envMult !== undefined && envMult !== null) scene.environmentIntensity = envMult;
    if (shadowSoft !== undefined && shadowSoft !== null) keyLight.shadow.radius = shadowSoft;
    renderer.shadowMap.enabled = !(shadowsOn === false);
    groundShadow.visible = !groundGloss.visible && !(shadowsOn === false);
    shadowMat.opacity = 0.42;
  }

  function setShadowSoft(v) { keyLight.shadow.radius = v; }
  function setShadows(on) {
    uiState.shadows = !!on;
    renderer.shadowMap.enabled = !!on;
    keyLight.castShadow = !!on;
    groundShadow.visible = uiState.shadows && !uiState.floorGloss && !uiState.grid;
    groundShadow.material.opacity = 0.42;
  }
  function setFloorGloss(on) {
    uiState.floorGloss = !!on;
    groundGloss.visible = uiState.floorGloss;
    groundShadow.visible = uiState.shadows && !uiState.floorGloss && !uiState.grid;
    glossMat.envMapIntensity = 1.2;
  }
  function setGrid(on) {
    uiState.grid = !!on;
    gridHelper.visible = uiState.grid;
    groundGloss.visible = !uiState.grid && uiState.floorGloss;
    groundShadow.visible = uiState.shadows && !uiState.grid && !uiState.floorGloss;
  }
  const uiState = { grid: false, floorGloss: false, shadows: true };
  S.gridState = uiState;

  function loadHDRIFile(file, asBackdrop) {
    const isHDR = /\.hdr$/i.test(file.name);
    const isEXR = /\.exr$/i.test(file.name);
    const url = URL.createObjectURL(file);
    const onOk = (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      if ('colorSpace' in tex) tex.colorSpace = THREE.LinearSRGBColorSpace;
      scene.environment = tex;
      hdriActive = true;
      if (asBackdrop) scene.background = tex;
      toast('🌐 HDRI loaded: ' + file.name);
      URL.revokeObjectURL(url);
    };
    const onErr = (e) => { console.error(e); toast('Could not load HDRI. Try .hdr / .exr / equirect .png.', true); URL.revokeObjectURL(url); };
    try {
      if (isHDR) new RGBELoader().load(url, onOk, undefined, onErr);
      else if (isEXR) new EXRLoader().load(url, onOk, undefined, onErr);
      else new THREE.TextureLoader().load(url, (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = tex;
        if (asBackdrop) scene.background = tex;
        toast('Equirect image set as environment');
      }, undefined, onErr);
    } catch (e) { onErr(e); }
  }
  function setBackdropColor(hex) { hdriActive = false; scene.background = new THREE.Color(hex); }
  function loadBackdropImage(file) {
    const url = URL.createObjectURL(file);
    new THREE.TextureLoader().load(url, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; scene.background = tex; hdriActive = false; toast('Backdrop image applied'); },
      undefined, () => toast('Could not load image.', true));
  }

  /* ======================================================================
   *  BRAND LAYER (V6 Brand Studio) — applied at engine level so the brand
   *  travels with the scene: kit background, watermark overlay, intro/outro
   *  cards, and watermark stamping into exported stills.
   * ====================================================================== */
  let brandKit = null;
  let brandWater = true;
  let brandTimer = null;
  const brandEls = { host: null, wm: null, wmImg: null, wmTxt: null, card: null };

  function fontStyle(kit, scale) {
    const f = (kit && kit.font) || 'modern';
    const map = { modern: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", serif: "Georgia,'Times New Roman',serif", bold: "Impact,'Arial Narrow',sans-serif", hand: "'Comic Sans MS','Segoe Print',cursive" };
    return (map[f] || map.modern) + (scale ? (', ' + scale) : '');
  }

  function buildBrandOverlay() {
    if (brandEls.host && document.body.contains(brandEls.host)) return brandEls.host;
    const host = document.createElement('div');
    host.id = 'brandOverlay';
    const wm = document.createElement('div');
    wm.className = 'bm-watermark';
    const wmImg = document.createElement('img');
    wmImg.className = 'bm-wimg';
    wmImg.alt = '';
    const wmTxt = document.createElement('span');
    wmTxt.className = 'bm-wtxt';
    wm.append(wmImg, wmTxt);
    const card = document.createElement('div');
    card.className = 'bm-card';
    card.style.display = 'none';
    host.append(wm, card);
    document.body.appendChild(host);
    brandEls.host = host; brandEls.wm = wm; brandEls.wmImg = wmImg; brandEls.wmTxt = wmTxt; brandEls.card = card;
    return host;
  }

  function wmVisible() { return !!(brandKit && brandWater && brandKit.watermark && brandKit.watermark.on !== false); }

  function refreshBrandOverlay() {
    buildBrandOverlay();
    const wm = brandEls.wm;
    if (!brandKit || !brandWater || brandKit.watermark.on === false) { wm.style.display = 'none'; return; }
    const colors = brandKit.colors || {};
    const txt = (brandKit.watermark && brandKit.watermark.text) || brandKit.name || '';
    brandEls.wmImg.style.display = brandKit.logo ? 'inline-block' : 'none';
    if (brandKit.logo) { brandEls.wmImg.src = brandKit.logo; }
    else brandEls.wmImg.src = '';
    brandEls.wmTxt.textContent = txt;
    brandEls.wmTxt.style.fontFamily = fontStyle(brandKit);
    brandEls.wm.style.color = colors.text || '#fff';
    wm.style.display = 'flex';
  }

  function brandColorStyle(kit) {
    const c = kit.colors || {};
    return {
      background: 'linear-gradient(150deg,' + (c.primary || '#333') + ',' + (c.bg || '#111') + ' 140%)',
      borderColor: (c.accent || '#888') + '55',
      color: c.text || '#fff',
      fontFamily: fontStyle(kit),
    };
  }
  function showBrandCard(kind, ms) {
    buildBrandOverlay();
    const kit = brandKit;
    const card = brandEls.card;
    if (!kit) { toast('Pick a brand kit first (tap a tile above).', true); return; }
    card.innerHTML = '';
    if (kind === 'intro') {
      const txt = (kit.intro && kit.intro.h) || kit.name || '';
      const sub = (kit.intro && kit.intro.s) || '';
      const head = document.createElement('div');
      head.className = 'bm-head';
      if (kit.logo) { const im = document.createElement('img'); im.src = kit.logo; im.className = 'bm-logo'; head.appendChild(im); }
      else { const ch = document.createElement('span'); ch.className = 'bm-char'; ch.textContent = kit.logoChar || kit.icon; head.appendChild(ch); }
      const h1 = document.createElement('div'); h1.className = 'bm-h1'; h1.textContent = txt;
      const subEl = document.createElement('div'); subEl.className = 'bm-sub'; subEl.textContent = sub;
      card.append(head, h1, subEl);
    } else {
      const l1 = (kit.outro && kit.outro.l1) || 'Thanks for watching';
      const l2 = (kit.outro && kit.outro.l2) || '';
      const h2 = document.createElement('div'); h2.className = 'bm-h2'; h2.textContent = l1;
      const s2 = document.createElement('div'); s2.className = 'bm-sub'; s2.textContent = l2;
      card.append(h2, s2);
    }
    card.style.display = 'flex';
    Object.assign(card.style, brandColorStyle(kit));
    card.classList.remove('on');
    void card.offsetWidth; // reflow so the fade restarts
    card.classList.add('on');
    clearTimeout(brandTimer);
    brandTimer = setTimeout(() => { card.classList.remove('on'); setTimeout(() => { if (brandTimer) card.style.display = 'none'; }, 500); }, ms || 3600);
  }

  function applyBrandKit(kit, opts = {}) {
    brandKit = kit ? JSON.parse(JSON.stringify(kit)) : null;
    if (!opts.silentBg && brandKit && brandKit.applyBg !== false && brandKit.colors && brandKit.colors.bg) {
      setBackdropColor(brandKit.colors.bg);
    }
    refreshBrandOverlay();
    if (!opts.silent) {
      if (brandKit) toast('🎨 Brand applied: ' + brandKit.name + ' — background, watermark & cards active');
      else toast('Brand removed');
    }
    markEdit();
  }
  /** re-assert brand look after a version switch applied its own lighting preset */
  function brandRefresh() {
    if (brandKit && brandKit.applyBg !== false && brandKit.colors && brandKit.colors.bg) setBackdropColor(brandKit.colors.bg);
    refreshBrandOverlay();
  }

  /* stamp the watermark into an exported still (canvas sized W×H) */
  function stampBrand(ctx, W, H) {
    if (!wmVisible() || !ctx) return;
    const kit = brandKit;
    const txt = (kit.watermark && kit.watermark.text) || kit.name || '';
    const fs = Math.max(13, Math.round(H * 0.018));
    const pad = Math.max(18, Math.round(H * 0.024));
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffffff';
    let x = W - pad, y = H - pad;
    if (kit.logo) {
      try {
        const img = new Image();
        img.src = kit.logo;
        if (img.complete && img.naturalWidth) { const s = fs * 1.6; ctx.drawImage(img, x - s, y - fs * 0.85, s, s); x -= (s + fs * 0.45); }
      } catch (e) {}
    } else if (kit.logoChar) {
      ctx.font = (fs * 1.5) + 'px sans-serif';
      ctx.fillText(kit.logoChar, x - ctx.measureText(kit.logoChar).width, y);
      x -= fs * 1.5;
    }
    if (txt) {
      ctx.font = '600 ' + fs + 'px ' + fontStyle(kit);
      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowBlur = fs * 0.35;
      ctx.fillText(txt, x - ctx.measureText(txt).width, y);
    }
    ctx.restore();
  }

  /* ===================================================================
   *  PRODUCT (GLB) MANAGER — lives across versions, never cleared
   * =================================================================== */
  const loader = new GLTFLoader();
  const FLOOR_Y = -0.82;
  let idCounter = 0;

  const state = {
    models: [], meshes: [], selectedPart: null,
    format: '9:16', guideVisible: true, firstFitDone: false,
    activeVersion: null, wire: false,
  };

  function indexRecMeshes(group) {
    const list = [];
    group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; list.push(o); } });
    return list;
  }

  function createRec(group, name, animations, src) {
    idCounter++;
    const rec = { id: idCounter, name, group, meshes: indexRecMeshes(group), clips: [], visible: true, _src: src || null };
    group.animations = animations || [];
    scene.add(group);
    state.models.push(rec);
    rec.meshes.forEach((m) => state.meshes.push({
      mesh: m, modelId: rec.id, name: m.name || m.geometry.type,
      origMat: (Array.isArray(m.material) ? m.material : [m.material]).map((mm) => (mm ? mm.clone() : null)),
      origPos: m.position.clone(), origQuat: m.quaternion.clone(), origScale: m.scale.clone(),
    }));
    rec._fin = rec.meshes.map(() => null);
    if (!state.firstFitDone) state.firstFitDone = true;
    return rec;
  }

  function srcGuess(name, explicit) {
    if (explicit) return explicit;
    if (name && DEMOS[name]) return { k: 'demo', name };
    const found = Object.values(ASSETMAP || {}).find((a) => a && a.name === name);
    if (found) return { k: 'proc', key: found.key, name };
    return { k: 'unknown', name: name || '' };
  }

  function onProduct(gltf, name, opts = {}) {
    const group = gltf.scene || gltf;
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const target = 4.4;
    const k = target / maxDim;
    const bottomY = box.min.y * k;
    group.position.set(-center.x * k, FLOOR_Y - bottomY, -center.z * k);
    group.scale.setScalar(k);
    const rec = createRec(group, name, gltf.animations || [], srcGuess(name, opts._src));
    if (opts.place) { group.position.x += (opts.place.dx || 0); group.position.z += (opts.place.dz || 0); }
    refreshAllUI();
    if (!opts.quiet) toast('📦 ' + name + ' loaded — ' + rec.meshes.length + ' parts');
    emitProducts();
    if (!opts.noFrame) setTimeout(() => { if (typeof S._afterLoad === 'function') { try { S._afterLoad(); } catch (e) {} } }, 90);
    markEdit();
    return rec;
  }

  /* ---- product-change notifications (keeps asset-library panels live) ---- */
  const productListeners = [];
  function emitProducts() { productListeners.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } }); }
  function onProductsChange(fn) { productListeners.push(fn); return () => { const i = productListeners.indexOf(fn); if (i !== -1) productListeners.splice(i, 1); }; }

  /* ring placement so a fresh asset never lands exactly on the last one */
  function nextPlaceOffset() {
    const n = state.models.length;
    const RING = 8, R = 3.4;
    const layer = Math.floor(n / RING), k = n % RING;
    const r = R + layer * 1.9;
    const a = k * (Math.PI * 2 / RING) + 0.45;
    return { dx: Math.cos(a) * r, dz: Math.sin(a) * r };
  }

  /** add a ready-made Object3D (built from primitives) as a normal product */
  function addObject3D(group, name, opts = {}) {
    if (!group) { console.warn('addObject3D: no group'); return null; }
    return onProduct({ scene: group, animations: opts.animations || [] }, name, Object.assign({}, opts, { _src: opts._src || srcGuess(name, null) }));
  }

  /** clone an existing product (transform + look included) beside the source */
  function duplicateModel(id) {
    const src = state.models.find((r) => r.id === id);
    if (!src) { toast('No product to duplicate.', true); return null; }
    const copy = src.group.clone(true);
    const rec = createRec(copy, src.name.replace(/\s*(copy|\d+)$/i, '') + ' copy', copy.animations, src._src ? JSON.parse(JSON.stringify(src._src)) : null);
    rec._fin = (src._fin || []).slice();
    copy.position.x = src.group.position.x + 1.1;
    copy.position.z = src.group.position.z + 0.7;
    refreshAllUI();
    toast('⧉ Duplicated ' + src.name);
    emitProducts();
    markEdit();
    return rec;
  }

  function b64ToArrayBuffer(b64) {
    const bin = atob(b64); const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  function bufToB64(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let bin = '';
    const CH = 0x8000;
    for (let i = 0; i < u8.length; i += CH) bin += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return btoa(bin);
  }
  function loadDemo(label, opts) {
    const b64 = DEMOS[label];
    if (!b64) { toast('Demo not found: ' + label, true); return; }
    toast('Loading ' + label + '…');
    addFromBuffer(b64ToArrayBuffer(b64), label, Object.assign({}, opts || {}, { _src: { k: 'demo', name: label } }));
  }
  /** parse bytes/text into a product; resolves with the record. */
  function parseBuffer(buffer, name, opts = {}) {
    return new Promise((resolve, reject) => {
      const ok = (g) => { try { resolve(onProduct(g, name, opts)); } catch (e) { reject(e); } };
      const fail = (e) => { console.error('parse fail', name, e); reject(e); };
      try { loader.parse(buffer, '', ok, fail); } catch (e) { fail(e); }
    });
  }
  function addFromBuffer(buffer, name, opts = {}) {
    return parseBuffer(buffer, name, opts)
      .then((rec) => { if (opts.onAdd) { try { opts.onAdd(rec); } catch (e) { console.warn(e); } } return rec; })
      .catch(() => { if (!opts.quiet) toast('Failed to read "' + name + '".\nValid .glb/.gltf required.', true); return null; });
  }
  function loadFiles(files) {
    const list = Array.from(files || []).filter((f) => /\.(glb|gltf)$/i.test(f.name));
    if (!list.length) { toast('Please choose a .glb or .gltf product file.', true); return; }
    list.forEach((file) => {
      const isGLTF = /\.gltf$/i.test(file.name);
      const reader = new FileReader();
      reader.onerror = () => toast('Could not read "' + file.name + '".', true);
      reader.onload = () => {
        try {
          if (isGLTF) {
            const text = String(reader.result);
            addFromBuffer(text, file.name, { _src: { k: 'user', name: file.name, text } });
          } else {
            const buf = reader.result;
            const src = { k: 'user', name: file.name, b64: bufToB64(new Uint8Array(buf)) };
            addFromBuffer(buf, file.name, { _src: src });
          }
        } catch (e) { toast('Error: ' + e.message, true); }
      };
      isGLTF ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
    });
    const fi = document.getElementById('file'); if (fi) fi.value = '';
  }

  function removeModel(id, opts) {
    const i = state.models.findIndex((r) => r.id === id);
    if (i === -1) return;
    scene.remove(state.models[i].group);
    disposeObj(state.models[i].group);
    state.models.splice(i, 1);
    state.meshes = state.meshes.filter((e) => e.modelId !== id);
    if (state.selectedPart && state.selectedPart.modelId === id) { state.selectedPart = null; }
    refreshAllUI();
    emitProducts();
    if (!(opts && opts.quiet)) toast('Removed product');
    markEdit();
  }
  function findRecOfMesh(mesh) {
    for (let i = 0; i < state.models.length; i++) if (state.models[i].meshes.indexOf(mesh) !== -1) return state.models[i];
    return null;
  }
  function disposeObj(obj) {
    obj.traverse((o) => {
      if (o.isMesh) {
        if (o.geometry) o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mm && mm.dispose && mm.dispose());
      }
    });
  }

  function productBounds() {
    const visible = state.models.filter((m) => m.visible);
    if (!visible.length) return { center: new THREE.Vector3(0, 0.7, 0), radius: 1.1 };
    const box = new THREE.Box3();
    visible.forEach((m) => box.expandByObject(m.group));
    if (box.isEmpty()) return { center: new THREE.Vector3(0, 0.7, 0), radius: 1.1 };
    const center = box.getCenter(new THREE.Vector3());
    return { center, radius: Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.05) };
  }

  /* ===================================================================
   *  PARTS + MATERIALS (shared)
   * =================================================================== */
  const FINISHES = {
    chrome:   (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 1.0, roughness: 0.06, envMapIntensity: 1.6 }),
    metal:    (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.32, envMapIntensity: 1.1 }),
    glossy:   (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.12, roughness: 0.1, envMapIntensity: 1.2 }),
    paint:    (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.05, roughness: 0.28, envMapIntensity: 0.9 }),
    matte:    (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.0, roughness: 0.92 }),
    rubber:   (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.0, roughness: 0.98 }),
    ceramic:  (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.0, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.0 }),
    gold:     (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 1.0, roughness: 0.28, envMapIntensity: 1.3 }),
    glass:    (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.0, roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.0 }),
    emissive: (c) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: 0.9 }),
  };
  function meshColor(mesh) {
    const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    return m && m.color ? '#' + m.color.getHexString() : '#ffffff';
  }
  function applyFinish(mesh, type) {
    const mk = FINISHES[type]; if (!mk) return;
    const color = new THREE.Color(meshColor(mesh));
    if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((old) => { const f = mk(color); f.name = (old && old.name ? old.name + ' ' : '') + type; return f; });
    else { const old = mesh.material; const f = mk(color); f.name = (old && old.name ? old.name + ' ' : '') + type; mesh.material = f; }
    const rec = findRecOfMesh(mesh); if (rec) rec._fin[rec.meshes.indexOf(mesh)] = type;
    markEdit();
  }
  function recolorPart(mesh, hex) {
    const c = new THREE.Color(hex);
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => { if (m && m.color) m.color.copy(c); });
    markEdit();
  }
  function movePart(mesh, dx, dy, dz) { mesh.position.set(dx, dy, dz); markEdit(); }
  function rotatePartY(mesh, deg) { mesh.rotation.y = THREE.MathUtils.degToRad(deg); markEdit(); }
  function scalePart(mesh, v) { mesh.scale.set(v, v, v); markEdit(); }
  function hidePart(mesh, on) { mesh.visible = on; markEdit(); }
  function resetPart(entry) {
    if (!entry) return;
    const m = entry.mesh;
    if (entry.origMat) m.material = Array.isArray(m.material) ? entry.origMat.slice() : entry.origMat[0];
    if (entry.origPos) m.position.copy(entry.origPos);
    if (entry.origQuat) m.quaternion.copy(entry.origQuat);
    if (entry.origScale) m.scale.copy(entry.origScale);
    m.visible = true;
    const rec = findRecOfMesh(m); if (rec) { const i = rec.meshes.indexOf(m); if (i !== -1) rec._fin[i] = null; }
    markEdit();
  }

  /* ===================================================================
   *  UI list refresh — safe to call from any version
   * =================================================================== */
  function modelName(rec) { return rec.name + (rec.meshes.length ? ' · ' + rec.meshes.length + ' parts' : ''); }
  function refreshModelList() {
    const wrap = document.getElementById('modelList');
    if (!wrap) return;
    wrap.innerHTML = '';
    state.models.forEach((rec) => {
      const d = document.createElement('div'); d.className = 'item';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = modelName(rec); nm.title = rec.name;
      const tools = document.createElement('span');
      const eye = document.createElement('button'); eye.className = 'icobtn'; eye.textContent = rec.visible ? '👁️' : '🚫';
      eye.onclick = () => { rec.visible = !rec.visible; rec.group.visible = rec.visible; refreshModelList(); emitProducts(); markEdit(); };
      const del = document.createElement('button'); del.className = 'icobtn'; del.textContent = '🗑️';
      del.onclick = () => removeModel(rec.id);
      tools.append(eye, del);
      d.append(nm, tools);
      d.onclick = () => { if (S.frame) S.frame('hero'); };
      wrap.appendChild(d);
    });
  }
  function updateStats() {
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('statMeshes', String(state.meshes.length));
    setTxt('statModels', String(state.models.length));
  }
  function refreshPartSelect() {
    const sel = document.getElementById('partSel'); if (!sel) return;
    sel.innerHTML = '';
    if (!state.meshes.length) { const o = document.createElement('option'); o.value = ''; o.textContent = '(no product yet)'; sel.appendChild(o); return; }
    state.meshes.forEach((e, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = e.name || 'part ' + (i + 1); sel.appendChild(o); });
    if (state.selectedPart) { const gi = state.meshes.indexOf(state.selectedPart); if (gi !== -1) sel.value = String(gi); }
  }
  function refreshClipList() {
    const sel = document.getElementById('clipSel'); if (!sel) return;
    const clips = clipsFlat();
    const statC = document.getElementById('statClips'); if (statC) statC.textContent = String(clips.length);
    const btn = document.getElementById('btnAnim'); if (btn) btn.disabled = clips.length === 0;
    sel.innerHTML = '';
    if (!clips.length) { const o = document.createElement('option'); o.value = ''; o.textContent = '(no animation clips)'; sel.appendChild(o); return; }
    clips.forEach((c, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = c.clip.name; sel.appendChild(o); });
  }
  function refreshAllUI() {
    refreshModelList(); refreshPartSelect(); refreshClipList(); updateStats();
    syncPartInputs();
  }
  function selectPartIndex(idx) {
    const e = (idx === null || idx === undefined) ? null : state.meshes[idx];
    state.selectedPart = e || null;
    const ctrls = document.getElementById('partCtrls'); if (ctrls) ctrls.style.display = e ? 'block' : 'none';
    const sel = document.getElementById('partSel'); if (sel) sel.value = e ? String(idx) : '';
    syncPartInputs();
  }
  function syncPartInputs() {
    const s = state.selectedPart; if (!s) return;
    const m = s.mesh, p = m.position, r = m.rotation, sc = m.scale;
    const set = (id, v) => { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = v; };
    const out = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('px', p.x); set('py', p.y); set('pz', p.z); set('ry', THREE.MathUtils.radToDeg(r.y)); set('sc', sc.x);
    out('pxv', p.x.toFixed(2)); out('pyv', p.y.toFixed(2)); out('pzv', p.z.toFixed(2));
    out('ryv', THREE.MathUtils.radToDeg(r.y).toFixed(0) + '°'); out('scv', sc.x.toFixed(2) + '×');
    const pc = document.getElementById('partColor'); if (pc && s) pc.value = meshColor(s.mesh);
  }

  /* ===================================================================
   *  CINEMATIC CAMERA (engine) — framing given by the active version
   * =================================================================== */
  let tween = null, moving = null, userRotateWasOn = false;
  const clock = new THREE.Clock();

  function stopCamControl() {
    tween = null; moving = null;
    controls.enabled = true;
    if (userRotateWasOn) { controls.autoRotate = true; userRotateWasOn = false; }
    controls.update();
  }
  /* Product-fills-frame distance: we aim the product (radius R) to occupy a good
     portion of the visible frame. d = R * distK where distK ~ 4-5 gives a tight,
     cinematic commercial framing across all aspect ratios. */
  function frame(name, opts) {
    stopCamControl();
    const o = opts || {};
    const { center: C, radius: R } = productBounds();
    const baseK = { front: 4.9, '45': 4.8, side: 4.9, top: 5.4, hero: 5.6, macro: 2.1, detail: 3.4, pour: 3.8 };
    const k = (o.distK || baseK[name] || 4.8);
    const m = o.mult || 1;
    const d = Math.max(R * k * m, R * 0.3);
    const yBias = (o.yBias !== undefined) ? o.yBias : 0;
    const from = camera.position.clone();
    const fromT = controls.target.clone();
    const target = C.clone();
    let to, dur = 1.0, upTo = null;
    if (name === 'front') { to = new THREE.Vector3(C.x, target.y + d * 0.16 + yBias, C.z + d); dur = 0.9; }
    else if (name === '45') { const dir = new THREE.Vector3(0.62, 0, 0.62).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y + d * 0.2 + yBias; dur = 0.9; }
    else if (name === 'side') { to = new THREE.Vector3(C.x + d, target.y + d * 0.1 + yBias, C.z); dur = 0.9; }
    else if (name === 'top') { to = new THREE.Vector3(C.x, C.y + d * 1.15 + yBias, C.z + 0.001); upTo = new THREE.Vector3(0, 0, -1); dur = 1.1; }
    else if (name === 'hero') { const dir = new THREE.Vector3(0.55, 0, 0.83).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y - R * 0.04 + d * 0.05 + yBias; dur = 1.1; }
    else if (name === 'macro') { const dir = new THREE.Vector3(0.5, 0, 0.86).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y - R * 0.1 + d * 0.14 + yBias; dur = 1.2; }
    else if (name === 'detail') { const dir = new THREE.Vector3(0.55, 0, 0.83).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y + d * 0.15 + yBias; dur = 1.0; }
    else if (name === 'pour') { const dir = new THREE.Vector3(0.42, 0, 0.9).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y - R * 0.05 + d * 0.26 + yBias; dur = 1.1; }
    else { to = C.clone().addScaledVector(new THREE.Vector3(1, 0.4, 1).normalize(), d); dur = 1; }
    tween = { t0: performance.now(), dur: dur * 1000, from, to, fromT, toT: target, upFrom: camera.up.clone(), upTo };
    controls.enabled = false;
    if (controls.autoRotate) { userRotateWasOn = true; controls.autoRotate = false; }
  }

  function moveGen(name) {
    const { center: C, radius: R } = productBounds();
    const rel = camera.position.clone().sub(C); rel.y = 0;
    const az0 = Math.atan2(rel.x, rel.z);
    const dist0 = Math.max(camera.position.distanceTo(C), R * 1.1);
    if (name === 'orbit') {
      const r = dist0 || R * 2.4;
      const elev = clamp((camera.position.y - C.y) / r, -0.6, 1.4);
      return (u) => { const a = az0 + u * Math.PI * 2; return { pos: new THREE.Vector3(C.x + Math.sin(a) * r, C.y + elev * r, C.z + Math.cos(a) * r), target: C.clone() }; };
    }
    if (name === 'dolly') {
      const r0 = Math.max(dist0, R * 2.6), r1 = R * 1.05;
      const dir = new THREE.Vector3(Math.sin(az0), 0, Math.cos(az0)).normalize();
      return (u) => { const t = easeInOutCubic(u); const d = lerp(r0, r1, t); const h = lerp(Math.max(R * 0.9, 0.4), R * 0.42, t); return { pos: new THREE.Vector3(C.x + dir.x * d, C.y + h, C.z + dir.z * d), target: C.clone() }; };
    }
    if (name === 'crane') {
      const r = (dist0 * 0.82) || R * 2.1;
      return (u) => { const a = az0 + u * Math.PI * 2; const h = R * (0.35 + 1.7 * (0.5 + 0.5 * Math.sin(u * Math.PI * 2))); return { pos: new THREE.Vector3(C.x + Math.sin(a) * r, C.y + h, C.z + Math.cos(a) * r), target: C.clone() }; };
    }
    if (name === 'handheld') {
      const r = dist0 || R * 2.2;
      return (u, tSec) => { const a = az0 + u * Math.PI * 2; const jx = Math.sin(tSec * 1.7) * R * 0.05 + Math.sin(tSec * 3.3 + 1.2) * R * 0.03; const jy = Math.cos(tSec * 1.9) * R * 0.04 + Math.sin(tSec * 4.1) * R * 0.02; const look = C.clone().add(new THREE.Vector3(Math.sin(tSec * 0.7) * R * 0.03, Math.sin(tSec * 1.1) * R * 0.03, Math.cos(tSec * 0.6) * R * 0.02)); return { pos: new THREE.Vector3(C.x + Math.sin(a) * r + jx, camera.position.y + jy * 0.5, C.z + Math.cos(a) * r), target: look }; };
    }
    return (u) => ({ pos: camera.position.clone(), target: C.clone() });
  }
  function playMove(name, durMs, loop) {
    if (!name) return;
    stopCamControl();
    moving = { name, gen: moveGen(name), t0: performance.now(), dur: durMs || 6000, loop: !!loop };
    controls.enabled = false;
    if (controls.autoRotate) { userRotateWasOn = true; controls.autoRotate = false; }
  }
  function stepCamera(dtMs) {
    if (tween) {
      const t = clamp((performance.now() - tween.t0) / (tween.dur || 800), 0, 1);
      const e = easeInOutCubic(t);
      camera.position.lerpVectors(tween.from, tween.to, e);
      controls.target.lerpVectors(tween.fromT, tween.toT, e);
      if (tween.upTo) camera.up.lerpVectors(tween.upFrom, tween.upTo, e);
      camera.lookAt(controls.target);
      if (t >= 1) { camera.up.set(0, 1, 0); const d = tween.onDone; tween = null; controls.enabled = true; if (userRotateWasOn) { controls.autoRotate = true; userRotateWasOn = false; } controls.update(); if (d) d(); }
      return true;
    }
    if (moving) {
      const now = performance.now();
      let el = now - moving.t0;
      if (moving.loop && moving.dur > 0) el = el % moving.dur;
      else if (el > moving.dur) {
        const fin = moving.gen(1, moving.dur / 1000);
        camera.position.copy(fin.pos); camera.lookAt(fin.target); controls.target.copy(fin.target);
        stopCamControl(); return true;
      }
      const u = moving.dur > 0 ? el / moving.dur : 0;
      const s = moving.gen(clamp(u, 0, 1), el / 1000);
      camera.position.copy(s.pos); camera.lookAt(s.target); controls.target.copy(s.target);
      return true;
    }
    return false;
  }
  function isMoving() { return !!(tween || moving); }

  /* ------- frame guide overlay ------- */
  function buildGuide() {
    const host = document.getElementById('guideFrame');
    if (!host) return;
    host.innerHTML = '';
    const col = document.createElement('div'); col.className = 'col';
    const inner = document.createElement('div'); inner.className = 'inner';
    const t = document.createElement('div'); t.className = 't';
    col.append(inner, t); host.appendChild(col);
  }
  function updateGuide(visible) {
    if (visible !== undefined) state.guideVisible = !!visible;
    const host = document.getElementById('guideFrame');
    if (!host) return;
    if (!host.querySelector('.col')) buildGuide();
    const on = state.guideVisible;
    const col = host.querySelector('.col'); const t = host.querySelector('.t');
    const fmt = FORMATS[state.format] || FORMATS['9:16'];
    const aspect = fmt.w / fmt.h;
    const vw = innerWidth, vh = innerHeight;
    host.style.display = on ? 'flex' : 'none';
    if (!on) return;
    let w, h;
    if (aspect < vw / vh) { h = vh; w = vh * aspect; } else { w = vw; h = vw / aspect; }
    col.style.width = w + 'px'; col.style.height = h + 'px';
    col.style.background = 'transparent'; col.style.boxShadow = '0 0 0 9999px rgba(4,5,8,.5)';
    if (t) t.textContent = fmt.label + ' · safe area';
  }
  function setFormat(key) {
    state.format = key;
    document.querySelectorAll('.fmt-chip').forEach((c) => c.classList.toggle('on', c.dataset.fmt === key));
    updateGuide();
  }

  /* ------- anim player ------- */
  let activeMixer = null, animPlaying = false;
  function clipsFlat() {
    const out = [];
    state.models.forEach((rec) => (rec.group.animations || []).forEach((clip) => out.push({ modelId: rec.id, group: rec.group, clip })));
    return out;
  }
  function activateClip(index) {
    const clips = clipsFlat();
    if (!clips.length) return;
    const pick = clips[clamp(index || 0, 0, clips.length - 1)];
    try {
      if (activeMixer) { activeMixer.mixer.stopAllAction(); activeMixer.mixer.uncacheRoot(activeMixer.group); activeMixer = null; }
      const mixer = new THREE.AnimationMixer(pick.group);
      const action = mixer.clipAction(pick.clip);
      action.reset().play();
      activeMixer = { mixer, group: pick.group };
      animPlaying = true;
      const btn = document.getElementById('btnAnim'); if (btn) btn.textContent = '⏸ Pause';
      toast('▶ Playing "' + pick.clip.name + '"');
    } catch (e) { toast('Animation error: ' + e.message, true); }
  }
  function toggleAnim() {
    const clips = clipsFlat();
    if (!clips.length) { toast('No animation clips in this model.', true); return; }
    if (animPlaying && activeMixer) { activeMixer.mixer.stopAllAction(); activeMixer = null; animPlaying = false; const btn = document.getElementById('btnAnim'); if (btn) btn.textContent = '▶ Play'; return; }
    const ci = parseInt(document.getElementById('clipSel') && document.getElementById('clipSel').value || '0', 10);
    activateClip(Number.isFinite(ci) ? ci : 0);
  }

  /* ------- capture / export ------- */
  let rec = null, recChunks = [], recFormat = '9:16';
  function captureBlob(scale, cb) {
    const c = renderer.domElement;
    const out = document.createElement('canvas');
    out.width = Math.round(c.width * (scale || 1)); out.height = Math.round(c.height * (scale || 1));
    const ctx = out.getContext('2d');
    ctx.drawImage(c, 0, 0, out.width, out.height);
    stampBrand(ctx, out.width, out.height);
    out.toBlob(cb, 'image/png');
  }
  function renderAt(fmtKey, scale, fn) {
    const fmt = FORMATS[fmtKey] || FORMATS['9:16'];
    const W = Math.round(fmt.w * (scale || 1)), H = Math.round(fmt.h * (scale || 1));
    const prevAspect = camera.aspect, prevPR = renderer.getPixelRatio();
    const prevW = renderer.domElement.width, prevH = renderer.domElement.height;
    try {
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setPixelRatio(1); renderer.setSize(W, H, false);
      renderer.render(scene, camera);
      fn(W, H);
    } finally {
      camera.aspect = prevAspect; camera.updateProjectionMatrix();
      renderer.setPixelRatio(prevPR); renderer.setSize(prevW / (prevPR || 1), prevH / (prevPR || 1), false);
      renderer.render(scene, camera);
    }
  }
  function exportPhoto(fmtKey, label, scale) {
    renderAt(fmtKey || state.format, scale || 1, (W, H) => {
      captureBlob(1, (blob) => {
        if (!blob) { toast('Photo export failed.', true); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (label || 'shot') + '_' + W + 'x' + H + '_' + Date.now() + '.png';
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
        toast('📸 Saved ' + W + '×' + H + ' PNG');
      });
    });
  }
  function export4k() {
    const fmt = FORMATS[state.format];
    const longSide = Math.max(fmt.w, fmt.h);
    const scale = clamp(3840 / longSide, 1, 2);
    exportPhoto(state.format, 'studio-4k', scale);
  }
  function letterboxCanvas(fmtKey, on) {
    const fmt = FORMATS[fmtKey] || FORMATS['9:16'];
    const a = fmt.w / fmt.h;
    if (!on) { canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;touch-action:none;'; return; }
    const vw = innerWidth, vh = innerHeight;
    let w = vh * a, h = vh; if (w > vw) { w = vw; h = vw / a; }
    canvas.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:block;touch-action:none;background:#000;box-shadow:0 0 0 9999px #000;';
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  }
  function toggleRecord() {
    try {
      if (rec) { rec.stop(); return; }
      const c = renderer.domElement;
      if (!c.captureStream) { toast('Video recording needs Chrome/Edge/Firefox desktop.', true); return; }
      recFormat = state.format;
      const fmt = FORMATS[recFormat];
      stopCamControl();
      const prevAspect = camera.aspect, prevPR = renderer.getPixelRatio();
      const prevW = renderer.domElement.width, prevH = renderer.domElement.height;
      camera.aspect = fmt.w / fmt.h; camera.updateProjectionMatrix();
      renderer.setPixelRatio(1); renderer.setSize(fmt.w, fmt.h, false);
      letterboxCanvas(recFormat, true);
      const stream = c.captureStream(30);
      const mime = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) ? 'video/webm;codecs=vp9' : 'video/webm';
      rec = new MediaRecorder(stream, { mimeType: mime });
      recChunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(recChunks, { type: 'video/webm' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'studio_' + fmt.label.replace(/\s/g, '_') + '_' + fmt.w + 'x' + fmt.h + '_' + Date.now() + '.webm';
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
        rec = null;
        camera.aspect = prevAspect; camera.updateProjectionMatrix();
        renderer.setPixelRatio(prevPR); renderer.setSize(prevW / (prevPR || 1), prevH / (prevPR || 1), false);
        letterboxCanvas(null, false); renderer.render(scene, camera);
        syncRec(false); stopCamControl();
        toast('🎬 Video saved (' + fmt.w + '×' + fmt.h + ')');
      };
      rec.start(250);
      syncRec(true);
      toast('⏺ Recording ' + fmt.label + ' — Stop when done.');
    } catch (e) {
      toast('Record error: ' + e.message, true);
      if (rec) { try { rec.stop(); } catch (e2) {} rec = null; }
      syncRec(false); letterboxCanvas(null, false);
    }
  }
  function syncRec(on) {
    const badge = document.getElementById('recBadge');
    const b1 = document.getElementById('btnRec'), b2 = document.getElementById('btnRec2');
    if (b1) b1.textContent = on ? '⏹ Stop' : '⏺️ Record Video';
    if (b2) b2.textContent = on ? '⏹' : '⏺️';
    if (badge) { badge.style.display = on ? 'flex' : 'none'; badge.textContent = 'REC ' + (FORMATS[recFormat] ? FORMATS[recFormat].label : ''); if (on) { const dot = document.createElement('span'); dot.className = 'dot'; badge.prepend(dot); } }
  }

  /* ------- rotate ------- */
  function toggleRotate(on) {
    controls.autoRotate = (on !== undefined) ? !!on : !controls.autoRotate;
    return controls.autoRotate;
  }

  /* ------- loop ------- */
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const custom = stepCamera(dt * 1000);
    if (!custom) controls.update();
    if (activeMixer) { try { activeMixer.mixer.update(dt); } catch (e) {} }
    renderer.render(scene, camera);
  }
  function startLoop() { animate(); }

  /* ------- global DOM wiring that never changes across versions ------- */
  function bindGlobalUI() {
    const fi = document.getElementById('file');
    if (fi) fi.addEventListener('change', (e) => loadFiles(e.target.files));
    const bu = document.getElementById('btnUpload'); if (bu) bu.addEventListener('click', () => fi && fi.click());
    const db = document.getElementById('btnDemoBike'); if (db) db.addEventListener('click', () => loadDemo('Demo BBQ Bike'));
    const dc = document.getElementById('btnDemoCup'); if (dc) dc.addEventListener('click', () => loadDemo('Demo Coffee Set'));
    document.querySelectorAll('.fmt-chip').forEach((chip) => chip.addEventListener('click', () => S.setFormat(chip.dataset.fmt)));
    const ps = document.getElementById('partSel');
    if (ps) ps.addEventListener('change', (e) => { const v = e.target.value; selectPartIndex(v === '' ? null : parseInt(v, 10)); });
    const bh = document.getElementById('btnHidePart'); if (bh) bh.addEventListener('click', () => { const s = state.selectedPart; if (!s) return; s.mesh.visible = !s.mesh.visible; toast(s.mesh.visible ? 'Part shown' : 'Part hidden'); });
    const br = document.getElementById('btnResetPart'); if (br) br.addEventListener('click', () => { resetPart(state.selectedPart); syncPartInputs(); toast('Part reset'); });
    const pc = document.getElementById('partColor'); if (pc) pc.addEventListener('input', () => { if (state.selectedPart) recolorPart(state.selectedPart.mesh, pc.value); });
    const ms = document.getElementById('matSel'); if (ms) ms.addEventListener('change', () => { const t = ms.value; if (t && state.selectedPart) { applyFinish(state.selectedPart.mesh, t); toast('Finish applied ✨'); } ms.value = ''; });
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('input', fn); };
    bind('px', () => { if (state.selectedPart) { movePart(state.selectedPart.mesh, +$('px').value, state.selectedPart.mesh.position.y, state.selectedPart.mesh.position.z); out('pxv', (+$('px').value).toFixed(2)); } });
    bind('py', () => { if (state.selectedPart) { movePart(state.selectedPart.mesh, state.selectedPart.mesh.position.x, +$('py').value, state.selectedPart.mesh.position.z); out('pyv', (+$('py').value).toFixed(2)); } });
    bind('pz', () => { if (state.selectedPart) { movePart(state.selectedPart.mesh, state.selectedPart.mesh.position.x, state.selectedPart.mesh.position.y, +$('pz').value); out('pzv', (+$('pz').value).toFixed(2)); } });
    bind('ry', () => { if (state.selectedPart) { rotatePartY(state.selectedPart.mesh, +$('ry').value); out('ryv', $('ry').value + '°'); } });
    bind('sc', () => { if (state.selectedPart) { scalePart(state.selectedPart.mesh, +$('sc').value); out('scv', (+$('sc').value).toFixed(2) + '×'); } });
    const ba = document.getElementById('btnAnim'); if (ba) ba.addEventListener('click', toggleAnim);
    const br2 = document.getElementById('btnRestart'); if (br2) br2.addEventListener('click', () => { const v = document.getElementById('clipSel'); const ci = parseInt(v && v.value || '0', 10); activateClip(Number.isFinite(ci) ? ci : 0); });
    const cs = document.getElementById('clipSel'); if (cs) cs.addEventListener('change', () => { if (cs.value !== '') { const ci = parseInt(cs.value, 10); activateClip(Number.isFinite(ci) ? ci : 0); } });
    const bShot = document.getElementById('btnShot'); if (bShot) bShot.addEventListener('click', () => exportPhoto(state.format, 'commercial'));
    const bShot2 = document.getElementById('btnShot2'); if (bShot2) bShot2.addEventListener('click', () => exportPhoto(state.format, 'commercial'));
    const b4k = document.getElementById('btn4k'); if (b4k) b4k.addEventListener('click', export4k);
    const bRec = document.getElementById('btnRec'); if (bRec) bRec.addEventListener('click', toggleRecord);
    const bRec2 = document.getElementById('btnRec2'); if (bRec2) bRec2.addEventListener('click', toggleRecord);

    window.addEventListener('dragover', (e) => e.preventDefault());
    const ov = document.getElementById('dropOverlay');
    window.addEventListener('dragenter', (e) => { e.preventDefault(); if (ov) ov.style.display = 'flex'; });
    window.addEventListener('dragleave', (e) => { if (!e.relatedTarget && ov) ov.style.display = 'none'; });
    window.addEventListener('drop', (e) => {
      e.preventDefault(); if (ov) ov.style.display = 'none';
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) loadFiles(files);
    });
    window.addEventListener('resize', () => { setCanvasSize(); updateGuide(); });
  }
  const out = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  /* ======================================================================
   *  SCENE-STATE BACKBONE (Creator Hub): full snapshot / restore of the
   *  live scene (models with provenance, part transforms + finishes +
   *  colors, stage lighting, backdrop, camera). Powers projects, undo/redo,
   *  autosave and scene presets without duplicating logic.
   * ====================================================================== */
  function r2(v) { return Math.round((v || 0) * 1000) / 1000; }
  function snapCore() {
    const models = state.models.map((rec) => ({
      name: rec.name,
      src: (rec._src && rec._src.k !== 'unknown') ? JSON.parse(JSON.stringify(rec._src)) : srcGuess(rec.name, null),
      x: r2(rec.group.position.x), y: r2(rec.group.position.y), z: r2(rec.group.position.z),
      ry: r2(rec.group.rotation.y), s: r2(rec.group.scale.x),
      visible: !!rec.visible,
      parts: rec.meshes.map((m, i) => ({
        p: [r2(m.position.x), r2(m.position.y), r2(m.position.z)],
        e: [r2(m.rotation.x), r2(m.rotation.y), r2(m.rotation.z)],
        s: [r2(m.scale.x), r2(m.scale.y), r2(m.scale.z)],
        vis: m.visible !== false,
        fin: (rec._fin && rec._fin[i]) || null,
        col: meshColor(m),
      })),
    }));
    return {
      v: 1,
      models,
      stage: {
        light: S_light.state.envName,
        format: state.format,
        guide: !!state.guideVisible,
        grid: !!uiState.grid,
        floorGloss: !!uiState.floorGloss,
        shadows: !!uiState.shadows,
        bg: (hdriActive || (scene.background && scene.background.isTexture)) ? 'tex' : ('#' + (scene.background ? scene.background.getHexString() : '14161c')),
        cam: { p: camera.position.toArray(), t: controls.target.toArray() },
      },
    };
  }
  function stopAnyAnim() {
    if (activeMixer) { try { activeMixer.mixer.stopAllAction(); } catch (e) {} activeMixer = null; animPlaying = false; const b = document.getElementById('btnAnim'); if (b) b.textContent = '▶ Play'; }
  }
  async function wipeAllModels() {
    stopAnyAnim();
    const ids = state.models.map((r) => r.id);
    ids.forEach((id) => removeModel(id, { quiet: true }));
    state.selectedPart = null;
    const sel = document.getElementById('partSel'); if (sel) sel.value = '';
    const pc = document.getElementById('partCtrls'); if (pc) pc.style.display = 'none';
    emitProducts();
    refreshAllUI();
  }
  async function applyCore(core) {
    if (!core || !Array.isArray(core.models)) return;
    setHistoryMute(true);
    try {
      await wipeAllModels();
      for (const md of core.models) {
        if (!md || !md.name) continue;
        let rec = null;
        try {
          const src = md.src || {};
          if (src.k === 'demo' && DEMOS[src.name]) rec = await parseBuffer(b64ToArrayBuffer(DEMOS[src.name]), src.name, { quiet: true, noFrame: true });
          else if (src.k === 'user' && src.b64) rec = await parseBuffer(b64ToArrayBuffer(src.b64), src.name, { quiet: true, noFrame: true });
          else if (src.k === 'user' && src.text) rec = await parseBuffer(src.text, src.name, { quiet: true, noFrame: true });
          else if (src.k === 'proc') {
            const a = ASSETMAP[src.key];
            if (a && typeof a.make === 'function') rec = addObject3D(a.make(), md.name || a.name, { quiet: true, noFrame: true, _src: { k: 'proc', key: src.key } });
          } else if (DEMOS[md.name]) rec = await parseBuffer(b64ToArrayBuffer(DEMOS[md.name]), md.name, { quiet: true, noFrame: true });
          else if (typeof ASSETMAP !== 'undefined') {
            const a = Object.values(ASSETMAP).find((x) => x && x.name === md.name && typeof x.make === 'function');
            if (a) rec = addObject3D(a.make(), md.name, { quiet: true, noFrame: true, _src: { k: 'proc', key: a.key } });
          }
        } catch (e) { console.warn('scene restore skip', md.name, e); }
        if (!rec) continue;
        const g = rec.group;
        g.position.set(md.x || 0, md.y !== undefined ? md.y : 0, md.z || 0);
        g.rotation.set(0, md.ry || 0, 0);
        if (md.s) g.scale.setScalar(Math.max(0.01, md.s));
        g.visible = md.visible !== false;
        rec.visible = md.visible !== false;
        const parts = md.parts || [];
        rec.meshes.forEach((m, i) => {
          const p = parts[i];
          if (!p) return;
          if (Array.isArray(p.p)) m.position.set(p.p[0] || 0, p.p[1] || 0, p.p[2] || 0);
          if (Array.isArray(p.e)) m.rotation.set(p.e[0] || 0, p.e[1] || 0, p.e[2] || 0);
          if (Array.isArray(p.s)) m.scale.set(p.s[0] || 1, p.s[1] || 1, p.s[2] || 1);
          m.visible = p.vis !== false;
          rec._fin[i] = p.fin || null;
          if (p.fin) { try { applyFinish(m, p.fin); } catch (e) {} rec._fin[i] = p.fin; }
          if (p.col) { try { recolorPart(m, p.col); } catch (e) {} }
        });
      }
      const st = core.stage || {};
      if (st.light) { try { setLightingPreset(st.light, true); } catch (e) {} }
      if (st.format) setFormat(st.format);
      if (st.guide !== undefined) updateGuide(!!st.guide);
      if (st.grid !== undefined) setGrid(!!st.grid);
      if (st.floorGloss !== undefined) setFloorGloss(!!st.floorGloss);
      if (st.shadows !== undefined) setShadows(!!st.shadows);
      if (st.bg && /^#/.test(st.bg)) { try { setBackdropColor(st.bg); } catch (e) {} }
      if (st.cam && Array.isArray(st.cam.p) && Array.isArray(st.cam.t)) { try { setCamView(st.cam); } catch (e) {} }
      emitProducts();
      refreshAllUI();
      try { if (typeof S._afterLoad === 'function') S._afterLoad(); } catch (e) {}
    } finally {
      setHistoryMute(false);
    }
  }

  /* ---- instant camera shots (used by hero exports + camera presets) ---- */
  function shotPoint(name, opts) {
    const o = opts || {};
    const { center: C, radius: R } = productBounds();
    const baseK = { front: 4.9, '45': 4.8, side: 4.9, rear: 4.9, top: 5.4, hero: 5.6, macro: 2.1, detail: 3.4, pour: 3.8 };
    const k = o.distK || baseK[name] || 4.8;
    const m = o.mult || 1;
    const d = Math.max(R * k * m, R * 0.3);
    const yB = (o.yBias !== undefined) ? o.yBias : 0;
    const target = C.clone();
    let to, upTo = null;
    if (name === 'front') to = new THREE.Vector3(C.x, target.y + d * 0.16 + yB, C.z + d);
    else if (name === '45') { const dir = new THREE.Vector3(0.62, 0, 0.62).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y + d * 0.2 + yB; }
    else if (name === 'side') to = new THREE.Vector3(C.x + d, target.y + d * 0.1 + yB, C.z);
    else if (name === 'rear') to = new THREE.Vector3(C.x, target.y + d * 0.16 + yB, C.z - d);
    else if (name === 'top') { to = new THREE.Vector3(C.x, C.y + d * 1.15 + yB, C.z + 0.001); upTo = new THREE.Vector3(0, 0, -1); }
    else if (name === 'hero') { const dir = new THREE.Vector3(0.55, 0, 0.83).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y - R * 0.04 + d * 0.05 + yB; }
    else if (name === 'macro') { const dir = new THREE.Vector3(0.5, 0, 0.86).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y - R * 0.1 + d * 0.14 + yB; }
    else if (name === 'detail') { const dir = new THREE.Vector3(0.55, 0, 0.83).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y + d * 0.15 + yB; }
    else if (name === 'pour') { const dir = new THREE.Vector3(0.42, 0, 0.9).normalize(); to = C.clone().addScaledVector(dir, d); to.y = target.y - R * 0.05 + d * 0.26 + yB; }
    else { const dir = new THREE.Vector3(1, 0.4, 1).normalize(); to = C.clone().addScaledVector(dir, d); }
    return { to, target, upTo };
  }
  function setFrame(name, opts) {
    const sh = shotPoint(name, opts);
    stopCamControl();
    controls.target.copy(sh.target);
    if (sh.upTo) camera.up.copy(sh.upTo);
    camera.position.copy(sh.to);
    camera.lookAt(controls.target);
    controls.update();
    return true;
  }
  function getCamView() { return { p: camera.position.toArray(), t: controls.target.toArray() }; }
  function setCamView(v) {
    stopCamControl();
    if (v && Array.isArray(v.p)) camera.position.fromArray(v.p);
    if (v && Array.isArray(v.t)) controls.target.fromArray(v.t);
    camera.up.set(0, 1, 0);
    camera.lookAt(controls.target);
    controls.update();
  }

  /* ---- render the current view to a PNG at the chosen format/scale.
     transparent = true clears the background + stage helpers so alpha pixels
     carry only the product cut-out. opts.w/opts.h render an exact size. */
  function renderBlob(fmtKey, opts) {
    return new Promise((resolve, reject) => {
      let o = opts || {};
      if (fmtKey && typeof fmtKey === 'object') { o = fmtKey; fmtKey = null; }
      const trans = !!o.transparent;
      const exactW = Math.round(o.w || 0), exactH = Math.round(o.h || 0);
      let prevBg = null, prevClear;
      const stageHelpers = () => { try { gridHelper.visible = false; groundShadow.visible = false; groundGloss.visible = false; } catch (e) {} };
      const restHelpers = () => { try { gridHelper.visible = S.gridState.grid; groundShadow.visible = S.gridState.shadows && !S.gridState.floorGloss && !S.gridState.grid; groundGloss.visible = S.gridState.floorGloss; } catch (e) {} };
      try {
        if (trans) { prevBg = scene.background; scene.background = null; prevClear = renderer.getClearColor(new THREE.Color()).clone(); renderer.setClearColor(0x000000, 0); stageHelpers(); }
        const done = (W, H) => {
          const c = document.createElement('canvas');
          c.width = W; c.height = H;
          const ctx = c.getContext('2d');
          if (!trans) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
          ctx.drawImage(renderer.domElement, 0, 0, W, H);
          if (o.stamp !== false) stampBrand(ctx, W, H);
          c.toBlob((b) => { if (b) resolve(b); else reject(new Error('PNG encode failed')); }, 'image/png');
        };
        if (exactW && exactH) {
          const aspect0 = camera.aspect, pr0 = renderer.getPixelRatio();
          const dw0 = renderer.domElement.width, dh0 = renderer.domElement.height;
          try {
            camera.aspect = exactW / exactH; camera.updateProjectionMatrix();
            renderer.setPixelRatio(1); renderer.setSize(exactW, exactH, false);
            renderer.render(scene, camera);
            done(exactW, exactH);
          } finally {
            camera.aspect = aspect0; camera.updateProjectionMatrix();
            renderer.setPixelRatio(pr0); renderer.setSize(dw0, dh0, false);
            renderer.render(scene, camera);
          }
        } else {
          renderAt(fmtKey || state.format, o.scale || 1, (W, H) => done(W, H));
        }
      } catch (e) { reject(e); }
      finally {
        if (trans) { scene.background = prevBg; if (prevClear) renderer.setClearColor(prevClear, 1); restHelpers(); renderer.render(scene, camera); }
      }
    });
  }

  /* assemble public API */
  Object.assign(S, {
    renderer, scene, camera, controls, state,
    setFormat, exportPhoto, export4k, toggleRecord, syncRec,
    frame, playMove, stopCamControl, isMoving, setFrame,
    getCamView, setCamView,
    renderBlob,
    snapCore, applyCore,
    markEdit, setHistoryMute, onEdit,
    setLightingPreset, applyMasterIntensity, setShadowSoft, setShadows, setFloorGloss, setGrid, gridState: S.gridState,
    loadHDRIFile, setBackdropColor, loadBackdropImage, hdriActive: () => hdriActive,
    loadDemo, loadFiles, addFromBuffer, addObject3D, duplicateModel, removeModel, productBounds,
    nextPlaceOffset, onProductsChange,
    selectPartIndex, syncPartInputs, resetPart, recolorPart, applyFinish,
    toggleAnim, activateClip, clipsFlat, refreshAllUI, refreshModelList, refreshPartSelect, refreshClipList,
    toggleRotate, updateGuide, buildGuide, bindGlobalUI, startLoop,
    bounds: productBounds, formatOf: () => state.format, LIGHT_PRESETS,
    listPresets: Object.keys(LIGHT_PRESETS),
    versionState: { activeId: null },
    userTemp: () => S_light.state.userTemp,
    lightName: () => S_light.state.envName,
    brand: {
      apply: applyBrandKit,
      kit: () => brandKit,
      refresh: brandRefresh,
      watermarkOn: (on) => { brandWater = !!on; refreshBrandOverlay(); },
      watermarkVisible: wmVisible,
      showIntro: (ms) => showBrandCard('intro', ms),
      showOutro: (ms) => showBrandCard('outro', ms),
    },
    THREE,
  });
  return S;
}
