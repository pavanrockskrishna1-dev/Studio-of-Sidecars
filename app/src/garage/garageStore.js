/* Garage G2 — the Garage store: layout, history, gestures, selection.
   ---------------------------------------------------------------------------
   Pure JS, no engine hookup and nothing visible. It follows the pattern of
   camera/cameraStudio.js and animation/animationStore.js: a frozen snapshot that
   is replaced ONLY when a field changes, subscribe + getSnapshot for
   useSyncExternalStore, and registerApi with an identity-checked unregister
   (safe under React StrictMode). Nothing imports it yet.

   The layout is IMMUTABLE. Every command builds new objects along the changed
   path (the layout, the item, the parts map, the part) and reuses every other
   object by reference, so each undo entry (a whole layout reference) shares
   almost all of its memory. New objects are frozen; getLayout() hands out a
   deep copy. Each command validates ONLY what it changes: it puts the changed
   pieces into a tiny wrapper layout, runs validateLayout on that and takes the
   sanitised values back (the whole layout is never re-validated per command).

   Owner decisions that touch this module:
   - Decision 4: with several objects the FRONT object defaults to the first
     one (layout field frontRef; removing the front item makes it the first).
   - Decision 5: layouts live in the browser plus a downloadable .json backup
     (slice G8). This module has NO storage and NO file access: exportJson()
     only returns text and loadLayoutJson() only takes text.
   - Decision 6: material.ignoreVertexColors is an ordinary material sub-key.
   - Decisions 1, 2 and 3 (floor stays at the model's original base, PNG
     exports drop the gold outline and ring, no turntable with several objects)
     belong to later slices; nothing here implements them.

   Nothing in this module throws: commands return { ok:false, reason }, and
   listeners or api callbacks that throw are caught and ignored. */

import { LAYOUT_LIMITS, validateLayout, serializeLayout, parseLayoutJson } from "./layout.js";
import { parsePartId } from "./partId.js";

export const HISTORY_LIMIT = 50;
export const SELECTION_LIMIT = 200;

const PART_KEYS = ["fp", "pos", "quat", "scale", "visible", "material"];
const MATERIAL_KEYS = ["color", "roughness", "metalness", "opacity", "ignoreVertexColors"];
const TRANSFORM_KEYS = ["x", "y", "z", "rx", "ry", "rz", "s"];
const MAX_WARNINGS = 20;

const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);
const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const fail = (reason) => ({ ok: false, reason });
const EMPTY = Object.freeze([]);

function deepCopy(v) {
  if (Array.isArray(v)) return v.map(deepCopy);
  if (isObj(v)) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = deepCopy(v[k]);
    return out;
  }
  return v;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((e, i) => deepEqual(e, b[i]));
  }
  if (isObj(a)) {
    if (!isObj(b)) return false;
    const ka = Object.keys(a);
    if (ka.length !== Object.keys(b).length) return false;
    return ka.every((k) => hasOwn(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

function deepFreeze(v) {
  if (Array.isArray(v) || isObj(v)) {
    if (Object.isFrozen(v)) return v;
    for (const k of Object.keys(v)) deepFreeze(v[k]);
    Object.freeze(v);
  }
  return v;
}

const selKey = (e) => JSON.stringify([e.itemId, e.partId]);

export function createGarageStore() {
  let layout = null;
  let undoStack = []; // [{ before, after }] layout references, oldest first
  let redoStack = [];
  let gesture = null; // { before } while a gesture is open
  let selection = EMPTY;
  let revision = 0;
  let savedRevision = 0;
  let warnings = EMPTY;
  let locked = false;
  const apiRef = { current: null };
  const listeners = new Set();

  // Overrides are counted once per layout reference, not once per command.
  let countedLayout = null;
  let countedTotal = 0;
  const countOverrides = (l) => {
    if (l !== countedLayout) {
      countedTotal = 0;
      for (const it of l.items) countedTotal += Object.keys(it.parts).length;
      countedLayout = l;
    }
    return countedTotal;
  };

  // While a gesture is open the snapshot keeps describing the layout at
  // beginGesture, so a drag never changes it (only selection, lock and the
  // gestureOpen flag can).
  function compute() {
    const view = gesture ? gesture.before : layout;
    const primary = view ? view.items.find((i) => i.primary) : null;
    return {
      ready: apiRef.current !== null,
      locked,
      hasLayout: view !== null,
      layoutName: view ? view.name : "",
      itemCount: view ? view.items.length : 0,
      primaryAssetId: primary ? primary.assetId : "",
      frontRef: view ? view.frontRef : "",
      overrideCount: view ? countOverrides(view) : 0,
      selectionCount: selection.length,
      selection,
      revision,
      dirty: revision !== savedRevision,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undoDepth: undoStack.length,
      redoDepth: redoStack.length,
      gestureOpen: gesture !== null,
      warnings,
    };
  }

  let snapshot = Object.freeze(compute());

  // Replaces the snapshot only if a field changed; true when it did.
  function updateSnapshot() {
    const next = compute();
    let same = true;
    for (const k of Object.keys(next)) {
      if (next[k] !== snapshot[k]) {
        same = false;
        break;
      }
    }
    if (same) return false;
    snapshot = Object.freeze(next);
    return true;
  }

  function notify() {
    for (const fn of Array.from(listeners)) {
      try {
        fn();
      } catch {
        // a throwing listener must not stop the others
      }
    }
  }

  function callApi(change) {
    const api = apiRef.current;
    if (!api || typeof api.onChange !== "function") return;
    try {
      api.onChange(change);
    } catch {
      // a throwing api must not break the store
    }
  }

  // Snapshot first (so the api and listeners read fresh state), then the api,
  // then the subscribers.
  function settle(change) {
    const changed = updateSnapshot();
    if (change) callApi(change);
    if (changed) notify();
  }

  const noop = () => ({ ok: true, changed: false, revision });

  function pruneSelection() {
    if (selection.length === 0) return;
    const ids = layout ? new Set(layout.items.map((i) => i.itemId)) : new Set();
    const kept = selection.filter((e) => ids.has(e.itemId));
    if (kept.length !== selection.length) selection = kept.length ? Object.freeze(kept) : EMPTY;
  }

  /* ---- subscribe / api / lock ---- */

  function subscribe(fn) {
    if (typeof fn !== "function") return () => false;
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  const getSnapshot = () => snapshot;

  // The stage registers { onChange(change) } here. Only the registering owner
  // may unregister, so a StrictMode remount (register, unregister, register)
  // never removes the newer api.
  function registerApi(api) {
    if (!isObj(api)) return () => undefined;
    apiRef.current = api;
    settle(null);
    return () => {
      if (apiRef.current !== api) return;
      apiRef.current = null;
      settle(null);
    };
  }

  // Cancels the open gesture: restores the layout at beginGesture. Returns the
  // change for the api, or null when the layout did not move. No settle here.
  function restoreGesture() {
    const before = gesture.before;
    const moved = layout !== before;
    layout = before;
    gesture = null;
    pruneSelection();
    return moved ? { type: "gesture-cancel", revision, live: false } : null;
  }

  function setLocked(value) {
    if (typeof value !== "boolean") return fail("bad-input");
    if (value === locked) return { ok: true, changed: false, cancelled: false };
    let change = null;
    const cancelled = value && gesture !== null;
    if (cancelled) change = restoreGesture();
    locked = value;
    settle(change);
    return { ok: true, changed: true, cancelled };
  }

  /* ---- layout lifecycle ---- */

  // Installs a validated (fresh, therefore unaliased) layout.
  function install(valid, type, warn) {
    layout = deepFreeze(valid);
    undoStack = [];
    redoStack = [];
    selection = EMPTY;
    revision += 1;
    savedRevision = revision;
    warnings = Object.freeze(warn.slice(0, MAX_WARNINGS));
    settle({ type, revision, live: false });
  }

  function refuseLifecycle() {
    if (locked) return "locked";
    if (gesture) return "gesture-open";
    return null;
  }

  function startLayout(spec) {
    const why = refuseLifecycle();
    if (why) return fail(why);
    if (!isObj(spec) || typeof spec.assetId !== "string" || spec.assetId === "") return fail("bad-input");
    const v = validateLayout({
      version: 1,
      name: typeof spec.name === "string" ? spec.name : "",
      items: [{ itemId: "i0", assetId: spec.assetId, primary: true, transform: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 } }],
    });
    if (!v.ok) return fail("invalid");
    install(v.layout, "start", v.warnings);
    return { ok: true, revision, warnings: v.warnings.slice(), errors: [] };
  }

  function finishLoad(v) {
    if (!v.ok) return { ok: false, reason: "invalid", warnings: v.warnings.slice(), errors: v.errors.slice() };
    install(v.layout, "load", v.warnings);
    return { ok: true, revision, warnings: v.warnings.slice(), errors: [] };
  }

  function loadLayout(raw) {
    const why = refuseLifecycle();
    if (why) return { ok: false, reason: why, warnings: [], errors: [] };
    return finishLoad(validateLayout(raw));
  }

  function loadLayoutJson(text) {
    const why = refuseLifecycle();
    if (why) return { ok: false, reason: why, warnings: [], errors: [] };
    return finishLoad(parseLayoutJson(text));
  }

  const getLayout = () => (layout ? deepCopy(layout) : null);
  const exportJson = () => (layout ? serializeLayout(layout) : null);

  function markSaved() {
    savedRevision = revision;
    settle(null);
    return { ok: true, revision };
  }

  /* ---- commit and history ---- */

  function pushHistory(before, after) {
    undoStack.push({ before, after });
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
  }

  // next is always a new layout reference. Inside a gesture the layout changes
  // and the api hears it (live), but there is no history entry, no revision
  // bump and no subscriber notification.
  function commit(next, change, selectionChanged) {
    if (gesture) {
      layout = next;
      const changed = selectionChanged ? updateSnapshot() : false;
      callApi({ ...change, revision, live: true });
      if (changed) notify();
      return;
    }
    pushHistory(layout, next);
    layout = next;
    revision += 1;
    settle({ ...change, revision, live: false });
  }

  function undo() {
    if (locked) return fail("locked");
    if (gesture) return fail("gesture-open");
    const entry = undoStack.pop();
    if (!entry) return fail("empty");
    redoStack.push(entry);
    layout = entry.before;
    revision += 1;
    pruneSelection();
    settle({ type: "undo", revision, live: false });
    return { ok: true, revision };
  }

  function redo() {
    if (locked) return fail("locked");
    if (gesture) return fail("gesture-open");
    const entry = redoStack.pop();
    if (!entry) return fail("empty");
    undoStack.push(entry);
    layout = entry.after;
    revision += 1;
    pruneSelection();
    settle({ type: "redo", revision, live: false });
    return { ok: true, revision };
  }

  /* ---- gestures ---- */

  function beginGesture() {
    if (locked) return fail("locked");
    if (!layout) return fail("no-layout");
    if (gesture) return fail("gesture-open");
    gesture = { before: layout };
    settle(null);
    return { ok: true };
  }

  function endGesture() {
    if (!gesture) return fail("no-gesture");
    const changed = layout !== gesture.before;
    if (changed) {
      pushHistory(gesture.before, layout);
      revision += 1;
    }
    gesture = null;
    settle(null);
    return { ok: true, changed, revision };
  }

  function cancelGesture() {
    if (!gesture) return fail("no-gesture");
    const change = restoreGesture();
    settle(change);
    return { ok: true, changed: change !== null, revision };
  }

  /* ---- edits ---- */

  function prep(itemId) {
    if (locked) return { err: fail("locked") };
    if (!layout) return { err: fail("no-layout") };
    const idx = typeof itemId === "string" ? layout.items.findIndex((i) => i.itemId === itemId) : -1;
    if (idx < 0) return { err: fail("unknown-item") };
    return { idx, item: layout.items[idx] };
  }

  function withItem(idx, item) {
    const items = layout.items.slice();
    items[idx] = Object.freeze(item);
    return Object.freeze({ ...layout, items: Object.freeze(items) });
  }

  // The tiny wrapper layout: only the changed pieces go through validateLayout.
  const wrap = (itemId, transform, parts) => ({
    version: 1,
    name: "x",
    items: [{ itemId, assetId: "x", primary: true, transform, ...(parts ? { parts } : {}) }],
  });

  function commitPart(p, partId, clean) {
    const parts = Object.assign({}, p.item.parts);
    if (clean) parts[partId] = deepFreeze(clean);
    else delete parts[partId];
    Object.freeze(parts);
    commit(withItem(p.idx, { ...p.item, parts }), { type: "part", itemId: p.item.itemId, partId });
    return { ok: true, changed: true, revision, part: clean ? deepCopy(clean) : null };
  }

  function setPartOverride(itemId, partId, patch) {
    const p = prep(itemId);
    if (p.err) return p.err;
    if (typeof partId !== "string" || !parsePartId(partId) || !isObj(patch)) return fail("bad-input");
    const cur = hasOwn(p.item.parts, partId) ? p.item.parts[partId] : undefined;
    const raw = cur ? deepCopy(cur) : {};
    const wanted = []; // keys that must survive the sanitising
    const wantedMat = [];
    for (const k of PART_KEYS) {
      const v = hasOwn(patch, k) ? patch[k] : undefined;
      if (v === undefined) continue;
      if (v === null) {
        delete raw[k];
      } else if (k === "material") {
        if (!isObj(v)) return fail("bad-input");
        const mat = raw.material ? { ...raw.material } : {};
        for (const mk of MATERIAL_KEYS) {
          const mv = hasOwn(v, mk) ? v[mk] : undefined;
          if (mv === undefined) continue;
          if (mv === null) {
            delete mat[mk];
          } else {
            mat[mk] = mv;
            wantedMat.push(mk);
          }
        }
        if (Object.keys(mat).length) raw.material = mat;
        else delete raw.material;
      } else {
        raw[k] = v;
        wanted.push(k);
      }
    }
    if (Object.keys(raw).length === 0) return cur ? commitPart(p, partId, null) : noop();
    if (!cur && Object.keys(p.item.parts).length >= LAYOUT_LIMITS.MAX_PARTS_PER_ITEM) return fail("limit");
    const v = validateLayout(wrap(p.item.itemId, p.item.transform, { [partId]: raw }));
    const clean = v.ok && hasOwn(v.layout.items[0].parts, partId) ? v.layout.items[0].parts[partId] : undefined;
    if (!clean) {
      const valuesRejected = wanted.length + wantedMat.length > 0 && partId.length <= LAYOUT_LIMITS.MAX_ID;
      return fail(valuesRejected ? "bad-input" : "invalid");
    }
    if (wanted.some((k) => !hasOwn(clean, k))) return fail("bad-input");
    if (wantedMat.some((mk) => !clean.material || !hasOwn(clean.material, mk))) return fail("bad-input");
    if (cur && deepEqual(clean, cur)) return noop();
    return commitPart(p, partId, clean);
  }

  function resetPart(itemId, partId) {
    const p = prep(itemId);
    if (p.err) return p.err;
    if (typeof partId !== "string") return fail("bad-input");
    if (!hasOwn(p.item.parts, partId)) return noop();
    return commitPart(p, partId, null);
  }

  // Garage G8 — replaces an item's whole parts map (every per-part override:
  // move/rotate/scale/hide/colour) in ONE commit, so loading a saved layout is
  // exactly one undo step (Owner decision 5) instead of the hard reset
  // startLayout/loadLayout do. Goes through the same wrap()+validateLayout
  // sanitising as setPartOverride; the item's transform and hidden flag are
  // untouched, since a G8 layout never carries those (layoutLibrary.js strips
  // them before saving).
  function loadPartsOverrides(itemId, parts) {
    const p = prep(itemId);
    if (p.err) return p.err;
    if (!isObj(parts)) return fail("bad-input");
    const v = validateLayout(wrap(p.item.itemId, p.item.transform, parts));
    if (!v.ok) return fail("invalid");
    const clean = v.layout.items[0].parts;
    if (deepEqual(clean, p.item.parts)) return noop();
    commit(withItem(p.idx, { ...p.item, parts: clean }), { type: "load-parts", itemId });
    return { ok: true, changed: true, revision, parts: deepCopy(clean) };
  }

  // Only finite numbers are accepted for the given keys (never null).
  function pickTransform(t) {
    const out = {};
    for (const k of TRANSFORM_KEYS) {
      const v = hasOwn(t, k) ? t[k] : undefined;
      if (v === undefined) continue;
      if (!isNum(v)) return null;
      out[k] = v;
    }
    return out;
  }

  function setItemTransform(itemId, transform) {
    const p = prep(itemId);
    if (p.err) return p.err;
    if (!isObj(transform)) return fail("bad-input");
    const given = pickTransform(transform);
    if (!given) return fail("bad-input");
    const v = validateLayout(wrap(p.item.itemId, { ...p.item.transform, ...given }));
    if (!v.ok) return fail("invalid");
    const clean = v.layout.items[0].transform; // the scale is at least 0.05 here
    if (deepEqual(clean, p.item.transform)) return noop();
    commit(withItem(p.idx, { ...p.item, transform: Object.freeze(clean) }), { type: "item", itemId: p.item.itemId });
    return { ok: true, changed: true, revision, transform: { ...clean } };
  }

  function setItemHidden(itemId, hidden) {
    const p = prep(itemId);
    if (p.err) return p.err;
    if (typeof hidden !== "boolean") return fail("bad-input");
    if (p.item.hidden === hidden) return noop();
    commit(withItem(p.idx, { ...p.item, hidden }), { type: "item", itemId: p.item.itemId });
    return { ok: true, changed: true, revision };
  }

  function addItem(spec) {
    if (locked) return fail("locked");
    if (!layout) return fail("no-layout");
    if (!isObj(spec) || typeof spec.assetId !== "string" || spec.assetId === "") return fail("bad-input");
    let given = {};
    if (spec.transform !== undefined) {
      given = isObj(spec.transform) ? pickTransform(spec.transform) : null;
      if (!given) return fail("bad-input");
    }
    if (layout.items.length >= LAYOUT_LIMITS.MAX_ITEMS) return fail("limit");
    const used = new Set(layout.items.map((i) => i.itemId));
    let n = 0;
    while (used.has(`i${n}`)) n += 1;
    const itemId = `i${n}`;
    const v = validateLayout({
      version: 1,
      name: "x",
      items: [{ itemId, assetId: spec.assetId, primary: true, transform: given }],
    });
    if (!v.ok) return fail("invalid");
    const item = deepFreeze({ ...v.layout.items[0], primary: false });
    const items = Object.freeze([...layout.items, item]);
    commit(Object.freeze({ ...layout, items }), { type: "add-item", itemId });
    return { ok: true, changed: true, revision, itemId };
  }

  function removeItem(itemId) {
    const p = prep(itemId);
    if (p.err) return p.err;
    if (p.item.primary) return fail("not-primary");
    const items = Object.freeze(layout.items.filter((i) => i !== p.item));
    const frontRef = layout.frontRef === itemId ? items[0].itemId : layout.frontRef;
    const kept = selection.filter((e) => e.itemId !== itemId);
    const selectionChanged = kept.length !== selection.length;
    if (selectionChanged) selection = kept.length ? Object.freeze(kept) : EMPTY;
    commit(Object.freeze({ ...layout, items, frontRef }), { type: "remove-item", itemId }, selectionChanged);
    return { ok: true, changed: true, revision };
  }

  function setFrontRef(itemId) {
    const p = prep(itemId);
    if (p.err) return p.err;
    if (layout.frontRef === itemId) return noop();
    commit(Object.freeze({ ...layout, frontRef: itemId }), { type: "front", itemId });
    return { ok: true, changed: true, revision };
  }

  /* ---- selection (not history, not saved, not blocked by the lock) ---- */

  // The clean entry, or a reason string.
  function normEntry(e) {
    if (!isObj(e) || typeof e.itemId !== "string" || typeof e.partId !== "string") return "bad-input";
    if (!layout.items.some((i) => i.itemId === e.itemId)) return "unknown-item";
    if (!parsePartId(e.partId)) return "bad-input";
    return Object.freeze({ itemId: e.itemId, partId: e.partId });
  }

  function setSelection(list) {
    const same = list.length === selection.length && list.every((e, i) => selKey(e) === selKey(selection[i]));
    if (same) return { ok: true, changed: false, count: selection.length };
    selection = list.length ? Object.freeze(list) : EMPTY;
    settle(null);
    return { ok: true, changed: true, count: selection.length };
  }

  function select(entries, opts) {
    if (!layout) return fail("no-layout");
    if (!Array.isArray(entries)) return fail("bad-input");
    const out = [];
    const seen = new Set();
    const add = (e) => {
      const k = selKey(e);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(e);
      }
    };
    if (isObj(opts) && opts.additive === true) selection.forEach(add);
    for (const raw of entries) {
      const e = normEntry(raw);
      if (typeof e === "string") return fail(e);
      add(e);
      if (out.length > SELECTION_LIMIT) return fail("limit");
    }
    return setSelection(out);
  }

  function toggle(entry) {
    if (!layout) return fail("no-layout");
    const e = normEntry(entry);
    if (typeof e === "string") return fail(e);
    const k = selKey(e);
    if (selection.some((s) => selKey(s) === k)) return setSelection(selection.filter((s) => selKey(s) !== k));
    if (selection.length >= SELECTION_LIMIT) return fail("limit");
    return setSelection([...selection, e]);
  }

  const clearSelection = () => setSelection([]);

  /* ---- assembly: no export can throw ---- */

  const guard = (fn, fallback) => (...args) => {
    try {
      return fn(...args);
    } catch {
      return typeof fallback === "function" ? fallback() : fallback;
    }
  };
  const command = (fn) => guard(fn, () => fail("invalid"));

  return {
    subscribe: guard(subscribe, () => () => false),
    getSnapshot,
    apiRef,
    registerApi: guard(registerApi, () => () => undefined),
    setLocked: command(setLocked),
    startLayout: command(startLayout),
    loadLayout: guard(loadLayout, () => ({ ok: false, reason: "invalid", warnings: [], errors: [] })),
    loadLayoutJson: guard(loadLayoutJson, () => ({ ok: false, reason: "invalid", warnings: [], errors: [] })),
    getLayout: guard(getLayout, null),
    exportJson: guard(exportJson, null),
    markSaved: command(markSaved),
    setPartOverride: command(setPartOverride),
    resetPart: command(resetPart),
    loadPartsOverrides: command(loadPartsOverrides),
    setItemTransform: command(setItemTransform),
    setItemHidden: command(setItemHidden),
    addItem: command(addItem),
    removeItem: command(removeItem),
    setFrontRef: command(setFrontRef),
    select: command(select),
    toggle: command(toggle),
    clearSelection: command(clearSelection),
    beginGesture: command(beginGesture),
    endGesture: command(endGesture),
    cancelGesture: command(cancelGesture),
    undo: command(undo),
    redo: command(redo),
  };
}

// The app's one shared instance; import * as garageStore gives the same names.
const defaultStore = createGarageStore();

export const {
  subscribe, getSnapshot, apiRef, registerApi, setLocked,
  startLayout, loadLayout, loadLayoutJson, getLayout, exportJson, markSaved,
  setPartOverride, resetPart, loadPartsOverrides, setItemTransform, setItemHidden,
  addItem, removeItem, setFrontRef,
  select, toggle, clearSelection,
  beginGesture, endGesture, cancelGesture, undo, redo,
} = defaultStore;
