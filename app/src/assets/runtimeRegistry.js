/* Mission 10E (Asset Import Manager) — additive runtime registry layer.
   --------------------------------------------------------------------------
   The built-in registries (products/registry.js, environments/registry.js)
   stay READ ONLY: this module never edits their source data. It keeps
   imported assets in IndexedDB and mirrors them into the SAME exported
   array instances at runtime (push/splice), so every existing consumer —
   StudioControls chips, useGLTF paths, the environment TextureLoader, the
   Agent #2 shell bridge — sees imported assets exactly like built-ins,
   with zero manual registry editing and zero engine-file changes.

   Imported product entries carry `source: "imported"` plus a blob: modelPath
   (the stored GLB) and a blob: thumbnail; imported environment entries carry
   a blob: file holding a tone-mapped equirect JPEG rendered from the HDRI at
   import time, which the engine's existing TextureLoader backdrop path loads
   unchanged. Model bytes are parsed lazily by the engine only when selected
   (useGLTF fetches the blob URL on demand); hydration only creates URLs. */

import { useSyncExternalStore } from "react";
import { PRODUCTS } from "../products/registry";
import { ENVIRONMENTS } from "../environments/registry";
import { idbAll, idbDelete, idbPut } from "./idb";

const listeners = new Set();
let version = 0;
const runtimeById = new Map(); // id -> { record, registryEntry, kind }
let hydrated = false;

function emit() {
  version += 1;
  listeners.forEach((fn) => fn());
}

export function subscribeRuntime(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useRuntimeAssets() {
  return useSyncExternalStore(
    subscribeRuntime,
    () => version,
    () => version
  );
}

export const isHydrated = () => hydrated;

function urlsFor(record) {
  const urls = {};
  if (record.file) urls.file = URL.createObjectURL(record.file);
  if (record.thumb) urls.thumb = URL.createObjectURL(record.thumb);
  if (record.thumbWide) urls.thumbWide = URL.createObjectURL(record.thumbWide);
  return urls;
}

function entryFor(record, urls) {
  if (record.kind === "product") {
    return {
      id: record.id,
      name: record.name,
      category: record.category || "Imported",
      modelPath: urls.file,
      thumbUrl: urls.thumb || null,
      source: "imported",
      importedAt: record.createdAt,
      meta: record.meta || {},
    };
  }
  return {
    id: record.id,
    name: record.name,
    category: record.category || "Imported",
    file: urls.file,
    thumbUrl: urls.thumb || null,
    thumbWideUrl: urls.thumbWide || null,
    source: "imported",
    importedAt: record.createdAt,
    meta: record.meta || {},
  };
}

function listOf(kind) {
  return kind === "product" ? PRODUCTS : ENVIRONMENTS;
}

function attach(record, urls) {
  const entry = entryFor(record, urls);
  listOf(record.kind).push(entry);
  runtimeById.set(record.id, { record, urls, entry });
  return entry;
}

function detach(id) {
  const hit = runtimeById.get(id);
  if (!hit) return false;
  const list = listOf(hit.record.kind);
  const at = list.indexOf(hit.entry);
  if (at >= 0) list.splice(at, 1);
  Object.values(hit.urls).forEach((u) => URL.revokeObjectURL(u));
  runtimeById.delete(id);
  return true;
}

/** Reload every persisted import and mirror it into the live registries. */
export async function hydrateRuntimeAssets() {
  if (hydrated) return version;
  hydrated = true;
  try {
    const records = (await idbAll()) || [];
    records
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .forEach((record) => attach(record, urlsFor(record)));
  } catch {
    /* private mode / no IDB: imports stay session-only */
  }
  emit();
  // The engine panel only paints chips for entries present at its last
  // render; after hydration the mirrored imports need one additive nudge
  // so the existing pickers (and the shell bridge) can see them.
  if (typeof document !== "undefined") nudgeEngineRender();
  return version;
}

export function getRuntimeEntry(id) {
  return runtimeById.get(id) || null;
}

export function findByName(kind, name) {
  return listOf(kind).find((x) => x.name === name) || null;
}

/** Store + register a freshly imported asset. Record owns the blobs. */
export async function registerAsset(record) {
  try {
    await idbPut(record);
  } catch {
    /* session-only fallback */
  }
  const entry = attach(record, urlsFor(record));
  emit();
  return entry;
}

/** Metadata edits (rename, category, notes, favorite flag on the record). */
export async function updateAssetRecord(id, patch) {
  const hit = runtimeById.get(id);
  if (!hit) return null;
  hit.record = { ...hit.record, ...patch };
  Object.assign(hit.entry, patch.name ? { name: patch.name } : null, {
    category: patch.category ?? hit.entry.category,
    meta: patch.meta ?? hit.entry.meta,
  });
  if (patch.name) hit.entry.name = patch.name;
  try {
    await idbPut(hit.record);
  } catch {
    /* ignore */
  }
  emit();
  return hit.entry;
}

/** Swap the stored file (+previews) of an imported asset in place. */
export async function replaceAssetFiles(id, blobs) {
  const hit = runtimeById.get(id);
  if (!hit) return null;
  const oldUrls = hit.urls;
  hit.record = { ...hit.record, ...blobs };
  hit.urls = urlsFor(hit.record);
  if (blobs.file) hit.entry.modelPath = hit.urls.file;
  if (blobs.file && hit.record.kind === "environment") hit.entry.file = hit.urls.file;
  if (blobs.thumb) hit.entry.thumbUrl = hit.urls.thumb;
  if (blobs.thumbWide) hit.entry.thumbWideUrl = hit.urls.thumbWide;
  Object.values(oldUrls).forEach((u) => URL.revokeObjectURL(u));
  try {
    await idbPut(hit.record);
  } catch {
    /* ignore */
  }
  emit();
  return hit.entry;
}

/** Copy metadata into a new imported entry that shares the stored blobs. */
export async function duplicateAsset(id) {
  const hit = runtimeById.get(id);
  if (!hit) return null;
  const copy = {
    ...hit.record,
    id: `${hit.record.kind === "product" ? "imported" : "imported-env"}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`,
    name: `${hit.record.name} copy`,
    createdAt: Date.now(),
  };
  return registerAsset(copy);
}

/** Unregister + delete persisted bytes. Built-ins are untouched, always. */
export async function removeAsset(id) {
  const removed = detach(id);
  if (removed) {
    try {
      await idbDelete(id);
    } catch {
      /* ignore */
    }
    emit();
  }
  return removed;
}

/** Imported ids currently mirrored into the live registries. */
export function runtimeIds() {
  return [...runtimeById.keys()];
}

/* The engine panel re-reads the registry arrays only when App re-renders.
   Dispatching an input event on a lighting slider with its CURRENT value runs
   the existing onLightingChange handler (new state object, identical value),
   which re-renders App → StudioControls paints chips for newly mirrored
   entries. No visible side effect, no second selection path, no engine edit. */
export function nudgeEngineRender() {
  const el = document.querySelector('[data-testid="light-key"]');
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  // React's controlled-input change plugin ignores input events whose value
  // equals the tracked one, so a same-value dispatch would not re-render.
  // Step one notch away and back: two real change events, identical end
  // state, and App re-renders so StudioControls repaints its chips.
  const original = el.value;
  const step = parseFloat(el.step) || 0.1;
  const value = parseFloat(original);
  const min = parseFloat(el.min) || 0;
  const alt = value - step >= min ? String(value - step) : String(value + step);
  setter.call(el, alt);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  // React's own controlled-input reconciliation reacts to the dispatch above
  // by immediately restoring the DOM value (and re-syncing its internal
  // value tracker) back to `original`, synchronously, in anticipation of its
  // own re-render eventually reasserting the right value -- this restore
  // happens whether or not that re-render has actually run yet. That leaves
  // the tracker already reporting `original` before the "return" dispatch
  // below fires, so React sees no change and drops it. Whenever the
  // `alt` state update React scheduled from the first dispatch does
  // eventually commit (it lands asynchronously, once the main thread is
  // idle), the slider is left stuck on `alt` with no correction ever
  // applied. Re-sync the tracker to `alt` ourselves so the return dispatch
  // is recognized as a genuine change regardless of when React's own commit
  // for the first step lands.
  if (el._valueTracker) el._valueTracker.setValue(alt);
  setter.call(el, original);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
