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
export function reelPose(livePosition, liveTarget, centre, distance) {
  if (!isVec3(livePosition) || !isVec3(liveTarget) || !isVec3(centre)) return null;
  if (!isNum(distance) || distance <= 0) return null;
  const { r, theta, phi } = toSpherical(livePosition, liveTarget);
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
