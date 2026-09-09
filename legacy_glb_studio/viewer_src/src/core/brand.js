/* =========================================================================
 *  BRAND KITS — persisted data layer (V6 Brand Studio)
 *  Pure data + localStorage. The engine (studio.js) renders an applied kit
 *  (background, watermark, intro/outro cards, photo-export stamping); this
 *  module only stores / edits the kits. Offline-safe: fonts are system
 *  stacks, logos are emoji chips or small embedded PNG data URLs.
 * ========================================================================= */

const KITS_KEY = 'glbStudio.brand.kits.v1';
const ACTIVE_KEY = 'glbStudio.brand.active.v1';

export const FONTS = [
  { key: 'modern', label: 'Modern Clean', stack: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" },
  { key: 'serif', label: 'Elegant Serif', stack: "Georgia,'Times New Roman',serif" },
  { key: 'bold', label: 'Bold Impact', stack: "Impact,'Arial Narrow','Franklin Gothic',sans-serif" },
  { key: 'hand', label: 'Handwritten', stack: "'Comic Sans MS','Segoe Print','Bradley Hand',cursive" },
];
export function fontBy(key) { return FONTS.find((f) => f.key === key) || FONTS[0]; }

/* quick-pick logo characters (emoji), uploads can replace them */
export const LOGO_CHARS = ['☕', '🍢', '🏆', '☕🔥', '🎬', '✨', '★', '⭐', '⚡', '🛞', '🍩', '🏭'];

export function makeKit(seed = {}) {
  const now = Date.now().toString(36);
  const n = (Math.random() * 0xffff).toString(36).slice(0, 4);
  return {
    id: seed.id || ('bk' + now + n),
    name: seed.name || 'New Brand',
    icon: seed.icon || '🎨',
    logo: seed.logo || '',           // data URL (uploaded PNG) or ''
    logoChar: seed.logoChar || (seed.icon || '🎨'),
    colors: Object.assign({
      primary: '#a3541f', accent: '#e8c07a', bg: '#221611', text: '#f4e7d0',
    }, seed.colors || {}),
    font: seed.font || 'modern',
    watermark: Object.assign({ on: true, text: '' }, seed.watermark || {}),
    intro: Object.assign({ h: '', s: '' }, seed.intro || {}),
    outro: Object.assign({ l1: '', l2: '' }, seed.outro || {}),
    applyBg: seed.applyBg !== undefined ? !!seed.applyBg : true,
  };
}

export function seedKits() {
  return [
    makeKit({
      name: 'Coffee Bike', icon: '☕', logoChar: '☕',
      colors: { primary: '#a3541f', accent: '#e8c07a', bg: '#241710', text: '#f6ecd7' },
      font: 'modern',
      watermark: { on: true, text: 'COFFEE BIKE' },
      intro: { h: 'Coffee Bike', s: 'Fresh coffee · rides on' },
      outro: { l1: 'Follow @coffeebike', l2: '' },
    }),
    makeKit({
      name: 'BBQ Bike', icon: '🍢', logoChar: '🍢',
      colors: { primary: '#d6482b', accent: '#ffb25e', bg: '#160f0d', text: '#ffe9d6' },
      font: 'bold',
      watermark: { on: true, text: 'BBQ BIKE' },
      intro: { h: 'BBQ BIKE', s: 'Street grill on wheels' },
      outro: { l1: 'Order · @bbqbike', l2: '' },
    }),
    makeKit({
      name: 'The KOP', icon: '🏆', logoChar: '🏆',
      colors: { primary: '#c9a227', accent: '#f5e7b8', bg: '#0b0d12', text: '#f3e9c9' },
      font: 'serif',
      watermark: { on: true, text: 'THE KOP' },
      intro: { h: 'The KOP', s: 'Crafted for champions' },
      outro: { l1: 'thekop.co', l2: '' },
    }),
  ];
}

let cache = null;
export function loadKits() {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KITS_KEY) || 'null');
    cache = Array.isArray(raw) && raw.length ? raw.map((k) => normalize(k)) : seedKits();
    if (!Array.isArray(raw) || !raw.length) saveKits(cache);
  } catch (e) { cache = seedKits(); }
  return cache;
}
function normalize(k) {
  const kk = makeKit(k);
  return kk;
}
export function saveKits(list) {
  cache = list;
  try { localStorage.setItem(KITS_KEY, JSON.stringify(list)); } catch (e) { /* quota */ }
}
export function upsertKit(kit) {
  const list = loadKits();
  const i = list.findIndex((k) => k.id === kit.id);
  if (i >= 0) list[i] = kit; else list.push(kit);
  saveKits(list);
  return list;
}
export function removeKit(id) {
  const list = loadKits().filter((k) => k.id !== id);
  saveKits(list);
  if (activeId() === id) setActive(null);
  return list;
}
export function clearKitsCache() { cache = null; }

export function activeId() { try { return localStorage.getItem(ACTIVE_KEY); } catch (e) { return null; } }
export function setActive(id) { try { if (id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY); } catch (e) {} }
export function activeKit() { const id = activeId(); return loadKits().find((k) => k.id === id) || null; }
