import { isVisibleInShot, setCurrentShot, getCurrentShot } from "../src/fx/shotGate.js";
import { setEffectShots, getSnapshot, addEffect, clearEffects } from "../src/fx/effectsStore.js";
import { effectsForSession, loadEffects } from "../src/fx/effectsStore.js";

let failed = 0;
function check(name, ok) {
  if (!ok) {
    failed++;
    console.error("FAIL", name);
  } else {
    console.log("PASS", name);
  }
}

// 1. shotGate
check("null current -> true", isVisibleInShot(undefined, null));
check("no mask -> true", isVisibleInShot(undefined, 1));
check("no mask array -> true", isVisibleInShot([], 1));
check("mask [1,3] -> true for 1", isVisibleInShot([1,3], 1));
check("mask [1,3] -> true for 3", isVisibleInShot([1,3], 3));
check("mask [1,3] -> false for 0", !isVisibleInShot([1,3], 0));
check("mask [1,3] -> false for 2", !isVisibleInShot([1,3], 2));

setCurrentShot(2);
check("getCurrentShot reflects set", getCurrentShot() === 2);
setCurrentShot(null);

// 2. setEffectShots
clearEffects();
addEffect("fog", [0, 0, 0]);
const id = getSnapshot().effects[0].id;
setEffectShots(id, [3, 1, 3, -1, 8, 2]); // valid: 1, 2, 3
check("normalises array", getSnapshot().effects[0].shots.join(",") === "1,2,3");
setEffectShots(id, []);
check("removes field for empty array", !("shots" in getSnapshot().effects[0]));
setEffectShots(id, [0,1,2,3,4,5,6,7]);
check("removes field for all eight", !("shots" in getSnapshot().effects[0]));
setEffectShots(id, "junk");
check("refuses junk", !("shots" in getSnapshot().effects[0]));
setEffectShots(id, [1, 2]);

// 3. effectsForSession / loadEffects
const session = effectsForSession();
check("session includes shots", session[0].shots.join(",") === "1,2");
clearEffects();
loadEffects(session);
check("loadEffects keeps shots", getSnapshot().effects[0].shots.join(",") === "1,2");

clearEffects();
loadEffects([{ type: "fog", position: [0,0,0], size: 1 }]);
check("loads old session without shots", !("shots" in getSnapshot().effects[0]));

if (failed === 0) console.log("ALL CHECKS PASSED");
process.exit(failed > 0 ? 1 : 0);
