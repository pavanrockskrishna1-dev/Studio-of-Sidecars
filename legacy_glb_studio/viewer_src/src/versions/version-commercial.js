import { section, chipRow, buttonsRow, labelSelect, sliderRow } from '../core/ui.js';

/* =========================================================================
 *  VERSION 2 — INSTAGRAM COMMERCIAL STUDIO  (template: 'commercial')
 *  Cinematic framing, keyframed camera moves, luxury lighting + HDRI,
 *  9:16 Reels safe-frame workflow. FACTORY-based so the Version Manager can
 *  duplicate it into V3+ while every instance keeps its own settings.
 * ========================================================================= */

const CAMERA_CHIPS = [
  { key: 'front', label: 'Front' }, { key: '45', label: '45°' },
  { key: 'side', label: 'Side' }, { key: 'top', label: 'Top' },
  { key: 'hero', label: 'Hero' }, { key: 'macro', label: 'Macro' },
];

const MOVE_CHIPS = [
  { key: 'orbit', label: '🔄 Orbit 360°' },
  { key: 'dolly', label: '🛣️ Dolly Push' },
  { key: 'crane', label: '🏗️ Crane Sweep' },
  { key: 'handheld', label: '🎞️ Handheld' },
];

const LIGHTING_GROUPS = [
  { label: 'Luxury Studio', options: [
    { value: 'softbox', label: '💡 Softbox Studio (default)' },
    { value: 'coffeeshop', label: '☕ Coffee Shop Window' },
    { value: 'morning', label: '🌤️ Outdoor Morning' },
    { value: 'nightcafe', label: '🌃 Night Café' },
  ] },
  { label: 'Creative moods', options: [
    { value: 'studio', label: '🎨 Classic Studio' },
    { value: 'sunset', label: '🌅 Sunset' },
    { value: 'dawn', label: '🌄 Dawn' },
    { value: 'night', label: '🌌 Night' },
    { value: 'warehouse', label: '🏭 Warehouse' },
    { value: 'forest', label: '🌲 Forest' },
    { value: 'ocean', label: '🌊 Ocean' },
  ] },
];

export function createCommercial(seed = {}) {
  const memory = Object.assign({ lighting: seed.defaultLighting || 'softbox' }, seed.memory || {});

  const v = {
    id: seed.id || 'commercial',
    ns: seed.ns || 'v2',
    short: seed.short || 'V2',
    label: seed.label || 'Instagram Commercial',
    icon: seed.icon || '📲',
    tagline: seed.tagline || 'Cinematic camera · luxury light · Reels-ready',
    tpl: 'commercial',
    userCreated: !!seed.userCreated,
    defaultFormat: seed.defaultFormat || '9:16',
    defaultLighting: seed.defaultLighting || 'softbox',
    defaultGuide: seed.defaultGuide !== undefined ? !!seed.defaultGuide : true,
    heroPreset: seed.heroPreset || 'hero',
    frameOpts: Object.assign({}, seed.frameOpts || {}),
    cameraPresets: CAMERA_CHIPS.map((c) => ({ ...c })),
    moves: MOVE_CHIPS.map((c) => ({ ...c })),
    lightingOptions: LIGHTING_GROUPS.map((g) => ({ label: g.label, options: g.options.map((o) => ({ ...o })) })),
    memory,
  };

  v.build = function build(S) {
    const frag = document.createDocumentFragment();
    const ns = v.ns;
    const lightSel = () => (v.memory.lighting || v.defaultLighting || 'softbox');

    /* ---------- Reels & camera presets ---------- */
    const cam = section('🎬 Camera & Reels', true, ns);
    cam.appendChild(buttonsRow(ns, [
      { id: 'Hero', label: '📲 Reels Hero Shot', cls: 'primary', onclick: () => {
          S.setFormat('9:16'); S.updateGuide(true); S.frame('hero');
        } },
      { id: 'Fit', label: '🎯 Fit & Reset', onclick: () => S.frame('45') },
    ]));
    cam.appendChild(buttonsRow(ns, [
      { id: 'Rot', label: '🔄 Turntable Loop', onclick: () => {
          const on = S.toggleRotate();
          const b = document.getElementById(ns + 'Rot');
          if (b) b.textContent = on ? '⏸ Pause Turntable' : '🔄 Turntable Loop';
        } },
      { id: 'Guide', label: '▦ Safe-frame: ' + (S.state.guideVisible ? 'On' : 'Off'), onclick: () => {
          const next = !S.state.guideVisible;
          S.updateGuide(next);
          const b = document.getElementById(ns + 'Guide');
          if (b) b.textContent = '▦ Safe-frame: ' + (next ? 'On' : 'Off');
        } },
    ]));
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<span style="font-size:11px;color:var(--muted)">Cinematic angles</span>';
    row.appendChild(chipRow(ns, v.cameraPresets, (key) => S.frame(key)));
    cam.appendChild(row);
    frag.appendChild(cam);

    /* ---------- Camera moves ---------- */
    const mov = section('🎥 Camera Moves (record-ready)', true, ns);
    mov.appendChild(chipRow(ns, v.moves, (key) => {
      const dur = parseFloat(document.getElementById(ns + 'Dur').value || 6);
      const loop = document.getElementById(ns + 'Loop').checked;
      S.playMove(key, dur * 1000, loop);
      movUI();
    }));
    mov.appendChild(sliderRow(ns, 'Duration', 'Dur', {
      min: 3, max: 16, step: 0.5, value: 6, display: '6.0 s',
      onInput: (e) => { const out = document.getElementById(ns + 'DurOut'); if (out) out.textContent = Number(e.target.value).toFixed(1) + ' s'; },
    }));
    const lr = document.createElement('div');
    lr.className = 'row';
    const loopL = document.createElement('label');
    loopL.className = 'chk';
    const loopI = document.createElement('input');
    loopI.type = 'checkbox';
    loopI.id = ns + 'Loop';
    loopI.checked = true;
    loopL.append(loopI, document.createTextNode(' loop'));
    const play = document.createElement('button');
    play.id = ns + 'Play';
    play.textContent = '▶ Play Move';
    play.className = 'primary';
    play.style.flex = '1';
    play.addEventListener('click', () => {
      if (S.isMoving()) { S.stopCamControl(); movUI(); }
      else {
        const dur = parseFloat(document.getElementById(ns + 'Dur').value || 6);
        const loop = loopI.checked;
        S.playMove('orbit', dur * 1000, loop);
        movUI();
      }
    });
    const stop = document.createElement('button');
    stop.textContent = '⏹ Stop';
    stop.addEventListener('click', () => { S.stopCamControl(); movUI(); });
    lr.append(loopL, play, stop);
    mov.appendChild(lr);
    frag.appendChild(mov);
    function movUI() {
      play.textContent = S.isMoving() ? '⏹ Stop Move' : '▶ Play Move';
    }

    /* ---------- Luxury lighting & environment ---------- */
    const light = section('💡 Luxury Lighting & Environment', true, ns);
    light.appendChild(labelSelect(ns, 'Environment / studio preset', 'Lgt', v.lightingOptions,
      (key) => { v.memory.lighting = key; S.setLightingPreset(key); }, lightSel()));
    light.appendChild(sliderRow(ns, 'Intensity', 'Int', {
      min: 0, max: 2.4, step: 0.02, value: 1, display: '1.00',
      onInput: (e) => { S.applyMasterIntensity(parseFloat(e.target.value)); const o = document.getElementById(ns + 'IntOut'); if (o) o.textContent = Number(e.target.value).toFixed(2); },
    }));
    light.appendChild(sliderRow(ns, 'Temp (K)', 'Temp', {
      min: 1800, max: 12000, step: 50, value: 5400, display: '5600 K',
      onInput: (e) => { S.applyMasterIntensity(null, parseFloat(e.target.value)); const o = document.getElementById(ns + 'TempOut'); if (o) o.textContent = e.target.value + ' K'; },
    }));
    light.appendChild(sliderRow(ns, 'Reflections', 'Refl', {
      min: 0, max: 3, step: 0.05, value: 1, display: '1.00',
      onInput: (e) => { S.applyMasterIntensity(null, null, parseFloat(e.target.value)); const o = document.getElementById(ns + 'ReflOut'); if (o) o.textContent = Number(e.target.value).toFixed(2); },
    }));
    light.appendChild(sliderRow(ns, 'Shadow softness', 'Shadow', {
      min: 0, max: 20, step: 0.5, value: 1, display: '1.0',
      onInput: (e) => { S.setShadowSoft(parseFloat(e.target.value)); const o = document.getElementById(ns + 'ShadowOut'); if (o) o.textContent = e.target.value; },
    }));
    const chkWrap = document.createElement('div');
    chkWrap.className = 'chk';
    const sh = document.createElement('input'); sh.type = 'checkbox'; sh.checked = S.gridState.shadows;
    sh.addEventListener('change', () => S.setShadows(sh.checked));
    chkWrap.append(sh, document.createTextNode(' Shadows on'));
    light.appendChild(chkWrap);
    const chkF = document.createElement('div');
    chkF.className = 'chk';
    const fl = document.createElement('input'); fl.type = 'checkbox'; fl.checked = S.gridState.floorGloss;
    fl.addEventListener('change', () => { S.setFloorGloss(fl.checked); });
    chkF.append(fl, document.createTextNode(' Reflective floor (gloss)'));
    light.appendChild(chkF);
    light.appendChild(buttonsRow(ns, [
      { id: 'Hdri', label: '🌐 Load HDRI (.hdr/.exr/.png)', cls: 'gold', onclick: () => document.getElementById('hdriFile') && document.getElementById('hdriFile').click() },
    ]));
    const hdriFile = document.createElement('input');
    hdriFile.type = 'file';
    hdriFile.id = 'hdriFile';
    hdriFile.accept = '.hdr,.exr,.png,.jpg,.jpeg';
    hdriFile.style.display = 'none';
    hdriFile.addEventListener('change', () => { const f = hdriFile.files && hdriFile.files[0]; if (f) S.loadHDRIFile(f, true); hdriFile.value = ''; });
    light.appendChild(hdriFile);
    const bgRow = document.createElement('div');
    bgRow.className = 'row';
    const bg = document.createElement('input');
    bg.type = 'color';
    bg.value = '#14161c';
    bg.style.width = '54px';
    bg.title = 'Backdrop colour';
    bg.addEventListener('input', () => S.setBackdropColor(bg.value));
    const grid = document.createElement('button');
    grid.type = 'button'; grid.style.flex = '1'; grid.textContent = '▦ Grid: ' + (S.gridState.grid ? 'On' : 'Off');
    grid.addEventListener('click', () => { const next = !S.gridState.grid; S.setGrid(next); grid.textContent = '▦ Grid: ' + (next ? 'On' : 'Off'); });
    const wire = document.createElement('button');
    wire.type = 'button'; wire.style.flex = '1'; wire.textContent = '◈ Wireframe: ' + (S.state.wire ? 'On' : 'Off');
    wire.addEventListener('click', () => {
      const next = !S.state.wire;
      S.state.wire = next;
      S.state.meshes.forEach((e) => {
        (Array.isArray(e.mesh.material) ? e.mesh.material : [e.mesh.material]).forEach((m) => { if (m) m.wireframe = next; });
      });
      wire.textContent = '◈ Wireframe: ' + (next ? 'On' : 'Off');
    });
    bgRow.append(bg, grid, wire);
    light.appendChild(bgRow);
    frag.appendChild(light);
    return frag;
  };

  v.onActivate = function onActivate() { /* registry applies stored format / guide / lighting */ };
  return v;
}

export default createCommercial();
