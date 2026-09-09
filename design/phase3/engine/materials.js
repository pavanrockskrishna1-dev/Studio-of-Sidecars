/* ENGINE · materials.js — Phase 3. Index model parts -> editable materials + quick finishes. */
import * as THREE from 'three';
import { MAT_FINISHES } from './config.js';

/* Walk loaded meshes and build a part registry keyed by material instance. */
export function indexParts(engine) {
  engine.parts = [];
  engine.models.forEach(m => {
    const overrides = engine.matOverrides || {};
    m.root.traverse(o => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((mat, mi) => {
        if (!mat) return;
        // unique name per clone-group: keep stable across reloads for overrides
        const nm = mat.name || o.name || ('part-' + mi);
        const id = `${m.url}::${nm}::${o.uuid}`;
        const key = `${m.url}::${nm}`;
        const ov = overrides[key];
        if (ov) applyParams(mat, ov);
        o.userData.partId = id;
        o.userData.partKey = key;
        engine.parts.push({
          id, key, name: pretty(nm), mat, mesh: o, model: m,
          color: mat.color ? '#' + mat.color.getHexString() : '#888',
          rough: mat.roughness, metal: mat.metalness, op: mat.opacity,
        });
      });
    });
  });
  engine.bus && engine.bus.emit('parts', engine.parts);
  return engine.parts;
}

function pretty(n) {
  return n.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim() || 'Part';
}

function applyParams(mat, p) {
  if (p.color != null) { mat.color = new THREE.Color(p.color); }
  if (p.rough != null) mat.roughness = p.rough;
  if (p.metal != null) mat.metalness = p.metal;
  if (p.op != null) mat.opacity = p.op;
  mat.transparent = (mat.opacity < 1);
  mat.needsUpdate = true;
}

export function partById(engine, id) { return engine.parts.find(p => p.id === id); }

export function setPartOverride(engine, part, params) {
  engine.matOverrides = engine.matOverrides || {};
  engine.matOverrides[part.key] = { ...(engine.matOverrides[part.key] || {}), ...params };
  applyParams(part.mat, params);
  engine.bus && engine.bus.emit('material-change', part.id);
}

/* Quick finishes tray: mutate the currently selected part (or first part fallback). */
export function applyFinish(engine, label) {
  const f = MAT_FINISHES[label];
  if (!f) return;
  const part = engine.selectedPart || engine.parts[0];
  if (!part) return false;
  setPartOverride(engine, part, { color: f.color, rough: f.rough, metal: f.metal, op: f.op });
  return true;
}

export function resetPart(engine, part) {
  if (!part) return;
  delete engine.matOverrides[part.key];
  // best-effort restore defaults: standard values
  applyParams(part.mat, { color: 0xcfd6dd, rough: 0.45, metal: 0.0, op: 1 });
  engine.bus && engine.bus.emit('material-change', part.id);
}
