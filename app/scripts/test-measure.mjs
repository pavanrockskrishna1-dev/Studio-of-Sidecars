// Garage M0 — checks for app/src/garage/measure.js: cm/in conversion,
// deriveCalibration's validation (length > 0 and <= 100 m, axis size >
// 1e-6), formatSize/formatDistance (calibrated and uncalibrated), the
// injected-storage calibration and display-unit helpers (round trip,
// corrupt data, missing storage), and the live measure-mode store (active,
// pick/clearPoints, setUnit persistence, touchCalibration). Plain node, no
// browser, no three.js.
// Run from the app folder:  node scripts/test-measure.mjs   (exit code 1 on any FAIL)
import * as m from "../src/garage/measure.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

const near = (a, b, eps = 1e-9) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= eps;

// A tiny in-memory storage with the same shape as window.localStorage, plus
// switches to simulate a broken one.
function fakeStorage({ throwOnGet = false, throwOnSet = false } = {}) {
  const map = new Map();
  return {
    getItem: (k) => {
      if (throwOnGet) throw new Error("boom");
      return map.has(k) ? map.get(k) : null;
    },
    setItem: (k, v) => {
      if (throwOnSet) throw new Error("boom");
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

/* ============================ unit conversion ============================ */
check("metersToUnit cm", near(m.metersToUnit(1, "cm"), 100));
check("metersToUnit in", near(m.metersToUnit(1, "in"), 1 / 0.0254));
check("metersToUnit defaults to cm for an unknown unit", near(m.metersToUnit(1, "bogus"), 100));
check("unitToMeters cm", near(m.unitToMeters(132.1, "cm"), 1.321));
check("unitToMeters in", near(m.unitToMeters(1, "in"), 0.0254));
check("round trip m -> cm -> m", near(m.unitToMeters(m.metersToUnit(2.5, "cm"), "cm"), 2.5));
check("round trip m -> in -> m", near(m.unitToMeters(m.metersToUnit(2.5, "in"), "in"), 2.5));
check("metersToUnit refuses non-finite input", m.metersToUnit(NaN, "cm") === null && m.metersToUnit(Infinity, "cm") === null);
check("unitToMeters refuses non-finite input", m.unitToMeters(undefined, "cm") === null);

/* ============================ deriveCalibration =========================== */
{
  const r = m.deriveCalibration({ axisModelUnits: 1.321, length: 132.1, unit: "cm" });
  check("deriveCalibration: a plain case succeeds", r.ok && near(r.metersPerModelUnit, 1, 1e-6), JSON.stringify(r));
}
{
  const r = m.deriveCalibration({ axisModelUnits: 2, length: 100, unit: "in" });
  check("deriveCalibration: inches convert before dividing", r.ok && near(r.metersPerModelUnit, 1.27, 1e-6), JSON.stringify(r));
}
check(
  "deriveCalibration: length must be > 0",
  m.deriveCalibration({ axisModelUnits: 1, length: 0, unit: "cm" }).ok === false &&
    m.deriveCalibration({ axisModelUnits: 1, length: -5, unit: "cm" }).ok === false
);
check(
  "deriveCalibration: length <= 100 m is the boundary",
  m.deriveCalibration({ axisModelUnits: 1, length: 10000, unit: "cm" }).ok === true && // exactly 100 m
    m.deriveCalibration({ axisModelUnits: 1, length: 10000.1, unit: "cm" }).ok === false
);
check(
  "deriveCalibration: axis size must be > 1e-6 (model units)",
  m.deriveCalibration({ axisModelUnits: 1e-6, length: 10, unit: "cm" }).ok === false &&
    m.deriveCalibration({ axisModelUnits: 1e-6 + 1e-9, length: 10, unit: "cm" }).ok === true
);
check(
  "deriveCalibration: refuses bad axis/length types without throwing",
  m.deriveCalibration({ axisModelUnits: NaN, length: 10, unit: "cm" }).ok === false &&
    m.deriveCalibration({ axisModelUnits: 1, length: "10", unit: "cm" }).ok === false &&
    m.deriveCalibration().ok === false
);
check("deriveCalibration: every failure carries a message", typeof m.deriveCalibration({}).message === "string" && m.deriveCalibration({}).message.length > 0);

/* ============================== formatting =============================== */
check(
  "formatSize: calibrated shows real units to 1 decimal",
  m.formatSize({ x: 1.321, y: 0.559, z: 0.559 }, 1, "cm") === "132.1 x 55.9 x 55.9 cm"
);
check(
  "formatSize: same calibration in inches",
  m.formatSize({ x: 1, y: 1, z: 1 }, 1, "in") === `${(1 / 0.0254).toFixed(1)} x ${(1 / 0.0254).toFixed(1)} x ${(1 / 0.0254).toFixed(1)} in`
);
check(
  "formatSize: uncalibrated falls back to model units with the existing suffix",
  m.formatSize({ x: 1.2345, y: 0.5, z: 2 }, null, "cm") === "1.235 x 0.5 x 2 (model units, real size unknown)"
);
check("formatSize: no calibration factor at all behaves the same as null", m.formatSize({ x: 1, y: 1, z: 1 }, undefined, "cm").endsWith("real size unknown)"));
check("formatSize: a missing/invalid size never throws", m.formatSize(null, 1, "cm").includes("real size unknown") && m.formatSize({ x: "x" }, 1, "cm").includes("real size unknown"));
check("formatDistance: calibrated", m.formatDistance(1.321, 1, "cm") === "132.1 cm");
check("formatDistance: uncalibrated", m.formatDistance(1.321, null, "cm") === "1.321 (model units, real size unknown)");
check("formatDistance: a non-number distance never throws", m.formatDistance(null, 1, "cm").includes("real size unknown"));

/* ============================ calibration storage ========================= */
{
  const s = fakeStorage();
  check("readCalibration: nothing stored yet is null", m.readCalibration(s, "asset-a") === null);
  check("writeCalibration then readCalibration round-trips", m.writeCalibration(s, "asset-a", 0.5) && near(m.readCalibration(s, "asset-a"), 0.5));
  check("calibrationKey is namespaced per asset", m.calibrationKey("asset-a") === "sos-units:asset-a" && m.readCalibration(s, "asset-b") === null);
  check("clearCalibration removes it", m.clearCalibration(s, "asset-a") && m.readCalibration(s, "asset-a") === null);
  check("markAsMetres stores exactly 1", m.markAsMetres(s, "asset-c") && m.readCalibration(s, "asset-c") === 1);
  check("writeCalibration refuses a non-positive factor", m.writeCalibration(s, "asset-d", 0) === false && m.writeCalibration(s, "asset-d", -1) === false);
  check("writeCalibration refuses a missing assetId", m.writeCalibration(s, "", 1) === false);
  s._map.set(m.calibrationKey("asset-e"), "not json");
  check("readCalibration on corrupt JSON returns null, never throws", m.readCalibration(s, "asset-e") === null);
  s._map.set(m.calibrationKey("asset-f"), JSON.stringify({ metersPerModelUnit: "nope" }));
  check("readCalibration on a non-numeric field returns null", m.readCalibration(s, "asset-f") === null);
  check("readCalibration/writeCalibration with no storage never throw", m.readCalibration(null, "x") === null && m.writeCalibration(null, "x", 1) === false);
  const broken = fakeStorage({ throwOnSet: true });
  check("writeCalibration on a throwing storage returns false, never throws", m.writeCalibration(broken, "x", 1) === false);
  const brokenGet = fakeStorage({ throwOnGet: true });
  check("readCalibration on a throwing storage returns null, never throws", m.readCalibration(brokenGet, "x") === null);
}

/* ============================ display-unit storage ========================= */
{
  const s = fakeStorage();
  check("readDisplayUnit defaults to cm", m.readDisplayUnit(s) === "cm");
  check("writeDisplayUnit then readDisplayUnit round-trips", m.writeDisplayUnit(s, "in") && m.readDisplayUnit(s) === "in");
  check("writeDisplayUnit refuses an unknown unit", m.writeDisplayUnit(s, "ft") === false && m.readDisplayUnit(s) === "in");
  check("readDisplayUnit with no storage defaults to cm, never throws", m.readDisplayUnit(null) === "cm");
  s._map.set(m.DISPLAY_UNIT_KEY, "in");
  check("readDisplayUnit reads back a raw stored value", m.readDisplayUnit(s) === "in");
}

/* ============================== the live store ============================= */
{
  const st = m.createMeasureState({ storage: fakeStorage() });
  const snap0 = st.getSnapshot();
  check("a fresh store starts inactive with no points and cm", !snap0.active && snap0.pointA === null && snap0.pointB === null && snap0.unit === "cm");
  check("the snapshot is frozen", Object.isFrozen(snap0));

  let calls = 0;
  const un = st.subscribe(() => {
    calls += 1;
  });

  check("setActive(true) turns Measure on and notifies once", st.setActive(true) && calls === 1 && st.getSnapshot().active === true);
  check("setActive(true) again is a no-op", st.setActive(true) === false && calls === 1);
  check("pick() while inactive is refused", (st.setActive(false), calls === 2, st.pick([1, 2, 3])) === false);

  st.setActive(true);
  calls = 0;
  check("first pick sets point A only", st.pick([1, 0, 0]) && calls === 1);
  const afterA = st.getSnapshot();
  check("point A is stored, point B is still null", afterA.pointA && afterA.pointA[0] === 1 && afterA.pointB === null);
  check("second pick sets point B, keeps point A", st.pick([4, 0, 0]) && calls === 2 && st.getSnapshot().pointA[0] === 1 && st.getSnapshot().pointB[0] === 4);
  check("a third pick starts a fresh pair (Owner decision 7)", st.pick([9, 9, 9]) && st.getSnapshot().pointA[0] === 9 && st.getSnapshot().pointB === null);
  check("pick() refuses a malformed point", st.pick([1, 2]) === false && st.pick("nope") === false && st.pick(null) === false);

  st.pick([1, 1, 1]); // give it a full pair again
  calls = 0;
  check("clearPoints empties both points and notifies", st.clearPoints() && calls === 1 && st.getSnapshot().pointA === null && st.getSnapshot().pointB === null);
  check("clearPoints with nothing to clear is a no-op", st.clearPoints() === false && calls === 1);

  st.pick([1, 1, 1]);
  st.pick([2, 2, 2]);
  calls = 0;
  check("turning Measure off clears the pair too (Owner decision 7)", st.setActive(false) && calls === 1 && st.getSnapshot().pointA === null);

  calls = 0;
  check("setUnit(in) switches unit and notifies", st.setUnit("in") && calls === 1 && st.getSnapshot().unit === "in");
  check("setUnit with the same unit is a no-op but reports true", st.setUnit("in") === true && calls === 1);
  check("setUnit refuses an unknown unit", st.setUnit("ft") === false && st.getSnapshot().unit === "in");

  calls = 0;
  const before = st.getSnapshot().calibrationRev;
  st.touchCalibration();
  check("touchCalibration bumps calibrationRev and notifies", st.getSnapshot().calibrationRev === before + 1 && calls === 1);

  un();
  st.setUnit("cm");
  check("an unsubscribed listener hears nothing more", calls === 1);
}

{
  // The display unit persists through the injected storage, independent of
  // any particular store instance (e.g. across a page reload).
  const s = fakeStorage();
  const st1 = m.createMeasureState({ storage: s });
  st1.setUnit("in");
  const st2 = m.createMeasureState({ storage: s });
  check("a new store reads the persisted display unit on creation", st2.getSnapshot().unit === "in");
}

check("the app's shared instance starts inactive with no points", !m.getSnapshot().active && m.getSnapshot().pointA === null);
check("UNITS lists cm and in", m.UNITS.length === 2 && m.UNITS.includes("cm") && m.UNITS.includes("in") && Object.isFrozen(m.UNITS));

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
