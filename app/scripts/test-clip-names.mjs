// Tests for cleanClipName. Run from the app folder:
//   node scripts/test-clip-names.mjs
import { cleanClipName } from "../src/ui/cleanClipName.js";

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${ok ? "" : `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

check("mixamo.com alias", cleanClipName("mixamo.com"), "Mixamo");
check("Take 001 → Take 1", cleanClipName("Take 001"), "Take 1");
check("Take 01 → Take 1", cleanClipName("Take 01"), "Take 1");
check("Take 1 stays Take 1", cleanClipName("Take 1"), "Take 1");
check("snake_case → sentence case", cleanClipName("idle_animation"), "Idle animation");
check("ALL_CAPS_SNAKE", cleanClipName("WALK_CYCLE"), "Walk cycle");
check("camelCase → sentence case", cleanClipName("walkCycle"), "Walk cycle");
check("camelCase multi-word", cleanClipName("runningFast"), "Running fast");
check("single word lowercase", cleanClipName("idle"), "Idle");
check("single word uppercase", cleanClipName("IDLE"), "Idle");
check("hyphen separator", cleanClipName("walk-cycle"), "Walk cycle");
check("already clean", cleanClipName("Run"), "Run");
check("empty string passthrough", cleanClipName(""), "");
check("non-string passthrough", cleanClipName(42), 42);
check("default Blender default", cleanClipName("default"), "Default");
check("ArmatureAction style", cleanClipName("ArmatureAction"), "Armature action");

if (failed === 0) console.log(`\nALL CHECKS PASSED (${passed} PASS)`);
else console.log(`\n${failed} CHECK(S) FAILED (${passed} PASS, ${failed} FAIL)`);
process.exit(failed === 0 ? 0 : 1);
