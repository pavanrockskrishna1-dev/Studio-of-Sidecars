/* Animation Studio (Phase 16B, Slice B + C) — the Turntable's state hub.
   ---------------------------------------------------------------------------
   Same pattern as camera/cameraStudio.js: a module singleton holding a
   read-only snapshot plus the module-level apiRef the stage registers its
   commands in. The Inspector Rail reads the snapshot with useSyncExternalStore
   and calls play / stop / setDurationS, which go through the stage.

   The snapshot is { mode, ready, durationS }; mode is "idle" | "previewing" |
   "exporting" (Slice C: deterministic frame stepping, see beginExport below). It changes on Play, Stop, a
   duration chip and when the stage registers or goes away, and NEVER per frame:
   the spin angle lives in a ref inside the stage and is applied straight to the
   pivot group. The store holds no camera and no model state.

   The one DOM side effect: mode "previewing" or "exporting" sets
   document.body.dataset.anim so the shell CSS can shield the controls that
   would fight the animation. */

import { makeTurntable, validateAnimation } from "./path";

export const DURATIONS = [4, 8, 12];
const DEFAULT_DURATION_S = 8;

let snapshot = Object.freeze({ mode: "idle", ready: false, durationS: DEFAULT_DURATION_S });
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSnapshot = () => snapshot;

// Replaces the snapshot only if a field changed; keeps the body flag in step.
function replace(patch) {
  const next = { ...snapshot, ...patch };
  if (
    next.mode === snapshot.mode &&
    next.ready === snapshot.ready &&
    next.durationS === snapshot.durationS
  ) {
    return;
  }
  const modeChanged = next.mode !== snapshot.mode;
  snapshot = Object.freeze(next);
  if (modeChanged && typeof document !== "undefined") {
    if (next.mode !== "idle") document.body.dataset.anim = "1";
    else delete document.body.dataset.anim;
  }
  for (const fn of listeners) fn();
}

// The stage registers { play(anim), stop(), beginExport(opts), stepExport(t),
// endExport() } here.
export const apiRef = { current: null };

// Stage only. Only the registering owner may unregister, so a StrictMode
// remount (register, unregister, register) never removes the newer api.
export function registerApi(api) {
  apiRef.current = api;
  replace({ ready: true });
  return () => {
    if (apiRef.current !== api) return;
    apiRef.current = null;
    replace({ mode: "idle", ready: false });
  };
}

// Stage only: the preview ended on its own side (canvas click, Escape, a
// camera / transform / session change, or the stage unmounting).
export function reportStopped() {
  replace({ mode: "idle" });
}

// Null-safe commands: false when no stage is registered.
export function play() {
  const api = apiRef.current;
  if (!api || snapshot.mode !== "idle") return false;
  const anim = makeTurntable({ durationS: snapshot.durationS });
  if (!validateAnimation(anim).ok) return false;
  if (!api.play(anim)) return false;
  replace({ mode: "previewing" });
  return true;
}

// Stops a running PREVIEW only; an export is ended with endExport().
export function stop() {
  const api = apiRef.current;
  if (!api || snapshot.mode !== "previewing") return false;
  const stopped = api.stop();
  replace({ mode: "idle" });
  return stopped;
}

// Only while idle, and only 4, 8 or 12 seconds.
export function setDurationS(n) {
  if (snapshot.mode !== "idle" || !DURATIONS.includes(n)) return false;
  replace({ durationS: n });
  return true;
}

/* ---- Slice C: deterministic frame stepping ------------------------------- */

// Prepares the stage to render the Turntable one exact frame at a time at
// { width, height } (default 1080x1920), on the same visible canvas as the PNG
// export. Only from idle, so a running preview refuses it. The turntable spec
// (the current durationS) is fixed here and used for every step.
export function beginExport(opts = {}) {
  const api = apiRef.current;
  if (!api || !api.beginExport || snapshot.mode !== "idle") return false;
  const anim = makeTurntable({ durationS: snapshot.durationS });
  if (!validateAnimation(anim).ok) return false;
  if (!api.beginExport({ ...opts, anim })) return false;
  replace({ mode: "exporting" });
  return true;
}

// Renders the frame at animation time t (seconds), synchronously. resized is
// true when a window resize had changed the drawing buffer (the stage restored
// the size; no frame was drawn), so the caller can abort.
export function stepExport(t) {
  const api = apiRef.current;
  if (!api || !api.stepExport || snapshot.mode !== "exporting") {
    return { ok: false, resized: false };
  }
  return api.stepExport(t);
}

// Restores the renderer, camera and frame loop. Idempotent.
export function endExport() {
  const api = apiRef.current;
  if (!api || !api.endExport || snapshot.mode !== "exporting") return false;
  const ended = api.endExport();
  replace({ mode: "idle" });
  return ended;
}
