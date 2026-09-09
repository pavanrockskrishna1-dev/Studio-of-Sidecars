import * as THREE from 'three';
import { section, toast } from '../core/ui.js';
import { CATEGORIES, ASSETS, ASSETMAP, iconForName } from '../assets_library.js';

/* =========================================================================
 *  VERSION 5 — ASSET LIBRARY  (template: 'assetlib')
 *  A tablet-first asset shelf: big category tiles (Coffee, BBQ, Furniture,
 *  Lighting, Food, Decorations) + search + ★ Favorites. One tap drops an
 *  asset into the SAME shared scene the other versions use; assets are full
 *  engine products, so they can be selected in the "In scene" panel and
 *  moved / rotated / scaled / duplicated / deleted. V1–V4 untouched.
 * ========================================================================= */

const FAV_LS = 'glbStudio.favs.v1';
const LIGHTING_GROUPS = [{
  label: 'Library looks',
  options: [
    { value: 'softbox', label: '💡 Softbox Studio (default)' },
    { value: 'coffeeshop', label: '☕ Coffee Shop Window' },
    { value: 'morning', label: '🌤️ Outdoor Morning' },
    { value: 'nightcafe', label: '🌃 Night Café' },
  ],
}];
const CAMERAS = [
  { key: 'front', label: 'Front' }, { key: '45', label: '45°' },
  { key: 'side', label: 'Side' }, { key: 'top', label: 'Top' }, { key: 'macro', label: 'Macro' },
];

export function createAssetLib(seed = {}) {
  const memory = Object.assign({
    lighting: seed.defaultLighting || 'softbox',
    view: { cat: 'all', q: '', favs: false },
  }, seed.memory || {});
  if (!memory.view || typeof memory.view !== 'object') memory.view = { cat: 'all', q: '', favs: false };

  const v = {
    id: seed.id || 'assetlib',
    ns: seed.ns || 'v5',
    short: seed.short || 'V5',
    label: seed.label || 'Asset Library',
    icon: seed.icon || '🧰',
    tagline: seed.tagline || 'Tap an asset to place it — search, favourite, transform',
    tpl: 'assetlib',
    userCreated: !!seed.userCreated,
    defaultFormat: seed.defaultFormat || '1:1',
    defaultLighting: seed.defaultLighting || 'softbox',
    defaultGuide: !!seed.defaultGuide,
    heroPreset: seed.heroPreset || '45',
    frameOpts: Object.assign({}, seed.frameOpts || {}),
    cameraPresets: CAMERAS.map((c) => ({ ...c })),
    moves: [],
    lightingOptions: LIGHTING_GROUPS.map((g) => ({ label: g.label, options: g.options.map((o) => ({ ...o })) })),
    memory,
    _lib: { sel: null, unsub: null },
  };

  const ns = v.ns;
  const el = (id) => document.getElementById(ns + id);
  const view = () => v.memory.view;
  let S = null; // engine handed over when the version is built/mounted

  /* ------------------------------------------------------------- favourites */
  function getFavs() { try { const x = JSON.parse(localStorage.getItem(FAV_LS) || '[]'); return Array.isArray(x) ? x : []; } catch (e) { return []; } }
  function saveFavs(f) { try { localStorage.setItem(FAV_LS, JSON.stringify(f)); } catch (e) {} }
  function isFav(key) { return getFavs().includes(key); }
  function toggleFav(key) {
    const f = getFavs(); const i = f.indexOf(key);
    if (i >= 0) { f.splice(i, 1); toast('☆ Removed from Favorites'); }
    else { f.push(key); toast('★ ' + (ASSETMAP[key] ? ASSETMAP[key].name : key) + ' saved to Favorites'); }
    saveFavs(f);
    renderAssets();
  }

  /* ---------------------------------------------------------- which assets */
  function visibleAssets() {
    const vw = view();
    const q = (vw.q || '').trim().toLowerCase();
    return ASSETS.filter((a) => {
      if (vw.favs && !isFav(a.key)) return false;
      if (!vw.favs && vw.cat !== 'all' && a.cat !== vw.cat) return false;
      if (q) {
        const hay = (a.name + ' ' + a.tags.join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  /* ---------------------------------------------------------------- render */
  function renderCats() {
    const host = el('Cats'); if (!host) return;
    host.innerHTML = '';
    const mk = (key, label, icon, on) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'al-cat' + (on ? ' on' : '');
      b.dataset.cat = key;
      b.innerHTML = '<span class="al-ci">' + icon + '</span><span class="al-cl">' + label + '</span>';
      b.addEventListener('click', () => {
        const vw = view();
        if (key === 'favs') { vw.favs = !vw.favs; if (vw.favs) vw.cat = 'all'; }
        else { vw.cat = vw.cat === key ? 'all' : key; vw.favs = false; }
        renderCats(); renderAssets();
      });
      host.appendChild(b);
    };
    mk('all', 'All', '✨', !view().favs && view().cat === 'all');
    CATEGORIES.forEach((c) => mk(c.key, c.label, c.icon, !view().favs && view().cat === c.key));
    mk('favs', 'Favorites', '★', !!view().favs);
  }

  function renderAssets() {
    const grid = el('Assets'); if (!grid) return;
    grid.innerHTML = '';
    const list = visibleAssets();
    const cnt = el('AssetCount');
    if (cnt) cnt.textContent = list.length ? list.length + ' asset' + (list.length === 1 ? '' : 's') : 'No matches';
    if (!list.length) {
      const e = document.createElement('div'); e.className = 'al-empty';
      e.textContent = view().q ? 'No assets match "' + view().q + '".' : (view().favs ? 'No favourites yet — tap ★ on any asset.' : 'Nothing here yet.');
      grid.appendChild(e);
      return;
    }
    list.forEach((a) => {
      const card = document.createElement('div');
      card.className = 'al-asset';
      card.dataset.key = a.key;
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.innerHTML = '<span class="al-ic">' + a.icon + '</span><span class="al-nm">' + a.name + '</span>';
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'al-star' + (isFav(a.key) ? ' on' : '');
      star.setAttribute('aria-label', (isFav(a.key) ? 'Unfavourite ' : 'Favourite ') + a.name);
      star.textContent = '★';
      star.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(a.key); });
      card.appendChild(star);
      const add = () => addAsset(a);
      card.addEventListener('click', add);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(); } });
      grid.appendChild(card);
    });
  }

  /* ------------------------------------------------------------- add asset */
  function addAsset(a) {
    if (!a) return;
    const off = S.nextPlaceOffset();
    const after = (recId) => {
      v._lib.sel = recId || null;
      toast(a.icon + ' ' + a.name + ' placed — use “In scene” to move / duplicate');
      renderScene();
      try { setTimeout(() => S.frame(v.heroPreset || '45'), 60); } catch (e) {}
    };
    if (a.glb) {
      S.loadDemo(a.glb, { quiet: true, noFrame: true, place: off, onAdd: (rec) => after(rec.id) });
    } else if (a.make) {
      try {
        const group = a.make();
        const rec = S.addObject3D(group, a.name, { quiet: true, noFrame: true, place: off });
        after(rec ? rec.id : null);
      } catch (e) { console.error(e); toast('Could not build ' + a.name, true); }
    }
  }

  /* ------------------------------------------------------ placed in scene */
  function selectedRec() {
    return S.state.models.find((r) => r.id === v._lib.sel) || null;
  }
  function renderScene() {
    const list = el('Placed'); if (!list) return;
    list.innerHTML = '';
    const models = S.state.models;
    if (!models.length) {
      const e = document.createElement('div'); e.className = 'al-empty';
      e.textContent = 'Nothing in the scene yet — tap an asset above to drop it in.';
      list.appendChild(e);
    } else {
      models.forEach((rec) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'al-prow' + (v._lib.sel === rec.id ? ' on' : '');
        row.dataset.mid = String(rec.id);
        row.innerHTML = '<span class="al-pico">' + iconForName(rec.name) + '</span>' +
          '<span class="al-pnm">' + rec.name + (rec.visible ? '' : ' (hidden)') + '</span>' +
          '<span class="al-pparts">' + rec.meshes.length + ' parts</span>';
        row.addEventListener('click', () => { v._lib.sel = rec.id; renderScene(); });
        list.appendChild(row);
      });
    }
    const cnt = el('SceneCount');
    if (cnt) cnt.textContent = models.length + ' in scene';
    renderSelPanel();
  }

  function renderSelPanel() {
    const panel = el('SelPanel');
    const rec = selectedRec();
    if (panel) panel.style.display = rec ? 'block' : 'none';
    const nm = el('SelName'); if (nm) nm.textContent = rec ? (iconForName(rec.name) + ' ' + rec.name) : '';
    if (!rec) return;
    const set = (sid, val) => { const i = el(sid); if (i) i.value = String(val); };
    const out = (sid, val) => { const o = el(sid + 'Out'); if (o) o.textContent = val; };
    set('Px', rec.group.position.x.toFixed(2));
    set('Pz', rec.group.position.z.toFixed(2));
    set('Ph', Math.max(-0.8, rec.group.position.y).toFixed(2));
    let deg = THREE.MathUtils.radToDeg(rec.group.rotation.y) % 360;
    if (deg > 180) deg -= 360;
    set('PRy', String(Math.round(deg)));
    set('Ps', rec.group.scale.x.toFixed(2));
    out('Px', rec.group.position.x.toFixed(2));
    out('Pz', rec.group.position.z.toFixed(2));
    out('Ph', Math.max(-0.8, rec.group.position.y).toFixed(2));
    out('PRy', Math.round(deg) + '°');
    out('Ps', rec.group.scale.x.toFixed(2) + '×');
  }

  function commitTransform(patch) {
    const rec = selectedRec(); if (!rec) return;
    const g = rec.group;
    if (patch.x !== undefined) g.position.x = patch.x;
    if (patch.z !== undefined) g.position.z = patch.z;
    if (patch.h !== undefined) g.position.y = Math.max(-0.8, patch.h);
    if (patch.ry !== undefined) g.rotation.y = THREE.MathUtils.degToRad(patch.ry);
    if (patch.s !== undefined) {
      const s = Math.min(4.5, Math.max(0.2, patch.s));
      g.scale.setScalar(s);
      const box = new THREE.Box3().setFromObject(g);
      g.position.y -= (box.min.y + 0.82); // re-ground on the floor
    }
    renderSelPanel();
  }

  function makeSlider(label, sid, min, max, step, unit, apply) {
    const w = document.createElement('div');
    const lab = document.createElement('label');
    lab.className = 'fld';
    lab.innerHTML = label + ' <span class="out" id="' + ns + sid + 'Out"></span>';
    const inp = document.createElement('input');
    inp.type = 'range';
    inp.id = ns + sid;
    inp.min = String(min); inp.max = String(max); inp.step = String(step);
    inp.addEventListener('input', () => apply(parseFloat(inp.value)));
    w.append(lab, inp);
    return w;
  }

  /* ------------------------------------------------------------------ build */
  v.build = function build(_S) {
    S = _S;
    if (v._lib.unsub) { try { v._lib.unsub(); } catch (e) {} v._lib.unsub = null; }
    const wrap = document.createElement('div');
    wrap.className = 'assetlib';
    wrap.dataset.ver = ns;

    const sec = section('🧰 Asset Library', true, ns);
    const lead = document.createElement('div');
    lead.className = 'hint';
    lead.innerHTML = 'Tap a category, search, or browse all — then <b>one tap drops an asset into the shared scene</b>. Everything placed here is editable below and shared with every version.';
    sec.appendChild(lead);

    const searchWrap = document.createElement('div');
    searchWrap.className = 'row';
    const search = document.createElement('input');
    search.type = 'search';
    search.id = ns + 'Search';
    search.placeholder = '🔍 Search assets…  (lamp, cake, cup…)';
    search.value = view().q || '';
    search.style.flex = '1';
    search.addEventListener('input', () => { view().q = search.value; renderAssets(); });
    search.addEventListener('search', () => { view().q = search.value; renderAssets(); });
    searchWrap.appendChild(search);
    sec.appendChild(searchWrap);

    const cats = document.createElement('div');
    cats.id = ns + 'Cats';
    cats.className = 'al-catgrid';
    sec.appendChild(cats);

    const grid = document.createElement('div');
    grid.id = ns + 'Assets';
    grid.className = 'al-grid';
    sec.appendChild(grid);
    const count = document.createElement('div');
    count.id = ns + 'AssetCount';
    count.className = 'hint';
    count.style.textAlign = 'center';
    sec.appendChild(count);
    wrap.appendChild(sec);

    const scene = section('📦 In scene', true, ns);
    const srow = document.createElement('div');
    srow.className = 'row';
    const stitle = document.createElement('span');
    stitle.id = ns + 'SceneCount';
    stitle.style.flex = '1';
    stitle.style.fontSize = '11px';
    stitle.style.color = 'var(--muted)';
    srow.appendChild(stitle);
    const viewAll = document.createElement('button');
    viewAll.textContent = '🎯 Fit view';
    viewAll.title = 'Frame every product in the scene';
    viewAll.addEventListener('click', () => { try { S.frame(v.heroPreset || '45'); } catch (e) {} });
    srow.appendChild(viewAll);
    scene.appendChild(srow);

    const list = document.createElement('div');
    list.id = ns + 'Placed';
    list.className = 'al-plist';
    scene.appendChild(list);

    const selPanel = document.createElement('div');
    selPanel.id = ns + 'SelPanel';
    selPanel.style.display = 'none';
    const selName = document.createElement('div');
    selName.id = ns + 'SelName';
    selName.style.cssText = 'font-size:12px;font-weight:800;color:var(--gold);margin:8px 0 2px;';
    selPanel.appendChild(selName);
    const act = document.createElement('div');
    act.className = 'row';
    const dup = document.createElement('button');
    dup.type = 'button'; dup.id = ns + 'Dup'; dup.textContent = '⧉ Duplicate';
    dup.addEventListener('click', () => {
      const rec = selectedRec(); if (!rec) return;
      const copy = S.duplicateModel(rec.id);
      if (copy) { v._lib.sel = copy.id; renderScene(); }
    });
    const del = document.createElement('button');
    del.type = 'button'; del.id = ns + 'Del'; del.className = 'danger'; del.textContent = '🗑️ Delete';
    del.addEventListener('click', () => {
      const rec = selectedRec(); if (!rec) return;
      S.removeModel(rec.id);
      v._lib.sel = null;
      renderScene();
    });
    act.append(dup, del);
    selPanel.appendChild(act);
    selPanel.appendChild(makeSlider('Move X', 'Px', -7, 7, 0.05, '', (x) => commitTransform({ x })));
    selPanel.appendChild(makeSlider('Move Z', 'Pz', -7, 7, 0.05, '', (z) => commitTransform({ z })));
    selPanel.appendChild(makeSlider('Height', 'Ph', -0.8, 8, 0.05, '', (h) => commitTransform({ h })));
    selPanel.appendChild(makeSlider('Spin (rotate)', 'PRy', -180, 180, 1, '', (ry) => commitTransform({ ry })));
    selPanel.appendChild(makeSlider('Scale', 'Ps', 0.2, 4.5, 0.05, '', (s) => commitTransform({ s })));
    const tip = document.createElement('div');
    tip.className = 'hint';
    tip.innerHTML = 'Assets share the scene engine: pick one above, then fine-tune with the sliders. ✕ in 📦 Products removes it from every version.';
    selPanel.appendChild(tip);
    scene.appendChild(selPanel);
    wrap.appendChild(scene);

    v._lib.unsub = S.onProductsChange(() => { if (document.getElementById(ns + 'Placed')) renderScene(); });
    return wrap;
  };

  v.onActivate = function onActivate() {
    /* DOM is mounted by now — render the catalog + scene lists */
    renderCats(); renderAssets(); renderScene();
  };
  v.onDeactivate = function onDeactivate() {
    if (v._lib && v._lib.unsub) { try { v._lib.unsub(); } catch (e) {} v._lib.unsub = null; }
  };
  return v;
}

export default createAssetLib();
