import * as THREE from "three";

// Shared texture cache — one instance per pattern name across all meshes.
const _cache = new Map();
const _loader = new THREE.TextureLoader();

/**
 * Returns a cached THREE.Texture for the given pattern name.
 * Patterns are loaded from /textures/<name>.png (or .jpg).
 * Returns null for unknown or empty names.
 */
export function materialTexture(name) {
  if (!name) return null;
  if (_cache.has(name)) return _cache.get(name);
  const tex = _loader.load(`/textures/${name}.png`);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.sosPattern = name;
  _cache.set(name, tex);
  return tex;
}

export function clearTextureCache() {
  for (const tex of _cache.values()) tex.dispose();
  _cache.clear();
}
