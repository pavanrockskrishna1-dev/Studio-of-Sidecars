// Plain-node smoke test for the Placeable Lights store (src/fx/lightsStore.js):
// add/remove/clear, the MAX_LIGHTS cap, and the session save/load round trip.
// Run from the app folder:  node scripts/test-lights-store.mjs   (exit code 1 on any FAIL)
import * as lightsStore from "../src/fx/lightsStore.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const json = (v) => JSON.stringify(v);

check("starts empty", lightsStore.getSnapshot().lights.length === 0);

const r1 = lightsStore.addLight("point");
check("addLight(point) ok", r1.ok === true, json(r1));
check("addLight places at 0,2,0 white by default", (() => {
  const l = lightsStore.getSnapshot().lights[0];
  return l.type === "point" && l.color === "#ffffff" && l.x === 0 && l.y === 2 && l.z === 0 && l.intensity === 1;
})(), json(lightsStore.getSnapshot().lights[0]));

const r2 = lightsStore.addLight("spot");
check("addLight(spot) defaults to warm amber", lightsStore.getSnapshot().lights[1].color === "#ffcc66", json(r2));

const r3 = lightsStore.addLight("area");
check("addLight(area) defaults to soft blue", lightsStore.getSnapshot().lights[2].color === "#aaddff", json(r3));

check("addLight(bogus) refused", lightsStore.addLight("bogus").ok === false);

const spotId = lightsStore.getSnapshot().lights[1].id;
lightsStore.setLightColor(spotId, "#ff0000");
check("setLightColor updates the light", lightsStore.getSnapshot().lights.find((l) => l.id === spotId).color === "#ff0000");

lightsStore.setLightIntensity(spotId, 9);
check("setLightIntensity clamps to 5", lightsStore.getSnapshot().lights.find((l) => l.id === spotId).intensity === 5);
lightsStore.setLightIntensity(spotId, -3);
check("setLightIntensity clamps to 0.1", lightsStore.getSnapshot().lights.find((l) => l.id === spotId).intensity === 0.1);

lightsStore.setLightPosition(spotId, 1, 2, 3);
check("setLightPosition moves the light", (() => {
  const l = lightsStore.getSnapshot().lights.find((l2) => l2.id === spotId);
  return l.x === 1 && l.y === 2 && l.z === 3;
})());

while (lightsStore.getSnapshot().lights.length < lightsStore.MAX_LIGHTS) lightsStore.addLight("point");
check(`fills up to MAX_LIGHTS (${lightsStore.MAX_LIGHTS})`, lightsStore.getSnapshot().lights.length === lightsStore.MAX_LIGHTS);
const over = lightsStore.addLight("point");
check("addLight refuses beyond MAX_LIGHTS", over.ok === false && lightsStore.getSnapshot().lights.length === lightsStore.MAX_LIGHTS, json(over));

const removeId = lightsStore.getSnapshot().lights[0].id;
lightsStore.removeLight(removeId);
check("removeLight removes exactly that light", lightsStore.getSnapshot().lights.every((l) => l.id !== removeId) && lightsStore.getSnapshot().lights.length === lightsStore.MAX_LIGHTS - 1);

const before = lightsStore.lightsForSession();
check("lightsForSession returns plain data for every light", before.length === lightsStore.getSnapshot().lights.length && before.every((l) => !("id" in l)));

lightsStore.clearLights();
check("clearLights empties the store", lightsStore.getSnapshot().lights.length === 0);

lightsStore.loadLights(before);
check("loadLights restores the same count", lightsStore.getSnapshot().lights.length === before.length, json(lightsStore.getSnapshot().lights));
check("loadLights restores type/color/intensity/position", lightsStore.getSnapshot().lights.every((l, i) =>
  l.type === before[i].type && l.color === before[i].color && l.intensity === before[i].intensity &&
  l.x === before[i].x && l.y === before[i].y && l.z === before[i].z
));

lightsStore.clearLights();
check("loadLights drops bad entries and caps at MAX_LIGHTS", (() => {
  const many = Array.from({ length: lightsStore.MAX_LIGHTS + 5 }, () => ({ type: "point", color: "#ffffff", intensity: 1, x: 0, y: 2, z: 0 }));
  many.push({ type: "not-a-type", color: "#fff", intensity: 1, x: 0, y: 0, z: 0 });
  many.push({ type: "point", color: "#fff", intensity: 1, x: "nope", y: 0, z: 0 });
  lightsStore.loadLights(many);
  return lightsStore.getSnapshot().lights.length === lightsStore.MAX_LIGHTS;
})());
check("loadLights ignores a non-array", (() => {
  const n = lightsStore.getSnapshot().lights.length;
  lightsStore.loadLights(null);
  return lightsStore.getSnapshot().lights.length === n;
})());

lightsStore.clearLights();

console.log(`${failed === 0 ? "ALL CHECKS PASSED" : `${failed} CHECK(S) FAILED`} (${passed} PASS, ${failed} FAIL)`);
process.exit(failed === 0 ? 0 : 1);
