/* Animation Studio (Phase 16B, Slice B + C) — the Turntable's state hub.
   ---------------------------------------------------------------------------
   Same pattern as camera/cameraStudio.js: a module singleton holding a
   read-only snapshot plus the module-level apiRef the stage registers its
   commands in. The Inspector Rail reads the snapshot with useSyncExternalStore
   and calls play / stop and the shot-list edits; play and the export go
   through the stage.

   The snapshot is { mode, ready, durationS, progress, message, sequence,
   shot }; mode is "idle" | "previewing" | "exporting" (Slice C:
   deterministic frame stepping, see beginExport below), progress is an integer
   0-100 and message a string (both written by the MP4 exporter through
   setStatus, throttled by it). Slice C2b: `sequence` is the Reel shot list
   (reelSequence.js: 1 to 5 shots { move, startView, durationS }, at most 30 s)
   and durationS is always its total (the MP4 exporter reads durationS for its
   frame count); `shot` is the index of the shot the stage is playing (-1 when
   not previewing), reported by the stage once per shot change. The snapshot
   changes on Play, Stop, a shot-list edit, a shot change, an export status
   update and when the stage registers or goes away, and NEVER per frame:
   the spin angle lives in a ref inside the stage and is applied straight to the
   pivot group. The store holds no camera and no model state.

   The one DOM side effect: document.body.dataset.anim is "1" while previewing
   and "export" while exporting (removed on idle), so the shell CSS can shield
   the controls that would fight the animation. */

import { validateAnimation } from "./path.js";
import * as reel from "./reelSequence.js";
import * as rkeys from "./reelKeys.js";
import * as rcycles from "./reelCycles.js";
import { endCardFits, brandingState } from "../poster/branding.js";

export const DURATIONS = reel.SHOT_DURATIONS;

// Slice C2a / C2b: a shot is the Turntable (the model spins) or a camera move;
// every shot starts from one of the 6 camera presets or the saved custom view.
export const PRESETS = reel.REEL_MOVES;
export const START_VIEWS = reel.REEL_START_VIEWS;

const initialSequence = reel.defaultSequence();
let snapshot = Object.freeze({
  mode: "idle",
  ready: false,
  durationS: reel.totalDuration(initialSequence),
  progress: 0,
  message: "",
  sequence: initialSequence,
  shot: -1,
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
    next.sequence === snapshot.sequence &&
    next.shot === snapshot.shot
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
  replace({ mode: "idle", shot: -1 });
}

// Stage only (Slice C2b): the preview moved on to shot `index` (0-based).
export function reportShot(index) {
  if (snapshot.mode !== "previewing" || !Number.isInteger(index)) return;
  replace({ shot: index });
}

// The animation Play and Export run (reelSequence.buildReelAnim): one
// Turntable shot is exactly the pre-C2b Turntable, one camera move exactly the
// C2a shot, more shots a sequence joined by hard cuts.
const buildAnim = () => reel.buildReelAnim(snapshot.sequence, 30);

// Null-safe commands: false when no stage is registered.
export function play() {
  const api = apiRef.current;
  if (!api || snapshot.mode !== "idle") return false;
  const anim = buildAnim();
  if (!anim) return false;
  if (!validateAnimation(anim).ok) return false;
  if (!api.play(anim)) return false;
  replace({ mode: "previewing", shot: anim.reel ? 0 : -1 });
  return true;
}

// Stops a running PREVIEW only; an export is ended with endExport().
export function stop() {
  const api = apiRef.current;
  if (!api || snapshot.mode !== "previewing") return false;
  const stopped = api.stop();
  replace({ mode: "idle", shot: -1 });
  return stopped;
}

/* ---- Slice C2b: the shot list ------------------------------------------- */

// Every edit goes through reelSequence (the 5-shot and 30 s rules) and only
// while idle. Returns { ok, reason }: reason is the sentence the Reel sheet
// shows when an edit is refused.
function edit(result) {
  if (snapshot.mode !== "idle") return { ok: false, reason: "Stop the preview or export first." };
  if (result.ok) {
    // Slice R1: with the end card on, a longer Reel must still fit the 28 s limit
    const total = reel.totalDuration(result.seq);
    if (total > snapshot.durationS && brandingState.getSnapshot().endCard) {
      const fit = endCardFits(total);
      if (!fit.ok) return { ok: false, reason: fit.reason + " Turn the end card off or shorten a shot." };
    }
    replace({ sequence: result.seq, durationS: total });
  }
  return { ok: result.ok, reason: result.reason };
}

export const getSequence = () => snapshot.sequence;
export const addShot = () => edit(reel.addShot(snapshot.sequence));
export const deleteShot = (i) => edit(reel.deleteShot(snapshot.sequence, i));
export const moveShot = (i, dir) => edit(reel.moveShot(snapshot.sequence, i, dir));
export const setShot = (i, patch) => edit(reel.setShot(snapshot.sequence, i, patch));

// Session (Save / Restore / Reset): the plain form saved, a sanitized restore
// (false when the saved data holds no usable shot) and the default list (one
// Orbit shot from 3/4, 8 s). A running preview is stopped first; an export
// refuses.
export const sequenceForSession = () => reel.sequenceToSession(snapshot.sequence);

function loadSequence(seq) {
  if (snapshot.mode === "exporting") return false;
  if (snapshot.mode === "previewing") stop();
  replace({ sequence: seq, durationS: reel.totalDuration(seq) });
  return true;
}

export function restoreSequence(raw) {
  const seq = reel.sequenceFromSession(raw);
  return seq ? loadSequence(seq) : false;
}

export const resetSequence = () => loadSequence(reel.defaultSequence());

/* ---- Slice C3a: keys for whole objects, per shot ------------------------- */

// Every key edit goes through reelKeys (the 8-key limit, frame snapping) and
// only while idle; it replaces the shot's keys and returns { ok, reason }.
function editKeys(i, fn) {
  if (snapshot.mode !== "idle") return { ok: false, reason: "Stop the preview or export first." };
  const shot = snapshot.sequence[i];
  if (!shot) return { ok: false, reason: "No such shot." };
  const r = fn(shot.keys ?? [], shot.durationS);
  if (!r.ok) return { ok: false, reason: r.reason };
  return edit(reel.setShotKeys(snapshot.sequence, i, r.keys));
}

// key = { t, target, assetId, transform, easing? }
export const addKey = (i, key) => editKeys(i, (keys, d) => rkeys.addKey(keys, key, d));
export const deleteKey = (i, k) => editKeys(i, (keys) => rkeys.deleteKey(keys, k));
export const setKeyEasing = (i, k, easing) => editKeys(i, (keys) => rkeys.setKeyEasing(keys, k, easing));
// Slice C3b: the Custom curve of key k, and the pivot of a part group in shot i
export const setKeyCurve = (i, k, bezier) => editKeys(i, (keys) => rkeys.setKeyCurve(keys, k, bezier));
export const setKeyPivot = (i, target, pivot) => editKeys(i, (keys) => rkeys.setKeyPivot(keys, target, pivot));

/* ---- Slice C4a: cycles (looping motions), per shot ----------------------- */

// Same rules as the keys: only while idle, through reelCycles (the 6-cycle
// limit and the value ranges); returns { ok, reason }.
function editCycles(i, fn) {
  if (snapshot.mode !== "idle") return { ok: false, reason: "Stop the preview or export first." };
  const shot = snapshot.sequence[i];
  if (!shot) return { ok: false, reason: "No such shot." };
  const r = fn(shot.cycles ?? []);
  if (!r.ok) return { ok: false, reason: r.reason };
  return edit(reel.setShotCycles(snapshot.sequence, i, r.cycles));
}

// cycle = { type, target, assetId, parts? | group?, ...type fields (defaults filled) }
export const addCycle = (i, cycle) => editCycles(i, (cycles) => rcycles.addCycle(cycles, cycle));
export const deleteCycle = (i, k) => editCycles(i, (cycles) => rcycles.deleteCycle(cycles, k));
export const setCycle = (i, k, patch) => editCycles(i, (cycles) => rcycles.setCycle(cycles, k, patch));

// The main product's pose is the whole-model Transform panel, owned by the
// engine: App registers { read(), write(transform) } here (read returns
// { x, y, z, rx, ry, rz, s }; write sets the panel values).
export const poseApiRef = { current: null };
export function registerPoseApi(api) {
  poseApiRef.current = api;
  return () => {
    if (poseApiRef.current === api) poseApiRef.current = null;
  };
}
export const readProductTransform = () => poseApiRef.current?.read?.() ?? null;
export const writeProductTransform = (t) => (poseApiRef.current?.write ? (poseApiRef.current.write(t), true) : false);

// The stage's check of the keyed Reel against the Instagram safe area and the
// painted platform (first offending shot and time, or null). Never blocks.
export function checkKeys() {
  const api = apiRef.current;
  if (!api || !api.checkKeys || snapshot.mode !== "idle") return null;
  const anim = buildAnim();
  return anim ? api.checkKeys(anim) : null;
}

/* ---- Slice C: deterministic frame stepping ------------------------------- */

// Prepares the stage to render the Reel one exact frame at a time at
// { width, height } (default 1080x1920), on the same visible canvas as the PNG
// export. Only from idle, so a running preview refuses it. The anim (the
// current shot list) is fixed here and used for every step.
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
