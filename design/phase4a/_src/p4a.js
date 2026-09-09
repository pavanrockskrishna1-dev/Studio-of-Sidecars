/* ============================================================
   PHASE 4A · Personal Daily Driver UX — experience layer
   Runs AFTER the Phase 3 engine boot (P3 ready). Builds the new
   creator chrome (welcome · library rail · inspector · 7-tool dock)
   entirely on top of engine public state/API. Engine is untouched.
   ============================================================ */
(function () {
  'use strict';
  const LS = 'sos:p4a:';
  try { localStorage.setItem('sos:p3:tour', 'done'); } catch (e) {}   // Phase 4A runs its own Learn tour
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(LS + k) || 'null'); localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} };
  const P3 = () => window.P3;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  /* ---------------- icons (feather-style 1.6 stroke) ---------------- */
  const P = { // path fragments
    select: '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    env: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.6" cy="8.6" r="1.6"/><path d="M21 15l-5-5L5 21"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    material: '<path d="M12 2.7l5.6 5.6a8 8 0 1 1-11.3 0z"/>',
    sandbox: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    render: '<path d="M22 8l-6 4 6 4V8z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    home: '<path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 0 1 3 20z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2 1.2-6.8-5-4.9 6.9-1z"/>',
    cube: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5"/><path d="M12 22V12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    layers: '<path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    prop: '<circle cx="12" cy="12" r="2.4"/><path d="M12 4.5v15M5.2 7.6l13.6 8.8M18.8 7.6L5.2 16.4"/>',
    dock: '<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/>',
    upl: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    dwn: '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="M10 9.5l5 3-5 3z"/>',
    photo: '<rect x="3" y="6" width="18" height="14" rx="2.4"/><circle cx="12" cy="13" r="3.4"/><path d="M8 6l1.6-2h4.8L16 6"/>',
    gauge: '<circle cx="12" cy="14" r="7.4"/><path d="M12 14l3.6-4.4M12 6.6v-3M7.4 9.8L5.6 8M16.6 9.8l1.8-1.8"/>',
    route: '<circle cx="6" cy="19" r="1.9"/><circle cx="18" cy="5" r="1.9"/><path d="M8 19h6.2a3.6 3.6 0 0 0 0-7.2H9.8a3.6 3.6 0 0 1 0-7.2H16"/>',
    page: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7z"/><path d="M14 3v4h4M8.5 12h7M8.5 15.5h7M8.5 8.5h2"/>',
    envlp: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    plane: '<path d="M2 16l4-1 3 3 6-6 5-1-18-4 0 9z"/><path d="M17 15l3 2 2-1"/>',
    bolt: '<path d="M13 2L4.5 13.5H11L9.5 22 19 9.5h-6.5z"/>',
    spark: '<path d="M12 3l1.6 4.6L18 9.2l-4.4 1.6L12 15.5l-1.6-4.7L6 9.2l4.4-1.6z"/><path d="M19 14l.9 2.4L22 17.3l-2.1.9L19 20.6l-.9-2.4L16 17.3l2.1-.9z"/>',
    dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    move: '<path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>',
    rotate: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/>',
    scale: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 4l16 16"/><circle cx="20" cy="20" r="1.6"/><circle cx="4" cy="4" r="1.6"/>',
    import: '<path d="M12 3v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  };
  function ic(name, s) {
    const sz = s || 20;
    return '<svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  /* ---------------- copy / catalogs ---------------- */
  const ENVMETA = {
    hero: { name: 'Propeller & Pistons Loft', tag: 'Warm tungsten workshop' },
    luxury_brick_loft_museum: { name: 'Luxury Loft Museum', tag: 'Curated gallery warmth' },
    industrial_steel_factory: { name: 'Industrial Steel Factory', tag: 'Cold steel precision' },
    vintage_garage_studio: { name: 'Vintage Garage Studio', tag: 'Gasoline & tool steel' },
    royal_enfield_heritage_workshop: { name: 'Heritage Workshop', tag: 'Piston & leather' },
    coffee_roastery_workshop: { name: 'Coffee Roastery', tag: 'Slow-roast amber' },
    aviation_heritage_hangar: { name: 'Aviation Hangar', tag: 'Aircraft daylight' },
    marble_luxury_showroom: { name: 'Marble Luxury Showroom', tag: 'Luxury showroom calm' },
    matte_white_photography_studio: { name: 'White Photography Studio', tag: 'Minimal photography' },
    midnight_black_commercial_studio: { name: 'Midnight Black Studio', tag: 'Split-tone noir' },
    coal_and_fire_forge: { name: 'Coal & Fire Forge', tag: 'Furnace glow' },
  };
  // Engine-style base-relative paths: resolved against the document base (the Phase 3
  // folder ../phase3/) so they work identically over http(s) and file://.
  const envPrev = k => k === 'hero'
    ? '../environments/hero/HERO_propeller_pistons_loft.png'
    : '../environments/previews/' + k + '.png';

  const WS = [
    { v: 'V1', t: 'Classic' }, { v: 'V2', t: 'Commercial' }, { v: 'V3', t: 'Blender' },
    { v: 'V4', t: 'Creator' }, { v: 'V5', t: 'Asset Lib' }, { v: 'V6', t: 'Brand' },
  ];
  const CAMG = [
    { t: 'Hero & story', tag: 'camera framing for the loft', items: ['Hero', '¾ hero', 'Front', 'Side', 'Rear'] },
    { t: 'Product & detail', tag: 'close, technical angles', items: ['Product', 'Detail', 'Top', 'Left', 'Right'] },
    { t: 'Motion', tag: 'camera moves for story', items: ['Orbit spin', 'Reel'] },
  ];
  const LOOKS = [
    { k: 'hero-spotlight', n: 'Hero Spotlight', s: 'Soft key on brushed steel', pr: 'Softbox', cast: 'Neutral', temp: 0, it: 1.05 },
    { k: 'warm-workshop', n: 'Warm Workshop', s: 'Tungsten over leather & walnut', pr: 'Café window', cast: 'Warm', temp: 3600, it: 1.12 },
    { k: 'blue-rim', n: 'Blue Rim', s: 'Cool rim on midnight steel', pr: 'Backlit rim', cast: 'Cool', temp: 7600, it: 1.0 },
    { k: 'sunset-garage', n: 'Sunset Garage', s: 'Golden hour through the door', pr: 'Golden hour', cast: 'Warm', temp: 3300, it: 1.18 },
    { k: 'white-studio', n: 'White Studio', s: 'Clean commercial daylight', pr: 'Softbox', cast: 'Neutral', temp: 0, it: 1.35 },
    { k: 'night-commercial', n: 'Night Commercial', s: 'Split-tone commercial noir', pr: 'Night neon', cast: 'Cool', temp: 6800, it: 1.05 },
  ];
  const LOOK_META = { 'hero-spotlight': ['rgba(255,224,190,.5)', 'rgba(180,200,255,.2)'], 'warm-workshop': ['rgba(255,190,120,.55)', 'rgba(120,60,20,.25)'], 'blue-rim': ['rgba(120,180,255,.5)', 'rgba(30,60,120,.4)'], 'sunset-garage': ['rgba(255,170,90,.6)', 'rgba(200,90,40,.25)'], 'white-studio': ['rgba(255,255,255,.5)', 'rgba(200,215,235,.35)'], 'night-commercial': ['rgba(180,200,255,.4)', 'rgba(90,60,160,.4)'] };
  const FLOORS = ['White Studio', 'Gloss Black Mirror', 'Café Wood', 'Concrete Loft', 'Marble Luxury'];
  const FORMATS = [
    { f: '9:16 reel', s: 'Vertical reel canvas' }, { f: '1:1 square', s: 'Feed square' },
    { f: '4:5 story', s: 'Story / portrait' }, { f: 'Blender Cycles', s: '16:9 desktop' },
  ];
  const RES = ['1080p', '2K', '4K'];
  const STILLS = ['PNG', 'JPG', 'Transparent PNG'];

  const MATS = [
    { cat: 'Metal · Brushed & Satin', items: [
      { n: 'Bare Alu', c: '#cdd3db', r: 0.38, m: 0.9, o: 1, k: 'metal' }, { n: 'Satin Alu', c: '#b9c0c9', r: 0.5, m: 0.85, o: 1, k: 'metal' }, { n: 'Anodized', c: '#3a3f47', r: 0.32, m: 0.7, o: 1, k: 'metal' }, { n: 'Satin 304', c: '#c3cad2', r: 0.34, m: 0.85, o: 1, k: 'metal' }, { n: 'Brushed 304', c: '#aab2bc', r: 0.5, m: 0.8, o: 1, k: 'metal' }] },
    { cat: 'Metal · Mirror Chrome', items: [
      { n: 'Piston Chrome', c: '#eef1f4', r: 0.05, m: 1, o: 1, k: 'chrome' }, { n: 'Mirror 304', c: '#e9edf2', r: 0.06, m: 1, o: 1, k: 'chrome' }, { n: 'Black Chrome', c: '#202329', r: 0.1, m: 0.9, o: 1, k: 'chrome' }] },
    { cat: 'Powder Coat', items: [
      { n: 'Jet PC', c: '#191c21', r: 0.45, m: 0.05, o: 1, k: 'powder' }, { n: 'Steel PC', c: '#6a707a', r: 0.5, m: 0.05, o: 1, k: 'powder' }, { n: 'Signal Blue PC', c: '#2f5d9e', r: 0.42, m: 0.08, o: 1, k: 'powder' }] },
    { cat: 'Leather', items: [
      { n: 'Cognac', c: '#7c4a26', r: 0.82, m: 0, o: 1, k: 'leather' }, { n: 'Oxblood', c: '#5a2a22', r: 0.78, m: 0, o: 1, k: 'leather' }, { n: 'Charcoal Hide', c: '#2e2c2b', r: 0.85, m: 0, o: 1, k: 'leather' }] },
    { cat: 'Wood · Walnut & Oak', items: [
      { n: 'Walnut Satin', c: '#6b4323', r: 0.5, m: 0, o: 1, k: 'wood' }, { n: 'Walnut Gloss', c: '#6b4323', r: 0.2, m: 0, o: 1, k: 'wood' }, { n: 'Natural Oak', c: '#b08a55', r: 0.5, m: 0, o: 1, k: 'wood' }, { n: 'Smoked Oak', c: '#6f5230', r: 0.4, m: 0, o: 1, k: 'wood' }] },
    { cat: 'Glass', items: [
      { n: 'Clear Glass', c: '#dceef2', r: 0.05, m: 0, o: 0.3, k: 'glass' }, { n: 'Smoked Glass', c: '#23262b', r: 0.08, m: 0, o: 0.42, k: 'glass' }, { n: 'Brass Rim Glass', c: '#d9c9a3', r: 0.12, m: 0, o: 0.4, k: 'glass' }] },
    { cat: 'Rubber', items: [
      { n: 'Soft Black', c: '#1c1e22', r: 0.94, m: 0, o: 1, k: 'rubber' }, { n: 'Grippy Grey', c: '#52565c', r: 0.9, m: 0, o: 1, k: 'rubber' }, { n: 'Tool Grip', c: '#2f363d', r: 0.88, m: 0, o: 1, k: 'rubber' }] },
    { cat: 'Vinyl Wraps', items: [
      { n: 'Satin Black Wrap', c: '#17181b', r: 0.5, m: 0, o: 1, k: 'vinyl' }, { n: 'Gunmetal Wrap', c: '#4a4e55', r: 0.72, m: 0.1, o: 1, k: 'vinyl' }, { n: 'Brushed Vinyl', c: '#9a8f7a', r: 0.4, m: 0.55, o: 1, k: 'vinyl' }] },
  ];  const ASSETS = [
    { id: 'coffee', n: 'Roastery Coffee Set', cat: 'Coffee Bikes', sub: 'Built-in demo', url: 'assets/models/demo-coffee-set.glb', ico: 'book' },
    { id: 'bbq', n: 'Workshop BBQ Bike', cat: 'BBQ Bikes', sub: 'Built-in demo', url: 'assets/models/demo-bbq-bike.glb', ico: 'dup' },
  ];
  const CATS = [
    { key: 'Coffee Bikes', ico: 'book' }, { key: 'BBQ Bikes', ico: 'dup' },
    { key: 'Sidecars', ico: 'move' }, { key: 'Pilot Diagrams', ico: 'prop' },
    { key: 'Meet the Machine', ico: 'gear' }, { key: 'Pressure Attitude', ico: 'scale' },
  ];
  const EMPTY_COPY = {
    'Sidecars': 'Drop your own sidecar GLB — it joins the loft the moment it lands.',
    'Pilot Diagrams': 'Flight sketches & pilot diagrams arrive with the Sandbox phase.',
    'Meet the Machine': 'Deep-dive product tours will live here.',
    'Pressure Attitude': 'Performance & attitude storyboards coming soon.',
  };

  /* ---------------- tiny dom/helpers ---------------- */
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function clear(node) { if (node) node.innerHTML = ''; }
  function uid() { return Math.random().toString(36).slice(2, 9); }

  /* ---------------- state ---------------- */
  const S = {
    tool: null,          // active dock tool id
    rail: false,
    scope: 'model',      // materials scope
    search: '',
    tag: 'all',
    catOpen: {},
    open: { open: true, projects: true, favs: true, recent: true },
    lookActive: 'hero-spotlight',
    envKey: 'hero',
    lightName: 'Softbox',
    partName: null,
    stage: 'demo',
    welcomeSeen: !!store('seen'),
  };

  const U = { railL: null, railR: null, dock: null, body: null, inspScroll: null, libScroll: null, matEl: {}, camEl: {}, envEl: {}, litEl: {}, rndEl: {}, selEl: {}, sndEl: {}, lookEl: null, partLabel: null, veil: null, vign: null };

  /* ---------------- toast / veil ---------------- */
  function toast(msg, kind) {
    const host = $('#p4toasts') || (() => { const n = el('<div id="p4toasts"></div>'); document.body.appendChild(n); return n; })();
    const t = el('<div class="p4-toast ' + (kind || '') + '"><span class="tk">' + ic(kind === 't-err' ? 'x' : (kind === 't-brass' ? 'prop' : 'check')) + '</span><span></span></div>');
    t.querySelector('span:last-child').textContent = msg;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 380); }, 3600);
  }
  function veil() {
    if (!U.veil) { U.veil = el('<div id="p4veil"></div>'); document.body.appendChild(U.veil); }
    U.veil.classList.add('show');
    return () => setTimeout(() => U.veil.classList.remove('show'), 320);
  }
  function vign(v) {
    if (!U.vign) { U.vign = el('<div id="p4vign"></div>'); document.body.appendChild(U.vign); }
    U.vign.style.setProperty('--v', Math.max(0.02, v));
    U.vign.style.opacity = v > 0.03 ? '1' : '0';
  }
  function hudText() {
    const m = ENVMETA[S.envKey] || {};
    const el2 = $('#p4hud');
    if (el2) el2.innerHTML = '<span class="dot"></span><span><b>' + (m.name || S.envKey) + '</b> · ' + S.lightName + ' · <b id="p4fps">—</b></span>';
  }

  /* ---------------- engine call wrappers ---------------- */
  const waitModels = n => { const e = P3(); return e && e.models && e.models.length >= (n || 1); };
  function modelName(m) {
    const base = String(m.url || '').split('/').pop().replace(/\.glb$/i, '').replace(/[_-]+/g, ' ');
    if (m.isDemo) return 'Demo · ' + base;
    return base;
  }
  function demoModel() { const e = P3(); return e.models.find(m => m.isDemo) || e.models[0]; }
  function currentPart() { const e = P3(); return e.selectedPart || null; }
  function primaryModel() { const e = P3(); return demoModel() || e.models[0]; }

  /* ---------------- build: dock ---------------- */
  const TOOLS = [
    { id: 'select', n: 'Select', ic: 'select', desc: 'Move, scale & organise' },
    { id: 'cam', n: 'Camera', ic: 'camera', desc: 'Hero framings & saved shots' },
    { id: 'env', n: 'Environments', ic: 'env', desc: 'Loft + studio backgrounds' },
    { id: 'light', n: 'Lighting', ic: 'light', desc: 'One-tap cinematic looks' },
    { id: 'mat', n: 'Materials', ic: 'material', desc: 'Finishes on selected parts' },
    { id: 'sandbox', n: 'Sandbox', ic: 'sandbox', desc: 'Pilot diagrams (soon)', soon: true },
    { id: 'render', n: 'Render', ic: 'render', desc: 'Export stills, reel & scene' },
  ];
  const PANEL_TITLES = { select: 'Object Studio', cam: 'Camera Studio', env: 'Studio Backdrops', light: 'Cinematic Lighting', mat: 'Materials Library', sandbox: 'Pilot Sandbox', render: 'Render & Export' };

  function buildDock() {
    const d = el('<div class="p4-dock" role="toolbar" aria-label="Creator toolbar"></div>');
    TOOLS.forEach(t => {
      const b = el('<button class="p4-tool' + (t.soon ? ' soon' : '') + '" data-tool="' + t.id + '" title="' + t.desc + '">' + ic(t.ic, 22) + '<span>' + t.n + '</span>' + (t.soon ? '<em class="p4-badge2">NEXT</em>' : '') + '</button>');
      d.appendChild(b);
    });
    document.body.appendChild(d);
    U.dock = d;
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-tool]'); if (!b) return;
      openTool(b.dataset.tool);
    });
  }
  function setToolUI(id) {
    if (U.dock) $$('.p4-tool', U.dock).forEach(x => x.classList.toggle('on', x.dataset.tool === id));
    const bell = $('#p4bell'); if (bell) bell.classList.toggle('on', !!id && !U.rail);
  }

  /* ---------------- right inspector ---------------- */
  function buildRailR() {
    const r = el('<aside class="p4-rail R" id="p4railR" aria-label="Creator inspector"></aside>');
    const hd = el('<div class="rail-h"><button class="ghost mark" data-min="home">' + ic('prop', 18) + '</button><div class="lab" style="flex:1"><b id="p4ptitle">Inspector</b><span id="p4psub">Creator studio</span></div><button class="ghost" data-undo title="Undo (Ctrl/⌘+Z)">' + ic('reset') + '</button><button class="ghost" data-close title="Close">' + ic('x') + '</button></div>');
    const sc = el('<div class="p4-insp-scroll"></div>');
    r.appendChild(hd); r.appendChild(sc);
    document.body.appendChild(r);
    U.railR = r; U.inspScroll = sc;
    hd.querySelector('[data-close]').addEventListener('click', () => closeRail());
    hd.querySelector('[data-undo]').addEventListener('click', async () => { const e = P3(); if (!e) return; try { await e.undo(); } catch (err) {} if (e._syncUI) e._syncUI(); if (S.renderModels) S.renderModels(); toast('Undo'); });
    hd.querySelector('[data-min="home"]').addEventListener('click', () => { closeRail(); showWelcome(true); });
  }
  function closeRail() {
    U.rail = false; U.railR.classList.remove('open'); setToolUI(null);
    if (P3() && U._wasSelect) { P3().toolId = 'select'; P3()._syncUI && P3()._syncUI(); }
  }
  function openTool(id, opts) {
    const e = P3(); if (!e) return;
    opts = opts || {};
    if (U.rail && S.tool === id && !opts.force) { closeRail(); return; }
    S.tool = id;
    U.rail = true;
    U.railR.classList.add('open');
    setToolUI(id);
    // engine tool id drives object toolbar visibility / hints
    e.toolId = (id === 'select') ? 'select' : id;
    e._syncUI && e._syncUI();
    document.body.classList.toggle('p4-select', id === 'select');
    U._wasSelect = id === 'select';
    buildPanel(id);
  }

  function setPanel(h, title, sub) {
    U.railR.querySelector('#p4ptitle').textContent = title;
    U.railR.querySelector('#p4psub').textContent = sub || 'Creator studio';
    clear(U.inspScroll);
    U.inspScroll.appendChild(h);
  }
  const secT = t => el('<div class="p4-secT"><span class="k">' + ic('prop', 12) + '</span><b>' + t + '</b><span class="rule"></span></div>');

  function buildPanel(id) {
    const e = P3();
    if (id === 'select') buildSelectPanel();
    else if (id === 'cam') buildCamPanel();
    else if (id === 'env') buildEnvPanel();
    else if (id === 'light') buildLightPanel();
    else if (id === 'mat') buildMatPanel();
    else if (id === 'sandbox') buildSandboxPanel();
    else if (id === 'render') buildRenderPanel();
    hudText();
  }

  /* ================= SELECT / OBJECT STUDIO ================= */
  function buildSelectPanel() {
    const e = P3();
    const h = el('<div></div>');
    h.appendChild(el('<div class="p4-hint">Tap a part on the model to pick its finish · drag to orbit · pinch to zoom</div>'));
    h.appendChild(secT('On the stage'));
    const ml = el('<div class="p4-mlist"></div>');
    h.appendChild(ml);
    const renderModels = () => {
      clear(ml);
      e.models.forEach(m => {
        const row = el('<div class="p4-m' + (e.selectedModel === m ? ' on' : '') + '" data-m="' + e.models.indexOf(m) + '"><span class="mi">' + ic('cube') + '</span><span class="mm"><b></b><span></span></span>' + (m.isDemo ? '<span class="st demo">HERO</span>' : (m.isSecondary ? '<span class="st">SIDECAR</span>' : '<span class="st">ADDED</span>')) + '</div>');
        row.querySelector('.mm b').textContent = modelName(m);
        row.querySelector('.mm span').textContent = (m.locked ? 'locked · ' : '') + (m.root.visible ? 'visible' : 'hidden');
        row.addEventListener('click', () => { e.selectModel(m); renderModels(); if (e._syncUI) e._syncUI(); });
        ml.appendChild(row);
      });
    };
    renderModels();
    h.appendChild(el('<button class="p4-btn ghost2" id="p4addglb" style="width:100%;justify-content:center;display:flex;align-items:center;gap:8px">' + ic('upl', 16) + ' Add a sidecar GLB</button>'));
    h.appendChild(secT('Move · rotate · scale'));
    const modes = [['translate', 'Move', 'move'], ['rotate', 'Rotate', 'rotate'], ['scale', 'Scale', 'scale']];
    const tg = el('<div class="p4-toolgrid" id="p4modes"></div>');
    modes.forEach(m => tg.appendChild(el('<button class="p4-minitool' + (e.transformMode === m[0] ? ' on' : '') + '" data-mode="' + m[0] + '">' + ic(m[2], 20) + '<span>' + m[1] + '</span></button>')));
    h.appendChild(tg);
    h.appendChild(secT('Object actions'));
    const acts = [['dup', 'Duplicate', 'dup'], ['hide', 'Hide / Show', 'eye'], ['lock', 'Lock', 'lock'], ['reset', 'Reset', 'reset'], ['del', 'Delete', 'trash']];
    const ag = el('<div class="p4-chiprow"></div>');
    acts.forEach(a => ag.appendChild(el('<button class="p4-chip" data-a="' + a[0] + '">' + a[1] + '</button>')));
    h.appendChild(ag);
    h.appendChild(el('<div class="p4-hint" id="p4selhint" style="margin-top:10px"></div>'));
    setPanel(h, PANEL_TITLES.select, 'Move, style & organise your build');

    // wire
    const target = () => e.selectedModel || (e.models.length ? e.models[e.models.length - 1] : null);
    const hint = () => { const t = target(); $('#p4selhint').textContent = t ? (t.isDemo ? 'Primary hero product · protected from delete' : 'Model ' + e.models.indexOf(t) + ' · ' + (t.locked ? 'locked' : 'editable')) : 'No model on stage yet — add one below.'; };
    hint();
    tg.addEventListener('click', ev => { const b = ev.target.closest('[data-mode]'); if (!b) return; if (!target()) return toast('Add a product first', 't-err'); e.setTransformMode(b.dataset.mode); $$('[data-mode]', tg).forEach(x => x.classList.toggle('on', x === b)); });
    ag.addEventListener('click', ev => {
      const b = ev.target.closest('[data-a]'); const t = target(); if (!b) return;
      if (!t && b.dataset.a !== 'dup') return;
      const a = b.dataset.a;
      if (a === 'dup') { e.duplicate(e, t).then(() => { e.push('duplicate'); renderModels(); toast('Duplicated on the stage', 't-brass'); }); }
      else if (a === 'hide') { e.toggleHidden(e, t); renderModels(); }
      else if (a === 'lock') { e.setLock(e, t, !t.locked); renderModels(); }
      else if (a === 'reset') { if (e.reset) { e.reset(e, t); toast('Transform reset'); } }
      else if (a === 'del') { if (t && !t.isDemo) { e.remove(e, t); e.push('delete'); renderModels(); toast('Removed'); } else toast('The hero product is protected — duplicate it instead', 't-err'); }
    });
    $('#p4addglb').addEventListener('click', () => importGlb());
    S.renderModels = renderModels; S.renderHint = hint;
  }

  function importGlb() {
    const e = P3();
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.glb,.gltf'; inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const ent = await e.importFile(e, f);
        if (ent) { setStage('demo'); e.push('import'); if (e._syncUI) e._syncUI(); toast('Sidecar on the stage', 't-brass'); }
      } catch (err) { toast('Could not load ' + f.name, 't-err'); }
      inp.remove();
    });
    inp.click();
  }

  /* ================= CAMERA ================= */
  /* Camera thumbnail art — small inline SVG framing previews */
  function camArt(k) {
    const G = '<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3138"/><stop offset="1" stop-color="#0c0e12"/></linearGradient><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3ac"/><stop offset=".45" stop-color="#59616b"/><stop offset="1" stop-color="#23262b"/></linearGradient></defs>';
    const box = '<ellipse cx="100" cy="86" rx="46" ry="12" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1"/><ellipse cx="100" cy="86" rx="36" ry="8.5" fill="rgba(255,255,255,.05)"/><rect x="84" y="56" width="32" height="30" rx="4" fill="url(#m)"/><rect x="78" y="48" width="8" height="6" rx="1.6" fill="url(#m)"/>';
    const cam = (x, y, r) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ')"><rect x="-8" y="-6" width="16" height="11" rx="2.6" fill="none" stroke="#caa35e" stroke-width="1.5"/><circle cx="0" cy="-0.5" r="2.6" fill="none" stroke="#e6c98e" stroke-width="1.3"/><path d="M-3 -6 L-1 -8.4 L1 -8.4 L2.4 -6" fill="none" stroke="#caa35e" stroke-width="1.2"/></g>';
    let extra = '';
    const k2 = String(k).toLowerCase();
    if (k2 === 'orbit spin') {
      extra = '<ellipse cx="100" cy="72" rx="58" ry="26" fill="none" stroke="#5f6a7a" stroke-width="1" stroke-dasharray="3 4"/>' + cam(150, 62, -30) + cam(52, 96, 150) + '<path d="M136 60 A44 44 0 1 1 138 92" fill="none" stroke="#caa35e" stroke-width="1.5" stroke-dasharray="1 5" stroke-linecap="round"/><path d="M133 54 l12 3 -4 11z" fill="#e6c98e"/>';
    } else if (k2 === 'reel') {
      extra = '<rect x="94" y="18" width="34" height="56" rx="4" fill="none" stroke="#dfe6f0" stroke-width="1.4"/>' + cam(62, 84, 100) + '<path d="M30 30 h14 M30 36 h14 M30 42 h14" stroke="rgba(202,163,94,.8)" stroke-width="1.6" stroke-linecap="round"/>';
    } else if (k2 === 'top') {
      extra = '<rect x="80" y="44" width="40" height="40" rx="3" fill="none" stroke="#e6c98e" stroke-width="1.3"/><rect x="80" y="44" width="40" height="40" rx="3" fill="none" stroke="#caa35e" stroke-width="1" transform="translate(0 0)"/>' + cam(160, 34, 90) + '<path d="M60 34 h22 M60 84 h22" stroke="rgba(255,255,255,.12)"/>';
    } else if (k2 === 'detail') {
      extra = '<circle cx="124" cy="52" r="17" fill="none" stroke="#e6c98e" stroke-width="1.7"/><path d="M136 65 l7 7" stroke="#caa35e" stroke-width="1.9"/><path d="M124 42 v5 M124 62 v-3 M110 52 h5 M138 52 h3" stroke="#caa35e" stroke-width="1"/>' + cam(56, 84, 100);
    } else {
      const seat = { 'hero': [152, 76, -24], 'front': [100, 108, 0], 'side': [58, 78, 100], 'rear': [44, 66, 200], 'product': [150, 56, -26], 'left': [54, 74, 110], 'right': [146, 74, 70], 'detail': [48, 80, 120] };
      const key = Object.keys(seat).find(s2 => k2.indexOf(s2) >= 0) || 'hero';
      const p = seat[key];
      extra = cam(p[0], p[1], p[2]) + '<circle cx="100" cy="72" r="44" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1" stroke-dasharray="2 5"/>';
      if (key === 'product') extra = cam(158, 56, -26) + '<rect x="70" y="38" width="60" height="52" rx="6" fill="none" stroke="#e6c98e" stroke-width="1.3"/>';
    }
    return '<svg viewBox="0 0 200 116" aria-hidden="true">' + G + '<rect width="200" height="116" fill="url(#cg)"/>' + extra + box + '</svg>';
  }

  function buildCamPanel() {
    const e = P3();
    const h = el('<div></div>');
    CAMG.forEach(g => {
      h.appendChild(secT(g.t));
      const row = el('<div class="p4-camgrid"></div>');
      g.items.forEach(k => row.appendChild(el('<button class="p4-camcard" data-cam="' + k + '">' +
        '<span class="th">' + camArt(k) + '<span class="chk">' + ic('check', 11) + '</span></span>' +
        '<span class="lb"><b>' + k + '</b></span></button>')));
      h.appendChild(row);
    });
    h.appendChild(secT('Lens & look'));
    const sl = el('<div></div>');
    const fov = Math.round(e.camera.fov);
    const mk = (key, label, min, max, val, fmt, cb) => {
      const w = el('<div class="p4-slide"><div class="top"><label>' + label + '</label><output></output></div><input type="range" min="' + min + '" max="' + max + '" step="1" value="' + val + '" data-slide="' + key + '"></div>');
      const out = w.querySelector('output'); const inp = w.querySelector('input');
      const upd = () => out.textContent = fmt(Number(inp.value));
      inp.addEventListener('input', () => { upd(); cb(Number(inp.value)); });
      upd();
      return w;
    };
    const mm = v => Math.round(50 * (36 / Math.max(v, 8))).toString() + ' mm';
    sl.appendChild(mk('fov', 'Field of view', 16, 78, fov, v => v + '°', v => { if (e.camera) { e.camera.fov = v; e.camera.updateProjectionMatrix(); } }));
    sl.appendChild(mk('lens', 'Lens', 16, 78, fov, mm, () => {}));
    sl.appendChild(mk('exp', 'Exposure', 3, 26, Math.round((e.renderer ? e.renderer.toneMappingExposure : 1) * 10), v => (v / 10).toFixed(1) + ' EV', v => { if (e.renderer) e.renderer.toneMappingExposure = v / 10; }));
    sl.appendChild(mk('vig', 'Vignette', 0, 10, 4, v => Math.round(v * 10) + '%', v => vign(v / 10)));
    h.appendChild(sl);
    h.appendChild(el('<button class="p4-sw on" id="p4af"><span class="tr"></span><span>Focus locked on product</span></button>'));
    h.appendChild(el('<div class="p4-hint" style="margin-top:6px">Sharp focus stays on the product automatically. Cinematic bokeh / depth-of-field arrives with the reel pipeline.</div>'));
    h.appendChild(el('<div class="p4-div"></div>'));
    h.appendChild(secT('Saved cameras'));
    const sv = el('<div class="p4-bar"><input class="p4-inline-input" placeholder="Name this camera (optional)"><button class="p4-btn" id="p4savecam">Save</button></div>');
    const lst = el('<div class="p4-mlist" id="p4camlist"></div>');
    h.appendChild(sv); h.appendChild(lst);
    h.appendChild(el('<div class="p4-div"></div>'));
    h.appendChild(secT('Reference image prep'));
    h.appendChild(el('<div class="p4-card warn"><div class="hh"><span class="hdot">' + ic('spark', 14) + '</span><b>Prepare AI reference images</b><span class="soon">PHASE 5</span></div><p>Point the camera at the composition you like, then generate mood reference images from it — arriving in a later phase. This panel is the placeholder.</p></div>'));
    setPanel(h, PANEL_TITLES.cam, 'Visual framings, lens & saved shots');

    const mark = () => {
      const cur = (e.cameraMode || 'hero').toLowerCase();
      $$('[data-cam]', h).forEach(c => {
        const k = c.dataset.cam.toLowerCase();
        c.classList.toggle('on', k === cur || (k === 'hero' && cur === 'hero'));
      });
    };
    mark();
    h.addEventListener('click', ev => {
      const b = ev.target.closest('[data-cam]'); if (!b) return;
      const k = b.dataset.cam;
      // hero/story framings settle instantly with the loft-readable composition (platform
      // as the lower strip, backdrop filling the upper stage) rather than the product-fill
      // low angle that lets the black mirror disc dominate the frame. Other presets keep the
      // engine's eased move.
      const heroish = /hero/i.test(k);
      e.setCameraPreset(k, { instant: heroish });
      e.push('camera');
      toast('Camera · ' + k);
      mark();
      if (heroish) frameHeroLoft(e);
    });
    const sw = $('#p4af'); sw.addEventListener('click', () => sw.classList.toggle('on'));
    const renderCams = () => {
      const list = store('cams') || [];
      clear(lst);
      if (!list.length) { lst.appendChild(el('<div class="p4-emptycard"><b>No saved cameras yet</b><span class="mini">Frame it, tap save — recall it anytime.</span></div>')); return; }
      list.forEach(c => {
        const row = el('<div class="p4-row"><span class="ic">' + ic('camera') + '</span><span class="mm"><b></b><span></span></span><button data-do="go" title="Move camera">' + ic('chev') + '</button><button data-do="del" title="Delete">' + ic('x') + '</button></div>');
        row.querySelector('.mm b').textContent = c.n || 'Camera ' + new Date(c.at).toLocaleTimeString();
        row.querySelector('.mm span').textContent = new Date(c.at).toLocaleString();
        row.querySelector('[data-do="go"]').addEventListener('click', () => {
          e.camera.position.set(c.p[0], c.p[1], c.p[2]);
          e.controls.target.set(c.t[0], c.t[1], c.t[2]);
          e.camera.fov = c.fov || e.camera.fov; e.camera.updateProjectionMatrix();
          e.controls.update(); e.camera.lookAt(e.controls.target);
          e.cameraMode = 'saved:' + c.n; e.push('camera'); toast('Camera recalled', 't-brass'); mark();
        });
        row.querySelector('[data-do="del"]').addEventListener('click', () => { store('cams', list.filter(x => x.id !== c.id)); renderCams(); });
        lst.appendChild(row);
      });
    };
    renderCams();
    $('#p4savecam').addEventListener('click', () => {
      const nm = (sv.querySelector('input').value || '').trim();
      const list = store('cams') || [];
      const cam = e.camera, tgt = e.controls.target;
      list.unshift({ id: uid(), n: nm || ('Camera ' + (list.length + 1)), at: Date.now(), p: [cam.position.x, cam.position.y, cam.position.z], t: [tgt.x, tgt.y, tgt.z], fov: cam.fov });
      store('cams', list.slice(0, 20));
      sv.querySelector('input').value = '';
      toast('Camera saved', 't-brass'); renderCams();
    });
  }

  /* ================= ENVIRONMENTS ================= */
  function buildEnvPanel() {
    const e = P3();
    const h = el('<div></div>');
    const cur = () => S.envKey;
    h.appendChild(secT('Hero · your home loft'));
    const list = e.ENVS || [];
    const hero = list.find(x => x.hero) || list[0];
    const heroCard = el('<div class="p4-envhero" data-env="' + hero.key + '"><div class="cap"><span>HOMEBASE</span><b></b><small></small></div></div>');
    heroCard.style.backgroundImage = "url('" + envPrev('hero') + "')";
    heroCard.querySelector('b').textContent = ENVMETA[hero.key].name;
    heroCard.querySelector('small').textContent = ENVMETA[hero.key].tag + ' · black circular platform · cinematic key light';
    h.appendChild(heroCard);
    h.appendChild(secT('Studio backgrounds · ' + (list.length - 1)));
    const grid = el('<div class="p4-envgrid"></div>');
    list.forEach(c => {
      if (c.hero) return;
      const meta = ENVMETA[c.key] || { name: c.title, tag: 'Studio backdrop' };
      const tile = el('<div class="p4-env" data-env="' + c.key + '"><div class="cap"><b></b><span></span></div></div>');
      tile.style.backgroundImage = "url('" + envPrev(c.key) + "')";
      tile.querySelector('b').textContent = meta.name;
      tile.querySelector('span').textContent = meta.tag;
      grid.appendChild(tile);
    });
    h.appendChild(grid);
    h.appendChild(secT('Studio platform'));
    const fr = el('<div class="p4-chiprow"></div>');
    FLOORS.forEach(f => fr.appendChild(el('<button class="p4-chip" data-floor="' + f + '">' + f + '</button>')));
    h.appendChild(fr);
    h.appendChild(el('<div class="p4-hint">Switching backdrops keeps your camera exactly where it is — only the light & atmosphere change.</div>'));
    setPanel(h, PANEL_TITLES.env, 'Hero loft + the ten studio backgrounds');

    const mark = () => {
      $$('[data-env]', h).forEach(x => x.classList.toggle('on', x.dataset.env === cur()));
      $$('[data-floor]', h).forEach(x => x.classList.toggle('on', (e.floor && e.floor.preset) === x.dataset.floor));
    };
    mark();
    h.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-env]'); if (!b) return;
      const k = b.dataset.env;
      if (k === cur()) return;
      const done = veil();
      try { await e.setEnvKey(k); S.envKey = k; e.push('environment'); } catch (err) { toast('Could not switch backdrop', 't-err'); }
      done(); mark(); hudText(); renderLibrary();
    });
    h.addEventListener('click', ev => {
      const b = ev.target.closest('[data-floor]'); if (!b) return;
      e.buildFloorPreset(b.dataset.floor); e.push('floor'); mark(); toast('Platform · ' + b.dataset.floor, 't-brass');
    });
  }

  /* ================= LIGHTING ================= */
  function buildLightPanel() {
    const e = P3();
    const h = el('<div></div>');
    h.appendChild(secT('One-tap cinematic looks'));
    const grid = el('<div class="p4-lookrow"></div>');
    LOOKS.forEach(L => {
      const g = LOOK_META[L.k] || ['rgba(255,255,255,.2)', 'rgba(120,140,255,.18)'];
      const b = el('<button class="p4-look" data-look="' + L.k + '"><b></b><span></span></button>');
      b.style.setProperty('--g1', g[0]); b.style.setProperty('--g2', g[1]);
      b.querySelector('b').textContent = L.n;
      b.querySelector('span').textContent = L.s;
      grid.appendChild(b);
    });
    h.appendChild(grid);
    h.appendChild(secT('Advanced'));
    h.appendChild(el('<button class="p4-chip" id="p4advbtn">' + ic('gear', 14) + ' Fine-tune light</button>'));
    const adv = el('<div style="display:none"></div>');
    const inten = Math.round((e.light.intensity || 1) * 100);
    const mk = (k, label, min, max, val, unit, cb) => {
      const w = el('<div class="p4-slide"><div class="top"><label>' + label + '</label><output></output></div><input type="range" min="' + min + '" max="' + max + '" step="1" value="' + val + '"></div>');
      const out = w.querySelector('output'), inp = w.querySelector('input');
      inp.addEventListener('input', () => { out.textContent = inp.value + (unit || ''); cb(Number(inp.value)); });
      out.textContent = inp.value + (unit || '');
      return w;
    };
    adv.appendChild(mk('it', 'Intensity', 40, 200, inten, '%', v => { e.setIntensity(e, v / 100); }));
    adv.appendChild(mk('tt', 'Colour temp', 2400, 7800, (e.light.temp || 5400), 'K', v => { e.setTemperature(e, v); }));
    const casts = el('<div class="p4-chiprow"></div>');
    ['Neutral', 'Warm', 'Cool'].forEach(c => casts.appendChild(el('<button class="p4-chip" data-cast="' + c + '">' + c + ' cast</button>')));
    adv.appendChild(el('<div class="p4-hint">Colour cast</div>')); adv.appendChild(casts);
    h.appendChild(adv);
    setPanel(h, PANEL_TITLES.light, 'Looks tuned to the loft · advanced stays hidden');
    const mark = () => {
      $$('[data-look]', h).forEach(x => x.classList.toggle('on', x.dataset.look === S.lookActive));
    };
    const applyLook = async L => {
      const done = veil();
      try {
        e.applyLightPreset(L.pr);
        if (L.cast && L.cast !== 'Neutral') e.applyOverride(e, L.cast);
        else { try { e.applyOverride(e, 'Neutral'); } catch (x) {} }
        if (L.temp) e.setTemperature(e, L.temp); else { try { e.setTemperature(e, 0); } catch (x) {} }
        e.setIntensity(e, L.it);
        S.lookActive = L.k; S.lightName = L.n;
        e.push('lighting');
      } catch (err) { toast('Could not apply light', 't-err'); }
      done(); mark(); hudText();
    };
    applyLook(LOOKS[0]); // ensure synced on open
    grid.addEventListener('click', ev => { const b = ev.target.closest('[data-look]'); if (b) applyLook(LOOKS.find(L => L.k === b.dataset.look)); });
    $('#p4advbtn').addEventListener('click', ev => {
      const show = adv.style.display === 'none';
      adv.style.display = show ? 'block' : 'none';
      ev.currentTarget.classList.toggle('on', show);
    });
    casts.addEventListener('click', ev => { const b = ev.target.closest('[data-cast]'); if (!b) return; e.applyOverride(e, b.dataset.cast); S.lightName = b.dataset.cast + ' cast'; e.push('lighting'); hudText(); });
  }

  /* ================= MATERIALS ================= */
  let scopePart = null;
  function refreshMatTarget() {
    const e = P3();
    if (!U.matEl.hint) return;
    const part = e.selectedPart;
    U.matEl.hint.innerHTML = part
      ? 'Styling <b>' + part.name + '</b> on ' + modelName(part.model) + ' — pick a finish below.'
      : 'Tap a part on the model to style it, or use <b>Whole product</b>.';
    $$('.p4-scopebar .scope', U.matEl.root || document).forEach(b => b.classList.toggle('on', !part ? b.dataset.sc === 'model' : false));
  }
  function applySwatch(s) {
    const e = P3();
    const part = e.selectedPart;
    if (S.scope === 'part' && !part) { toast('Tap a part on the product first', 't-err'); return; }
    const tgtModel = part ? part.model : (e.selectedModel || primaryModel());
    const set = p => e.setPartOverride(e, p, { color: s.c, rough: s.r, metal: s.m, op: s.o });
    const wasNo = e._noHistory;
    e._noHistory = true;
    try {
      if (!part && S.scope === 'model') {
        const parts = (e.parts || []).filter(p => p.model === tgtModel && !p.model.locked);
        const all = parts.length ? parts : (e.parts || []).filter(p => p.model === tgtModel);
        if (!all.length) { toast('Nothing to style on that model yet', 't-err'); return; }
        all.forEach(p => { try { set(p); } catch (x) {} });
      } else {
        const target = part || (e.parts || []).find(p => p.model === tgtModel);
        if (!target) { toast('No part to style', 't-err'); return; }
        set(target);
      }
    } finally { e._noHistory = wasNo; }
    e.push('material');
    const nm = s.n;
    const rec = store('recent') || []; store('recent', [nm].concat(rec.filter(r => r !== nm)).slice(0, 8));
    toast('Applied · ' + nm, 't-brass');
    renderMatSwatches();
  }
  function buildMatPanel() {
    const e = P3();
    const h = el('<div></div>');
    U.matEl.root = h;
    const scope = el('<div class="p4-scopebar"><button class="scope" data-sc="model"><span class="mi">' + ic('cube') + '</span><span style="flex:1"><b>Whole product</b><span>finishes every visible part</span></span></button><button class="scope" data-sc="part"><span class="mi">' + ic('scale') + '</span><span style="flex:1"><b>Selected part</b><span>one material, one surface</span></span></button></div>');
    h.appendChild(scope);
    const hint = el('<div class="p4-hint"></div>'); U.matEl.hint = hint; h.appendChild(hint);
    h.appendChild(secT('Favourites'));
    const favWrap = el('<div id="p4favs"></div>'); h.appendChild(favWrap);
    h.appendChild(secT('Recently used'));
    const recWrap = el('<div class="p4-chiprow" id="p4recents"></div>'); h.appendChild(recWrap);
    const cats = el('<div id="p4cats"></div>'); h.appendChild(cats);
    setPanel(h, PANEL_TITLES.mat, 'Realistic finishes · drag or tap onto the model');
    refreshMatTarget();
    hint.addEventListener('click', () => { openTool('select'); });

    scope.addEventListener('click', ev => {
      const b = ev.target.closest('[data-sc]'); if (!b) return;
      S.scope = b.dataset.sc;
      $$('.scope', scope).forEach(x => x.classList.toggle('on', x === b));
    });
    cats.addEventListener('click', ev => {
      const sw = ev.target.closest('.p4-swatch'); if (!sw) return;
      const nm = sw.dataset.sw;
      const rec = MATS.flatMap(c => c.items).find(i => i.n === nm);
      if (rec) applySwatch(rec);
    });
    cats.addEventListener('dblclick', ev => {
      const sw = ev.target.closest('.p4-swatch'); if (!sw) return;
      const favs = store('favs') || [];
      const nm = sw.dataset.sw;
      store('favs', favs.includes(nm) ? favs.filter(f => f !== nm) : favs.concat(nm));
      renderMatSwatches();
      toast(favs.includes(nm) ? 'Removed from favourites' : 'Favourite saved', 't-brass');
    });
    renderMatSwatches();
  }
  function swatchEl(i, cat, favs, small) {
    const sw = el('<div class="p4-swatch' + (favs.includes(i.n) ? ' fav' : '') + '" data-sw="' + i.n + '" draggable="true" title="' + i.n + ' · drag onto the model">' +
      '<span class="sw-chip sw--' + (i.k || 'powder') + '" style="--mc:' + i.c + '"></span>' +
      '<span class="tx">' + i.n + '</span>' + (small ? '' : '<span class="cat">' + cat + '</span>') +
      '<span class="st">' + ic('star', 10) + '</span></div>');
    sw.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/p4sw', i.n); });
    return sw;
  }
  function renderMatSwatches() {
    const favs = store('favs') || [], rec = store('recent') || [];
    const favWrap = $('#p4favs'), recWrap = $('#p4recents'), cats = $('#p4cats');
    if (!favWrap || !cats) return;
    const flat = MATS.flatMap(c => c.items.map(i => ({ i, c: c.cat })));
    clear(favWrap);
    const favItems = flat.filter(o => favs.includes(o.i.n));
    if (favItems.length) {
      const wr = el('<div class="p4-swgrid"></div>');
      favItems.forEach(o => wr.appendChild(swatchEl(o.i, o.c, favs, true)));
      favWrap.appendChild(wr);
    } else favWrap.appendChild(el('<div class="p4-emptycard"><b>Pin your go-to finishes</b><span class="mini">double-tap a swatch to pin it here</span></div>'));
    clear(recWrap);
    rec.forEach(nm => { const o = flat.find(x => x.i.n === nm); if (o) { const b = el('<button class="p4-chip" data-rec="' + nm + '">' + nm + '</button>'); recWrap.appendChild(b); } });
    recWrap.addEventListener('click', ev => { const b = ev.target.closest('[data-rec]'); if (!b) return; const o = flat.find(x => x.i.n === b.dataset.rec); if (o) applySwatch(o.i); });
    clear(cats);
    MATS.forEach(cat => {
      const sec = el('<div class="p4-cat"><div class="cap"><b>' + cat.cat + '</b><span class="ln"></span></div></div>');
      const gr = el('<div class="p4-swgrid"></div>');
      cat.items.forEach(i => gr.appendChild(swatchEl(i, cat.cat, favs)));
      sec.appendChild(gr);
      cats.appendChild(sec);
    });
    refreshMatTarget();
  }

  /* ================= SANDBOX gallery (no dead SOON) ================= */
  function sbxArt(kind) {
    const brass = '#caa35e', hi = '#e6c98e', soft = '#5f6a7a';
    const tick = a => { const r=a*Math.PI/180; return '<path d="M' + (100+Math.cos(r)*31)+' '+(62+Math.sin(r)*31)+' L'+(100+Math.cos(r)*35)+' '+(62+Math.sin(r)*35)+'"/>'; };
    if (kind === 'dial') return '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice"><rect width="200" height="120" fill="#0b0d11"/><circle cx="100" cy="62" r="40" fill="none" stroke="' + soft + '" stroke-width="1.6"/><circle cx="100" cy="62" r="46" fill="none" stroke="rgba(255,255,255,.07)"/><path d="M64 62 L100 62 L100 40" stroke="' + brass + '" stroke-width="2.4" stroke-linecap="round"/><g stroke="' + soft + '" stroke-width="1.4">' + [0,45,90,135,180,225,270,315].map(tick).join('') + '</g><circle cx="100" cy="62" r="3" fill="' + hi + '"/></svg>';
    if (kind === 'arc') return '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice"><rect width="200" height="120" fill="#0b0d11"/><path d="M42 94 A72 72 0 0 1 158 68" fill="none" stroke="rgba(202,163,94,.30)" stroke-width="6"/><path d="M42 94 A72 72 0 0 1 158 68" fill="none" stroke="' + brass + '" stroke-width="1.8" stroke-dasharray="1 7" stroke-linecap="round"/><path d="M152 64 l11 3 -7 8z" fill="' + hi + '"/><g stroke="' + soft + '" opacity=".7"><path d="M34 26 H166"/><path d="M34 34 H166"/><path d="M34 42 H166"/></g></svg>';
    if (kind === 'route') return '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice"><rect width="200" height="120" fill="#0b0d11"/><path d="M24 92 C 60 90, 70 44, 110 46 S 158 70, 178 34" fill="none" stroke="' + brass + '" stroke-width="1.7" stroke-dasharray="1 6" stroke-linecap="round"/><circle cx="24" cy="92" r="3" fill="' + hi + '"/><circle cx="178" cy="34" r="3" fill="' + hi + '"/><path d="M146 52 l16 5 -8 15z" fill="' + hi + '"/><g stroke="' + soft + '" opacity=".6"><path d="M20 46 H80"/><path d="M24 60 H92"/><path d="M28 74 H104"/></g></svg>';
    if (kind === 'page') return '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice"><rect width="200" height="120" fill="#0b0d11"/><rect x="52" y="18" width="96" height="80" rx="3" fill="#13161b" stroke="' + soft + '" stroke-width="1.2"/><g stroke="' + soft + '" opacity=".8"><path d="M64 32 H136"/><path d="M64 42 H126"/><path d="M64 52 H136"/><path d="M64 62 H112"/></g><rect x="64" y="76" width="18" height="6" rx="1" fill="' + brass + '" opacity=".9"/><rect x="86" y="76" width="26" height="6" rx="1" fill="' + soft + '" opacity=".6"/></svg>';
    return '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice"><rect width="200" height="120" fill="#0b0d11"/><path d="M40 86 L100 40 L160 86 Z" fill="none" stroke="' + brass + '" stroke-width="1.6"/><path d="M72 86 L100 62 L128 86 Z" fill="none" stroke="' + soft + '" stroke-width="1.2"/><g stroke="rgba(255,255,255,.08)"><path d="M56 86 L100 50 L144 86"/><path d="M70 86 L100 62 L130 86"/></g></svg>';
  }
  function buildSandboxPanel() {
    const h = el('<div></div>');
    h.appendChild(el('<div class="p4-sbx-hero"><div class="ld"><span class="ico">' + ic('sandbox', 18) + '</span><b>Pilot Sandbox</b><span class="tag">Next update</span></div><h4>Your products, drawn as flight stories</h4><p>Pressure, attitude &amp; performance diagrams over any camera angle — no CAD required. This is the studio we are building. It arrives in the next update; the welcome card then lights up.</p><div class="chips"><span>Pressure &amp; Attitude</span><span>Performance Envelope</span><span>eBook pages</span><span>Annotations</span></div></div>'));
    h.appendChild(secT('Diagram types'));
    const grid = el('<div class="p4-sbxgrid"></div>');
    const types = [
      ['dial', 'Pressure & Attitude', 'Airspeed, altitude & climb drawn over your hero product.'],
      ['arc', 'Performance Envelope', 'Safe-flight envelopes on any camera angle you have framed.'],
      ['route', 'Flight Plan', 'Take-off, cruise & landing beats as storyboard frames.'],
      ['page', 'eBook Diagram', 'Clean, book-ready diagram pages with your brand type.'],
    ];
    types.forEach(t => grid.appendChild(el('<button class="p4-sbx" data-sbx="' + t[0] + '"><span class="art">' + sbxArt(t[0]) + '<span class="shim"></span></span><span class="nxt">Next update</span><span class="meta"><b>' + t[1] + '</b><span>' + t[2] + '</span></span></button>')));
    h.appendChild(grid);
    grid.addEventListener('click', ev => { const b = ev.target.closest('[data-sbx]'); if (!b) return; toast('Pilot Sandbox ships in the next update', 't-brass'); });
    h.appendChild(el('<div class="p4-div"></div>'));
    h.appendChild(secT('Concept previews'));
    h.appendChild(el('<div class="p4-sbxgrid"><div class="p4-sbx disabled"><span class="art">' + sbxArt('frame') + '</span><span class="peek">Concept</span></div>' +
      '<div class="p4-sbx disabled"><span class="art">' + sbxArt('dial') + '</span><span class="peek">Concept</span></div>' +
      '<div class="p4-sbx disabled"><span class="art">' + sbxArt('arc') + '</span><span class="peek">Concept</span></div></div>'));
    h.appendChild(el('<div class="p4-hint" style="margin-top:10px">Concept frames preview the sandbox aesthetic — the real diagram tools land together in the next update.</div>'));
    setPanel(h, PANEL_TITLES.sandbox, 'Diagram studio — next update');
  }

  /* ================= RENDER — visual creator actions first ================= */
  const RACTS = [
    { rd: 'photo', n: 'Render Photo', s: 'Still photo · current canvas & view', ic: 'photo', star: true },
    { rd: 'png', n: 'Transparent PNG', s: 'Product cut-out, clear background', ic: 'layers' },
    { rd: 'reel', n: 'Instagram Reel', s: '9:16 cinematic reel capture', ic: 'film' },
    { rd: 'ebook', n: 'eBook Diagram', s: '4:5 page frame for your book', ic: 'book' },
    { rd: 'project', n: 'Export Project', s: 'GLB + scene JSON bundle', ic: 'cube' },
  ];
  function buildRenderPanel() {
    const e = P3();
    const h = el('<div></div>');
    h.appendChild(el('<div class="p4-hint">Every export honours the current camera, backdrop &amp; platform.</div>'));
    h.appendChild(secT('Create'));
    const acts = el('<div style="display:flex;flex-direction:column;gap:8px"></div>');
    RACTS.forEach(rc => {
      acts.appendChild(el('<button class="p4-act' + (rc.star ? ' star' : '') + '" data-rd="' + rc.rd + '"><span class="ai">' + ic(rc.ic, 20) + '</span><span class="mm"><b>' + rc.n + '</b><span>' + rc.s + '</span></span><span class="go">' + ic('chev', 15) + '</span></button>'));
    });
    h.appendChild(acts);
    h.appendChild(el('<div class="p4-div"></div>'));
    h.appendChild(secT('Save session'));
    const sv = el('<div class="p4-bar"><input class="p4-inline-input" placeholder="Session name · e.g. Golden hero for the site"><button class="p4-btn brass" id="p4save">Save session</button></div>');
    h.appendChild(sv);
    const ses = el('<div class="p4-mlist" id="p4ses"></div>'); h.appendChild(ses);
    h.appendChild(el('<div class="p4-div"></div>'));
    // Advanced · canvas & technical exports (collapsed by default)
    const adv = el('<details class="p4-adv"><summary><span class="t">' + ic('gear', 14) + '</span>Advanced · canvas, resolution &amp; technical exports<span class="ch">' + ic('chev', 14) + '</span></summary><div class="body"></div></details>');
    const advBody = adv.querySelector('.body');
    advBody.appendChild(el('<div class="p4-secT"><b>Canvas</b><span class="rule"></span></div>'));
    const fm = el('<div class="p4-chiprow"></div>');
    FORMATS.forEach(f => fm.appendChild(el('<button class="p4-chip" data-fmt="' + f.f + '">' + f.f + '<span style="display:block;font-size:9px;color:var(--p4-ink3);font-weight:600">' + f.s + '</span></button>')));
    advBody.appendChild(fm);
    const rs = el('<div class="p4-chiprow"></div>'); RES.forEach(r => rs.appendChild(el('<button class="p4-chip" data-res="' + r + '">' + r + '</button>')));
    advBody.appendChild(el('<div class="p4-hint" style="margin:6px 0 2px">Resolution</div>')); advBody.appendChild(rs);
    advBody.appendChild(el('<div class="p4-div"></div>'));
    advBody.appendChild(el('<div class="p4-secT"><b>Technical</b><span class="rule"></span></div>'));
    const tx = el('<div class="p4-chiprow"></div>');
    tx.appendChild(el('<button class="p4-chip" data-act="glb">Scene GLB</button>'));
    tx.appendChild(el('<button class="p4-chip" data-act="json">Scene JSON</button>'));
    tx.appendChild(el('<button class="p4-chip" data-act="blender">Blender pack</button>'));
    advBody.appendChild(tx);
    advBody.appendChild(el('<div class="p4-hint" id="p4exnote" style="margin-top:8px"></div>'));
    h.appendChild(adv);
    setPanel(h, PANEL_TITLES.render, 'Photos, reel, diagrams & saved sessions');

    const note = () => { const fmt = e.exportCfg.format, res = e.exportCfg.res; const n = $('#p4exnote'); if (n) n.textContent = fmt + ' · ' + res + ' — technical exports use the current canvas.'; };
    note();
    const mark = () => {
      $$('[data-fmt]', h).forEach(x => x.classList.toggle('on', x.dataset.fmt === e.exportCfg.format));
      $$('[data-res]', h).forEach(x => x.classList.toggle('on', x.dataset.res === e.exportCfg.res));
    };
    mark();
    const fileBase = () => e.exportCfg.format.replace(/\s+/g, '_').toLowerCase();
    async function busy(b, fn) {
      b.classList.add('busy'); b.disabled = true;
      try { await fn(); toast('Export ready'); } catch (err) { console.error('export', err); toast('Export failed', 't-err'); }
      b.classList.remove('busy'); b.disabled = false;
    }
    acts.addEventListener('click', ev => {
      const b = ev.target.closest('[data-rd]'); if (!b) return;
      const rd = b.dataset.rd;
      if (rd === 'photo') busy(b, async () => { const blob = await e.still(e, { type: 'PNG' }); e.download(blob, 'render_photo_' + fileBase() + '.png'); });
      else if (rd === 'png') busy(b, async () => { const blob = await e.still(e, { type: 'PNG', transparent: true }); e.download(blob, 'cutout_' + fileBase() + '.png'); });
      else if (rd === 'reel') busy(b, async () => { const blob = await e.record(e, { seconds: 3.4 }); e.download(blob, 'reel_' + fileBase() + '.webm'); });
      else if (rd === 'ebook') busy(b, async () => {
        const prev = e.exportCfg.format;
        try { e.setFormat('4:5 story'); const blob = await e.still(e, { type: 'PNG' }); e.download(blob, 'ebook_diagram_45.png'); }
        finally { try { e.setFormat(prev); } catch (x) {} }
      });
      else if (rd === 'project') busy(b, async () => {
        e.download(new Blob([await e.glb(e)], { type: 'model/gltf-binary' }), 'project_' + fileBase() + '.glb');
        e.download(new Blob([e.jsonState(e)], { type: 'application/json' }), 'project_' + fileBase() + '.json');
        e.download(new Blob(['Studio of Sidecars project bundle — scene.glb + scene.json pair.\nReopen in the Creator Library or hand off to Blender Cycles.\n'], { type: 'text/plain' }), 'PROJECT.txt');
      });
    });
    h.addEventListener('click', ev => {
      const b = ev.target.closest('.p4-chip'); if (!b || !h.contains(b)) return;
      if (b.dataset.fmt) { e.setFormat(b.dataset.fmt); e.push('format'); mark(); note(); }
      else if (b.dataset.res) { e.exportCfg.res = b.dataset.res; e.push('format'); mark(); note(); }
      else if (b.dataset.act === 'glb') busy(b, async () => { e.download(new Blob([await e.glb(e)], { type: 'model/gltf-binary' }), 'scene.glb'); });
      else if (b.dataset.act === 'json') busy(b, async () => { e.download(new Blob([e.jsonState(e)], { type: 'application/json' }), 'scene.json'); });
      else if (b.dataset.act === 'blender') busy(b, async () => {
        e.download(new Blob([await e.glb(e)], { type: 'model/gltf-binary' }), 'scene.glb');
        e.download(new Blob([e.jsonState(e)], { type: 'application/json' }), 'scene.json');
        e.download(new Blob(['# Blender Cycles pack — import scene.glb + scene.json.\n'], { type: 'text/plain' }), 'CYCLES_PACK.txt');
      });
    });
    $('#p4save').addEventListener('click', () => {
      const nm = (sv.querySelector('input').value || '').trim();
      e.saveVersion(e, nm || undefined);
      sv.querySelector('input').value = '';
      toast('Session saved', 't-brass'); renderSes();
    });
    function renderSes() {
      const list = e.listVersions();
      clear(ses);
      if (!list.length) { ses.appendChild(el('<div class="p4-emptycard"><b>No saved sessions yet</b><span class="mini">save one — it remembers products, backdrops, lights, camera</span></div>')); return; }
      list.slice(0, 12).forEach(v => {
        const row = el('<div class="p4-row"><span class="ic">' + ic('clock') + '</span><span class="mm"><b></b><span></span></span><button data-do="go" title="Open">' + ic('chev') + '</button><button data-do="del" title="Delete">' + ic('x') + '</button></div>');
        row.querySelector('.mm b').textContent = v.name;
        row.querySelector('.mm span').textContent = new Date(v.at).toLocaleString();
        row.querySelector('[data-do="go"]').addEventListener('click', async () => {
          const done = veil();
          try { await e.loadVersion(e, v.id); if (e._syncUI) e._syncUI(); S.envKey = e.env ? e.env.key : 'hero'; toast('Opened · ' + v.name, 't-brass'); hudText(); renderLibrary(); }
          catch (err) { toast('Could not open session', 't-err'); }
          done();
        });
        row.querySelector('[data-do="del"]').addEventListener('click', () => { e.deleteVersion(v.id); renderSes(); renderLibrary(); });
        ses.appendChild(row);
      });
    }
    renderSes();
  }

  function buildRailL() {
    const r = el('<aside class="p4-rail L" id="p4railL" aria-label="Creator library"></aside>');
    const hd = el('<div class="rail-h"><button class="ghost mark" id="p4libmark">' + ic('prop', 18) + '</button><div class="lab" style="flex:1"><b>Creator Library</b><span>Studio of Sidecars</span></div><button class="ghost pin" id="p4libpin" title="Collapse / expand">' + ic('dock', 16) + '</button></div>');
    const search = el('<div class="p4-search"><div class="box">' + ic('search', 15) + '<input id="p4q" placeholder="Search your library" autocomplete="off"></div></div>');
    const tags = el('<div class="p4-tags" id="p4tags"></div>');
    const scroll = el('<div class="p4-lib-scroll" id="p4libscroll"></div>');
    const mini = el('<div class="p4-mini" id="p4mini"></div>');
    const foot = el('<div class="p4-railfoot"><span>offline · everything stays on this device</span></div>');
    r.appendChild(hd); r.appendChild(search); r.appendChild(tags); r.appendChild(scroll); r.appendChild(mini); r.appendChild(foot);
    document.body.appendChild(r);
    U.railL = r; U.libScroll = scroll;
    hd.querySelector('#p4libpin').addEventListener('click', () => toggleRailL());
    hd.querySelector('#p4libmark').addEventListener('click', () => { showWelcome(true); });
    $('#p4q').addEventListener('input', () => { S.search = $('#p4q').value.trim().toLowerCase(); renderLibrary(); });
    [['favourites', 'Favourites'], ['recent', 'Recently opened'], ['collections', 'Collections'], ['all', 'All'], ['products', 'Products'], ['diagrams', 'Diagrams']].forEach(td => {
      const t = td[0];
      const c = el('<button class="p4-tag" data-tag="' + t + '" title="Filter the library">' + td[1] + '</button>');
      c.addEventListener('click', () => { S.tag = t; renderLibrary(); });
      tags.appendChild(c);
    });
    // mini icons
    const miniDefs = [['open', 'Workspaces', 'dock'], ['projects', 'Projects', 'folder'], ['favs', 'Favourites', 'star'], ['recent', 'Recent', 'clock'], ['collections', 'Collections', 'layers'], ['Coffee Bikes', 'Coffee', 'book'], ['BBQ Bikes', 'BBQ', 'dup'], ['Sidecars', 'Sidecars', 'move'], ['Pilot Diagrams', 'Diagrams', 'prop']];
    miniDefs.forEach(d => {
      const b = el('<button data-mini="' + d[0] + '" title="' + d[1] + '">' + ic(d[2], 19) + '</button>');
      b.addEventListener('click', () => { openRailLFull(); scrollToGroup(String(d[0])); });
      mini.appendChild(b);
    });
    renderLibrary();
  }
  function toggleRailL() {
    const collapsed = U.railL.classList.contains('mini');
    U.railL.classList.toggle('mini', !collapsed);
  }
  function openRailLFull() { U.railL.classList.add('force-open'); U.railL.classList.remove('mini'); }
  function scrollToGroup(key) {
    // expand groups matching key
    const g = U.libScroll.querySelector('[data-g="' + key + '"]');
    if (g) { g.classList.add('open'); g.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  function renderLibrary() {
    const e = P3();
    if (!U.libScroll) return;
    const c = U.libScroll;
    clear(c);
    const q = S.search;
    const favs = store('favs') || [];
    const rec = store('recent') || [];
    const inScene = url => (e.models || []).filter(m => m.url === url).length;
    const tag = S.tag;

    const grp = (key, title, ico, bodyHtml, count, defOpen) => {
      const g = el('<section class="p4-grp' + (defOpen || S.open[key] ? ' open' : '') + '" data-g="' + key + '"><button class="p4-gh">' + ic(ico, 16) + '<span class="t"></span><span class="n"></span><span class="ch">' + ic('chev', 13) + '</span></button><div class="p4-gb"></div></section>');
      g.querySelector('.t').textContent = title;
      const n = g.querySelector('.n');
      if (count > 0) n.textContent = count;
      else n.style.display = 'none';
      g.querySelector('.p4-gb').innerHTML = bodyHtml;
      g.querySelector('.p4-gh').addEventListener('click', () => { g.classList.toggle('open'); });
      return g;
    };
    const tileWrap = (items, favSet) => items.length ? '<div class="p4-tiles">' + items.map(a => assetTile(a, favSet, inScene)).join('') + '</div>' : '';

    /* 1 · Workspaces */
    const wsActive = e.state && e.state.version;
    const wsChips = WS.map(w => {
      const on = wsActive === w.v;
      return '<button class="ws' + (on ? ' on' : '') + '" data-v="' + w.v + '"><span class="vd">' + w.v.slice(1) + '</span><span>' + w.t + '</span></button>';
    }).join('');
    const wsWrap = grp('open', 'Workspaces', 'dock', '<div class="p4-ws">' + wsChips + '</div>', WS.length, true);
    c.appendChild(wsWrap);
    wsWrap.addEventListener('click', ev => {
      const b = ev.target.closest('[data-v]'); if (!b) return;
      clickVersion(b.dataset.v);
      renderLibrary();
    });

    /* 2 · Stage */
    c.appendChild(el('<div class="p4-grp open"><div class="p4-gb"><div class="p4-stage" id="p4stage"><button data-st="demo" class="on">Demo</button><button data-st="empty">Empty stage</button></div><div class="p4-hint" style="margin-top:6px">Empty stage drops your own GLB sidecar onto the platform.</div></div></div>'));
    syncStageUI();

    /* 3 · Projects (saved sessions) */
    const ses = e.listVersions();
    const projRows = ses.slice(0, 5).map(v =>
      '<button class="p4-row" data-open="' + v.id + '"><span class="ic">' + ic('folder', 15) + '</span><span class="mm"><b>' + v.name + '</b><span>' + new Date(v.at).toLocaleString() + '</span></span></button>').join('');
    const autosave = e.loadAutosave(e);
    c.appendChild(grp('projects', 'Projects · saved sessions', 'folder', projRows ||
      '<div class="p4-emptycard"><b>Nothing saved yet</b><span class="mini">Render → Save session keeps every product, light & camera.</span></div>' +
      (autosave ? '<button class="p4-row" data-auto="1"><span class="ic">' + ic('clock', 15) + '</span><span class="mm"><b>Recover autosave</b><span>last working state on this device</span></span></button>' : ''), ses.length, true));
    c.lastChild.addEventListener('click', ev => {
      const b = ev.target.closest('[data-open], [data-auto]'); if (!b) return;
      const done = veil();
      const run = async () => {
        try {
          if (b.dataset.open) await e.loadVersion(e, Number(b.dataset.open));
          else if (b.dataset.auto) { const st = e.loadAutosave(e); if (st) await e.applyState(st); }
          S.envKey = e.env ? e.env.key : 'hero'; hudText(); renderLibrary();
          toast(b.dataset.open ? 'Opened session' : 'Autosave recovered', 't-brass');
        } catch (err) { toast('Could not open', 't-err'); }
        done();
      };
      run();
    });

    /* Search active → single results group ahead of everything */
    if (q) {
      const hit = a => (a.n + ' ' + a.cat).toLowerCase().indexOf(q) >= 0;
      const all = ASSETS.filter(hit);
      const ranked = all.slice().sort((x, y) => (favs.includes(y.id) - favs.includes(x.id)) || (rec.includes(y.n) - rec.includes(x.n)) || 0);
      const body = ranked.length ? tileWrap(ranked, favs)
        : '<div class="p4-emptycard"><b>No matches for “' + q + '”</b><span class="mini">try “coffee”, “bbq” or “sidecar” — more arrives as your library grows</span></div>';
      c.appendChild(grp('search', 'Search results', 'search', body, ranked.length, true));
      return;
    }

    const prodCat = k => k === 'Coffee Bikes' || k === 'BBQ Bikes';
    const catMap = {};
    ASSETS.forEach(a => { (catMap[a.cat] = catMap[a.cat] || []).push(a); });
    const favAssets = ASSETS.filter(a => favs.includes(a.id) || favs.includes(a.id + '::' + a.n));
    const recentNames = rec.filter(nm => ASSETS.some(a => a.n === nm)).slice(0, 4);
    const recTiles = recentNames.map(nm => ASSETS.find(a => a.n === nm)).filter(Boolean);
    const colls = [
      { n: 'Loft staples', d: 'Built-in demo pieces', items: ASSETS },
      { n: 'New arrival ideas', d: 'for your next build', items: [] },
    ];

    /* tag-scoped view: show only the matching family */
    if (tag === 'favourites' || tag === 'recent' || tag === 'collections') {
      if (tag === 'favourites') c.appendChild(grp('favs', 'Favourites', 'star', favAssets.length ? tileWrap(favAssets, favs) : '<div class="p4-emptycard"><b>Nothing pinned yet</b><span class="mini">pin products you reach for every day</span></div>', favAssets.length, true));
      else if (tag === 'recent') c.appendChild(grp('recent', 'Recently opened', 'clock', recTiles.length ? tileWrap(recTiles, favs) : '<div class="p4-emptycard"><b>Nothing recent</b><span class="mini">open a product and it appears here</span></div>', recTiles.length, true));
      else colls.forEach(col => c.appendChild(grp('col:' + col.n, col.n, 'layers', col.items.length ? tileWrap(col.items, favs) : '<div class="p4-emptycard"><b>' + col.n + '</b><span class="mini">' + col.d + '</span></div>', col.items.length, true)));
      return;
    }
    if (tag === 'products' || tag === 'diagrams') {
      CATS.forEach(cat => {
        if (tag === 'diagrams' && cat.key !== 'Pilot Diagrams') return;
        if (tag === 'products' && !prodCat(cat.key)) return;
        const items = (catMap[cat.key] || []).filter(a => favs.includes(a.id) || true);
        c.appendChild(grp(cat.key, cat.key, cat.ico, items.length ? tileWrap(items, favs) : '<div class="p4-emptycard"><b>' + cat.key + '</b><span class="mini">' + (EMPTY_COPY[cat.key] || 'Your models will gather here.') + '</span></div>', items.length, true));
      });
      return;
    }

    /* 4 · Favourites */
    c.appendChild(grp('favs', 'Favourites', 'star', favAssets.length ? tileWrap(favAssets, favs) :
      '<div class="p4-emptycard"><b>Nothing pinned yet</b><span class="mini">pin products you reach for every day</span></div>', favAssets.length, S.open.favs));

    /* 5 · Recently opened */
    c.appendChild(grp('recent', 'Recently opened', 'clock', recTiles.length ? tileWrap(recTiles, favs) :
      '<div class="p4-emptycard"><b>Nothing recent</b><span class="mini">open a product and it appears here</span></div>', recTiles.length, S.open.recent));

    /* 6 · Collections (before the folder categories) */
    colls.forEach(col => {
      c.appendChild(grp('col:' + col.n, col.n, 'layers', col.items.length ? tileWrap(col.items, favs) :
        '<div class="p4-emptycard"><b>' + col.n + '</b><span class="mini">' + col.d + '</span></div>', col.items.length, S.open['col:' + col.n]));
    });

    /* 7 · Folders / categories — always last */
    CATS.forEach(cat => {
      const items = catMap[cat.key] || [];
      const body = items.length ? tileWrap(items, favs)
        : '<div class="p4-emptycard"><b>' + cat.key + '</b><span class="mini">' + (EMPTY_COPY[cat.key] || 'Your models will gather here.') + '</span></div>';
      c.appendChild(grp(cat.key, cat.key, cat.ico, body, items.length, S.catOpen[cat.key] || true));
    });
  }
  function assetTile(a, favs, inScene) {
    const here = inScene(a.url) > 0;
    return '<div class="p4-tile' + (here ? ' here' : '') + '" data-asset="' + a.id + '" draggable="true" data-url="' + a.url + '">' +
      '<div class="th"><span class="mono">' + ic(a.ico, 30) + '</span></div>' +
      '<div class="meta"><b>' + a.n + '</b><span>' + (here ? 'On the stage' : a.sub) + '</span></div>' +
      '<div class="ops"><button class="fav' + (favs.includes(a.id) ? ' fav' : '') + '" data-fav="' + a.id + '" title="Pin">' + ic('star', 12) + '</button><button data-add="' + a.id + '" title="' + (here ? 'Focus' : 'Add to scene') + '">' + ic(here ? 'eye' : 'plus', 12) + '</button></div></div>';
  }
  function onTileOps() {
    const c = U.libScroll; if (!c) return;
    c.addEventListener('click', ev => {
      const fav = ev.target.closest('[data-fav]');
      const add = ev.target.closest('[data-add]');
      if (fav) {
        const id = fav.dataset.fav;
        const favs = store('favs') || [];
        store('favs', favs.includes(id) ? favs.filter(f => f !== id) : favs.concat(id));
        renderLibrary(); return;
      }
      if (add) { const a = ASSETS.find(x => x.id === add.dataset.add); if (a) addAsset(a); }
    });
    // drag swatch/asset onto stage
    const stage = document.querySelector('.viewport, .canvas');
    ['dragover'].forEach(evt => window.addEventListener(evt, e => { if (e.dataTransfer && e.dataTransfer.types.includes('text/p4sw')) e.preventDefault(); if (e.dataTransfer && e.dataTransfer.types.includes('text/uri-list') === false) {} }));
    document.addEventListener('drop', ev => {
      const url = ev.dataTransfer && ev.dataTransfer.getData('text/uri-list');
      const a = ASSETS.find(x => x.url === url);
      if (a) { ev.preventDefault(); addAsset(a); return; }
      const nm = ev.dataTransfer && ev.dataTransfer.getData('text/p4sw');
      if (nm) {
        ev.preventDefault();
        const sw = MATS.flatMap(cc => cc.items).find(i => i.n === nm);
        if (sw) { S.scope = 'model'; dropMaterialAt(sw, ev.clientX, ev.clientY); }
        return;
      }
    });
  }
  async function addAsset(a) {
    const e = P3(); if (!e) return;
    const existing = (e.models || []).find(m => m.url === a.url);
    if (existing) {
      e.selectModel(existing);
      const done = veil(); setStage('demo'); done();
      toast('Already on stage — selected', 't-brass');
      return;
    }
    const done = veil();
    try {
      const ent = await e.loadModel(e, a.url, { isSecondary: !demoModel() });
      if (ent) { e.push('import'); setStage('demo'); }
      const rec = store('recent') || [];
      store('recent', [a.n].concat(rec.filter(r => r !== a.n && r !== a.id)).slice(0, 8));
      toast(a.n + ' added', 't-brass');
    } catch (err) { toast('Could not add ' + a.n, 't-err'); }
    done(); renderLibrary();
  }

  function clickVersion(v) {
    const chip = $$('.vchip').find(x => (x.textContent || '').includes(v));
    if (chip) chip.click();
  }
  function setStage(mode) {
    const e = P3();
    S.stage = mode;
    const id = mode === 'demo' ? 'stDemo' : 'stEmpty';
    const r = document.getElementById(id);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change')); }
    syncStageUI();
    if (e && mode === 'empty') { if (e._syncUI) e._syncUI(); }
  }
  function syncStageUI() {
    const g = $('#p4stage'); if (!g) return;
    $$('[data-st]', g).forEach(b => b.classList.toggle('on', b.dataset.st === S.stage));
  }

  /* drop a material swatch onto a point of the stage:
     targets the exact part when the drop hits a mesh, else the whole product */
  function dropMaterialAt(sw, cx, cy) {
    const e = P3(); if (!e || !sw) return;
    const r = e.canvas.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) { applySwatch(sw); return; }
    const v = new (window.THREE ? THREE.Vector2 : (x, y) => ({ x, y }))(
      ((cx - r.left) / r.width) * 2 - 1,
      -((cy - r.top) / r.height) * 2 + 1
    );
    e.raycaster.setFromCamera(v, e.camera);
    const hits = e.raycaster.intersectObjects(e.world.children, true);
    const hit = hits.find(h => h.object.isMesh && h.object.userData.partId);
    if (hit) {
      const part = e.parts.find(pp => pp.id === hit.object.userData.partId);
      if (part) {
        S.scope = 'part';
        try { e.selectPart(part); } catch (err) {}
        applySwatch(sw);
        if (S.renderHint) S.renderHint();
        return;
      }
    }
    S.scope = 'model';
    applySwatch(sw);
  }

  /* ================= top bar additions ================= */
  function patchTopbar() {
    const bar = $('#appActions') || $('#topbar');
    if (!bar) return;
    // slim welcome/home button
    const home = el('<button id="p4home" title="Home — what are we creating today?" style="margin-left:2px">' + ic('home', 17) + '</button>');
    home.addEventListener('click', () => showWelcome(true));
    bar.appendChild(home);
  }

  /* ================= welcome ================= */
  let welcomeHost = null;
  function showWelcome(manual) {
    if (!welcomeHost) welcomeHost = buildWelcome();
    welcomeHost.classList.add('show');
    if (!manual) store('seen', true);
    document.body.classList.add('p4-welcomeopen');
  }
  function hideWelcome() {
    if (!welcomeHost) return;
    welcomeHost.classList.remove('show');
    document.body.classList.remove('p4-welcomeopen');
  }
  function buildWelcome() {
    const w = el('<div class="p4-welcome" role="dialog" aria-modal="true"><div class="p4-wc"><div class="p4-whead"><button class="p4-wx">' + ic('x') + '</button><span class="p4-kicker">Propeller &amp; Pistons Loft</span><h2>What are we creating today?</h2><div class="sub">A calm corner of your day — load the demo, sketch a pilot diagram, or pick up where you left off.</div></div><div class="p4-wbody"><div class="p4-cards">' +
      '<button class="nc" data-go="new"><span class="ico">' + ic('plus', 22) + '</span><b>New Product</b><p>Start with the demo sidecars on the loft platform and shape them your way.</p><span class="go">Open the studio ' + ic('chev', 12) + '</span></button>' +
      '<button class="nc" data-go="sandbox"><span class="ico">' + ic('prop', 22) + '</span><b>New Pilot Sandbox Diagram</b><p>Pressure &amp; attitude storyboards — the sandbox is next on the roadmap.</p><span class="go">See the plan ' + ic('chev', 12) + '</span></button>' +
      '<button class="nc" data-go="recent"><span class="ico">' + ic('clock', 22) + '</span><b>Load Recent Work</b><p>Jump back into a saved session or the last autosave on this device.</p><span class="go">Open sessions ' + ic('chev', 12) + '</span></button>' +
      '</div></div><div class="p4-wfoot"><span class="hl">Tip — <b>learn the studio</b> from the top-right help menu, first time around.</span><button data-tour>Learn Studio tour</button></div></div></div>');
    w.querySelector('.p4-wx').addEventListener('click', hideWelcome);
    w.addEventListener('click', ev => {
      if (ev.target === w) { hideWelcome(); return; }
      const go = ev.target.closest('[data-go]'); if (!go) return;
      hideWelcome();
      const kind = go.dataset.go;
      if (kind === 'new') {
        const done = veil();
        newDemo(done);
      } else if (kind === 'sandbox') { openTool('sandbox'); toast('Pilot Sandbox lands in a later phase', 't-brass'); }
      else if (kind === 'recent') { openRecent(); }
    });
    w.querySelector('[data-tour]').addEventListener('click', () => { hideWelcome(); setTimeout(() => startP4Tour(), 350); });
    w.addEventListener('keydown', ev => { if (ev.key === 'Escape') hideWelcome(); });
    document.body.appendChild(w);
    return w;
  }
  async function newDemo(done) {
    const e = P3();
    try {
      e._noHistory = true;
      if (e.clearHistory) e.clearHistory(e);
      if (typeof e.clearModels === 'function') e.clearModels(e);
      await e.loadDemo(e);
      await e.setEnvKey('hero', { immediate: true });
      if (typeof e.buildFloorPreset === 'function') e.buildFloorPreset('Gloss Black Mirror');
      e.applyLightPreset('Softbox'); S.lightName = 'Softbox';
      await e.setCameraPreset('¾ hero', { instant: true });
      frameHeroLoft(e);
      S.envKey = 'hero'; S.lookActive = 'hero-spotlight';
      e._noHistory = false; e.push('version');
      if (e._syncUI) e._syncUI();
      setStage('demo');
      openTool('select', { force: true });
      hudText(); renderLibrary();
      toast('Loft ready — tap a part to style it');
    } catch (err) {
      e._noHistory = false;
      toast(location.protocol === 'file:'
        ? 'Built-in demo needs a local server — open over http:// to load the GLBs (Hero is still here)'
        : 'Could not reset the studio', 't-err');
    }
    done();
  }
  function openRecent() {
    // open render panel (has sessions) and toast
    openTool('render', { force: true });
    setTimeout(() => toast('Recent work lives under Save session', 't-brass'), 200);
  }

  /* ---------------- Learn (p4a quick tour) ---------------- */
  let tourEl = null;
  function startP4Tour() {
    const steps = [
      ['#p4home', 'Welcome home', 'Tap here any time to reopen “What are we creating today?”.'],
      ['[data-tool="select"]', 'Select', 'Move, rotate & scale the product. Undo/redo live here and on your keyboard (Ctrl/⌘+Z).'],
      ['[data-tool="cam"]', 'Camera', 'Hero framing, lens & saved cameras. The camera never leaves your product.'],
      ['[data-tool="env"]', 'Environments', 'Switch the Propeller & Pistons Loft plus the ten studio backdrops.'],
      ['[data-tool="light"]', 'Lighting', 'One-tap cinematic looks — warm workshop, blue rim, sunset garage.'],
      ['[data-tool="mat"]', 'Materials', 'Tap a part on the model, then apply a finish from the library.'],
      ['[data-tool="render"]', 'Render', 'Stills, reel, GLB & scene JSON — plus saved sessions.'],
    ];
    if (tourEl) tourEl.remove();
    const ov = el('<div class="p4-tour" style="position:fixed;inset:0;z-index:180"></div>');
    ov.style.cssText = 'position:fixed;inset:0;z-index:180;display:flex;align-items:center;justify-content:center';
    ov.innerHTML = '<div style="position:absolute;inset:0;background:rgba(4,5,8,.55);backdrop-filter:blur(6px)" data-skip></div>' +
      '<div class="p3-tooltip" style="position:relative;z-index:2">' +
      '<div class="p3-tt-head"><i>' + ic('prop', 15) + '</i><b id="p4tt"></b><button class="p3-x" data-skip>✕</button></div>' +
      '<div class="p3-tt-body" id="p4tb"></div>' +
      '<div class="p3-tt-foot"><span id="p4ts"></span><button data-back>Back</button><button class="p3-x" data-next style="background:#fff;color:#0a0c11">Next</button></div></div>';
    document.body.appendChild(ov);
    tourEl = ov;
    let i = 0;
    const show = idx => {
      const s = steps[idx]; if (!s) return;
      ov.querySelector('#p4tt').textContent = s[1];
      ov.querySelector('#p4tb').textContent = s[2];
      ov.querySelector('#p4ts').textContent = (idx + 1) + ' / ' + steps.length;
      ov.querySelector('[data-next]').textContent = idx === steps.length - 1 ? 'Done' : 'Next';
      const t = $(s[0]);
      if (t) { t.scrollIntoView({ block: 'center' }); }
    };
    show(i);
    const go = d => { i += d; if (i < 0) i = 0; if (i >= steps.length) { ov.remove(); tourEl = null; store('seen', true); toast('You are ready to create', 't-brass'); return; } show(i); };
    ov.querySelector('[data-next]').addEventListener('click', () => go(1));
    ov.querySelector('[data-back]').addEventListener('click', () => go(-1));
    $$('[data-skip]', ov).forEach(b => b.addEventListener('click', () => { ov.remove(); tourEl = null; }));
    ov.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ov.remove(); tourEl = null; } });
  }

  /* ================= boot wiring / hud / events ================= */
  function initHud() {
    const hud = el('<div class="p4-hud" id="p4hud"><span class="dot"></span><span></span></div>');
    document.body.appendChild(hud);
    const bell = el('<button class="p4-bell" id="p4bell" title="Open inspector">' + ic('chev', 16) + '</button>');
    bell.addEventListener('click', () => { if (S.tool) { U.railR.classList.add('open'); U.rail = true; } });
    document.body.appendChild(bell);
    // fps ticker
    setInterval(() => { const e = P3(); const f = $('#p4fps'); if (f && e && e.perf) f.textContent = e.perf.fps + ' fps'; }, 1200);
  }

  function onLibDragStart() {
    document.addEventListener('dragstart', ev => {
      const t = ev.target.closest('[data-url]');
      if (t) { ev.dataTransfer.setData('text/uri-list', t.dataset.url); ev.dataTransfer.effectAllowed = 'copy'; }
    });
    document.addEventListener('dragover', ev => {
      const ty = ev.dataTransfer && ev.dataTransfer.types;
      if (ty && (ty.includes('text/uri-list') || ty.includes('text/p4sw'))) ev.preventDefault();
    });
  }

  /* ================= floating Quick Create ================= */
  function buildFloatingActions() {
    if (document.getElementById('p4fab')) return;
    const fab = el('<button class="p4-fab" id="p4fab" aria-label="Quick create" title="New product, import, duplicate…">' + ic('plus', 24) + '<span class="hint">Quick create</span></button>');
    const menu = el('<div class="p4-fabmenu" id="p4fabmenu" role="menu" aria-label="Quick create actions"><div class="fm-head"><b>Quick create</b><span>Ctrl K</span></div></div>');
    const items = [
      ['import', 'Import GLB', 'add your own sidecar', 'I'],
      ['plus', 'New Product', 'hero demo on the black mirror', 'N'],
      ['sandbox', 'New Sandbox Diagram', 'pilot storyboards · next update', 'D'],
      ['dup', 'Duplicate Scene', 'copy everything on the stage', 'C'],
      ['camera', 'Capture Screenshot', 'PNG of this exact view', 'S'],
    ];
    items.forEach(it => {
      const b = el('<button class="fm-item" role="menuitem" data-fab="' + it[0] + '"><span class="fi">' + ic(it[0], 16) + '</span><span class="mm"><b>' + it[1] + '</b><span>' + it[2] + '</span></span><span class="kk">' + it[3] + '</span></button>');
      menu.appendChild(b);
    });
    const inp = el('<input type="file" accept=".glb,.gltf" style="display:none" id="p4fabfile">');
    document.body.appendChild(fab); document.body.appendChild(menu); document.body.appendChild(inp);
    const open = () => { fab.classList.add('on'); menu.classList.add('on'); };
    const close = () => { fab.classList.remove('on'); menu.classList.remove('on'); };
    fab.addEventListener('click', ev => { ev.stopPropagation(); menu.classList.contains('on') ? close() : open(); });
    document.addEventListener('click', ev => { if (!ev.target.closest('#p4fabmenu, #p4fab')) close(); });
    document.addEventListener('keydown', ev => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); menu.classList.contains('on') ? close() : open(); }
      if (ev.key === 'Escape') close();
    });
    menu.addEventListener('click', ev => {
      const b = ev.target.closest('[data-fab]'); if (!b) return;
      close();
      const k = b.dataset.fab;
      const e = P3();
      if (k === 'plus') { const done = veil(); newDemo(done); }
      else if (k === 'sandbox') { openTool('sandbox'); toast('Pilot Sandbox ships in the next update', 't-brass'); }
      else if (k === 'import') { inp.click(); }
      else if (k === 'dup') duplicateScene();
      else if (k === 'camera') {
        if (!e) return;
        const bb = b; bb.classList.add('busy'); bb.disabled = true;
        e.still(e, { type: 'PNG' }).then(blob => { e.download(blob, 'sidecar_view_' + Date.now() + '.png'); toast('Screenshot ready', 't-brass'); })
          .catch(err => { console.error('shot', err); toast('Screenshot failed', 't-err'); })
          .finally(() => { bb.classList.remove('busy'); bb.disabled = false; });
      }
    });
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      inp.value = '';
      if (!f || !P3()) return;
      try { const ent = await P3().importFile(P3(), f); setStage('demo'); P3().push('import'); if (P3()._syncUI) P3()._syncUI(); toast('Sidecar on the stage', 't-brass'); renderLibrary(); }
      catch (err) { toast('Could not import file', 't-err'); }
    });
    async function duplicateScene() {
      const e2 = P3(); if (!e2) return;
      const ms = (e2.models || []).filter(m => m && m.url);
      if (!ms.length) { toast('Nothing on the stage to duplicate', 't-err'); return; }
      const done = veil();
      e2._noHistory = true;
      let n = 0;
      try {
        for (const m of ms) {
          const ent = await e2.loadModel(e2, m.url, { isSecondary: true });
          if (ent && ent.root) { ent.root.position.x += 1.6 + n * 0.35; n++; }
        }
        e2.push('duplicate'); setStage('demo');
        toast(n + (n === 1 ? ' copy added' : ' copies added'), 't-brass');
        renderLibrary(); if (e2._syncUI) e2._syncUI();
      } catch (err) { console.error('duplicate', err); toast('Could not duplicate the scene', 't-err'); }
      finally { e2._noHistory = false; done(); }
    }
  }

  /* Local-file + offline support and charcoal fallback for the immutable Hero.
     The engine resolves every asset relative to the document base, so the artifact is
     built with a sibling-relative <base href="../phase3/"> — identical over http(s) and
     file://. Two browser realities still block the engine's own backdrop texture:
       · file:// images cannot be uploaded into WebGL in most browsers — the renderer
         throws "SecurityError: Tainted canvases may not be loaded", so the Hero photo
         silently never appears even though the image decoded.
       · sandboxed/offline preview viewers cannot fetch the external file at all.
     4A therefore ships the canonical Hero (Propeller & Pistons Loft) as an inline
     data-URI copy and rebuilds the engine's background texture from it — the same
     canvas technique the engine itself uses, so it is never cross-origin and never
     tainted, and needs no network. If even that cannot be built, the stage falls back
     to a dark charcoal backdrop (never a white canvas). */
  const CHARCOAL = '#0b0e13';
  const HERO_JPEG_B64 = '__P4_HERO_JPEG_B64__';
  const HERO_DATA = 'data:image/jpeg;base64,' + HERO_JPEG_B64;
  function colorClass(e3) {
    return e3 && e3.floorMaterial && e3.floorMaterial.color ? e3.floorMaterial.color.constructor : null;
  }
  function charcoalFor(e3) {
    const C = colorClass(e3); if (!C) return null;
    try { return new C(CHARCOAL); } catch (x) { return null; }
  }
  function paintCharcoal(e3) {
    const c = charcoalFor(e3);
    if (c && e3.scene) { e3.scene.background = c; e3.env.backgroundReady = false; e3.env.key = 'hero'; }
    console.warn('p4a: Hero backdrop unavailable — dark charcoal fallback active', CHARCOAL);
  }
  function loadHeroEmbed() {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('p4a: embedded Hero decode failed'));
      im.src = HERO_DATA;
    });
  }
  function heroTextureFromCanvas(ev, cv) {
    // Reuse the engine's own background-texture class: env.bgTex is the engine's
    // CanvasTexture when its file-backed load succeeded; env.probe is a CanvasTexture
    // the engine builds on every env set (so it exists even when the file load failed).
    const ref = (ev.env && ev.env.bgTex) || (ev.env && ev.env.probe);
    const TC = ref && typeof ref.constructor === 'function' ? ref.constructor : null;
    if (!TC) return null;
    let tex;
    try { tex = new TC(cv); } catch (x) { return null; }
    try {
      tex.colorSpace = ref.colorSpace;                 // engine renders backdrops in sRGB
      tex.generateMipmaps = false;
      tex.minFilter = ref.minFilter; tex.magFilter = ref.magFilter;
      tex.wrapS = ref.wrapS; tex.wrapT = ref.wrapT;
    } catch (x) {}
    tex.__p4hero = true;
    return tex;
  }
  async function installHeroEmbedBackdrop(ev) {
    if (!ev || !ev.scene || !ev.env || ev.__p4heroing) return false;
    const cur = ev.scene.background;
    if (cur && cur.__p4hero) return true;              // already installed
    ev.__p4heroing = true;
    try {
      const img = await loadHeroEmbed();
      const W = img.naturalWidth || 1264;
      const H = img.naturalHeight || 843;
      const sc = Math.min(1, 2048 / Math.max(W, H));   // engine clamps textures to 2048
      const w = Math.max(1, Math.round(W * sc));
      const h = Math.max(1, Math.round(H * sc));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); if (!g) return false;
      g.drawImage(img, 0, 0, w, h);
      const tex = heroTextureFromCanvas(ev, cv);
      if (!tex) return false;
      if (ev.env.bgTex && ev.env.bgTex !== tex && !ev.env.bgTex.__p4hero) {
        try { ev.env.bgTex.dispose(); } catch (x) {}
      }
      ev.env.bgTex = tex;
      ev.scene.background = tex;
      ev.env.backgroundReady = true;
      ev.env.key = 'hero';
      return true;
    } finally { ev.__p4heroing = false; }
  }
  function ensureHeroBackdrop(e3) {
    const ev = e3 || P3(); if (!ev || !ev.scene || !ev.env) return;
    const bg = ev.scene.background;
    const isP4 = !!(bg && bg.__p4hero);
    const engineFileTex = !!(bg && bg.image);
    // Guarantee a dark stage immediately if the engine backdrop is missing.
    if (!isP4 && !engineFileTex && (ev.env.backgroundReady === false || !bg)) paintCharcoal(ev);
    // Upgrade/repair to the embedded Hero wherever the engine's file-based texture
    // cannot render: any file:// load (WebGL taint) or any load where the backdrop
    // never became ready (offline / sandboxed viewers, 404s). Over healthy http(s)
    // the engine's own backdrop is left untouched.
    if (!isP4 && (location.protocol === 'file:' || (ev.env.backgroundReady === false && ev.env.key === 'hero'))) {
      installHeroEmbedBackdrop(ev).then(ok => {
        if (ok) console.info('p4a: Hero backdrop active (embedded, context-independent)');
      }).catch(() => {});
    }
  }
  /* Under file://, older absolute '/design/...' urls (saved sessions/autosave from earlier
     builds) cannot resolve — normalise them to base-relative engine-style paths. */
  function wrapLocalPaths(e3) {
    if (!e3 || e3.__p4pathok || location.protocol !== 'file:') return;
    const orig = e3.loadModel;
    if (typeof orig !== 'function') return;
    const fix = u => String(u)
      .replace(/^\/design\/phase3\//, '')
      .replace(/^\/design\/environments\//, '../environments/');
    e3.loadModel = async (en, url, opt) => orig(en, fix(url), opt);
    e3.__p4pathok = true;
  }

  /* Boot the canonical Hero workspace on every load (first-run and returning):
     Propeller & Pistons Loft environment, centred black mirror platform, ¾-hero framing,
     neutral commercial light — the immutable Phase 1.5 home. */
  async function bootHero() {
    const e2 = P3(); if (!e2) return;
    try {
      wrapLocalPaths(e2);
      if (typeof e2.setEnvKey === 'function') await e2.setEnvKey('hero', { immediate: true });
      if (typeof e2.buildFloorPreset === 'function') e2.buildFloorPreset('Gloss Black Mirror');
      if (typeof e2.applyLightPreset === 'function') e2.applyLightPreset('Softbox');
      S.lightName = 'Softbox'; S.envKey = 'hero';
      /* ¾-hero is computed from the product bounds with the product centred in frame —
         on the dark Gloss Black Mirror platform that low angle lets the 40-unit black disc
         fill and swallow the composition. Finish the hero frame with the loft-readable
         composition: camera pulled back and near level, backdrop photo occupying the upper
         stage, platform as the lower strip. The engine preset itself may reject when no
         models can load (file:// runs have no GLB fetch), so framing must never depend on
         it succeeding. */
      try { if (typeof e2.setCameraPreset === 'function') await e2.setCameraPreset('¾ hero', { instant: true }); }
      catch (x) { console.warn('p4a ¾-hero preset unavailable (empty stage?) — using loft framing', x); }
      ensureHeroBackdrop(e2);
      frameHeroLoft(e2);
      /* The engine's own camera move can still be in flight when boot finishes (model-less
         file:// runs boot early), landing its floor-gazing pose after ours. Re-assert the
         loft framing a few times so ours is always the last writer. */
      [140, 520, 1200].forEach(ms => setTimeout(() => { const e3 = P3(); if (e3) frameHeroLoft(e3); }, ms));
      hudText(); setStage('demo');
    } catch (err) { console.warn('p4a boot hero', err); }
  }
  /* Finish a "¾ hero"-style pose so the Hero backdrop (Propeller & Pistons Loft photo) is
     the upper part of the frame and the black mirror platform reads as the lower strip —
     instead of the engine's product-fill low angle that points the camera at the black disc.
     Composition derived from the live scene on the canonical demo (radius ≈ 1.75, centre
     y ≈ 0.77): camera ≈ (0, 1.9, 8.2) looking at (0, ≈1.25, 0) frames the loft across the
     upper ~55% with the platform below. Expressed in model units so any on-stage bounds
     scale the same framing; clamped so tiny scenes never crowd the lens. */
  function frameHeroLoft(e2) {
    try {
      const cam = e2.camera;
      if (!cam) return;
      const b = e2.bounds && e2.bounds.center && e2.bounds.radius ? e2.bounds : null;
      const r = b ? b.radius : 1.75;
      const cx = b ? b.center.x : 0;
      const cz = b ? b.center.z : 0;
      const ty = b ? b.center.y + 0.28 * r : 1.25;
      const D = Math.max(4.7 * r, 6.5);
      const y = ty + D * Math.tan(4.5 * Math.PI / 180);
      cam.position.set(cx, y, cz + D);
      if (e2.controls && e2.controls.target) {
        e2.controls.target.set(cx, ty, cz);
        if (typeof e2.controls.update === 'function') e2.controls.update();
      }
      cam.lookAt(cx, ty, cz);
    } catch (err) { console.warn('p4a frameHeroLoft', err); }
  }

  /* Boot-reveal + no-flash guarantees.
     The engine paints its default demo scene (raw Phase 3 chrome + the demo sidecars,
     including the BBQ bike whose GLB auto-plays a "Wheels Spin" animation) the moment it
     boots — up to ~2-3 s before the 4A layer finished mounting. That is the flash of the
     "old sidecar" / spinning round plate on every reload. The build script therefore adds a
     tiny head guard that keeps the body invisible (charcoal) from first paint until this
     layer has fully booted, so no engine-default frame ever reaches the screen. */
  function revealStage() {
    if (S.__revealed) return; S.__revealed = true;
    try { document.documentElement.classList.remove('p4flash'); } catch (x) {}
    try { document.body.classList.remove('p4-pre'); } catch (x) {}
  }
  /* Freeze any auto-playing spin in the boot *demo* models (their GLB animation makes the
     wheels spin like a rotating plate). Only demo/secondary defaults are touched — user
     imports are never frozen. */
  function freezeDemoSpin(e3) {
    if (!e3 || !e3.models) return;
    (e3.models || []).forEach(it => {
      if (!it || !it.animMixer) return;
      const url = String(it.url || it.src || '');
      const demoLike = !!it.isDemo || !!it.isSecondary || /demo[-_]|assets\/models\//.test(url);
      if (!demoLike) return;
      try { it.animMixer.enabled = false; it.animMixer.timeScale = 0; } catch (x) {}
      try {
        const acts = it.animMixer._actions;
        if (acts) for (let a = 0; a < acts.length; a++) { const ac = acts[a]; if (ac && typeof ac.stop === 'function') ac.stop(); }
      } catch (x) {}
    });
  }
  /* Hard fail-safe: the page can never stay charcoal-hidden if boot stalls. The actual
     reveal fires from bootHero().finally() below, once the 4A stage (env/floor/camera,
     and the welcome on first run) is painted. */
  function armRevealFailSafe() {
    if (S.__revealFs) return; S.__revealFs = true;
    setTimeout(() => revealStage(), 9000);
  }

  function buildAll() {
    document.body.classList.add('p4a');
    initHud();
    buildDock();
    buildRailL();
    buildRailR();
    patchTopbar();
    onLibDragStart();
    onTileOps();
    // stage switcher
    setTimeout(() => {
      const sg = $('#p4stage'); if (sg) sg.addEventListener('click', ev => { const b = ev.target.closest('[data-st]'); if (b) setStage(b.dataset.st); });
    }, 100);
    document.body.classList.add('ready');
    document.body.classList.remove('p4-welcomeopen');
    // initial light/environment labels
    const e = P3();
    if (e && e.light) S.lightName = e.light.look;
    S.envKey = e && e.env ? e.env.key : 'hero';
    // never show a white canvas before the Hero texture lands — dark charcoal now,
    // replaced by the real backdrop the moment it loads (or kept on failure).
    if (e) { wrapLocalPaths(e); ensureHeroBackdrop(e); }
    // defaults
    if (e) { e.toolId = 'select'; if (e._syncUI) e._syncUI(); }
    hudText();
    // drag-to-add from filesystem anywhere over the stage
    const canvas = document.querySelector('.canvas');
    if (canvas) {
      canvas.addEventListener('dragover', ev => ev.preventDefault());
      canvas.addEventListener('drop', async ev => {
        ev.preventDefault();
        const f = Array.from(ev.dataTransfer.files || []).find(x => /\.(glb|gltf)$/i.test(x.name));
        if (f) {
          try { const ent = await P3().importFile(P3(), f); setStage('demo'); P3().push('import'); toast('Sidecar on the stage', 't-brass'); } catch (err) { toast('Could not load file', 't-err'); }
        }
      });
    }
    // Seed history with a real baseline once the demo sidecars are on stage:
    // at boot the engine may have auto-pushed an empty snapshot (env init before
    // models load) — undo from the first user action would otherwise wipe the stage.
    let seeded = false;
    const seed = () => {
      const e2 = P3(); if (!e2 || seeded) return true;
      if ((e2.models || []).length < 2) return false;
      const hist = e2.hist;
      if (hist && hist.stack && hist.stack.length) {
        const allEmpty = hist.stack.every(en => !en.state || !(en.state.models || []).length);
        if (allEmpty) { hist.stack = []; hist.index = -1; }
      }
      if (hist && (hist.stack || []).length && hist.index >= 0) { seeded = true; return true; }
      try { e2.push('baseline'); } catch (x) {}
      seeded = true;
      return true;
    };
    if (!seed()) {
      let stries = 0;
      const iv = setInterval(() => { if (seed() || ++stries > 40) clearInterval(iv); }, 350);
    }

    // central engine-event -> UI refresh (single binding, no duplicates)
    if (e && e.bus && !e.__p4bound) {
      e.__p4bound = true;
      e.bus.on('env-ready', k => {
        if (k) { S.envKey = k; hudText(); }
        if (k === 'hero') ensureHeroBackdrop();
      });
      e.bus.on('select', () => { refreshMatTarget(); if (S.renderModels) S.renderModels(); });
      e.bus.on('select-model', () => { if (S.renderModels) S.renderModels(); });
      e.bus.on('scene-changed', () => { renderLibrary(); if (S.renderModels) S.renderModels(); refreshMatTarget(); });
      e.bus.on('asset-loaded', () => { freezeDemoSpin(e); renderLibrary(); });
      e.bus.on('light', () => { if (e.light && e.light.look) { S.lightName = e.light.look; hudText(); } });
    }
    // portrait default = mini rail, openable
    const applyPortrait = () => {
      const narrow = matchMedia('(max-width:900px),(max-width:1194px) and (orientation:portrait)').matches;
      if (U.railL) U.railL.classList.toggle('mini', narrow && !U.railL.classList.contains('force-open'));
    };
    applyPortrait();
    addEventListener('resize', applyPortrait);
    if (S.renderHint) S.renderHint();
    // Every boot defaults to the canonical Hero workspace (Propeller & Pistons Loft):
    // hero environment + centred black mirror platform + ¾-hero framing + neutral light.
    // First run also shows the cinematic welcome over it; returning sessions land directly
    // in the studio on the same Hero default — reopenable any time from Home.
    armRevealFailSafe();
    // bootHero is the last visual step of the boot (hero env, black-mirror floor, camera);
    // reveal the page the moment it completes so no engine-default frame is ever seen —
    // first run shows the cinematic welcome over the ready Hero, returning opens the studio.
    bootHero().finally(() => {
      const e2 = P3();
      if (!S.welcomeSeen) showWelcome(false);
      freezeDemoSpin(e2);
      setTimeout(revealStage, 180);   // let the first painted frame land before revealing
    });
    buildFloatingActions();
  }

  /* ---------------- entry ---------------- */
  let engineSeen = false;
  function tryBoot() {
    const e = window.P3;
    if (!e || !e.models || !document.body) return false;
    const hasModels = e.models.length >= 1;
    const envReady = !!e.env;
    // Local file runs cannot fetch GLB models (browser blocks file:// fetches), so 4A must
    // mount on env readiness there; over http we wait for the boot demo as before. Either
    // way, a bounded grace window guarantees the chrome comes up.
    if (envReady && !engineSeen) { engineSeen = true; bootHeroGrace = Date.now() + 15000; }
    if (envReady && (hasModels || location.protocol === 'file:' || (bootHeroGrace && Date.now() > bootHeroGrace))) {
      buildAll();
      return true;
    }
    return false;
  }
  let bootHeroGrace = 0;
  let tries = 0;
  function poll() {
    if (tryBoot()) return;
    if (++tries > 500) { console.warn('p4a: engine never became ready'); return; }
    setTimeout(poll, 120);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poll);
  else poll();
})();
