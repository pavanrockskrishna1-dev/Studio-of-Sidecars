/* Mission 11A (Agent #2) — live material application. UI-side, imperative.
   ---------------------------------------------------------------------------
   Everything here writes material STATE onto objects the renderer is already
   showing. Three rules shape it, each answering a hard requirement:

   · The material the GLTF loader produced is never mutated while an upgrade is
     possible. When a preset needs a capability the built-in material lacks
     (clearcoat, transmission) a MeshPhysicalMaterial that COPIES it is created
     and re-assigned to the sharing meshes, and the pristine instance is held on
     the entry. "Restore original imported material" is therefore a literal
     re-assignment plus a value write-back, not a reconstruction.
   · No renderer recreation: geometry, camera, lights, shadow maps and the canvas
     element are untouched; only `mesh.material` and material parameters change.
   · No texture duplication: textures come from the shared cache in textures.js
     and are assigned, never cloned — and only the editor's own created material
     is ever disposed.

   The module keeps no state of its own: the truth is the material, read back
   after every write. That is what lets the sliders live without an Apply button. */

import * as THREE from "three";
import { materialTexture } from "./textures";

// The parameter set the editor owns. Anything outside it (vertex colors, side,
// blending, UV transforms) is left exactly as the asset shipped it.
const SCALARS = [
  "metalness",
  "roughness",
  "envMapIntensity",
  "opacity",
  "transparent",
  "clearcoat",
  "clearcoatRoughness",
  "transmission",
  "ior",
  "thickness",
  "flatShading",
];
const TEXTURES = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"];

// What survives a reload: the look, not the render flags an asset needs to
// display its own maps correctly.
const PERSISTED = ["color", "metalness", "roughness", "envMapIntensity", "opacity", "transparent", "clearcoat", "clearcoatRoughness", "transmission", "ior", "thickness", "texture"];

const hexOf = (c) => (c && c.isColor ? `#${c.getHexString()}` : "#ffffff");

/** Every material the model actually renders, grouped the way an artist counts
 *  them: one entry per material, with how many meshes share it. */
export function materialGroups(root) {
  const out = [];
  const byId = new Map();
  if (!root) return out;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.visible || !obj.material) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of list) {
      if (!mat) continue;
      if (!byId.has(mat.uuid)) {
        const entry = {
          id: mat.uuid,
          name: (mat.name || "").trim() || labelFromMeshName(obj.name) || `Material ${out.length + 1}`,
          meshNames: [],
          meshCount: 0,
          currentMaterial: mat,
          originalMaterial: mat,
          snapshot: captureMaterial(mat),
          upgraded: false,
        };
        byId.set(mat.uuid, entry);
        out.push(entry);
      }
      const entry = byId.get(mat.uuid);
      if (obj.name && entry.meshNames.length < 8 && !entry.meshNames.includes(obj.name)) entry.meshNames.push(obj.name);
      entry.meshCount += 1;
    }
  });
  return dedupeLabels(out);
}

/** Two GLTF assets in this studio ship several materials with the same name
 *  ("Mesh"), so a bare name would render as four indistinguishable rows. Keep
 *  the name and append the mesh it belongs to — the row still reads as the
 *  asset's own vocabulary, but it is selectable and sayable. */
function dedupeLabels(entries) {
  const counts = new Map();
  for (const e of entries) counts.set(e.name, (counts.get(e.name) || 0) + 1);
  if ([...counts.values()].every((n) => n === 1)) return entries;
  const seen = new Map();
  for (const e of entries) {
    if (counts.get(e.name) === 1) continue;
    const i = (seen.get(e.name) || 0) + 1;
    seen.set(e.name, i);
    const from = e.meshNames && e.meshNames[0] ? ` · ${e.meshNames[0]}` : ` ${i}`;
    e.name = `${e.name}${from}`;
  }
  return entries;
}

function labelFromMeshName(name) {
  const n = String(name || "")
    .replace(/(Mesh|Object|Node)\s*$/i, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s*\d+\s*$/, "")
    .trim();
  if (!n) return "";
  return n
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");
}

/** The editable parameter set, read off a live material. */
export function readMaterial(mat) {
  const out = { color: "#ffffff", texture: null };
  if (!mat) return out;
  out.color = hexOf(mat.color);
  for (const k of SCALARS) if (typeof mat[k] === "number" || typeof mat[k] === "boolean") out[k] = mat[k];
  if (typeof mat.opacity !== "number") out.opacity = 1;
  if (typeof mat.transparent !== "boolean") out.transparent = false;
  // identity only, never pixels: a preset that assigns a cached texture writes
  // this same instance onto every material that asks for it.
  out.texture = mat.map && mat.map.userData && mat.map.userData.sosPattern ? mat.map.userData.sosPattern : null;
  return out;
}

/** Value snapshot for reset / undo, texture references included. */
export function captureMaterial(mat) {
  const snap = { color: hexOf(mat.color), textures: {} };
  for (const k of SCALARS) if (k in mat) snap[k] = mat[k];
  for (const k of TEXTURES) if (k in mat && mat[k]) snap.textures[k] = mat[k];
  return snap;
}

const meshesUsing = (root, material) => {
  const hits = [];
  if (!root || !material) return hits;
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    if (list.some((m) => m && m.uuid === material.uuid)) hits.push(o);
  });
  return hits;
};

/** A preset asking for clearcoat or transmission needs a physical material.
 *  Upgrade by copying — the source instance is left untouched and remembered. */
function ensurePhysical(entry, root, params) {
  const mat = entry.currentMaterial;
  const wants = typeof params.clearcoat === "number" || (typeof params.transmission === "number" && params.transmission > 0);
  if (!wants || mat.isMeshPhysicalMaterial || mat.isMeshPhysicalNodeMaterial) return;
  const next = new THREE.MeshPhysicalMaterial();
  next.name = mat.name;
  for (const k of SCALARS) if (k in mat) next[k] = mat[k];
  for (const k of TEXTURES) if (k in mat) next[k] = mat[k];
  if (mat.color && next.color) next.color.copy(mat.color);
  next.needsUpdate = true;
  for (const mesh of meshesUsing(root, mat)) {
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((m) => (m && m.uuid === mat.uuid ? next : m))
      : next;
  }
  entry.currentMaterial = next;
  entry.upgraded = true;
}

function writeParams(mat, params) {
  let dirty = false;
  if (typeof params.color === "string" && mat.color) mat.color.set(params.color);
  for (const k of SCALARS) {
    if (!(k in mat) || params[k] === undefined || params[k] === null) continue;
    if (mat[k] !== params[k]) {
      mat[k] = params[k];
      if (k === "transparent" || k === "flatShading") dirty = true;
    }
  }
  // sub-1 opacity only reads as glass once blending is on, so the two travel
  // together rather than leaving a half-applied material behind
  if (typeof params.opacity === "number" && params.opacity < 1 && mat.transparent !== true) {
    mat.transparent = true;
    dirty = true;
  }
  if ("map" in mat && params.texture !== undefined) {
    const tex = params.texture ? materialTexture(params.texture) : null;
    if (tex) tex.userData.sosPattern = params.texture;
    if ((mat.map || null) !== (tex || null)) {
      mat.map = tex || null;
      dirty = true;
    }
  }
  if (dirty) mat.needsUpdate = true;
}

/**
 * Apply one parameter patch to every mesh sharing this material.
 * @returns {boolean} whether a material instance had to be created (upgrade).
 */
export function applyParams(entry, root, params) {
  if (!entry || !entry.currentMaterial) return false;
  const before = entry.upgraded;
  ensurePhysical(entry, root, params);
  writeParams(entry.currentMaterial, params);
  return !before && entry.upgraded;
}

/** Put the imported material back exactly as the loader produced it. */
export function restoreEntry(entry, root) {
  if (!entry || !entry.originalMaterial) return false;
  if (entry.upgraded && entry.currentMaterial !== entry.originalMaterial) {
    for (const mesh of meshesUsing(root, entry.currentMaterial)) {
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => (m && m.uuid === entry.currentMaterial.uuid ? entry.originalMaterial : m))
        : entry.originalMaterial;
    }
    // only ever the instance this module created — the asset's own material is
    // shared with the loader cache and must outlive the edit
    if (typeof entry.currentMaterial.dispose === "function") entry.currentMaterial.dispose();
    entry.currentMaterial = entry.originalMaterial;
    entry.upgraded = false;
  }
  const mat = entry.originalMaterial;
  const snap = entry.snapshot || {};
  if (mat.color && snap.color) mat.color.set(snap.color);
  for (const k of SCALARS) if (k in snap) mat[k] = snap[k];
  for (const k of TEXTURES) if (k in mat) mat[k] = snap.textures[k] || null;
  mat.needsUpdate = true;
  return true;
}

/** Is this entry different from its imported state? Drives the "edited" dot. */
export function isEdited(entry) {
  if (!entry || !entry.currentMaterial || !entry.snapshot) return false;
  const now = readMaterial(entry.currentMaterial);
  const snap = entry.snapshot;
  if (now.color !== snap.color) return true;
  for (const k of SCALARS) {
    if (typeof snap[k] === "number" && Math.abs((now[k] ?? 0) - snap[k]) > 0.001) return true;
    if (typeof snap[k] === "boolean" && Boolean(now[k]) !== Boolean(snap[k])) return true;
  }
  // texture identity, not texture name: an asset that ships its own baseColour
  // texture is untouched only while the very same instance is still assigned
  const cur = entry.currentMaterial.map || null;
  const orig = (snap.textures && snap.textures.map) || null;
  return cur !== orig;
}

/** The subset of parameters worth writing to disk. */
export function persistable(entry) {
  const now = readMaterial(entry.currentMaterial);
  const out = {};
  for (const k of PERSISTED) if (now[k] !== undefined && now[k] !== null) out[k] = now[k];
  return out;
}

export { PERSISTED as PERSISTED_KEYS, SCALARS as EDITABLE_KEYS };
