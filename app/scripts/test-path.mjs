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
} from "../src/animation/path.js";
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

/* ---- purity ---- */
const src = readFileSync(new URL("../src/animation/path.js", import.meta.url), "utf8");
const badImport =
  /from\s+["'](three|react)["']|import\s*\(?\s*["'](three|react)["']|require\(\s*["'](three|react)["']\s*\)/.test(src);
check("path.js has no import from three or react", !badImport);

console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
