import * as THREE from "three";
import { GROUND_SURFACES, textureBase } from "./groundSurfaces.js";

// Shared colour/normal/roughness texture set per ground surface - one load
// per surface id across every mount (switching Day/Night/studio or placing
// a new stage never re-fetches a surface already used this session).
const _cache = new Map();
const _loader = new THREE.TextureLoader();

function load(url, { srgb = false } = {}) {
  const tex = _loader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** { color, normal, roughness } textures for a textured ground surface, or null for "soil". */
export function groundTextureSet(id) {
  const def = GROUND_SURFACES[id];
  if (!def || !def.textured) return null;
  if (_cache.has(id)) return _cache.get(id);
  const base = textureBase(id);
  const set = {
    color: load(`${base}color.jpg`, { srgb: true }),
    normal: load(`${base}normal.jpg`),
    roughness: load(`${base}roughness.jpg`),
  };
  _cache.set(id, set);
  return set;
}

// Sets the repeat on an already-loaded texture set for a ground disc of the
// given radius, so the tiling matches the surface's real-world tile size
// (groundSurfaces.js tileMeters) however large the stage's ground is.
export function setGroundRepeat(set, id, radiusMeters) {
  const def = GROUND_SURFACES[id];
  if (!set || !def || !def.tileMeters) return;
  const tiles = Math.max(1, Math.round((radiusMeters * 2) / def.tileMeters));
  for (const tex of Object.values(set)) tex.repeat.set(tiles, tiles);
}

export function clearGroundTextureCache() {
  for (const set of _cache.values()) {
    for (const tex of Object.values(set)) tex.dispose();
  }
  _cache.clear();
}
