/* Garage G7a — added scene objects: the pure rules.
   ---------------------------------------------------------------------------
   Pure JS, no imports but the prop id list (products/props.js, plain data): no
   three.js, no DOM, no clock. Nothing here throws; bad
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

import { isPropId } from "../products/props.js";

export const OBJECT_LIMITS = Object.freeze({
  MAX_ADDED: 5,
  WARN_TRIANGLES: 700000,
  MAX_TRIANGLES: 1000000,
  DEFAULT_GAP: 0.15, // metres between a new object and everything already there
  // Slice P2: props (set dressing and food) are ordinary added objects, but they
  // have their own cap and do not count against MAX_ADDED. 1 main + 5 objects +
  // 30 props = 36 items, inside LAYOUT_LIMITS.MAX_ITEMS (40). The triangle
  // budget above still guards the scene's weight.
  MAX_PROPS: 30,
  PROP_GAP: 0.02, // metres between a prop and anything else it stands beside
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


/* ================= Slice P2 — props: cap and drop placement ================= */

// { objects, props }: how many of `items` (anything with an assetId) are
// props and how many are other added objects.
export function countObjects(items) {
  let props = 0;
  let objects = 0;
  for (const it of Array.isArray(items) ? items : []) {
    if (it && isPropId(it.assetId)) props += 1;
    else objects += 1;
  }
  return { objects, props };
}

// Decision 6: at most MAX_PROPS props; the 13th is refused.
export function checkPropCount(propCount) {
  if (!isCount(propCount)) return fail("bad-input", { message: "Could not count the props." });
  if (propCount >= OBJECT_LIMITS.MAX_PROPS) {
    return fail("max-props", { message: `Max ${OBJECT_LIMITS.MAX_PROPS} props. Remove one first.` });
  }
  return { ok: true };
}

// Both prop rules, count first (same shape as checkAdd).
export function checkAddProp({ propCount, currentTriangles, newTriangles } = {}) {
  const c = checkPropCount(propCount);
  if (!c.ok) return c;
  return checkBudget(currentTriangles, newTriangles, "Adding");
}

// lo..hi in steps from the centre c (clamped into the range) outward, alternating
// sides: c, c+step, c-step, c+2 step, ... every value inside [lo, hi].
function centreOut(lo, hi, c, step) {
  const mid = Math.min(hi, Math.max(lo, c));
  const out = [mid];
  for (let k = 1; mid + k * step <= hi + 1e-9 || mid - k * step >= lo - 1e-9; k += 1) {
    if (mid + k * step <= hi + 1e-9) out.push(mid + k * step);
    if (mid - k * step >= lo - 1e-9) out.push(mid - k * step);
  }
  return out;
}

const insetBox = (b, d) => ({ min: b.min.map((v) => v - d), max: b.max.map((v) => v + d) });

// A prop's drop position. Props are anchored at their BASE CENTRE (like every
// added object), so position.y is the height of whatever they stand on.
//
//   surface  (optional) the product's cooking surface as a box
//            { min:[x,y,z], max:[x,y,z] }: the prop stands on its TOP (max y),
//            inside its x/z rectangle, in one row along the surface's long
//            axis (centred across it), starting at the CENTRE of that axis and
//            moving outward on alternating sides; when the row is full, a free
//            place anywhere on the surface, nearest its centre first. A prop
//            that fits nowhere on the surface (too big, or the surface is
//            full) falls through to the floor.
//   floor    in FRONT of the product: the product's farthest reach along the
//            front axis (frontAz: 0 = +Z, 90 = +X) plus the gap, centred on the
//            product across it, then outward row by row. `solid` boxes (the
//            product and the other added objects) are never overlapped.
//
// { solid:[box], props:[box], objectSize, floorY, frontAz?, gap?, surface? }
// -> { ok:true, position, box, where:"surface"|"floor" } | { ok:false, reason }
// Boxes strictly overlap only when they share volume: touching is allowed.
export function placeProp({ solid, props = [], objectSize, floorY, frontAz = 0, gap = OBJECT_LIMITS.PROP_GAP, surface = null } = {}) {
  if (!Array.isArray(solid) || solid.length === 0 || !solid.every(isBox)) return fail("bad-occupied");
  if (!Array.isArray(props) || !props.every(isBox)) return fail("bad-occupied");
  if (!isVec3(objectSize) || objectSize.some((v) => v < 0)) return fail("bad-size");
  if (!isNum(floorY) || !isNum(frontAz) || !isNum(gap) || gap < 0) return fail("bad-input");
  if (surface !== null && !isBox(surface)) return fail("bad-surface");
  const hx = objectSize[0] / 2;
  const hz = objectSize[2] / 2;
  const STEP = 0.01;
  const fits = (box, others, y) => {
    const probe = { min: [box.min[0], y, box.min[2]], max: [box.max[0], y + objectSize[1], box.max[2]] };
    return others.every((o) => !boxesOverlap(insetBox(o, gap / 2), insetBox(probe, gap / 2)));
  };
  const make = (x, y, z, where) => {
    const position = [x === 0 ? 0 : x, y, z === 0 ? 0 : z];
    const box = { min: [x - hx, y, z - hz], max: [x + hx, y + objectSize[1], z + hz] };
    if (![...position, ...box.min, ...box.max].every(isNum)) return null;
    return { ok: true, position, box, where };
  };
  const boxAt = (x, z) => ({ min: [x - hx, 0, z - hz], max: [x + hx, 0, z + hz] });

  if (surface) {
    const top = surface.max[1];
    const x0 = surface.min[0] + hx;
    const x1 = surface.max[0] - hx;
    const z0 = surface.min[2] + hz;
    const z1 = surface.max[2] - hz;
    if (x0 <= x1 && z0 <= z1) {
      const alongZ = surface.max[2] - surface.min[2] >= surface.max[0] - surface.min[0];
      const cx = (surface.min[0] + surface.max[0]) / 2;
      const cz = (surface.min[2] + surface.max[2]) / 2;
      const ok = (x, z) => fits(boxAt(x, z), props, top);
      // pass 1: one row along the long axis, centred across it, walking from
      // the CENTRE of the long axis outward, alternating sides (c, c+STEP,
      // c-STEP, c+2 STEP, ...), so the props gather in the middle of the grate
      if (alongZ) {
        const xc = Math.min(x1, Math.max(x0, cx));
        for (const z of centreOut(z0, z1, cz, STEP)) if (ok(xc, z)) return make(xc, top, z, "surface");
      } else {
        const zc = Math.min(z1, Math.max(z0, cz));
        for (const x of centreOut(x0, x1, cx, STEP)) if (ok(x, zc)) return make(x, top, zc, "surface");
      }
      // pass 2: anywhere on the surface, the places nearest its centre first
      const spots = [];
      for (const z of centreOut(z0, z1, cz, STEP)) for (const x of centreOut(x0, x1, cx, STEP)) spots.push([x, z]);
      spots.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz));
      for (const [x, z] of spots) if (ok(x, z)) return make(x, top, z, "surface");
    }
  }

  const az = (frontAz * Math.PI) / 180;
  const r = (v) => Math.round(v * 1e12) / 1e12;
  const sx = r(Math.cos(az));
  const sz = r(-Math.sin(az));
  const fx = r(Math.sin(az));
  const fz = r(Math.cos(az));
  // the product's reach along the front axis, and its centre across it
  let near = -Infinity;
  for (const b of solid) {
    const p = Math.max(b.min[0] * fx, b.max[0] * fx) + Math.max(b.min[2] * fz, b.max[2] * fz);
    if (p > near) near = p;
  }
  const main = solid[0];
  const mcx = (main.min[0] + main.max[0]) / 2;
  const mcz = (main.min[2] + main.max[2]) / 2;
  const across = mcx * sx + mcz * sz;
  const hf = Math.abs(fx) * hx + Math.abs(fz) * hz; // the prop's half depth along f
  const hs = Math.abs(sx) * hx + Math.abs(sz) * hz; // ... and across
  const mainReach = Math.abs(sx) * ((main.max[0] - main.min[0]) / 2) + Math.abs(sz) * ((main.max[2] - main.min[2]) / 2);
  const half = Math.max(0.4, mainReach); // a row is as wide as the product (at least 0.8 m)
  const others = [...solid, ...props];
  const lanes = [];
  for (let u = 0; u <= half - hs + 1e-9; u += STEP) {
    lanes.push(u);
    if (u > 0) lanes.push(-u);
  }
  for (let rowIdx = 0; rowIdx < 400; rowIdx += 1) {
    const v = near + gap + hf + rowIdx * STEP;
    for (const u of lanes) {
      const x = across * sx + u * sx + v * fx;
      const z = across * sz + u * sz + v * fz;
      if (fits(boxAt(x, z), others, floorY)) return make(x, floorY, z, "floor");
    }
  }
  return fail("no-room");
}

// Does an item transform stand on a surface box (its base on the top, its base
// centre inside the rectangle)?
export function standsOnSurface(t, sb) {
  if (!t || !isBox(sb)) return false;
  const eps = 0.002;
  return (
    isNum(t.x) && isNum(t.y) && isNum(t.z) &&
    Math.abs(t.y - sb.max[1]) < 1e-3 &&
    t.x >= sb.min[0] - eps && t.x <= sb.max[0] + eps &&
    t.z >= sb.min[2] - eps && t.z <= sb.max[2] + eps
  );
}

// The grill lid is open exactly while a visible prop stands on the surface.
// Derived from the layout's items, so Undo, Redo, Reset and a restored session
// all follow it without storing anything.
export function lidShouldOpen(items, sb) {
  return !!sb && Array.isArray(items) && items.some((i) => i && !i.primary && !i.hidden && isPropId(i.assetId) && standsOnSurface(i.transform, sb));
}
