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
   Instagram safe area and the painted platform.

   Slice C4a: shots may also carry cycles (reelCycles.js). prepareKeyed then
   records every node a live cycle moves (exact rest pose, as for keys) and
   applyKeyed runs the cycles AFTER the keys: each node's local matrix (its
   keyed pose, or its rest pose) is multiplied on the right by the cycle's
   delta brought into the node's rest frame, so a cycle rides on top of the
   shot camera, the whole-object keys and the part keys. A Reel without keys
   and cycles still gets null here and runs the old code; a Reel with keys
   only runs exactly the C3b code (keyed.cycles is null). */

import * as THREE from "three";
import { frameTimeOf, isPartKey, keysByTarget, PRODUCT_TARGET, sampleKeys } from "./reelKeys.js";
import { partDeltaMatrix, pivotPoint } from "./partKeys.js";
import { makeTurntable, projectToPixels, REEL_SAFE_AREA, sampleAt } from "./path.js";
import { cycleAxis, cycleDeltaMatrix, isCycle, isGroupCycle, rollAngle, rollAt, rollTable, wheelRadius } from "./reelCycles.js";
import { reelTime } from "./reelTime.js";

export const PLATFORM_TOLERANCE_PX = 40;

const shotKeyLists = (anim) => (anim.reel ? anim.reel.shots.map((s) => s.keys ?? []) : [anim.keys ?? []]);
export const animHasKeys = (anim) => !!anim && shotKeyLists(anim).some((l) => l.length > 0);

const recordNode = (node) => ({ node, position: node.position.clone(), rotation: node.rotation.clone(), scale: node.scale.clone() });

// Slice C3b: a group of the main product's part meshes. Each mesh keeps its
// exact rest pose (for the restore), its local matrix and its parent-to-model
// matrix (constant while it plays: every part hangs under the model root);
// the group's box is measured in the model frame for the pivot.
function partRecord(meshes, modelNode) {
  modelNode.updateWorldMatrix(true, true);
  const modelInv = modelNode.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const parts = meshes.map((mesh) => {
    const p2m = modelInv.clone().multiply(mesh.parent.matrixWorld);
    mesh.updateMatrix();
    const restLocal = mesh.matrix.clone();
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    box.union(mesh.geometry.boundingBox.clone().applyMatrix4(p2m.clone().multiply(restLocal)));
    return { ...recordNode(mesh), p2m, p2mInv: p2m.clone().invert(), restLocal };
  });
  return { kind: "parts", parts, box: { min: box.min.toArray(), max: box.max.toArray() } };
}

// productNode: the whole-model transform group. findObject(itemId, assetId):
// the added object's node, or null. restFit: the stage's live fit (world box).
// Slice C3b: modelNode (the model root), frontAz (the product's front, for the
// pivot names) and findParts(ids) -> the part meshes, or null if any is gone.
// Slice C4a: findGroup(path) -> the meshes under a part group, or null.
// Riders: when the product itself is keyed, the transform group it moves also
// holds every added object. Objects whose centre lies inside the product's box
// (food on the grate, a rack hung on its side) ride along; every other added
// object (a crab or barrel standing beside it) is held at its rest place in the
// world, so a bike can ride into a static set.
const _centre = new THREE.Vector3();
function prepareAnchors(productNode, modelNode, objectsRoot) {
  productNode.updateWorldMatrix(true, true);
  const productBox = new THREE.Box3().setFromObject(modelNode || productNode).expandByScalar(0.02);
  const out = [];
  for (const anchor of objectsRoot.children) {
    const box = new THREE.Box3().setFromObject(anchor);
    if (box.isEmpty() || productBox.containsPoint(box.getCenter(_centre))) continue; // a rider
    out.push({ ...recordNode(anchor), parentRest: anchor.parent.matrixWorld.clone() });
  }
  return out;
}

export function prepareKeyed({ anim, productId, productNode, findObject, restFit, modelNode = null, frontAz = 0, findParts = null, findGroup = null, objectsRoot = null }) {
  if ((!animHasKeys(anim) && !animHasCycles(anim)) || !productNode) return null;
  const lists = shotKeyLists(anim);
  const resolved = new Map();
  const recordFor = (k) => {
    const id = `${k.target}#${k.assetId}`;
    if (resolved.has(id)) return resolved.get(id);
    let rec = null;
    if (isPartKey(k)) {
      const meshes = k.assetId === productId && modelNode && findParts ? findParts(k.parts) : null;
      if (meshes) rec = partRecord(meshes, modelNode);
    } else {
      const node = k.target === PRODUCT_TARGET ? (k.assetId === productId ? productNode : null) : findObject(k.target, k.assetId);
      if (node) rec = recordNode(node);
    }
    resolved.set(id, rec);
    return rec;
  };
  const targets = new Map();
  for (const keys of lists) {
    for (const k of keys) {
      if (targets.has(k.target)) continue;
      const rec = recordFor(k);
      if (rec) targets.set(k.target, rec);
    }
  }
  if (!targets.size && !animHasCycles(anim)) return null;
  const perShot = lists.map((keys) => keysByTarget(keys.filter((k) => targets.has(k.target) && recordFor(k) === targets.get(k.target))));
  productNode.updateWorldMatrix(true, false);
  const keyed = {
    targets,
    perShot,
    restFit,
    frontAz,
    restWorldInv: productNode.matrixWorld.clone().invert(),
    parentWorld: productNode.parent ? productNode.parent.matrixWorld.clone() : new THREE.Matrix4(),
  };
  const shotInfo = anim.reel ? anim.reel.shots : [{ durationS: anim.durationS, frameOn: anim.frameOn }];
  keyed.frameFit = perShot.map((g, k) =>
    g[PRODUCT_TARGET] ? fitAtPose(keyed, sampleKeys(g[PRODUCT_TARGET], frameTimeOf(shotInfo[k].durationS, shotInfo[k].frameOn))) : null
  );
  // Slice C4a: the cycles (null without live cycles)
  keyed.cycles = animHasCycles(anim) ? prepareCycles({ anim, keyed, shotInfo, productId, productNode, findObject, modelNode, frontAz, findParts, findGroup }) : null;
  if (!targets.size && !keyed.cycles) return null;
  keyed.productNode = productNode;
  keyed.anchors = objectsRoot && perShot.some((g) => g[PRODUCT_TARGET]) ? prepareAnchors(productNode, modelNode, objectsRoot) : [];
  return keyed;
}

/* ---- Slice C4a: cycles ---- */

const shotCycleLists = (anim) => (anim.reel ? anim.reel.shots.map((s) => s.cycles ?? []) : [anim.cycles ?? []]);
export const animHasCycles = (anim) => !!anim && shotCycleLists(anim).some((l) => l.length > 0);

// A node's rest box in its own frame, over the given meshes (null when empty).
function boxInFrame(frameNode, meshes) {
  frameNode.updateWorldMatrix(true, true);
  const inv = frameNode.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  for (const m of meshes) {
    if (!m.geometry) continue;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld)));
  }
  return box.isEmpty() ? null : { min: box.min.toArray(), max: box.max.toArray() };
}
const meshesUnder = (node) => {
  const out = [];
  node.traverse((o) => {
    if (o.isMesh) out.push(o);
  });
  return out;
};

function prepareCycles({ anim, keyed, shotInfo, productId, productNode, findObject, modelNode, frontAz, findParts, findGroup }) {
  const resolved = new Map();
  const recordFor = (c) => {
    const id = `${c.target}#${c.assetId}`;
    if (resolved.has(id)) return resolved.get(id);
    let rec = null;
    if (isPartKey(c) || isGroupCycle(c)) {
      const meshes =
        c.assetId !== productId || !modelNode ? null : isGroupCycle(c) ? (findGroup ? findGroup(c.group) : null) : findParts ? findParts(c.parts) : null;
      if (meshes && meshes.length) {
        rec = partRecord(meshes, modelNode);
        for (const p of rec.parts) p.restLocalInv = p.restLocal.clone().invert();
        rec.frontAz = frontAz;
      }
    } else {
      const node = c.target === PRODUCT_TARGET ? (c.assetId === productId ? productNode : null) : findObject(c.target, c.assetId);
      // the product's box is its model's (the transform group also holds added objects)
      const box = node ? boxInFrame(node, c.target === PRODUCT_TARGET && modelNode ? meshesUnder(modelNode) : meshesUnder(node)) : null;
      if (node && box) rec = { kind: "node", ...recordNode(node), box, frontAz: c.target === PRODUCT_TARGET ? frontAz : 0 };
    }
    resolved.set(id, rec);
    return rec;
  };
  // the model's rest placement inside the product node (Roll with movement works in the model frame)
  let inner = { quaternion: [0, 0, 0, 1], scale: 1 };
  if (modelNode) {
    productNode.updateWorldMatrix(true, true);
    const m = productNode.matrixWorld.clone().invert().multiply(modelNode.matrixWorld);
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    m.decompose(new THREE.Vector3(), q, s);
    inner = { quaternion: q.toArray(), scale: s.x };
  }
  let any = false;
  const perShot = shotCycleLists(anim).map((cycles, k) => {
    const live = [];
    let table;
    for (const c of cycles) {
      if (!isCycle(c)) continue;
      const rec = recordFor(c);
      if (!rec) continue;
      const item = { cycle: c, rec };
      if (c.type === "spin" && c.roll) {
        if (table === undefined) table = rollTable(keyed.perShot[k]?.[PRODUCT_TARGET], shotInfo[k].durationS, inner);
        item.table = table;
        item.axis = cycleAxis(c, rec.box, rec.frontAz);
        item.radius = wheelRadius(rec.box, item.axis);
      }
      live.push(item);
      any = true;
    }
    return live;
  });
  if (!any) return null;
  // nodes a cycle moves that no key target sets each frame: reset to rest before the cycles run
  const keyedNodes = new Set();
  for (const c of keyed.targets.values()) (c.kind === "parts" ? c.parts : [c]).forEach((r) => keyedNodes.add(r.node));
  const rest = new Map();
  for (const rec of resolved.values()) {
    if (!rec) continue;
    for (const r of rec.kind === "parts" ? rec.parts : [rec]) if (!keyedNodes.has(r.node) && !rest.has(r.node)) rest.set(r.node, r);
  }
  return { perShot, rest: [...rest.values()] };
}

// The Roll with movement angle of a spin item at shot time t (rad).
export const rollAngleAt = (item, t) => (item.table ? rollAngle(rollAt(item.table, t).move, item.axis, item.radius) : 0);

const _cm = new THREE.Matrix4();
const _cd = new THREE.Matrix4();
const _cx = new THREE.Matrix4();
function applyCycles(cycles, shotIndex, t) {
  for (const r of cycles.rest) restoreOne(r);
  for (const item of cycles.perShot[shotIndex] || []) {
    const { cycle, rec } = item;
    const delta = cycleDeltaMatrix(cycle, t, rec.box, rec.frontAz, item.table ? rollAngleAt(item, t) : 0);
    if (!delta) continue;
    _cd.fromArray(delta);
    for (const r of rec.kind === "parts" ? rec.parts : [rec]) {
      // the delta in the node's rest frame: restLocal^-1 * parentToModel^-1 * delta * parentToModel * restLocal
      if (rec.kind === "parts") _cx.copy(r.restLocalInv).multiply(r.p2mInv).multiply(_cd).multiply(r.p2m).multiply(r.restLocal);
      else _cx.copy(_cd);
      _cm.compose(r.node.position, r.node.quaternion, r.node.scale).multiply(_cx);
      _cm.decompose(r.node.position, r.node.quaternion, r.node.scale);
    }
  }
}

function restoreOne(c) {
  c.node.position.copy(c.position);
  c.node.rotation.copy(c.rotation);
  c.node.scale.copy(c.scale);
}

const restoreRecord = (c) => (c.kind === "parts" ? c.parts.forEach(restoreOne) : restoreOne(c));

export function restoreKeyed(keyed) {
  for (const c of keyed.targets.values()) restoreRecord(c);
  if (keyed.cycles) for (const r of keyed.cycles.rest) restoreOne(r); // Slice C4a
  for (const r of keyed.anchors || []) restoreOne(r);
  reelTime.active = false;
}

// Non-riders keep their rest WORLD pose under the moved product group:
// local' = parentNow^-1 * parentRest * local (local = their key/cycle pose, or rest).
const _pa = new THREE.Matrix4();
const _pb = new THREE.Matrix4();
function holdAnchors(keyed) {
  keyed.productNode.updateWorldMatrix(true, true);
  for (const r of keyed.anchors) {
    const n = r.node;
    n.updateMatrix();
    _pa.copy(n.parent.matrixWorld).invert().multiply(r.parentRest);
    _pb.multiplyMatrices(_pa, n.matrix);
    _pb.decompose(n.position, n.quaternion, n.scale);
  }
}

// Slice C3b: a part group's relative pose, about its pivot, in the model frame:
// each mesh's local matrix = parentToModel^-1 * delta * parentToModel * rest.
const _m = new THREE.Matrix4();
const _d = new THREE.Matrix4();
function applyParts(c, keys, pose, frontAz) {
  const pivot = pivotPoint(c.box, keys[0].pivot, frontAz);
  const delta = pivot ? partDeltaMatrix(pose, pivot) : null;
  if (!delta) return c.parts.forEach(restoreOne);
  _d.fromArray(delta);
  for (const part of c.parts) {
    _m.copy(part.p2mInv).multiply(_d).multiply(part.p2m).multiply(part.restLocal);
    _m.decompose(part.node.position, part.node.quaternion, part.node.scale);
  }
}

export function applyKeyed(keyed, shotIndex, t) {
  const g = keyed.perShot[shotIndex] || {};
  reelTime.active = true;
  reelTime.shot = shotIndex;
  reelTime.t = t;
  for (const r of keyed.anchors || []) restoreOne(r); // keys and cycles below may re-pose them
  for (const [target, c] of keyed.targets) {
    const pose = g[target] ? sampleKeys(g[target], t) : null;
    if (!pose) {
      restoreRecord(c);
      continue;
    }
    if (c.kind === "parts") {
      applyParts(c, g[target], pose, keyed.frontAz);
      continue;
    }
    c.node.position.fromArray(pose.position);
    c.node.quaternion.fromArray(pose.quaternion);
    c.node.scale.fromArray(pose.scale);
  }
  if (keyed.cycles) applyCycles(keyed.cycles, shotIndex, t); // Slice C4a: on top of the keys
  if (keyed.anchors && keyed.anchors.length) holdAnchors(keyed);
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
