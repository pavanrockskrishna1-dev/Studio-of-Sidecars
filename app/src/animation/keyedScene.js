/* Slice C3a - applying Reel keys to the live three.js objects (the stage's
   helper; the key data and maths are in reelKeys.js).
   ---------------------------------------------------------------------------
   prepareKeyed(...) runs when Play or an export starts and returns null when
   the Reel has no key that can play (so a Reel without keys runs exactly the
   old code). Otherwise it records, for every keyed object that is in the
   scene, its node's position, rotation (Euler, with its order) and scale, so
   restoreKeyed puts them back EXACTLY (rotation is restored as the Euler the
   node had, which recomputes the identical quaternion), and it groups each
   shot's live keys by target. applyKeyed poses the nodes for one shot at one
   shot time; an object keyed only in other shots is held at its recorded pose.
   Nothing here touches React state, the Garage store or the Transform panel:
   keys move only the three.js nodes, and only while Play or an export runs.

   Camera plans do NOT follow keyed motion: frameFit[k] is the product's box
   at shot k's "Frame on" time (owner rule: the shot's last exported frame by
   default, or its first frame when the shot says frameOn "start"; the rest box
   carried by the product's key pose at that time), and the stage frames shot
   k from it (start views, platform anchor, safe area). Shots without product
   keys have no frameFit and are framed exactly as before. checkKeyed
   evaluates every exported frame of the shots with product keys against the
   Instagram safe area and the painted platform. */

import * as THREE from "three";
import { frameTimeOf, keysByTarget, PRODUCT_TARGET, sampleKeys } from "./reelKeys.js";
import { makeTurntable, projectToPixels, REEL_SAFE_AREA, sampleAt } from "./path.js";

export const PLATFORM_TOLERANCE_PX = 40;

const shotKeyLists = (anim) => (anim.reel ? anim.reel.shots.map((s) => s.keys ?? []) : [anim.keys ?? []]);
export const animHasKeys = (anim) => !!anim && shotKeyLists(anim).some((l) => l.length > 0);

// productNode: the whole-model transform group. findObject(itemId, assetId):
// the added object's node, or null. restFit: the stage's live fit (world box).
export function prepareKeyed({ anim, productId, productNode, findObject, restFit }) {
  if (!animHasKeys(anim) || !productNode) return null;
  const lists = shotKeyLists(anim);
  const nodeFor = (k) => (k.target === PRODUCT_TARGET ? (k.assetId === productId ? productNode : null) : findObject(k.target, k.assetId));
  const targets = new Map();
  for (const keys of lists) {
    for (const k of keys) {
      if (targets.has(k.target)) continue;
      const node = nodeFor(k);
      if (node) targets.set(k.target, { node, position: node.position.clone(), rotation: node.rotation.clone(), scale: node.scale.clone() });
    }
  }
  if (!targets.size) return null;
  const perShot = lists.map((keys) => keysByTarget(keys.filter((k) => targets.has(k.target) && nodeFor(k) === targets.get(k.target).node)));
  productNode.updateWorldMatrix(true, false);
  const keyed = {
    targets,
    perShot,
    restFit,
    restWorldInv: productNode.matrixWorld.clone().invert(),
    parentWorld: productNode.parent ? productNode.parent.matrixWorld.clone() : new THREE.Matrix4(),
  };
  const shotInfo = anim.reel ? anim.reel.shots : [{ durationS: anim.durationS, frameOn: anim.frameOn }];
  keyed.frameFit = perShot.map((g, k) =>
    g[PRODUCT_TARGET] ? fitAtPose(keyed, sampleKeys(g[PRODUCT_TARGET], frameTimeOf(shotInfo[k].durationS, shotInfo[k].frameOn))) : null
  );
  return keyed;
}

function restoreOne(c) {
  c.node.position.copy(c.position);
  c.node.rotation.copy(c.rotation);
  c.node.scale.copy(c.scale);
}

export function restoreKeyed(keyed) {
  for (const c of keyed.targets.values()) restoreOne(c);
}

export function applyKeyed(keyed, shotIndex, t) {
  const g = keyed.perShot[shotIndex] || {};
  for (const [target, c] of keyed.targets) {
    const pose = g[target] ? sampleKeys(g[target], t) : null;
    if (!pose) {
      restoreOne(c);
      continue;
    }
    c.node.position.fromArray(pose.position);
    c.node.quaternion.fromArray(pose.quaternion);
    c.node.scale.fromArray(pose.scale);
  }
}

const poseMatrix = (pose) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(pose.position),
    new THREE.Quaternion().fromArray(pose.quaternion),
    new THREE.Vector3().fromArray(pose.scale)
  );

const restCorners = (fit) => {
  const out = [];
  for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) {
    out.push(new THREE.Vector3(fit.center.x + dx * fit.size.x, fit.center.y + dy * fit.size.y, fit.center.z + dz * fit.size.z));
  }
  return out;
};

// World points of the product's rest box (8 corners, then the bottom centre)
// with the product at `pose`, optionally turned `spin` radians about the
// turntable pivot (pivotLocal, in the product node's local space).
function movedPoints(keyed, pose, spin = 0, pivotLocal = null) {
  const f = keyed.restFit;
  const pts = [...restCorners(f), new THREE.Vector3(f.center.x, f.center.y - f.size.y / 2, f.center.z)];
  const m = keyed.parentWorld.clone().multiply(poseMatrix(pose));
  const rot = spin ? new THREE.Matrix4().makeRotationY(spin) : null;
  return pts.map((p) => {
    const q = p.clone().applyMatrix4(keyed.restWorldInv);
    if (rot && pivotLocal) q.sub(pivotLocal).applyMatrix4(rot).add(pivotLocal);
    return q.applyMatrix4(m);
  });
}

// The rest fit carried by a product pose (axis-aligned box of the 8 moved
// corners; the floor height stays pinned, as the stage's own refit does).
function fitAtPose(keyed, pose) {
  const box = new THREE.Box3().setFromPoints(movedPoints(keyed, pose).slice(0, 8));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return { ...keyed.restFit, center, size, footprintRadius: Math.hypot(size.x, size.z) / 2 };
}

// Distance in px from p to the ellipse (0 inside).
function outsideEllipse(p, e) {
  const dx = p[0] - e.cx;
  const dy = p[1] - e.cy;
  if ((dx / e.a) ** 2 + (dy / e.b) ** 2 <= 1) return 0;
  let best = Infinity;
  for (let i = 0; i < 720; i++) {
    const th = (i / 720) * Math.PI * 2;
    best = Math.min(best, Math.hypot(e.cx + e.a * Math.cos(th) - p[0], e.cy + e.b * Math.sin(th) - p[1]));
  }
  return best;
}

// The first exported frame (shots with product keys only) where the keyed
// product's box leaves the safe area or its ground point is more than 40 px
// off the painted platform: { shot (0-based), t (s), kind, px } or null.
// cameraAt(shotIndex, localT) -> { position, target } for that export frame;
// platform: { cx, cy, a, b } in px or null; pivotLocal: THREE.Vector3.
export function checkKeyed({ keyed, anim, cameraAt, fovDeg, width, height, platform, pivotLocal }) {
  const sx = width / REEL_SAFE_AREA.width;
  const sy = height / REEL_SAFE_AREA.height;
  const safe = { x0: REEL_SAFE_AREA.x0 * sx, x1: REEL_SAFE_AREA.x1 * sx, y0: REEL_SAFE_AREA.y0 * sy, y1: REEL_SAFE_AREA.y1 * sy };
  const shots = anim.reel ? anim.reel.shots : [{ move: "turntable", durationS: anim.durationS, lone: true }];
  for (let k = 0; k < shots.length; k++) {
    const keys = keyed.perShot[k]?.[PRODUCT_TARGET];
    if (!keys) continue;
    const shot = shots[k];
    const frames = Math.round(shot.durationS * 30);
    const spinAnim = shot.move === "turntable" ? (shot.lone ? anim : makeTurntable({ durationS: shot.durationS })) : null;
    for (let f = 0; f < frames; f++) {
      const t = f / 30;
      const cam = cameraAt(k, t);
      if (!cam) continue;
      const spin = spinAnim ? sampleAt(spinAnim, t).modelSpinRad : 0;
      const pts = movedPoints(keyed, sampleKeys(keys, t), spin, pivotLocal).map((p) => projectToPixels(cam, p.toArray(), fovDeg, width, height));
      const corners = pts.slice(0, 8);
      const inside =
        corners.every(Boolean) &&
        corners.every((p) => p[0] >= safe.x0 && p[0] <= safe.x1 && p[1] >= safe.y0 && p[1] <= safe.y1);
      if (!inside) return { shot: k, t, kind: "safe" };
      if (platform && pts[8]) {
        const off = outsideEllipse(pts[8], platform);
        if (off > PLATFORM_TOLERANCE_PX) return { shot: k, t, kind: "platform", px: off };
      }
    }
  }
  return null;
}
