/* The "Halloween Night" set: one click lays out the BBQ Bike Halloween scene
   (the layout approved in Blender) and its Reel - the bike riding in with its
   wheels rolling, the cabinet door flipping open in the finale.
   Coordinates are the stage's model frame (metres, Y up, the bike's front +Z).
   Every prop GLB is normalised to about 1 unit, so each carries its real scale. */

import * as garageMode from "../garage/garageMode";
import * as garageStore from "../garage/garageStore";
import * as animStore from "./animationStore";
import { partsTarget, PRODUCT_TARGET } from "./reelKeys";
import { groupTarget } from "./reelCycles";
import { setReelFraming } from "./reelFraming";
import { setStageLook } from "../fx/stageLook";
import { setLookPreset } from "../fx/lookStore";

export const SET_PRODUCT_ID = "bbq-bike";

// [assetId, x, y, z, turnDeg, scale] - at most 12 props (the Garage limit)
const PROPS = [
  ["prop-bbqsmith-bare-tree", -1.75, 0, -1.55, 20, 3.4],
  ["prop-bbqsmith-bare-tree", 2.55, 0, -1.45, -40, 3.0],
  ["prop-halloween-pumpkin-crab", -0.83, 0, 0.91, -41, 0.924],
  ["prop-bbqsmith-whisky-barrel", 1.95, 0, 1.83, 15, 0.85],
  ["prop-bbqsmith-whisky-barrel", -1.45, 0, 0.55, -25, 0.75],
  ["prop-bbqsmith-half-barrel", -1.53, 0.75, 0.734, -76, 0.7], // stacked on the barrel above
  ["prop-bbq-chicken-burger-v2", 0.98, 0, 1.7, -15, 0.16],
  ["prop-bbq-chicken-drumsticks", 0.55, 0, 2.0, 30, 0.22],
  // riding on the bike: the utensils hang on the grill's side, the food sits on the grate
  ["prop-bbqsmith-utensils", 1.07, 0.66, 0.15, 90, 0.6],
  ["prop-bbq-chicken-drumsticks", 0.82, 1.21, 0.378, 10, 0.26],
  ["prop-bbq-chicken-wing", 0.8, 1.21, -0.02, 70, 0.19],
  ["prop-bbq-chicken-burger", 0.81, 1.21, 0.66, 0, 0.14],
];

// 28 s, five shots
const SHOTS = [
  { move: "push-in", startView: "3/4", durationS: 8 }, // the bike rides in and stops
  { move: "orbit", startView: "Low Hero", durationS: 4 },
  { move: "crane", startView: "Top", durationS: 4 }, // the food on the grate
  { move: "slide", startView: "Side", durationS: 4 },
  { move: "pull-back", startView: "Front", durationS: 8 }, // the door flips open, bats burst out
];
export const RIDE_IN = { shot: 0, distance: 5.5, arriveS: 5.5 };
export const DOOR_OPEN = { shot: 4, startS: 0.6, openS: 1.2, angleDeg: -100 };
const WHEELS = ["Front_Wheel_pivot", "Rear_Wheel_pivot", "Sidecar_wheel__axle_pivot"];

const fail = (message) => ({ ok: false, message });

// Lays out the set and its Reel. onProgress(text) reports each step.
// Resolves { ok, message, warnings }.
export async function buildHalloweenSet({ productId, onProgress = () => {} }) {
  if (productId !== SET_PRODUCT_ID) return fail("Switch to the BBQ Bike first (Creator → products).");
  const api = garageMode.apiRef.current;
  if (!api || !api.addObject || !api.findNamedGroup) return fail("The studio is still loading. Try again in a moment.");
  if (animStore.getSnapshot().mode !== "idle") return fail("Stop the Reel preview or export first.");
  const warnings = [];

  // 0. Its own night stage (sky, ground, mist, moonlight; no backdrop photo), and
  // Reels framed on the bike rather than on the whole set.
  setStageLook("night");
  setReelFraming("product");
  setLookPreset("moonlit");

  // 1. Clear the stage's added objects, then lay out the props.
  for (const o of api.listObjects()) garageStore.removeItem(o.itemId);
  for (let i = 0; i < PROPS.length; i++) {
    const [assetId, x, y, z, turn, s] = PROPS[i];
    onProgress(`Placing props ${i + 1}/${PROPS.length}…`);
    const r = await api.addObject(assetId, { transform: { x, y, z, rx: 0, ry: turn, rz: 0, s } });
    if (!r.ok) warnings.push(r.message || `Could not add ${assetId}.`);
  }

  // 2. The Reel: five shots.
  onProgress("Building the Reel…");
  animStore.resetSequence();
  animStore.setShot(0, SHOTS[0]);
  for (let i = 1; i < SHOTS.length; i++) {
    animStore.addShot();
    const r = animStore.setShot(i, SHOTS[i]);
    if (!r.ok) warnings.push(r.reason);
  }

  // 3. Shot 1: the bike rides in from behind the trees and stops at its spot.
  const rest = animStore.readProductTransform() || { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };
  const ride = [
    { t: 0, transform: { ...rest, z: rest.z - RIDE_IN.distance }, easing: "out" },
    { t: RIDE_IN.arriveS, transform: { ...rest }, easing: "hold" },
  ];
  for (const k of ride) {
    const r = animStore.addKey(RIDE_IN.shot, { ...k, target: PRODUCT_TARGET, assetId: productId });
    if (!r.ok) warnings.push(r.reason);
  }
  // ...its wheels roll with the movement
  for (const name of WHEELS) {
    const g = api.findNamedGroup(name);
    if (!g) {
      warnings.push(`No ${name} on this bike; that wheel won't turn.`);
      continue;
    }
    const r = animStore.addCycle(RIDE_IN.shot, { type: "spin", target: groupTarget(g.path), group: g.path, assetId: productId, rpm: 30, axis: "auto", roll: true });
    if (!r.ok) warnings.push(r.reason);
  }

  // 4. Shot 5: the cabinet door, hinged along its top edge, flips up and out.
  const door = api.findNamedGroup("Front_Door");
  if (door && door.ids.length) {
    const base = { target: partsTarget(door.ids), parts: door.ids, pivot: "front-top", assetId: productId };
    const zero = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };
    for (const k of [
      { t: DOOR_OPEN.startS, transform: zero, easing: "out" },
      { t: DOOR_OPEN.startS + DOOR_OPEN.openS, transform: { ...zero, rx: DOOR_OPEN.angleDeg }, easing: "hold" },
    ]) {
      const r = animStore.addKey(DOOR_OPEN.shot, { ...base, ...k });
      if (!r.ok) warnings.push(r.reason);
    }
  } else warnings.push("No Front_Door on this bike; the door won't open.");

  return {
    ok: true,
    message: warnings.length ? `Set built with ${warnings.length} note(s).` : "Halloween Night set is ready. Open Reel to preview.",
    warnings,
  };
}
