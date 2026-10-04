/* Animation Studio (Phase 16B, Slice A) — the path engine.
   ---------------------------------------------------------------------------
   Pure math over plain numbers and arrays: no React, no three.js, no DOM, no
   clock. An animation is serializable data; sampleAt(anim, t) turns a time in
   seconds into a camera state and a model spin angle. It never touches the
   live camera: whoever plays it (a later slice) applies the result through the
   stage's guarded move, so the live camera and controls target stay the only
   source of truth.

   {
     v: 1, durationS, fps, loop, ease: "linear" | "easeInOut",
     model: { spinTurns },   // model turns about its vertical axis over durationS
     cam: null | [ { t, position:[x,y,z], target:[x,y,z], fov, spin? }, ... ]
   }
   `spin` (signed turns) on a key adds full turns of azimuth on the segment that
   ENDS at that key. Y is up; theta = atan2(x, z), phi = elevation. */

const TAU = Math.PI * 2;
const PHI_LIMIT = (89 * Math.PI) / 180;
const MAX_DURATION_S = 60;
const MAX_SPIN_TURNS = 20;

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isVec3 = (a) => Array.isArray(a) && a.length === 3 && a.every(isNum);

export function makeTurntable({ durationS = 8, fps = 30, turns = 1, loop = true } = {}) {
  return { v: 1, durationS, fps, loop, ease: "linear", model: { spinTurns: turns }, cam: null };
}

export function makeMove(from, to, { durationS = 4, fps = 30, spin = 0, ease = "easeInOut" } = {}) {
  const key = (t, view, extra) => ({
    t,
    position: [...view.position],
    target: [...view.target],
    fov: view.fov,
    ...extra,
  });
  return {
    v: 1,
    durationS,
    fps,
    loop: false,
    ease,
    model: { spinTurns: 0 },
    cam: [key(0, from), key(durationS, to, spin ? { spin } : {})],
  };
}

/* ---- Slice C2a: Reel camera moves (one shot) ---------------------------------
   A shot = start view + move + duration. The anim is a non-looping, linear-time
   spec with no model spin and no cam keys; `shot.move` names the move, and
   shotPose turns (start pose, move, linear progress u) into the camera pose. The
   stage uses it from the live start view (preview) or from the 9:16 Reel framing
   of the start view (MP4 export). At u = 0 every move is exactly the start pose. */

export const SHOT_MOVES = Object.freeze(["orbit", "push-in", "pull-back", "slide", "crane"]);

// ported from MotionLab v0.19.0 curves-core.js (curveProgress, the "Smooth"
// curve): a cubic ease that starts and ends with zero speed.
export function smoothstep(u) {
  if (!(u > 0)) return 0;
  if (u >= 1) return 1;
  return u * u * (3 - 2 * u);
}


export function makeShot({ move, durationS = 8, fps = 30 } = {}) {
  if (!SHOT_MOVES.includes(move)) return null;
  return { v: 1, durationS, fps, loop: false, ease: "linear", model: { spinTurns: 0 }, cam: null, shot: { move } };
}

// start = { position:[x,y,z], target:[x,y,z] }; u = linear progress, clamped to
// [0, 1] and eased with smoothstep. Returns fresh arrays, or null for bad input.
//   orbit      one full turn of azimuth around the target (distance and height kept)
//   push-in    distance to 60% of the start distance
//   pull-back  distance to 160% of the start distance (the reveal)
//   slide      the camera travels sideways (to its right) by 35% of the start
//              distance on a straight line, still aiming at the target
//   crane      the camera rises on an arc at constant distance, still aiming at
//              the target: at most 12 degrees more elevation, never above 25
export function shotPose(start, move, u) {
  if (!start || !isVec3(start.position) || !isVec3(start.target) || !SHOT_MOVES.includes(move)) return null;
  const e = smoothstep(Math.max(0, Math.min(1, isNum(u) ? u : 0)));
  const target = [...start.target];
  const off = [0, 1, 2].map((j) => start.position[j] - target[j]);
  const r0 = Math.hypot(off[0], off[1], off[2]);
  if (!(r0 > 1e-9)) return null;
  const at = (o) => ({ position: [target[0] + o[0], target[1] + o[1], target[2] + o[2]], target });
  if (move === "push-in" || move === "pull-back") {
    const k = move === "push-in" ? 1 - 0.4 * e : 1 + 0.6 * e;
    return at(off.map((v) => v * k));
  }
  if (move === "orbit") {
    const a = TAU * e;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return at([off[0] * c + off[2] * s, off[1], -off[0] * s + off[2] * c]);
  }
  if (move === "slide") {
    // camera right = forward x up, kept horizontal (forward = -off)
    const rl = Math.hypot(off[2], off[0]);
    if (!(rl > 1e-9)) return at(off);
    const right = [off[2] / rl, 0, -off[0] / rl];
    const d = 0.35 * r0 * e;
    return at([off[0] + right[0] * d, off[1], off[2] + right[2] * d]);
  }
  // crane: an arc at constant distance, at most 12 degrees more elevation and
  // never above 25 degrees in total (the same rule as the export crane)
  const flat = Math.hypot(off[0], off[2]);
  if (!(flat > 1e-9)) return at(off);
  const phi0 = Math.asin(Math.max(-1, Math.min(1, off[1] / r0)));
  const rise = Math.max(0, Math.min((12 * Math.PI) / 180, (25 * Math.PI) / 180 - phi0));
  const phi = phi0 + rise * e;
  const k = (r0 * Math.cos(phi)) / flat;
  return at([off[0] * k, r0 * Math.sin(phi), off[2] * k]);
}

// The pose of a shot anim at time t (seconds), from `start`.
export function shotPoseAt(anim, start, t) {
  if (!anim || !anim.shot || !isNum(anim.durationS) || anim.durationS <= 0) return null;
  return shotPose(start, anim.shot.move, (isNum(t) ? t : 0) / anim.durationS);
}

/* ---- Slice C2a: anchored camera shots for EXPORTS (Instagram safe area) -----
   Instagram covers about the top 220 px and bottom 420 px of a 1080x1920 Reel,
   so the whole product box must stay inside x 60-1020, y 220-1500 at every
   frame. The product stands on the platform painted in the backdrop: its ground
   contact point B (the bottom-centre of its bounding box) is pinned to ONE
   screen point, the anchor, which is where the 9:16 Reel framing of the chosen
   preset already puts B (the platform anchor). Every move pivots on B:
     orbit      the camera circles the vertical axis through B
     push-in    the camera moves along the line toward B
     pull-back  the camera moves along the line away from B
     slide      the camera moves sideways (horizontally, to its right)
     crane      the camera rises on an arc at constant distance from B: at most
                12 degrees more elevation than the start, never above 25
                degrees in total, the product never narrower than 85% of its
                start width (owner rule: a steep top-down end against the
                eye-level backdrop photo reads as a toy)
   and at every frame the aim is turned (yaw and pitch, no roll, up = +Y) so B
   lands exactly on the anchor. planAnchoredShot fixes the shot once per export:
   the start distance makes the box fill 60% of what the safe area allows (more
   distance, then smaller move amounts, when a frame would leave the safe area),
   push-in ends at the closest distance where the box still fits (never closer
   than 60% of the start), and the camera always stays at least 3 degrees above
   the floor plane seen from B, so the floor-level contact-shadow plane is never
   seen edge-on. Pure maths, plain arrays, three.js-compatible projection. */

export const REEL_SAFE_AREA = Object.freeze({ width: 1080, height: 1920, x0: 60, x1: 1020, y0: 220, y1: 1500 });
const SAFE_START_FILL = 0.6;
const SAFE_MIN_FILL = 0.45;
const PUSH_MIN_FACTOR = 0.6;
const MIN_CAMERA_ELEV = (3 * Math.PI) / 180;
const CRANE_MAX_RISE = (12 * Math.PI) / 180;
const CRANE_MAX_ELEV = (25 * Math.PI) / 180;
const CRANE_MIN_WIDTH = 0.85;
// crane: elevation gain in radians (capped per plan by CRANE_MAX_ELEV)
const DEFAULT_AMOUNT = Object.freeze({ orbit: 1, "push-in": PUSH_MIN_FACTOR, "pull-back": 1.6, slide: 0.35, crane: CRANE_MAX_RISE });

// Pixel position of world point q seen from pose, or null when it is not in
// front of the camera.
export function projectToPixels(pose, q, fovDeg, width, height) {
  const fwd = vsub(pose.target, pose.position);
  const fl = vlen(fwd);
  if (!(fl > 0)) return null;
  const f = fwd.map((v) => v / fl);
  const rc = vcross(f, [0, 1, 0]);
  const rl = vlen(rc);
  if (!(rl > 1e-9)) return null;
  const r = rc.map((v) => v / rl);
  const u = vcross(r, f);
  const d = vsub(q, pose.position);
  const cz = vdot(d, f);
  if (!(cz > 1e-9)) return null;
  const tn = Math.tan(((fovDeg * Math.PI) / 180) / 2);
  const aspect = width / height;
  const nx = vdot(d, r) / (cz * tn * aspect);
  const ny = vdot(d, u) / (cz * tn);
  return [((nx + 1) / 2) * width, ((1 - ny) / 2) * height];
}

// The aim point (a target at the distance of B) for a camera at C so that the
// world point B lands on pixel (ax, ay): yaw about +Y and pitch, no roll, the
// same orientation OrbitControls' lookAt gives. null when it cannot be done.
export function aimTarget(C, B, ax, ay, fovDeg, width, height) {
  const v = vsub(B, C);
  const dist = vlen(v);
  if (!(dist > 1e-9)) return null;
  const vn = v.map((x) => x / dist);
  const tanV = Math.tan(((fovDeg * Math.PI) / 180) / 2);
  const tanH = tanV * (width / height);
  const nx = (2 * ax) / width - 1;
  const ny = 1 - (2 * ay) / height;
  const cl = Math.hypot(nx * tanH, ny * tanV, 1);
  const c = [(nx * tanH) / cl, (ny * tanV) / cl, -1 / cl]; // camera-space ray to B
  const R = Math.hypot(c[1], c[2]);
  if (!(R > 1e-9) || Math.abs(vn[1]) > R) return null;
  const alpha = Math.atan2(-c[2], c[1]);
  const ac = Math.acos(Math.max(-1, Math.min(1, vn[1] / R)));
  let theta = null;
  for (const cand of [alpha - ac, alpha + ac]) {
    const th = Math.atan2(Math.sin(cand), Math.cos(cand));
    if (Math.cos(th) > 0 && (theta === null || Math.abs(th) < Math.abs(theta))) theta = th;
  }
  if (theta === null) return null;
  const zr = c[1] * Math.sin(theta) + c[2] * Math.cos(theta);
  const psi = Math.atan2(vn[0], vn[2]) - Math.atan2(c[0], zr);
  const f = [-Math.cos(theta) * Math.sin(psi), Math.sin(theta), -Math.cos(theta) * Math.cos(psi)];
  return [C[0] + f[0] * dist, C[1] + f[1] * dist, C[2] + f[2] * dist];
}

const boxCorners = (c, s) => {
  const out = [];
  for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) {
    out.push([c[0] + dx * s[0], c[1] + dy * s[1], c[2] + dz * s[2]]);
  }
  return out;
};

// Projected pixel bounds { minX, maxX, minY, maxY } of the box for a pose, or
// null when a corner is behind the camera.
export function projectedBox(pose, center, size, fovDeg, width, height) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const q of boxCorners(center, size)) {
    const p = projectToPixels(pose, q, fovDeg, width, height);
    if (!p) return null;
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
  }
  return { minX, maxX, minY, maxY };
}

// Camera position of a plan at linear progress u (before aiming).
function anchoredCamera(plan, u) {
  const { base, dir, d0, move, amount } = plan;
  const e = smoothstep(Math.max(0, Math.min(1, u)));
  const off = dir.map((v) => v * d0);
  let o;
  if (move === "push-in" || move === "pull-back") {
    const k = 1 + (amount - 1) * e;
    o = off.map((v) => v * k);
  } else if (move === "orbit") {
    const a = TAU * amount * e;
    const c = Math.cos(a);
    const s = Math.sin(a);
    o = [off[0] * c + off[2] * s, off[1], -off[0] * s + off[2] * c];
  } else if (move === "slide") {
    const rl = Math.hypot(off[0], off[2]);
    const right = rl > 1e-9 ? [off[2] / rl, 0, -off[0] / rl] : [1, 0, 0];
    o = [off[0] + right[0] * amount * d0 * e, off[1], off[2] + right[2] * amount * d0 * e];
  } else {
    // crane: elevation phi0 -> phi0 + amount on an arc of radius d0 about B
    const phi = Math.asin(Math.max(-1, Math.min(1, dir[1]))) + amount * e;
    const flat = Math.hypot(dir[0], dir[2]);
    const hx = flat > 1e-9 ? dir[0] / flat : 0;
    const hz = flat > 1e-9 ? dir[2] / flat : 1;
    o = [d0 * Math.cos(phi) * hx, d0 * Math.sin(phi), d0 * Math.cos(phi) * hz];
  }
  return [base[0] + o[0], base[1] + o[1], base[2] + o[2]];
}

// The export camera pose of a plan at linear progress u.
function anchoredPose(plan, u) {
  const position = anchoredCamera(plan, u);
  const target = aimTarget(position, plan.base, plan.anchor[0], plan.anchor[1], plan.fovDeg, plan.width, plan.height);
  return target ? { position, target } : null;
}

function anchoredFits(plan, frames) {
  const { center, size, fovDeg, width, height, safe, base } = plan;
  let w0 = null;
  for (let i = 0; i <= frames; i += 1) {
    const pose = anchoredPose(plan, i / frames);
    if (!pose) return false;
    const o = vsub(pose.position, base);
    if (o[1] < vlen(o) * Math.sin(MIN_CAMERA_ELEV)) return false;
    const b = projectedBox(pose, center, size, fovDeg, width, height);
    if (!b || b.minX < safe.x0 || b.maxX > safe.x1 || b.minY < safe.y0 || b.maxY > safe.y1) return false;
    if (plan.move === "crane") {
      // the crane never shrinks the product below 85% of its start width
      if (w0 === null) w0 = b.maxX - b.minX;
      else if (b.maxX - b.minX < CRANE_MIN_WIDTH * w0) return false;
    }
  }
  return true;
}

// Smallest d in [lo, hi] for which fits(d) holds (fits monotone in d); null
// when even hi does not fit.
function smallestFit(fits, lo, hi) {
  if (!fits(hi)) return null;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

// input: { anim (a shot), center, size, reelPosition, reelTarget, fovDeg,
// width, height }: the product box and the 9:16 Reel framing of the start view.
// Returns the plan ({ base, anchor, dir, d0, amount, ... }) or null.
export function planAnchoredShot(input) {
  const { anim, center, size, reelPosition, reelTarget, fovDeg, width, height } = input || {};
  if (!anim || !anim.shot || !SHOT_MOVES.includes(anim.shot.move)) return null;
  if (!isVec3(center) || !isVec3(size) || !isVec3(reelPosition) || !isVec3(reelTarget)) return null;
  if (!isNum(fovDeg) || !isNum(width) || !isNum(height) || width <= 0 || height <= 0) return null;
  const move = anim.shot.move;
  const sx = width / REEL_SAFE_AREA.width;
  const sy = height / REEL_SAFE_AREA.height;
  const safe = { x0: REEL_SAFE_AREA.x0 * sx, x1: REEL_SAFE_AREA.x1 * sx, y0: REEL_SAFE_AREA.y0 * sy, y1: REEL_SAFE_AREA.y1 * sy };
  const base = [center[0], center[1] - size[1] / 2, center[2]];
  // the anchor: where the Reel framing puts B (the painted platform), kept inside the safe area
  const reelPx = projectToPixels({ position: reelPosition, target: reelTarget }, base, fovDeg, width, height);
  if (!reelPx) return null;
  const anchor = [
    Math.max(safe.x0, Math.min(safe.x1, reelPx[0])),
    Math.max(safe.y0, Math.min(safe.y1, reelPx[1])),
  ];
  // the start direction from B (the preset's azimuth, the Reel framing's elevation), at least 3 degrees up
  let off = vsub(reelPosition, base);
  const flat = Math.hypot(off[0], off[2]);
  if (!(vlen(off) > 1e-9) || !(flat > 1e-9)) return null;
  const minUp = flat * Math.tan(MIN_CAMERA_ELEV * 1.01);
  if (off[1] < minUp) off = [off[0], minUp, off[2]];
  const ol = vlen(off);
  const dir = off.map((v) => v / ol);
  const frames = Math.max(1, Math.round(anim.durationS * (anim.fps || 30)));
  const plan0 = { base, anchor, reelAnchor: reelPx, dir, center: [...center], size: [...size], fovDeg, width, height, safe, move };
  const big = Math.max(vlen(size), 1e-6) * 200;
  const fitsStill = (d) => anchoredFits({ ...plan0, move: "push-in", amount: 1, d0: d }, 1);
  const dFit = smallestFit(fitsStill, 1e-6, big);
  if (dFit === null) return null;
  let d0 = dFit / SAFE_START_FILL;
  let amount = DEFAULT_AMOUNT[move];
  if (move === "push-in") {
    amount = Math.max((dFit * (1 + 1e-6)) / d0, PUSH_MIN_FACTOR);
  } else if (move === "crane") {
    // the start distance stays at the 60% fill; only the rise shrinks
    const phi0 = Math.asin(Math.max(-1, Math.min(1, dir[1])));
    amount = Math.max(0, Math.min(CRANE_MAX_RISE, CRANE_MAX_ELEV - phi0));
    if (!anchoredFits({ ...plan0, d0, amount }, frames)) {
      if (!anchoredFits({ ...plan0, d0, amount: 0 }, frames)) return null;
      let lo = 0;
      let hi = amount;
      for (let i = 0; i < 50; i += 1) {
        const mid = (lo + hi) / 2;
        if (anchoredFits({ ...plan0, d0, amount: mid }, frames)) lo = mid;
        else hi = mid;
      }
      amount = lo;
    }
  } else if (!anchoredFits({ ...plan0, d0, amount }, frames)) {
    // first more distance (down to a 45% fill), then a smaller move
    const dMax = dFit / SAFE_MIN_FILL;
    const d = smallestFit((dd) => anchoredFits({ ...plan0, d0: dd, amount }, frames), d0, dMax);
    if (d !== null) {
      d0 = d;
    } else {
      d0 = dMax;
      let lo = 0;
      let hi = amount;
      if (!anchoredFits({ ...plan0, d0, amount: 0 }, frames)) return null;
      for (let i = 0; i < 50; i += 1) {
        const mid = (lo + hi) / 2;
        if (anchoredFits({ ...plan0, d0, amount: mid }, frames)) lo = mid;
        else hi = mid;
      }
      amount = lo;
    }
  }
  return { ...plan0, d0, amount, defaultAmount: DEFAULT_AMOUNT[move], startFill: dFit / d0, frames };
}

// The export camera pose of a plan at time t (seconds).
export function anchoredShotPoseAt(plan, durationS, t) {
  if (!plan || !isNum(durationS) || durationS <= 0) return null;
  return anchoredPose(plan, (isNum(t) ? t : 0) / durationS);
}

export function validateAnimation(anim) {
  const errors = [];
  if (!anim || typeof anim !== "object") return { ok: false, errors: ["animation is not an object"] };
  if (anim.v !== 1) errors.push("v must be 1");
  if (!isNum(anim.durationS) || anim.durationS <= 0 || anim.durationS > MAX_DURATION_S) {
    errors.push(`durationS must be a finite number in (0, ${MAX_DURATION_S}]`);
  }
  if (!Number.isInteger(anim.fps) || anim.fps < 1 || anim.fps > 60) {
    errors.push("fps must be an integer from 1 to 60");
  }
  if (typeof anim.loop !== "boolean") errors.push("loop must be a boolean");
  if (anim.ease !== "linear" && anim.ease !== "easeInOut") {
    errors.push('ease must be "linear" or "easeInOut"');
  }
  const turns = anim.model?.spinTurns;
  if (!isNum(turns) || Math.abs(turns) > MAX_SPIN_TURNS) {
    errors.push(`model.spinTurns must be a finite number with abs <= ${MAX_SPIN_TURNS}`);
  } else if (anim.loop === true && !Number.isInteger(turns)) {
    errors.push("model.spinTurns must be an integer when loop is true");
  }
  if (anim.loop === true && anim.ease !== "linear") {
    errors.push('ease must be "linear" when loop is true');
  }
  if (anim.cam !== null) {
    const keys = anim.cam;
    if (!Array.isArray(keys) || keys.length < 2) {
      errors.push("cam must be null or an array of at least 2 keys");
    } else {
      keys.forEach((k, i) => {
        if (!k || !isNum(k.t)) errors.push(`cam[${i}].t must be a finite number`);
        else if (i > 0 && isNum(keys[i - 1]?.t) && k.t <= keys[i - 1].t) {
          errors.push(`cam[${i}].t must be greater than the previous key's t`);
        }
        if (!k || !isVec3(k.position)) errors.push(`cam[${i}].position must be 3 finite numbers`);
        if (!k || !isVec3(k.target)) errors.push(`cam[${i}].target must be 3 finite numbers`);
        if (k && isVec3(k.position) && isVec3(k.target) && k.position.every((v, j) => v === k.target[j])) {
          errors.push(`cam[${i}].position equals its target (radius 0)`);
        }
        if (k && k.fov !== undefined && !isNum(k.fov)) errors.push(`cam[${i}].fov must be finite`);
        if (k && k.spin !== undefined && !isNum(k.spin)) errors.push(`cam[${i}].spin must be finite`);
      });
      if (isNum(keys[0]?.t) && keys[0].t !== 0) errors.push("first cam key must be at t = 0");
      const last = keys[keys.length - 1];
      if (isNum(last?.t) && last.t !== anim.durationS) {
        errors.push("last cam key must be at t = durationS");
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export const frameCount = (anim) => Math.round(anim.durationS * anim.fps);

// t_i = i / fps for i = 0..N-1. The end time (frame N) equals frame 0 in a
// loop, so it is not listed and no frame is duplicated.
export function frameTimes(anim) {
  const n = frameCount(anim);
  const times = new Array(n);
  for (let i = 0; i < n; i += 1) times[i] = i / anim.fps;
  return times;
}

const applyEase = (ease, u) => (ease === "easeInOut" ? 0.5 - 0.5 * Math.cos(Math.PI * u) : u);

// Offset of `position` from `target` as { r, theta, phi }; phi is clamped to
// +/-89 degrees so the azimuth never becomes undefined at a pole.
function toSpherical(position, target) {
  const x = position[0] - target[0];
  const y = position[1] - target[1];
  const z = position[2] - target[2];
  const r = Math.hypot(x, y, z);
  const phi = r > 0 ? Math.asin(Math.max(-1, Math.min(1, y / r))) : 0;
  return {
    r,
    theta: Math.atan2(x, z),
    phi: Math.max(-PHI_LIMIT, Math.min(PHI_LIMIT, phi)),
  };
}

const wrapPi = (d) => ((((d + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const lerp = (a, b, f) => a + (b - a) * f;

function sampleCamera(keys, te) {
  let i = 0;
  while (i < keys.length - 2 && te > keys[i + 1].t) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  const span = b.t - a.t;
  const f = span > 0 ? Math.max(0, Math.min(1, (te - a.t) / span)) : 0;

  const target = [0, 1, 2].map((j) => lerp(a.target[j], b.target[j], f));
  const sa = toSpherical(a.position, a.target);
  const sb = toSpherical(b.position, b.target);
  const dTheta = wrapPi(sb.theta - sa.theta) + TAU * (b.spin ?? 0);
  const r = lerp(sa.r, sb.r, f);
  const theta = sa.theta + dTheta * f;
  const phi = Math.max(-PHI_LIMIT, Math.min(PHI_LIMIT, lerp(sa.phi, sb.phi, f)));
  const cp = Math.cos(phi);
  return {
    position: [
      target[0] + r * cp * Math.sin(theta),
      target[1] + r * Math.sin(phi),
      target[2] + r * cp * Math.cos(theta),
    ],
    target,
    fov: lerp(a.fov ?? 45, b.fov ?? 45, f),
  };
}

// { camera, modelSpinRad } at time t (seconds). Loop: t wraps into [0, T).
// Not a loop: t clamps to [0, T].
export function sampleAt(anim, t) {
  const T = anim.durationS;
  const tt = anim.loop ? ((t % T) + T) % T : Math.max(0, Math.min(T, t));
  const u = applyEase(anim.ease, tt / T);
  return {
    camera: anim.cam ? sampleCamera(anim.cam, u * T) : null,
    modelSpinRad: TAU * anim.model.spinTurns * u,
  };
}

// Reel framing (Slice C): keep the live camera's azimuth and elevation, aim at
// the model's centre and sit at `distance`. Plain arrays in and out; null when
// any input is not 3 finite numbers, the live offset has no length, or the
// distance is not a positive finite number. Elevation is clamped to +/-89
// degrees like the rest of the path engine.
// Slice E1: the optional fifth argument elevationDeg replaces the live elevation
// (still clamped to +/-89 degrees; the azimuth still comes from the live
// offset). undefined or null keeps the behaviour above exactly; any other
// non-finite value (NaN, Infinity, a string) gives null.
export function reelPose(livePosition, liveTarget, centre, distance, elevationDeg) {
  if (!isVec3(livePosition) || !isVec3(liveTarget) || !isVec3(centre)) return null;
  if (!isNum(distance) || distance <= 0) return null;
  const override = elevationDeg !== undefined && elevationDeg !== null;
  if (override && !isNum(elevationDeg)) return null;
  const { r, theta, phi: livePhi } = toSpherical(livePosition, liveTarget);
  if (!Number.isFinite(r) || r <= 1e-9) return null;
  const phi = override
    ? Math.max(-PHI_LIMIT, Math.min(PHI_LIMIT, (elevationDeg * Math.PI) / 180))
    : livePhi;
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

// Slice E1 (model on the platform) -------------------------------------------

const RAD = Math.PI / 180;

// The camera elevation phi (degrees above the target, clamped to +/-89) at
// which the FLOOR is seen at elevation angle thetaDeg from the model's base
// point, when the target sits heightAboveFloor above the floor point under it
// and the camera is `distance` from the target:
//   r * sin(theta - phi) = h * cos(theta)   ->   phi = theta - asin(h*cos(theta)/r)
// null when thetaDeg is not in (0, 90), heightAboveFloor is not finite,
// distance is not a positive finite number, or the ratio is outside [-1, 1].
export function elevationForBaseAngle(thetaDeg, heightAboveFloor, distance) {
  if (!isNum(thetaDeg) || thetaDeg <= 0 || thetaDeg >= 90) return null;
  if (!isNum(heightAboveFloor)) return null;
  if (!isNum(distance) || distance <= 0) return null;
  const theta = thetaDeg * RAD;
  const ratio = (heightAboveFloor * Math.cos(theta)) / distance;
  if (!Number.isFinite(ratio) || Math.abs(ratio) > 1) return null;
  const phiDeg = (theta - Math.asin(ratio)) / RAD;
  return Math.max(-89, Math.min(89, phiDeg));
}

const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vcross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const vlen = (a) => Math.hypot(a[0], a[1], a[2]);

// Translates the camera and its target together, in the image plane, so that
// basePoint (world) appears at targetFrac ({ x, y }: fractions of the frame,
// x from the left, y from the TOP). Orientation and distance do not change.
// pose = { position, target }. Returns { position, target, shift: { right, up } }
// (new arrays) or null for non-finite input, position equal to target, a view
// straight up or down, fovDeg outside (0, 180), aspect <= 0, or a base point
// that is not in front of the camera.
export function panToAnchor(pose, basePoint, targetFrac, fovDeg, aspect) {
  if (!pose || !isVec3(pose.position) || !isVec3(pose.target) || !isVec3(basePoint)) return null;
  if (!targetFrac || !isNum(targetFrac.x) || !isNum(targetFrac.y)) return null;
  if (!isNum(fovDeg) || fovDeg <= 0 || fovDeg >= 180) return null;
  if (!isNum(aspect) || aspect <= 0) return null;
  const fl = vlen(vsub(pose.target, pose.position));
  if (!(fl > 0)) return null;
  const f = vsub(pose.target, pose.position).map((v) => v / fl);
  const rc = vcross(f, [0, 1, 0]);
  const rl = vlen(rc);
  if (rl < 1e-9) return null;
  const r = rc.map((v) => v / rl);
  const u = vcross(r, f);
  const d = vsub(basePoint, pose.position);
  const cx = vdot(d, r);
  const cy = vdot(d, u);
  const cz = vdot(d, f);
  if (!(cz > 1e-9)) return null;
  const tn = Math.tan((fovDeg * RAD) / 2);
  const tx = 2 * targetFrac.x - 1;
  const ty = 1 - 2 * targetFrac.y;
  const a = cx - tx * cz * tn * aspect;
  const b = cy - ty * cz * tn;
  const move = (p) => [p[0] + a * r[0] + b * u[0], p[1] + a * r[1] + b * u[1], p[2] + a * r[2] + b * u[2]];
  return { position: move(pose.position), target: move(pose.target), shift: { right: a, up: b } };
}

// Slice E2: the Reel pose that puts the model's base on the platform painted in
// the photo. For a camera elevation phi the pose is reelPose(..., phi) followed
// by panToAnchor (the pan raises or lowers the camera, so the floor angle has to
// be solved AFTER the pan, not from elevationForBaseAngle, which would count the
// raise twice). floorAngle(phi) is the elevation of the camera above the base
// point as seen from the base; phi in [-30, 60] is found by bisection so that
// floorAngle equals floorAngleDeg. All inputs are plain numbers and arrays:
// { livePosition, liveTarget, centre, basePoint, distance, floorAngleDeg,
//   anchor: { x, y }, fovDeg, aspect }. Returns { position, target,
// elevationDeg, floorAngleDeg (achieved), shift } (fresh arrays) or null when
// an input is invalid, a step returns null, or no elevation in range reaches the
// angle.
export function platformReelPose(input) {
  const { livePosition, liveTarget, centre, basePoint, distance, floorAngleDeg, anchor, fovDeg, aspect } =
    input || {};
  if (!isNum(floorAngleDeg) || floorAngleDeg <= 0 || floorAngleDeg >= 89) return null;
  if (!isVec3(basePoint)) return null;
  const poseAt = (phi) => {
    const rp = reelPose(livePosition, liveTarget, centre, distance, phi);
    return rp ? panToAnchor(rp, basePoint, anchor, fovDeg, aspect) : null;
  };
  const angleOf = (p) =>
    (Math.atan2(
      p.position[1] - basePoint[1],
      Math.hypot(p.position[0] - basePoint[0], p.position[2] - basePoint[2])
    ) *
      180) /
    Math.PI;
  const f = (phi) => {
    const p = poseAt(phi);
    return p ? angleOf(p) - floorAngleDeg : NaN;
  };
  let lo = -30;
  let hi = 60;
  let flo = f(lo);
  const fhi0 = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi0)) return null;
  if (flo * fhi0 > 0) return null;
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (!Number.isFinite(fm)) return null;
    if (flo * fm <= 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  const phi = (lo + hi) / 2;
  const p = poseAt(phi);
  if (!p) return null;
  return {
    position: p.position,
    target: p.target,
    elevationDeg: phi,
    floorAngleDeg: angleOf(p),
    shift: p.shift,
  };
}
