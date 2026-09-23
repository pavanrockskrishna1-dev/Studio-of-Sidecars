/* Garage G7a — added scene objects: the pure rules.
   ---------------------------------------------------------------------------
   Pure JS, no imports: no three.js, no DOM, no clock. Nothing here throws; bad
   input returns { ok:false, reason }. The stage (StudioCanvas.jsx) and the rail
   (InspectorRail.jsx) call these before any garageStore command, so the rules
   are the same everywhere and node-testable.

   Owner-approved decisions recorded here (G7a):
   - Decision 2: a running total-triangle count (main product + every VISIBLE
     added object). Above WARN_TRIANGLES (700,000) the rail warns; an add (or
     an un-hide) that would take the total above MAX_TRIANGLES (1,000,000) is
     refused and nothing changes. Exactly 700,000 does not warn; exactly
     1,000,000 is allowed.
   - Decision 3: at most MAX_ADDED (5) added objects; a 6th is refused.
   - Decision 4: a new object stands beside the main product with its base on
     the floor and overlapping neither the main product nor any other added
     object (placeObject below: deterministic, a separating-axis rule).

   A box is { min:[x,y,z], max:[x,y,z] } in the stage's model-local frame. */

export const OBJECT_LIMITS = Object.freeze({
  MAX_ADDED: 5,
  WARN_TRIANGLES: 700000,
  MAX_TRIANGLES: 1000000,
  DEFAULT_GAP: 0.15, // metres between a new object and everything already there
});

// Selection sentinel: an added object is always selected WHOLE, never per part
// (Decision 5). The Garage store's selection needs a valid part id, so an
// added object's entry is { itemId, partId: OBJECT_PART_ID }.
export const OBJECT_PART_ID = "object~0";

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const isCount = (n) => Number.isSafeInteger(n) && n >= 0;
const isVec3 = (a) => Array.isArray(a) && a.length === 3 && a.every(isNum);
const isBox = (b) => typeof b === "object" && b !== null && isVec3(b.min) && isVec3(b.max) && b.min.every((v, i) => v <= b.max[i]);
const fail = (reason, extra) => ({ ok: false, reason, ...(extra || {}) });

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// "ok" | "warn" | "over" for a total triangle count.
export function budgetLevel(total) {
  if (!isCount(total)) return "over";
  if (total > OBJECT_LIMITS.MAX_TRIANGLES) return "over";
  if (total > OBJECT_LIMITS.WARN_TRIANGLES) return "warn";
  return "ok";
}

// The rail's running counter line.
export function budgetMessage(total) {
  const level = budgetLevel(total);
  const base = `Scene triangles: ${isCount(total) ? fmt(total) : "?"} / ${fmt(OBJECT_LIMITS.MAX_TRIANGLES)}`;
  if (level === "warn") return `${base} — heavy scene (over ${fmt(OBJECT_LIMITS.WARN_TRIANGLES)}); playback and exports may slow down.`;
  if (level === "over") return `${base} — over the limit.`;
  return base;
}

// Decision 3 alone: may one more object be added to `addedCount` existing ones?
export function checkAddCount(addedCount) {
  if (!isCount(addedCount)) return fail("bad-input", { message: "Could not count the added objects." });
  if (addedCount >= OBJECT_LIMITS.MAX_ADDED) {
    return fail("max-objects", {
      message: `Refused: the scene already has ${OBJECT_LIMITS.MAX_ADDED} added objects (the maximum). Remove one first.`,
    });
  }
  return { ok: true };
}

// Decision 2 alone: may `addTriangles` more visible triangles join a scene
// that currently shows `currentTriangles`? { ok, total, warn, message }.
export function checkBudget(currentTriangles, addTriangles, verb = "Adding") {
  if (!isCount(currentTriangles) || !isCount(addTriangles)) {
    return fail("bad-input", { message: "Could not count the triangles." });
  }
  const total = currentTriangles + addTriangles;
  if (total > OBJECT_LIMITS.MAX_TRIANGLES) {
    return fail("over-budget", {
      total,
      message: `Refused: ${verb.toLowerCase()} this object would make the scene ${fmt(total)} triangles, over the ${fmt(OBJECT_LIMITS.MAX_TRIANGLES)} limit. Nothing was added.`,
    });
  }
  const warn = total > OBJECT_LIMITS.WARN_TRIANGLES;
  return {
    ok: true,
    total,
    warn,
    message: warn ? `Heavy scene: ${fmt(total)} triangles (over ${fmt(OBJECT_LIMITS.WARN_TRIANGLES)}). Playback and exports may slow down.` : "",
  };
}

// Both rules, count first (so a 6th object is refused before it is loaded).
export function checkAdd({ addedCount, currentTriangles, newTriangles } = {}) {
  const c = checkAddCount(addedCount);
  if (!c.ok) return c;
  return checkBudget(currentTriangles, newTriangles, "Adding");
}

// Un-hiding an added object brings its triangles back into the total, so the
// same limit applies (otherwise hide / add / un-hide would bypass it).
export function checkUnhide({ currentTriangles, objectTriangles } = {}) {
  const r = checkBudget(currentTriangles, objectTriangles, "Showing");
  if (!r.ok && r.reason === "over-budget") {
    r.message = `Refused: showing this object would make the scene ${fmt(r.total)} triangles, over the ${fmt(OBJECT_LIMITS.MAX_TRIANGLES)} limit.`;
  }
  return r;
}

// Strict overlap of two boxes (touching faces do not overlap).
export function boxesOverlap(a, b) {
  if (!isBox(a) || !isBox(b)) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a.max[i] <= b.min[i] || b.max[i] <= a.min[i]) return false;
  }
  return true;
}

// Decision 4. The new object is anchored at its BASE CENTRE (the stage offsets
// the model so its local box's bottom-centre sits at the item's position), so
// position.y = floorY puts the base exactly on the floor.
//
// "Beside" = along the horizontal side axis of the product's front: the front
// faces azimuth frontAz (0 = +Z, 90 = +X), the side axis is
// s = (cos az, 0, -sin az). The object is pushed along s until its near face
// is `gap` beyond the farthest point of every occupied box along s, so the
// projections onto s are disjoint: by the separating-axis rule it overlaps
// nothing, whatever the boxes' sizes. Along the front axis it is centred on
// the first occupied box (the main product), so it stands level with it.
//
// { occupied:[box], objectSize:[sx,sy,sz], floorY, frontAz?, gap? }
// -> { ok:true, position:[x,y,z], box } | { ok:false, reason }
export function placeObject({ occupied, objectSize, floorY, frontAz = 0, gap = OBJECT_LIMITS.DEFAULT_GAP } = {}) {
  if (!Array.isArray(occupied) || occupied.length === 0 || !occupied.every(isBox)) return fail("bad-occupied");
  if (!isVec3(objectSize) || objectSize.some((v) => v < 0)) return fail("bad-size");
  if (!isNum(floorY) || !isNum(frontAz) || !isNum(gap) || gap < 0) return fail("bad-input");
  const az = (frontAz * Math.PI) / 180;
  // Rounded so the axes of the four common azimuths are exact (no 6e-17 drift).
  const r = (v) => Math.round(v * 1e12) / 1e12;
  const sx = r(Math.cos(az));
  const sz = r(-Math.sin(az));
  const fx = r(Math.sin(az));
  const fz = r(Math.cos(az));
  const hx = objectSize[0] / 2;
  const hz = objectSize[2] / 2;
  // Farthest reach of every occupied box along s (max over its 4 footprint corners).
  let far = -Infinity;
  for (const b of occupied) {
    const p = Math.max(b.min[0] * sx, b.max[0] * sx) + Math.max(b.min[2] * sz, b.max[2] * sz);
    if (p > far) far = p;
  }
  // The object's half-extent along s.
  const reach = Math.abs(sx) * hx + Math.abs(sz) * hz;
  const main = occupied[0];
  const cx = (main.min[0] + main.max[0]) / 2;
  const cz = (main.min[2] + main.max[2]) / 2;
  const t = far + gap + reach; // centre's coordinate along s
  const u = cx * fx + cz * fz; // centre's coordinate along the front axis (main's)
  const x = t * sx + u * fx;
  const z = t * sz + u * fz;
  const position = [x === 0 ? 0 : x, floorY, z === 0 ? 0 : z];
  const box = {
    min: [x - hx, floorY, z - hz],
    max: [x + hx, floorY + objectSize[1], z + hz],
  };
  if (![...position, ...box.min, ...box.max].every(isNum)) return fail("not-finite");
  return { ok: true, position, box };
}

