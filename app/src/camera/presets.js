import * as THREE from "three";

// Mission 7 (Camera Presets Foundation) — data-driven product-shot presets.
// Adding a preset later = one entry here; framing adapts to any model bounding
// box automatically (no per-model tuning).
//
// az    = azimuth in degrees RELATIVE to the model's front (0 = front, 90 = right
//         side, 180 = rear). The absolute camera azimuth is frontAz + az.
// elev  = elevation in degrees above the model center (<0 = from below). 90 = Top:
//         see TOP_ELEV, measured from the biased target instead
// fill  = fraction of the tighter view axis the subject should occupy
// thumb = small schematic used to render the preset's visual card (camera apex
//         and aim point in the thumbnail's 48x30 viewBox)
//
// Framing bias: the subject is nudged slightly left-of-center and a touch low
// on screen (product-shot composition) so it stays clear of the top-right
// Studio Controls.
const FILL = 0.58;
const H_BIAS = 0.08; // model center at ~42% of screen width
const V_BIAS = 0.04; // model center at ~54% of screen height
// A preset with elev >= 90 is a top view. Its elevation is measured from the
// biased TARGET the camera orbits (not from the model center), and it stops
// one degree short of the pole: at exactly 90 the spherical azimuth is
// undefined (OrbitControls would jump it) and the Slice A/B Height mapping
// clamps at +/-89 anyway, so 89 keeps baseline, sliders and orbit consistent.
const TOP_ELEV = 89;

export const CAMERA_PRESETS = [
  {
    id: "front",
    name: "Front",
    az: 0,
    elev: 5,
    fill: FILL,
    thumb: { cam: [8, 15], target: [20, 15] },
  },
  {
    id: "side",
    name: "Side",
    az: 90,
    elev: 5,
    fill: FILL,
    thumb: { cam: [8, 23], target: [19, 16] },
  },
  {
    id: "three-quarter",
    name: "3/4",
    az: 45,
    elev: 12,
    fill: FILL,
    thumb: { cam: [9, 25], target: [20, 16] },
  },
  {
    id: "rear",
    name: "Rear",
    az: 180,
    elev: 5,
    fill: FILL,
    thumb: { cam: [40, 9], target: [27, 15] },
  },
  {
    id: "top",
    name: "Top",
    az: 0,
    elev: 90,
    fill: FILL,
    thumb: { cam: [24, 3], target: [24, 13] },
  },
  {
    id: "low-hero",
    name: "Low Hero",
    az: 22,
    elev: -16,
    fill: FILL,
    thumb: { cam: [18, 28], target: [22, 18] },
  },
];

export function getCameraPreset(id) {
  return CAMERA_PRESETS.find((p) => p.id === id) ?? null;
}

// Build the camera basis (screen right/up) from the view direction, with a
// stable fallback for straight-down/up shots.
function cameraBasis(dir) {
  const forward = dir.clone().negate().normalize();
  const worldUp =
    Math.abs(forward.y) > 0.95
      ? new THREE.Vector3(0, 0, -1)
      : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  return { forward, right, up };
}

// Compute camera position + look-at target for a preset given the model's fit
// data and front direction. Framing is direction-aware: the model's bounding-box
// half-extents are projected onto the camera's screen axes, so a "Front" shot
// of the long C172 frames its nose rather than the worst-case footprint
// diagonal — tight but never clipped. Returns fresh vectors.
export function computeCameraShot(fit, preset, frontAz, aspect, fovDeg) {
  const vFov = THREE.MathUtils.degToRad(fovDeg);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  const az = THREE.MathUtils.degToRad(preset.az + frontAz);
  const el = THREE.MathUtils.degToRad(preset.elev);
  // Unit direction from the model center toward the camera.
  const dir = new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el)
  );

  const { forward, right, up } = cameraBasis(dir);

  const hx = fit.size.x / 2;
  const hy = fit.size.y / 2;
  const hz = fit.size.z / 2;
  const extRight =
    hx * Math.abs(right.x) + hy * Math.abs(right.y) + hz * Math.abs(right.z);
  const extUp = hx * Math.abs(up.x) + hy * Math.abs(up.y) + hz * Math.abs(up.z);
  // Half-extent along the view axis. Under perspective the box's NEAR face
  // (closest to the camera) projects larger than its center, so a long model
  // viewed side-on would otherwise overrun the frame. Add this depth offset to
  // the camera distance so the near face — not just the box center — fits.
  const extFwd =
    hx * Math.abs(forward.x) + hy * Math.abs(forward.y) + hz * Math.abs(forward.z);

  const distRight = extRight / Math.tan(hFov / 2);
  const distUp = extUp / Math.tan(vFov / 2);
  const distance = Math.max(distRight, distUp) / preset.fill + extFwd;

  let position = fit.center.clone().addScaledVector(dir, distance);

  // Nudge the aim point up-right so the subject sits left-of-center and a
  // touch below center — clear of the top-right controls, while the orbit
  // still centers on the model.
  const halfW = distance * Math.tan(hFov / 2);
  const halfH = distance * Math.tan(vFov / 2);
  const target = fit.center
    .clone()
    .addScaledVector(right, halfW * 2 * H_BIAS)
    .addScaledVector(up, halfH * 2 * V_BIAS);

  if (preset.elev >= 90) {
    // Tilt toward +z so screen-up stays -z, exactly as the straight-down basis.
    const t = THREE.MathUtils.degToRad(TOP_ELEV);
    position = target
      .clone()
      .add(new THREE.Vector3(0, Math.sin(t), Math.cos(t)).multiplyScalar(distance));
  }

  return { position, target };
}

// Camera Studio (Phase 16A) — the frozen slider baseline, measured from the
// camera and orbit target AFTER a view has been applied (preset targets are
// biased by H_BIAS/V_BIAS, so it cannot be predicted from the preset alone).
// Plain arrays in, plain numbers out. dist0 = |camera - target|, elev0 = the
// camera's elevation above the target in radians, offset = target - model
// center. baseId is the preset id the view came from (null = default framing).
export function getBaseline(position, target, baseId, center) {
  const vx = position[0] - target[0];
  const vy = position[1] - target[1];
  const vz = position[2] - target[2];
  const dist0 = Math.hypot(vx, vy, vz);
  return {
    baseId: baseId ?? null,
    dist0,
    elev0: dist0 > 0 ? Math.asin(Math.max(-1, Math.min(1, vy / dist0))) : 0,
    offset: [target[0] - center.x, target[1] - center.y, target[2] - center.z],
  };
}
