/* ENGINE · config.js — Phase 3 · constants, presets, asset catalog (read-only inputs). */
export const CFG = {
  version: '3.0.0',
  model: { path: 'assets/models/demo-coffee-set.glb', secondary: 'assets/models/demo-bbq-bike.glb' },
  assetsBase: 'assets/',
  // canonical Phase-1.5 inputs are READ-ONLY; paths resolve from this file's location
  envBase: '../environments/assets/studio_backgrounds/',
  envPrev: '../environments/previews/',
  envHero: '../environments/hero/HERO_propeller_pistons_loft.png',
};

/* Environment catalog (Hero + the 10 locked Studio Backgrounds). palettes drive the
   procedural HDR-style probe so reflections/lighting follow each backdrop. */
export const ENVS = [
  { key: 'hero',        title: 'Hero Showroom', file: null, hero: true,
    pal: { sky:'#0e1116', horizon:'#232a33', ground:'#0a0c10', amb:'#4a5562',
           key:'#f5f0e4', keyI:1.55, temp:5600, fill:'#8fb8e8', fillI:0.42, rim:'#9fd8ff', rimI:0.65,
           floor:'#0d0f13', glow:'#0b0d11', vign:0.5 } },
  { key: 'luxury_brick_loft_museum',   title: 'Luxury Loft Museum',
    file: 'luxury_brick_loft_museum.jpg',
    pal: { sky:'#14151a', horizon:'#4a3b2c', ground:'#100f11', amb:'#7a5f43',
           key:'#ffe9c8', keyI:1.3, temp:4300, fill:'#b9c6d2', fillI:0.3, rim:'#ffd9a8', rimI:0.5,
           floor:'#17130e', glow:'#2a1f12', vign:0.55 } },
  { key: 'industrial_steel_factory',   title: 'Industrial Steel Factory',
    file: 'industrial_steel_factory.jpg',
    pal: { sky:'#0c0e10', horizon:'#3a4148', ground:'#0a0b0d', amb:'#5a6874',
           key:'#dbe6ea', keyI:1.35, temp:5800, fill:'#9fb8c8', fillI:0.28, rim:'#b8e2ff', rimI:0.7,
           floor:'#101214', glow:'#14181c', vign:0.6 } },
  { key: 'vintage_garage_studio',      title: 'Vintage Garage Studio',
    file: 'vintage_garage_studio.jpg',
    pal: { sky:'#171410', horizon:'#4d4030', ground:'#0f0d0a', amb:'#7a6240',
           key:'#ffd9a0', keyI:1.25, temp:3500, fill:'#cbb99f', fillI:0.25, rim:'#ffe3bd', rimI:0.5,
           floor:'#151109', glow:'#241a0e', vign:0.58 } },
  { key: 'royal_enfield_heritage_workshop', title: 'Heritage Workshop',
    file: 'royal_enfield_heritage_workshop.jpg',
    pal: { sky:'#14120f', horizon:'#52402a', ground:'#0d0c09', amb:'#7a5b36',
           key:'#ffdfae', keyI:1.4, temp:4100, fill:'#c4b69a', fillI:0.3, rim:'#ffca8e', rimI:0.55,
           floor:'#171108', glow:'#2b1c0c', vign:0.56 } },
  { key: 'coffee_roastery_workshop',   title: 'Coffee Roastery',
    file: 'coffee_roastery_workshop.jpg',
    pal: { sky:'#12100e', horizon:'#4d3a22', ground:'#0c0b09', amb:'#6f5230',
           key:'#ffd9a4', keyI:1.35, temp:3900, fill:'#b39f80', fillI:0.3, rim:'#ffcf9c', rimI:0.5,
           floor:'#14100a', glow:'#261807', vign:0.55 } },
  { key: 'aviation_heritage_hangar',   title: 'Aviation Hangar',
    file: 'aviation_heritage_hangar.jpg',
    pal: { sky:'#0b0d10', horizon:'#39444d', ground:'#090a0c', amb:'#56646e',
           key:'#e6f0f2', keyI:1.45, temp:6000, fill:'#a7c4d4', fillI:0.32, rim:'#cfe9ff', rimI:0.6,
           floor:'#0e1113', glow:'#131a1f', vign:0.6 } },
  { key: 'marble_luxury_showroom',     title: 'Marble Luxury Showroom',
    file: 'marble_luxury_showroom.jpg',
    pal: { sky:'#191b1f', horizon:'#cfd2d4', ground:'#101114', amb:'#9aa3ac',
           key:'#ffffff', keyI:1.5, temp:5200, fill:'#c8d4e0', fillI:0.45, rim:'#dcecff', rimI:0.55,
           floor:'#23262b', glow:'#15161a', vign:0.5 } },
  { key: 'matte_white_photography_studio', title: 'White Photography Studio',
    file: 'matte_white_photography_studio.jpg',
    pal: { sky:'#e6e8eb', horizon:'#ffffff', ground:'#b9bcc2', amb:'#dfe3e8',
           key:'#ffffff', keyI:1.7, temp:5400, fill:'#eef3f8', fillI:0.6, rim:'#ffffff', rimI:0.8,
           floor:'#d7d9dd', glow:'#ffffff', vign:0.2 } },
  { key: 'midnight_black_commercial_studio', title: 'Midnight Black Studio',
    file: 'midnight_black_commercial_studio.jpg',
    pal: { sky:'#050507', horizon:'#171a1f', ground:'#040405', amb:'#2a313b',
           key:'#eaf2ff', keyI:1.8, temp:6500, fill:'#27406b', fillI:0.5, rim:'#66b8ff', rimI:1.4,
           floor:'#05060a', glow:'#0a1420', vign:0.62 } },
  { key: 'coal_and_fire_forge',        title: 'Coal & Fire Forge',
    file: 'coal_and_fire_forge.jpg',
    pal: { sky:'#0b0806', horizon:'#3a2413', ground:'#080605', amb:'#52371d',
           key:'#ff9a4a', keyI:1.6, temp:2600, fill:'#7a4630', fillI:0.2, rim:'#ff6a3d', rimI:0.9,
           floor:'#0f0a06', glow:'#2b1406', vign:0.66 } },
];

/* One-tap camera framings (dock tray labels are the canonical UI text). */
export const CAM_PRESETS = {
  'Front':      { az: 0.0,   el: 0.06, dist: 3.1 },
  '¾ hero':     { az: -0.62, el: 0.34, dist: 3.4 },
  'Side':       { az: Math.PI / 2, el: 0.02, dist: 3.6 },
  'Detail':     { az: -0.9,  el: 0.42, dist: 1.55 },
  'Top':        { az: 0.0,   el: 1.46, dist: 2.6 },
  'Orbit spin': { az: 0.0,   el: 0.3,  dist: 3.6, orbit: true },
  // spec-alias presets (engine + API level; the locked tray exposes the curated subset)
  'Hero':       { az: -0.62, el: 0.34, dist: 3.4 },
  'Rear':       { az: Math.PI, el: 0.1, dist: 3.6 },
  'Left':       { az: -Math.PI / 2, el: 0.02, dist: 3.6 },
  'Right':      { az: Math.PI / 2, el: 0.02, dist: 3.6 },
  'Reel':       { az: 0.0,   el: 0.28, dist: 3.8, orbit: true },
  'Product':    { az: -0.32, el: 0.22, dist: 2.3 },
};
/* Inspector camera card chips use short labels; map to the same keys. */
export const CAM_ALIAS = { 'Front':'Front', '¾':'¾ hero', 'Side':'Side', 'Top':'Top' };

/* One-tap cinematic lighting looks (dock tray labels). */
export const LIGHT_PRESETS = {
  'Softbox':      { name:'Softbox', key:'#ffffff', keyI:1.35, fill:'#dfe6ee', fillI:0.5, rim:'#ffffff', rimI:0.35, temp:5600, amb:'#8f9aa6' },
  'Café window':  { name:'Café window', key:'#ffd9a0', keyI:1.1, fill:'#9fb2c2', fillI:0.35, rim:'#ffe2b8', rimI:0.5, temp:4200, amb:'#6e624e' },
  'Golden hour':  { name:'Golden hour', key:'#ffb066', keyI:1.5, fill:'#c9a06a', fillI:0.25, rim:'#ff9a66', rimI:0.7, temp:3300, amb:'#8a6434' },
  'Night neon':   { name:'Night neon', key:'#cfe0ff', keyI:0.9, fill:'#332a55', fillI:0.35, rim:'#66d0ff', rimI:1.6, temp:7000, amb:'#232a44' },
  'Backlit rim':  { name:'Backlit rim', key:'#dfe8f0', keyI:0.5, fill:'#66707a', fillI:0.2, rim:'#cfe6ff', rimI:2.2, temp:6200, amb:'#5a6672' },
};
export const LIGHT_LOOK = {
  'Warm':   { key:'#ffd2a1', fill:'#e8c9a8', temp:4000 },
  'Cool':   { key:'#dcecff', fill:'#b8cfe0', temp:7200 },
  'Neutral':{ key:'#ffffff', fill:'#dde5ec', temp:5400 },
};

/* Quick material finishes (dock tray labels) applied to the selected part. */
export const MAT_FINISHES = {
  'Matte charcoal': { color:'#2a2d33', rough:0.92, metal:0.0,  op:1, name:'matte' },
  'Brushed metal':  { color:'#c8ccd2', rough:0.32, metal:0.95, op:1, name:'metal' },
  'Porcelain':      { color:'#f4f2ee', rough:0.16, metal:0.0,  op:1, name:'gloss' },
  'Copper':         { color:'#c2713d', rough:0.28, metal:1.0,  op:1, name:'metal' },
  'Gloss black':    { color:'#101114', rough:0.08, metal:0.6,  op:1, name:'paint' },
};

/* Floor presets — the five canonical tray tiles. */
export const FLOORS = {
  'White Studio':        { color:'#d9dbdf', rough:0.32, metal:0.0,  env:0.5,  dark:false },
  'Gloss Black Mirror':  { color:'#0a0b0d', rough:0.05, metal:0.75, env:1.4,  dark:true  },
  'Café Wood':           { color:'#6b4a2c', rough:0.5,  metal:0.0,  env:0.3,  dark:true  },
  'Concrete Loft':       { color:'#8a8d92', rough:0.86, metal:0.0,  env:0.15, dark:false },
  'Marble Luxury':       { color:'#e6e3dc', rough:0.08, metal:0.0,  env:0.9,  dark:false },
};

/* Output formats (render tray + inspector chips). */
export const FORMATS = {
  '9:16 reel': { label:'9:16 reel', w:1080, h:1920, key:'9:16' },
  '1:1 square':{ label:'1:1 square', w:1440, h:1440, key:'1:1' },
  '4:5 story': { label:'4:5 story', w:1080, h:1350, key:'4:5' },
  'Blender Cycles': { label:'Blender Cycles', w:1920, h:1080, key:'16:9' },
};
export const RES_LEVELS = [ {l:'1080p',m:1}, {l:'2K',m:1.5}, {l:'4K',m:3} ];
export const EXPORT_STILLS = ['PNG','JPG','Transparent PNG'];

export const LIMITS = { hist:60, autosaveMs:30000, maxEnvTex:2048, ls:'sos:p3:' };
