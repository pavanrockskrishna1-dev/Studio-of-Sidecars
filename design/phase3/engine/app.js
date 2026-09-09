import * as THREE from 'three';
/* ENGINE · app.js — Phase 3 orchestrator. Boots modules, binds the locked UI, owns the loop.
   UI DOM (ids, hierarchy, V1-V6, dock, inspector, trays, HUD) is untouched — engine only
   drives states + fills overlay hosts (#sosOv/#saveOv) with runtime content. */
import { CFG, CAM_PRESETS, CAM_ALIAS, LIGHT_PRESETS, LIGHT_LOOK, MAT_FINISHES, FLOORS, FORMATS, RES_LEVELS, EXPORT_STILLS, LIMITS } from './config.js';
import * as Renderer from './renderer.js';
import * as SceneMod from './scene.js';
import * as CameraMod from './camera.js';
import * as ControlsMod from './controls.js';
import * as EnvMod from './environment.js';
import * as LightMod from './lighting.js';
import * as MatMod from './materials.js';
import * as AssetMod from './assets.js';
import * as SelMod from './selection.js';
import * as TrMod from './transform.js';
import * as ExpMod from './export.js';
import * as HistMod from './history.js';
import * as PerfMod from './performance.js';
import * as OnbMod from './onboarding.js';

function makeBus() {
  const m = {};
  return {
    on(ev, fn) { (m[ev] = m[ev] || []).push(fn); },
    emit(ev, ...a) { (m[ev] || []).forEach(fn => { try { fn(...a); } catch (e) { console.error('[bus]', ev, e); } }); },
  };
}

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function boot() {
  const bus = makeBus();
  const engine = { bus, canvas: $('#cv'), _noHistory: false };
  engine.dom = {
    stage: $('.canvas'), toggles: $('#stDemo, #stEmpty'),
    statusPills: $$('.cv-status .pill'), tag: $('.cv-tag'), legend: $('.cv-legend'),
    hint: $('.cv-hint'), overlay: $('#sosOv'), splash: $('#sosSplash'), saveOv: $('#saveOv'),
  };
  window.P3 = engine;
  console.info('Phase 3 engine · ' + CFG.version);

  // ---------- viewport geometry ----------
  function placeCanvas() {
    const st = engine.dom.stage;
    if (!st) return;
    const r = st.getBoundingClientRect();
    const W = Math.max(2, Math.round(r.width)), H = Math.max(2, Math.round(r.height));
    engine.canvas.style.left = r.left + 'px';
    engine.canvas.style.top = r.top + 'px';
    engine.canvas.style.position = 'absolute';
    engine.canvas.style.display = 'block';
    Renderer.resizeTo(engine, W, H, engine.perf ? engine.perf.dpr : 1);
    // camera aspect
    if (engine.camera) { engine.camera.aspect = W / H; engine.camera.updateProjectionMatrix(); }
  }
  // wait until layout of stage is settled
  requestAnimationFrame(() => {
    placeCanvas();
    const ro = new ResizeObserver(() => placeCanvas());
    if (engine.dom.stage) ro.observe(engine.dom.stage);
    addEventListener('resize', () => placeCanvas());
  });

  // ---------- core modules (order matters) ----------
  Renderer.init(engine);
  PerfMod.init(engine);
  SceneMod.init(engine);
  EnvMod.init(engine);
  LightMod.init(engine);
  CameraMod.init(engine);
  ControlsMod.init(engine);
  AssetMod.init(engine);
  MatMod.indexParts(engine);
  OnbMod.init(engine);
  const api = { ...SceneMod, ...CameraMod, ...ControlsMod, ...EnvMod, ...LightMod, ...MatMod, ...AssetMod, ...SelMod, ...TrMod, ...ExpMod, ...HistMod, ...PerfMod, ...OnbMod };
  Object.assign(engine, api);
  SelMod.init(engine);
  TrMod.init(engine);
  ExpMod.init(engine);
  HistMod.init(engine);
  engine.still = ExpMod.still; engine.record = ExpMod.record; engine.glb = ExpMod.glb;
  engine.download = ExpMod.download; engine.setFormat = ExpMod.setFormat; engine.jsonState = ExpMod.jsonState;
  // bound conveniences so bare engine.x() calls (no engine arg) are safe for UI/devtool use
  engine.undo = () => HistMod.undo(engine);
  engine.redo = () => HistMod.redo(engine);
  engine.canUndo = () => HistMod.canUndo(engine);
  engine.canRedo = () => HistMod.canRedo(engine);
  engine.push = label => push(label);
  engine.selectPart = (part, mesh) => SelMod.selectPart(engine, part || null, mesh || (part && part.mesh) || null);
  engine.selectModel = model => SelMod.selectModel(engine, model);
  engine.applyFinish = label => MatMod.applyFinish(engine, label);
  engine.setTransformMode = m => TrMod.setMode(engine, m);
  engine.setCameraPreset = (p, o) => CameraMod.setPreset(engine, p, o || {});
  engine.setEnvKey = (k, o) => EnvMod.setEnv(engine, k, o || {});
  engine.applyLightPreset = k => LightMod.applyPreset(engine, k);
  engine.buildFloorPreset = k => SceneMod.buildFloor(engine, k);
  engine.setRes = r => ExpMod.setRes(engine, r);

  // ---------- state ----------
  engine.state = { version: 'V2', tool: 'select', mode: 'demo', format: '9:16 reel', res: '1080p' };

  engine.snapshotState = () => ({
    models: engine.models.map(m => ({
      url: m.url, isDemo: !!m.isDemo, isSecondary: !!m.isSecondary,
      pos: m.root.position.toArray(), quat: m.root.quaternion.toArray(), scale: m.root.scale.toArray(),
      visible: m.root.visible, locked: !!m.locked,
    })),
    matOverrides: engine.matOverrides || {},
    env: engine.env.key, floor: engine.floor.preset,
    light: engine.light.look, look: engine.light.override, intensity: engine.light.intensity, temp: engine.light.temp,
    format: engine.exportCfg.format, res: engine.exportCfg.res,
    cam: engine.cameraMode || '¾ hero',
    customCam: { pos: engine.camera.position.toArray(), target: engine.controls.target.toArray() },
  });

  engine.applyState = async st => {
    engine._noHistory = true;
    try {
      SceneMod.clearModels(engine);          // keep object URLs alive
      engine.matOverrides = st.matOverrides || {};
      for (const s of st.models) {
        try {
          const e = await AssetMod.loadModel(engine, s.url, { isDemo: s.isDemo, isSecondary: s.isSecondary });
          if (!e) continue;
          e.root.position.fromArray(s.pos);
          e.root.quaternion.fromArray(s.quat);
          e.root.scale.fromArray(s.scale);
          e.root.visible = s.visible;
          e.locked = s.locked;
        } catch (err) { console.warn('restore model fail', s.url, err); }
      }
      if (st.env) await EnvMod.setEnv(engine, st.env, { immediate: true });
      if (st.floor) SceneMod.buildFloor(engine, st.floor);
      if (st.light) LightMod.applyPreset(engine, st.light, { silent: true });
      if (st.look) LightMod.applyOverride(engine, st.look, true);
      if (st.intensity != null) LightMod.setIntensity(engine, st.intensity);
      if (st.temp) LightMod.setTemperature(engine, st.temp);
      engine.exportCfg.format = st.format || engine.exportCfg.format;
      engine.exportCfg.res = st.res || engine.exportCfg.res;
      if (st.cam && CAM_PRESETS[st.cam]) CameraMod.setPreset(engine, st.cam, { instant: true });
      else if (st.customCam) CameraMod.snap(engine,
        new THREE.Vector3().fromArray(st.customCam.pos),
        new THREE.Vector3().fromArray(st.customCam.target));
      engine.cameraMode = st.cam || '¾ hero';
      refreshAll();
    } finally { engine._noHistory = false; }
  };

  // ---------- UI state helpers ----------
  function push(label) { if (!engine._noHistory) HistMod.push(engine, label); }
  function setChipOn(groupSel, activeText) {
    $$(groupSel).forEach(c => c.classList.toggle('on', c.textContent.trim() === activeText));
  }
  function refreshHUD() {
    const envT = EnvMod.byKey(engine.env.key).title;
    const prod = 'Product';
    const tag = engine.dom.tag;
    if (tag) { tag.innerHTML = `<span class="dot"></span>${envT}`; }
    const fmt = FORMATS[engine.exportCfg.format] || FORMATS['9:16 reel'];
    const pills = engine.dom.statusPills;
    if (pills.length >= 3) {
      pills[0].textContent = `${fmt.key} · ${engine.exportCfg.res}`;
      pills[1].textContent = LightMod.byName(LIGHT_PRESETS, engine.light.look).name;
      pills[2].textContent = engine.perf ? `${engine.perf.fps} fps` : '…';
    }
    if (engine.dom.hint) {
      const tool = engine.toolId || 'select';
      engine.dom.hint.textContent =
        `Drag to orbit · scroll to zoom · tap a part to style · ${tool} tool active`;
    }
    if (engine.dom.legend) engine.dom.legend.textContent = `${prod} · ${envT.toUpperCase()} · PHASE 3 ENGINE`;
  }
  function refreshAll() {
    MatMod.indexParts(engine);
    refreshPartsUI();
    refreshHUD();
    if (engine._syncUI) engine._syncUI();
  }

  // ---------- environment gallery + fade ----------
  function fade(cb) {
    let d = $('#p3fade');
    if (!d) { d = document.createElement('div'); d.id = 'p3fade'; d.className = 'p3-fade'; engine.dom.stage && engine.dom.stage.appendChild(d); }
    d.classList.add('show');
    setTimeout(() => { cb && cb(); setTimeout(() => d.classList.remove('show'), 320); }, 200);
  }
  function buildEnvTiles(container) {
    container.innerHTML = '';
    EnvMod.envList().forEach(c => {
      const prev = c.file ? CFG.envPrev + c.key + '.png' : CFG.envHero;
      const tile = document.createElement('button');
      tile.className = 'p3-tile' + (engine.env.key === c.key ? ' on' : '');
      tile.innerHTML = `<span class="th" style="background-image:url('${prev}')"></span><b>${c.title}</b>`;
      tile.onclick = async () => {
        fade(() => EnvMod.setEnv(engine, c.key));
        [...container.children].forEach(x => x.classList.toggle('on', x === tile));
        push('environment');
      };
      container.appendChild(tile);
    });
  }

  // ---------- generic overlay panel ----------
  let panelCleanup = null;
  function openPanel(title, build, opts = {}) {
    closePanel();
    const host = engine.dom.overlay;
    host.classList.add('p3', 'panel');
    host.hidden = false;
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'p3-panel';
    const head = document.createElement('div');
    head.className = 'p3-panel-head';
    head.innerHTML = `<b>${title}</b><button class="p3-x" title="Close">✕</button>`;
    head.querySelector('.p3-x').onclick = closePanel;
    const body = document.createElement('div');
    body.className = 'p3-panel-body';
    wrap.appendChild(head); wrap.appendChild(body);
    host.appendChild(wrap);
    build(body, closePanel);
    panelCleanup = () => { host.innerHTML = ''; host.hidden = true; host.classList.remove('p3', 'panel'); };
  }
  function closePanel() { if (panelCleanup) panelCleanup(); panelCleanup = null; }

  // ---------- export ----------
  function openExport() {
    openPanel('Export Studio', (body, close) => {
      body.className = 'p3-panel-body p3-export';
      const seg = (label) => `<button class="p3-opt" data-f="${label}">${label}</button>`;
      body.innerHTML = `
        <div class="p3-sec"><label>Canvas format</label><div class="p3-row" data-role="fmt">${Object.keys(FORMATS).map(seg).join('')}</div></div>
        <div class="p3-sec"><label>Resolution</label><div class="p3-row" data-role="res">${RES_LEVELS.map(r => `<button class="p3-opt" data-r="${r.l}">${r.l}</button>`).join('')}</div></div>
        <div class="p3-sec"><label>Stills</label><div class="p3-row">${EXPORT_STILLS.map(t => `<button class="p3-opt primary" data-still="${t}">${t}</button>`).join('')}</div></div>
        <div class="p3-sec"><label>Motion & scene</label><div class="p3-row">
          <button class="p3-opt primary" data-vid="webm">Record reel (WebM)</button>
          <button class="p3-opt" data-scene="glb">GLB</button>
          <button class="p3-opt" data-scene="json">Scene JSON</button>
          <button class="p3-opt" data-scene="blender">Blender Cycles pack</button>
        </div></div>
        <div class="p3-sec sub"><span data-note></span></div>`;
      // sync active chips
      const fmtKey = engine.exportCfg.format;
      body.querySelectorAll('[data-role="fmt"] .p3-opt').forEach(b => b.classList.toggle('on', b.dataset.f === fmtKey));
      body.querySelectorAll('[data-role="res"] .p3-opt').forEach(b => b.classList.toggle('on', b.dataset.r === engine.exportCfg.res));
      body.querySelector('[data-note]').textContent =
        'Exports honour the current camera + environment + floor. PNG/JPG sized to the canvas format/res; transparent drops the backdrop.';
      body.onclick = async e => {
        const b = e.target.closest('.p3-opt'); if (!b) return;
        if (b.dataset.f) { ExpMod.setFormat(engine, b.dataset.f); body.querySelectorAll('[data-role="fmt"] .p3-opt').forEach(x => x.classList.toggle('on', x === b)); }
        else if (b.dataset.r) { engine.exportCfg.res = b.dataset.r; body.querySelectorAll('[data-role="res"] .p3-opt').forEach(x => x.classList.toggle('on', x === b)); }
        else if (b.dataset.still) {
          const transparent = b.dataset.still === 'Transparent PNG';
          const type = b.dataset.still === 'JPG' ? 'JPG' : 'PNG';
          b.classList.add('busy'); b.textContent = 'Rendering…';
          try {
            const blob = await ExpMod.still(engine, { type, transparent });
            const ext = (type === 'JPG' ? 'jpg' : 'png');
            ExpMod.download(blob, `sidecar_${engine.exportCfg.format.replace(/\s/g, '_')}_${engine.exportCfg.res}${transparent ? '_cutout' : ''}.${ext}`);
          } catch (err) { console.error(err); }
          finally { b.classList.remove('busy'); b.textContent = b.dataset.still; }
        } else if (b.dataset.vid === 'webm') {
          b.classList.add('busy'); b.textContent = 'Recording…';
          try { const blob = await ExpMod.record(engine, { seconds: 3.4 }); ExpMod.download(blob, `reel_${engine.exportCfg.format.replace(/\s/g, '_')}.webm`); }
          catch (err) { console.error('record', err); }
          finally { b.classList.remove('busy'); b.textContent = 'Record reel (WebM)'; }
        } else if (b.dataset.scene) {
          const glbBlob = new Blob([await ExpMod.glb(engine)], { type: 'model/gltf-binary' });
          ExpMod.download(glbBlob, 'scene.glb');
          if (b.dataset.scene === 'json') { ExpMod.download(new Blob([ExpMod.jsonState(engine)], { type: 'application/json' }), 'scene.json'); }
          if (b.dataset.scene === 'blender') {
            ExpMod.download(new Blob([ExpMod.jsonState(engine)], { type: 'application/json' }), 'scene.json');
            ExpMod.download(new Blob(['# Blender Cycles pack\n# Import scene.glb + scene.json, open 4K cycles preset.\n'], { type: 'text/plain' }), 'CYCLES_PACK.txt');
          }
        }
      };
    }, { wide: true });
  }

  // ---------- settings / projects ----------
  function openSettings() {
    openPanel('Projects · Versions · Engine', body => {
      body.className = 'p3-panel-body p3-settings';
      body.innerHTML = `
        <div class="p3-sec"><label>Studio background (Hero + 10)</label><div class="p3-env" data-env></div></div>
        <div class="p3-sec"><label>Save session</label><div class="p3-row"><input data-name placeholder="Version name (e.g. Golden hero)"><button class="p3-opt primary" data-save>Save version</button></div></div>
        <div class="p3-sec"><label>Saved versions</label><div class="p3-vers" data-vers></div></div>
        <div class="p3-sec"><label>Engine</label><div class="p3-row">
          <button class="p3-opt" data-perf="low">Low-power mode</button>
          <button class="p3-opt" data-reset>Reset camera</button>
          <button class="p3-opt" data-clear>Restore demo session</button>
          <button class="p3-opt" data-reload>Reload models</button>
        </div></div>`;
      buildEnvTiles(body.querySelector('[data-env]'));
      const renderVers = () => {
        const box = body.querySelector('[data-vers]');
        const list = HistMod.listVersions();
        box.innerHTML = list.length ? list.map(v => `<div class="p3-ver"><span>${v.name}</span><small>${new Date(v.at).toLocaleString()}</small><i>
          <button data-load="${v.id}" title="Restore">Restore</button><button data-del="${v.id}" title="Delete">✕</button></i></div>`).join('')
          : '<div class="p3-empty">No saved versions yet — Save session above.</div>';
        box.querySelectorAll('button').forEach(btn => {
          btn.onclick = async () => {
            if (btn.dataset.load) { closePanel(); await HistMod.loadVersion(engine, Number(btn.dataset.load)); refreshAll(); }
            if (btn.dataset.del) { HistMod.deleteVersion(Number(btn.dataset.del)); renderVers(); }
          };
        });
      };
      renderVers();
      body.querySelector('[data-save]').onclick = () => {
        const name = (body.querySelector('[data-name]').value || '').trim();
        HistMod.saveVersion(engine, name || undefined);
        body.querySelector('[data-name]').value = '';
        renderVers();
      };
      body.querySelector('[data-perf]').onclick = e => { const on = e.currentTarget.classList.toggle('on'); PerfMod[on ? 'degrade' : 'restoreQuality'](engine); };
      body.querySelector('[data-reset]').onclick = () => CameraMod.resetView(engine);
      body.querySelector('[data-clear]').onclick = async () => {
        engine._noHistory = true;
        try {
          SceneMod.clearModels(engine);
          await AssetMod.loadDemo(engine);
          await EnvMod.setEnv(engine, 'hero', { immediate: true });
          SceneMod.buildFloor(engine, 'White Studio');
          LightMod.applyPreset(engine, 'Softbox');
          CameraMod.setPreset(engine, '¾ hero', { instant: true });
          refreshAll();
        } finally { engine._noHistory = false; HistMod.clearHistory(engine); }
      };
      body.querySelector('[data-reload]').onclick = async () => {
        closePanel(); engine._noHistory = true;
        try { await engine.applyState(engine.snapshotState()); } finally { engine._noHistory = false; }
        openSettings();
      };
    }, { wide: true });
  }

  // ---------- help ----------
  function openHelp() {
    openPanel('Studio controls', body => {
      body.className = 'p3-panel-body';
      body.innerHTML = `
        <div class="p3-sec"><label>Viewport</label><div class="p3-list">
          <div><b>Drag</b><span>orbit · two-finger drag pans · pinch zooms</span></div>
          <div><b>Tap a part</b><span>select it for materials</span></div>
          <div><b>Demo / Empty</b><span>Empty drops your own GLB sidecar onto the stage</span></div>
        </div></div>
        <div class="p3-sec"><label>Object editor (Select tool)</label><div class="p3-list">
          <div><b>G / R / S</b><span>move · rotate · scale</span></div>
          <div><b>H · L · Del</b><span>hide · lock · delete</span></div>
          <div><b>Z / ⇧Z</b><span>undo / redo</span></div>
          <div><b>Esc</b><span>exit gizmo mode</span></div>
        </div></div>
        <div class="p3-sec"><label>Dock</label><div class="p3-list">
          <div><b>Camera</b><span>Front · ¾ hero · Side · Detail · Top · Orbit spin</span></div>
          <div><b>Lighting</b><span>Softbox · Café · Golden · Night neon · Rim</span></div>
          <div><b>Materials</b><span>Matte · Brushed · Porcelain · Copper · Gloss black</span></div>
          <div><b>Floor</b><span>White · Gloss black · Wood · Concrete · Marble</span></div>
          <div><b>Render</b><span>9:16 reel · square · story · Cycles pack</span></div>
        </div></div>`;
    });
  }

  // ---------- materials list (runtime, truthful to loaded parts) ----------
  let matCard = null;
  function refreshPartsUI() {
    if (!matCard) return;
    const body = matCard.querySelector('.cbody');
    const parts = engine.parts || [];
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'p3-mats';
    const rows = parts.slice(0, 10);
    rows.forEach(p => {
      const row = document.createElement('div');
      row.className = 'p3-part' + (engine.selectedPart && engine.selectedPart.id === p.id ? ' on' : '');
      row.innerHTML = `<span class="sw" style="background:${p.color}"></span>
        <span class="mn"><b>${p.name}</b><span>rough ${Math.round(p.rough * 100)} · metal ${Math.round(p.metal * 100)}</span></span>
        <span class="dots">${['#a', '#b', '#c'].map((_, i) => `<i style="background:${swatchFor(p, i)}"></i>`).join('')}</span>`;
      row.onclick = () => { SelMod.selectPart(engine, p, p.mesh); refreshPartsUI(); };
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
    // advanced sliders for the selected part
    const sel = engine.selectedPart;
    const adv = document.createElement('div');
    adv.className = 'p3-adv';
    adv.innerHTML = sel
      ? `<label>${sel.name} — finish controls</label>
         <div class="p3-sl" data-k="rough"><span>Roughness</span><input type="range" min="0" max="100" value="${Math.round(sel.rough * 100)}"></div>
         <div class="p3-sl" data-k="metal"><span>Metallic</span><input type="range" min="0" max="100" value="${Math.round(sel.metal * 100)}"></div>
         <div class="p3-sl" data-k="op"><span>Opacity</span><input type="range" min="20" max="100" value="${Math.round(sel.op * 100)}"></div>
         <div class="p3-sl" data-k="col"><span>Colour</span><input type="color" value="${sel.color}"></div>
         <div class="p3-row"><button class="p3-opt" data-rst>Reset part</button></div>`
      : '<label>Tap a part in the viewport to fine-tune it here.</label>';
    body.appendChild(adv);
    adv.oninput = e => {
      const t = e.target;
      if (!engine.selectedPart) return;
      const k = t.closest('.p3-sl').dataset.k;
      if (k === 'col') { MatMod.setPartOverride(engine, engine.selectedPart, { color: t.value }); }
      else {
        const v = Number(t.value) / 100;
        const map = { rough: { rough: v }, metal: { metal: v }, op: { op: v } };
        MatMod.setPartOverride(engine, engine.selectedPart, map[k]);
      }
      push('material'); refreshPartsUI();
    };
    adv.querySelector('[data-rst]') && (adv.querySelector('[data-rst]').onclick = () => { if (engine.selectedPart) { MatMod.resetPart(engine, engine.selectedPart); push('material'); refreshPartsUI(); } });
  }
  function swatchFor(p, i) {
    const cols = [p.color, lighten(p.color, 0.12), '#0e1013'];
    return cols[i % cols.length];
  }
  function lighten(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.min(255, Math.round(r + (255 - r) * f)); g = Math.min(255, Math.round(g + (255 - g) * f)); b = Math.min(255, Math.round(b + (255 - b) * f));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // ---------- UI wiring ----------
  document.body.classList.add('p3');
  // Demo/Empty
  $$('#stDemo, #stEmpty').forEach(r => r.addEventListener('change', () => {
    const demo = $('#stDemo').checked;
    engine.canvas.style.visibility = demo ? 'visible' : 'hidden';
    if (demo && !engine.models.length) { AssetMod.loadDemo(engine).then(() => { refreshAll(); CameraMod.setPreset(engine, '¾ hero', { instant: true }); }); }
    engine.state.mode = demo ? 'demo' : 'empty';
    refreshHUD();
  }));
  // Dock tool radios -> trays (show/hide via canonical CSS) and tool mode
  $$('#tlSelect, #tlCam, #tlLight, #tlMat, #tlFloor, #tlRender').forEach(r => r.addEventListener('change', () => {
    engine.toolId = r.id.replace('tl', '').toLowerCase();
    engine._syncUI && engine._syncUI();
    refreshHUD();
  }));

  // ----- toolbar (object editor) -----
  const tbWrap = document.createElement('div');
  tbWrap.className = 'p3-toolbar';
  tbWrap.innerHTML = `
    <button data-m="translate" title="Move (G)">Move</button>
    <button data-m="rotate" title="Rotate (R)">Rotate</button>
    <button data-m="scale" title="Scale (S)">Scale</button>
    <i></i>
    <button data-a="dup" title="Duplicate">＋ Dup</button>
    <button data-a="hide" title="Hide (H)">Hide</button>
    <button data-a="lock" title="Lock (L)">Lock</button>
    <button data-a="reset" title="Reset transform">Reset</button>
    <button data-a="del" title="Delete (Del)">Delete</button>
    <i></i>
    <button data-h="undo" title="Undo (Ctrl/⌘+Z)" disabled>Undo</button>
    <button data-h="redo" title="Redo (Ctrl/⌘+Shift+Z)" disabled>Redo</button>`;
  engine.dom.stage && engine.dom.stage.appendChild(tbWrap);
  tbWrap.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const model = engine.selectedModel || (engine.models.length ? engine.models[engine.models.length - 1] : null);
    if (b.dataset.m) {
      if (!model) return;
      engine.selectedModel = model;
      TrMod.setMode(engine, b.dataset.m);
      tbWrap.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
      push('transform');
    } else if (b.dataset.a === 'dup') { TrMod.duplicate(engine, model).then(() => push('duplicate')); }
    else if (b.dataset.a === 'hide') { TrMod.toggleHidden(engine, model); push('hide'); }
    else if (b.dataset.a === 'lock') { const on = !(model && model.locked); TrMod.setLock(engine, model, on); b.classList.toggle('on', on); push('lock'); }
    else if (b.dataset.a === 'reset') { TrMod.reset(engine, model); push('reset'); }
    else if (b.dataset.a === 'del') { if (model && !model.isDemo) { TrMod.remove(engine, model); push('delete'); } else if (model && model.isDemo) { engine.dom.hint.textContent = 'Primary demo product is protected — duplicate it, or delete an added object.'; } }
    else if (b.dataset.h === 'undo') { engine.undo(); }
    else if (b.dataset.h === 'redo') { engine.redo(); }
  });
  const showToolbar = () => {
    const on = engine.toolId === 'select';
    tbWrap.classList.toggle('on', on);
    const u = tbWrap.querySelector('[data-h="undo"]'), r = tbWrap.querySelector('[data-h="redo"]');
    if (u) u.disabled = !engine.canUndo();
    if (r) r.disabled = !engine.canRedo();
    if (on) TrMod.setMode(engine, engine.transformMode || 'translate');
  };
  engine._syncUI = showToolbar;

  // tray preset chips
  function bindTrayChips(role, apply) {
    const chips = $$(`.trays .tray.t-${role} .rchip, .trays .tray.t-${role} .pr-tile`);
    chips.forEach(chip => chip.addEventListener('click', () => {
      const label = (chip.querySelector('.tt') || chip).textContent.trim();
      apply(label);
      setChipOn(`.trays .tray.t-${role} .rchip, .trays .tray.t-${role} .pr-tile`, label);
    }));
  }
  bindTrayChips('cam', label => { if (CAM_PRESETS[label]) { CameraMod.setPreset(engine, label); refreshHUD(); push('camera'); } });
  bindTrayChips('light', label => { LightMod.applyPreset(engine, label); refreshHUD(); push('lighting'); });
  bindTrayChips('mat', label => { const ok = MatMod.applyFinish(engine, label); if (ok) refreshPartsUI(); push('material'); });
  bindTrayChips('floor', label => { SceneMod.buildFloor(engine, label); refreshHUD(); push('floor'); });
  bindTrayChips('render', label => { ExpMod.setFormat(engine, label); refreshHUD(); push('format'); });

  // inspector cards
  const cards = $$('.inspector details.card');
  cards.forEach(card => {
    const title = card.querySelector('.ct') ? card.querySelector('.ct').textContent.trim() : '';
    if (/camera/i.test(title)) {
      card.querySelectorAll('.rchip').forEach(chip => chip.addEventListener('click', () => {
        const k = CAM_ALIAS[chip.textContent.trim()] || chip.textContent.trim();
        if (CAM_PRESETS[k]) { CameraMod.setPreset(engine, k); setChipOn(card.querySelectorAll('.rchip'), chip.textContent.trim()); refreshHUD(); push('camera'); }
      }));
      bindSliders(card, {
        'distance': (v => setCamDist(engine, v)),
        'height': (v => setCamHeight(engine, v)),
      }, { labelMatch: ['distance', 'height'] });
      // lock focus switch
      const sw = card.querySelector('.switch');
      if (sw) sw.addEventListener('click', () => { const on = !sw.classList.contains('on'); sw.classList.toggle('on', on); });
    } else if (/lighting/i.test(title)) {
      card.querySelectorAll('.rchip').forEach(chip => chip.addEventListener('click', () => {
        LightMod.applyOverride(engine, chip.textContent.trim());
        setChipOn(card.querySelectorAll('.rchip'), chip.textContent.trim());
        refreshHUD(); push('lighting');
      }));
      bindSliders(card, {
        'intensity': (v => LightMod.setIntensity(engine, 0.3 + v * 1.8)),
        'colour': (v => LightMod.setTemperature(engine, Math.round(2100 + v * 7400))),
      }, { labelMatch: ['intensity', 'colour'], instantValueText: true });
    } else if (/materials/i.test(title)) {
      matCard = card;
    } else if (/render/i.test(title)) {
      card.querySelectorAll('.rchip').forEach(chip => chip.addEventListener('click', () => {
        const key = Object.keys(FORMATS).find(f => FORMATS[f].key === chip.textContent.trim());
        if (key) { ExpMod.setFormat(engine, key); setChipOn(card.querySelectorAll('.rchip'), chip.textContent.trim()); refreshHUD(); push('format'); }
      }));
      const btn = card.querySelector('#btnDoExport, button');
      if (btn) btn.addEventListener('click', openExport);
      const micro = card.querySelector('.micro');
      if (micro) { micro.textContent = ''; micro.appendChild(fmtSummaryEl()); }
    }
  });
  function fmtSummaryEl() {
    const s = document.createElement('div'); s.className = 'p3-fmtsum';
    const upd = () => {
      const f = FORMATS[engine.exportCfg.format] || FORMATS['9:16 reel'];
      const m = { '1080p': 1, '2K': 1.4, '4K': 2.6 }[engine.exportCfg.res] || 1;
      s.textContent = `${Math.round(f.w * m)}×${Math.round(f.h * m)} px · ${engine.exportCfg.res} · WebM + PNG reel pack`;
    };
    upd(); bus.on('format', upd);
    return s;
  }
  function bindSliders(card, map, opts) {
    const fields = $$('.field', card);
    fields.forEach(f => {
      const lab = f.querySelector('label');
      if (!lab) return;
      const t = lab.textContent.trim().toLowerCase();
      const key = opts.labelMatch.find(k => t.includes(k));
      if (!key || !map[key]) return;
      const sl = f.querySelector('.slider');
      if (!sl) return;
      wireSlider(sl, v => map[key](v));
    });
  }
  function wireSlider(sl, cb) {
    const track = sl.querySelector('.track'); if (!track) return;
    const fill = track.querySelector('i'), thumb = track.querySelector('em');
    const set = (x) => {
      const r = track.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (x - r.left) / r.width));
      if (fill) fill.style.width = (pct * 100) + '%';
      if (thumb) thumb.style.left = (pct * 100) + '%';
      cb(pct);
    };
    const onDown = e => {
      e.preventDefault();
      set(e.clientX);
      const move = ev => set(ev.clientX);
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
      sl.classList.add('active');
    };
    track.addEventListener('pointerdown', onDown);
  }
  function setCamDist(engine, v) { // 0..1 -> radius multiplier 0.5..2.2 of fitted radius
    const b = engine.bounds || { center: new THREE.Vector3(0, 0.8, 0), radius: 2 };
    const mult = 0.55 + v * 1.9;
    const sp = new THREE.Spherical().setFromVector3(engine.camera.position.clone().sub(b.center));
    sp.radius = Math.max(b.radius * 1.1, 2.2) * mult;
    const p = new THREE.Vector3().setFromSpherical(sp).add(b.center);
    engine.animCam = null;
    engine.camera.position.copy(p);
    engine.camera.lookAt(engine.controls.target);
    engine.controls.update();
  }
  function setCamHeight(engine, v) {
    const baseY = (engine.bounds ? engine.bounds.center.y : 0.8);
    engine.controls.target.y = baseY + (v - 0.5) * 2.2;
    engine.controls.update();
  }
  // camera switch switch
  // HUD stage click -> environment gallery when demo (via cv-tag)
  if (engine.dom.tag) { engine.dom.tag.style.cursor = 'pointer'; engine.dom.tag.title = 'Studio backgrounds (Hero + 10)'; engine.dom.tag.addEventListener('click', openEnvPanel); }
  function openEnvPanel() {
    openPanel('Studio backgrounds', body => { body.className = 'p3-panel-body'; const grid = document.createElement('div'); grid.className = 'p3-env'; body.appendChild(grid); buildEnvTiles(grid); }, { wide: true });
  }

  // top actions
  $('#tbExport').addEventListener('click', openExport);
  $('#tbLearn').addEventListener('click', () => { closePanel(); OnbMod.start(engine); });
  $('#tbHelp').addEventListener('click', openHelp);
  $('#tbSettings').addEventListener('click', openSettings);
  $('#projPill').addEventListener('click', openSettings);

  // side rail scenes (env+floor+cam presets) & projects
  const navScenes = $$('#sideNav #navScenes .tag');
  const SCENES = [
    { name: 'Studio', env: 'hero', cam: 'Front', floor: 'White Studio' },
    { name: 'Dawn on Café Window', env: 'coffee_roastery_workshop', cam: '¾ hero', floor: 'Café Wood' },
    { name: 'Night Ride', env: 'midnight_black_commercial_studio', cam: '¾ hero', floor: 'Gloss Black Mirror' },
    { name: 'Golden Hour', env: 'royal_enfield_heritage_workshop', cam: '¾ hero', floor: 'Café Wood' },
  ];
  navScenes.forEach((tag, i) => tag.addEventListener('click', async () => {
    const s = SCENES[i % SCENES.length]; if (!s) return;
    engine._noHistory = true;
    await EnvMod.setEnv(engine, s.env); SceneMod.buildFloor(engine, s.floor); CameraMod.setPreset(engine, s.cam, { instant: true });
    engine._noHistory = false; push('scene-preset'); refreshHUD();
  }));
  const projRows = $$('#sideNav #navProjects .proj-row');
  projRows.forEach((row, i) => row.addEventListener('click', () => {
    const s = SCENES[(i + 1) % SCENES.length] || SCENES[0];
    engine._noHistory = true;
    EnvMod.setEnv(engine, s.env).then(() => { SceneMod.buildFloor(engine, s.floor); CameraMod.setPreset(engine, s.cam, { instant: true }); engine._noHistory = false; push('project'); refreshHUD(); });
  }));

  // versions (V1-V6 chips + rows)
  const versionMeta = {
    V1: { cam: 'Front', light: 'Softbox', floor: 'White Studio' },
    V2: { cam: '¾ hero', light: 'Softbox', floor: 'Gloss Black Mirror' },
    V3: { cam: 'Side', light: 'Café window', floor: 'Concrete Loft' },
    V4: { cam: 'Detail', light: 'Golden hour', floor: 'Café Wood' },
    V5: { cam: 'Top', light: 'Backlit rim', floor: 'Marble Luxury' },
    V6: { cam: '¾ hero', light: 'Night neon', floor: 'Gloss Black Mirror' },
  };
  function selectVersion(v) {
    engine.state.version = v;
    const idx = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'].indexOf(v);
    $$('.vchip').forEach(c => c.classList.toggle('on', c.textContent.includes(v)));
    $$('#navVersions ~ .gbody .vrow, #sideNav .vrow').forEach((r, i) => r.classList.toggle('on', i === idx));
    const meta = versionMeta[v];
    if (meta) {
      engine._noHistory = true;
      try {
        CameraMod.setPreset(engine, meta.cam, { instant: true });
        LightMod.applyPreset(engine, meta.light);
        SceneMod.buildFloor(engine, meta.floor);
      } finally { engine._noHistory = false; }
      push('version');
    }
    refreshHUD();
    if (engine.dom.hint) engine.dom.hint.textContent = `Workspace ${v} — ${CAM_PRESETS[meta ? meta.cam : '¾ hero'] ? 'framing, light + floor applied' : ''}`;
  }
  $$('.vchip').forEach(c => c.addEventListener('click', () => {
    const m = c.textContent.match(/V(\d)/); if (m) selectVersion('V' + m[1]);
  }));
  $$('#sideNav .vrow').forEach(r => r.addEventListener('click', () => {
    const m = (r.textContent + ' ' + (r.querySelector('.vt') || {}).textContent).match(/V(\d)/);
    if (m) selectVersion('V' + m[1]);
  }));

  // Empty dropzone: import GLB
  const dropzone = $('.cv-empty');
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = '.glb,.gltf'; fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  const openPicker = e => { if (e) e.preventDefault(); fileInput.click(); };
  dropzone.addEventListener('click', openPicker);
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0]; if (!f) return;
    const e = await AssetMod.importFile(engine, f).catch(err => console.error(err));
    if (e) {
      $('#stDemo').checked = true;
      document.body.classList.remove('p3-empty');
      engine.canvas.style.visibility = 'visible';
      push('import'); refreshAll();
      CameraMod.setPreset(engine, '¾ hero', { instant: true });
      fileInput.value = '';
    }
  });
  ['dragover', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));
  dropzone.addEventListener('drop', async e => {
    const f = [...(e.dataTransfer.files || [])].find(x => /\.(glb|gltf)$/i.test(x.name));
    if (!f) return;
    const ent = await AssetMod.importFile(engine, f);
    if (ent) { $('#stDemo').checked = true; document.body.classList.remove('p3-empty'); engine.canvas.style.visibility = 'visible'; push('import'); refreshAll(); CameraMod.setPreset(engine, '¾ hero', { instant: true }); }
  });

  // keyboard
  addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) HistMod.redo(engine); else HistMod.undo(engine); refreshAll(); return; }
    if ((e.metaKey || e.ctrlKey) && k === 's') { e.preventDefault(); openSettings(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const model = engine.selectedModel || (engine.models.length ? engine.models[engine.models.length - 1] : null);
    if (!model) return;
    switch (k) {
      case 'g': TrMod.setMode(engine, 'translate'); break;
      case 'r': TrMod.setMode(engine, 'rotate'); break;
      case 's': TrMod.setMode(engine, 'scale'); break;
      case 'h': TrMod.toggleHidden(engine, model); break;
      case 'l': TrMod.setLock(engine, model, !model.locked); break;
      case 'delete': case 'backspace': if (!model.isDemo) TrMod.remove(engine, model); break;
      case 'escape': TrMod.setMode(engine, null); break;
      default: return;
    }
    push('edit');
  });

  // select-model events -> outline & toolbar
  bus.on('select-model', m => SelMod.showOutline(engine, m, true));
  bus.on('selection-changed', () => { SelMod.showOutline(engine, engine.selectedModel, !!engine.selectedModel); refreshPartsUI(); if (engine._syncUI) engine._syncUI(); });

  // ---------- render loop ----------
  engine.ui = { stats: refreshHUD, setOrbiting: () => {} };
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!engine.models.length && engine.state.mode !== 'empty') { /* idle but render bg */ }
    PerfMod.sample(engine, dt);
    SceneMod.tickMixers(engine, dt);
    CameraMod.updateAnim(engine, dt);
    if (engine.controls) engine.controls.update();
    if (engine.renderer && engine.canvas.style.visibility !== 'hidden') engine.renderer.render(engine.scene, engine.camera);
  }
  requestAnimationFrame(loop);

  // ---------- boot demo ----------
  refreshHUD();
  CameraMod.setPreset(engine, '¾ hero', { instant: true });
  AssetMod.loadDemo(engine).then(() => {
    refreshAll();
    CameraMod.setPreset(engine, '¾ hero', { instant: true });
    refreshHUD();
    OnbMod.restartIfNeeded(engine);
    console.info('Phase 3 ready · models', engine.models.length, 'parts', engine.parts.length);
  }).catch(err => console.error('boot demo', err));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
