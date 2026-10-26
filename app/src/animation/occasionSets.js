/* The one builder behind every ready-made occasion set: it reads a set from
   occasionSetDefs.js and lays out the stage look, the props, the placed effects
   and the Reel - the bike riding in with its wheels rolling, the cabinet door
   flipping open in the finale.
   halloweenSet.js is a thin wrapper around this for the Halloween Night set,
   which was the first set and whose exports other files still use. */

import * as garageMode from "../garage/garageMode";
import * as garageStore from "../garage/garageStore";
import * as animStore from "./animationStore";
import { partsTarget, PRODUCT_TARGET } from "./reelKeys";
import { groupTarget } from "./reelCycles";
import { setReelFraming } from "./reelFraming";
import { setStageLook } from "../fx/stageLook";
import { setLookPreset } from "../fx/lookStore";
import * as effectsStore from "../fx/effectsStore";
import { OCCASION_SETS, SET_PRODUCT_ID, RIDE_IN, DOOR_OPEN, DEFAULT_SHOTS } from "./occasionSetDefs";

export { OCCASION_SETS, SET_PRODUCT_ID, RIDE_IN, DOOR_OPEN, DEFAULT_SHOTS };

const WHEELS = ["Front_Wheel_pivot", "Rear_Wheel_pivot", "Sidecar_wheel__axle_pivot"];

const fail = (message) => ({ ok: false, message });

// Lays out the set for one occasion and its Reel. onProgress(text) reports each
// step. Resolves { ok, message, warnings }.
export async function buildOccasionSet(occasionId, { productId, onProgress = () => {} }) {
  const set = OCCASION_SETS[occasionId];
  if (!set) return fail("This occasion has no ready-made set yet.");
  if (productId !== SET_PRODUCT_ID) return fail("Switch to the BBQ Bike first (Creator → products).");
  const api = garageMode.apiRef.current;
  if (!api || !api.addObject || !api.findNamedGroup) return fail("The studio is still loading. Try again in a moment.");
  if (animStore.getSnapshot().mode !== "idle") return fail("Stop the Reel preview or export first.");
  const warnings = [];
  const shots = set.shots || DEFAULT_SHOTS;

  // 0. The set's stage (the night stage has its own sky, ground, mist and
  // moonlight; no backdrop photo) and its Look, with Reels framed on the bike
  // rather than on the whole set.
  setStageLook(set.stage);
  setReelFraming("product");
  setLookPreset(set.look);

  // 1. Clear the stage's added objects, then lay out the props.
  for (const o of api.listObjects()) garageStore.removeItem(o.itemId);
  for (let i = 0; i < set.props.length; i++) {
    const [assetId, x, y, z, turn, s] = set.props[i];
    onProgress(`Placing props ${i + 1}/${set.props.length}…`);
    const r = await api.addObject(assetId, { transform: { x, y, z, rx: 0, ry: turn, rz: 0, s } });
    if (!r.ok) warnings.push(r.message || `Could not add ${assetId}.`);
  }

  // 1b. The set's effects, on the ground. A set with no effects of its own
  // (Halloween) leaves the placed effects alone.
  if (set.effects) {
    onProgress("Adding effects…");
    effectsStore.clearEffects();
    const floorY = api.getFloorY ? api.getFloorY() : 0;
    for (const [type, x, z, size] of set.effects) {
      const r = effectsStore.addEffect(type, [x, floorY, z]);
      if (!r.ok) warnings.push(r.message);
      const list = effectsStore.getSnapshot().effects;
      if (r.ok && list.length) effectsStore.setEffectSize(list[list.length - 1].id, size);
    }
  }

  // 2. The Reel: the set's shots.
  onProgress("Building the Reel…");
  animStore.resetSequence();
  animStore.setShot(0, shots[0]);
  for (let i = 1; i < shots.length; i++) {
    animStore.addShot();
    const r = animStore.setShot(i, shots[i]);
    if (!r.ok) warnings.push(r.reason);
  }

  // 3. The bike rides in from behind the set and stops at its spot.
  const rest = animStore.readProductTransform() || { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };
  if (set.rideIn) {
    const ride = [
      { t: 0, transform: { ...rest, z: rest.z - set.rideIn.distance }, easing: "out" },
      { t: set.rideIn.arriveS, transform: { ...rest }, easing: "hold" },
    ];
    for (const k of ride) {
      const r = animStore.addKey(set.rideIn.shot, { ...k, target: PRODUCT_TARGET, assetId: productId });
      if (!r.ok) warnings.push(r.reason);
    }
    // ...its wheels roll with the movement
    for (const name of WHEELS) {
      const g = api.findNamedGroup(name);
      if (!g) {
        warnings.push(`No ${name} on this bike; that wheel won't turn.`);
        continue;
      }
      const r = animStore.addCycle(set.rideIn.shot, { type: "spin", target: groupTarget(g.path), group: g.path, assetId: productId, rpm: 30, axis: "auto", roll: true });
      if (!r.ok) warnings.push(r.reason);
    }
  }

  // 3b. Any extra keys on the bike, as offsets from its rest pose.
  for (const k of set.productKeys || []) {
    const transform = { ...rest };
    for (const [field, v] of Object.entries(k.offset)) transform[field] = (rest[field] ?? 0) + v;
    const r = animStore.addKey(k.shot, { t: k.t, transform, easing: k.easing, target: PRODUCT_TARGET, assetId: productId });
    if (!r.ok) warnings.push(r.reason);
  }

  // 4. In the finale: the cabinet door, hinged along its top edge, flips up and out.
  if (set.door) {
    const door = api.findNamedGroup("Front_Door");
    if (door && door.ids.length) {
      const base = { target: partsTarget(door.ids), parts: door.ids, pivot: "front-top", assetId: productId };
      const zero = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };
      for (const k of [
        { t: set.door.startS, transform: zero, easing: "out" },
        { t: set.door.startS + set.door.openS, transform: { ...zero, rx: set.door.angleDeg }, easing: "hold" },
      ]) {
        const r = animStore.addKey(set.door.shot, { ...base, ...k });
        if (!r.ok) warnings.push(r.reason);
      }
    } else warnings.push("No Front_Door on this bike; the door won't open.");
  }

  return {
    ok: true,
    message: warnings.length ? `Set built with ${warnings.length} note(s).` : `${set.name} set is ready. Open Reel to preview.`,
    warnings,
  };
}
