import { listVersions, getActiveVersion, remountActive, persistNow } from '../versions/registry.js';
import { loadKits, saveKits, activeId, setActive } from './brand.js';
import { toast } from './ui.js';

/* =========================================================================
 *  CREATOR HUB CORE (V6) — project manager, unlimited undo/redo, presets
 *  and auto-backup. Pure logic + localStorage; the V6 panel is the skin.
 *  One full "snapshot" = engine scene state + brand kits + creator reels.
 * ========================================================================= */

const K = {
  meta: 'glbHub.projects.meta.v1',
  project: (id) => 'glbHub.project.' + id,
  autobackup: 'glbHub.autobackup.v1',
  presets: 'glbHub.presets.v1',
};
const deep = (x) => JSON.parse(JSON.stringify(x));

function lsGet(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
function lsDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  /* ------------------------------------------------ full scene snapshot */
export function fullSnapshot(S) {
  const applied = (S.brand && S.brand.kit) ? S.brand.kit() : null;
  const core = S.snapCore();
  const reels = listVersions()
    .filter((v) => v.tpl === 'creator' || v.tpl === 'brandstudio')
    .map((v) => ({ id: v.id, shots: ((v.memory && v.memory.shots) || []).slice() }));
  return {
    app: 'v1', savedAt: Date.now(),
    core,
    brand: { kits: deep(loadKits()), active: activeId(), applied: applied ? deep(applied) : null },
    reels,
  };
}

export async function restoreSnapshot(S, snap, opts = {}) {
  if (!snap || !snap.core || !Array.isArray(snap.core.models)) return false;
  S.setHistoryMute(true);
  try {
    if (S.stopCamControl) { try { S.stopCamControl(); } catch (e) {} }
    await S.applyCore(snap.core);
    const br = snap.brand;
    if (br) {
      try {
        if (Array.isArray(br.kits) && br.kits.length) saveKits(deep(br.kits));
        if (br.active) setActive(br.active); else setActive(null);
        if (br.applied) { if (S.brand.apply) S.brand.apply(br.applied, { silent: true }); }
        else if (S.brand.refresh) S.brand.refresh();
      } catch (e) { console.warn(e); }
    }
    (snap.reels || []).forEach((r) => {
      const v = listVersions().find((x) => x.id === r.id);
      if (v && v.memory) v.memory.shots = (r.shots || []).slice();
    });
    try { persistNow(); } catch (e) {}
    const av = getActiveVersion();
    if (av && (av.tpl === 'creator' || av.tpl === 'assetlib' || av.tpl === 'brandstudio')) remountActive(S);
    S.refreshAllUI();
    return true;
  } finally {
    S.setHistoryMute(false);
    if (!opts.noToast) toast('↩️ Restored');
  }
}

/* ====================================================================== */
export function createHub(S, cfg = {}) {
  const autoMs = cfg.autosaveMs != null ? cfg.autosaveMs : 180000;
  const hub = {
    busy: false, busyText: '',
    _timer: null, _interval: null, _lastAuto: 0,
  };

  /* ------------------------- b64 pool (undo keeps refs, not copies) */
  const pool = [];
  const poolMap = {};
  function intern(snap) {
    snap.core.models.forEach((md) => {
      if (md.src && md.src.k === 'user' && md.src.b64) {
        const s = md.src.b64;
        if (!(s in poolMap)) { poolMap[s] = pool.length; pool.push(s); }
        md.src._pool = poolMap[s]; md.src.b64 = undefined;
      }
    });
    return snap;
  }
  function extern(snap) {
    snap.core.models.forEach((md) => {
      if (md.src && md.src.k === 'user' && md.src._pool !== undefined) { md.src.b64 = pool[md.src._pool] || ''; delete md.src._pool; }
    });
    return snap;
  }
  function rawSnapshot() { const s = fullSnapshot(S); extern(s); return s; }

  /* ------------------------------- unlimited undo / redo (capped 200) */
  const cap = 200;
  let states = [intern(rawSnapshot())];
  let redoStack = [];
  let dirty = false;
  let recTimer = null;
  const listeners = [];
  function emitUI() { listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }

  function sig(snap) {
    const md = snap.core.models.map((m) => [
      m.name, m.src && m.src.k, m.src && (m.src.name || m.src.key),
      m.x, m.y, m.z, m.ry, m.s, m.visible,
      (m.parts || []).map((p) => [p.p, p.e, p.s, p.vis, p.fin, p.col]),
    ]);
    const st = snap.core.stage;
    return JSON.stringify({
      md,
      light: st && st.light, fmt: st && st.format, grid: st && st.grid, gloss: st && st.floorGloss,
      shadow: st && st.shadows, bg: st && st.bg,
      br: snap.brand && { active: snap.brand.active, applied: snap.brand.applied && snap.brand.applied.id },
      reels: (snap.reels || []).map((r) => [r.id, (r.shots || []).join(',')]),
    });
  }
  function pushSnapshot() {
    const snap = intern(rawSnapshot());
    if (states.length && sig(snap) === sig(states[states.length - 1])) return; // no real change
    states.push(snap);
    if (states.length > cap) states.shift();
    redoStack = [];
    emitUI();
  }
  /* engine edit notifications arrive in bursts (slider drags, typing) — we
     coalesce them and record one snapshot shortly after the last change, and
     always flush any pending edit before an undo/redo is executed. */
  function onEditNotify() {
    dirty = true;
    if (recTimer) return;
    recTimer = setTimeout(() => { recTimer = null; if (dirty) { dirty = false; pushSnapshot(); } }, 180);
  }
  function record() { if (recTimer) { clearTimeout(recTimer); recTimer = null; } dirty = false; pushSnapshot(); }
  function rebase() {
    states = [intern(rawSnapshot())];
    redoStack = [];
    dirty = false;
    emitUI();
  }
  async function undo() {
    if (hub.busy) return false;
    record(); // capture any in-flight edit first
    if (states.length < 2) return false;
    const last = states.pop();
    redoStack.push(last);
    if (redoStack.length > cap) redoStack.shift();
    const target = extern(deep(states[states.length - 1]));
    hub.busy = true; hub.busyText = 'Undoing…';
    try { await restoreSnapshot(S, target, { noToast: true }); toast('↩️ Undo'); } finally { hub.busy = false; hub.busyText = ''; }
    emitUI();
    return true;
  }
  async function redo() {
    if (hub.busy) return false;
    record();
    if (!redoStack.length) return false;
    const fwd = redoStack.pop();
    states.push(intern(rawSnapshot()));
    if (states.length > cap) states.shift();
    const target = extern(deep(fwd));
    states.push(fwd);
    if (states.length > cap) states.shift();
    hub.busy = true; hub.busyText = 'Redoing…';
    try { await restoreSnapshot(S, target, { noToast: true }); toast('↪️ Redo'); } finally { hub.busy = false; hub.busyText = ''; }
    emitUI();
    return true;
  }
  const canUndo = () => states.length > 1 && !hub.busy;
  const canRedo = () => redoStack.length > 0 && !hub.busy;
  hub.onChange = (fn) => { listeners.push(fn); };
  hub.record = record; hub.undo = undo; hub.redo = redo;
  hub.canUndo = canUndo; hub.canRedo = canRedo;
  hub.cap = cap;
  hub.onEditNotify = onEditNotify;
  hub.snapProbe = () => S.state.models.length;
  hub.resetHistory = rebase;
  hub.debug = () => ({ len: states.length, counts: states.map((s) => (s.core.models || []).length), redo: redoStack.length, pool: pool.length });

  /* --------------------------------------------- auto-backup */
  async function autosaveNow() {
    if (hub.busy) return false;
    const snap = rawSnapshot();
    const ok = lsSet(K.autobackup, { at: Date.now(), snap });
    hub._lastAuto = Date.now();
    emitUI();
    return ok;
  }
  function hasBackup() { const d = lsGet(K.autobackup); return !!(d && d.snap); }
  function backupAt() { const d = lsGet(K.autobackup); return d ? (d.at || 0) : 0; }
  async function restoreBackup() {
    const d = lsGet(K.autobackup);
    if (!d || !d.snap) return false;
    lsDel(K.autobackup);
    hub.busy = true; hub.busyText = 'Restoring auto-backup…';
    try { await restoreSnapshot(S, d.snap, { noToast: true }); toast('♻️ Restored the latest auto-backup'); rebase(); } finally { hub.busy = false; hub.busyText = ''; }
    emitUI();
    return true;
  }
  function clearBackup() { lsDel(K.autobackup); emitUI(); }
  function startAuto(ms) {
    stopAuto();
    hub._interval = setInterval(() => { autosaveNow(); }, ms || autoMs);
  }
  function stopAuto() { if (hub._interval) clearInterval(hub._interval); hub._interval = null; }
  hub.autosaveNow = autosaveNow; hub.hasBackup = hasBackup; hub.backupAt = backupAt;
  hub.restoreBackup = restoreBackup; hub.clearBackup = clearBackup;
  hub.startAuto = startAuto; hub.stopAuto = stopAuto;
  hub.lastAuto = () => hub._lastAuto;

  /* --------------------------------------------- projects */
  function projMeta() { return lsGet(K.meta) || []; }
  function saveMeta(m) { lsSet(K.meta, m); }
  function projTitle(seed) {
    const names = projMeta().map((p) => p.name);
    let n = 0; let base = (seed && seed.trim()) || 'My Project';
    let cand = base; while (names.includes(cand)) { n++; cand = base + ' ' + n; }
    return cand;
  }
  async function makeThumb() {
    try {
      const blob = await S.renderBlob('9:16', { scale: 0.12, stamp: false });
      if (!blob) return null;
      const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(blob); });
      return dataUrl || null;
    } catch (e) { return null; }
  }
  async function saveProject(name) {
    const title = projTitle(name);
    const thumb = await makeThumb();
    const meta = projMeta();
    const id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    const item = { id, name: title, at: Date.now(), snap: rawSnapshot(), thumb };
    const ok = lsSet(K.project(id), item);
    if (!ok) {
      toast('⚠️ Project is too big for this browser’s storage. Use "Export project file" to save it offline.', true);
      return null;
    }
    meta.unshift({ id, name: title, at: Date.now(), thumb: thumb || null });
    if (meta.length > 24) { const gone = meta.splice(24); gone.forEach((g) => lsDel(K.project(g.id))); }
    saveMeta(meta);
    emitUI();
    toast('💾 Project saved: ' + title);
    return item;
  }
  function projects() { return projMeta(); }
  async function openProject(id) {
    const it = lsGet(K.project(id));
    if (!it || !it.snap) { toast('Project not found.', true); return false; }
    hub.busy = true; hub.busyText = 'Opening project…';
    try {
      await restoreSnapshot(S, it.snap, { noToast: true });
      const meta = projMeta().map((p) => ({ ...p, at: Date.now() }));
      saveMeta(meta);
      toast('📂 Opened project: ' + it.name);
      rebase();
    } finally { hub.busy = false; hub.busyText = ''; }
    emitUI();
    return true;
  }
  function renameProject(id, name) {
    const it = lsGet(K.project(id)); if (!it || !name || !name.trim()) return false;
    it.name = name.trim(); lsSet(K.project(id), it);
    saveMeta(projMeta().map((p) => (p.id === id ? { ...p, name: it.name } : p)));
    emitUI(); return true;
  }
  async function duplicateProject(id) {
    const it = lsGet(K.project(id)); if (!it) return false;
    const cp = deep(it);
    cp.id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    cp.name = projTitle(it.name + ' copy');
    cp.at = Date.now();
    if (cp.snap) cp.snap.savedAt = Date.now();
    if (!lsSet(K.project(cp.id), cp)) { toast('Duplicate too large for storage.', true); return false; }
    const meta = projMeta(); meta.unshift({ id: cp.id, name: cp.name, at: Date.now(), thumb: it.thumb || null });
    saveMeta(meta); emitUI(); toast('⧉ Duplicated project "' + cp.name + '"'); return true;
  }
  function deleteProject(id) {
    const meta = projMeta().filter((p) => p.id !== id);
    saveMeta(meta); lsDel(K.project(id)); emitUI(); toast('🗑 Project deleted'); return true;
  }
  function exportProjectFile(id) {
    const it = lsGet(K.project(id)); if (!it) return;
    const blob = new Blob([JSON.stringify(it)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (it.name || 'project').replace(/[^\w\- ]+/g, '') + '.glbproj.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('📤 Project file exported');
  }
  function importProjectFile(file) {
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const it = JSON.parse(String(rd.result));
        if (!it.snap || !Array.isArray(it.snap.core.models)) throw new Error('bad file');
        it.id = it.id || ('p' + Date.now().toString(36));
        if (lsGet(K.project(it.id))) it.id = 'p' + Date.now().toString(36) + 'i';
        it.at = Date.now();
        if (!it.name) it.name = 'Imported Project';
        if (!lsSet(K.project(it.id), it)) { toast('Imported project is too large for this browser storage.', true); return; }
        const meta = projMeta(); meta.unshift({ id: it.id, name: it.name, at: Date.now(), thumb: it.thumb || null });
        saveMeta(meta); emitUI(); toast('📂 Imported project "' + it.name + '"');
        await openProject(it.id);      } catch (e) { toast('Could not import that file.', true); }
    };
    rd.readAsText(file);
  }
  hub.saveProject = saveProject; hub.projects = projects; hub.openProject = openProject;
  hub.renameProject = renameProject; hub.duplicateProject = duplicateProject; hub.deleteProject = deleteProject;
  hub.exportProjectFile = exportProjectFile; hub.importProjectFile = importProjectFile;

  /* --------------------------------------------- preset library */
  function presets() { return lsGet(K.presets) || { camera: [], lighting: [], scene: [] }; }
  function savePresets(p) { lsSet(K.presets, p); emitUI(); }
  function addPreset(kind, name, payload) {
    const p = presets();
    const list = p[kind] || (p[kind] = []);
    const id = 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    list.unshift({ id, name: name || ('Preset ' + (list.length + 1)), at: Date.now(), payload });
    if (list.length > 20) list.length = 20;
    savePresets(p); toast('💾 ' + name + ' preset saved'); return true;
  }
  function deletePreset(kind, id) {
    const p = presets();
    p[kind] = (p[kind] || []).filter((x) => x.id !== id);
    savePresets(p); return true;
  }
  function applyCameraPreset(payload) {
    if (payload && Array.isArray(payload.p) && Array.isArray(payload.t)) { S.setCamView(payload); toast('🎥 Camera preset applied'); return true; }
    if (payload && payload.shot) { S.setFrame(payload.shot); toast('🎥 ' + (payload.shot) + ' view applied'); return true; }
    return false;
  }
  function applyLightingPreset(payload) {
    if (!payload || !payload.light) return false;
    try { S.setLightingPreset(payload.light, true); } catch (e) {}
    if (payload.bg && /^#/.test(payload.bg)) { try { S.setBackdropColor(payload.bg); } catch (e) {} }
    if (payload.water) { S.brand.watermarkOn(true); }
    toast('💡 Lighting preset applied'); return true;
  }
  async function applyScenePreset(payload) {
    if (!payload || !payload.core) return false;
    hub.busy = true; hub.busyText = 'Applying scene preset…';
    S.setHistoryMute(true);
    try { await S.applyCore(payload.core); S.refreshAllUI(); rebase(); } finally { S.setHistoryMute(false); hub.busy = false; hub.busyText = ''; }
    emitUI(); toast('🏠 Scene preset applied'); return true;
  }
  hub.presets = presets; hub.addPreset = addPreset; hub.deletePreset = deletePreset;
  hub.applyCameraPreset = applyCameraPreset; hub.applyLightingPreset = applyLightingPreset;
  hub.applyScenePreset = applyScenePreset;
  hub.saveLighting = (name) => {
    const bg = S.scene.background;
    const bgStr = (bg && bg.isTexture) ? 'tex' : ('#' + (bg ? bg.getHexString() : '14161c'));
    const payload = { light: S.lightName(), bg: bgStr };
    addPreset('lighting', name, payload);
  };
  hub.saveCamera = (name) => {
    const v = getActiveVersion();
    const payload = { p: S.camera.position.toArray(), t: S.controls.target.toArray() };
    if (v && v.heroPreset) payload.shot = v.heroPreset;
    addPreset('camera', name, payload);
  };
  hub.saveScene = (name) => { const core = S.snapCore(); addPreset('scene', name, { core }); };

  return hub;
}
