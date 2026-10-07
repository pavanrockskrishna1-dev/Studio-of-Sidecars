/* Phase 15A — Studio Session (Save / Restore / Reset).
   ---------------------------------------------------------------------------
   The engine (App + StudioCanvas) owns camera, lighting, environment, viewer
   and transform state, and the materials store owns material edits. This
   module keeps NO copy of any of it: it asks the engine's registered session
   API to read/write its real state, and the materials store to snapshot/restore
   its real edits. The only thing it stores is the saved snapshot itself.

   A session is local only (localStorage). It is not an export: no GLB, no
   image. Materials are captured only while a model's materials are attached
   (the Materials panel mounts them); otherwise that part is skipped.
   Slice C2b: the Reel shot list (animationStore) is saved as `reel`, restored
   when the saved session has one, and Reset puts back the default single shot.
   Slice P2: the props in the scene are saved as `props` (garage/propsSession.js)
   and put back by session/propsRestore.js; a session without `props` (saved
   before the props shelf) leaves the scene's props untouched, and Reset
   removes them. */

import * as materials from "../materials/store";
import * as animationStore from "../animation/animationStore";
import { cancelRestore, currentSessionProps, removeAllProps, restoreSessionProps } from "./propsRestore";

const KEY = "sos-studio-session-v1";
const VERSION = 1;

let engine = null;

/** App registers { snapshot(), apply(snap), reset() }; returns the unregister. */
export function registerEngine(api) {
  engine = api;
  return () => {
    if (engine === api) engine = null;
  };
}

export function readSavedSession() {
  try {
    const snap = JSON.parse(localStorage.getItem(KEY) || "null");
    return snap && snap.version === VERSION && snap.engine ? snap : null;
  } catch {
    return null;
  }
}

/** @param {string|null} projectName the user's override (null = follow asset name) */
export function saveSession(projectName) {
  if (!engine) return { ok: false };
  const snap = {
    version: VERSION,
    savedAt: Date.now(),
    projectName,
    engine: engine.snapshot(),
    materials: materials.snapshotOverrides(),
    reel: animationStore.sequenceForSession(),
    props: currentSessionProps(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    return { ok: false };
  }
  return { ok: true, snap };
}

// The materials of a different product attach a moment after the switch: wait
// for the store to hold that model, then restore. Gives up quietly.
function whenMaterialsReady(modelKey, fn, timeoutMs = 20000) {
  const ready = () => {
    const s = materials.getSnapshot();
    return s.status === "ready" && s.modelKey === modelKey;
  };
  if (ready()) {
    fn();
    return;
  }
  let timer = 0;
  const off = materials.subscribe(() => {
    if (!ready()) return;
    off();
    clearTimeout(timer);
    fn();
  });
  timer = setTimeout(off, timeoutMs);
}

/** @returns the applied snapshot (so the caller can restore the project name), or null */
export function restoreSession() {
  const snap = readSavedSession();
  if (!snap || !engine) return null;
  engine.apply(snap.engine);
  if (snap.reel) animationStore.restoreSequence(snap.reel);
  if (Array.isArray(snap.props)) restoreSessionProps(snap.engine.productId, snap.props);
  if (snap.materials) {
    whenMaterialsReady(snap.materials.modelKey, () => materials.restoreOverrides(snap.materials));
  }
  return snap;
}

export function resetSession() {
  if (!engine) return false;
  engine.reset();
  cancelRestore();
  removeAllProps();
  materials.resetModel();
  animationStore.resetSequence();
  return true;
}
