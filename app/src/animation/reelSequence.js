/* Slice C2b - the Reel shot list (pure data rules, no DOM, no three.js).
   ---------------------------------------------------------------------------
   A sequence is an array of 1 to MAX_SHOTS shots { move, startView, durationS }:
   move is "turntable" or a C2a camera move, startView one of the 6 camera
   presets or "custom", durationS 4, 8 or 12. The total never passes
   MAX_TOTAL_S. Every edit returns { seq, ok, reason }: on a refused edit seq is
   the unchanged input and reason is the sentence the Reel sheet shows. Shots
   are joined by hard cuts: shot k owns frames [start, end) at the export fps,
   and the cut frames are the first frame of every shot after the first.
   Also the session form of a sequence (plain JSON) and its sanitizing parser.
   Slice C3a: a shot may also carry `keys` (reelKeys.js); the field is present
   only when the shot has keys, so a Reel without keys is exactly as before.
   A shot may carry frameOn: "start" (frame on the keyed product pose at the
   shot's first frame); absent means "end", the default (the last frame).
   Slice C4a: a shot may also carry `cycles` (reelCycles.js), likewise present
   only when the shot has cycles. */

import { SHOT_MOVES, makeShot, makeTurntable } from "./path.js";
import { keysToSession, sanitizeKeys } from "./reelKeys.js";
import { cyclesToSession, sanitizeCycles } from "./reelCycles.js";

export const MAX_SHOTS = 5;
export const MAX_TOTAL_S = 30;
export const SHOT_DURATIONS = Object.freeze([4, 8, 12]);
export const REEL_MOVES = Object.freeze(["turntable", ...SHOT_MOVES]);
export const REEL_START_VIEWS = Object.freeze(["Front", "Side", "3/4", "Rear", "Top", "Low Hero", "custom"]);

export const defaultShot = () => Object.freeze({ move: "orbit", startView: "3/4", durationS: 8 });
export const defaultSequence = () => Object.freeze([defaultShot()]);

const isShot = (s) =>
  !!s &&
  REEL_MOVES.includes(s.move) &&
  REEL_START_VIEWS.includes(s.startView) &&
  SHOT_DURATIONS.includes(s.durationS) &&
  (s.frameOn === undefined || s.frameOn === "start" || s.frameOn === "end");
// frameOn is stored only as "start" ("end" is the default and is dropped)
const normFrameOn = (s) => {
  if (s.frameOn !== "end") return s;
  const rest = { ...s };
  delete rest.frameOn;
  return rest;
};

export const totalDuration = (seq) => seq.reduce((n, s) => n + s.durationS, 0);

const done = (seq) => ({ seq: Object.freeze(seq.map((s) => Object.freeze({ ...s }))), ok: true, reason: "" });
const refuse = (seq, reason) => ({ seq, ok: false, reason });

// Can one more shot be added? { ok, reason, durationS (the new shot's length) }
export function canAdd(seq) {
  if (seq.length >= MAX_SHOTS) return { ok: false, reason: `A Reel can have at most ${MAX_SHOTS} shots.`, durationS: 0 };
  const left = MAX_TOTAL_S - totalDuration(seq);
  const fit = [8, 4].find((d) => d <= left);
  if (!fit) return { ok: false, reason: `The Reel is already ${totalDuration(seq)} s; a new shot needs at least 4 s and the limit is ${MAX_TOTAL_S} s.`, durationS: 0 };
  return { ok: true, reason: "", durationS: fit };
}

export function addShot(seq) {
  const c = canAdd(seq);
  if (!c.ok) return refuse(seq, c.reason);
  return done([...seq, { ...defaultShot(), durationS: c.durationS }]);
}

export function deleteShot(seq, i) {
  if (!Number.isInteger(i) || i < 0 || i >= seq.length) return refuse(seq, "No such shot.");
  if (seq.length <= 1) return refuse(seq, "A Reel needs at least one shot.");
  return done(seq.filter((_, k) => k !== i));
}

// dir -1 = up (earlier), +1 = down (later)
export function moveShot(seq, i, dir) {
  const j = i + dir;
  if (!Number.isInteger(i) || i < 0 || i >= seq.length || (dir !== -1 && dir !== 1)) return refuse(seq, "No such shot.");
  if (j < 0 || j >= seq.length) return refuse(seq, dir < 0 ? "Already the first shot." : "Already the last shot.");
  const next = [...seq];
  [next[i], next[j]] = [next[j], next[i]];
  return done(next);
}

// Would setting shot i to n seconds keep the total within the limit?
export function durationAllowed(seq, i, n) {
  if (!SHOT_DURATIONS.includes(n)) return { ok: false, reason: "Durations are 4, 8 or 12 s." };
  const total = totalDuration(seq) - seq[i].durationS + n;
  if (total > MAX_TOTAL_S) return { ok: false, reason: `${n} s would make the Reel ${total} s; the limit is ${MAX_TOTAL_S} s.` };
  return { ok: true, reason: "" };
}

export function setShot(seq, i, patch) {
  if (!Number.isInteger(i) || i < 0 || i >= seq.length) return refuse(seq, "No such shot.");
  const next = { ...seq[i], ...patch };
  if (!isShot(next)) return refuse(seq, "That setting is not available.");
  if (patch.durationS !== undefined) {
    const a = durationAllowed(seq, i, patch.durationS);
    if (!a.ok) return refuse(seq, a.reason);
  }
  return done(seq.map((s, k) => (k === i ? normFrameOn(next) : s)));
}

// Slice C3a: replaces shot i's keys (an empty list removes the field).
// Slice C4a: the shot's cycles are kept (and setShotCycles keeps the keys).
const shotBase = (s) => ({ move: s.move, startView: s.startView, durationS: s.durationS, ...(s.frameOn === "start" ? { frameOn: "start" } : {}) });
const withList = (o, name, list) => (Array.isArray(list) && list.length ? { ...o, [name]: list } : o);
export function setShotKeys(seq, i, keys) {
  if (!Number.isInteger(i) || i < 0 || i >= seq.length) return refuse(seq, "No such shot.");
  return done(seq.map((s, k) => (k !== i ? s : withList(withList(shotBase(s), "keys", keys), "cycles", s.cycles))));
}

// Slice C4a: replaces shot i's cycles (an empty list removes the field).
export function setShotCycles(seq, i, cycles) {
  if (!Number.isInteger(i) || i < 0 || i >= seq.length) return refuse(seq, "No such shot.");
  return done(seq.map((s, k) => (k !== i ? s : withList(withList(shotBase(s), "keys", s.keys), "cycles", cycles))));
}

// Frame ranges [start, end) of every shot, and the cut frames (first frame of
// shots 2..N), at fps.
export function shotFrameRanges(seq, fps = 30) {
  let f = 0;
  return seq.map((s) => {
    const n = Math.round(s.durationS * fps);
    const r = { start: f, end: f + n };
    f += n;
    return r;
  });
}

export const totalFrames = (seq, fps = 30) => shotFrameRanges(seq, fps).reduce((n, r) => n + (r.end - r.start), 0);

export const cutFrames = (seq, fps = 30) => shotFrameRanges(seq, fps).slice(1).map((r) => r.start);

// The shot that owns frame f (at fps): { index, localFrame } or null.
export function shotAtFrame(seq, f, fps = 30) {
  const ranges = shotFrameRanges(seq, fps);
  const k = ranges.findIndex((r) => f >= r.start && f < r.end);
  return k < 0 ? null : { index: k, localFrame: f - ranges[k].start };
}

/* ---- the anim Play and Export run ---- */

// One Turntable shot alone is exactly the pre-C2b Turntable (makeTurntable: the
// model spins from the live camera, loops in preview). One camera move alone is
// exactly the C2a shot (makeShot). Anything else is a sequence anim: no model
// spin of its own, durationS = the total, shot.move "sequence". Every non-
// Turntable anim carries reel.shots: per shot { move, startView, durationS, f0,
// f1 (its frames [f0, f1) at fps), t0 (= f0 / fps) }.
export function buildReelAnim(seq, fps = 30) {
  if (!Array.isArray(seq) || seq.length < 1 || seq.length > MAX_SHOTS || !seq.every(isShot)) return null;
  if (totalDuration(seq) > MAX_TOTAL_S) return null;
  // Slice C4a: a shot's cycles ride along with its keys (each only when present)
  const keysOf = (s) => ({
    ...(Array.isArray(s.keys) && s.keys.length ? { keys: s.keys, ...(s.frameOn === "start" ? { frameOn: "start" } : {}) } : {}),
    ...(Array.isArray(s.cycles) && s.cycles.length ? { cycles: s.cycles } : {}),
  });
  if (seq.length === 1 && seq[0].move === "turntable") return { ...makeTurntable({ durationS: seq[0].durationS, fps }), ...keysOf(seq[0]) };
  const ranges = shotFrameRanges(seq, fps);
  const shots = seq.map((s, k) => ({ move: s.move, startView: s.startView, durationS: s.durationS, f0: ranges[k].start, f1: ranges[k].end, t0: ranges[k].start / fps, ...keysOf(s) }));
  if (seq.length === 1) return { ...makeShot({ move: seq[0].move, durationS: seq[0].durationS, fps }), reel: { shots } };
  return { v: 1, durationS: totalDuration(seq), fps, loop: false, ease: "linear", model: { spinTurns: 0 }, cam: null, shot: { move: "sequence" }, reel: { shots } };
}

// The shot of a reel anim at time t (seconds): { index, shot, local (seconds
// into the shot) }. Exports step exactly t = i / fps, so the frame index i is
// recovered and local = (i - f0) / fps: every shot's frames are bit-for-bit
// the frames of that shot exported alone.
export function reelShotAt(anim, t) {
  const shots = anim?.reel?.shots;
  if (!shots || !shots.length) return null;
  const fps = anim.fps || 30;
  const i = Math.max(0, Math.round(t * fps));
  let k = shots.findIndex((s) => i >= s.f0 && i < s.f1);
  if (k < 0) k = i < shots[0].f0 ? 0 : shots.length - 1;
  return { index: k, shot: shots[k], local: (i - shots[k].f0) / fps };
}

// Preview (continuous time): the shot playing at ts seconds, or null past the end.
export function reelShotAtTime(anim, ts) {
  const shots = anim?.reel?.shots;
  if (!shots || !(ts >= 0) || ts >= anim.durationS) return null;
  let k = shots.length - 1;
  while (k > 0 && ts < shots[k].t0) k -= 1;
  return { index: k, shot: shots[k], local: ts - shots[k].t0 };
}

/* ---- session form ---- */

export const sequenceToSession = (seq) =>
  seq.map((s) => ({
    move: s.move,
    startView: s.startView,
    durationS: s.durationS,
    ...(s.frameOn === "start" ? { frameOn: "start" } : {}),
    ...(Array.isArray(s.keys) && s.keys.length ? { keys: keysToSession(s.keys) } : {}),
    ...(Array.isArray(s.cycles) && s.cycles.length ? { cycles: cyclesToSession(s.cycles) } : {}),
  }));

// A sanitized sequence from saved data, or null when nothing usable is there
// (bad shots are dropped; the shot count and the 30 s limit are enforced).
export function sequenceFromSession(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  let total = 0;
  for (const s of raw) {
    if (!isShot(s) || out.length >= MAX_SHOTS || total + s.durationS > MAX_TOTAL_S) continue;
    const keys = sanitizeKeys(s.keys);
    const cycles = sanitizeCycles(s.cycles);
    out.push({ move: s.move, startView: s.startView, durationS: s.durationS, ...(s.frameOn === "start" ? { frameOn: "start" } : {}), ...(keys ? { keys } : {}), ...(cycles ? { cycles } : {}) });
    total += s.durationS;
  }
  return out.length ? done(out).seq : null;
}
