// Slice C3a — checks for app/src/animation/reelKeys.js (keyframes for whole
// objects in Reel shots): every easing (Smooth, Linear, Ease in, Ease out,
// Hold), before-first / after-last holding, quaternion slerp, frame snapping,
// the 8-key limit, missing-object handling, the per-shot Frame on choice, and the keys' path through the
// shot list (reelSequence.js), the anim Play and Export run, and the
// animation store's session save / Reset / restore. Plain node, no browser,
// no three.js.
// Run from the app folder:  node scripts/test-keys.mjs   (exit code 1 on any FAIL)
import { readFileSync } from "node:fs";
import * as K from "../src/animation/reelKeys.js";
import * as R from "../src/animation/reelSequence.js";
import * as store from "../src/animation/animationStore.js";
import { smoothstep, validateAnimation } from "../src/animation/path.js";

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
const key = (t, target, transform, easing = "smooth", assetId = target === "product" ? "coffee-bike" : "cessna-172") => ({ t, target, assetId, transform, easing });

/* ============================ constants ============================ */
check("MAX_KEYS_PER_SHOT is 8", K.MAX_KEYS_PER_SHOT === 8);
check("easings: smooth, linear, in, out, hold", json(K.KEY_EASINGS) === json(["smooth", "linear", "in", "out", "hold"]));
check("easing labels: Smooth, Linear, Ease in, Ease out, Hold", json(Object.values(K.EASING_LABELS)) === json(["Smooth", "Linear", "Ease in", "Ease out", "Hold"]));
check("nextEasing cycles smooth -> linear -> in -> out -> hold -> smooth", ["smooth", "linear", "in", "out", "hold"].map(K.nextEasing).join(",") === "linear,in,out,hold,smooth");

/* ============================ easing curves ============================ */
for (const u of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
  check(`Smooth(${u}) = MotionLab smoothstep`, near(K.easeProgress("smooth", u), smoothstep(u)));
  check(`Linear(${u}) = ${u}`, near(K.easeProgress("linear", u), u));
}
for (const e of ["smooth", "linear", "in", "out"]) {
  check(`${e}: 0 at u=0 and 1 at u=1`, K.easeProgress(e, 0) === 0 && K.easeProgress(e, 1) === 1);
  let mono = true;
  for (let i = 1; i <= 100; i++) if (K.easeProgress(e, i / 100) < K.easeProgress(e, (i - 1) / 100) - 1e-12) mono = false;
  check(`${e}: never goes backwards`, mono);
}
check("Ease in starts slow: in(0.25) < 0.25 and in(0.5) < 0.5", K.easeProgress("in", 0.25) < 0.25 && K.easeProgress("in", 0.5) < 0.5, `${K.easeProgress("in", 0.25)}, ${K.easeProgress("in", 0.5)}`);
check("Ease out starts fast: out(0.25) > 0.25 and out(0.5) > 0.5", K.easeProgress("out", 0.25) > 0.25 && K.easeProgress("out", 0.5) > 0.5, `${K.easeProgress("out", 0.25)}, ${K.easeProgress("out", 0.5)}`);
check("Ease in and Ease out mirror each other: in(u) = 1 - out(1 - u)", [0.1, 0.3, 0.5, 0.7].every((u) => near(K.easeProgress("in", u), 1 - K.easeProgress("out", 1 - u), 1e-9)));
check("CSS ease-in (0.42, 0, 1, 1) at u = 0.5 is about 0.3153", near(K.easeProgress("in", 0.5), 0.31535, 2e-4), String(K.easeProgress("in", 0.5)));
check("Hold: 0 for every u < 1, 1 at u = 1", [0, 0.2, 0.5, 0.999].every((u) => K.easeProgress("hold", u) === 0) && K.easeProgress("hold", 1) === 1);
check("out-of-range u is clamped", K.easeProgress("linear", -1) === 0 && K.easeProgress("linear", 2) === 1);

/* ============================ rotation ============================ */
check("eulerDegToQuat(0,0,0) = identity", nearV(K.eulerDegToQuat(0, 0, 0), [0, 0, 0, 1]));
check("eulerDegToQuat(0,90,0) = (0, sin45, 0, cos45)", nearV(K.eulerDegToQuat(0, 90, 0), [0, Math.SQRT1_2, 0, Math.SQRT1_2]));
check("eulerDegToQuat(90,0,0) = (sin45, 0, 0, cos45)", nearV(K.eulerDegToQuat(90, 0, 0), [Math.SQRT1_2, 0, 0, Math.SQRT1_2]));
// XYZ order: q = qx * qy * qz (three's setFromEuler 'XYZ')
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
check("eulerDegToQuat(30,40,50) = qx(30)·qy(40)·qz(50) (Euler XYZ)", nearV(K.eulerDegToQuat(30, 40, 50), qmul(qmul(K.eulerDegToQuat(30, 0, 0), K.eulerDegToQuat(0, 40, 0)), K.eulerDegToQuat(0, 0, 50))));
const q0 = K.eulerDegToQuat(0, 0, 0);
const q90 = K.eulerDegToQuat(0, 90, 0);
check("slerp(a, b, 0) = a", nearV(K.slerp(q0, q90, 0), q0));
check("slerp(a, b, 1) = b", nearV(K.slerp(q0, q90, 1), q90));
check("slerp(0°, 90° about Y, 0.5) = 45° about Y", nearV(K.slerp(q0, q90, 0.5), K.eulerDegToQuat(0, 45, 0)));
check("slerp(0°, 90° about Y, 0.25) = 22.5° about Y (constant angular speed)", nearV(K.slerp(q0, q90, 0.25), K.eulerDegToQuat(0, 22.5, 0)));
check("slerp takes the shortest path (350° -> 10° goes through 0°)", nearV(K.slerp(K.eulerDegToQuat(0, 350, 0), K.eulerDegToQuat(0, 10, 0), 0.5).map(Math.abs), [0, 0, 0, 1], 1e-9));
check("slerp result is a unit quaternion", near(Math.hypot(...K.slerp(K.eulerDegToQuat(10, 20, 30), K.eulerDegToQuat(-40, 70, 5), 0.37)), 1));

/* ============================ frame snapping ============================ */
check("snapTime(0.016, 8) = 0 (nearest frame)", K.snapTime(0.016, 8) === 0);
check("snapTime(0.017, 8) = 1/30", K.snapTime(0.017, 8) === 1 / 30);
check("snapTime(4.01, 8) = 4", K.snapTime(4.01, 8) === 4);
check("snapTime(2.345, 8) = 70/30 (frame 70)", K.snapTime(2.345, 8) === 70 / 30);
check("snapTime clamps to the shot: (9, 8) = 8 and (-1, 8) = 0", K.snapTime(9, 8) === 8 && K.snapTime(-1, 8) === 0);
check("snapTime(NaN) = 0", K.snapTime(NaN, 8) === 0);
check("addKey snaps t to a frame", K.addKey([], key(1.234, "product", T()), 8).keys[0].t === 37 / 30);

/* ============================ sampling ============================ */
const A = T(0, 0, 1, 0, 0, 0, 1);
const B = T(0, 0, 0, 0, 90, 0, 2);
const two = (easing) => K.keysByTarget(K.addKey(K.addKey([], key(0, "product", A, easing), 8).keys, key(4, "product", B), 8).keys).product;
check("no keys -> null", K.sampleKeys([], 1) === null);
check("before the first key it holds the first key", nearV(K.sampleKeys(K.keysByTarget(K.addKey([], key(2, "product", A), 8).keys).product, 0.5).position, [0, 0, 1]));
check("after the last key it holds the last key", nearV(K.sampleKeys(two("linear"), 7).position, [0, 0, 0]) && nearV(K.sampleKeys(two("linear"), 7).scale, [2, 2, 2]));
check("exactly on a key gives that key", nearV(K.sampleKeys(two("linear"), 4).position, [0, 0, 0]) && nearV(K.sampleKeys(two("linear"), 0).position, [0, 0, 1]));
check("Linear midway: position halfway, scale halfway, rotation 45°", (() => { const p = K.sampleKeys(two("linear"), 2); return nearV(p.position, [0, 0, 0.5]) && nearV(p.scale, [1.5, 1.5, 1.5]) && nearV(p.quaternion, K.eulerDegToQuat(0, 45, 0)); })());
check("Smooth at 1 s of 4: progress smoothstep(0.25) = 0.15625", near(K.sampleKeys(two("smooth"), 1).position[2], 1 - 0.15625));
check("Ease in at 2 s of 4: position from the CSS ease-in curve", near(K.sampleKeys(two("in"), 2).position[2], 1 - K.easeProgress("in", 0.5)));
check("Ease out at 2 s of 4: position from the CSS ease-out curve", near(K.sampleKeys(two("out"), 2).position[2], 1 - K.easeProgress("out", 0.5)));
check("Hold: no movement until the next key (t = 3.99 s still at the first key)", nearV(K.sampleKeys(two("hold"), 3.99).position, [0, 0, 1]) && nearV(K.sampleKeys(two("hold"), 3.99).quaternion, q0));
check("Hold: at the next key's time it is at the next key", nearV(K.sampleKeys(two("hold"), 4).position, [0, 0, 0]));
check("rotation uses slerp: Smooth at 2 s = 45° about Y (smoothstep(0.5) = 0.5)", nearV(K.sampleKeys(two("smooth"), 2).quaternion, K.eulerDegToQuat(0, 45, 0)));
// the C3a demo: t=0 1 m back, t=4 original (Smooth), t=8 same (Hold)
let demo = [];
demo = K.addKey(demo, key(0, "product", T(0, 0, 1)), 8).keys;
demo = K.addKey(demo, key(4, "product", T(0, 0, 0)), 8).keys;
demo = K.addKey(demo, key(8, "product", T(0, 0, 0), "hold"), 8).keys;
const dk = K.keysByTarget(demo).product;
check("demo: frame 0 at z = 1", near(K.sampleKeys(dk, 0).position[2], 1));
check("demo: frame 60 (2 s) at z = 0.5 (Smooth midpoint)", near(K.sampleKeys(dk, 2).position[2], 0.5));
check("demo: frame 120 (4 s) at z = 0", near(K.sampleKeys(dk, 4).position[2], 0));
check("demo: frames 180 and 239 hold z = 0", near(K.sampleKeys(dk, 6).position[2], 0) && near(K.sampleKeys(dk, 239 / 30).position[2], 0));
check("keysByTarget groups per object and sorts by time", (() => { const g = K.keysByTarget([key(3, "i1", A), key(1, "product", A), key(0, "i1", B)]); return g.i1.length === 2 && g.i1[0].t === 0 && g.product.length === 1; })());

/* ============================ the 8-key limit ============================ */
let ks = [];
for (let i = 0; i < 8; i++) ks = K.addKey(ks, key(i, i % 2 ? "product" : "i1", T(i)), 12).keys;
check("8 keys can be added to a shot", ks.length === 8);
let r = K.addKey(ks, key(9, "product", T()), 12);
check("a 9th key is refused with the reason, keys unchanged", !r.ok && r.reason === "A shot can have at most 8 keys." && r.keys === ks, r.reason);
check("canAddKey: refused for a new key at 8", !K.canAddKey(ks, "product", 9).ok && K.canAddKey(ks, "product", 9).reason === "A shot can have at most 8 keys.");
r = K.addKey(ks, key(1, "product", T(5, 5, 5)), 12);
check("re-keying the same object on the same frame replaces it (allowed at 8)", r.ok && r.keys.length === 8 && r.keys.find((k) => k.t === 1).transform.x === 5);
check("canAddKey: allowed for the same object and frame at 8", K.canAddKey(ks, "product", 1).ok);
check("replacing keeps the key's easing when none is given", (() => { const a = K.setKeyEasing(ks, 1, "hold").keys; const b = K.addKey(a, { t: 1, target: "product", assetId: "coffee-bike", transform: T(7) }, 12).keys; return b.find((k) => k.t === 1).easing === "hold"; })());
check("the same frame for a DIFFERENT object is a new key", K.addKey([key(1, "product", T())].map((k) => K.addKey([], k, 8).keys[0]), key(1, "i1", T()), 8).keys.length === 2);
check("deleteKey removes one key", K.deleteKey(ks, 0).keys.length === 7);
check("deleteKey refuses an unknown index", !K.deleteKey(ks, 8).ok);
check("setKeyEasing changes one key", K.setKeyEasing(ks, 2, "out").keys[2].easing === "out");
check("setKeyEasing refuses an unknown easing", !K.setKeyEasing(ks, 2, "bounce").ok);
check("a key with a bad transform is refused", !K.addKey([], key(1, "product", { ...T(), s: 0 }), 8).ok && !K.addKey([], key(1, "product", { x: 1 }), 8).ok);
check("keys are frozen", Object.isFrozen(ks) && Object.isFrozen(ks[0]) && Object.isFrozen(ks[0].transform));

/* ============================ missing objects ============================ */
const sceneNow = { productId: "coffee-bike", items: [{ itemId: "i1", assetId: "cessna-172" }] };
check("a product key for the current product is live", K.isKeyLive(key(0, "product", A), sceneNow));
check("a product key for another product is ignored", !K.isKeyLive(key(0, "product", A, "smooth", "the-kop-main"), sceneNow));
check("an object key for an object in the scene is live", K.isKeyLive(key(0, "i1", A), sceneNow));
check("an object key whose object was removed is ignored", !K.isKeyLive(key(0, "i2", A), sceneNow));
check("an object key whose item id now holds another asset is ignored", !K.isKeyLive(key(0, "i1", A, "smooth", "the-kop-main"), sceneNow));
check("a missing object's keys are kept in the shot (only ignored)", (() => { const s1 = R.setShotKeys(R.defaultSequence(), 0, K.addKey([], key(0, "i9", A), 8).keys).seq; return s1[0].keys.length === 1; })());

/* ============================ shot list, anim, session ============================ */
check("a shot without keys has no keys field", !("keys" in R.defaultSequence()[0]));
const keyedSeq = R.setShotKeys(R.defaultSequence(), 0, demo).seq;
check("setShotKeys stores the keys on the shot", keyedSeq[0].keys.length === 3);
check("setShotKeys with [] removes the field again", !("keys" in R.setShotKeys(keyedSeq, 0, []).seq[0]));
const plain3 = [{ move: "push-in", startView: "3/4", durationS: 4 }, { move: "orbit", startView: "Side", durationS: 4 }, { move: "crane", startView: "Low Hero", durationS: 4 }];
check("a Reel without keys builds an anim with no keys anywhere", !json(R.buildReelAnim(plain3, 30)).includes("keys"));
const ka = R.buildReelAnim(keyedSeq, 30);
check("a keyed camera shot carries its keys in reel.shots", ka.reel.shots[0].keys.length === 3 && validateAnimation(ka).ok);
const kt = R.buildReelAnim(R.setShotKeys([{ move: "turntable", startView: "3/4", durationS: 4 }], 0, demo).seq, 30);
check("a keyed lone Turntable is the Turntable anim plus keys", kt.loop === true && kt.model.spinTurns === 1 && kt.keys.length === 3 && !kt.reel);
const sess = JSON.parse(JSON.stringify(R.sequenceToSession(keyedSeq)));
check("session form carries the keys as plain JSON", sess[0].keys.length === 3 && sess[0].keys[2].easing === "hold");
check("sequenceFromSession restores the same keys (times, objects, transforms, easings)", json(R.sequenceFromSession(sess)[0].keys) === json(keyedSeq[0].keys));
check("sequenceFromSession drops bad keys", R.sequenceFromSession([{ ...sess[0], keys: [...sess[0].keys, { t: 1, target: "", assetId: "x", transform: T(), easing: "smooth" }] }])[0].keys.length === 3);
check("sequenceFromSession keeps at most 8 keys", R.sequenceFromSession([{ move: "orbit", startView: "3/4", durationS: 12, keys: Array.from({ length: 11 }, (_, i) => key(i, "product", T(i))) }])[0].keys.length === 8);
check("a session without keys is unchanged by C3a (same JSON as before)", json(R.sequenceToSession(R.defaultSequence())) === json([{ move: "orbit", startView: "3/4", durationS: 8 }]));

// the store: add keys, save, Reset, restore
check("store.addKey adds a key to the selected shot", store.addKey(0, key(0, "product", T(0, 0, 1))).ok && store.getSequence()[0].keys.length === 1);
store.addKey(0, key(4, "product", T()));
store.addKey(0, key(8, "product", T(), "hold"));
check("store keeps 3 keys sorted by time", json(store.getSequence()[0].keys.map((k) => k.t)) === "[0,4,8]");
check("store.setKeyEasing(0, 1, 'in')", store.setKeyEasing(0, 1, "in").ok && store.getSequence()[0].keys[1].easing === "in");
check("store.deleteKey refuses an unknown key", !store.deleteKey(0, 7).ok);
const saved = JSON.parse(JSON.stringify({ reel: store.sequenceForSession() }));
check("sequenceForSession includes the keys", saved.reel[0].keys.length === 3);
check("resetSequence clears the keys", store.resetSequence() && !("keys" in store.getSequence()[0]));
check("restoreSequence brings the keys back, same times and easings", store.restoreSequence(saved.reel) && json(store.getSequence()[0].keys.map((k) => [k.t, k.easing])) === json([[0, "smooth"], [4, "in"], [8, "hold"]]));
for (let i = 0; i < 5; i++) store.addKey(0, key(1 + i / 30, "i1", T()));
check("store refuses a 9th key with the visible reason", store.addKey(0, key(2, "product", T())).reason === "A shot can have at most 8 keys.");
const unreg = store.registerApi({ play: () => true, stop: () => true });
store.play();
check("key edits are refused while previewing", store.addKey(0, key(3, "product", T())).reason === "Stop the preview or export first.");
store.stop();
unreg();
check("the product pose bridge is null-safe with no engine", store.readProductTransform() === null && store.writeProductTransform(T()) === false);

/* ============================ Frame on (start / end) ============================ */
check("FRAME_ON is start, end", json(K.FRAME_ON) === json(["start", "end"]));
check("frameTimeOf: end of an 8 s shot is its last exported frame, 239/30", K.frameTimeOf(8, "end") === 239 / 30 && K.frameTimeOf(8, undefined) === 239 / 30);
check("frameTimeOf: start is 0", K.frameTimeOf(8, "start") === 0);
check("frameTimeOf: end of a 4 s shot is 119/30", K.frameTimeOf(4) === 119 / 30);
check("the demo frames on End: the product pose there is home (z = 0)", near(K.sampleKeys(dk, K.frameTimeOf(8)).position[2], 0));
check("the demo frames on Start: the product pose there is 1 m back (z = 1)", near(K.sampleKeys(dk, K.frameTimeOf(8, "start")).position[2], 1));
let fs1 = R.setShot(R.defaultSequence(), 0, { frameOn: "start" });
check("setShot frameOn 'start' is stored", fs1.ok && fs1.seq[0].frameOn === "start");
check("setShot frameOn 'end' is the default and is not stored", R.setShot(fs1.seq, 0, { frameOn: "end" }).ok && !("frameOn" in R.setShot(fs1.seq, 0, { frameOn: "end" }).seq[0]));
check("setShot refuses an unknown frameOn", !R.setShot(R.defaultSequence(), 0, { frameOn: "middle" }).ok);
check("setShotKeys keeps frameOn", R.setShotKeys(fs1.seq, 0, demo).seq[0].frameOn === "start");
check("a Reel with frameOn but no keys builds the same anim as without it", json(R.buildReelAnim(fs1.seq, 30)) === json(R.buildReelAnim(R.defaultSequence(), 30)));
const fk = R.setShotKeys(fs1.seq, 0, demo).seq;
check("a keyed shot carries frameOn 'start' into reel.shots", R.buildReelAnim(fk, 30).reel.shots[0].frameOn === "start");
check("a keyed shot on End carries no frameOn (the default)", !("frameOn" in R.buildReelAnim(keyedSeq, 30).reel.shots[0]));
check("a keyed lone Turntable carries frameOn 'start'", R.buildReelAnim(R.setShotKeys(R.setShot([{ move: "turntable", startView: "3/4", durationS: 4 }], 0, { frameOn: "start" }).seq, 0, demo).seq, 30).frameOn === "start");
const fsess = JSON.parse(JSON.stringify(R.sequenceToSession(fk)));
check("session saves frameOn 'start'", fsess[0].frameOn === "start");
check("session restores frameOn 'start'", R.sequenceFromSession(fsess)[0].frameOn === "start");
check("an old session (no frameOn) restores as End (no field)", !("frameOn" in R.sequenceFromSession([{ move: "slide", startView: "Front", durationS: 8, keys: fsess[0].keys }])[0]));
check("store.setShot(0, { frameOn: 'start' }) then 'end'", store.setShot(0, { frameOn: "start" }).ok && store.getSequence()[0].frameOn === "start" && store.setShot(0, { frameOn: "end" }).ok && !("frameOn" in store.getSequence()[0]));

/* ============================ purity ============================ */
const src = readFileSync(new URL("../src/animation/reelKeys.js", import.meta.url), "utf8");
check("reelKeys.js has no import from three or react", !/from\s+["'](three|react)["']/.test(src));

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
