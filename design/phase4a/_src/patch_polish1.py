#!/usr/bin/env python3
# Polish patch 1 — build css concat + JS icon map + catalog data (CAMG, MATS).
import io
def load(p): return open(p, encoding='utf-8').read()
def save(p, s): open(p, 'w', encoding='utf-8').write(s)

# ---------- build script: include polish css ----------
bp = '/home/user/design/phase4a/_src/build_phase4a.py'
s = load(bp)
a = """css  = (SRC / 'p4a.css').read_text(encoding='utf-8')
js   = (SRC / 'p4a.js').read_text(encoding='utf-8')"""
b = """css  = (SRC / 'p4a.css').read_text(encoding='utf-8')
pol  = SRC / 'p4a_polish.css'
if pol.exists():
    css += '\\n' + pol.read_text(encoding='utf-8')
js   = (SRC / 'p4a.js').read_text(encoding='utf-8')"""
assert a in s
s = s.replace(a, b)
save(bp, s)

# ---------- JS ----------
p = '/home/user/design/phase4a/_src/p4a.js'
js = load(p)

# (A) extra icon glyphs — insert before icon-map close
a = """    lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',"""
b = a + """
    film: '<rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="M10 9.5l5 3-5 3z"/>',
    photo: '<rect x="3" y="6" width="18" height="14" rx="2.4"/><circle cx="12" cy="13" r="3.4"/><path d="M8 6l1.6-2h4.8L16 6"/>',
    gauge: '<circle cx="12" cy="14" r="7.4"/><path d="M12 14l3.6-4.4M12 6.6v-3M7.4 9.8L5.6 8M16.6 9.8l1.8-1.8"/>',
    route: '<circle cx="6" cy="19" r="1.9"/><circle cx="18" cy="5" r="1.9"/><path d="M8 19h6.2a3.6 3.6 0 0 0 0-7.2H9.8a3.6 3.6 0 0 1 0-7.2H16"/>',
    page: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7z"/><path d="M14 3v4h4M8.5 12h7M8.5 15.5h7M8.5 8.5h2"/>',
    envlp: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    plane: '<path d="M2 16l4-1 3 3 6-6 5-1-18-4 0 9z"/><path d="M17 15l3 2 2-1"/>',
    bolt: '<path d="M13 2L4.5 13.5H11L9.5 22 19 9.5h-6.5z"/>',
    spark: '<path d="M12 3l1.6 4.6L18 9.2l-4.4 1.6L12 15.5l-1.6-4.7L6 9.2l4.4-1.6z"/><path d="M19 14l.9 2.4L22 17.3l-2.1.9L19 20.6l-.9-2.4L16 17.3l2.1-.9z"/>',"""
assert a in js
js = js.replace(a, b, 1)

# (B) CAMG → structured thumbnail presets (labels preserved for engine calls)
a = """  const CAMG = [
    { t: 'Hero framing', items: ['Hero', 'Front', '¾ hero', 'Rear', 'Side'] },
    { t: 'Product & macro', items: ['Product', 'Top', 'Detail'] },
    { t: 'Instagram · 9:16', items: ['Reel', 'Orbit spin'] },
    { t: 'Detail angles', items: ['Left', 'Right'] },
  ];"""
b = """  const CAMG = [
    { t: 'Hero & story', tag: 'camera framing for the loft', items: ['Hero', '¾ hero', 'Front', 'Side', 'Rear'] },
    { t: 'Product & detail', tag: 'close, technical angles', items: ['Product', 'Detail', 'Top', 'Left', 'Right'] },
    { t: 'Motion', tag: 'camera moves for story', items: ['Orbit spin', 'Reel'] },
  ];"""
assert a in js
js = js.replace(a, b, 1)

# (C) MATS — realistic swatch catalogue with per-item style kind (params preserved)
a_start = js.index('  const MATS = [')
a_end = js.index('  const ASSETS = [')
new_mats = """  const MATS = [
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
  ];"""
js = js[:a_start] + new_mats + js[a_end:]
save(p, js)
print('patch1 ok  lines now', js.count('\\n'))
