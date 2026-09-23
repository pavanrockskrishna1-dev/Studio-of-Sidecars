// Garage G7a — checks for the added-object rules (placement, triangle budget,
// max count) in app/src/garage/sceneObjects.js, and that adding / removing an
// object through garageStore is exactly one undo step each. Plain node, no
// browser, no three.js.
// Run from the app folder:  node scripts/test-garage-objects.mjs   (exit code 1 on any FAIL)
import * as so from "../src/garage/sceneObjects.js";
import { createGarageStore } from "../src/garage/garageStore.js";
import { serializeLayout } from "../src/garage/layout.js";
import { parsePartId } from "../src/garage/partId.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

const L = so.OBJECT_LIMITS;
const box = (min, max) => ({ min, max });
const sizeOf = (b) => b.max.map((v, i) => v - b.min[i]);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/* ============================== constants ============================== */
check("MAX_ADDED is 5", L.MAX_ADDED === 5);
check("WARN_TRIANGLES is 700,000", L.WARN_TRIANGLES === 700000);
check("MAX_TRIANGLES is 1,000,000", L.MAX_TRIANGLES === 1000000);
check("limits are frozen", Object.isFrozen(L));
check("OBJECT_PART_ID is a valid part id (selection needs one)", parsePartId(so.OBJECT_PART_ID) !== null);

/* ============================ budget edges ============================= */
check("budgetLevel 0 is ok", so.budgetLevel(0) === "ok");
check("budgetLevel 699,999 is ok", so.budgetLevel(699999) === "ok");
check("budgetLevel exactly 700,000 is ok (warn is ABOVE 700k)", so.budgetLevel(700000) === "ok");
check("budgetLevel 700,001 warns", so.budgetLevel(700001) === "warn");
check("budgetLevel 999,999 warns", so.budgetLevel(999999) === "warn");
check("budgetLevel exactly 1,000,000 warns (allowed)", so.budgetLevel(1000000) === "warn");
check("budgetLevel 1,000,001 is over", so.budgetLevel(1000001) === "over");
check("budgetLevel of junk is over", so.budgetLevel(-1) === "over" && so.budgetLevel(NaN) === "over" && so.budgetLevel("5") === "over" && so.budgetLevel(1.5) === "over");

{
  const a = so.checkBudget(600000, 100000);
  check("checkBudget total exactly 700,000: allowed, no warn", a.ok && a.total === 700000 && a.warn === false && a.message === "");
  const b = so.checkBudget(600000, 100001);
  check("checkBudget total 700,001: allowed with a warning", b.ok && b.total === 700001 && b.warn === true && /700,001/.test(b.message));
  const c = so.checkBudget(699999, 0);
  check("checkBudget total 699,999: allowed, no warn", c.ok && c.warn === false);
  const d = so.checkBudget(500000, 500000);
  check("checkBudget total exactly 1,000,000: allowed (warn)", d.ok && d.total === 1000000 && d.warn === true);
  const e = so.checkBudget(500000, 500001);
  check("checkBudget total 1,000,001: refused", !e.ok && e.reason === "over-budget" && e.total === 1000001);
  check("refusal message names the total, the limit and says nothing was added", /1,000,001/.test(e.message) && /1,000,000/.test(e.message) && /Nothing was added/.test(e.message));
  const f = so.checkBudget(999999, 0);
  check("checkBudget total 999,999: allowed", f.ok && f.warn === true);
  check("checkBudget refuses junk input", !so.checkBudget(-1, 5).ok && !so.checkBudget(5, 1.5).ok && !so.checkBudget(undefined, 5).ok);
  // THE KOP MAIN twice and three times (483,311 triangles counted per node).
  const kop = 483311;
  const twice = so.checkBudget(kop, kop);
  check("KOP MAIN + KOP MAIN (966,622) is allowed with the 700k warning", twice.ok && twice.warn && twice.total === 966622);
  const thrice = so.checkBudget(2 * kop, kop);
  check("a third KOP MAIN (1,449,933) is refused", !thrice.ok && thrice.reason === "over-budget" && thrice.total === 1449933);
}

check("budgetMessage shows the running total", /Scene triangles: 483,311 \/ 1,000,000/.test(so.budgetMessage(483311)));
check("budgetMessage warns above 700k", /heavy scene/.test(so.budgetMessage(700001)) && !/heavy/.test(so.budgetMessage(700000)));
check("budgetMessage marks over the limit", /over the limit/.test(so.budgetMessage(1000001)));

/* ============================== max count ============================== */
for (let n = 0; n < 5; n += 1) check(`checkAddCount(${n}) allows`, so.checkAddCount(n).ok === true);
{
  const r = so.checkAddCount(5);
  check("checkAddCount(5) refuses a 6th object", !r.ok && r.reason === "max-objects" && /5 added objects/.test(r.message));
  check("checkAddCount(6) refuses", !so.checkAddCount(6).ok);
  check("checkAddCount of junk refuses", !so.checkAddCount(-1).ok && !so.checkAddCount(1.5).ok && !so.checkAddCount(null).ok);
  const both = so.checkAdd({ addedCount: 5, currentTriangles: 0, newTriangles: 0 });
  check("checkAdd: count is checked first (6th refused even when light)", !both.ok && both.reason === "max-objects");
  const heavy = so.checkAdd({ addedCount: 0, currentTriangles: 900000, newTriangles: 100001 });
  check("checkAdd: budget refusal when the count is fine", !heavy.ok && heavy.reason === "over-budget");
  const fine = so.checkAdd({ addedCount: 4, currentTriangles: 100, newTriangles: 100 });
  check("checkAdd: a 5th light object is allowed", fine.ok && fine.total === 200 && fine.warn === false);
}
{
  const u = so.checkUnhide({ currentTriangles: 600000, objectTriangles: 400001 });
  check("checkUnhide refuses showing an object over the limit", !u.ok && u.reason === "over-budget" && /showing this object/.test(u.message));
  const v = so.checkUnhide({ currentTriangles: 600000, objectTriangles: 400000 });
  check("checkUnhide allows exactly the limit", v.ok && v.total === 1000000);
}

/* ============================== placement ============================== */
check("boxesOverlap: overlapping boxes", so.boxesOverlap(box([0, 0, 0], [2, 2, 2]), box([1, 1, 1], [3, 3, 3])));
check("boxesOverlap: touching faces do not overlap", !so.boxesOverlap(box([0, 0, 0], [1, 1, 1]), box([1, 0, 0], [2, 1, 1])));
check("boxesOverlap: apart on one axis only", !so.boxesOverlap(box([0, 0, 0], [1, 1, 1]), box([0.5, 0.5, 2], [2, 2, 3])));

const mainBox = box([-1.2, 0.05, -0.4], [1.3, 1.6, 0.6]); // a bike-sized main product
const floorY = 0.05;
{
  const r = so.placeObject({ occupied: [mainBox], objectSize: [11, 2.7, 8.2], floorY, frontAz: 0 });
  check("placeObject succeeds", r.ok);
  check("base sits exactly on the floor (position.y)", r.position[1] === floorY);
  check("base sits exactly on the floor (box.min.y)", r.box.min[1] === floorY);
  check("box height is the object's height", near(r.box.max[1] - r.box.min[1], 2.7));
  check("placed box does not overlap the main product", !so.boxesOverlap(r.box, mainBox));
  check("frontAz 0: placed beside along +X", r.box.min[0] >= mainBox.max[0] + L.DEFAULT_GAP - 1e-9);
  check("frontAz 0: centred on the main product along the front axis (z)", near(r.position[2], (mainBox.min[2] + mainBox.max[2]) / 2));
  check("placed box size equals the object's size", sizeOf(r.box).every((v, i) => near(v, [11, 2.7, 8.2][i])));
  const again = so.placeObject({ occupied: [mainBox], objectSize: [11, 2.7, 8.2], floorY, frontAz: 0 });
  check("deterministic: same input, identical output", JSON.stringify(again) === JSON.stringify(r));
}
{
  const r90 = so.placeObject({ occupied: [mainBox], objectSize: [1, 1, 1], floorY, frontAz: 90 });
  check("frontAz 90 (front +X): beside along -Z", r90.ok && r90.box.max[2] <= mainBox.min[2] - L.DEFAULT_GAP + 1e-9 && !so.boxesOverlap(r90.box, mainBox));
  check("frontAz 90: centred on the main product along x", near(r90.position[0], (mainBox.min[0] + mainBox.max[0]) / 2));
  const rm90 = so.placeObject({ occupied: [mainBox], objectSize: [1, 1, 1], floorY, frontAz: -90 });
  check("frontAz -90 (front -X): beside along +Z", rm90.ok && rm90.box.min[2] >= mainBox.max[2] + L.DEFAULT_GAP - 1e-9 && !so.boxesOverlap(rm90.box, mainBox));
}
{
  // Five objects in a row never overlap anything already placed.
  const occupied = [mainBox];
  const sizes = [[1, 1, 1], [3, 0.5, 2], [0.2, 4, 0.2], [11, 2.7, 8.2], [2, 2, 2]];
  let allClear = true;
  let allFloor = true;
  for (const s of sizes) {
    const r = so.placeObject({ occupied, objectSize: s, floorY, frontAz: -90 });
    if (!r.ok) allClear = false;
    else {
      if (occupied.some((b) => so.boxesOverlap(r.box, b))) allClear = false;
      if (r.box.min[1] !== floorY) allFloor = false;
      occupied.push(r.box);
    }
  }
  check("five successive placements never overlap the main product or each other", allClear);
  check("five successive placements all stand on the floor", allFloor);
}
{
  // Randomised (seeded) sweep over boxes, sizes and azimuths.
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let clear = true;
  let floor = true;
  let det = true;
  for (let i = 0; i < 400; i += 1) {
    const occ = [];
    const n = 1 + Math.floor(rnd() * 5);
    for (let k = 0; k < n; k += 1) {
      const c = [rnd() * 10 - 5, rnd() * 2, rnd() * 10 - 5];
      const h = [0.05 + rnd() * 4, 0.05 + rnd() * 3, 0.05 + rnd() * 4];
      occ.push(box([c[0] - h[0], c[1], c[2] - h[2]], [c[0] + h[0], c[1] + h[1], c[2] + h[2]]));
    }
    const size = [rnd() * 12, rnd() * 5, rnd() * 12];
    const az = Math.round(rnd() * 720 - 360);
    const fy = rnd() * 2 - 1;
    const r = so.placeObject({ occupied: occ, objectSize: size, floorY: fy, frontAz: az });
    const r2 = so.placeObject({ occupied: occ, objectSize: size, floorY: fy, frontAz: az });
    if (!r.ok || occ.some((b) => so.boxesOverlap(r.box, b))) clear = false;
    if (!r.ok || r.position[1] !== fy || r.box.min[1] !== fy) floor = false;
    if (JSON.stringify(r) !== JSON.stringify(r2)) det = false;
  }
  check("400 random scenes (any azimuth): placement never overlaps", clear);
  check("400 random scenes: base always exactly on the floor", floor);
  check("400 random scenes: placement is deterministic", det);
}
{
  const r = so.placeObject({ occupied: [mainBox], objectSize: [0, 0, 0], floorY, frontAz: 0 });
  check("a zero-size object is still placed on the floor", r.ok && r.position[1] === floorY);
  const g = so.placeObject({ occupied: [mainBox], objectSize: [1, 1, 1], floorY, frontAz: 0, gap: 0 });
  check("gap 0: touching but not overlapping", g.ok && near(g.box.min[0], mainBox.max[0]) && !so.boxesOverlap(g.box, mainBox));
  check("placeObject refuses no occupied boxes", !so.placeObject({ occupied: [], objectSize: [1, 1, 1], floorY }).ok);
  check("placeObject refuses a bad box", !so.placeObject({ occupied: [box([1, 0, 0], [0, 1, 1])], objectSize: [1, 1, 1], floorY }).ok);
  check("placeObject refuses a bad size", !so.placeObject({ occupied: [mainBox], objectSize: [1, -1, 1], floorY }).ok);
  check("placeObject refuses a non-finite floor", !so.placeObject({ occupied: [mainBox], objectSize: [1, 1, 1], floorY: NaN }).ok);
  check("placeObject refuses a negative gap", !so.placeObject({ occupied: [mainBox], objectSize: [1, 1, 1], floorY, gap: -1 }).ok);
  let threw = false;
  try {
    so.placeObject();
    so.placeObject(null ?? undefined);
    so.checkAdd();
    so.checkUnhide();
    so.boxesOverlap(null, undefined);
  } catch {
    threw = true;
  }
  check("nothing throws on missing input", !threw);
}

/* ================= add / remove through garageStore: one undo step each ================= */
{
  const s = createGarageStore();
  s.startLayout({ assetId: "the-kop-main", name: "T" });
  const before = serializeLayout(s.getLayout());
  const d0 = s.getSnapshot().undoDepth;
  const r = s.addItem({ assetId: "cessna-172", transform: { x: 3, y: 0.05, z: 0, rx: 0, ry: 0, rz: 0, s: 1 } });
  check("addItem succeeds", r.ok && r.itemId === "i1");
  check("add is exactly one undo step", s.getSnapshot().undoDepth === d0 + 1);
  check("added item holds the placement", (() => {
    const it = s.getLayout().items.find((i) => i.itemId === "i1");
    return it && it.transform.x === 3 && it.transform.y === 0.05 && it.primary === false && it.assetId === "cessna-172";
  })());
  const afterAdd = serializeLayout(s.getLayout());
  check("one undo removes the added object exactly", s.undo().ok && serializeLayout(s.getLayout()) === before);
  check("one redo restores it exactly", s.redo().ok && serializeLayout(s.getLayout()) === afterAdd);
  const d1 = s.getSnapshot().undoDepth;
  s.select([{ itemId: "i1", partId: so.OBJECT_PART_ID }]);
  check("an added object can be selected whole", s.getSnapshot().selectionCount === 1);
  const rm = s.removeItem("i1");
  check("removeItem succeeds", rm.ok);
  check("remove is exactly one undo step", s.getSnapshot().undoDepth === d1 + 1);
  check("remove drops the object's selection", s.getSnapshot().selectionCount === 0);
  check("layout after remove equals the pre-add layout", serializeLayout(s.getLayout()) === before);
  check("one undo brings the removed object back exactly", s.undo().ok && serializeLayout(s.getLayout()) === afterAdd);
  check("the primary item cannot be removed", s.removeItem("i0").reason === "not-primary");
  // An imported asset id is a valid item.
  const imp = s.addItem({ assetId: "imported-mf3k2-7x" });
  check("an imported asset id validates as an item", imp.ok && s.getLayout().items.some((i) => i.assetId === "imported-mf3k2-7x"));
}
{
  // Whole-object numeric edits: each commit is one undo step; scale floor 0.05.
  const s = createGarageStore();
  s.startLayout({ assetId: "coffee-bike", name: "T" });
  s.addItem({ assetId: "cessna-172", transform: { x: 2, y: 0, z: 0 } });
  const d = s.getSnapshot().undoDepth;
  s.setItemTransform("i1", { x: 2.5 });
  s.setItemTransform("i1", { ry: 45 });
  s.setItemTransform("i1", { s: 0.01 });
  s.setItemHidden("i1", true);
  check("four whole-object edits are four undo steps", s.getSnapshot().undoDepth === d + 4);
  check("scale is floored at 0.05", s.getLayout().items[1].transform.s === 0.05);
  s.undo();
  check("undo of hide shows the object again", s.getLayout().items[1].hidden === false);
  s.undo();
  s.undo();
  s.undo();
  check("four undos restore the placed transform", JSON.stringify(s.getLayout().items[1].transform) === JSON.stringify({ x: 2, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }));
}

console.log(failed === 0 ? `ALL CHECKS PASSED (${passed} PASS)` : `${failed} CHECK(S) FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
