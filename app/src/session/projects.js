/* Named projects: many saved studio snapshots (session/studioSession.js
   buildSnapshot / applySnapshot) in this browser, each with a small thumbnail
   of the scene. A project holds the set's layout and settings, never the
   model files themselves, so it stays small. */
import { applySnapshot, buildSnapshot } from "./studioSession";
import { getCanvas } from "../animation/animationStore";

const KEY = "sos-projects-v1";
export const MAX_PROJECTS = 30;

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    return Array.isArray(raw?.projects) ? raw.projects.filter((p) => p && p.id && p.snap) : [];
  } catch {
    return [];
  }
}

let projects = read();
let currentId = null;
let snapshot = { projects, currentId };
const listeners = new Set();

function publish() {
  snapshot = { projects, currentId };
  for (const fn of listeners) fn();
}
function persist(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ projects: next }));
  } catch {
    return false; // storage full or blocked
  }
  projects = next;
  publish();
  return true;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const getSnapshot = () => snapshot;

// a small JPEG of the stage canvas (null if it can't be read)
function thumbnail() {
  try {
    const src = getCanvas();
    if (!src || !src.width) return null;
    const w = 160;
    const h = Math.round((w * src.height) / src.width);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d").drawImage(src, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

const cleanName = (name) => (String(name || "").trim() || "Untitled set").slice(0, 60);

/** Saves the studio as a project: updates the open one, or `asNew` makes another. */
export function saveProject(name, { asNew = false } = {}) {
  const snap = buildSnapshot(cleanName(name));
  if (!snap) return { ok: false, message: "The studio is still loading." };
  const existing = !asNew && currentId ? projects.find((p) => p.id === currentId) : null;
  if (!existing && projects.length >= MAX_PROJECTS) return { ok: false, message: `At most ${MAX_PROJECTS} projects. Delete one first.` };
  const entry = { id: existing ? existing.id : `p${Date.now().toString(36)}`, name: cleanName(name), savedAt: Date.now(), thumb: thumbnail(), snap };
  const next = existing ? projects.map((p) => (p.id === existing.id ? entry : p)) : [entry, ...projects];
  if (!persist(next)) return { ok: false, message: "This browser's storage is full. Delete an old project and try again." };
  currentId = entry.id;
  publish();
  return { ok: true, message: existing ? `Saved "${entry.name}".` : `Saved new project "${entry.name}".` };
}

/** Opens a project; returns its name, or null. */
export function openProject(id) {
  const p = projects.find((x) => x.id === id);
  if (!p) return null;
  if (!applySnapshot(p.snap)) return null;
  currentId = p.id;
  publish();
  return p.name;
}

export function renameProject(id, name) {
  return persist(projects.map((p) => (p.id === id ? { ...p, name: cleanName(name), snap: { ...p.snap, projectName: cleanName(name) } } : p)));
}

export function deleteProject(id) {
  const ok = persist(projects.filter((p) => p.id !== id));
  if (ok && currentId === id) {
    currentId = null;
    publish();
  }
  return ok;
}

// Saving next creates a new project (after Reset, the studio is a new set)
export function detachCurrent() {
  currentId = null;
  publish();
}
