import assert from "assert";
import { normMotion, motionLocalTime } from "../src/animation/motionMath.js";
import { defaultSequence, sequenceFromSession, sequenceToSession, setShot } from "../src/animation/reelSequence.js";

function runTests() {
  let passCount = 0;
  const pass = (msg) => { console.log("PASS:", msg); passCount++; };

  // normMotion
  assert.deepEqual(normMotion({ id: "b:Blank" }), { id: "b:Blank" });
  assert.deepEqual(normMotion({ id: "o:Holiday", clear: true, hold: true, texts: ["hello", " world  "] }), { id: "o:Holiday", clear: true, hold: true, texts: ["hello", "world"] });
  assert.deepEqual(normMotion({ id: "junk" }), undefined);
  assert.deepEqual(normMotion({ id: "b:Long", texts: ["1", null, "3", "4", "5", "6", "7"] }), { id: "b:Long", texts: ["1", undefined, "3", "4", "5", "6"] });
  assert.deepEqual(normMotion({ id: "b:Trim", texts: ["A".repeat(100)] }), { id: "b:Trim", texts: ["A".repeat(60)] });
  pass("normMotion (valid, junk, trimming, limits)");

  // motionLocalTime(localS, durS, shotDurS, hold)
  assert.equal(motionLocalTime(1, 2, 4, false), 1); // before end
  assert.equal(motionLocalTime(2, 2, 4, false), null); // at end
  assert.equal(motionLocalTime(2, 2, 4, true), 2); // at end hold
  assert.equal(motionLocalTime(3, 2, 4, false), null); // past end without hold
  assert.equal(motionLocalTime(3, 2, 4, true), 2); // past end with hold
  assert.equal(motionLocalTime(3, 4, 2, false), null); // shorter shot
  assert.equal(motionLocalTime(0, 0, 4, false), null); // zero length
  pass("motionLocalTime (before end, at end, past end with and without hold, shorter shot, zero length)");

  // sequence
  let seq = defaultSequence();
  seq = setShot(seq, 0, { durationS: 4 }).seq;
  let r = setShot(seq, 0, { motion: { id: "b:Test", clear: true } });
  assert.deepEqual(r.seq[0].motion, { id: "b:Test", clear: true });
  r = setShot(r.seq, 2, { motion: { id: "b:Test2" } }); // out of bounds
  assert.equal(r.seq.length, 1);
  
  pass("setMotion on shot 0 and 2, clearing");

  // session round trip
  let session = sequenceToSession(r.seq);
  let loaded = sequenceFromSession(session);
  assert.deepEqual(loaded[0].motion, { id: "b:Test", clear: true });
  pass("session round trip");

  // malformed saved motion drops only the motion, not the shot
  session[0].motion = { id: "invalid" };
  loaded = sequenceFromSession(session);
  assert.equal(loaded[0].motion, undefined);
  assert.equal(loaded.length, 1);
  pass("malformed saved motion drops only the motion");

  // shots without motion byte-identical to before
  let seq1 = defaultSequence();
  let sess1 = sequenceToSession(seq1);
  let loaded1 = sequenceFromSession(sess1);
  assert.deepEqual(seq1, loaded1);
  pass("shots without motion byte-identical to before");

  console.log(`ALL CHECKS PASSED (${passCount} PASS)`);
}
runTests();
