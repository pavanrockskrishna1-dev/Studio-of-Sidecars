// Phase 16B Slice A — numeric checks for the path engine and fitDistance.
// Run from the app folder:  node scripts/test-path.mjs   (exit code 1 on any FAIL)
// Plain node, no browser, no three.js, no test framework.
import { readFileSync } from "node:fs";
import {
  makeTurntable,
  makeMove,
  validateAnimation,
  frameCount,
  frameTimes,
  sampleAt,
  reelPose,
  elevationForBaseAngle,
  panToAnchor,
  platformReelPose,
} from "../src/animation/path.js";
import { backdropImageAspect } from "../src/capture/backdropCrop.js";
import { ENVIRONMENTS } from "../src/environments/registry.js";
import { fitDistance } from "../src/camera/presets.js";

let failed = 0;
const fmt = (v) => (typeof v === "number" ? v.toPrecision(12) : JSON.stringify(v));
function check(name, ok, detail = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const maxDiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const DEG = Math.PI / 180;

/* ---- turntable ---- */
const tt = makeTurntable();
const v = validateAnimation(tt);
check("makeTurntable() validates ok", v.ok, v.errors.join("; "));
check("frameCount is 240", frameCount(tt) === 240, `frameCount=${frameCount(tt)}`);
const times = frameTimes(tt);
check("frameTimes has 240 entries", times.length === 240, `length=${times.length}`);
check("frameTimes first is 0", times[0] === 0, `first=${times[0]}`);
check("frameTimes last is 239/30", times[239] === 239 / 30, `last=${times[239]}`);
check("frameTimes strictly increasing", times.every((t, i) => i === 0 || t > times[i - 1]));

// With loop true a t of exactly T wraps to 0 (as specified), so the end value
// of one turn is read from a loop:false copy, which runs the same math.
const open = { ...tt, loop: false };
const spinDiff = sampleAt(open, 8).modelSpinRad - sampleAt(open, 0).modelSpinRad;
check(
  "loop closure: spin(T) - spin(0) = 2*pi (loop:false copy)",
  near(spinDiff, 2 * Math.PI, 1e-9),
  `error=${fmt(spinDiff - 2 * Math.PI)}`
);
check(
  "loop closure: loop:true, sample(T) equals sample(0)",
  sampleAt(tt, 8).modelSpinRad === sampleAt(tt, 0).modelSpinRad
);
const s10 = sampleAt(tt, 10).modelSpinRad;
const s2 = sampleAt(tt, 2).modelSpinRad;
check("sampleAt(10) equals sampleAt(2) within 1e-12", near(s10, s2, 1e-12), `diff=${fmt(s10 - s2)}`);
check("turntable has no camera", sampleAt(tt, 3).camera === null);
check(
  "spin is linear: t=2 gives pi/2",
  near(sampleAt(tt, 2).modelSpinRad, Math.PI / 2, 1e-12),
  fmt(sampleAt(tt, 2).modelSpinRad)
);
const rev = makeTurntable({ turns: -1 });
check(
  "turns=-1, t=2 gives -pi/2",
  near(sampleAt(rev, 2).modelSpinRad, -Math.PI / 2, 1e-12),
  fmt(sampleAt(rev, 2).modelSpinRad)
);

/* ---- validateAnimation rejections ---- */
const goodMove = () =>
  makeMove(
    { position: [0, 0, 5], target: [0, 0, 0], fov: 45 },
    { position: [5, 0, 0], target: [0, 0, 0], fov: 45 }
  );
check("goodMove validates ok", validateAnimation(goodMove()).ok, validateAnimation(goodMove()).errors.join("; "));
const bad = (name, build) => {
  const r = validateAnimation(build());
  check(`rejects ${name}`, !r.ok && r.errors.length > 0, r.errors.join("; "));
};
bad("non-integer spinTurns with loop true", () => makeTurntable({ turns: 1.5 }));
bad("loop true with easeInOut", () => ({ ...makeTurntable(), ease: "easeInOut" }));
bad("durationS 0", () => makeTurntable({ durationS: 0 }));
bad("fps 0", () => makeTurntable({ fps: 0 }));
bad("cam with one key", () => ({ ...goodMove(), cam: [goodMove().cam[0]] }));
bad("unsorted key times", () => {
  const a = goodMove();
  a.cam = [a.cam[0], { ...a.cam[1], t: 2 }, { ...a.cam[1], t: 1 }];
  return a;
});
bad("NaN in a position", () => {
  const a = goodMove();
  a.cam[0].position[1] = NaN;
  return a;
});
bad("position equal to target", () => {
  const a = goodMove();
  a.cam[1].position = [...a.cam[1].target];
  return a;
});

/* ---- makeMove ---- */
const at = (az, el, r, target = [0, 0, 0]) => ({
  position: [
    target[0] + r * Math.cos(el * DEG) * Math.sin(az * DEG),
    target[1] + r * Math.sin(el * DEG),
    target[2] + r * Math.cos(el * DEG) * Math.cos(az * DEG),
  ],
  target,
  fov: 45,
});
const A = at(30, 10, 6, [0.5, 1, -0.5]);
const B = at(-100, 25, 6, [-1, 2, 0.5]);
const mv = makeMove(A, B, { durationS: 4 });
check("makeMove validates ok", validateAnimation(mv).ok);
const c0 = sampleAt(mv, 0).camera;
const cT = sampleAt(mv, 4).camera;
const d0 = maxDiff([...c0.position, ...c0.target, c0.fov], [...A.position, ...A.target, A.fov]);
const dT = maxDiff([...cT.position, ...cT.target, cT.fov], [...B.position, ...B.target, B.fov]);
check("makeMove t=0 equals from", d0 <= 1e-9, `maxDiff=${fmt(d0)}`);
check("makeMove t=T equals to", dT <= 1e-9, `maxDiff=${fmt(dT)}`);

const radiusOf = (c) => Math.hypot(...c.position.map((p, i) => p - c.target[i]));
let rMin = Infinity;
let rMax = -Infinity;
let allFinite = true;
for (let i = 0; i <= 1000; i += 1) {
  const c = sampleAt(mv, (4 * i) / 1000).camera;
  const r = radiusOf(c);
  rMin = Math.min(rMin, r);
  rMax = Math.max(rMax, r);
  if (![...c.position, ...c.target, c.fov].every(Number.isFinite)) allFinite = false;
}
check("equal radii: radius constant over 1000 samples", rMax - rMin <= 1e-9, `min=${fmt(rMin)} max=${fmt(rMax)}`);
check("all 1001 samples finite", allFinite);

const azOf = (c) => Math.atan2(c.position[0] - c.target[0], c.position[2] - c.target[2]);
const arc0 = makeMove(at(170, 10, 5), at(-170, 10, 5), { durationS: 2, ease: "linear" });
const mid0 = azOf(sampleAt(arc0, 1).camera);
check(
  "shortest arc 170 -> -170: midpoint |azimuth| ~ 180 deg",
  near(Math.abs(mid0) / DEG, 180, 1e-6),
  `midAz=${fmt(mid0 / DEG)} deg`
);
const arc1 = makeMove(at(170, 10, 5), at(-170, 10, 5), { durationS: 2, ease: "linear", spin: 1 });
const mid1 = azOf(sampleAt(arc1, 1).camera);
const TAU = 2 * Math.PI;
const raw = (((mid1 - mid0) % TAU) + TAU) % TAU; // shift mod 2*pi in [0, 2*pi)
check(
  "spin=1 shifts midpoint azimuth by pi",
  near(raw, Math.PI, 1e-6),
  `midAz(spin0)=${fmt(mid0 / DEG)} deg, midAz(spin1)=${fmt(mid1 / DEG)} deg, shift=${fmt(raw / DEG)} deg`
);
const arcE = sampleAt(arc1, 2).camera;
check(
  "spin=1 still ends on `to`",
  near(radiusOf(arcE), 5, 1e-9) && near(azOf(arcE), -170 * DEG, 1e-9),
  `endAz=${fmt(azOf(arcE) / DEG)} deg`
);

const hi = at(30, 89.9, 5);
const clamp = makeMove(hi, hi, { durationS: 1 });
const cc = sampleAt(clamp, 0).camera;
const phi = Math.asin((cc.position[1] - cc.target[1]) / radiusOf(cc));
check(
  "elevation 89.9 deg clamps to 89 deg, not NaN",
  Number.isFinite(phi) && near(phi / DEG, 89, 1e-9),
  `phi=${fmt(phi / DEG)} deg`
);

let radiusBad = false;
for (const m of [mv, arc0, arc1, clamp]) {
  for (let i = 0; i <= 1000; i += 1) {
    const r = radiusOf(sampleAt(m, (m.durationS * i) / 1000).camera);
    if (!(r > 0)) radiusBad = true; // also true for NaN
  }
}
check("radius never <= 0 or NaN (4 moves x 1001 samples)", !radiusBad);

check("non-loop t=-1 equals t=0", JSON.stringify(sampleAt(mv, -1)) === JSON.stringify(sampleAt(mv, 0)));
check("non-loop t=T+5 equals t=T", JSON.stringify(sampleAt(mv, 9)) === JSON.stringify(sampleAt(mv, 4)));

/* ---- fitDistance ---- */
// VERBATIM from app/src/components/StudioCanvas.jsx lines 364-373 (FOV = 45,
// fill 0.7 written inline there); only the inputs are parameterised.
function inlineFit(size, aspect) {
  const FOV = 45;
  const vFov = (FOV * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distV = size.y / 2 / Math.tan(vFov / 2);
  const distH =
    Math.hypot(size.x, size.z) / 2 / Math.tan(hFov / 2);
  const distance = Math.max(distV, distH) / 0.7;
  return distance;
}
// The product registry stores no bounding size, so these are SAMPLE sizes.
const SAMPLES = [
  ["Coffee Bike-like SAMPLE", { x: 2.2, y: 1.2, z: 0.9 }],
  ["Cessna-like SAMPLE", { x: 11, y: 2.7, z: 8.3 }],
];
for (const [label, size] of SAMPLES) {
  for (const [aname, aspect] of [["9/16", 9 / 16], ["16/9", 16 / 9]]) {
    const ref = inlineFit(size, aspect);
    const off = fitDistance(size, aspect, 45, 0.7);
    const on = fitDistance(size, aspect, 45, 0.7, { spinSafe: true });
    check(`fitDistance spinSafe off == inline: ${label} @ ${aname}`, off === ref, `inline=${fmt(ref)} fit=${fmt(off)}`);
    check(`fitDistance spinSafe on >= off: ${label} @ ${aname}`, on >= off, `on=${fmt(on)} off=${fmt(off)}`);
    check(
      `fitDistance deterministic: ${label} @ ${aname}`,
      fitDistance(size, aspect, 45, 0.7, { spinSafe: true }) === on
    );
  }
}
// The brief asked for a strict ">" for the Cessna-like size at 9/16. The inline
// formula's horizontal extent is already hypot(x, z) (azimuth-independent), so
// the two settings are identical and a strict ">" cannot hold. Recorded as a
// fact instead of being faked.
{
  const s = SAMPLES[1][1];
  const off = fitDistance(s, 9 / 16, 45, 0.7);
  const on = fitDistance(s, 9 / 16, 45, 0.7, { spinSafe: true });
  check(
    "NOTE Cessna-like @ 9/16: spinSafe on == off (brief's strict '>' is not satisfiable)",
    on === off,
    `on=${fmt(on)} off=${fmt(off)}`
  );
}

/* ---- reelPose (Slice C) ---- */
const sph = (p, t) => {
  const x = p[0] - t[0];
  const y = p[1] - t[1];
  const z = p[2] - t[2];
  const r = Math.hypot(x, y, z);
  return { r, az: Math.atan2(x, z), el: Math.asin(y / r) };
};
const reelInputs = [
  { pos: [3, 1, 4], tgt: [0.2, 0.5, 0.1], centre: [1, 0.6, -2], dist: 7 },
  { pos: [-5, 2, -1], tgt: [0, 1, 0], centre: [0.5, 1, 0.5], dist: 12.5 },
  { pos: [0.5, -1, 6], tgt: [0, 0, 0], centre: [-3, 2, 1], dist: 3 },
  { pos: [8, 4, -8], tgt: [1, 1, 1], centre: [0, 0.4, 0], dist: 42.245 },
  { pos: [-2, 3, 2], tgt: [-1, 0.2, 0.3], centre: [2, 2, 2], dist: 0.75 },
];
reelInputs.forEach((c, i) => {
  const p = reelPose(c.pos, c.tgt, c.centre, c.dist);
  const got = sph(p.position, p.target);
  const want = sph(c.pos, c.tgt);
  check(`reelPose #${i + 1}: distance from target = requested`, near(got.r, c.dist, 1e-9), `r=${fmt(got.r)} want=${c.dist}`);
  check(
    `reelPose #${i + 1}: azimuth and elevation kept`,
    near(got.az, want.az, 1e-9) && near(got.el, want.el, 1e-9),
    `dAz=${fmt(got.az - want.az)} dEl=${fmt(got.el - want.el)}`
  );
  check(`reelPose #${i + 1}: target equals the centre`, p.target.every((v, j) => v === c.centre[j]));
});
{
  const inp = { pos: [0, Math.sin(89.9 * DEG) * 5, Math.cos(89.9 * DEG) * 5], tgt: [0, 0, 0], centre: [1, 1, 1] };
  const p = reelPose(inp.pos, inp.tgt, inp.centre, 5);
  const g = sph(p.position, p.target);
  check(
    "reelPose: elevation 89.9 deg comes back at 89 deg, not NaN",
    p.position.every(Number.isFinite) && near(g.el / DEG, 89, 1e-9),
    `el=${fmt(g.el / DEG)} deg`
  );
}
const okPos = [3, 1, 4];
const okTgt = [0, 0, 0];
const okCen = [1, 1, 1];
check("reelPose: null for a zero-length offset", reelPose([1, 2, 3], [1, 2, 3], okCen, 5) === null);
check("reelPose: null for distance 0", reelPose(okPos, okTgt, okCen, 0) === null);
check("reelPose: null for distance NaN", reelPose(okPos, okTgt, okCen, NaN) === null);
check("reelPose: null for a NaN in the live position", reelPose([NaN, 1, 4], okTgt, okCen, 5) === null);
check("reelPose: null for a NaN in the live target", reelPose(okPos, [0, NaN, 0], okCen, 5) === null);
check("reelPose: null for a NaN in the centre", reelPose(okPos, okTgt, [1, 1, NaN], 5) === null);
check("reelPose: null for a negative distance", reelPose(okPos, okTgt, okCen, -2) === null);
check("reelPose returns fresh arrays", (() => {
  const c = [1, 1, 1];
  const p = reelPose(okPos, okTgt, c, 5);
  return p.target !== c && p.position !== okPos;
})());

/* ---- Slice E1: reelPose regression against the HEAD version ---- */
// VERBATIM from git HEAD (git show HEAD:app/src/animation/path.js): the helpers
// and reelPose exactly as they were before the optional elevationDeg argument.
const HEAD_PHI_LIMIT = (89 * Math.PI) / 180;
const headIsNum = (n) => typeof n === "number" && Number.isFinite(n);
const headIsVec3 = (a) => Array.isArray(a) && a.length === 3 && a.every(headIsNum);
function headToSpherical(position, target) {
  const x = position[0] - target[0];
  const y = position[1] - target[1];
  const z = position[2] - target[2];
  const r = Math.hypot(x, y, z);
  const phi = r > 0 ? Math.asin(Math.max(-1, Math.min(1, y / r))) : 0;
  return {
    r,
    theta: Math.atan2(x, z),
    phi: Math.max(-HEAD_PHI_LIMIT, Math.min(HEAD_PHI_LIMIT, phi)),
  };
}
function headReelPose(livePosition, liveTarget, centre, distance) {
  if (!headIsVec3(livePosition) || !headIsVec3(liveTarget) || !headIsVec3(centre)) return null;
  if (!headIsNum(distance) || distance <= 0) return null;
  const { r, theta, phi } = headToSpherical(livePosition, liveTarget);
  if (!Number.isFinite(r) || r <= 1e-9) return null;
  const cp = Math.cos(phi);
  return {
    position: [
      centre[0] + distance * cp * Math.sin(theta),
      centre[1] + distance * Math.sin(phi),
      centre[2] + distance * cp * Math.cos(theta),
    ],
    target: [centre[0], centre[1], centre[2]],
  };
}
// end of the verbatim copy

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const deepSame = (a, b) => {
  if (a === null || b === null) return a === b;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => deepSame(v, b[i]));
  if (typeof a === "object") {
    const ka = Object.keys(a);
    return typeof b === "object" && ka.length === Object.keys(b).length && ka.every((k) => deepSame(a[k], b[k]));
  }
  return Object.is(a, b);
};
{
  const rnd = mulberry32(20260920);
  const rv = (s) => [(rnd() - 0.5) * s, (rnd() - 0.5) * s, (rnd() - 0.5) * s];
  let n = 0;
  let same4 = 0;
  let sameU = 0;
  let sameN = 0;
  let nulls = 0;
  for (let i = 0; i < 2000; i += 1) {
    const live = rv(20);
    const tgt = rv(10);
    const cen = rv(6);
    let dist = rnd() * 50 + 0.01;
    let args = [live, tgt, cen, dist];
    const kind = i % 20;
    if (kind === 0) args = [live.slice(), live.slice(), cen, dist]; // zero-length offset
    else if (kind === 1) args = [live, tgt, cen, 0];
    else if (kind === 2) args = [live, tgt, cen, -dist];
    else if (kind === 3) args = [[NaN, 1, 2], tgt, cen, dist];
    else if (kind === 4) args = [live, tgt, [0, Infinity, 0], dist];
    else if (kind === 5) args = [live, tgt, cen, NaN];
    else if (kind === 6) args = [[1, 2], tgt, cen, dist];
    else if (kind === 7) args = [[0, 100, 0.0001], [0, 0, 0], cen, dist]; // near the pole
    const old = headReelPose(...args);
    if (old === null) nulls += 1;
    n += 1;
    if (deepSame(old, reelPose(...args))) same4 += 1;
    if (deepSame(old, reelPose(...args, undefined))) sameU += 1;
    if (deepSame(old, reelPose(...args, null))) sameN += 1;
  }
  check("reelPose regression vs HEAD (4 args): identical output for all inputs", same4 === n, "compared " + (n) + " inputs (" + (nulls) + " of them null cases), identical " + (same4));
  check("reelPose regression vs HEAD (5th argument undefined): identical", sameU === n, "identical " + (sameU) + " of " + (n));
  check("reelPose regression vs HEAD (5th argument null): identical", sameN === n, "identical " + (sameN) + " of " + (n));
}

/* ---- Slice E1: reelPose elevationDeg ---- */
{
  const live = [3, 1, 4];
  const tgt = [0.2, 0.5, 0.1];
  const cen = [1, 0.6, -2];
  const dist = 7;
  const azOf = (pos, t) => Math.atan2(pos[0] - t[0], pos[2] - t[2]);
  const liveAz = azOf(live, tgt);
  const p = reelPose(live, tgt, cen, dist, 3.76);
  const elev = (Math.asin((p.position[1] - p.target[1]) / Math.hypot(...p.position.map((v, i) => v - p.target[i]))) * 180) / Math.PI;
  const d = Math.hypot(...p.position.map((v, i) => v - p.target[i]));
  check("reelPose elevationDeg 3.76: elevation equals 3.76", near(elev, 3.76, 1e-9), "elevation=" + (fmt(elev)));
  check("reelPose elevationDeg 3.76: azimuth equals the live azimuth", near(azOf(p.position, p.target), liveAz, 1e-9), "dAz=" + (fmt(azOf(p.position, p.target) - liveAz)));
  check("reelPose elevationDeg 3.76: distance and target unchanged", near(d, dist, 1e-9) && p.target.every((v, i) => v === cen[i]), "dist=" + (fmt(d)));
  const el = (q) => (Math.asin((q.position[1] - q.target[1]) / Math.hypot(...q.position.map((v, i) => v - q.target[i]))) * 180) / Math.PI;
  check("reelPose elevationDeg 89.9 comes back at 89", near(el(reelPose(live, tgt, cen, dist, 89.9)), 89, 1e-9), fmt(el(reelPose(live, tgt, cen, dist, 89.9))));
  check("reelPose elevationDeg -95 comes back at -89", near(el(reelPose(live, tgt, cen, dist, -95)), -89, 1e-9), fmt(el(reelPose(live, tgt, cen, dist, -95))));
  check("reelPose elevationDeg 0 gives a horizontal camera", near(el(reelPose(live, tgt, cen, dist, 0)), 0, 1e-12));
  check("reelPose elevationDeg NaN returns null", reelPose(live, tgt, cen, dist, NaN) === null);
  check("reelPose elevationDeg Infinity returns null", reelPose(live, tgt, cen, dist, Infinity) === null);
  check("reelPose elevationDeg -Infinity returns null", reelPose(live, tgt, cen, dist, -Infinity) === null);
  check('reelPose elevationDeg "3" returns null', reelPose(live, tgt, cen, dist, "3") === null);
  check("reelPose elevationDeg on a null case is still null", reelPose(live, live.slice(), cen, dist, 3.76) === null);
  const fresh = reelPose(live, tgt, cen, dist, 3.76);
  check("reelPose elevationDeg returns fresh arrays", fresh.target !== cen && fresh.position !== live);
}

/* ---- Slice E1: elevationForBaseAngle ---- */
{
  let count = 0;
  let worst = 0;
  let bad = 0;
  for (let theta = 3; theta <= 15; theta += 1) {
    for (const h of [0.05, 0.3052, 0.6, 1.28, 2, 3, -0.4]) {
      for (const r of [2, 4.0917, 8, 20, 41.207, 60]) {
        const phi = elevationForBaseAngle(theta, h, r);
        if (phi === null) continue;
        // independent recomputation: the camera sits r from the target at
        // elevation phi; the floor point is h below the target
        const ph = (phi * Math.PI) / 180;
        const seen = (Math.atan2(r * Math.sin(ph) + h, r * Math.cos(ph)) * 180) / Math.PI;
        const err = Math.abs(seen - theta);
        worst = Math.max(worst, err);
        count += 1;
        if (err > 1e-7) bad += 1;
      }
    }
  }
  check("elevationForBaseAngle round trip: floor is seen at theta", count >= 200 && bad === 0, (count) + " combinations, worst error " + (fmt(worst)) + " deg");
  const bike = elevationForBaseAngle(8, 0.3052, 4.0917);
  const cessna = elevationForBaseAngle(8, 1.28, 41.207);
  check("elevationForBaseAngle Coffee Bike sample (theta 8, h 0.3052, d 4.0917) = 3.76 deg (from the design report, SAMPLE inputs)", near(bike, 3.76, 0.01), "got " + (fmt(bike)));
  check("elevationForBaseAngle Cessna sample (theta 8, h 1.28, d 41.207) = 6.24 deg (from the design report, SAMPLE inputs)", near(cessna, 6.24, 0.01), "got " + (fmt(cessna)));
  const nulls = [
    ["theta 0", [0, 1, 5]], ["theta 90", [90, 1, 5]], ["theta NaN", [NaN, 1, 5]], ["theta negative", [-5, 1, 5]],
    ["theta 91", [91, 1, 5]], ["theta Infinity", [Infinity, 1, 5]],
    ["distance 0", [8, 1, 0]], ["distance negative", [8, 1, -3]], ["distance NaN", [8, 1, NaN]], ["distance Infinity", [8, 1, Infinity]],
    ["heightAboveFloor NaN", [8, NaN, 5]], ["heightAboveFloor Infinity", [8, Infinity, 5]],
    ["|h cos(theta) / r| > 1 (h 10, r 1, theta 8)", [8, 10, 1]], ["|h cos(theta) / r| > 1 (h -10, r 1)", [8, -10, 1]],
  ];
  for (const [label, a] of nulls) check("elevationForBaseAngle returns null for " + (label), elevationForBaseAngle(...a) === null);
  const hi = elevationForBaseAngle(89.5, -1, 1);
  check("elevationForBaseAngle is clamped to +89 deg (theta 89.5, h -1, r 1: formula gives 90)", hi === 89, "got " + (fmt(hi)));
  const lo = elevationForBaseAngle(1, 1 / Math.cos((1 * Math.PI) / 180), 1);
  check("elevationForBaseAngle at the -89 boundary (ratio exactly 1) is -89", near(lo, -89, 1e-9), "got " + (fmt(lo)));
  check("elevationForBaseAngle with h 0 returns theta", near(elevationForBaseAngle(8, 0, 10), 8, 1e-12));
  check("elevationForBaseAngle accepts a negative height (target below the floor point)", elevationForBaseAngle(8, -0.5, 10) !== null);
}

/* ---- Slice E1: panToAnchor ---- */
{
  const DEGR = Math.PI / 180;
  // independent look-at + pinhole projection (does not call panToAnchor)
  const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sb = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const basisOf = (pos, tgt) => {
    const f = nrm(sb(tgt, pos));
    const r = nrm(crs(f, [0, 1, 0]));
    const u = crs(r, f);
    return { f, r, u };
  };
  const projectFrac = (pos, tgt, pt, fov, aspect) => {
    const { f, r, u } = basisOf(pos, tgt);
    const d = sb(pt, pos);
    const cz = dt(d, f);
    const tn = Math.tan((fov * DEGR) / 2);
    const ndcX = dt(d, r) / (cz * tn * aspect);
    const ndcY = dt(d, u) / (cz * tn);
    return { x: (ndcX + 1) / 2, y: (1 - ndcY) / 2, cz };
  };
  const poseAt = (azDeg, elDeg, dist, target) => {
    const az = azDeg * DEGR;
    const el = elDeg * DEGR;
    return {
      position: [
        target[0] + dist * Math.cos(el) * Math.sin(az),
        target[1] + dist * Math.sin(el),
        target[2] + dist * Math.cos(el) * Math.cos(az),
      ],
      target: target.slice(),
    };
  };
  const poses = [
    poseAt(0, 5, 4, [0.3, 0.6, -0.2]),
    poseAt(60, -10, 2.5, [1, 2, 3]),
    poseAt(135, 20, 12, [-2, 0.4, 1]),
    poseAt(200, 35, 30, [5, 1.3, -4]),
    poseAt(270, 60, 45, [0, 0, 0]),
    poseAt(320, 8, 8, [-1.5, 3, 0.5]),
    poseAt(-40, 2, 41, [0.06, 1.28, 0]),
  ];
  const fracs = [{ x: 0.5, y: 0.727 }, { x: 0.499, y: 0.727 }, { x: 0.3, y: 0.4 }];
  const aspects = [9 / 16, 4 / 5, 1];
  const fov = 45;
  let combos = 0;
  let worstProj = 0;
  let worstFwd = 0;
  let worstDist = 0;
  let worstMove = 0;
  let allFresh = true;
  let anyNull = false;
  for (const pose of poses) {
    const b0 = basisOf(pose.position, pose.target);
    // a base point in front of the camera, a little off the target
    const base = [pose.target[0] + 0.15, pose.target[1] - 0.4, pose.target[2] - 0.1];
    for (const fr of fracs) {
      for (const aspect of aspects) {
        const before = JSON.stringify(pose);
        const out = panToAnchor(pose, base, fr, fov, aspect);
        if (!out) { anyNull = true; continue; }
        combos += 1;
        const got = projectFrac(out.position, out.target, base, fov, aspect);
        worstProj = Math.max(worstProj, Math.abs(got.x - fr.x), Math.abs(got.y - fr.y));
        const b1 = basisOf(out.position, out.target);
        worstFwd = Math.max(worstFwd, ...b1.f.map((v, i) => Math.abs(v - b0.f[i])));
        const d0 = Math.hypot(...sb(pose.position, pose.target));
        const d1 = Math.hypot(...sb(out.position, out.target));
        worstDist = Math.max(worstDist, Math.abs(d1 - d0));
        const dPos = sb(out.position, pose.position);
        worstMove = Math.max(worstMove, ...dPos.map((v, i) => Math.abs(v - (out.shift.right * b0.r[i] + out.shift.up * b0.u[i]))));
        if (out.position === pose.position || out.target === pose.target || JSON.stringify(pose) !== before) allFresh = false;
      }
    }
  }
  check("panToAnchor: no null for valid inputs", !anyNull);
  check("panToAnchor: the base projects onto the requested frame fraction", combos >= 6 * 3 * 3 && worstProj <= 1e-9, (combos) + " pose/fraction/aspect combinations, worst error " + (fmt(worstProj)));
  check("panToAnchor: forward vector unchanged", worstFwd <= 1e-12, "worst " + (fmt(worstFwd)));
  check("panToAnchor: camera-to-target distance unchanged", worstDist <= 1e-9, "worst " + (fmt(worstDist)));
  check("panToAnchor: position shift equals shift.right * r + shift.up * u", worstMove <= 1e-12, "worst " + (fmt(worstMove)));
  check("panToAnchor: returned arrays are fresh and the input is not mutated", allFresh);
  {
    // a base that already projects exactly onto the fraction: shift is 0
    const pose = poses[2];
    const fr = { x: 0.499, y: 0.727 };
    const aspect = 9 / 16;
    const { f, r, u } = basisOf(pose.position, pose.target);
    const cz = 9;
    const tn = Math.tan((fov * DEGR) / 2);
    const tx = 2 * fr.x - 1;
    const ty = 1 - 2 * fr.y;
    const base = [0, 1, 2].map((i) => pose.position[i] + f[i] * cz + r[i] * tx * cz * tn * aspect + u[i] * ty * cz * tn);
    const out = panToAnchor(pose, base, fr, fov, aspect);
    check("panToAnchor: a base already on the target fraction gives a zero shift", Math.abs(out.shift.right) <= 1e-9 && Math.abs(out.shift.up) <= 1e-9, "right=" + (fmt(out.shift.right)) + " up=" + (fmt(out.shift.up)));
  }
  {
    const pose = poses[0];
    const fr = { x: 0.5, y: 0.7 };
    const ok = [1, 1, 1];
    const behind = pose.position.map((v, i) => v + (pose.position[i] - pose.target[i]));
    const { f } = basisOf(pose.position, pose.target);
    const onPlane = [0, 1, 2].map((i) => pose.position[i] + basisOf(pose.position, pose.target).r[i] * 2);
    void f;
    check("panToAnchor: null for a base behind the camera", panToAnchor(pose, behind, fr, fov, 0.5625) === null);
    check("panToAnchor: null for a base exactly on the camera plane (cz = 0)", panToAnchor(pose, onPlane, fr, fov, 0.5625) === null);
    const down = { position: [0, 5, 0], target: [0, 0, 0] };
    check("panToAnchor: null when looking straight down", panToAnchor(down, [0, 0, 0], fr, fov, 0.5625) === null);
    const up = { position: [0, -5, 0], target: [0, 0, 0] };
    check("panToAnchor: null when looking straight up", panToAnchor(up, [0, 0.5, 0], fr, fov, 0.5625) === null);
    check("panToAnchor: null when position equals target", panToAnchor({ position: [1, 1, 1], target: [1, 1, 1] }, ok, fr, fov, 0.5625) === null);
    check("panToAnchor: null for NaN in the position", panToAnchor({ position: [NaN, 1, 2], target: pose.target }, ok, fr, fov, 0.5625) === null);
    check("panToAnchor: null for NaN in the target", panToAnchor({ position: pose.position, target: [0, NaN, 0] }, ok, fr, fov, 0.5625) === null);
    check("panToAnchor: null for NaN in the base point", panToAnchor(pose, [0, NaN, 0], fr, fov, 0.5625) === null);
    check("panToAnchor: null for targetFrac.x NaN", panToAnchor(pose, ok, { x: NaN, y: 0.5 }, fov, 0.5625) === null);
    check("panToAnchor: null for targetFrac.y Infinity", panToAnchor(pose, ok, { x: 0.5, y: Infinity }, fov, 0.5625) === null);
    check("panToAnchor: null for a missing targetFrac", panToAnchor(pose, ok, null, fov, 0.5625) === null);
    check("panToAnchor: null for fov 0", panToAnchor(pose, ok, fr, 0, 0.5625) === null);
    check("panToAnchor: null for fov 180", panToAnchor(pose, ok, fr, 180, 0.5625) === null);
    check("panToAnchor: null for fov NaN", panToAnchor(pose, ok, fr, NaN, 0.5625) === null);
    check("panToAnchor: null for aspect 0", panToAnchor(pose, ok, fr, fov, 0) === null);
    check("panToAnchor: null for a negative aspect", panToAnchor(pose, ok, fr, fov, -0.5) === null);
    check("panToAnchor: null for a missing pose", panToAnchor(null, ok, fr, fov, 0.5625) === null);
  }
  // INFO (not pass/fail): the design-report Coffee Bike sample
  const bike = panToAnchor(
    { position: [1.3509, 0.1657, 3.8597], target: [0, 0.3052, 0] },
    [0, 0, 0],
    { x: 0.499, y: 0.727 },
    45,
    270 / 480
  );
  console.log(
    "INFO  Coffee Bike design-report sample: shift.up = " + fmt(bike.shift.up) + " m, shift.right = " + fmt(bike.shift.right) +
      " m, new target y = " + fmt(bike.target[1]) +
      "  (design report estimate: about 0.46 m up; a large disagreement means the report or the code is wrong, investigate before finishing)"
  );
}

/* ---- Slice E2: platformReelPose ---- */
{
  const DEGR = Math.PI / 180;
  const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sb = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  // independent floor angle: camera height above the base over horizontal distance
  const floorAngle = (pos, base) => Math.atan2(pos[1] - base[1], Math.hypot(pos[0] - base[0], pos[2] - base[2])) / DEGR;
  // independent look-at + pinhole projection
  const projectFrac = (pos, tgt, pt, fov, aspect) => {
    const f = nrm(sb(tgt, pos));
    const r = nrm(crs(f, [0, 1, 0]));
    const u = crs(r, f);
    const d = sb(pt, pos);
    const cz = dt(d, f);
    const tn = Math.tan((fov * DEGR) / 2);
    return { x: (dt(d, r) / (cz * tn * aspect) + 1) / 2, y: (1 - dt(d, u) / (cz * tn)) / 2 };
  };
  const azOfOffset = (pos, tgt) => Math.atan2(pos[0] - tgt[0], pos[2] - tgt[2]) / DEGR;
  const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
  const inputFor = (o) => ({ floorAngleDeg: 8, anchor: { x: 0.499, y: 0.727 }, fovDeg: 45, aspect: 270 / 480, ...o });

  const samples = [
    ["Coffee Bike", inputFor({ livePosition: [1.3509, 0.1657, 3.8597], liveTarget: [0, 0.3052, 0], centre: [0, 0.3052, 0], basePoint: [0, 0, 0], distance: 4.0917 })],
    ["Cessna", inputFor({ livePosition: [13.674, 0.6949, 38.89], liveTarget: [0.0625, 1.28, 0], centre: [0.0625, 1.28, 0], basePoint: [0.0625, 0, 0], distance: 41.207 })],
  ];
  for (const [label, inp] of samples) {
    const out = platformReelPose(inp);
    check("platformReelPose " + label + " (from the design report, SAMPLE): returns a pose", out !== null);
    const fa = floorAngle(out.position, inp.basePoint);
    check("platformReelPose " + label + ": floor angle measured independently equals 8 deg", near(fa, 8, 1e-6), "floor angle = " + fmt(fa) + " deg (returned " + fmt(out.floorAngleDeg) + ")");
    const pr = projectFrac(out.position, out.target, inp.basePoint, inp.fovDeg, inp.aspect);
    check("platformReelPose " + label + ": the base projects onto the anchor", near(pr.x, inp.anchor.x, 1e-9) && near(pr.y, inp.anchor.y, 1e-9), "(" + fmt(pr.x) + ", " + fmt(pr.y) + ")");
    const dd = Math.hypot(...sb(out.position, out.target));
    check("platformReelPose " + label + ": distance to the target unchanged", near(dd, inp.distance, 1e-9), "distance = " + fmt(dd));
    const daz = wrap180(azOfOffset(out.position, out.target) - azOfOffset(inp.livePosition, inp.liveTarget));
    check("platformReelPose " + label + ": azimuth equals the live azimuth", Math.abs(daz) <= 1e-9, "d azimuth = " + fmt(daz) + " deg");
    console.log("INFO  " + label + " SAMPLE: elevationDeg = " + fmt(out.elevationDeg) + ", shift.up = " + fmt(out.shift.up) + " m, shift.right = " + fmt(out.shift.right) + " m, camera height above the floor = " + fmt(out.position[1] - inp.basePoint[1]) + " m");
  }

  // robustness: 200 deterministic pseudo-random valid inputs
  {
    let s = 20260921;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    let nonNull = 0;
    let bad = 0;
    let worstFloor = 0;
    let worstProj = 0;
    const aspects = [9 / 16, 4 / 5, 1];
    for (let i = 0; i < 200; i += 1) {
      const dist = 2 + rnd() * 43;
      const az = rnd() * 2 * Math.PI;
      const el = (-10 + rnd() * 50) * DEGR;
      const centre = [(rnd() - 0.5) * 4, 0.3 + rnd() * 2, (rnd() - 0.5) * 4];
      const liveTarget = [centre[0] + (rnd() - 0.5) * 0.4, centre[1] + (rnd() - 0.5) * 0.4, centre[2] + (rnd() - 0.5) * 0.4];
      const liveDist = 1.5 + rnd() * 20;
      const livePosition = [
        liveTarget[0] + liveDist * Math.cos(el) * Math.sin(az),
        liveTarget[1] + liveDist * Math.sin(el),
        liveTarget[2] + liveDist * Math.cos(el) * Math.cos(az),
      ];
      const basePoint = [centre[0], centre[1] - dist * (0.02 + rnd() * 0.08), centre[2]];
      const inp = {
        livePosition, liveTarget, centre, basePoint, distance: dist,
        floorAngleDeg: 6 + rnd() * 4,
        anchor: { x: 0.3 + rnd() * 0.4, y: 0.55 + rnd() * 0.3 },
        fovDeg: 45,
        aspect: aspects[i % 3],
      };
      const out = platformReelPose(inp);
      if (out === null) continue;
      nonNull += 1;
      const fa = Math.abs(floorAngle(out.position, basePoint) - inp.floorAngleDeg);
      const pr = projectFrac(out.position, out.target, basePoint, 45, inp.aspect);
      const pe = Math.max(Math.abs(pr.x - inp.anchor.x), Math.abs(pr.y - inp.anchor.y));
      worstFloor = Math.max(worstFloor, fa);
      worstProj = Math.max(worstProj, pe);
      if (fa > 1e-6 || pe > 1e-9) bad += 1;
    }
    check("platformReelPose robustness: at least 190 of 200 random inputs give a pose", nonNull >= 190, nonNull + " non-null of 200");
    check("platformReelPose robustness: every non-null result meets the floor angle (1e-6 deg) and the projection (1e-9)", bad === 0, "worst floor angle error " + fmt(worstFloor) + " deg, worst projection error " + fmt(worstProj));
  }

  // determinism
  {
    const a = platformReelPose(samples[0][1]);
    const b = platformReelPose(samples[0][1]);
    check("platformReelPose is deterministic: the same input twice gives deep-equal output", JSON.stringify(a) === JSON.stringify(b));
    check("platformReelPose returns fresh arrays (the input arrays are not reused)", a.position !== samples[0][1].livePosition && a.target !== samples[0][1].liveTarget);
  }

  // null cases
  {
    const base = samples[0][1];
    const nul = (label, over) => check("platformReelPose returns null for " + label, platformReelPose({ ...base, ...over }) === null);
    nul("floorAngleDeg 0", { floorAngleDeg: 0 });
    nul("floorAngleDeg 89.5", { floorAngleDeg: 89.5 });
    nul("floorAngleDeg NaN", { floorAngleDeg: NaN });
    nul("a NaN in livePosition", { livePosition: [NaN, 0.1657, 3.8597] });
    nul("a NaN in liveTarget", { liveTarget: [0, NaN, 0] });
    nul("a NaN in centre", { centre: [0, 0.3052, NaN] });
    nul("a NaN in basePoint", { basePoint: [0, NaN, 0] });
    nul("distance 0", { distance: 0 });
    nul("aspect 0", { aspect: 0 });
    nul("anchor.x NaN", { anchor: { x: NaN, y: 0.727 } });
    nul("a missing anchor", { anchor: null });
    nul("fovDeg 0", { fovDeg: 0 });
    check("platformReelPose returns null for a missing input object", platformReelPose(undefined) === null);
    // no elevation in [-30, 60] can reach the angle: the base is 100 m above the camera range
    const unreachable = platformReelPose({ ...base, basePoint: [0, 100, 0], floorAngleDeg: 3 });
    check("platformReelPose returns null when no elevation in [-30, 60] reaches the angle (base 100 m above the camera)", unreachable === null);
  }

  // INFO: the approach NOT used (elevationForBaseAngle combined with panToAnchor)
  {
    const inp = samples[0][1];
    const phi = elevationForBaseAngle(8, 0.3052, 4.0917);
    const rp = reelPose(inp.livePosition, inp.liveTarget, inp.centre, inp.distance, phi);
    const combined = panToAnchor(rp, inp.basePoint, inp.anchor, 45, inp.aspect);
    console.log("INFO  combining elevationForBaseAngle (" + fmt(phi) + " deg) with panToAnchor gives a floor angle of " + fmt(floorAngle(combined.position, inp.basePoint)) + " deg; expected about 14 degrees (design estimate); this is why E2 solves it numerically");
  }
}

/* ---- Slice E2: backdropImageAspect ---- */
{
  const tex = (over = {}) => ({ background: { isTexture: true, mapping: 300, rotation: 0, image: { width: 1264, height: 843 }, ...over } });
  check("backdropImageAspect: reads width / height of a plain UV texture", near(backdropImageAspect(tex()), 1264 / 843, 1e-12), fmt(backdropImageAspect(tex())));
  check("backdropImageAspect: falls back to naturalWidth / naturalHeight", near(backdropImageAspect(tex({ image: { naturalWidth: 1920, naturalHeight: 1281 } })), 1920 / 1281, 1e-12));
  check("backdropImageAspect: null for no background, a non-texture, other mapping, rotation, no size, no scene",
    [{ background: null }, { background: { r: 0 } }, tex({ isTexture: false }), tex({ mapping: 301 }), tex({ rotation: 0.3 }), tex({ image: null }), tex({ image: {} }), tex({ image: { width: 0, height: 0 } }), null, undefined]
      .every((s) => backdropImageAspect(s) === null));
}

/* ---- Slice E2: registry data ---- */
{
  const withPlatform = ["propeller-pistons-loft", "aviation-heritage-hangar"];
  for (const id of withPlatform) {
    const e = ENVIRONMENTS.find((x) => x.id === id);
    const pl = e && e.platform;
    const okFields = pl && ["cx", "cy", "rx", "ry"].every((k) => typeof pl[k] === "number" && Number.isFinite(pl[k]) && pl[k] > 0 && pl[k] < 1);
    check("registry " + id + ": platform fields are finite and inside (0, 1)", Boolean(okFields), pl ? JSON.stringify(pl) : "missing");
    check("registry " + id + ": floorAngleDeg 8 and reelAnchorRy 0", e && e.floorAngleDeg === 8 && e.reelAnchorRy === 0, e ? "floorAngleDeg=" + e.floorAngleDeg + " reelAnchorRy=" + e.reelAnchorRy : "missing");
  }
  const others = ENVIRONMENTS.filter((e) => !withPlatform.includes(e.id));
  check("registry: the other nine environments have no platform, floorAngleDeg or reelAnchorRy", others.length === 9 && others.every((e) => !("platform" in e) && !("floorAngleDeg" in e) && !("reelAnchorRy" in e)), others.length + " others checked");
}

/* ---- purity ---- */
const src = readFileSync(new URL("../src/animation/path.js", import.meta.url), "utf8");
const badImport =
  /from\s+["'](three|react)["']|import\s*\(?\s*["'](three|react)["']|require\(\s*["'](three|react)["']\s*\)/.test(src);
check("path.js has no import from three or react", !badImport);

console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
