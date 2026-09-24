/* Garage G11 — the 3D gizmo's rules, as plain JS.
   ---------------------------------------------------------------------------
   No three.js, no DOM, no React: StudioCanvas.jsx owns the TransformControls
   instance and asks this module every question that has a right answer.

   - Which selection gets a gizmo (Owner decision 1): exactly ONE entry, a
     main-product part with Parts on, or an added object. The caller adds the
     engine-side check that the thing is actually shown.
   - Mode / space / snap settings (decisions 2, 4, 5), in a tiny store in the
     pattern of garageMode.js, plus the W/E/R shortcut filter.
   - Turning what the gizmo did to an Object3D (position, quaternion, scale)
     into the SAME values the G4 numeric fields use: metres, degrees (Euler
     XYZ), a plain scale factor, rounded to the 3 decimals the fields show,
     with snapping, the 0.05 minimum scale and, for added objects, one uniform
     scale (decision 3). A component the drag did not change keeps its start
     value exactly, so a move on X never rewrites Y and Z.
   - One drag = one garageStore gesture = one undo step (decision 6).

   Nothing here throws on bad input. */

export const GIZMO_MODES = Object.freeze(["translate", "rotate", "scale"]);
export const GIZMO_SPACES = Object.freeze(["world", "local"]);
export const MODE_LABELS = Object.freeze({ translate: "Move", rotate: "Rotate", scale: "Scale" });
export const MODE_KEYS = Object.freeze({ w: "translate", e: "rotate", r: "scale" });

// Decision 5 — snap steps (metres, degrees, scale factor).
export const SNAP = Object.freeze({ translate: 0.05, rotate: 15, scale: 0.1 });
// Decision 3 — the same floor as the numeric fields and layout.js.
export const MIN_SCALE = 0.05;
// Owner-approved (G11 follow-up): a gizmo scale drag never goes above 100.
// TransformControls' uniform cube scales by |end| / |start| from the gizmo
// centre, so a press near the centre could otherwise give millions. Gizmo
// drags only: the numeric fields and layout.js keep their own rules.
export const MAX_SCALE = 100;
// The numeric fields display Math.round(n * 1000) / 1000.
export const FIELD_DECIMALS = 3;

// Below these a component counts as untouched by the drag.
const EPS = Object.freeze({ pos: 1e-9, rotDeg: 1e-7, scale: 1e-9 });

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isVec = (v, n) => Array.isArray(v) && v.length === n && v.every(isNum);
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

/* ---- numbers ---- */

// Rounds to the fields' 3 decimals (never returns -0).
export function quantize(n) {
  if (!isNum(n)) return 0;
  const q = Math.round(n * 1000) / 1000;
  return q === 0 ? 0 : q;
}

// The nearest multiple of step, computed in thousandths so 0.15 comes out as
// the same double that typing "0.15" gives (never 0.15000000000000002).
export function snapTo(n, step) {
  if (!isNum(n)) return 0;
  const k = Math.round(step * 1000);
  if (!(k > 0)) return quantize(n);
  const q = (Math.round((n * 1000) / k) * k) / 1000;
  return q === 0 ? 0 : q;
}

// Decision 3 — at least MIN_SCALE; with snap on, the smallest snapped value
// that is still >= MIN_SCALE is one snap step. At most MAX_SCALE (a multiple
// of every snap step, so it is also a snapped value).
export function clampScale(n, snap) {
  if (!isNum(n)) return n === Infinity ? MAX_SCALE : snap ? SNAP.scale : MIN_SCALE;
  if (snap) return Math.min(MAX_SCALE, Math.max(SNAP.scale, snapTo(n, SNAP.scale)));
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, quantize(n)));
}

/* ---- rotations: degrees (Euler XYZ, as three.js reads them) <-> quaternion ---- */

// [x, y, z, w] for Euler XYZ in degrees (three.js Quaternion.setFromEuler).
export function quatFromEulerDeg(rot) {
  if (!isVec(rot, 3)) return [0, 0, 0, 1];
  const [x, y, z] = rot.map((d) => d * RAD);
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}

// Euler XYZ in degrees for a quaternion (three.js Euler.setFromQuaternion).
export function eulerDegFromQuat(q) {
  if (!isVec(q, 4)) return [0, 0, 0];
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  const [x, y, z, w] = q.map((c) => c / len);
  const m11 = 1 - 2 * (y * y + z * z);
  const m12 = 2 * (x * y - w * z);
  const m13 = 2 * (x * z + w * y);
  const m22 = 1 - 2 * (x * x + z * z);
  const m23 = 2 * (y * z - w * x);
  const m32 = 2 * (y * z + w * x);
  const m33 = 1 - 2 * (x * x + y * y);
  const ry = Math.asin(Math.max(-1, Math.min(1, m13)));
  let rx;
  let rz;
  if (Math.abs(m13) < 0.9999999) {
    rx = Math.atan2(-m23, m33);
    rz = Math.atan2(-m12, m11);
  } else {
    rx = Math.atan2(m32, m22);
    rz = 0;
  }
  return [rx * DEG, ry * DEG, rz * DEG];
}

// The same orientation written as close to `start` as possible: Euler XYZ has
// two solutions (x, y, z) and (x+180, 180-y, z+180), each defined up to 360
// per component. Keeps a rotation about one axis from rewriting the others
// (e.g. an object stored at 200 degrees stays near 200, not -160).
export function nearestEuler(rot, start) {
  if (!isVec(rot, 3)) return [0, 0, 0];
  if (!isVec(start, 3)) return rot.slice();
  const wrap = (c, s) => c + 360 * Math.round((s - c) / 360);
  const cands = [rot, [rot[0] + 180, 180 - rot[1], rot[2] + 180]].map((c) => c.map((v, i) => wrap(v, start[i])));
  const cost = (c) => c.reduce((a, v, i) => a + Math.abs(v - start[i]), 0);
  return cost(cands[1]) < cost(cands[0]) ? cands[1] : cands[0];
}

/* ---- which selection gets a gizmo (decision 1) ---- */

// { kind: "part" | "object", itemId, partId } or null. The caller still checks
// that the part / object exists and is shown (a hidden thing gets no gizmo).
export function gizmoTarget({ pickMode, selection, primaryItemId, objectPartId } = {}) {
  if (!Array.isArray(selection) || selection.length !== 1) return null;
  const e = selection[0];
  if (!e || typeof e.itemId !== "string" || typeof e.partId !== "string") return null;
  if (e.itemId === primaryItemId) {
    if (pickMode !== true || e.partId === objectPartId) return null;
    return { kind: "part", itemId: e.itemId, partId: e.partId };
  }
  if (e.partId !== objectPartId) return null;
  return { kind: "object", itemId: e.itemId, partId: e.partId };
}

// TransformControls always scales along the object's own axes.
export const effectiveSpace = (mode, space) => (mode === "scale" ? "local" : space === "local" ? "local" : "world");

/* ---- W / E / R (decision 2) ---- */

const TEXT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

// The mode a keydown asks for, or null. Never with Ctrl / Meta / Alt (so the
// browser keeps Ctrl+R, Ctrl+W, ...) and never while typing in a field.
export function shortcutMode({ key, ctrlKey, metaKey, altKey, targetTag, isContentEditable } = {}) {
  if (ctrlKey || metaKey || altKey) return null;
  if (isContentEditable || (typeof targetTag === "string" && TEXT_TAGS.has(targetTag.toUpperCase()))) return null;
  if (typeof key !== "string" || key.length !== 1) return null;
  return MODE_KEYS[key.toLowerCase()] ?? null;
}

/* ---- a drag's result in the fields' units ---- */

// start: { pos:[3], rot:[3] (deg), scale:[3] } — the values the fields show
// (for an added object scale is [s, s, s]). live: { pos:[3], quat:[4],
// scale:[3] } — the Object3D after the gizmo moved it. Only the mode's own
// key can change; within it, a component the drag left alone keeps its start
// value exactly and a changed one is rounded to the fields' 3 decimals (or
// snapped). Returns fresh { pos, rot, scale } or null on bad input.
export function resolveDrag({ kind, mode, start, live, snap } = {}) {
  if (!start || !isVec(start.pos, 3) || !isVec(start.rot, 3) || !isVec(start.scale, 3)) return null;
  if (!live || !isVec(live.pos, 3) || !isVec(live.quat, 4) || !isVec(live.scale, 3)) return null;
  if (!GIZMO_MODES.includes(mode)) return null;
  const out = { pos: start.pos.slice(), rot: start.rot.slice(), scale: start.scale.slice() };
  const on = snap === true;
  if (mode === "translate") {
    out.pos = start.pos.map((s, i) => {
      const v = live.pos[i];
      if (Math.abs(v - s) <= EPS.pos) return s;
      return on ? snapTo(v, SNAP.translate) : quantize(v);
    });
  } else if (mode === "rotate") {
    const rot = nearestEuler(eulerDegFromQuat(live.quat), start.rot);
    out.rot = start.rot.map((s, i) => {
      const v = rot[i];
      if (Math.abs(v - s) <= EPS.rotDeg) return s;
      return on ? snapTo(v, SNAP.rotate) : quantize(v);
    });
  } else if (kind === "object") {
    // Decision 3 — one uniform scale: the component the drag moved most.
    const s0 = start.scale[0];
    let v = live.scale[0];
    for (const c of live.scale) if (Math.abs(c - s0) > Math.abs(v - s0)) v = c;
    const s = Math.abs(v - s0) <= EPS.scale ? s0 : clampScale(v, on);
    out.scale = [s, s, s];
  } else {
    out.scale = start.scale.map((s, i) => {
      const v = live.scale[i];
      if (Math.abs(v - s) <= EPS.scale) return s;
      return clampScale(v, on);
    });
  }
  return out;
}

// The Object3D pose the fields describe (what the preview shows mid-drag):
// { pos, quat, scale }, fresh arrays.
export function poseFromFields(fields) {
  if (!fields || !isVec(fields.pos, 3) || !isVec(fields.rot, 3) || !isVec(fields.scale, 3)) return null;
  return { pos: fields.pos.slice(), quat: quatFromEulerDeg(fields.rot), scale: fields.scale.slice() };
}

/* ---- the G4 / G7a conventions ---- */

// An added object's item transform { x, y, z, rx, ry, rz, s } as fields.
export function fieldsFromItemTransform(t) {
  if (!t || typeof t !== "object") return null;
  const n = (v, d) => (isNum(v) ? v : d);
  const s = n(t.s, 1);
  return {
    pos: [n(t.x, 0), n(t.y, 0), n(t.z, 0)],
    rot: [n(t.rx, 0), n(t.ry, 0), n(t.rz, 0)],
    scale: [s, s, s],
  };
}

// The item-transform patch for garageStore.setItemTransform: only the keys the
// mode can change (the rest of the transform stays exactly as stored).
export function itemPatchFromFields(fields, mode) {
  if (!fields) return null;
  if (mode === "translate") return { x: fields.pos[0], y: fields.pos[1], z: fields.pos[2] };
  if (mode === "rotate") return { rx: fields.rot[0], ry: fields.rot[1], rz: fields.rot[2] };
  if (mode === "scale") return { s: fields.scale[0] };
  return null;
}

// The patch for garageMode.commitPartEdit (absolute pos / rot / scale, the
// same shape the numeric fields send): only the mode's own key.
export function partPatchFromFields(fields, mode) {
  if (!fields) return null;
  if (mode === "translate") return { pos: fields.pos.slice() };
  if (mode === "rotate") return { rot: fields.rot.slice() };
  if (mode === "scale") return { scale: fields.scale.slice() };
  return null;
}

/* ---- one drag = one gesture = one undo step (decision 6) ---- */

// store: a garageStore (beginGesture / endGesture / cancelGesture). finish()
// runs the commit inside the open gesture, then closes it: one history entry
// when the layout changed, none when it did not. cancel() restores the layout
// at begin() with no history entry.
export function createDragSession(store) {
  let open = false;
  return {
    get open() {
      return open;
    },
    begin() {
      if (open) return { ok: false, reason: "gesture-open" };
      const r = store.beginGesture();
      open = !!(r && r.ok);
      return r && typeof r === "object" ? r : { ok: false, reason: "invalid" };
    },
    finish(commit) {
      if (!open) return { ok: false, reason: "no-gesture" };
      let committed = null;
      try {
        if (typeof commit === "function") committed = commit();
      } catch {
        committed = null;
      }
      open = false;
      const r = store.endGesture();
      return { ok: !!(r && r.ok), changed: !!(r && r.changed), committed };
    },
    cancel() {
      if (!open) return { ok: false, reason: "no-gesture" };
      open = false;
      const r = store.cancelGesture();
      return { ok: !!(r && r.ok), changed: !!(r && r.changed) };
    },
  };
}

/* ---- the settings store: mode, space, snap (decisions 2, 4, 5) ---- */

export function createGizmoSettings() {
  let snapshot = Object.freeze({ mode: "translate", space: "world", snap: false });
  const listeners = new Set();
  const set = (patch) => {
    const next = { ...snapshot, ...patch };
    if (next.mode === snapshot.mode && next.space === snapshot.space && next.snap === snapshot.snap) return false;
    snapshot = Object.freeze(next);
    for (const fn of Array.from(listeners)) {
      try {
        fn();
      } catch {
        // a listener must never break the store or the other listeners
      }
    }
    return true;
  };
  return {
    subscribe(fn) {
      if (typeof fn !== "function") return () => false;
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => snapshot,
    setMode: (mode) => (GIZMO_MODES.includes(mode) ? set({ mode }) : false),
    setSpace: (space) => (GIZMO_SPACES.includes(space) ? set({ space }) : false),
    toggleSpace: () => set({ space: snapshot.space === "world" ? "local" : "world" }),
    setSnap: (on) => (typeof on === "boolean" ? set({ snap: on }) : false),
    toggleSnap: () => set({ snap: !snapshot.snap }),
  };
}

// The app's one shared instance.
const defaultSettings = createGizmoSettings();

export const { subscribe, getSnapshot, setMode, setSpace, toggleSpace, setSnap, toggleSnap } = defaultSettings;
