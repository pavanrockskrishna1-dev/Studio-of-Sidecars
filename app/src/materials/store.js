/* Mission 11A (Agent #2) — the Materials Manager's state hub.
   ---------------------------------------------------------------------------
   One plain module singleton, because the editor lives in the Creator UI Shell
   while the materials themselves live in the R3F scene — and the shell is a
   sibling of the engine by design (main.jsx mounts them side by side, and
   App.jsx is never given a prop it does not already own). A store is the only
   way to connect them without editing the engine: the sidebar writes intent
   here, this module writes three.js state through ./apply, and the renderer
   picks the change up on its very next frame.

   Responsibilities, in order of what the mission asks for:
     · inventory   — the materials of whatever is staged, one entry per material;
     · live edit   — every slider writes through immediately (no Apply button);
     · undo/reset  — per material and per model, restoring the imported state;
     · presets     — built-ins, custom save/rename/duplicate/delete, favorites;
     · persistence — custom presets, favorites and last-used values per model,
                     via ./matDb (10E's IndexedDB architecture).

   Nothing here touches selection, camera, environment or the import pipeline:
   the engine stays the single authority over what is on stage. */

import { materialGroups, readMaterial, applyParams, restoreEntry, isEdited, persistable } from "./apply";
import { PRESET_BY_ID } from "./presets";
import { matRead, matWrite, matRemove } from "./matDb";

const KEY_CUSTOM = "materials:custom";
// Favourites are a tiny id set that must be right on the first paint, so they
// follow Mission 10E's OTHER local convention — AssetLibrary's `sos-asset-favs`
// localStorage key — instead of an async record. Same pattern, own namespace.
const FAV_KEY = "sos-material-favs";
const KEY_OVERRIDES = (modelKey) => `materials:overrides:${modelKey}`;

let state = {
  status: "empty", // empty | ready
  modelKey: null,
  productName: "",
  root: null,
  entries: [],
  focusedId: null,
  values: {}, // entryId -> live parameter view
  edited: {}, // entryId -> boolean
  history: {}, // entryId -> [paramSnapshot] (undo, session only)
  custom: [],
  favorites: [], // read synchronously below so the stars are never wrong
  lastPresetId: null,
  hydrated: false,
  storage: "pending", // pending | on | off (degrades, never blocks)
  // which modelPath the loader cache has actually resolved for the editor;
  // held here (not in component state) so the section's "reading…" status is
  // part of the same snapshot the UI already subscribes to, and no effect has
  // to write React state synchronously
  stagedReady: null,
};
state.favorites = readFavs(); // hoisted: the stars are right before the first paint

const listeners = new Set();
let saveTimer = 0;

function emit() {
  // a fresh outer object on every change: useSyncExternalStore compares identity
  state = { ...state };
  for (const fn of listeners) fn();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSnapshot = () => state;

const nameKey = (entry, i) => (entry.name ? `n:${entry.name}` : `i:${i}`);
function refresh(entry) {
  if (!entry) return;
  state.values = { ...state.values, [entry.id]: readMaterial(entry.currentMaterial) };
  state.edited = { ...state.edited, [entry.id]: isEdited(entry) };
}

function refreshAll() {
  state.values = {};
  state.edited = {};
  for (const e of state.entries) refresh(e);
}

/* ── attach / detach ────────────────────────────────────────────────────── */

export function attach(root, { modelKey, productName = "" } = {}) {
  if (!root) return;
  const changedModel = state.modelKey !== modelKey;
  state.root = root;
  state.modelKey = modelKey;
  state.productName = productName;
  const groups = materialGroups(root);
  groups.forEach((g, i) => {
    g.persistKey = nameKey(g, i);
  });
  state.entries = groups;
  if (changedModel || !state.focusedId) {
    state.focusedId = groups.length ? groups[0].id : null;
    state.history = {};
  } else if (!groups.some((g) => g.id === state.focusedId)) {
    state.focusedId = groups.length ? groups[0].id : null;
    state.history = {};
  }
  state.status = "ready";
  refreshAll();
  emit();
  applyPersisted();
}

export function setStagedReady(modelPath) {
  if (state.stagedReady === modelPath) return;
  state.stagedReady = modelPath;
  emit();
}

export function detach() {
  state.root = null;
  state.entries = [];
  state.status = "empty";
  state.focusedId = null;
  state.values = {};
  state.edited = {};
  emit();
}

/* ── persistence ───────────────────────────────────────────────────────── */

let customPromise = null;

function readFavs() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeFavs(list) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Read custom presets + favourites once, then the overrides for this model. */
export function hydrate() {
  if (!customPromise) {
    customPromise = (async () => {
      state.favorites = readFavs();
      const custom = await matRead(KEY_CUSTOM, []);
      state.custom = Array.isArray(custom) ? custom : [];
      state.hydrated = true;
      state.storage = "on";
      emit();
      applyPersisted();
    })().catch(() => {
      state.hydrated = true;
      state.storage = "off";
      emit();
      return null;
    });
  }
  return customPromise;
}

async function applyPersisted() {
  if (!state.hydrated || !state.modelKey || !state.entries.length) return;
  const stored = await matRead(KEY_OVERRIDES(state.modelKey), null);
  if (!stored || !stored.byEntry) return;
  let applied = 0;
  state.entries.forEach((entry, i) => {
    const params = stored.byEntry[nameKey(entry, i)];
    if (!params) return;
    applyParams(entry, state.root, params);
    refresh(entry);
    applied += 1;
  });
  if (applied) {
    state.lastPresetId = stored.lastPresetId || state.lastPresetId;
    emit();
  }
}

function scheduleSave() {
  if (!state.modelKey) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}

async function saveNow() {
  if (!state.hydrated || !state.modelKey || !state.root) return;
  const byEntry = {};
  state.entries.forEach((entry, i) => {
    if (!isEdited(entry)) return;
    byEntry[nameKey(entry, i)] = persistable(entry);
  });
  const key = KEY_OVERRIDES(state.modelKey);
  if (!Object.keys(byEntry).length) {
    await matRemove(key);
    return;
  }
  await matWrite(key, { byEntry, lastPresetId: state.lastPresetId, savedAt: Date.now() });
}

/* ── editing ─────────────────────────────────────────────────────────────── */

export function focus(id) {
  if (state.focusedId === id) return;
  state.focusedId = id;
  emit();
}

const entryFor = (id) => state.entries.find((e) => e.id === (id || state.focusedId));

/** A preset is authored compactly (`env`, `tex`, plus UI-only fields). This is
 *  the single place that turns that into three.js parameter names, so both the
 *  apply path and the "already applied" check agree on what a preset means. */
const UI_ONLY = ["id", "name", "category", "swatch", "need", "custom", "createdAt"];
export function presetParams(preset) {
  if (!preset) return {};
  const out = {};
  for (const [k, v] of Object.entries(preset)) {
    if (UI_ONLY.includes(k)) continue;
    if (k === "env") out.envMapIntensity = v;
    else if (k === "tex") out.texture = v;
    else out[k] = v;
  }
  return out;
}

function pushHistory(entry) {
  if (!entry) return;
  const prev = readMaterial(entry.currentMaterial);
  const list = state.history[entry.id] || [];
  state.history = { ...state.history, [entry.id]: [...list.slice(-24), prev] };
}

/** The one write path: sliders, presets and restored overrides all land here. */
export function setParams(patch, { record = true, presetId = null } = {}) {
  const entry = entryFor();
  if (!entry) return false;
  if (record) pushHistory(entry);
  applyParams(entry, state.root, patch);
  refresh(entry);
  if (presetId !== null) state.lastPresetId = presetId;
  emit();
  scheduleSave();
  return true;
}

export function undo() {
  const entry = entryFor();
  if (!entry) return false;
  const list = state.history[entry.id] || [];
  if (!list.length) return false;
  const prev = list[list.length - 1];
  state.history = { ...state.history, [entry.id]: list.slice(0, -1) };
  applyParams(entry, state.root, prev);
  refresh(entry);
  emit();
  scheduleSave();
  return true;
}

export const canUndo = () => Boolean((state.history[state.focusedId] || []).length);

export function resetMaterial(id) {
  const entry = entryFor(id);
  if (!entry) return false;
  restoreEntry(entry, state.root);
  state.history = { ...state.history, [entry.id]: [] };
  refresh(entry);
  emit();
  scheduleSave();
  return true;
}

export function resetModel() {
  if (!state.entries.length) return false;
  for (const entry of state.entries) restoreEntry(entry, state.root);
  state.history = {};
  state.lastPresetId = null;
  refreshAll();
  emit();
  scheduleSave();
  return true;
}

export function applyPreset(presetId) {
  const preset = PRESET_BY_ID[presetId] || state.custom.find((p) => p.id === presetId);
  if (!preset) return false;
  let entry = entryFor();
  if (!entry && state.entries.length) {
    state.focusedId = state.entries[0].id;
    entry = state.entries[0];
  }
  if (!entry) return false;
  setParams(presetParams(preset), { presetId });
  return true;
}

/* ── favourites + custom presets ────────────────────────────────────────── */

export function toggleFavorite(presetId) {
  const has = state.favorites.includes(presetId);
  state.favorites = has ? state.favorites.filter((x) => x !== presetId) : [...state.favorites, presetId];
  emit();
  writeFavs(state.favorites);
  return !has;
}

export const isFavorite = (presetId) => state.favorites.includes(presetId);

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "preset";

export function saveCustom(name) {
  const entry = entryFor();
  if (!entry) return null;
  const label = (name || "").trim() || `${state.productName || "Model"} · ${entry.name}`;
  const preset = {
    id: `custom-${slug(label)}-${Date.now().toString(36)}`,
    name: label,
    category: "custom",
    custom: true,
    createdAt: Date.now(),
    ...persistable(entry),
  };
  state.custom = [...state.custom, preset];
  emit();
  matWrite(KEY_CUSTOM, state.custom);
  return preset;
}

export function renameCustom(id, name) {
  const label = (name || "").trim();
  if (!label) return false;
  state.custom = state.custom.map((p) => (p.id === id ? { ...p, name: label } : p));
  emit();
  matWrite(KEY_CUSTOM, state.custom);
  return true;
}

export function duplicateCustom(id) {
  const src = state.custom.find((p) => p.id === id);
  if (!src) return null;
  const copy = { ...src, id: `custom-${slug(src.name)}-copy-${Date.now().toString(36)}`, name: `${src.name} copy`, createdAt: Date.now() };
  state.custom = [...state.custom, copy];
  emit();
  matWrite(KEY_CUSTOM, state.custom);
  return copy;
}

export function deleteCustom(id) {
  state.custom = state.custom.filter((p) => p.id !== id);
  state.favorites = state.favorites.filter((x) => x !== id);
  emit();
  matWrite(KEY_CUSTOM, state.custom);
  writeFavs(state.favorites);
  return true;
}

/* ── read-only helpers for the UI ────────────────────────────────────────── */

export { nameKey as entryKey };
export const focusedEntry = () => entryFor(state.focusedId);
export const focusedValues = () => state.values[state.focusedId] || {};
export const focusedEdited = () => Boolean(state.edited[state.focusedId]);

/** Which of the focused material's current values match a preset exactly. */
export function matchesPreset(presetId) {
  const v = focusedValues();
  const p = PRESET_BY_ID[presetId] || state.custom.find((x) => x.id === presetId);
  if (!p || !v.color) return false;
  const want = presetParams(p);
  const near = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 0.02;
  if (!want.color || v.color.toLowerCase() !== String(want.color).toLowerCase()) return false;
  if (want.metalness !== undefined && !near(v.metalness, want.metalness)) return false;
  if (want.roughness !== undefined && !near(v.roughness, want.roughness)) return false;
  if (want.texture !== undefined && (v.texture || null) !== (want.texture || null)) return false;
  return true;
}

export const editingCount = () => Object.values(state.edited).filter(Boolean).length;
export const hasMaterials = () => state.status === "ready" && state.entries.length > 0;

/* ── Studio Session bridge (Phase 15A) ──────────────────────────────────────
   Save/Reset for the whole studio reach the materials through these two
   functions instead of a second copy of the edits: the snapshot is read from
   the live materials and restoring writes back through the same apply path
   the editor uses. */

/** The current model's edited materials as plain data, or null when no model's
 *  materials are loaded (the Materials panel has not attached one). */
export function snapshotOverrides() {
  if (state.status !== "ready" || !state.modelKey) return null;
  const byEntry = {};
  state.entries.forEach((entry, i) => {
    if (!isEdited(entry)) return;
    byEntry[nameKey(entry, i)] = persistable(entry);
  });
  return { modelKey: state.modelKey, byEntry, lastPresetId: state.lastPresetId };
}

/** Put a snapshot back: materials named in it get its values, every other
 *  material returns to its imported look. Resolves false when the snapshot is
 *  for a model that is not the attached one. */
export async function restoreOverrides(snap) {
  if (!snap || !snap.byEntry) return false;
  // attach() applies the model's persisted overrides asynchronously; this read
  // queues behind that one so the session's values are applied last.
  await matRead(KEY_OVERRIDES(snap.modelKey), null);
  if (state.status !== "ready" || state.modelKey !== snap.modelKey) return false;
  state.entries.forEach((entry, i) => {
    const params = snap.byEntry[nameKey(entry, i)];
    if (params) applyParams(entry, state.root, params);
    else restoreEntry(entry, state.root);
  });
  state.history = {};
  state.lastPresetId = snap.lastPresetId || null;
  refreshAll();
  emit();
  scheduleSave();
  return true;
}
