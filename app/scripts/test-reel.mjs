// Slice C2b — checks for the multi-shot Reel: app/src/animation/reelSequence.js
// (sequence total duration, shot frame ranges at 30 fps, cut frame indices,
// the 5-shot and 30 s limits, add / delete / reorder / per-shot edits, the
// anim Play and Export run, the frame -> shot lookup) and the shot list in
// app/src/animation/animationStore.js (edits only while idle, durationS kept
// equal to the total, and the session form: save, JSON round trip, restore,
// Reset to one default shot). Plain node, no browser, no three.js.
// Run from the app folder:  node scripts/test-reel.mjs   (exit code 1 on any FAIL)
import { readFileSync } from "node:fs";
import * as r from "../src/animation/reelSequence.js";
import * as store from "../src/animation/animationStore.js";
import { makeShot, makeTurntable, validateAnimation, frameTimes } from "../src/animation/path.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const json = (v) => JSON.stringify(v);
const shot = (move, startView, durationS) => ({ move, startView, durationS });

/* ============================ constants / default ============================ */
check("MAX_SHOTS is 5", r.MAX_SHOTS === 5);
check("MAX_TOTAL_S is 30", r.MAX_TOTAL_S === 30);
check("durations are 4, 8, 12", json(r.SHOT_DURATIONS) === "[4,8,12]");
check("moves: turntable + the 5 camera moves", json(r.REEL_MOVES) === json(["turntable", "orbit", "push-in", "pull-back", "slide", "crane"]));
check("start views: 6 presets + custom", json(r.REEL_START_VIEWS) === json(["Front", "Side", "3/4", "Rear", "Top", "Low Hero", "custom"]));
const def = r.defaultSequence();
check("default sequence is one shot: Orbit, 3/4, 8 s", def.length === 1 && json(def[0]) === json(shot("orbit", "3/4", 8)));
check("default sequence is frozen", Object.isFrozen(def) && Object.isFrozen(def[0]));

/* ============================ total duration ============================ */
const proof = [shot("push-in", "3/4", 4), shot("orbit", "Side", 4), shot("crane", "Low Hero", 4)];
check("total of the proof sequence (4+4+4) is 12 s", r.totalDuration(proof) === 12);
check("total of the default sequence is 8 s", r.totalDuration(def) === 8);
check("total of 12+12+4 is 28 s", r.totalDuration([shot("orbit", "3/4", 12), shot("slide", "Front", 12), shot("crane", "Top", 4)]) === 28);

/* ============================ frame boundaries / cuts ============================ */
const ranges = r.shotFrameRanges(proof, 30);
check("proof shot ranges are [0,120) [120,240) [240,360)", json(ranges) === json([{ start: 0, end: 120 }, { start: 120, end: 240 }, { start: 240, end: 360 }]), json(ranges));
check("proof total frames = 360", r.totalFrames(proof, 30) === 360);
check("proof cut frames = [120, 240]", json(r.cutFrames(proof, 30)) === "[120,240]", json(r.cutFrames(proof, 30)));
check("a single shot has no cut", r.cutFrames(def, 30).length === 0);
const mixed = [shot("orbit", "3/4", 8), shot("turntable", "Side", 12), shot("slide", "Front", 4)];
check("8+12+4 s ranges are [0,240) [240,600) [600,720)", json(r.shotFrameRanges(mixed, 30)) === json([{ start: 0, end: 240 }, { start: 240, end: 600 }, { start: 600, end: 720 }]));
check("8+12+4 s cut frames = [240, 600]", json(r.cutFrames(mixed, 30)) === "[240,600]");
check("frames = total seconds x 30 (12+12+4 = 28 s -> 840)", r.totalFrames([shot("orbit", "3/4", 12), shot("orbit", "3/4", 12), shot("orbit", "3/4", 4)], 30) === 840);
for (const [f, k, local] of [[0, 0, 0], [119, 0, 119], [120, 1, 0], [239, 1, 119], [240, 2, 0], [359, 2, 119]]) {
  const a = r.shotAtFrame(proof, f, 30);
  check(`frame ${f} belongs to shot ${k + 1}, local frame ${local}`, a && a.index === k && a.localFrame === local, json(a));
}
check("frame 360 (past the end) belongs to no shot", r.shotAtFrame(proof, 360, 30) === null);

/* ============================ the anim Play / Export run ============================ */
const tt = r.buildReelAnim([shot("turntable", "3/4", 4)], 30);
check("a lone Turntable shot builds exactly makeTurntable (pre-C2b Turntable)", json(tt) === json(makeTurntable({ durationS: 4 })), json(tt));
const one = r.buildReelAnim([shot("push-in", "3/4", 4)], 30);
const { reel: oneReel, ...oneRest } = one;
check("a lone camera move builds exactly the C2a makeShot anim (+ reel.shots)", json(oneRest) === json(makeShot({ move: "push-in", durationS: 4 })), json(oneRest));
check("lone camera move reel.shots has its start view and frames [0,120)", oneReel.shots.length === 1 && oneReel.shots[0].startView === "3/4" && oneReel.shots[0].f0 === 0 && oneReel.shots[0].f1 === 120);
const seqAnim = r.buildReelAnim(proof, 30);
check("the proof sequence anim is valid", validateAnimation(seqAnim).ok, json(validateAnimation(seqAnim).errors));
check("sequence anim: durationS 12, no loop, no model spin, shot.move 'sequence'", seqAnim.durationS === 12 && seqAnim.loop === false && seqAnim.model.spinTurns === 0 && seqAnim.shot.move === "sequence");
check("sequence anim: the exporter's frame times give 360 frames", frameTimes(makeTurntable({ durationS: seqAnim.durationS, fps: 30 })).length === 360);
check("sequence anim shots carry f0 / f1 / t0", json(seqAnim.reel.shots.map((s) => [s.f0, s.f1, s.t0])) === json([[0, 120, 0], [120, 240, 4], [240, 360, 8]]));
for (const [i, k, local] of [[0, 0, 0], [119, 0, 119 / 30], [120, 1, 0], [239, 1, 119 / 30], [240, 2, 0], [359, 2, 119 / 30]]) {
  const a = r.reelShotAt(seqAnim, i / 30);
  check(`export frame ${i} (t = ${i}/30) -> shot ${k + 1}, local t = ${(local * 30).toFixed(0)}/30 (bit-exact)`, a.index === k && a.local === local, json(a));
}
check("preview t = 3.999 s plays shot 1", r.reelShotAtTime(seqAnim, 3.999).index === 0);
check("preview t = 4.0 s plays shot 2 (the cut)", r.reelShotAtTime(seqAnim, 4).index === 1 && r.reelShotAtTime(seqAnim, 4).local === 0);
check("preview t = 11.9 s plays shot 3", r.reelShotAtTime(seqAnim, 11.9).index === 2);
check("preview t = 12 s (the end) plays nothing", r.reelShotAtTime(seqAnim, 12) === null);
check("buildReelAnim refuses 6 shots", r.buildReelAnim(Array.from({ length: 6 }, () => shot("orbit", "3/4", 4)), 30) === null);
check("buildReelAnim refuses 36 s", r.buildReelAnim([shot("orbit", "3/4", 12), shot("orbit", "3/4", 12), shot("orbit", "3/4", 12)], 30) === null);
check("buildReelAnim refuses an unknown move", r.buildReelAnim([shot("zoom", "3/4", 4)], 30) === null);

/* ============================ the 30 s and 5-shot limits ============================ */
let s = r.defaultSequence(); // 8
let res;
for (let i = 0; i < 3; i += 1) {
  res = r.addShot(s);
  s = res.seq;
}
check("adding 3 shots to the default (8 s): 8+8+8, then the 4th new shot gets 4 s (8 would pass 30) = 28 s", s.length === 4 && r.totalDuration(s) === 28 && s[3].durationS === 4, json(s.map((x) => x.durationS)));
res = r.canAdd(s);
check("at 28 s a new shot (needs 4 s) is refused with the 30 s reason", !res.ok && res.reason === "The Reel is already 28 s; a new shot needs at least 4 s and the limit is 30 s.", res.reason);
const refused = r.addShot(s);
check("addShot at 28 s: ok false, sequence unchanged (same object)", !refused.ok && refused.seq === s);
const five = [shot("orbit", "3/4", 4), shot("orbit", "3/4", 4), shot("orbit", "3/4", 4), shot("orbit", "3/4", 4), shot("orbit", "3/4", 4)];
res = r.canAdd(five);
check("a 6th shot is refused (5 shots, 20 s) with the 5-shot reason", !res.ok && res.reason === "A Reel can have at most 5 shots.", res.reason);
check("canAdd with 4 x 4 s gives a new 8 s shot", r.canAdd(five.slice(0, 4)).ok && r.canAdd(five.slice(0, 4)).durationS === 8);
check("canAdd at 24 s gives a new 4 s shot (8 would pass 30)", r.canAdd([shot("orbit", "3/4", 12), shot("orbit", "3/4", 12)]).durationS === 4);
const twentyEight = [shot("orbit", "3/4", 12), shot("orbit", "3/4", 12), shot("orbit", "3/4", 4)];
res = r.durationAllowed(twentyEight, 2, 8);
check("8 s on the 4 s shot of a 28 s Reel is refused (32 s)", !res.ok && res.reason === "8 s would make the Reel 32 s; the limit is 30 s.", res.reason);
res = r.setShot(twentyEight, 2, { durationS: 12 });
check("setShot 12 s there is refused (36 s), unchanged", !res.ok && res.seq === twentyEight && res.reason === "12 s would make the Reel 36 s; the limit is 30 s.", res.reason);
check("4 s on a 12 s shot is allowed (20 s)", r.setShot(twentyEight, 0, { durationS: 4 }).ok);
check("28 s, the largest total 4/8/12 s shots can reach under 30, is allowed (12+8+4 -> 12+8+8)", r.setShot([shot("orbit", "3/4", 12), shot("orbit", "3/4", 8), shot("orbit", "3/4", 4)], 2, { durationS: 8 }).ok);
check("2 s is not a duration", !r.setShot(def, 0, { durationS: 2 }).ok);
check("an unknown move is refused", !r.setShot(def, 0, { move: "zoom" }).ok);
check("an unknown start view is refused", !r.setShot(def, 0, { startView: "Under" }).ok);
check("move and start view edits apply", json(r.setShot(def, 0, { move: "crane", startView: "Low Hero" }).seq[0]) === json(shot("crane", "Low Hero", 8)));

/* ============================ add / delete / reorder ============================ */
const abc = [shot("push-in", "3/4", 4), shot("orbit", "Side", 4), shot("crane", "Low Hero", 4)];
res = r.addShot(abc);
check("addShot appends the default shot (Orbit, 3/4, 8 s) at the end", res.ok && res.seq.length === 4 && json(res.seq[3]) === json(shot("orbit", "3/4", 8)) && json(res.seq.slice(0, 3)) === json(abc));
res = r.deleteShot(abc, 1);
check("deleteShot(1) removes the middle shot", res.ok && json(res.seq) === json([abc[0], abc[2]]));
check("deleteShot refuses the last remaining shot", !r.deleteShot(def, 0).ok && r.deleteShot(def, 0).reason === "A Reel needs at least one shot.");
check("deleteShot refuses an out-of-range index", !r.deleteShot(abc, 3).ok && !r.deleteShot(abc, -1).ok);
res = r.moveShot(abc, 2, -1);
check("moveShot(2, up) swaps shots 2 and 3", res.ok && json(res.seq) === json([abc[0], abc[2], abc[1]]));
res = r.moveShot(abc, 0, 1);
check("moveShot(0, down) swaps shots 1 and 2", res.ok && json(res.seq) === json([abc[1], abc[0], abc[2]]));
check("moveShot(0, up) is refused: already the first shot", !r.moveShot(abc, 0, -1).ok && r.moveShot(abc, 0, -1).reason === "Already the first shot.");
check("moveShot(2, down) is refused: already the last shot", !r.moveShot(abc, 2, 1).ok && r.moveShot(abc, 2, 1).reason === "Already the last shot.");
check("edits never mutate their input", json(abc) === json([shot("push-in", "3/4", 4), shot("orbit", "Side", 4), shot("crane", "Low Hero", 4)]));
check("reorder changes the cut content but not the cut frames", json(r.cutFrames(r.moveShot(abc, 0, 1).seq)) === "[120,240]");

/* ============================ session form ============================ */
const saved = JSON.parse(JSON.stringify({ reel: r.sequenceToSession(abc) }));
check("session form is plain JSON with the 3 shots", json(saved.reel) === json(abc));
check("sequenceFromSession restores the same 3 shots", json(r.sequenceFromSession(saved.reel)) === json(abc));
check("sequenceFromSession(null / not an array / []) is null", r.sequenceFromSession(null) === null && r.sequenceFromSession({}) === null && r.sequenceFromSession([]) === null);
check("sequenceFromSession drops bad shots", json(r.sequenceFromSession([shot("zoom", "3/4", 4), abc[0], shot("orbit", "3/4", 5)])) === json([abc[0]]));
check("sequenceFromSession keeps at most 5 shots", r.sequenceFromSession(Array.from({ length: 7 }, () => shot("orbit", "3/4", 4))).length === 5);
check("sequenceFromSession enforces the 30 s limit", r.totalDuration(r.sequenceFromSession([shot("orbit", "3/4", 12), shot("orbit", "3/4", 12), shot("orbit", "3/4", 12)])) === 24);

/* ============================ animation store: the shot list ============================ */
check("store starts with the default sequence and durationS 8", json(store.getSequence()) === json(def) && store.getSnapshot().durationS === 8);
let notified = 0;
const off = store.subscribe(() => {
  notified += 1;
});
check("store.setShot(0) -> Push-in 3/4 4 s", store.setShot(0, { move: "push-in", durationS: 4 }).ok && json(store.getSequence()[0]) === json(shot("push-in", "3/4", 4)));
check("store.addShot twice -> 3 shots", store.addShot().ok && store.addShot().ok && store.getSequence().length === 3);
store.setShot(1, { move: "orbit", startView: "Side", durationS: 4 });
store.setShot(2, { move: "crane", startView: "Low Hero", durationS: 4 });
check("store holds the proof sequence", json(store.getSequence()) === json(proof));
check("store durationS follows the total (12)", store.getSnapshot().durationS === 12);
check("store notified subscribers on edits", notified > 0);
res = store.setShot(0, { durationS: 12 });
check("store refuses nothing within 30 s (12+4+4 = 20)", res.ok && store.getSnapshot().durationS === 20);
store.setShot(0, { durationS: 4 });
check("store.moveShot / deleteShot pass the reasons through", store.moveShot(0, -1).reason === "Already the first shot." && store.deleteShot(9).ok === false);

// session save -> Reset -> Restore through the same calls studioSession.js makes
const savedSession = JSON.parse(JSON.stringify({ reel: store.sequenceForSession() }));
check("sequenceForSession = the 3 proof shots", json(savedSession.reel) === json(proof));
check("resetSequence -> one default shot (Orbit, 3/4, 8 s)", store.resetSequence() && json(store.getSequence()) === json(def) && store.getSnapshot().durationS === 8);
check("restoreSequence(saved) -> the 3 shots back, same settings", store.restoreSequence(savedSession.reel) && json(store.getSequence()) === json(proof) && store.getSnapshot().durationS === 12);
check("restoreSequence(garbage) is refused and keeps the list", store.restoreSequence("nope") === false && json(store.getSequence()) === json(proof));

// play builds the sequence anim through the registered stage; edits are refused while playing
let played = null;
const unregister = store.registerApi({ play: (a) => ((played = a), true), stop: () => true });
check("play() with a fake stage -> previewing, shot 0", store.play() && store.getSnapshot().mode === "previewing" && store.getSnapshot().shot === 0);
check("the stage received the 3-shot anim (12 s, cuts at 120 / 240)", played && played.durationS === 12 && json(played.reel.shots.map((x) => x.f0)) === "[0,120,240]");
store.reportShot(2);
check("reportShot(2) -> snapshot.shot 2 (Shot 3 of 3)", store.getSnapshot().shot === 2);
check("edits are refused while previewing", !store.addShot().ok && store.addShot().reason === "Stop the preview or export first.");
check("stop() -> idle, shot -1", store.stop() && store.getSnapshot().mode === "idle" && store.getSnapshot().shot === -1);
store.play();
check("resetSequence while previewing stops the preview first", store.resetSequence() && store.getSnapshot().mode === "idle" && store.getSequence().length === 1);
unregister();
off();

/* ============================ studioSession wiring (source) ============================ */
const sess = readFileSync(new URL("../src/session/studioSession.js", import.meta.url), "utf8");
check("studioSession saves reel: animationStore.sequenceForSession()", /reel:\s*animationStore\.sequenceForSession\(\)/.test(sess));
check("studioSession restores the saved reel", /animationStore\.restoreSequence\(snap\.reel\)/.test(sess));
check("studioSession Reset resets the shot list", /animationStore\.resetSequence\(\)/.test(sess));

/* ============================ purity ============================ */
const src = readFileSync(new URL("../src/animation/reelSequence.js", import.meta.url), "utf8");
check("reelSequence.js has no import from three or react", !/from\s+["'](three|react)["']/.test(src));

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
