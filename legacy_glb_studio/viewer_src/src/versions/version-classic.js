import { section, chipRow, buttonsRow, labelSelect, sliderRow } from '../core/ui.js';

/* =========================================================================
 *  VERSION 1 — CLASSIC STUDIO  (template: 'classic')
 *  A clean, minimal product stage: simple camera angles + a curated lighting
 *  look.  Provided as a FACTORY so the Version Manager can spawn independent
 *  duplicates (each gets its own id, DOM namespace & memory). Shares the
 *  engine, products, parts and capture with every version.
 * ========================================================================= */

const CAMERA_CHIPS = [
  { key: 'front', label: 'Front' }, { key: '45', label: '45°' },
  { key: 'side', label: 'Side' }, { key: 'top', label: 'Top' },
];

const LIGHTING_GROUPS = [{
  label: 'Classic looks',
  options: [
    { value: 'studio', label: '🎨 Classic Studio' },
    { value: 'softbox', label: '💡 Softbox' },
    { value: 'sunset', label: '🌅 Sunset' },
    { value: 'dawn', label: '🌄 Dawn' },
    { value: 'night', label: '🌌 Night' },
    { value: 'warehouse', label: '🏭 Warehouse' },
    { value: 'forest', label: '🌲 Forest' },
  ],
}];

export function createClassic(seed = {}) {
  const memory = Object.assign({ lighting: seed.defaultLighting || 'studio' }, seed.memory || {});

  const v = {
    id: seed.id || 'classic',
    ns: seed.ns || 'v1',
    short: seed.short || 'V1',
    label: seed.label || 'Classic Studio',
    icon: seed.icon || '🎬',
    tagline: seed.tagline || 'Simple, clean product showcase',
    tpl: 'classic',                 // template tag used to re-instantiate on duplicate / reload
    userCreated: !!seed.userCreated,
    defaultFormat: seed.defaultFormat || '1:1',
    defaultLighting: seed.defaultLighting || 'studio',
    defaultGuide: !!seed.defaultGuide,
    heroPreset: seed.heroPreset || '45',
    frameOpts: Object.assign({}, seed.frameOpts || {}),
    // per-version stored data (own copies — never shared with siblings)
    cameraPresets: CAMERA_CHIPS.map((c) => ({ ...c })),
    moves: [],
    lightingOptions: LIGHTING_GROUPS.map((g) => ({ label: g.label, options: g.options.map((o) => ({ ...o })) })),
    memory,
  };

  v.build = function build(S) {
    const frag = document.createDocumentFragment();
    const ns = v.ns;

    /* ---------- Camera & stage ---------- */
    const cam = section('📷 Camera & Stage', true, ns);
    const camH = cam.appendChild(document.createElement('div'));
    camH.className = 'row';
    camH.innerHTML = '<span style="font-size:11px;color:var(--muted)">Angles</span>';
    camH.appendChild(chipRow(ns, v.cameraPresets, (key) => S.frame(key)));
    cam.appendChild(buttonsRow(ns, [
      { id: 'Rot', label: '🔄 Turntable Loop', cls: 'primary', onclick: () => {
          const on = S.toggleRotate();
          const b = document.getElementById(ns + 'Rot');
          if (b) b.textContent = on ? '⏸ Pause Turntable' : '🔄 Turntable Loop';
        } },
      { id: 'Fit', label: '🎯 Fit & Reset', onclick: () => S.frame('45') },
    ]));
    frag.appendChild(cam);

    /* ---------- Lighting & look ---------- */
    const light = section('💡 Lighting & Look', true, ns);
    light.appendChild(labelSelect(ns, 'Lighting look', 'Sel', v.lightingOptions,
      (key) => { v.memory.lighting = key; S.setLightingPreset(key); },
      v.memory.lighting || v.defaultLighting));
    light.appendChild(sliderRow(ns, 'Intensity', 'Int', {
      min: 0, max: 2.4, step: 0.02, value: 1,
      onInput: (e) => { S.applyMasterIntensity(parseFloat(e.target.value)); },
    }));
    const bgRow = document.createElement('div');
    bgRow.className = 'row';
    bgRow.innerHTML = '<span style="font-size:11px;color:var(--muted)">Backdrop</span>';
    const bg = document.createElement('input');
    bg.type = 'color';
    bg.value = '#1a1a22';
    bg.style.width = '54px';
    bg.addEventListener('input', () => S.setBackdropColor(bg.value));
    const grid = document.createElement('button');
    grid.type = 'button';
    grid.style.flex = '1';
    grid.textContent = '▦ Grid: ' + (S.gridState.grid ? 'On' : 'Off');
    grid.addEventListener('click', () => {
      const next = !S.gridState.grid;
      S.setGrid(next);
      grid.textContent = '▦ Grid: ' + (next ? 'On' : 'Off');
    });
    bgRow.append(bg, grid);
    light.appendChild(bgRow);
    frag.appendChild(light);

    return frag;
  };

  v.onActivate = function onActivate() { /* classic: registry applies its stored format/guide/lighting */ };
  return v;
}

export default createClassic();
