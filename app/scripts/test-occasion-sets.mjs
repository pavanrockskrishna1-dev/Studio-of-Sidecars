// Checks for the ready-made occasion sets (app/src/animation/occasionSetDefs.js,
// built by occasionSets.js): that every occasion except "No theme" has a set,
// that every prop id and effect type in a set really exists, that the props,
// effects, shots, Reel length and keys stay inside the app's limits, that every
// number is finite, that the stage look and Look preset ids are real, that no
// prop blocks the ride-in path or the Front view, and that Halloween Night is
// still exactly the set that was approved in Blender (same props, same Reel,
// same door, and no effects of its own so placed effects are left alone).
// Plain node, no browser: the set table is plain data on purpose.
// Run from the app folder:  node scripts/test-occasion-sets.mjs   (exit code 1 on any FAIL)
import { readFileSync } from "node:fs";
import {
  OCCASION_SETS,
  SET_IDS,
  SET_PRODUCT_ID,
  DEFAULT_SHOTS,
  RIDE_IN,
  DOOR_OPEN,
  MAX_SET_PROPS,
  MAX_SET_EFFECTS,
  MAX_SET_SHOTS,
  MAX_SET_REEL_S,
} from "../src/animation/occasionSetDefs.js";
import { OCCASIONS } from "../src/animation/occasionDefs.js";
import { PROPS, MAX_PROPS, isPropId } from "../src/products/props.js";
import { EFFECT_TYPES, MAX_EFFECTS } from "../src/fx/effectsStore.js";
import { LOOK_IDS } from "../src/fx/lookStore.js";
import * as stageLook from "../src/fx/stageLook.js";
import { MAX_SHOTS, MAX_TOTAL_S, SHOT_DURATIONS, REEL_MOVES, REEL_START_VIEWS } from "../src/animation/reelSequence.js";
import { MAX_KEYS_PER_SHOT, KEY_FPS } from "../src/animation/reelKeys.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const num = (v) => typeof v === "number" && Number.isFinite(v);
const json = (v) => JSON.stringify(v);
const propById = (id) => PROPS.find((p) => p.id === id);
// a prop's height in metres: its real height scaled the way the set scales it
const propHeight = ([id, , , , , s]) => {
  const p = propById(id);
  if (!p) return 0;
  return p.size[1] * (s / Math.max(...p.size));
};

/* ============================ the table matches the app ============================ */
check("the sets' limits match the app's limits", MAX_SET_PROPS === MAX_PROPS && MAX_SET_EFFECTS === MAX_EFFECTS && MAX_SET_SHOTS === MAX_SHOTS && MAX_SET_REEL_S === MAX_TOTAL_S);
check("the sets are built for the BBQ Bike", SET_PRODUCT_ID === "bbq-bike");

const occasionIds = OCCASIONS.map((o) => o.id).filter((id) => id !== "none");
for (const id of occasionIds) check(`occasion "${id}" has a ready-made set`, !!OCCASION_SETS[id]);
check("no set is for an unknown occasion", SET_IDS.every((id) => occasionIds.includes(id)), SET_IDS.filter((id) => !occasionIds.includes(id)).join(" "));
check("the sets cover every occasion exactly once", SET_IDS.length === occasionIds.length, `${SET_IDS.length} sets, ${occasionIds.length} occasions`);

/* ============================ every set ============================ */
for (const id of SET_IDS) {
  const s = OCCASION_SETS[id];
  const shots = s.shots || DEFAULT_SHOTS;

  // what the sheet shows on the button
  check(`${id}: has a name, emoji and blurb`, !!s.name && !!s.emoji && typeof s.blurb === "string" && s.blurb.length > 20);

  // stage and Look
  stageLook.setStageLook(s.stage);
  check(`${id}: stage look "${s.stage}" is a real stage`, stageLook.getSnapshot().look === s.stage);
  check(`${id}: Look preset "${s.look}" is a real preset`, LOOK_IDS.includes(s.look), LOOK_IDS.join(" "));

  // props
  check(`${id}: at most ${MAX_SET_PROPS} props`, s.props.length <= MAX_SET_PROPS, `${s.props.length} props`);
  check(`${id}: has props`, s.props.length > 0);
  for (const row of s.props) {
    const [assetId, x, y, z, turn, scale] = row;
    check(`${id}: prop "${assetId}" exists in PROPS`, isPropId(assetId));
    check(`${id}: prop "${assetId}" has finite numbers`, [x, y, z, turn, scale].every(num) && scale > 0 && y >= 0, json(row));
    const p = propById(assetId);
    if (p) {
      const biggest = Math.max(...p.size);
      check(`${id}: prop "${assetId}" scale ${scale} is sane for a ${biggest} m prop`, scale >= biggest * 0.2 && scale <= biggest * 2, `scale ${scale}, biggest side ${biggest} m`);
    }
    // the bike is the hero: nothing on the ground may stand in the ride-in path
    // (x about 0, z from -5.5 to 0) or tall in the Front camera's view.
    // Props mounted on the bike itself (y above 0.3) ride with it.
    if (y <= 0.3) {
      const inPath = Math.abs(x) < 1.2 && z < -0.2 && z > -(RIDE_IN.distance + 1);
      check(`${id}: prop "${assetId}" is clear of the ride-in path`, !inPath, json([x, z]));
      const blocksFront = Math.abs(x) < 0.8 && z > 1 && propHeight(row) > 0.5;
      check(`${id}: prop "${assetId}" does not block the Front view`, !blocksFront, `${propHeight(row).toFixed(2)} m tall at ${json([x, z])}`);
    }
  }

  // effects: left out means "leave the placed effects alone"
  if ("effects" in s) {
    check(`${id}: at most ${MAX_SET_EFFECTS} effects`, s.effects.length <= MAX_SET_EFFECTS, `${s.effects.length} effects`);
    for (const row of s.effects) {
      const [type, x, z, size] = row;
      check(`${id}: effect "${type}" is a real effect type`, !!EFFECT_TYPES[type], Object.keys(EFFECT_TYPES).join(" "));
      check(`${id}: effect "${type}" has finite numbers`, [x, z, size].every(num) && size >= 0.25 && size <= 4, json(row));
    }
  }

  // the Reel
  check(`${id}: at most ${MAX_SET_SHOTS} shots`, shots.length >= 1 && shots.length <= MAX_SET_SHOTS, `${shots.length} shots`);
  const total = shots.reduce((a, sh) => a + sh.durationS, 0);
  check(`${id}: the Reel is at most ${MAX_SET_REEL_S} s`, total <= MAX_SET_REEL_S, `${total} s`);
  for (const sh of shots) {
    check(`${id}: shot move "${sh.move}" is a real move`, REEL_MOVES.includes(sh.move));
    check(`${id}: shot start view "${sh.startView}" is a real view`, REEL_START_VIEWS.includes(sh.startView));
    check(`${id}: shot duration ${sh.durationS} s is allowed`, SHOT_DURATIONS.includes(sh.durationS), SHOT_DURATIONS.join("/"));
  }

  // the ride-in, the door and any extra keys, per shot
  const keysPerShot = shots.map(() => 0);
  const onFrame = (t) => Math.abs(t * KEY_FPS - Math.round(t * KEY_FPS)) < 1e-9;
  if (s.rideIn) {
    const sh = shots[s.rideIn.shot];
    check(`${id}: the ride-in is on a shot that exists`, !!sh, `shot ${s.rideIn.shot}`);
    check(`${id}: the ride-in numbers are finite`, num(s.rideIn.distance) && num(s.rideIn.arriveS) && s.rideIn.distance > 0, json(s.rideIn));
    if (sh) check(`${id}: the bike arrives before its shot ends`, s.rideIn.arriveS <= sh.durationS, `${s.rideIn.arriveS} s of ${sh.durationS} s`);
    check(`${id}: the ride-in keys land on whole frames`, onFrame(s.rideIn.arriveS));
    keysPerShot[s.rideIn.shot] += 2;
  }
  if (s.door) {
    const sh = shots[s.door.shot];
    check(`${id}: the door is on a shot that exists`, !!sh, `shot ${s.door.shot}`);
    check(`${id}: the door numbers are finite`, [s.door.startS, s.door.openS, s.door.angleDeg].every(num) && s.door.openS > 0, json(s.door));
    if (sh) check(`${id}: the door finishes opening before its shot ends`, s.door.startS + s.door.openS <= sh.durationS);
    check(`${id}: the door keys land on whole frames`, onFrame(s.door.startS) && onFrame(s.door.startS + s.door.openS));
    keysPerShot[s.door.shot] += 2;
  }
  for (const k of s.productKeys || []) {
    const sh = shots[k.shot];
    check(`${id}: an extra bike key is on a shot that exists`, !!sh, `shot ${k.shot}`);
    check(`${id}: an extra bike key fits its shot and lands on a whole frame`, num(k.t) && k.t >= 0 && (!sh || k.t <= sh.durationS) && onFrame(k.t), json(k));
    check(`${id}: an extra bike key's offsets are finite`, Object.values(k.offset).every(num) && Object.keys(k.offset).every((f) => ["x", "y", "z", "rx", "ry", "rz"].includes(f)), json(k.offset));
    keysPerShot[k.shot] += 1;
  }
  check(`${id}: no shot is over the ${MAX_KEYS_PER_SHOT}-key limit`, keysPerShot.every((n) => n <= MAX_KEYS_PER_SHOT), json(keysPerShot));
}

/* ============================ Halloween Night is unchanged ============================ */
const H = OCCASION_SETS.halloween;
const HALLOWEEN_PROPS = [
  ["prop-bbqsmith-bare-tree", -1.75, 0, -1.55, 20, 3.4],
  ["prop-bbqsmith-bare-tree", 2.55, 0, -1.45, -40, 3.0],
  ["prop-halloween-pumpkin-crab", -0.83, 0, 0.91, -41, 0.924],
  ["prop-bbqsmith-whisky-barrel", 1.95, 0, 1.83, 15, 0.85],
  ["prop-bbqsmith-whisky-barrel", -1.45, 0, 0.55, -25, 0.75],
  ["prop-bbqsmith-half-barrel", -1.53, 0.75, 0.734, -76, 0.7],
  ["prop-bbq-chicken-burger-v2", 0.98, 0, 1.7, -15, 0.16],
  ["prop-bbq-chicken-drumsticks", 0.55, 0, 2.0, 30, 0.22],
  ["prop-bbqsmith-utensils", 1.07, 0.66, 0.15, 90, 0.6],
  ["prop-bbq-chicken-drumsticks", 0.82, 1.21, 0.378, 10, 0.26],
  ["prop-bbq-chicken-wing", 0.8, 1.21, -0.02, 70, 0.19],
  ["prop-bbq-chicken-burger", 0.81, 1.21, 0.66, 0, 0.14],
];
check("Halloween Night: the same 12 props in the same places", json(H.props) === json(HALLOWEEN_PROPS), json(H.props));
check("Halloween Night: the night stage and the moonlit Look", H.stage === "night" && H.look === "moonlit");
check("Halloween Night: no effects of its own, so placed effects are left alone", !("effects" in H));
check("Halloween Night: the same five shots, 28 s", json(H.shots) === json(DEFAULT_SHOTS) && H.shots.reduce((a, sh) => a + sh.durationS, 0) === 28);
check("Halloween Night: the same ride-in and the same door", json(H.rideIn) === json(RIDE_IN) && json(H.door) === json(DOOR_OPEN));
check("Halloween Night: no extra bike keys", !H.productKeys);
check("the exported DOOR_OPEN that BatBurst times the bats off is unchanged", json(DOOR_OPEN) === json({ shot: 4, startS: 0.6, openS: 1.2, angleDeg: -100 }));
check("halloweenSet.js still exports what the app imports from it", /export \{ SET_PRODUCT_ID, RIDE_IN, DOOR_OPEN \}/.test(readFileSync(new URL("../src/animation/halloweenSet.js", import.meta.url), "utf8")) && /export const buildHalloweenSet/.test(readFileSync(new URL("../src/animation/halloweenSet.js", import.meta.url), "utf8")));

/* ============================ every effect type can be drawn ============================ */
const layer = readFileSync(new URL("../src/fx/EffectsLayer.jsx", import.meta.url), "utf8");
for (const type of Object.keys(EFFECT_TYPES)) {
  const isKind = new RegExp(`^ {2}${type}:`, "m").test(layer);
  const isMesh = layer.includes(`e.type === "${type}"`);
  check(`effect "${type}" is drawn by EffectsLayer`, isKind || isMesh);
  check(`effect "${type}" has a label and a hint`, !!EFFECT_TYPES[type].label && !!EFFECT_TYPES[type].hint);
}
check('"snowground" is an effect type', !!EFFECT_TYPES.snowground && EFFECT_TYPES.snowground.label === "Snow ground");
check('"snowground" is the still mesh, not a particle kind', !/^ {2}snowground:/m.test(layer) && layer.includes('e.type === "snowground"'));
check('the new effect types are all there', ["powder", "hearts", "tricolor", "snowground"].every((t) => !!EFFECT_TYPES[t]));
check("Christmas Eve lays snow on the ground as well as falling snow", OCCASION_SETS.christmas.effects.some((e) => e[0] === "snowground") && OCCASION_SETS.christmas.effects.some((e) => e[0] === "snow"));

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
