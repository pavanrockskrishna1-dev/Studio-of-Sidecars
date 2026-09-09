/* =========================================================================
 *  STUDIO OF SIDECARS — PREMIUM SHELL  (src/core/shell.js)
 *  One consistent studio chrome across every workspace V1–V6:
 *    top chrome (brand · project · workspace switcher · undo/redo/save/
 *    export/settings), left studio nav, right context inspector, bottom
 *    creator dock, floating object toolbar, splash + auto-reopen last
 *    project, settings with Private Developer Mode + Light/Dark theme.
 *  Pure additive layer: it never rewrites version panels or #topbar's own
 *  content — every legacy id/behavior the regression suites rely on stays
 *  exactly as the versions build it.
 * ========================================================================= */

import {
  getActiveVersion, listVersions, activateById, onVersionChange, duplicateVersion,
} from '../versions/registry.js';

/* Most callers pass '#id' (selector style) — accept both that and bare 'id'. */
const $ = (id) => {
  id = '' + id;
  const bare = id.charAt(0) === '#' ? id.slice(1) : id;
  try {
    const el = document.getElementById(bare);
    if (el) return el;
  } catch (e) {}
  try {
    return document.querySelector(bare.charAt(0) === '#' ? bare : '#' + bare);
  } catch (e2) {}
  return null;
};
const THEME_KEY = 'glbStudio.theme.v1';
const DEV_KEY = 'glbStudio.devMode.v1';
let S = null, hub = null;

function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

/* ------------------------------------------------------------- small ui */
function btn(txt, cls, title) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = cls || ''; b.textContent = txt;
  if (title) b.title = title;
  return b;
}
function toastErrSafe(fn) { try { fn(); } catch (e) { console.warn('shell', e); } }

/* ---------------------------------------------------------------- theme */
function applyTheme(light) {
  document.body.classList.toggle('so-light', !!light);
  const toggles = document.querySelectorAll('#setThemeDark, #setThemeLight');
  toggles.forEach((t) => t.classList.toggle('on', (t.id === 'setThemeLight') === !!light));
}
function applyDev(on) {
  document.body.classList.toggle('so-dev', !!on);
  const d = $('#devPanel');
  if (d) d.classList.toggle('show', !!on);
  const nav = $('#navDeveloper');
  if (nav) nav.classList.toggle('on', !!on);
}

/* ============================================================== top chrome */
function buildBrand() {
  const wrap = document.createElement('div');
  wrap.id = 'appBrand';
  wrap.innerHTML = '<div id="soLogo">☕</div>' +
    '<div style="display:flex;flex-direction:column;gap:1px">' +
    '<span id="soTitle">Studio of Sidecars</span>' +
    '<span id="soTag">Private 3D Creator Studio</span></div>';
  document.getElementById('topStrip').appendChild(wrap);
}

function buildProjectPill() {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.id = 'projPill';
  pill.innerHTML = '<span class="dot"></span><span class="tx">Unsaved workspace</span>';
  pill.title = 'Current project — tap to open the Project Manager';
  pill.addEventListener('click', () => { if (S && S.hubUI) S.hubUI.open('projects'); });
  document.getElementById('topStrip').appendChild(pill);
  refreshProjectPill();
  return pill;
}
function refreshProjectPill() {
  const pill = $('#projPill');
  if (!pill) return;
  const list = (hub && hub.projects) ? hub.projects() : [];
  const cur = list[0];
  pill.classList.toggle('empty', !cur);
  const tx = pill.querySelector('.tx');
  if (tx) tx.textContent = cur ? cur.name : 'Unsaved workspace';
}

function buildActions() {
  const host = document.createElement('div');
  host.id = 'appActions';
  const mk = (id, icon, title, fn) => {
    const b = btn(icon, 'tb-btn', title);
    b.id = id;
    b.addEventListener('click', () => toastErrSafe(fn));
    host.appendChild(b);
    return b;
  };
  mk('tbUndo', '↶', 'Undo (Ctrl+Z)', () => { if (hub && hub.canUndo()) hub.undo(); });
  mk('tbRedo', '↷', 'Redo (Ctrl+Shift+Z)', () => { if (hub && hub.canRedo()) hub.redo(); });
  mk('tbSave', '💾', 'Save project', openSave);
  mk('tbExport', '⬇', 'Export pack', () => { if (S && S.hubUI) S.hubUI.open('export'); });
  mk('tbTheme', '🌓', 'Toggle Light / Dark', () => {
    applyTheme(!document.body.classList.contains('so-light'));
    lsSet(THEME_KEY, document.body.classList.contains('so-light'));
  });
  mk('tbSettings', '⚙', 'Settings', () => openSettings('about'));
  document.getElementById('topStrip').appendChild(host);
  return host;
}
function refreshUndoRedo() {
  const u = $('#tbUndo'), r = $('#tbRedo');
  if (!hub) return;
  if (u) { u.disabled = !hub.canUndo(); }
  if (r) { r.disabled = !hub.canRedo(); }
}

/* ========================================================= left studio nav */
const NAV = [
  { id: 'navProjects', icon: '🗂', label: 'Projects', act: () => { if (S && S.hubUI) S.hubUI.open('projects'); } },
  { id: 'navAssets', icon: '📦', label: 'Assets', act: () => activateById('assetlib', S) },
  { id: 'navScenes', icon: '🎬', label: 'Scenes', act: () => { if (S && S.hubUI) S.hubUI.open('presets'); } },
  { id: 'navTemplates', icon: '🧩', label: 'Templates', act: openTemplates },
  { id: 'navBrand', icon: '🎨', label: 'Brand Kits', act: () => activateById('brandstudio', S) },
  { id: 'navFavs', icon: '★', label: 'Favorites', act: openFavorites },
  { id: 'navDeveloper', icon: '🛠', label: 'Developer', act: () => { applyDev(true); lsSet(DEV_KEY, true); openSettings('dev'); } },
  { id: 'navSettings', icon: '⚙', label: 'Settings', act: () => openSettings('about') },
];
function ensureNavHost() {
  let host = $('#soNavHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'soNavHost';
    const p = $('#panel');
    if (p) {
      const h1 = p.querySelector('h1');
      if (h1 && h1.nextSibling) p.insertBefore(host, h1.nextSibling);
      else p.appendChild(host);
    } else {
      document.body.appendChild(host);
    }
  }
  return host;
}
function buildNav() {
  const grid = document.createElement('div');
  grid.id = 'soNav';
  NAV.forEach((n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'so-nav-btn';
    b.id = n.id;
    b.innerHTML = '<span class="ni">' + n.icon + '</span><span>' + n.label + '</span>';
    b.addEventListener('click', () => toastErrSafe(n.act));
    grid.appendChild(b);
  });
  const host = ensureNavHost();
  if (host && !host.querySelector('#' + grid.id)) host.appendChild(grid);
}
function activeNavId() {
  const tpl = getActiveVersion() ? getActiveVersion().tpl : '';
  const map = { classic: null, commercial: null, creator: 'navReel', assetlib: 'navAssets', brandstudio: 'navBrand' };
  return map[tpl] || null;
}
function refreshNav() {
  document.querySelectorAll('#soNav .so-nav-btn').forEach((b) => b.classList.remove('on'));
  const id = activeNavId();
  if (id) { const b = $(id); if (b) b.classList.add('on'); }
  if ($('#navDeveloper')) $('#navDeveloper').classList.toggle('on', isDev());
}
function openTemplates() {
  const ov = document.createElement('div');
  ov.className = 'hu-ov';
  ov.style.zIndex = '150';
  ov.innerHTML = '<div class="hu-card"><div class="hu-head"><span class="hu-title">🧩 Workspace Templates</span>' +
    '<button class="hu-x" id="tClose">✕</button></div><div class="hu-body"><div class="in-note" style="margin:2px 2px 10px">Switch the whole studio to a different workspace, or duplicate the current workspace into a fresh template (V1–V6 stay untouched; one live scene is shared).</div><div id="tGrid"></div></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#tClose').addEventListener('click', () => ov.remove());
  ov.addEventListener('pointerdown', (e) => { if (e.target === ov) ov.remove(); });
  const grid = ov.querySelector('#tGrid');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';
  listVersions().forEach((v) => {
    const cell = document.createElement('div');
    cell.style.cssText = 'display:flex;flex-direction:column;gap:5px';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hdtile';
    card.style.cssText = 'min-height:92px;font-size:12px';
    card.innerHTML = '<span class="hd-ic">' + v.icon + '</span><span>' + v.short + ' · ' + v.label + '</span>' +
      '<span class="hd-sub">' + (v.tagline || '') + '</span>';
    const on = getActiveVersion() === v;
    if (on) card.style.cssText += ';border-color:#e8c07a';
    card.addEventListener('click', () => {
      ov.remove();
      if (!on) activateById(v.id, S);
      else if (S.toast) S.toast(v.short + ' is already the active workspace.');
    });
    cell.appendChild(card);
    const dup = btn('⧉ Copy as template', 'hub-btn', 'Duplicate ' + v.label + ' into a new workspace template');
    dup.addEventListener('click', () => { ov.remove(); try { duplicateVersion(v.id, S); } catch (e) { if (S && S.toast) S.toast('Could not duplicate workspace.', true); } });
    cell.appendChild(dup);
    grid.appendChild(cell);
  });
}
function openFavorites() {
  if (getActiveVersion() && getActiveVersion().tpl !== 'assetlib') { activateById('assetlib', S); }
  setTimeout(() => {
    const fav = document.querySelector('.assetlib .al-cat[data-cat="favs"]');
    if (fav) fav.click();
    else if (S && S.hubUI) S.hubUI.open('presets');
  }, 260);
}

/* ================================================== bottom creator dock */
function buildDock() {
  const dock = document.createElement('div');
  dock.id = 'dock';
  const mk = (id, icon, label, hot, act) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.className = 'dk-btn' + (hot ? ' hot' : '');
    b.innerHTML = '<span class="di">' + icon + '</span><span>' + label + '</span>';
    b.addEventListener('click', () => toastErrSafe(act));
    dock.appendChild(b);
  };
  mk('dkCamera', '📷', 'Camera', false, () => {
    const v = getActiveVersion();
    try { if (S.frame) S.frame((v && v.heroPreset) || '45', v && v.frameOpts); } catch (e) {}
  });
  mk('dkAssets', '📦', 'Assets', false, () => activateById('assetlib', S));
  mk('dkScene', '🎬', 'Scene', false, () => { if (S && S.hubUI) S.hubUI.open('presets'); });
  mk('dkReel', '🎞', 'Reel', false, () => { if (S && S.hubUI) S.hubUI.open('workflow'); });
  mk('dkBrand', '🎨', 'Brand', false, () => activateById('brandstudio', S));
  mk('dkRender', '🐍', 'Render', false, () => activateById('blender', S));
  const sep = document.createElement('div'); sep.className = 'dk-sep'; dock.appendChild(sep);
  mk('dkRec', '⏺', 'Record', false, () => { try { S.toggleRecord(); } catch (e) {} });
  mk('dkExport', '⬇', 'Export', true, () => { if (S && S.hubUI) S.hubUI.open('export'); });
  document.body.appendChild(dock);
  return dock;
}
function refreshRecBtn() {
  const b = $('#dkRec');
  if (!b) return;
  const badge = $('#recBadge');
  const on = !!(badge && badge.style && badge.style.display && badge.style.display !== 'none');
  b.classList.toggle('hot', on);
  b.innerHTML = on ? '<span class="di">⏹</span><span>Stop</span>' : '<span class="di">⏺</span><span>Record</span>';
}
function refreshDock() {
  const map = { assetlib: 'dkAssets', brandstudio: 'dkBrand', blender: 'dkRender', creator: 'dkReel' };
  const key = getActiveVersion() ? map[getActiveVersion().tpl] : null;
  document.querySelectorAll('#dock .dk-btn').forEach((b) => b.classList.toggle('on', b.id === key));
}

/* ====================================================== right inspector */
let INSP_BOX = null, IN_BODY = null;
function buildInspector() {
  if (INSP_BOX && INSP_BOX.isConnected) return;
  const box = document.createElement('aside');
  box.id = 'inspector';
  box.setAttribute('aria-label', 'Workspace inspector');
  const body = document.createElement('div');
  body.id = 'inBody';
  const h = document.createElement('div');
  h.className = 'in-title';
  h.textContent = 'Inspector';
  box.appendChild(h); box.appendChild(body);
  document.body.appendChild(box);
  INSP_BOX = box; IN_BODY = body;
}
function getInspBody() {
  if (IN_BODY && IN_BODY.isConnected) return IN_BODY;
  if (INSP_BOX && INSP_BOX.isConnected) {
    const b = INSP_BOX.querySelector('#inBody');
    if (b) { IN_BODY = b; return b; }
  }
  const found = document.querySelector('#inBody');
  return found || null;
}
function inspectEl(kind, title) {
  const sec = document.createElement('div');
  sec.className = 'in-sec';
  const h = document.createElement('h4');
  h.textContent = title;
  sec.appendChild(h);
  return sec;
}
function renderInspector() {
  let body = getInspBody();
  if (!body) {
    buildInspector();
    body = getInspBody();
  }
  if (!body) return;
  body.innerHTML = '';
  const v = getActiveVersion();
  if (!v) return;
  const title = body.parentElement ? body.parentElement.querySelector('.in-title') : null;
  if (title) title.innerHTML = '<span class="ic">' + v.icon + '</span>' + v.short + ' · ' + v.label + ' Inspector';
  const lightAll = () => (v.memory.lighting || v.defaultLighting || 'softbox');
  const note = (sec, txt) => { const n = document.createElement('div'); n.className = 'in-note'; n.textContent = txt; sec.appendChild(n); };

  /* ---- Camera quick shots + moves ---- */
  const cam = inspectEl('cam', 'Camera');
  const row = document.createElement('div');
  row.className = 'in-row';
  (v.cameraPresets || []).forEach((c) => {
    const chip = btn(c.label, 'in-chip', 'Frame ' + c.label);
    chip.addEventListener('click', () => { try { S.frame(c.key); } catch (e) {} });
    row.appendChild(chip);
  });
  if (row.children.length) cam.appendChild(row);
  else note(cam, 'No framing presets in this workspace — use the canvas tools.');
  (v.moves || []).forEach((m) => {
    const mv = btn(m.label, 'in-chip', 'Play move');
    mv.addEventListener('click', () => {
      const dur = 6000;
      try { S.playMove(m.key, dur, false); } catch (e) {}
    });
    cam.appendChild(mv);
  });
  body.appendChild(cam);

  /* ---- Lighting quick ---- */
  const lt = inspectEl('light', 'Lighting');
  const groups = v.lightingOptions || [];
  const flat = [];
  groups.forEach((g) => g.options.forEach((o) => flat.push({ value: o.value, label: o.label })));
  if (flat.length) {
    const sel = document.createElement('select');
    sel.className = 'in-select';
    flat.forEach((o) => {
      const op = document.createElement('option');
      op.value = o.value; op.textContent = o.label;
      sel.appendChild(op);
    });
    sel.value = lightAll();
    sel.addEventListener('change', () => { try { S.setLightingPreset(sel.value); } catch (e) {} });
    lt.appendChild(sel);
    note(lt, 'Applied to the live scene & saved for this workspace.');
  } else {
    note(lt, 'Lighting is inherited from the current workspace memory.');
  }
  body.appendChild(lt);

  /* ---- Workspace-specific quick card ---- */
  if (v.tpl === 'creator') {
    const re = inspectEl('reel', 'Reel');
    const shots = (v.memory && v.memory.shots) ? v.memory.shots.length : 0;
    const s = document.createElement('div');
    s.className = 'in-stat';
    s.innerHTML = '<span>Shots in reel</span><b>' + shots + '</b>';
    re.appendChild(s);
    const play = btn('▶ Preview Reel', 'in-chip');
    play.addEventListener('click', () => { const p = $('v4Play'); if (p) p.click(); });
    re.appendChild(play);
    body.appendChild(re);
  } else if (v.tpl === 'assetlib') {
    const as = inspectEl('asset', 'Assets');
    note(as, S.state.models.length + ' product' + (S.state.models.length === 1 ? '' : 's') + ' in the shared scene — assets never reload between workspaces.');
    body.appendChild(as);
  } else if (v.tpl === 'brandstudio') {
    const br = inspectEl('brand', 'Brand');
    const st = document.createElement('div');
    st.className = 'in-stat';
    const kit = (S.brand && S.brand.kit) ? S.brand.kit() : null;
    st.innerHTML = '<span>Active kit</span><b>' + (kit ? kit.name : 'none') + '</b>';
    br.appendChild(st);
    body.appendChild(br);
  } else if (v.tpl === 'blender') {
    const bl = inspectEl('blend', 'Blender Render');
    note(bl, 'Renders the current scene offline with Cycles — one-click pipeline stays untouched.');
    const go = btn('🐍 Open Render Panel', 'in-chip');
    go.addEventListener('click', () => { const b = $('blRender'); if (b) { b.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
    bl.appendChild(go);
    body.appendChild(bl);
  } else {
    const wt = inspectEl('work', 'Workspace');
    note(wt, 'Editor & commercial capture tools live in the sidebar. Use the canvas to frame and style.');
    body.appendChild(wt);
  }

  /* ---- Selection / object quick tools ---- */
  const sel = inspectEl('sel', 'Object');
  const sp = S.state ? S.state.selectedPart : null;
  if (sp) {
    const st2 = document.createElement('div');
    st2.className = 'in-stat';
    const rec = S.state.models.find((m) => m.id === sp.modelId);
    st2.innerHTML = '<span>Selected</span><b style="max-width:110px;overflow:hidden;text-overflow:ellipsis">' + (sp.name || 'part') + '</b>';
    sel.appendChild(st2);
    if (rec) note(sel, 'Product: ' + rec.name);
    const r2 = document.createElement('div');
    r2.className = 'in-row';
    const mkS = (label, fn) => { const c = btn(label, 'in-chip'); c.addEventListener('click', () => toastErrSafe(fn)); return c; };
    r2.appendChild(mkS('Move', openParts));
    r2.appendChild(mkS('Duplicate', () => { try { S.duplicateModel(sp.modelId); } catch (e) {} }));
    r2.appendChild(mkS('Focus', () => { try { S.frame((getActiveVersion() || {}).heroPreset || '45'); } catch (e) {} }));
    const delC = mkS('Delete', () => { try { S.removeModel(sp.modelId); } catch (e) {} });
    delC.classList.add('dim');
    r2.appendChild(delC);
    sel.appendChild(r2);
  } else {
    note(sel, 'Nothing selected — pick a product, then a part to style it.');
  }
  body.appendChild(sel);
  /* If the sections still did not land (very early mount), try once more. */
  if (body.querySelectorAll('.in-sec').length === 0 && !body.dataset.retried) {
    body.dataset.retried = '1';
    setTimeout(renderInspector, 60);
  }
}

/* ================================================== floating object bar */
function buildFloat() {
  const bar = document.createElement('div');
  bar.id = 'floatBar';
  const mk = (id, icon, label, cls, act) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.className = 'fb-btn' + (cls ? ' ' + cls : '');
    b.innerHTML = '<span class="fi">' + icon + '</span><span>' + label + '</span>';
    b.addEventListener('click', () => toastErrSafe(act));
    bar.appendChild(b);
    return b;
  };
  const nm = document.createElement('span');
  nm.className = 'fb-name';
  nm.id = 'fbName';
  bar.appendChild(nm);
  const sep = document.createElement('span'); sep.className = 'fb-sep'; bar.appendChild(sep);
  mk('fbMove', '↕', 'Move', '', openParts);
  mk('fbRotate', '↻', 'Rotate', '', openParts);
  mk('fbScale', '⤢', 'Scale', '', openParts);
  mk('fbDup', '⧉', 'Duplicate', '', () => {
    const sp = S.state && S.state.selectedPart;
    if (sp) S.duplicateModel(sp.modelId);
    else S.duplicateModel(S.state.models[0] && S.state.models[0].id);
  });
  mk('fbDel', '🗑', 'Delete', 'del', () => {
    const sp = S.state && S.state.selectedPart;
    if (sp) S.removeModel(sp.modelId);
  });
  mk('fbFocus', '🎯', 'Focus', '', () => {
    try { S.frame((getActiveVersion() || {}).heroPreset || '45'); } catch (e) {}
  });
  document.body.appendChild(bar);
  return bar;
}
function refreshFloat(force) {
  const bar = $('#floatBar');
  if (!bar) return;
  const sp = (S.state && S.state.selectedPart) || null;
  const model = sp ? (S.state.models.find((m) => m.id === sp.modelId) || null) : null;
  if (force) { cached = sig(sp, model); }
  const show = !!sp;
  bar.classList.toggle('show', show);
  const nm = $('#fbName');
  if (nm) nm.textContent = sp ? (model ? model.name + ' › ' : '') + sp.name : '';
}
let cached = '';
function sig(sp, model) {
  if (!sp) return '';
  return sp.modelId + ':' + (sp.index != null ? sp.index : 0) + ':' + (model ? model.id : '');
}
function selectionChanged() {
  const sp = S.state ? S.state.selectedPart : null;
  const model = sp ? (S.state.models.find((m) => m.id === sp.modelId) || null) : null;
  const next = sig(sp, model);
  if (next !== cached) { cached = next; refreshFloat(true); renderInspector(); }
}
function openParts() {
  const d = [...document.querySelectorAll('#panel details')].find((x) => {
    const s = x.querySelector('summary'); return s && /Parts/.test(s.textContent);
  });
  if (d) { d.open = true; try { d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
  const c = $('#partCtrls');
  if (c) c.style.display = S.state && S.state.selectedPart ? 'block' : 'none';
}

/* ============================================================== overlays */
function openSettings(section) {
  const ov = $('#sosOv');
  if (!ov) return;
  if (section === 'dev') applyDev(isDev());
  ov.classList.add('show');
}
function closeSettings() { const ov = $('#sosOv'); if (ov) ov.classList.remove('show'); }
function openSave() {
  const ov = $('#saveOv');
  if (!ov) return;
  const inp = $('#soNameInput');
  if (inp) inp.value = hub && hub.projects && hub.projects()[0] ? (hub.projects()[0].name + ' v2') : 'Studio of Sidecars project';
  ov.classList.add('show');
  setTimeout(() => { if (inp) { inp.focus(); inp.select(); } }, 40);
}
function closeSave() { const ov = $('#saveOv'); if (ov) ov.classList.remove('show'); }
async function doSave() {
  const inp = $('#soNameInput');
  const name = inp ? inp.value.trim() : '';
  if (!name) { if (S && S.toast) S.toast('Give the project a name first.', true); return; }
  closeSave();
  if (hub && hub.saveProject) { try { await hub.saveProject(name); refreshProjectPill(); refreshUndoRedo(); } catch (e) { console.warn(e); } }
  else if (S && S.toast) S.toast('Project store not ready yet.', true);
}

/* ---- settings card ---- */
function buildSettings() {
  const ov = document.createElement('div');
  ov.id = 'sosOv';
  ov.innerHTML =
    '<div class="so-card" style="position:relative">' +
    '<div class="so-head"><div class="flex"><h2>⚙ Settings</h2><div class="sub">Studio of Sidecars — Private Edition · v1.0</div></div>' +
    '<button class="tb-btn primary-x" id="soClose" style="width:40px;height:40px">✕</button></div>' +
    '<div id="soBody"></div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('pointerdown', (e) => { if (e.target === ov) closeSettings(); });
  ov.querySelector('#soClose').addEventListener('click', closeSettings);

  const body = ov.querySelector('#soBody');
  const row = (title, sub, extra) => {
    const r = document.createElement('div');
    r.className = 'set-row';
    const tx = document.createElement('div');
    tx.className = 'tx';
    tx.innerHTML = '<b>' + title + '</b><span>' + sub + '</span>';
    r.appendChild(tx);
    r.appendChild(extra);
    body.appendChild(r);
  };
  const toggleRow = (id, title, sub, onChange) => {
    const t = document.createElement('div');
    t.className = 'so-toggle';
    t.id = id;
    t.setAttribute('role', 'switch');
    t.addEventListener('click', () => { const on = t.classList.toggle('on'); onChange(!!on); });
    row(title, sub, t);
    return t;
  };
  const themeWrap = document.createElement('div');
  themeWrap.style.cssText = 'display:flex;gap:6px';
  const mkTheme = (id, label) => {
    const b = btn(label, 'in-chip');
    b.id = id;
    b.addEventListener('click', () => {
      const light = id === 'setThemeLight';
      applyTheme(light);
      lsSet(THEME_KEY, light);
    });
    themeWrap.appendChild(b);
    return b;
  };
  mkTheme('setThemeDark', '🌙 Dark');
  mkTheme('setThemeLight', '☀️ Light');
  row('Appearance', 'Premium dark is the default; light mode is optional.', themeWrap);

  const devT = toggleRow('devToggle', 'Private Developer Mode', 'Unlock the private toolset: Asset Builder, Pivot Editor, Material Editor, Import/Export, Debug, Performance Monitor and Build tools.', (on) => { applyDev(on); lsSet(DEV_KEY, on); refreshNav(); });

  const dev = document.createElement('div');
  dev.className = 'dev-panel';
  dev.id = 'devPanel';
  const grid = document.createElement('div');
  grid.className = 'dev-grid';
  const tile = (id, icon, label, sub, act) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dev-tile';
    b.id = id;
    b.innerHTML = '<span>' + icon + ' ' + label + '</span><i>' + sub + '</i>';
    b.addEventListener('click', () => toastErrSafe(act));
    grid.appendChild(b);
  };
  tile('devAssets', '🧱', 'Asset Builder', 'Add & manage private assets (GLB/GLTF + kit models).', () => activateById('assetlib', S));
  tile('devPivot', '🎯', 'Pivot Editor', 'Open the product & parts editor to adjust origins & transforms.', () => { openParts(); if (S && S.toast) S.toast('Parts inspector opened — select a part to edit its origin (Move X/Y/Z).'); });
  tile('devMaterial', '🎨', 'Material Editor', 'Style colours + finishes on the selected part.', () => { openParts(); if (S && S.toast) S.toast('Material Editor ready — choose Colour / Finish below.'); });
  tile('devIO', '📥', 'Import / Export', 'Import .glb/.gltf products; export project files & packs.', () => { if (S && S.hubUI) S.hubUI.open('export'); });
  tile('devDebug', '🧪', 'Debug tools', 'Inspect live engine state & data.', openDebug);
  tile('devPerfTile', '📊', 'Performance monitor', 'Live FPS · models · parts · memory.', togglePerf);
  tile('devBuild', '📦', 'Build tools', 'Snapshot the scene, export a project file.', buildTools);
  tile('devProbe', '🩺', 'Self test', 'Run the in-app self-check probe.', selfProbe);
  dev.appendChild(grid);
  const devNote = document.createElement('div');
  devNote.className = 'in-note';
  devNote.style.marginTop = '7px';
  devNote.textContent = 'Developer Mode is private — hidden during normal creator use.';
  dev.appendChild(devNote);
  body.appendChild(dev);

  const perfs = document.createElement('div');
  perfs.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:12px';
  const about = () => {
    perfs.innerHTML = '';
    const h = document.createElement('div');
    h.style.cssText = 'font-size:11px;font-weight:800;color:#8fd3b8;text-transform:uppercase;letter-spacing:.08em';
    h.textContent = 'About & data';
    perfs.appendChild(h);
    const ps = document.createElement('div');
    ps.className = 'about-pills';
    const keys = [
      ['Edition', 'Private v1.0'],
      ['Workspaces', String((listVersions() || []).length)],
      ['Engine', 'three.js · WebGL'],
      ['Offline', 'single-file, no network'],
    ];
    keys.forEach(([k, val]) => { const s = document.createElement('span'); s.innerHTML = k + ': <b style="color:#e8c07a">' + val + '</b>'; ps.appendChild(s); });
    perfs.appendChild(ps);
    let used = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k) used += (localStorage.getItem(k) || '').length + k.length; } } catch (e) {}
    const s2 = document.createElement('div');
    s2.className = 'in-note';
    s2.style.marginTop = '6px';
    s2.textContent = 'Local app data ≈ ' + Math.round(used / 1024) + ' KB · ' + (localStorage.length) + ' keys stored on this device.';
    perfs.appendChild(s2);
    const reset = document.createElement('button');
    reset.className = 'hub-btn danger';
    reset.textContent = 'Erase all app data on this device';
    reset.style.cssText = 'width:100%;margin-top:6px';
    reset.addEventListener('click', async () => {
      try { await (hub && hub.autosaveNow ? hub.autosaveNow() : null); } catch (e) {}
      try { localStorage.clear(); } catch (e) {}
      if (S && S.toast) S.toast('App data cleared — reload the studio.');
      setTimeout(() => location.reload(), 900);
    });
    perfs.appendChild(reset);
  };
  about();
  body.appendChild(perfs);
}
function isDev() { return !!document.body.classList.contains('so-dev'); }

/* ---- dev perf monitor ---- */
let perfTimer = null;
function togglePerf() {
  const el = $('#devPerf');
  if (!el) return;
  const show = !el.classList.contains('show');
  el.classList.toggle('show', show);
  const tile = $('#devPerfTile');
  if (tile) tile.style.borderColor = show ? 'rgba(124,252,158,.8)' : '';
  if (!show) { clearInterval(perfTimer); return; }
  let frames = 0, last = performance.now();
  clearInterval(perfTimer);
  perfTimer = setInterval(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    const fps = dt > 0 ? Math.round(frames / dt) : 0;
    frames = 0; last = now;
    const models = (S.state.models || []).length;
    const parts = (S.state.meshes || []).length;
    const mem = (performance.memory && performance.memory.usedJSHeapSize)
      ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : 'n/a';
    el.innerHTML = '<div><b>' + fps + '</b> fps</div>' +
      '<div class="row2"><span>models <b>' + models + '</b></span><span>parts <b>' + parts + '</b></span><span>JS <b>' + mem + '</b></span></div>';
  }, 1000);
  frames = 0;
  const tick = () => { frames++; if (el.classList.contains('show')) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

/* ---- dev debug overlay ---- */
function openDebug() {
  const info = { active: getActiveVersion() ? getActiveVersion().id : null,
    versions: (listVersions() || []).map((v) => ({ id: v.id, tpl: v.tpl, label: v.label, mem: v.memory || {} })),
    models: (S.state.models || []).map((m) => ({ id: m.id, name: m.name, parts: m.meshes.length })),
    theme: document.body.classList.contains('so-light') ? 'light' : 'dark',
    dev: isDev(),
    ls: (() => { try { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k) o[k] = (localStorage.getItem(k) || '').length; } return o; } catch (e) { return {}; } })() };
  const ov = document.createElement('div');
  ov.className = 'hu-ov'; ov.style.zIndex = '160';
  ov.innerHTML = '<div class="hu-card"><div class="hu-head"><span class="hu-title">🧪 Debug snapshot</span><button class="hu-x" id="dbgClose">✕</button></div>' +
    '<div class="hu-body"><pre style="font-size:10.5px;color:#9fe0ff;white-space:pre-wrap;line-height:1.5">' + JSON.stringify(info, null, 1) + '</pre></div>' +
    '<div class="hu-foot" style="margin-top:8px"><button class="hub-btn primary" id="dbgDl">⬇ Download snapshot.json</button></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#dbgClose').addEventListener('click', () => ov.remove());
  ov.querySelector('#dbgDl').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(info, null, 1)], { type: 'application/json' }));
    a.download = 'studio_debug.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  });
}
function buildTools() {
  const meta = (hub && hub.projects && hub.projects()) || [];
  if (!meta.length) { if (S && S.toast) S.toast('Save a project first — then Build can snapshot it.', true); return; }
  const it = meta[0];
  if (hub.exportProjectFile) hub.exportProjectFile(it.id);
  if (S && S.toast) S.toast('Build snapshot exported: ' + it.name + '.glbproj.json');
}
async function selfProbe() {
  const res = [];
  res.push(['engine', !!S]);
  res.push(['workspaces', (listVersions() || []).length]);
  res.push(['models', (S.state.models || []).length]);
  res.push(['renderer', !!(S.renderer && S.renderer.domElement)]);
  res.push(['hub', !!(hub && hub.projects)]);
  try { await hub.autosaveNow(); res.push(['autosave', 'ok']); } catch (e) { res.push(['autosave', 'err']); }
  const parts = res.map(([k, v]) => k + '=' + v).join(' · ');
  if (S && S.toast) S.toast('🩺 Self test: ' + parts);
}

/* ============================================================ save dialog */
function buildSave() {
  const ov = document.createElement('div');
  ov.id = 'saveOv';
  ov.innerHTML = '<div class="so-card" style="width:min(430px,94vw)">' +
    '<h2>💾 Save project</h2><div class="sub">Everything offline — models, styling, reel & brand choices are saved to this device.</div>' +
    '<label class="fld" style="color:#9aa2b2;font-size:11px">Project name</label>' +
    '<input id="soNameInput" type="text" placeholder="Studio of Sidecars project">' +
    '<div class="so-actions"><button class="hub-btn" id="soCancel">Cancel</button>' +
    '<button class="hub-btn primary" id="soSave">Save project</button></div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('pointerdown', (e) => { if (e.target === ov) closeSave(); });
  ov.querySelector('#soCancel').addEventListener('click', closeSave);
  ov.querySelector('#soSave').addEventListener('click', doSave);
  const inp = ov.querySelector('#soNameInput');
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSave(); } });
}

/* ======================================================== splash & last project */
function dismissSplash() {
  const sp = $('#sosSplash');
  if (!sp) return;
  sp.classList.add('out');
  setTimeout(() => { if (sp && sp.parentNode) sp.parentNode.removeChild(sp); }, 650);
}
function maybeReopenLastProject() {
  const list = (hub && hub.projects) ? hub.projects() : [];
  if (!list.length) { dismissSplash(); return; }
  /* If the hub is holding an interrupted-session snapshot it shows its own
     recovery banner — let that flow take over instead of auto-reopening. */
  if (hub && hub.hasBackup && hub.hasBackup()) { dismissSplash(); return; }
  const cur = list[0];
  if (!cur || !cur.id) { dismissSplash(); return; }
  const st = $('#sosSplashState');
  if (st) st.textContent = 'Opening "' + (cur.name || 'last project') + '"…';
  const task = hub.openProject(cur.id);
  const fin = () => { dismissSplash(); refreshProjectPill(); refreshUndoRedo(); };
  if (task && task.then) task.then(fin).catch(fin);
  else setTimeout(fin, 400);
}

/* ============================================================ init */
export function initShell(engine, hubRef, opts = {}) {
  S = engine; hub = hubRef || null;
  if (!S || !document.getElementById('cv')) return null;
  let started = false;

  const boot = function () {
    if (started) return;
    started = true;
    try {
      /* static #topStrip already wraps #topbar in index.html */
      let strip = $('#topStrip');
      if (!strip) {
        const tb = $('#topbar');
        if (tb) {
          strip = document.createElement('div');
          strip.id = 'topStrip';
          tb.parentNode.insertBefore(strip, tb);
          strip.appendChild(tb);
        }
      }
      buildBrand();
      buildProjectPill();
      buildActions();
      buildNav();
      buildDock();
      buildFloat();
      buildSettings();
      buildSave();
      buildInspector();
      renderInspector();

      const perf = document.createElement('div');
      perf.id = 'devPerf';
      document.body.appendChild(perf);

      /* wiring — chrome reacts to the same version/project events the engine already emits */
      if (hub) hub.onChange(() => { refreshProjectPill(); refreshUndoRedo(); });
      onVersionChange(() => {
        refreshNav(); refreshDock(); renderInspector(); refreshFloat(true); refreshUndoRedo();
      });
      if (S.onProductsChange) S.onProductsChange(() => { selectionChanged(); refreshFloat(true); });
      try {
        const sel = $('#partSel');
        if (sel) sel.addEventListener('change', () => setTimeout(selectionChanged, 40));
      } catch (e) {}
      setInterval(() => {
        try { selectionChanged(); refreshRecBtn(); } catch (e) {}
      }, 500);

      applyTheme(lsGet(THEME_KEY) === true || lsGet(THEME_KEY) === 'light');
      applyDev(lsGet(DEV_KEY) === true);
      refreshNav(); refreshDock(); refreshUndoRedo(); refreshFloat(true); refreshRecBtn();

      /* splash & auto-reopen of the last project */
      const b = opts.boot || {};
      if (!b.noReopen) {
        const list = (hub && hub.projects) ? hub.projects() : [];
        const doReopen = list.length > 0;
        const delay = doReopen ? 240 : 950;
        setTimeout(() => {
          try { if (doReopen) maybeReopenLastProject(); else dismissSplash(); }
          catch (e) { console.warn('shell reopen', e); try { dismissSplash(); } catch (e2) {} }
        }, delay);
      } else dismissSplash();

      const api = {
        refreshNav, refreshDock, renderInspector, refreshFloat, refreshProjectPill,
        openSettings, dismissSplash,
      };
      try {
        window.__shell = api;
        if (S) S.shell = api;
        if (window.__studio) window.__studio.shell = api;
      } catch (e) {}
      return api;
    } catch (e) {
      console.error('shell init error', e);
      try { dismissSplash(); } catch (e2) {}
    }
    return null;
  };

  /* The static shell host may still sit below the parser cursor when this
     module first executes — poll briefly, then boot regardless. */
  let tries = 0;
  (function waitDom() {
    if (document.getElementById('topStrip')) { boot(); return; }
    if (++tries < 400) setTimeout(waitDom, 25);
    else boot();
  })();
  return null; /* api published inside boot() when ready */
}
