import { snapTime, isKey } from "./reelKeys.js";
import { isCycle } from "./reelCycles.js";
import { setShotKeys, setShotCycles } from "./reelSequence.js";

const steeringParts = [
  "Motorcycle~0/Brake_Cable~0",
  "Motorcycle~0/Front_Fork_Lower_L~0",
  "Motorcycle~0/Front_Fork_Lower_R~0",
  "Motorcycle~0/Front_Fork_Upper~0",
  "Motorcycle~0/Front_Mudguard~0",
  "Motorcycle~0/Front_Wheel_pivot~0",
  "Motorcycle~0/Handlebar_Headlamp~0"
].sort();

const bodyParts = [
  "Motorcycle~0/Engine_Frame~0",
  "Motorcycle~0/Exhaust~0",
  "Motorcycle~0/Fuel_Tank~0",
  "Motorcycle~0/Mirror_L~0",
  "Motorcycle~0/Mirror_R~0",
  "Motorcycle~0/Rear_Mudguard~0",
  "Motorcycle~0/Seat~0"
].sort();

export const BIKE_RIG = {
  productId: "bbq-bike",
  parts: {
    frontWheel: "Motorcycle~0/Front_Wheel_pivot~0",
    rearWheel: "Motorcycle~0/Rear_Wheel_pivot~0",
    sidecarWheel: "Sidecar_wheel__axle_pivot~0",
    steering: "parts:" + steeringParts.join("|"),
    body: "parts:" + bodyParts.join("|")
  }
};

export const BIKE_MOVES = ["rideIn", "idle", "turnLeft", "turnRight"];
export const BIKE_MOVE_LABELS = {
  rideIn: "Ride in",
  idle: "Idle",
  turnLeft: "Turn left",
  turnRight: "Turn right"
};

// The steering pivot is an approximation: it uses the group's box centre, not the true steering-head axis.
export function bikeMove(moveId, shotDurationS, productId) {
  if (productId !== "bbq-bike" || !BIKE_MOVES.includes(moveId)) return null;
  const keys = [];
  const cycles = [];
  const addK = (t, target, tr, easing, pivot = undefined, parts = undefined) => {
    const k = { t: snapTime(t, shotDurationS), target, assetId: "bbq-bike", transform: tr, easing };
    if (pivot) k.pivot = pivot;
    if (parts) k.parts = parts;
    keys.push(k);
  };

  const steerParts = BIKE_RIG.parts.steering.replace("parts:", "").split("|");

  if (moveId === "rideIn") {
    addK(0, "product", { x: 0, y: 0, z: -6, rx: 0, ry: 0, rz: 0, s: 1 }, "out");
    addK(0.85 * shotDurationS, "product", { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }, "hold");

    cycles.push({ type: "spin", target: "group:" + BIKE_RIG.parts.frontWheel, group: BIKE_RIG.parts.frontWheel, assetId: "bbq-bike", rpm: 30, axis: "auto", roll: true });
    cycles.push({ type: "spin", target: "group:" + BIKE_RIG.parts.rearWheel, group: BIKE_RIG.parts.rearWheel, assetId: "bbq-bike", rpm: 30, axis: "auto", roll: true });
    cycles.push({ type: "spin", target: "group:" + BIKE_RIG.parts.sidecarWheel, group: BIKE_RIG.parts.sidecarWheel, assetId: "bbq-bike", rpm: 30, axis: "auto", roll: true });
    cycles.push({ type: "bob", target: "product", assetId: "bbq-bike", amplitude: 0.006, period: 0.45 });
  } else if (moveId === "idle") {
    cycles.push({ type: "bob", target: "product", assetId: "bbq-bike", amplitude: 0.002, period: 0.12 });
    cycles.push({ type: "bob", target: "product", assetId: "bbq-bike", amplitude: 0.004, period: 1.6 });
  } else if (moveId === "turnLeft" || moveId === "turnRight") {
    // Model frame: the bike's front is +Z and its LEFT is +X (the sidecar side). A positive yaw (ry)
    // turns the front toward +X, so +sign = left. Leaning into the turn is a roll toward the turn
    // side, which is a NEGATIVE rz for a left turn (the left side goes down).
    // The bike drives along a circular arc (radius 4 m, 35 degrees) that ENDS at the rest pose, so the
    // wheels really roll (roll counts the distance the product travels along its keyed path).
    const sign = moveId === "turnLeft" ? 1 : -1;
    const R = 4, END = 35 * Math.PI / 180, MID = END / 2;
    const dx = R * (1 - Math.cos(END)), dz = R * Math.sin(END);
    const pose = (th, yaw, roll) => ({ x: sign * (R * (1 - Math.cos(th)) - dx), y: 0, z: R * Math.sin(th) - dz, rx: 0, ry: sign * yaw, rz: -sign * roll, s: 1 });
    addK(0, "product", pose(0, 0, 0), "smooth");
    addK(shotDurationS / 2, "product", pose(MID, 17.5, 6), "smooth");
    addK(shotDurationS, "product", pose(END, 35, 0), "hold");

    addK(0, BIKE_RIG.parts.steering, { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }, "smooth", "centre", steerParts);
    addK(shotDurationS / 2, BIKE_RIG.parts.steering, { x: 0, y: 0, z: 0, rx: 0, ry: sign * 18, rz: 0, s: 1 }, "smooth", "centre", steerParts);
    addK(shotDurationS, BIKE_RIG.parts.steering, { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }, "hold", "centre", steerParts);

    cycles.push({ type: "spin", target: "group:" + BIKE_RIG.parts.frontWheel, group: BIKE_RIG.parts.frontWheel, assetId: "bbq-bike", rpm: 30, axis: "auto", roll: true });
    cycles.push({ type: "spin", target: "group:" + BIKE_RIG.parts.rearWheel, group: BIKE_RIG.parts.rearWheel, assetId: "bbq-bike", rpm: 30, axis: "auto", roll: true });
    cycles.push({ type: "spin", target: "group:" + BIKE_RIG.parts.sidecarWheel, group: BIKE_RIG.parts.sidecarWheel, assetId: "bbq-bike", rpm: 30, axis: "auto", roll: true });
  }
  
  return { keys, cycles };
}

export function applyBikeMove(seq, i, moveId, productId) {
  const move = bikeMove(moveId, seq[i].durationS, productId);
  if (!move) return { seq, ok: false, reason: "Invalid move or product." };
  
  for (const k of move.keys) {
    if (!isKey(k)) return { seq, ok: false, reason: "Invalid key generated." };
  }
  for (const c of move.cycles) {
    if (!isCycle(c)) return { seq, ok: false, reason: "Invalid cycle generated." };
  }
  
  let res = setShotKeys(seq, i, move.keys);
  if (!res.ok) return { seq, ok: false, reason: res.reason };
  
  res = setShotCycles(res.seq, i, move.cycles);
  if (!res.ok) return { seq, ok: false, reason: res.reason };
  
  return { seq: res.seq, ok: true, reason: "" };
}