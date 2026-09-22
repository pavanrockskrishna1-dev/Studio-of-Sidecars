/* Garage G3 — the Parts-mode switch.
   ---------------------------------------------------------------------------
   A tiny module store in the pattern of animation/animationStore.js: a frozen
   snapshot { pickMode } that is replaced only when it changes, subscribe +
   getSnapshot for useSyncExternalStore, and a module-level apiRef the stage
   registers its part read-out in (identity-checked unregister, StrictMode safe).

   pickMode is OFF by default: with it OFF the app behaves exactly as before.
   Turning it OFF also clears the part selection held in the Garage store. The
   selection itself lives in garageStore.js, never here. */

import { clearSelection } from "./garageStore.js";

let snapshot = Object.freeze({ pickMode: false });
const listeners = new Set();

export function subscribe(fn) {
  if (typeof fn !== "function") return () => false;
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSnapshot = () => snapshot;

function notify() {
  for (const fn of Array.from(listeners)) {
    try {
      fn();
    } catch {
      // a listener must never break the store or the other listeners
    }
  }
}

// Returns true when the mode changed. OFF also clears the part selection (even
// when it was already OFF, which is harmless).
export function setPickMode(value) {
  const on = value === true;
  if (!on) {
    try {
      clearSelection();
    } catch {
      // the selection is best-effort here
    }
  }
  if (on === snapshot.pickMode) return false;
  snapshot = Object.freeze({ pickMode: on });
  notify();
  return true;
}

export function togglePickMode() {
  return setPickMode(!snapshot.pickMode);
}

// The stage registers { describePart(partId) } here.
export const apiRef = { current: null };

export function registerApi(api) {
  apiRef.current = api;
  return () => {
    if (apiRef.current !== api) return;
    apiRef.current = null;
  };
}

// { name, path, triangles, vertices, size, materialName } or null (no stage,
// unknown part, or an api that failed).
export function describePart(partId) {
  const api = apiRef.current;
  if (!api || typeof api.describePart !== "function") return null;
  try {
    const d = api.describePart(partId);
    return d === undefined ? null : d;
  } catch {
    return null;
  }
}
