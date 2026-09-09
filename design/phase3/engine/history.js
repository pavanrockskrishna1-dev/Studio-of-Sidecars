/* ENGINE · history.js — Phase 3. Undo/redo, autosave, saved versions (localStorage). */
import { LIMITS } from './config.js';

export function init(engine) {
  engine.hist = { stack: [], index: -1, cap: LIMITS.hist, label: 'edit' };
  engine.saveVersion = saveVersion;
  engine.listVersions = listVersions;
  engine.loadVersion = loadVersion;
  engine.deleteVersion = deleteVersion;
  if (engine.bus) {
    // modules announce state-changing intent; UI also calls push() explicitly
    const no = () => engine._noHistory;
    engine.bus.on('transform-end', () => { if (!no()) push(engine, 'transform'); });
    engine.bus.on('material-change', () => { if (!no()) push(engine, 'material'); });
    engine.bus.on('floor', () => { if (!no()) push(engine, 'floor'); });
    engine.bus.on('env', () => { if (!no()) push(engine, 'environment'); });
    engine.bus.on('light', () => { if (!no()) push(engine, 'lighting'); });
  }
  startAutosave(engine);
  return { push, undo, redo, canUndo, canRedo, startAutosave };
}

function snapshot(engine) {
  return engine.snapshotState ? engine.snapshotState() : null;
}
export function push(engine, label) {
  const s = snapshot(engine);
  if (!s) return;
  const h = engine.hist;
  // skip an entry that would duplicate the current head (module + UI often both announce)
  const prev = h.stack[h.index];
  if (prev && JSON.stringify(prev.state) === JSON.stringify(s)) return;
  // drop future if we're mid-history
  h.stack = h.stack.slice(0, h.index + 1);
  h.stack.push({ label: label || 'edit', at: Date.now(), state: s });
  if (h.stack.length > h.cap) h.stack.shift();
  h.index = h.stack.length - 1;
  persist(engine);
}
/* Serialized async restores: rapid undo/redo (keyboard) must not interleave
   two applyState reloads, or models can end up in a mixed state. */
let hq = null;
function enqueueApply(engine, idx) {
  const h = engine.hist;
  const st = h.stack[idx];
  if (!st) return Promise.resolve();
  const run = (hq = hq || Promise.resolve()).then(async () => {
    try {
      if (engine.applyState) await engine.applyState(st.state);
      engine.bus && engine.bus.emit('restored', st.label);
    } catch (err) { console.warn('restore', err); }
  });
  hq = run.catch(() => {});
  return run;
}
export function undo(engine) {
  const h = engine.hist;
  if (h.index <= 0) return;
  const idx = --h.index;
  return enqueueApply(engine, idx);
}
export function redo(engine) {
  const h = engine.hist;
  if (h.index >= h.stack.length - 1) return;
  const idx = ++h.index;
  return enqueueApply(engine, idx);
}
export const canUndo = engine => engine.hist.index > 0;
export const canRedo = engine => engine.hist.index < engine.hist.stack.length - 1;

export function clearHistory(engine) { engine.hist.stack = []; engine.hist.index = -1; persist(engine); }

function persist(engine) {
  try { localStorage.setItem(LIMITS.ls + 'history', JSON.stringify(engine.hist)); } catch (e) { /* full */ }
}
function restoreFromLS(engine) {
  try {
    const raw = localStorage.getItem(LIMITS.ls + 'history');
    if (raw) { const h = JSON.parse(raw); if (h && Array.isArray(h.stack)) { engine.hist = h; } }
  } catch (e) { /* noop */ }
}

export function startAutosave(engine) {
  clearInterval(engine._as);
  engine._as = setInterval(() => {
    try { localStorage.setItem(LIMITS.ls + 'autosave', JSON.stringify(snapshot(engine))); } catch (e) {}
  }, LIMITS.autosaveMs);
}
export function loadAutosave(engine) {
  try {
    const raw = localStorage.getItem(LIMITS.ls + 'autosave');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function store() {
  try { return JSON.parse(localStorage.getItem(LIMITS.ls + 'versions') || '[]'); } catch (e) { return []; }
}
function saveStore(list) { try { localStorage.setItem(LIMITS.ls + 'versions', JSON.stringify(list)); } catch (e) {} }

export function saveVersion(engine, name) {
  const list = store();
  const v = { id: Date.now(), name: name || ('Session ' + (list.length + 1)), at: Date.now(), state: snapshot(engine) };
  list.unshift(v);
  saveStore(list.slice(0, 40));
  return v;
}
export function listVersions() { return store(); }
export function loadVersion(engine, id) {
  const v = store().find(x => x.id === id);
  if (v && v.state) engine.applyState && engine.applyState(v.state);
  return v;
}
export function deleteVersion(id) {
  saveStore(store().filter(x => x.id !== id));
}
