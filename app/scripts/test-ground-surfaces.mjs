// Checks for the ground surfaces (app/src/fx/groundSurfaces.js: the plain
// data table the Day and Night stages pick a ground texture from) and the
// stage look store (app/src/fx/stageLook.js: look + ground, and which stage
// switches reset ground to that stage's own default). Plain node, no
// browser, no three.js: both modules are pure data/state on purpose.
// Run from the app folder:  node scripts/test-ground-surfaces.mjs   (exit code 1 on any FAIL)
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GROUND_SURFACES, GROUND_IDS, DEFAULT_GROUND, isGroundId, textureBase } from "../src/fx/groundSurfaces.js";
import * as stageLook from "../src/fx/stageLook.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

/* ============================ groundSurfaces.js ============================ */
check("there is more than one ground surface", GROUND_IDS.length > 1);
check('"soil" is a surface (the night stage\'s original ground)', isGroundId("soil"));
check('"soil" has no texture (it stays a plain material)', GROUND_SURFACES.soil.textured === false);

for (const id of GROUND_IDS) {
  const def = GROUND_SURFACES[id];
  check(`${id}: has a label`, typeof def.label === "string" && def.label.length > 0);
  if (def.textured) {
    check(`${id}: textured surface has a believable real-world tileMeters`, typeof def.tileMeters === "number" && def.tileMeters > 0.3 && def.tileMeters < 10, String(def.tileMeters));
    const base = textureBase(id);
    for (const file of ["color.jpg", "normal.jpg", "roughness.jpg"]) {
      const p = join("public", base, file);
      check(`${id}: ${file} exists under public${base}`, existsSync(p), p);
    }
  }
  check(`${id}: has a swatch colour`, /^#[0-9a-f]{6}$/i.test(def.swatch), def.swatch);
}

check("isGroundId rejects an unknown id", !isGroundId("marble"));
check("isGroundId rejects empty/undefined", !isGroundId() && !isGroundId(""));

check('DEFAULT_GROUND.night is "soil" (unchanged from before Day stage existed)', DEFAULT_GROUND.night === "soil");
check("DEFAULT_GROUND.day is a real, textured ground surface", isGroundId(DEFAULT_GROUND.day) && GROUND_SURFACES[DEFAULT_GROUND.day].textured);

/* ============================ stageLook.js ============================ */
check('fresh state starts "studio" with the night default ground', stageLook.getSnapshot().look === "studio" && stageLook.getSnapshot().ground === DEFAULT_GROUND.night);

stageLook.setStageLook("day");
check('setStageLook("day") switches the look', stageLook.getSnapshot().look === "day");
check("switching stage (no ground given) falls back to that stage's own default", stageLook.getSnapshot().ground === DEFAULT_GROUND.day);

stageLook.setGround("sand");
check('setGround("sand") changes the ground without touching the look', stageLook.getSnapshot().ground === "sand" && stageLook.getSnapshot().look === "day");

stageLook.setStageLook("day");
check("re-picking the SAME stage does not reset a ground already chosen", stageLook.getSnapshot().ground === "sand");

stageLook.setStageLook("night");
check('switching to a different stage (still no ground given) resets to THAT stage\'s default', stageLook.getSnapshot().look === "night" && stageLook.getSnapshot().ground === DEFAULT_GROUND.night);

stageLook.setStageLook("day", "deck");
check("an explicit ground on a stage switch is used instead of the default (project/session restore)", stageLook.getSnapshot().look === "day" && stageLook.getSnapshot().ground === "deck");

stageLook.setGround("marble"); // not a real surface
check("setGround ignores an unknown id", stageLook.getSnapshot().ground === "deck");

stageLook.setStageLook("bogus");
check('an unrecognised look falls back to "studio"', stageLook.getSnapshot().look === "studio");

check('isOutdoor is true for "night" and "day", false for "studio"', stageLook.isOutdoor("night") && stageLook.isOutdoor("day") && !stageLook.isOutdoor("studio"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
