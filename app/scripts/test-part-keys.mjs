// Slice C3b — checks for part keys and the Custom curve: app/src/animation/
// partKeys.js (the 13 pivots: centre and the 12 named box edges, for every
// product front; the relative part transform about a pivot) and the C3b parts
// of app/src/animation/reelKeys.js (part-group keys, the Custom easing with its
// Bezier solver ported from MotionLab and its monotonic clamping, the 16-key
// limit for whole objects and parts together, missing parts, pivots, and the
// session round trip). Plain node, no browser, no three.js.
// Run from the app folder:  node scripts/test-part-keys.mjs   (exit code 1 on any FAIL)
import { readFileSync } from "node:fs";
import * as P from "../src/animation/partKeys.js";
import * as K from "../src/animation/reelKeys.js";
import * as R from "../src/animation/reelSequence.js";
import * as store from "../src/animation/animationStore.js";
import { validateAnimation } from "../src/animation/path.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const nearV = (a, b, eps = 1e-9) => a.length === b.length && a.every((v, i) => near(v, b[i], eps));
const json = (v) => JSON.stringify(v);
const T = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => ({ x, y, z, rx, ry, rz, s });
const DOOR = ["Service_door__front~0", "Brass_pull_handle~0"];
const pkey = (t, transform, extra = {}) => ({ t, parts: DOOR, assetId: "the-kop-main", pivot: "front-left", transform, easing: "smooth", ...extra });

/* ============================ pivots ============================ */
check("13 pivots: centre + 12 edges", P.PIVOT_IDS.length === 13 && P.PIVOT_IDS[0] === "centre" && new Set(P.PIVOT_IDS).size === 13);
check("every pivot has a readable label", P.PIVOT_IDS.every((id) => typeof P.PIVOT_LABELS[id] === "string" && P.PIVOT_LABELS[id].length > 3));
check("front axes, frontAz 0: front +Z, right +X (seen from the front)", json(P.frontAxes(0).F) === "[0,0,1]" && P.frontAxes(0).R[0] === 1 && P.frontAxes(0).R[2] === 0);
check("front axes, frontAz 90 (THE KOP MAIN): front +X, right -Z", json(P.frontAxes(90).F) === "[1,0,0]" && json(P.frontAxes(90).R) === "[0,0,-1]");
check("front axes, frontAz -90 (Coffee Bike): front -X, right +Z", json(P.frontAxes(-90).F) === "[-1,0,0]" && json(P.frontAxes(-90).R) === "[0,0,1]");
check("front axes, frontAz 180: front -Z, right -X", json(P.frontAxes(180).F) === "[0,0,-1]" && json(P.frontAxes(180).R) === "[-1,0,0]");
const box = { min: [-1, 0, -3], max: [1, 2, 3] }; // centre (0, 1, 0)
check("centre pivot = box centre", json(P.pivotPoint(box, "centre", 90)) === "[0,1,0]");
// frontAz 90: front = +X (x = 1), back = x = -1, right = -Z (z = -3), left = +Z (z = 3), top y = 2, bottom y = 0
const expect90 = {
  "front-left": [1, 1, 3], "front-right": [1, 1, -3], "back-left": [-1, 1, 3], "back-right": [-1, 1, -3],
  "front-top": [1, 2, 0], "front-bottom": [1, 0, 0], "back-top": [-1, 2, 0], "back-bottom": [-1, 0, 0],
  "left-top": [0, 2, 3], "left-bottom": [0, 0, 3], "right-top": [0, 2, -3], "right-bottom": [0, 0, -3],
};
for (const [id, want] of Object.entries(expect90)) check(`frontAz 90: ${P.PIVOT_LABELS[id]} = ${json(want)}`, json(P.pivotPoint(box, id, 90)) === json(want), json(P.pivotPoint(box, id, 90)));
// frontAz 0: front = +Z (z = 3), right = +X (x = 1)
const expect0 = { "front-left": [-1, 1, 3], "back-right": [1, 1, -3], "front-top": [0, 2, 3], "right-bottom": [1, 0, 0] };
for (const [id, want] of Object.entries(expect0)) check(`frontAz 0: ${id} = ${json(want)}`, json(P.pivotPoint(box, id, 0)) === json(want), json(P.pivotPoint(box, id, 0)));
check("an edge pivot is the middle of its edge (the free axis stays at the centre)", P.pivotPoint(box, "front-left", 90)[1] === 1 && P.pivotPoint(box, "front-top", 90)[2] === 0);
check("unknown pivot / bad box -> null", P.pivotPoint(box, "middle", 0) === null && P.pivotPoint({ min: [0], max: [1] }, "centre", 0) === null);

/* ============================ relative part transforms ============================ */
const id4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const poseOf = (t) => K.poseOfKey({ transform: t });
check("a rest pose (no move, no turn, scale 1) gives the identity", nearV(P.partDeltaMatrix(poseOf(T()), [1, 2, 3]), id4));
check("a move only translates", nearV(P.applyToPoint(P.partDeltaMatrix(poseOf(T(0.1, 0.2, -0.3)), [5, 5, 5]), [1, 1, 1]), [1.1, 1.2, 0.7]));
const hinge = P.pivotPoint(box, "front-left", 90); // [1, 1, 3]
const swing = P.partDeltaMatrix(poseOf(T(0, 0, 0, 0, 90, 0)), hinge);
check("a 90 deg turn about the front-left hinge keeps the hinge point fixed", nearV(P.applyToPoint(swing, hinge), hinge));
check("...and every point on the hinge line (y = 0 .. 2) stays fixed", [0, 0.5, 2].every((y) => nearV(P.applyToPoint(swing, [1, y, 3]), [1, y, 3])));
// a point 2 m along -Z from the hinge (towards the box's right) turns +90 deg about Y: (dx, dz) = (0, -2) -> (-2, 0)
check("the far edge of the door (2 m from the hinge) swings round by 90 deg", nearV(P.applyToPoint(swing, [1, 1, 1]), [-1, 1, 3]), json(P.applyToPoint(swing, [1, 1, 1])));
const half = P.partDeltaMatrix(poseOf(T(0, 0, 0, 0, 45, 0)), hinge);
check("a 45 deg turn keeps the distance to the hinge", near(Math.hypot(...P.applyToPoint(half, [1, 1, 1]).map((v, i) => v - [1, 1, 3][i])), 2));
check("scale about the centre pivot keeps the centre fixed", nearV(P.applyToPoint(P.partDeltaMatrix(poseOf(T(0, 0, 0, 0, 0, 0, 2)), [0, 1, 0]), [0, 1, 0]), [0, 1, 0]));
check("scale 2 about the centre doubles the distance to it", nearV(P.applyToPoint(P.partDeltaMatrix(poseOf(T(0, 0, 0, 0, 0, 0, 2)), [0, 1, 0]), [1, 1, 0]), [2, 1, 0]));
check("move + turn: the hinge ends at hinge + move", nearV(P.applyToPoint(P.partDeltaMatrix(poseOf(T(0.5, 0, 0, 0, 30, 0)), hinge), hinge), [1.5, 1, 3]));
// sampled relative pose -> matrix (the playback path): at 1.5 s of a 0 -> 90 deg (Linear, 0..3 s) swing the far edge is at 45 deg
let dk = [];
dk = K.addKey(dk, pkey(0, T(), { easing: "linear" }), 8).keys;
dk = K.addKey(dk, pkey(3, T(0, 0, 0, 0, 90, 0)), 8).keys;
const sampled = K.sampleKeys(K.keysByTarget(dk)[K.partsTarget(DOOR)], 1.5);
check("a sampled part pose at the midpoint gives the 45 deg swing about the hinge", nearV(P.applyToPoint(P.partDeltaMatrix(sampled, hinge), [1, 1, 1]), P.applyToPoint(half, [1, 1, 1])));

/* ============================ part-group keys ============================ */
check("partsTarget is order-independent", K.partsTarget(["b~0", "a~0"]) === K.partsTarget(["a~0", "b~0"]) && K.partsTarget(["b~0", "a~0"]) === "parts:a~0|b~0");
const first = K.addKey([], pkey(0, T()), 8);
check("a part key is valid and stored with its parts (sorted), pivot and target", first.ok && json(first.keys[0].parts) === json([...DOOR].sort()) && first.keys[0].pivot === "front-left" && first.keys[0].target === K.partsTarget(DOOR));
check("isPartKey tells part keys from object keys", K.isPartKey(first.keys[0]) && !K.isPartKey({ target: "product" }));
check("a part key with an unknown pivot is refused", !K.addKey([], pkey(0, T(), { pivot: "middle" }), 8).ok);
check("a part key with a target that does not match its parts is refused by isKey", !K.isKey({ ...first.keys[0], target: "parts:other~0" }));
check("a part key with duplicate parts is refused", !K.addKey([], pkey(0, T(), { parts: ["a~0", "a~0"] }), 8).ok);
check("a part key with no parts is refused", !K.addKey([], pkey(0, T(), { parts: [] }), 8).ok);
check("an object key may not carry a long target", !K.isKey({ t: 0, target: "x".repeat(65), assetId: "a", transform: T(), easing: "smooth" }));
let two = K.addKey(first.keys, pkey(3, T(0, 0, 0, 0, 100, 0)), 8).keys;
check("setKeyPivot changes the pivot of every key of the group", json(K.setKeyPivot(two, K.partsTarget(DOOR), "back-top").keys.map((k) => k.pivot)) === json(["back-top", "back-top"]));
check("setKeyPivot refuses an unknown pivot / an unknown group", !K.setKeyPivot(two, K.partsTarget(DOOR), "nowhere").ok && !K.setKeyPivot(two, "parts:none~0", "centre").ok);
check("re-keying the group on the same frame replaces its key", K.addKey(two, pkey(3, T(0, 0, 0, 0, 80, 0)), 8).keys.length === 2);

/* ============================ the Custom curve ============================ */
check("Custom easing default handles are the CSS ease-in-out", json(K.DEFAULT_BEZIER) === json([0.42, 0, 0.58, 1]));
// accuracy: for points ON the curve, easeProgress(x(t)) must give y(t)
const curvePoint = (b, t) => {
  const bx = (p1, p2) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  return [bx(b[0], b[2]), bx(b[1], b[3])];
};
for (const b of [[0.42, 0, 0.58, 1], [0.6, 0, 0.9, 0.4], [0.1, 0.8, 0.3, 1.2], [0.25, 0.1, 0.25, 1]]) {
  let worst = 0;
  for (let i = 1; i < 50; i++) {
    const [x, y] = curvePoint(b, i / 50);
    worst = Math.max(worst, Math.abs(K.easeProgress("custom", x, b) - y));
  }
  check(`Bezier solver accuracy for (${b.join(", ")}): worst error < 1e-9`, worst < 1e-9, worst.toExponential(2));
}
check("Custom: ease-in-out at 0.5 is 0.5 (symmetric)", near(K.easeProgress("custom", 0.5, [0.42, 0, 0.58, 1]), 0.5, 1e-9));
check("Custom: endpoints are 0 and 1", K.easeProgress("custom", 0, [0.6, 0, 0.9, 0.4]) === 0 && K.easeProgress("custom", 1, [0.6, 0, 0.9, 0.4]) === 1);
check("Custom slow start / fast finish (0.6, 0, 0.9, 0.4): progress(0.5) < 0.25", K.easeProgress("custom", 0.5, [0.6, 0, 0.9, 0.4]) < 0.25, String(K.easeProgress("custom", 0.5, [0.6, 0, 0.9, 0.4])));
check("clampBezier: handle times clamped to 0..1", json(K.clampBezier([-0.3, 0.5, 1.4, 0.5])) === json([0, 0.5, 1, 0.5]));
check("clampBezier: handle progress clamped to the graph range -0.5..1.5", json(K.clampBezier([0.2, -3, 0.8, 9])) === json([0.2, -0.5, 0.8, 1.5]));
check("clampBezier: bad input -> the default curve", json(K.clampBezier([1, 2])) === json([...K.DEFAULT_BEZIER]));
// monotonic time: with clamped handles x(t) never decreases, so every progress query has one answer
let mono = true;
for (const b of [[0, 1.5, 1, -0.5], [1, 0, 0, 1], [0.9, 0.2, 0.1, 0.8]]) {
  const c = K.clampBezier(b);
  let lastX = -1;
  for (let i = 0; i <= 200; i++) { const [x] = curvePoint(c, i / 200); if (x < lastX - 1e-12) mono = false; lastX = x; }
}
check("clamped handles keep time monotonic (x(t) never runs backwards), even for extreme handles", mono);
check("a key stored with out-of-range handles is clamped", K.setKeyCurve(two, 0, [1.5, 0, -1, 2]).keys[0].bezier.join() === "1,0,0,1.5");
check("setKeyEasing('custom') gives the default curve", json(K.setKeyEasing(two, 0, "custom").keys[0].bezier) === json(K.DEFAULT_BEZIER) && K.setKeyEasing(two, 0, "custom").keys[0].easing === "custom");
check("switching back to a preset drops the curve", !("bezier" in K.setKeyEasing(K.setKeyEasing(two, 0, "custom").keys, 0, "linear").keys[0]));
check("the easing chip cycles the 5 presets, then Custom, then back", ["smooth", "linear", "in", "out", "hold", "custom"].map(K.nextEasingWithCustom).join(",") === "linear,in,out,hold,custom,smooth");
check("easingLabel('custom') = Custom", K.easingLabel("custom") === "Custom" && K.easingLabel("in") === "Ease in");
const ck = K.keysByTarget(K.setKeyCurve(two, 0, [0.6, 0, 0.9, 0.4]).keys)[K.partsTarget(DOOR)];
check("sampleKeys follows the Custom curve of the segment's first key", near(K.sampleKeys(ck, 1.5).quaternion[1], K.slerp(K.eulerDegToQuat(0, 0, 0), K.eulerDegToQuat(0, 100, 0), K.easeProgress("custom", 0.5, [0.6, 0, 0.9, 0.4]))[1]));
check("an object key can use Custom too", K.setKeyCurve(K.addKey([], { t: 0, target: "product", assetId: "coffee-bike", transform: T() }, 8).keys, 0, [0.2, 0, 0.8, 1]).ok);

/* ============================ the 16-key limit (whole objects + parts) ============================ */
let mix = [];
for (let i = 0; i < 8; i++) mix = K.addKey(mix, { t: i, target: "product", assetId: "coffee-bike", transform: T(i) }, 12).keys;
for (let i = 0; i < 8; i++) mix = K.addKey(mix, pkey(i + 0.5, T(0, 0, 0, 0, i)), 12).keys;
check("8 object keys + 8 part keys = 16 keys in one shot", mix.length === 16);
const over = K.addKey(mix, pkey(11, T()), 12);
check("a 17th key (a part key) is refused with the visible reason", !over.ok && over.reason === "A shot can have at most 16 keys.", over.reason);
check("a 17th key (an object key) is refused too", K.addKey(mix, { t: 11, target: "product", assetId: "coffee-bike", transform: T() }, 12).reason === "A shot can have at most 16 keys.");
check("re-keying a part on an existing frame at 16 is allowed", K.addKey(mix, pkey(0.5, T(0, 0.1)), 12).ok);

/* ============================ missing parts ============================ */
const sceneHas = (ids) => ({ productId: "the-kop-main", items: [], hasPart: (id) => ids.includes(id) });
check("a part key is live when the product and every part are there", K.isKeyLive(first.keys[0], sceneHas(DOOR)));
check("a part key is ignored when one of its parts is gone (model changed)", !K.isKeyLive(first.keys[0], sceneHas([DOOR[0]])));
check("a part key is ignored on another product", !K.isKeyLive(first.keys[0], { ...sceneHas(DOOR), productId: "coffee-bike" }));
check("a part key is ignored when the scene cannot tell parts", !K.isKeyLive(first.keys[0], { productId: "the-kop-main", items: [] }));
check("a missing part's keys are kept in the shot", R.setShotKeys(R.defaultSequence(), 0, first.keys).seq[0].keys.length === 1);

/* ============================ session round trip ============================ */
const sessKeys = K.setKeyCurve(K.setKeyPivot(two, K.partsTarget(DOOR), "front-left").keys, 0, [0.6, 0, 0.9, 0.4]).keys;
const seq = R.setShotKeys([{ move: "push-in", startView: "Front", durationS: 8 }], 0, sessKeys).seq;
const saved = JSON.parse(JSON.stringify(R.sequenceToSession(seq)));
check("the session form carries parts, pivot and the Custom handles", json(saved[0].keys[0].parts) === json([...DOOR].sort()) && saved[0].keys[0].pivot === "front-left" && json(saved[0].keys[0].bezier) === json([0.6, 0, 0.9, 0.4]));
check("restore gives back the same keys (parts, pivot, curve, times, transforms)", json(R.sequenceFromSession(saved)[0].keys) === json(seq[0].keys));
check("an old session (C3a keys, no part fields) restores unchanged", json(R.sequenceFromSession([{ move: "slide", startView: "Front", durationS: 8, keys: [{ t: 0, target: "product", assetId: "coffee-bike", transform: T(0, 0, 1), easing: "smooth" }] }])) === json([{ move: "slide", startView: "Front", durationS: 8, keys: [{ t: 0, target: "product", assetId: "coffee-bike", transform: T(0, 0, 1), easing: "smooth" }] }]));
check("a session with a broken part key drops only that key", R.sequenceFromSession([{ ...saved[0], keys: [...saved[0].keys, { ...saved[0].keys[0], t: 5, pivot: "nowhere" }] }])[0].keys.length === 2);
check("a Reel with part keys builds a valid anim carrying them", validateAnimation(R.buildReelAnim(seq, 30)).ok && R.buildReelAnim(seq, 30).reel.shots[0].keys[0].parts.length === 2);
// the store
check("store: add a part key", store.addKey(0, pkey(0, T())).ok && store.getSequence()[0].keys[0].pivot === "front-left");
store.addKey(0, pkey(3, T(0, 0, 0, 0, 100, 0)));
check("store.setKeyPivot", store.setKeyPivot(0, K.partsTarget(DOOR), "front-right").ok && store.getSequence()[0].keys.every((k) => k.pivot === "front-right"));
check("store.setKeyCurve", store.setKeyCurve(0, 0, [0.6, 0, 0.9, 0.4]).ok && store.getSequence()[0].keys[0].easing === "custom");
const back = JSON.parse(JSON.stringify({ reel: store.sequenceForSession() }));
check("store: Reset clears the part keys", store.resetSequence() && !("keys" in store.getSequence()[0]));
check("store: Restore brings back the part keys, pivot and curve", store.restoreSequence(back.reel) && store.getSequence()[0].keys[0].pivot === "front-right" && json(store.getSequence()[0].keys[0].bezier) === json([0.6, 0, 0.9, 0.4]));

/* ============================ purity ============================ */
for (const f of ["partKeys.js", "reelKeys.js"]) {
  const src = readFileSync(new URL(`../src/animation/${f}`, import.meta.url), "utf8");
  check(`${f} has no import from three or react`, !/from\s+["'](three|react)["']/.test(src));
}
check("the Bezier solver carries the MotionLab attribution", /ported from MotionLab v0\.19\.0 curves-core\.js/.test(readFileSync(new URL("../src/animation/reelKeys.js", import.meta.url), "utf8")));

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
