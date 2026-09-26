/* Garage M0 — real-size calibration, cm/in display, and the two-point
   measure tool, as plain JS.
   ---------------------------------------------------------------------------
   Three things live here, in the pattern of the other Garage modules:

   1. Pure size/unit math (no three.js, no DOM): converting a model-unit size
      or distance into a real-unit string, and deriving a calibration factor
      from a "set real size" action. Nothing here throws.
   2. Storage helpers for calibration and the display-unit choice, each
      taking an injected `storage` object ({ getItem, setItem, removeItem },
      the same shape as window.localStorage — the exact convention
      layoutLibrary.js uses), so node tests never touch a real localStorage.
      Calibration key: "sos-units:<assetId>" (Owner decision 4 — per model,
      on this device, for built-ins and imported assets alike). Display-unit
      key: "sos-units-display" (Owner decision 6).
   3. A tiny external store, in the pattern of gizmo.js's settings store, for
      the two cross-component bits neither StudioCanvas nor InspectorRail
      owns alone: whether Measure mode is on, the current two picked points
      (world-space [x,y,z], or null), and the live cm/in display choice
      (initialised from storage, persisted on every change). A calibration
      write/clear bumps `calibrationRev` so every reader (the rail's Size
      line, the measure label) knows to re-read storage, without this module
      caching calibration values itself — storage stays the one source of
      truth for them. */

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isStr = (s) => typeof s === "string" && s !== "";
const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);
const isPoint = (p) => Array.isArray(p) && p.length === 3 && p.every(isNum);

/* ---- units ---- */

export const UNITS = Object.freeze(["cm", "in"]);
const M_PER_IN = 0.0254;

export function metersToUnit(meters, unit) {
  if (!isNum(meters)) return null;
  return unit === "in" ? meters / M_PER_IN : meters * 100;
}

export function unitToMeters(value, unit) {
  if (!isNum(value)) return null;
  return unit === "in" ? value * M_PER_IN : value / 100;
}

/* ---- calibration math (Owner decision 2) ---- */

export const MAX_REAL_LENGTH_M = 100;
export const MIN_AXIS_MODEL_UNITS = 1e-6;

// { ok:true, metersPerModelUnit } or { ok:false, message }. axisModelUnits is
// the chosen axis's CURRENT size in model units (the same number the rail's
// Size line shows for that axis); length/unit is what the owner typed.
export function deriveCalibration({ axisModelUnits, length, unit } = {}) {
  const u = unit === "in" ? "in" : "cm";
  if (!isNum(axisModelUnits) || axisModelUnits <= MIN_AXIS_MODEL_UNITS) {
    return { ok: false, message: "This axis is too small to calibrate from." };
  }
  if (!isNum(length) || length <= 0) {
    return { ok: false, message: "Enter a real length greater than 0." };
  }
  const meters = unitToMeters(length, u);
  if (!isNum(meters) || meters <= 0) {
    return { ok: false, message: "Enter a real length greater than 0." };
  }
  if (meters > MAX_REAL_LENGTH_M) {
    return { ok: false, message: `Enter a real length of ${MAX_REAL_LENGTH_M} m or less.` };
  }
  return { ok: true, metersPerModelUnit: meters / axisModelUnits };
}

/* ---- formatting (Owner decisions 1 and 7) ---- */

const fmt1 = (n) => (isNum(n) ? n.toFixed(1) : "?");
const fmtModelUnits = (n) => (isNum(n) ? String(Math.round(n * 1000) / 1000) : "?");

// sizeModelUnits: { x, y, z } (or null). metersPerModelUnit: a positive
// finite number, or null/undefined when uncalibrated. unit: "cm" | "in".
// Calibrated: "132.1 x 55.9 x 55.9 cm". Uncalibrated: the model-units string
// with the existing "(real size unknown)" suffix.
export function formatSize(sizeModelUnits, metersPerModelUnit, unit) {
  const u = unit === "in" ? "in" : "cm";
  if (!sizeModelUnits || !isNum(sizeModelUnits.x) || !isNum(sizeModelUnits.y) || !isNum(sizeModelUnits.z)) {
    return "? x ? x ? (model units, real size unknown)";
  }
  if (isNum(metersPerModelUnit) && metersPerModelUnit > 0) {
    const toDisplay = (v) => metersToUnit(v * metersPerModelUnit, u);
    return `${fmt1(toDisplay(sizeModelUnits.x))} x ${fmt1(toDisplay(sizeModelUnits.y))} x ${fmt1(toDisplay(sizeModelUnits.z))} ${u}`;
  }
  return `${fmtModelUnits(sizeModelUnits.x)} x ${fmtModelUnits(sizeModelUnits.y)} x ${fmtModelUnits(sizeModelUnits.z)} (model units, real size unknown)`;
}

// distanceModelUnits: a number (or null). Same calibrated / uncalibrated
// split as formatSize, for the measure tool's label (Owner decision 7).
export function formatDistance(distanceModelUnits, metersPerModelUnit, unit) {
  const u = unit === "in" ? "in" : "cm";
  if (!isNum(distanceModelUnits)) return "? (model units, real size unknown)";
  if (isNum(metersPerModelUnit) && metersPerModelUnit > 0) {
    return `${fmt1(metersToUnit(distanceModelUnits * metersPerModelUnit, u))} ${u}`;
  }
  return `${fmtModelUnits(distanceModelUnits)} (model units, real size unknown)`;
}

/* ---- storage: calibration, per model (Owner decisions 3 and 4) ---- */

const CALIBRATION_PREFIX = "sos-units:";
export const DISPLAY_UNIT_KEY = "sos-units-display";

export function calibrationKey(assetId) {
  return `${CALIBRATION_PREFIX}${assetId}`;
}

// A positive finite metres-per-model-unit factor, or null (no storage, no
// entry, or a corrupt one).
export function readCalibration(storage, assetId) {
  if (!isObj(storage) || !isStr(assetId)) return null;
  try {
    const raw = storage.getItem(calibrationKey(assetId));
    if (!isStr(raw)) return null;
    const parsed = JSON.parse(raw);
    const m = isObj(parsed) ? parsed.metersPerModelUnit : undefined;
    return isNum(m) && m > 0 ? m : null;
  } catch {
    return null;
  }
}

export function writeCalibration(storage, assetId, metersPerModelUnit) {
  if (!isObj(storage) || !isStr(assetId) || !isNum(metersPerModelUnit) || metersPerModelUnit <= 0) return false;
  try {
    storage.setItem(calibrationKey(assetId), JSON.stringify({ metersPerModelUnit }));
    return true;
  } catch {
    return false;
  }
}

export function clearCalibration(storage, assetId) {
  if (!isObj(storage) || !isStr(assetId)) return false;
  try {
    storage.removeItem(calibrationKey(assetId));
    return true;
  } catch {
    return false;
  }
}

// Owner decision 3 — "File is in metres": 1 model unit = 1 m, the same
// storage shape as any other calibration.
export function markAsMetres(storage, assetId) {
  return writeCalibration(storage, assetId, 1);
}

/* ---- storage: the display-unit toggle (Owner decision 6) ---- */

export function readDisplayUnit(storage) {
  if (!isObj(storage)) return "cm";
  try {
    return storage.getItem(DISPLAY_UNIT_KEY) === "in" ? "in" : "cm";
  } catch {
    return "cm";
  }
}

export function writeDisplayUnit(storage, unit) {
  if (!isObj(storage) || (unit !== "cm" && unit !== "in")) return false;
  try {
    storage.setItem(DISPLAY_UNIT_KEY, unit);
    return true;
  } catch {
    return false;
  }
}

function safeLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/* ---- the live store: Measure mode, its two points, and the display unit ---
   In the pattern of gizmo.js's createGizmoSettings(): a factory (for tests,
   so each gets its own isolated state) plus one shared instance the app
   uses. active/pointA/pointB are never persisted (ephemeral UI state); the
   display unit is, via the storage helpers above, read once at creation and
   written on every change. */

export function createMeasureState({ storage = safeLocalStorage() } = {}) {
  let snapshot = Object.freeze({
    active: false,
    pointA: null,
    pointB: null,
    unit: readDisplayUnit(storage),
    calibrationRev: 0,
  });
  const listeners = new Set();
  const notify = () => {
    for (const fn of Array.from(listeners)) {
      try {
        fn();
      } catch {
        // a listener must never break the store or the other listeners
      }
    }
  };
  const set = (patch) => {
    snapshot = Object.freeze({ ...snapshot, ...patch });
    notify();
  };
  const api = {
    subscribe(fn) {
      if (typeof fn !== "function") return () => false;
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => snapshot,
    // Turning OFF also clears the current pair (Owner decision 7: "leaving
    // measure mode clears it").
    setActive(on) {
      const v = on === true;
      if (v === snapshot.active) return false;
      set(v ? { active: true } : { active: false, pointA: null, pointB: null });
      return true;
    },
    toggleActive() {
      return api.setActive(!snapshot.active);
    },
    // A new pair replaces the old one (Owner decision 7): the first click of
    // a fresh pair sets point A and clears any old B; the next sets B.
    pick(point) {
      if (!snapshot.active || !isPoint(point)) return false;
      if (!snapshot.pointA || snapshot.pointB) {
        set({ pointA: point, pointB: null });
      } else {
        set({ pointB: point });
      }
      return true;
    },
    // Esc while measuring (Owner decision 7): clears the pair without
    // turning Measure mode off.
    clearPoints() {
      if (!snapshot.pointA && !snapshot.pointB) return false;
      set({ pointA: null, pointB: null });
      return true;
    },
    setUnit(unit) {
      if (unit !== "cm" && unit !== "in") return false;
      if (unit === snapshot.unit) return true;
      writeDisplayUnit(storage, unit);
      set({ unit });
      return true;
    },
    // Called after a calibration write/clear (Set real size, File is in
    // metres, Reset real size) so every subscriber re-reads storage.
    touchCalibration() {
      set({ calibrationRev: snapshot.calibrationRev + 1 });
    },
  };
  return api;
}

const defaultMeasure = createMeasureState();
export const {
  subscribe,
  getSnapshot,
  setActive,
  toggleActive,
  pick,
  clearPoints,
  setUnit,
  touchCalibration,
} = defaultMeasure;
