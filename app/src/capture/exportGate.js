/* Cleanup slice — export gating and the Garage export lock, as plain JS.
   ---------------------------------------------------------------------------
   No three.js, no DOM, no React. StudioCanvas.jsx owns the TextureLoader and
   reports to the gate below; the export buttons (StudioControls' Capture
   Shot, the header Export, the rail's Export PNG and Export Reel) read it.

   - The backdrop state machine (owner decision 3): "loading" until the
     current environment's backdrop texture has loaded ("ready"), "failed"
     when it could not load (exports are then ALLOWED without it, never
     stuck), "none" for an environment with no backdrop photo (ready at
     once). Every load attempt carries a token, so a late result from an
     environment or product that has since been switched away is ignored.
   - withExportLock (owner decision 2): garageStore.setLocked(true) for the
     length of one export, released in a finally, so it always releases on
     success, on a throw or rejection, and on a cancelled export.
   - clampFieldScale (owner decision 5): the Garage numeric scale fields'
     rule, 0.05 to 100, with the gizmo's own MIN_SCALE and MAX_SCALE.

   One tiny shared store (subscribe / getSnapshot, the pattern of
   garageStore.js) carries the gate from the stage to the buttons. */

import { MIN_SCALE, MAX_SCALE } from "../garage/gizmo.js";

export const BACKDROP_STATUS = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  FAILED: "failed",
  NONE: "none",
});

// The label every gated export button shows while the backdrop loads.
export const GATE_LABEL = "Loading backdrop...";
// The warning shown when the backdrop could not load.
export const BACKDROP_FAILED_WARNING =
  "The backdrop photo could not be loaded. Exports will not include it.";

const freeze = (s) => Object.freeze(s);

// Nothing is loaded before the first stage mounts.
export function initialBackdrop() {
  return freeze({ status: BACKDROP_STATUS.LOADING, file: null, token: 0 });
}

// Pure: (state, event) -> state. Returns the SAME state object when the event
// changes nothing (a stale token, a repeat), so a store never re-renders.
//   { type: "start", file, token }  a load begins (no file: "none")
//   { type: "loaded", token }       that load finished
//   { type: "failed", token }       that load failed
//   { type: "clear", token }        that load's backdrop was removed from the
//                                   scene (the stage cleanup): loading again
export function backdropReducer(state, event) {
  const s = state && typeof state.status === "string" ? state : initialBackdrop();
  if (!event || typeof event !== "object" || !Number.isInteger(event.token)) return s;
  switch (event.type) {
    case "start": {
      const file = typeof event.file === "string" && event.file !== "" ? event.file : null;
      return freeze({
        status: file ? BACKDROP_STATUS.LOADING : BACKDROP_STATUS.NONE,
        file,
        token: event.token,
      });
    }
    case "loaded":
    case "failed": {
      if (event.token !== s.token || s.status !== BACKDROP_STATUS.LOADING || !s.file) return s;
      const status = event.type === "loaded" ? BACKDROP_STATUS.READY : BACKDROP_STATUS.FAILED;
      return freeze({ ...s, status });
    }
    case "clear": {
      if (event.token !== s.token || s.status === BACKDROP_STATUS.LOADING) return s;
      return freeze({ ...s, status: BACKDROP_STATUS.LOADING });
    }
    default:
      return s;
  }
}

// Exports wait only while a backdrop is loading; "failed" never blocks.
export function exportsAllowed(state) {
  return !!state && state.status !== BACKDROP_STATUS.LOADING;
}

// A gate store around backdropReducer. begin() hands out a fresh token.
export function createBackdropGate() {
  let state = initialBackdrop();
  let nextToken = 0;
  const listeners = new Set();
  const dispatch = (event) => {
    const next = backdropReducer(state, event);
    if (next === state) return false;
    state = next;
    for (const fn of Array.from(listeners)) fn();
    return true;
  };
  return {
    getSnapshot: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    begin(file) {
      nextToken += 1;
      dispatch({ type: "start", file, token: nextToken });
      return nextToken;
    },
    loaded: (token) => dispatch({ type: "loaded", token }),
    failed: (token) => dispatch({ type: "failed", token }),
    clear: (token) => dispatch({ type: "clear", token }),
  };
}

// The app's one shared gate.
export const backdropGate = createBackdropGate();

// Runs fn (sync or async) with the store's lock engaged and releases it in a
// finally: on success, on a throw or rejection, and on a cancelled export
// (the exporter resolves { canceled: true }). Only a call that actually
// engaged the lock releases it, so a lock someone else holds is left alone.
// fn is called synchronously, so a synchronous render inside it still runs
// in the caller's task. Resolves to fn's result; rethrows fn's error.
export async function withExportLock(store, fn) {
  const r = store && typeof store.setLocked === "function" ? store.setLocked(true) : null;
  const owned = !!(r && r.ok && r.changed);
  try {
    return await fn();
  } finally {
    if (owned) store.setLocked(false);
  }
}

// The Garage numeric scale fields: at least MIN_SCALE (0.05, unchanged) and
// at most MAX_SCALE (100, the gizmo's cap), so a typed 1000 becomes 100. The
// value is not rounded. NaN or a non-number gives MIN_SCALE (the fields only
// ever commit finite numbers).
export function clampFieldScale(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));
}

export { MIN_SCALE, MAX_SCALE };
