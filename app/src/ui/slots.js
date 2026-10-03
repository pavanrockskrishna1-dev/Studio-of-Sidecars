/* ==========================================================================
   Slice U1, Stage B1 — named slots for moving real controls into dock sheets
   --------------------------------------------------------------------------
   Generalises ui/lightSlot.js: a dock sheet registers a DOM node under a
   name while it is mounted, and StudioControls renders the matching control
   group into that node through a React portal (so there is still exactly one
   instance of every control, with its state and handlers untouched), falling
   back to its original place when no sheet has claimed the slot.
   ========================================================================== */

const slots = new Map();
const refs = new Map();
const listeners = new Set();

function setSlot(name, el) {
  if (el) slots.set(name, el);
  else slots.delete(name);
  listeners.forEach((fn) => fn());
}

export function getSlot(name) {
  return slots.get(name) || null;
}

export function subscribeSlots(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** A stable ref callback per slot name (an inline arrow would churn every render). */
export function slotRef(name) {
  let cb = refs.get(name);
  if (!cb) {
    cb = (el) => setSlot(name, el);
    refs.set(name, cb);
  }
  return cb;
}
