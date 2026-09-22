// Garage G5 — checks for the refit() measurement pipeline (StudioCanvas.jsx),
// exercised here through the two pure modules it is built from: bounds.js
// (unionBounds, floorYFor) and compose.js (matFromTRS, matMul, transformPoint).
// Plain node, no three, no DOM, no browser. Every expectation is computed a
// SECOND, INDEPENDENT way (handUnion below, built from compose.js's public
// matrix functions, never calling bounds.js's own private trs()/mul()/apply())
// so a bug in unionBounds's own composition could not hide behind a test that
// just calls the same code twice.
//   Run from the app folder:  node scripts/test-garage-refit.mjs
// Exit code 1 on any FAIL.
import { unionBounds, floorYFor } from "../src/garage/bounds.js";
import { matFromTRS, matMul, transformPoint, identityMatrix, quatNormalize } from "../src/garage/compose.js";

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}
const info = (msg) => console.log(`INFO  ${msg}`);
const fmt = (v) => (typeof v === "number" ? v.toPrecision(12) : JSON.stringify(v));
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const nearVec = (a, b, tol) => a.every((v, i) => near(v, b[i], tol));
const maxDiffVec = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mkRand = (seed) => {
  const r = mulberry32(seed);
  const range = (lo, hi) => lo + (hi - lo) * r();
  return { range, vec: (lo, hi) => [range(lo, hi), range(lo, hi), range(lo, hi)] };
};
const randQuat = (R) => quatNormalize([R.range(-1, 1), R.range(-1, 1), R.range(-1, 1), R.range(-1, 1)]);

/* ---------------------------------------------------------------------------
   handUnion: the SAME adapter-shaped tree bounds.js's unionBounds consumes
   ({ visible?, pos?, quat?, scale?, box?, children? }, LOCAL per node — this
   is the exact adapter shape StudioCanvas.jsx's adaptObject3D() builds from
   the live three.js scene), unioned by an INDEPENDENT walk that composes
   matrices via compose.js's matFromTRS / matMul / transformPoint instead of
   bounds.js's own private trs()/mul()/apply(). Returns the same shape as
   unionBounds's non-null result (min/max/center/size), or null. */
function handUnion(root, aboveMatrix = identityMatrix()) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let count = 0;
  function walk(node, parent) {
    if (node.visible === false) return;
    const local = matFromTRS(node.pos ?? [0, 0, 0], node.quat ?? [0, 0, 0, 1], node.scale ?? [1, 1, 1]);
    const world = matMul(parent, local);
    if (node.box) {
      for (let i = 0; i < 8; i += 1) {
        const p = transformPoint(world, [
          i & 1 ? node.box.max[0] : node.box.min[0],
          i & 2 ? node.box.max[1] : node.box.min[1],
          i & 4 ? node.box.max[2] : node.box.min[2],
        ]);
        count += 1;
        for (let a = 0; a < 3; a += 1) {
          if (p[a] < min[a]) min[a] = p[a];
          if (p[a] > max[a]) max[a] = p[a];
        }
      }
    }
    for (const child of node.children ?? []) walk(child, world);
  }
  walk(root, aboveMatrix);
  if (count === 0) return null;
  return { min, max, center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

// Mirrors refit()'s own formula in StudioCanvas.jsx (minus `distance`, which
// depends on aspect/FOV — a UI concern, not part of the measurement contract
// this script checks). world = the union rooted at transformRef (part edits
// AND the whole-model transform); homeFloorY = fit.floorY (frozen).
function liveFitFrom(worldUnion, homeFloorY) {
  if (!worldUnion) return null;
  const size = worldUnion.size;
  return {
    center: worldUnion.center,
    size,
    floorY: floorYFor({ homeFloorY, unionMinY: worldUnion.min[1] }),
    footprintRadius: Math.hypot(size[0], size[2]) / 2,
  };
}

const cube = (extra = {}) => ({ box: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] }, ...extra });

/* ====================== 1. adapter-shaped tree, no edits ====================== */
{
  // Three "part" meshes at distinct local offsets under one "modelScene" node —
  // the exact shape adaptObject3D() produces walking modelScene's children.
  const modelScene = {
    children: [
      cube({ pos: [1, 0, 0] }), // part A
      cube({ pos: [-1, 0, 0] }), // part B
      cube({ pos: [0, 2, 0] }), // part C
    ],
  };
  const u = unionBounds(modelScene);
  const h = handUnion(modelScene);
  check("no edits: unionBounds and the independent hand union agree (1e-12)", u && h && maxDiffVec(u.min, h.min) <= 1e-12 && maxDiffVec(u.max, h.max) <= 1e-12, JSON.stringify({ u, h }));
  check("no edits: union spans x in [-1.5, 1.5], y in [-0.5, 2.5], z in [-0.5, 0.5]", u && nearVec(u.min, [-1.5, -0.5, -0.5], 1e-12) && nearVec(u.max, [1.5, 2.5, 0.5], 1e-12), JSON.stringify(u));

  /* ====================== 2. hiding one leaf excludes it ====================== */
  const hidden = { children: [modelScene.children[0], modelScene.children[1], cube({ pos: [0, 2, 0], visible: false })] };
  const uHidden = unionBounds(hidden);
  const hHidden = handUnion(hidden);
  check("hiding part C excludes it from the union", uHidden && nearVec(uHidden.max, [1.5, 0.5, 0.5], 1e-12), JSON.stringify(uHidden));
  check("hiding part C: unionBounds agrees with the independent hand union (1e-12)", uHidden && hHidden && maxDiffVec(uHidden.min, hHidden.min) <= 1e-12 && maxDiffVec(uHidden.max, hHidden.max) <= 1e-12);

  /* ====================== 3. moving one leaf's local transform ====================== */
  const moved = { children: [cube({ pos: [1, 0, 0] }), cube({ pos: [-1, 0, 0] }), cube({ pos: [0, 5, 0] })] };
  const uMoved = unionBounds(moved);
  const hMoved = handUnion(moved);
  check("moving part C to y=5 changes the union predictably (max.y = 5.5)", uMoved && near(uMoved.max[1], 5.5, 1e-12), JSON.stringify(uMoved));
  check("moving part C: unionBounds agrees with the independent hand union (1e-12)", uMoved && hMoved && maxDiffVec(uMoved.min, hMoved.min) <= 1e-12 && maxDiffVec(uMoved.max, hMoved.max) <= 1e-12);
}

/* ====================== 4. pivot+offset translate-only groups cancel ====================== */
// Garage G5's Turntable pivot fix walks pivotRef -> pivotOffsetRef -> modelScene
// with pivotRef.position = c and pivotOffsetRef.position = -c for whatever
// centre c refit() last computed. T(c) * T(-c) = identity regardless of c (pure
// translations commute), so the WORLD union must never depend on c — this is
// exactly the property that makes it safe for refit() to keep walking through
// the pivot chain to measure the world union without first knowing c.
{
  const modelScene = cube({ pos: [3, 1, -2] });
  const bare = unionBounds(modelScene);
  for (const c of [[0, 0, 0], [3, 1, -2], [99, -50, 12.5], [-7, 0, 0]]) {
    const wrapped = { pos: c, children: [{ pos: [-c[0], -c[1], -c[2]], children: [modelScene] }] };
    const u = unionBounds(wrapped);
    check(`pivot+offset cancel for c=${JSON.stringify(c)}: union matches the unwrapped tree (1e-9)`, u && bare && maxDiffVec(u.min, bare.min) <= 1e-9 && maxDiffVec(u.max, bare.max) <= 1e-9, JSON.stringify({ u, bare }));
  }
}

/* ====================== 5. world union includes the whole-model transform, local does not (CAM-001) ====================== */
{
  const modelScene = { children: [cube({ pos: [1, 0, 0] }), cube({ pos: [-1, 0, 0] })] };
  const localUnion = unionBounds(modelScene);
  // A pure translation (the "move the whole model" repro from the owner's
  // CAM-001 baseline: 0.3 on x).
  const translated = { pos: [0.3, 0, 0], children: [modelScene] };
  const worldT = unionBounds(translated);
  check("CAM-001: a whole-model translate shifts the WORLD union centre by exactly the translation", worldT && localUnion && near(worldT.center[0] - localUnion.center[0], 0.3, 1e-12) && near(worldT.center[1], localUnion.center[1], 1e-12), JSON.stringify({ worldT, localUnion }));
  check("CAM-001: the LOCAL union (modelScene alone) is untouched by the whole-model transform", near(localUnion.center[0], 0, 1e-12));
  // A uniform scale.
  const scaled = { scale: [2, 2, 2], children: [modelScene] };
  const worldS = unionBounds(scaled);
  check("CAM-001: a whole-model uniform scale doubles the WORLD union's size", worldS && localUnion && nearVec(worldS.size, localUnion.size.map((v) => v * 2), 1e-12), JSON.stringify({ worldS, localUnion }));
}

/* ====================== 6. floorYFor always returns homeFloorY when finite (Decision 4) ====================== */
{
  const cases = [
    { homeFloorY: -1.2, unionMinY: -50 }, // a part dragged far below the floor
    { homeFloorY: 0, unionMinY: 1000 }, // union entirely above the home floor
    { homeFloorY: 3.5, unionMinY: 3.5 },
    { homeFloorY: -0.0001, unionMinY: -0.0001 },
  ];
  for (const c of cases) {
    check(`floorYFor pins the floor at homeFloorY=${c.homeFloorY} regardless of unionMinY=${c.unionMinY}`, floorYFor(c) === c.homeFloorY);
  }
}

/* ====================== 7. overlay-shaped children must be excluded before unioning ====================== */
// adaptObject3D() (StudioCanvas.jsx) filters out any child named
// "selection-outline" or "garage-overlay" before it ever reaches unionBounds;
// bounds.js itself has no concept of names, so this documents (and bounds-
// tests) the CONSEQUENCE of forgetting that filter: an overlay-shaped extra
// child measurably inflates the union.
{
  const modelScene = { children: [cube({ pos: [1, 0, 0] }), cube({ pos: [-1, 0, 0] })] };
  const withoutOverlay = unionBounds(modelScene);
  const overlayChild = cube({ pos: [0, 50, 0] }); // stands in for a stray outline/overlay shell
  const withOverlay = unionBounds({ children: [...modelScene.children, overlayChild] });
  check("an unfiltered overlay-shaped child measurably inflates the union (must be filtered by name before unionBounds)", withOverlay.max[1] > withoutOverlay.max[1] + 40, JSON.stringify({ withoutOverlay, withOverlay }));
}

/* ====================== 8. randomized cross-check: unionBounds vs. the independent hand union ====================== */
{
  const R = mkRand(5);
  let maxDev = 0;
  const N = 200;
  for (let i = 0; i < N; i += 1) {
    const depth = 1 + Math.floor(R.range(0, 3));
    function randNode(d) {
      const node = { pos: R.vec(-5, 5), quat: randQuat(R), scale: [R.range(0.2, 3), R.range(0.2, 3), R.range(0.2, 3)] };
      if (R.range(0, 1) < 0.15) node.visible = false;
      if (d <= 0 || R.range(0, 1) < 0.4) {
        node.box = { min: [-0.5, -0.5, -0.5].map((v) => v * R.range(0.1, 2)), max: [0.5, 0.5, 0.5].map((v) => v * R.range(0.1, 2)) };
      } else {
        node.children = Array.from({ length: 1 + Math.floor(R.range(0, 3)) }, () => randNode(d - 1));
      }
      return node;
    }
    const tree = randNode(depth);
    const u = unionBounds(tree);
    const h = handUnion(tree);
    if (u === null || h === null) {
      check(`random tree ${i}: both agree the union is empty`, u === null && h === null);
      continue;
    }
    maxDev = Math.max(maxDev, maxDiffVec(u.min, h.min), maxDiffVec(u.max, h.max));
  }
  check(`bounds: unionBounds agrees with the independent (compose.js-based) hand union (${N} random trees, 1e-8)`, maxDev <= 1e-8, `maxDev=${fmt(maxDev)}`);
}

/* ====================== 9. the refit sequence: >=10 scripted steps ====================== */
// Simulates the stream of commits refit() reacts to (a garageStore revision
// change or a whole-model transform change): a script of part moves, hides,
// resets and a whole-model translate + scale, applied to one mutable
// synthetic tree. After EVERY step, unionBounds(world tree) is compared to
// the independent hand union, and the resulting liveFit (center/size/floorY/
// footprintRadius) is compared against an independently hand-computed
// expectation — never by calling the same code path twice.
{
  const HOME_FLOOR_Y = -0.8;
  const partA = cube({ pos: [1, 0, 0] });
  const partB = cube({ pos: [-1, 0, 0] });
  const partC = cube({ pos: [0, 2, 0] });
  const partD = cube({ pos: [0, -0.3, 3] });
  const modelScene = { children: [partA, partB, partC, partD] };
  const wholeModel = { pos: [0, 0, 0], quat: [0, 0, 0, 1], scale: [1, 1, 1], children: [modelScene] };

  const steps = [
    { label: "0: nothing edited (mount baseline)", apply: () => {} },
    { label: "1: move part A by (0.5, 0.25, -0.3)", apply: () => { partA.pos = [1.5, 0.25, -0.3]; } },
    { label: "2: move part B by (-0.2, 0, 0.1)", apply: () => { partB.pos = [-1.2, 0, 0.1]; } },
    { label: "3: hide part C", apply: () => { partC.visible = false; } },
    { label: "4: move part A again (cumulative)", apply: () => { partA.pos = [2.0, 0.25, -0.3]; } },
    { label: "5: un-hide part C", apply: () => { delete partC.visible; } },
    { label: "6: scale the whole model by 2x", apply: () => { wholeModel.scale = [2, 2, 2]; } },
    { label: "7: translate the whole model by (5, 0, -1)", apply: () => { wholeModel.pos = [5, 0, -1]; } },
    { label: "8: hide part D", apply: () => { partD.visible = false; } },
    { label: "9: move part B far below the floor (y=-40)", apply: () => { partB.pos = [-1.2, -40, 0.1]; } },
    { label: "10: reset part A back to base", apply: () => { partA.pos = [1, 0, 0]; } },
    { label: "11: un-hide part D", apply: () => { delete partD.visible; } },
    { label: "12: un-scale and un-translate the whole model (Reset)", apply: () => { wholeModel.scale = [1, 1, 1]; wholeModel.pos = [0, 0, 0]; } },
  ];

  check(`refit sequence has at least 10 steps (${steps.length})`, steps.length >= 10);

  let allMatch = true;
  let worstDev = 0;
  for (const step of steps) {
    step.apply();
    const u = unionBounds(wholeModel);
    const h = handUnion(wholeModel);
    if (!u || !h) {
      allMatch = false;
      break;
    }
    const dev = Math.max(maxDiffVec(u.min, h.min), maxDiffVec(u.max, h.max));
    worstDev = Math.max(worstDev, dev);
    if (dev > 1e-9) allMatch = false;

    const lf = liveFitFrom(u, HOME_FLOOR_Y);
    const hExpected = liveFitFrom(h, HOME_FLOOR_Y);
    if (!lf || !hExpected || maxDiffVec(lf.center, hExpected.center) > 1e-9 || maxDiffVec(lf.size, hExpected.size) > 1e-9 || !near(lf.floorY, hExpected.floorY, 1e-12) || !near(lf.footprintRadius, hExpected.footprintRadius, 1e-9)) {
      allMatch = false;
    }
    if (lf.floorY !== HOME_FLOOR_Y) allMatch = false;
    info(`${step.label}: center=${JSON.stringify(lf.center.map((n) => Number(n.toFixed(4))))} size=${JSON.stringify(lf.size.map((n) => Number(n.toFixed(4))))} floorY=${lf.floorY} footprintRadius=${lf.footprintRadius.toFixed(4)}`);
  }
  check("refit sequence: at every step, unionBounds matches the independent hand union (1e-9)", allMatch, `worstDev=${fmt(worstDev)}`);
  check("refit sequence: floorY never left HOME_FLOOR_Y at any step, even with a part far below it (Decision 4)", allMatch);
}

console.log(failed === 0 ? `\nALL CHECKS PASSED (${passed} PASS)` : `\n${failed} CHECK(S) FAILED (${passed} PASS)`);
process.exit(failed === 0 ? 0 : 1);
