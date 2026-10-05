/* ==========================================================================
   Slice U2 - which Reel sheet section is open (new file, UI ONLY)
   --------------------------------------------------------------------------
   The Reel sheet has four collapsible sections (Shots, Keys, Cycles, Export);
   only ONE is open at a time (opening one closes the others, clicking the open
   one closes it, so "none" is a state too). The choice is remembered for the
   session: it is held here at module level (the sheet itself unmounts when it
   is closed) and mirrored to sessionStorage, which keeps it across a reload of
   the tab. Every storage access is guarded: without storage the choice still
   holds for this page. Default: Shots.
   ========================================================================== */

export const REEL_SECTIONS = Object.freeze(["shots", "keys", "cycles", "export"]);
const STORAGE_KEY = "sos-reel-section";

function readStored() {
  try {
    const v = window.sessionStorage.getItem(STORAGE_KEY);
    if (v === "none" || REEL_SECTIONS.includes(v)) return v;
  } catch {
    /* storage unavailable: use the default */
  }
  return "shots";
}

let openSection = typeof window === "undefined" ? "shots" : readStored();
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSnapshot = () => openSection;

export function setOpenSection(id) {
  const next = id === "none" || REEL_SECTIONS.includes(id) ? id : "shots";
  if (next === openSection) return;
  openSection = next;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable: the choice still holds for this page */
  }
  for (const fn of listeners) fn();
}

// Opening a section closes the others; clicking the open one closes it.
export const toggleSection = (id) => setOpenSection(openSection === id ? "none" : id);
