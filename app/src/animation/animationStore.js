/* Animation Studio (Phase 16B, Slice B + C) — the Turntable's state hub.
   ---------------------------------------------------------------------------
   Same pattern as camera/cameraStudio.js: a module singleton holding a
   read-only snapshot plus the module-level apiRef the stage registers its
   commands in. The Inspector Rail reads the snapshot with useSyncExternalStore
   and calls play / stop / setDurationS, which go through the stage.

   The snapshot is { mode, ready, durationS, progress, message, preset,
   startView } (preset / startView: Slice C2a camera moves); mode is
   "idle" | "previewing" | "exporting" (Slice C: deterministic frame stepping,
   see beginExport below), progress is an integer 0-100 and message a string
   (both written by the MP4 exporter through setStatus, throttled by it). It
   changes on Play, Stop, a duration chip, an export status update and when the
   stage registers or goes away, and NEVER per frame:
   the spin angle lives in a ref inside the stage and is applied straight to the
   pivot group. The store holds no camera and no model state.

   The one DOM side effect: document.body.dataset.anim is "1" while previewing
   and "export" while exporting (removed on idle), so the shell CSS can shield
   the controls that would fight the animation. */

import { makeShot, makeTurntable, validateAnimation, SHOT_MOVES } from "./path";

export const DURATIONS = [4, 8, 12];
const DEFAULT_DURATION_S = 8;

// Slice C2a: the Reel preset is the Turntable (unchanged) or one of the camera
// moves; a camera move starts from one of the 6 camera presets or the saved
// custom view (the Reel sheet applies that view before Play / Export).
export const PRESETS = Object.freeze(["turntable", ...SHOT_MOVES]);
export const START_VIEWS = Object.freeze(["Front", "Side", "3/4", "Rear", "Top", "Low Hero", "custom"]);

let snapshot = Object.freeze({
  mode: "idle",
  ready: false,
  durationS: DEFAULT_DURATION_S,
  progress: 0,
  message: "",
  preset: "turntable",
  startView: "3/4",
});
// Set by cancelExport(), read by the exporter between frames.
let cancelRequested = false;
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
    next.durationS === snapshot.durationS &&
    next.progress === snapshot.progress &&
    next.message === snapshot.message &&
    next.preset === snapshot.preset &&
    next.startView === snapshot.startView
  ) {
    return;
  }
  const modeChanged = next.mode !== snapshot.mode;
  snapshot = Object.freeze(next);
  if (modeChanged && typeof document !== "undefined") {
    if (next.mode === "previewing") document.body.dataset.anim = "1";
    else if (next.mode === "exporting") document.body.dataset.anim = "export";
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
    replace({ mode: "idle", ready: false, progress: 0 });
  };
}

// Stage only: the preview ended on its own side (canvas click, Escape, a
// camera / transform / session change, or the stage unmounting).
export function reportStopped() {
  replace({ mode: "idle" });
}

// The animation Play and Export run: the Turntable exactly as before, or (Slice
// C2a) the selected camera move over the selected duration.
function buildAnim() {
  if (snapshot.preset === "turntable") return makeTurntable({ durationS: snapshot.durationS });
  return makeShot({ move: snapshot.preset, durationS: snapshot.durationS });
}

// Null-safe commands: false when no stage is registered.
export function play() {
  const api = apiRef.current;
  if (!api || snapshot.mode !== "idle") return false;
  const anim = buildAnim();
  if (!anim) return false;
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

// Slice C2a: only while idle.
export function setPreset(id) {
  if (snapshot.mode !== "idle" || !PRESETS.includes(id)) return false;
  replace({ preset: id });
  return true;
}

export function setStartView(id) {
  if (snapshot.mode !== "idle" || !START_VIEWS.includes(id)) return false;
  replace({ startView: id });
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
  const anim = buildAnim();
  if (!anim) return false;
  if (!validateAnimation(anim).ok) return false;
  cancelRequested = false;
  if (!api.beginExport({ ...opts, anim })) return false;
  replace({ mode: "exporting", progress: 0, message: "" });
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

/* ---- Slice D1: MP4 export status ----------------------------------------- */

// Written by the exporter only. Just these two fields; the exporter throttles
// how often it calls this (about 4 times a second), never per frame.
export function setStatus({ progress, message } = {}) {
  const patch = {};
  if (progress !== undefined) {
    const p = Math.round(Number(progress));
    patch.progress = Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
  }
  if (message !== undefined) patch.message = String(message);
  replace(patch);
}

// Asks a running export to stop at the next frame. True only while exporting.
export function cancelExport() {
  if (snapshot.mode !== "exporting") return false;
  cancelRequested = true;
  return true;
}

export const isCancelRequested = () => cancelRequested;

export function clearCancel() {
  cancelRequested = false;
}

// The stage's canvas (the one stepExport draws on), or null with no stage.
export function getCanvas() {
  const api = apiRef.current;
  return api && api.getCanvas ? api.getCanvas() : null;
}
