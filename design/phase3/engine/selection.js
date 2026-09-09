/* ENGINE · selection.js — Phase 3. Tap-to-select parts, hover cue, accent outline. */
import * as THREE from 'three';

export function init(engine) {
  engine.selectedPart = null;
  engine.selectedModel = null;
  engine.raycaster = new THREE.Raycaster();
  engine.pointer = new THREE.Vector2();
  engine._lastSel = null;
  engine._hover = null;

  engine.canvas.addEventListener('pointerdown', e => {
    const r = engine.canvas.getBoundingClientRect();
    engine._downX = e.clientX; engine._downY = e.clientY;
  });
  engine.canvas.addEventListener('pointerup', e => {
    if (!engine.models.length) return;
    const dx = Math.abs(e.clientX - (engine._downX || 0));
    const dy = Math.abs(e.clientY - (engine._downY || 0));
    if (dx + dy > 6) return; // was a drag, not a tap
    pick(engine, e);
  });
  engine.canvas.addEventListener('pointermove', e => { hover(engine, e); });
  return { pick, selectPart, selectModel, clear, showOutline };
}

function toNDC(engine, e) {
  const r = engine.canvas.getBoundingClientRect();
  engine.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  engine.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

export function pick(engine, e) {
  toNDC(engine, e);
  engine.raycaster.setFromCamera(engine.pointer, engine.camera);
  const hits = engine.raycaster.intersectObjects(engine.world.children, true);
  const hit = hits.find(h => h.object.isMesh && h.object.userData.partId);
  if (hit) {
    const part = engine.parts && engine.parts.find(p => p.id === hit.object.userData.partId);
    selectPart(engine, part || null, hit.object);
  } else {
    // empty stage tap -> nothing selected (keeps product focus)
    selectPart(engine, null, null);
  }
}

export function selectPart(engine, part, mesh) {
  if (engine._lastSel === (part ? part.id : null)) { return; }
  restoreHighlight(engine);
  engine.selectedPart = part;
  engine.selectedModel = part ? part.model : null;
  engine._lastSel = part ? part.id : null;
  if (part) { engine._lastSelMesh = mesh || part.mesh; applyHighlight(engine, mesh || part.mesh, true); }
  engine.bus && engine.bus.emit('select', part ? { part } : null);
  engine.bus && engine.bus.emit('selection-changed');
}

export function selectModel(engine, model) {
  selectPart(engine, null, null);
  engine.selectedModel = model || null;
  engine.bus && engine.bus.emit('select-model', model);
}

function hover(engine, e) {
  if (!engine.models.length) return;
  toNDC(engine, e);
  engine.raycaster.setFromCamera(engine.pointer, engine.camera);
  const hits = engine.raycaster.intersectObjects(engine.world.children, true);
  const m = hits.find(h => h.object.isMesh && h.object.userData.partId);
  if (m && (!engine.selectedPart || m.object.userData.partId !== engine.selectedPart.id)) {
    if (engine._hover && engine._hover !== m.object) restoreHover(engine, engine._hover);
    engine._hover = m.object;
    bump(m.object, 0x9ec2ff, 0.08);
    engine.canvas.style.cursor = 'pointer';
  } else {
    if (engine._hover) { restoreHover(engine, engine._hover); engine._hover = null; }
    engine.canvas.style.cursor = 'grab';
  }
}

function bump(mesh, color, k) {
  const m = mesh.material;
  const mats = Array.isArray(m) ? m : [m];
  mats.forEach(x => { if (!x.emissive) return; x.emissive = new THREE.Color(color).multiplyScalar(k); x.needsUpdate = true; });
}
function applyHighlight(engine, mesh, on) {
  const selColor = new THREE.Color(0x6aa5ff);
  bumpSel(engine, mesh, selColor.multiplyScalar(0.5), true);
}
function bumpSel(engine, mesh, color, strong) {
  const m = mesh.material;
  const mats = Array.isArray(m) ? m : [m];
  mats.forEach(x => { if (!x.emissive) return; x.emissive = color.clone(); x.needsUpdate = true; });
}
function restoreHover(engine, mesh) {
  const m = mesh.material;
  const mats = Array.isArray(m) ? m : [m];
  mats.forEach(x => { if (!x.emissive) return; x.emissive.setRGB(0, 0, 0); x.needsUpdate = true; });
}
function restoreHighlight(engine) {
  if (engine._lastSelMesh) {
    // restore emissive to base (0 unless the finish kept none)
    const m = engine._lastSelMesh.material;
    const mats = Array.isArray(m) ? m : [m];
    mats.forEach(x => { if (x.emissive) { x.emissive.setRGB(0, 0, 0); x.needsUpdate = true; } });
  }
  engine._lastSelMesh = null;
  removeOutline(engine);
}

/* Soft selection ring on the floor beneath the selected model. */
export function showOutline(engine, model, on) {
  let ring = engine._selRing;
  if (!ring) {
    const g = new THREE.RingGeometry(0.72, 0.78, 96).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x6aa5ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    ring = new THREE.Mesh(g, mat);
    ring.renderOrder = 2;
    engine._selRing = ring;
    engine.floorHolder.add(ring);
  }
  if (on && model) {
    ring.visible = true;
    // widen to match model footprint
    const b = new THREE.Box3().setFromObject(model.root);
    const s = Math.max(b.getSize(new THREE.Vector3()).x, b.getSize(new THREE.Vector3()).z) * 0.62 + 0.15;
    ring.scale.setScalar(Math.max(s, 0.6));
    ring.position.y = 0.012;
  } else { ring.visible = false; }
}
function removeOutline(engine) { if (engine._selRing) engine._selRing.visible = false; }

export function clear(engine) {
  restoreHighlight(engine);
  engine.selectedPart = null; engine.selectedModel = null; engine._lastSel = null;
  engine.bus && engine.bus.emit('selection-changed');
}
