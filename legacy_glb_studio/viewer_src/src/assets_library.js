import * as THREE from 'three';

/* =========================================================================
 *  ASSET LIBRARY CATALOG  (V5)
 *  Stylised, on-brand props built from primitives (no network, tiny size) +
 *  the two embedded demo GLBs. Each asset normalises onto the shared stage
 *  exactly like a dropped .glb, so it is fully editable by the engine.
 * ========================================================================= */

export const CATEGORIES = [
  { key: 'coffee', label: 'Coffee', icon: '☕' },
  { key: 'bbq', label: 'BBQ', icon: '🍢' },
  { key: 'furniture', label: 'Furniture', icon: '🛋️' },
  { key: 'lighting', label: 'Lighting', icon: '💡' },
  { key: 'food', label: 'Food', icon: '🍰' },
  { key: 'decor', label: 'Decorations', icon: '🎍' },
];
export const CATMAP = {}; CATEGORIES.forEach((c) => { CATMAP[c.key] = c; });

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({
  color,
  roughness: o.r !== undefined ? o.r : 0.6,
  metalness: o.m !== undefined ? o.m : 0.04,
  ...(o.extra || {}),
});

function mesh(geo, m, x = 0, y = 0, z = 0, ry = 0, rx = 0) {
  const mm = new THREE.Mesh(geo, m);
  mm.position.set(x, y, z);
  mm.rotation.y = ry;
  mm.rotation.x = rx;
  mm.name = geo.type;
  return mm;
}

const G = {
  latte_cup() {
    const g = new THREE.Group();
    const cup = mat(0xf4efe6, { r: 0.28 });
    const saucer = mat(0xe9e2d4, { r: 0.24 });
    g.add(mesh(new THREE.CylinderGeometry(0.165, 0.14, 0.022, 32), saucer, 0, 0.011, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.098, 0.072, 0.115, 32), cup, 0, 0.078, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.078, 0.082, 0.02, 28), mat(0x6d4528, { r: 0.7 }), 0, 0.136, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.014, 24), mat(0xdcc9a8, { r: 0.55 }), 0, 0.152, 0));
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.013, 10, 18), cup);
    h.position.set(0.098, 0.085, 0); h.rotation.y = Math.PI / 2;
    g.add(h);
    return g;
  },
  grill() {
    const g = new THREE.Group();
    const dark = mat(0x23262c, { m: 0.55, r: 0.45 });
    const grate = mat(0x33363d, { m: 0.7, r: 0.35 });
    g.add(mesh(new THREE.SphereGeometry(0.46, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), dark, 0, 0.52, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.44, 0.4, 0.34, 30), dark, 0, 0.18, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 30), grate, 0, 0.405, 0));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.22, 12), dark, Math.cos(a) * 0.3, 0.11, Math.sin(a) * 0.3));
    }
    const wh = mat(0xfff6e6, { extra: { emissive: 0xffb46b, emissiveIntensity: 0.5 } });
    g.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 24), wh, 0, 0.38, 0));
    return g;
  },
  armchair() {
    const g = new THREE.Group();
    const fab = mat(0x9a5b4d, { r: 0.85 });
    const dark = mat(0x2b2b31, { m: 0.5, r: 0.5 });
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.16, 0.9), fab, 0, 0.22, 0));           // seat
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.78, 0.2), fab, 0, 0.69, -0.36));       // back
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.28, 0.9), fab, 0.4, 0.44, 0));         // arms
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.28, 0.9), fab, -0.4, 0.44, 0));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.07, 0.7), mat(0xe9b98a, { r: 0.9 }), 0, 0.08, 0)); // cushion
    for (const [x, z] of [[0.36, 0.36], [-0.36, 0.36], [0.36, -0.36], [-0.36, -0.36]]) {
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.09, 10), dark, x, 0.045, z));
    }
    return g;
  },
  side_table() {
    const g = new THREE.Group();
    const wood = mat(0x8a6138, { r: 0.55 });
    const light = mat(0xefe7d6, { r: 0.4 });
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.055, 32), wood, 0, 0.58, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 28), light, 0, 0.552, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 28), wood, 0, 0.33, 0));   // shelf
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      g.add(mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.6, 12), wood, Math.cos(a) * 0.24, 0.3, Math.sin(a) * 0.24));
    }
    return g;
  },
  floor_lamp() {
    const g = new THREE.Group();
    const dark = mat(0x1e2026, { m: 0.5, r: 0.4 });
    const shade = mat(0xf2e3c2, { r: 0.75, extra: { side: THREE.DoubleSide } });
    const bulb = mat(0x111111, { extra: { emissive: 0xffdfae, emissiveIntensity: 1.8 } });
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.05, 32), dark, 0, 0.025, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.72, 12), dark, 0, 0.9, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 10), dark, 0, 1.83, 0));
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, 0.34, 26, 1, true), shade);
    s.position.set(0, 1.98, 0);
    g.add(s);
    g.add(mesh(new THREE.SphereGeometry(0.075, 16, 12), bulb, 0, 1.86, 0));
    return g;
  },
  arc_lamp() {
    const g = new THREE.Group();
    const dark = mat(0x23252c, { m: 0.55, r: 0.4 });
    const shade = mat(0xf4e9cf, { r: 0.7, extra: { side: THREE.DoubleSide } });
    const bulb = mat(0x111111, { extra: { emissive: 0xffd9a0, emissiveIntensity: 1.7 } });
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.05, 36), dark, 0, 0.025, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.62, 12), dark, 0, 0.84, 0));
    const arm = mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.05, 12), dark, 0.52, 1.62, 0);
    arm.rotation.z = -0.38;
    g.add(arm);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 24, 1, true), shade);
    cone.position.set(0.86, 1.28, 0); cone.rotation.z = -Math.PI * 0.72;
    g.add(cone);
    g.add(mesh(new THREE.SphereGeometry(0.07, 14, 10), bulb, 0.9, 1.52, 0));
    return g;
  },
  cake() {
    const g = new THREE.Group();
    const plate = mat(0xf2f0ea, { r: 0.22 });
    const sponge = mat(0xd29a63, { r: 0.7 });
    const cream = mat(0xfdf6ea, { r: 0.35 });
    const berry = mat(0x8e2431, { r: 0.3 });
    g.add(mesh(new THREE.CylinderGeometry(0.52, 0.5, 0.035, 40), plate, 0, 0.018, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.16, 40), sponge, 0, 0.11, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 40), cream, 0, 0.23, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.18, 40), sponge, 0, 0.36, 0));
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      g.add(mesh(new THREE.SphereGeometry(0.04, 10, 8), berry, Math.cos(a) * 0.19, 0.475, Math.sin(a) * 0.19));
    }
    g.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(0xb31f31, { r: 0.25 }), 0, 0.49, 0));
    return g;
  },
  doughnut() {
    const g = new THREE.Group();
    const base = mat(0xd9a05c, { r: 0.6 });
    const glaze = mat(0xf2a9c4, { r: 0.25 });
    const choc = mat(0x5a3426, { r: 0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.105, 16, 40), base);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const ice = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.11, 16, 40), glaze);
    ice.rotation.x = Math.PI / 2;
    ice.position.y = 0.045;
    g.add(ice);
    const ic2 = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 10, 24), choc);
    ic2.rotation.x = Math.PI / 2;
    ic2.position.set(0.12, 0.085, 0.1);
    g.add(ic2);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      const s = 0.022;
      g.add(mesh(new THREE.BoxGeometry(s * 2.2, s * 2.2, s), mat([0xffffff, 0x5c8fd6, 0xe8a33d][i % 3], { r: 0.4 }), Math.cos(a) * 0.26, 0.085, Math.sin(a) * 0.26));
    }
    return g;
  },
  plant() {
    const g = new THREE.Group();
    const pot = mat(0xb4693a, { r: 0.55 });
    const soil = mat(0x3a2a1c, { r: 0.95 });
    const leaf = mat(0x3f7d3a, { r: 0.5 });
    const stem = mat(0x5f8a4a, { r: 0.55 });
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.4, 28), pot, 0, 0.2, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.03, 26), soil, 0, 0.39, 0));
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8), stem, Math.cos(a) * 0.1, 0.7, Math.sin(a) * 0.1, 0, a * 0.35));
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), leaf);
      s.position.set(Math.cos(a) * 0.42, 0.95 + Math.sin(a * 3) * 0.06, Math.sin(a) * 0.42);
      s.scale.set(1, 0.4, 0.55);
      g.add(s);
    }
    g.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(0xe84a3a, { r: 0.4 }), 0, 1.25, 0));
    return g;
  },
  candles() {
    const g = new THREE.Group();
    const tray = mat(0x8a6138, { r: 0.55 });
    const wax = [mat(0xf6efe2, { r: 0.3 }), mat(0xeadcc2, { r: 0.3 }), mat(0xe3d0f2, { r: 0.3 })];
    const flameC = mat(0xffb46b, { extra: { emissive: 0xffa050, emissiveIntensity: 2 } });
    const wick = mat(0x2b2b2b, { r: 0.9 });
    g.add(mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.035, 40), tray, 0, 0.018, 0));
    const specs = [[0, 0, 0.5], [0.24, 0.05, 0.36], [-0.22, -0.04, 0.32]];
    specs.forEach(([x, z, h], i) => {
      g.add(mesh(new THREE.CylinderGeometry(0.07, 0.075, h, 22), wax[i], x, 0.035 + h / 2, z));
      g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6), wick, x, 0.045 + h, z));
      g.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), flameC, x, 0.05 + h + 0.05, z));
    });
    return g;
  },
};

/* catalogue -------------------------------------------------------------- */
export const ASSETS = [
  { key: 'coffee_set', name: 'Coffee Set', cat: 'coffee', icon: '☕', glb: 'Demo Coffee Set', tags: ['espresso', 'machine', 'bar', 'cafe'] },
  { key: 'latte_cup', name: 'Latte Cup', cat: 'coffee', icon: '🍵', tags: ['cup', 'saucer', 'espresso', 'drink'], make: G.latte_cup },
  { key: 'bbq_bike', name: 'BBQ Bike', cat: 'bbq', icon: '🍢', glb: 'Demo BBQ Bike', tags: ['bike', 'grill', 'street', 'food'] },
  { key: 'grill', name: 'Charcoal Grill', cat: 'bbq', icon: '🔥', tags: ['bbq', 'grill', 'smoke', 'outdoor'], make: G.grill },
  { key: 'armchair', name: 'Armchair', cat: 'furniture', icon: '🛋️', tags: ['seat', 'lounge', 'sofa'], make: G.armchair },
  { key: 'side_table', name: 'Side Table', cat: 'furniture', icon: '🪑', tags: ['table', 'shelf', 'wood', 'stand'], make: G.side_table },
  { key: 'floor_lamp', name: 'Floor Lamp', cat: 'lighting', icon: '💡', tags: ['lamp', 'light', 'tall'], make: G.floor_lamp },
  { key: 'arc_lamp', name: 'Arc Lamp', cat: 'lighting', icon: '🏮', tags: ['lamp', 'light', 'reading'], make: G.arc_lamp },
  { key: 'cake', name: 'Layer Cake', cat: 'food', icon: '🍰', tags: ['dessert', 'pastry', 'sweet'], make: G.cake },
  { key: 'doughnut', name: 'Glazed Doughnut', cat: 'food', icon: '🍩', tags: ['donut', 'dessert', 'sweet'], make: G.doughnut },
  { key: 'plant', name: 'Potted Plant', cat: 'decor', icon: '🌿', tags: ['plant', 'greenery', 'pot', 'nature'], make: G.plant },
  { key: 'candles', name: 'Candle Set', cat: 'decor', icon: '🕯️', tags: ['candle', 'light', 'cozy', 'home'], make: G.candles },
];
export const ASSETMAP = {}; ASSETS.forEach((a) => { ASSETMAP[a.key] = a; });

export function iconForName(name) {
  const hit = ASSETS.find((a) => name === a.name || name.startsWith(a.name));
  return hit ? hit.icon : '🎲';
}
