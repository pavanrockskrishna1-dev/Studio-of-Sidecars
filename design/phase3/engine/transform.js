/* ENGINE · transform.js — Phase 3. Object editor: move/rotate/scale/dup/hide/lock/delete/reset. */
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { removeModel, computeBounds } from './scene.js';
import { loadModel } from './assets.js';

export function init(engine) {
  engine.transformMode = null;
  engine.locked = false;
  const tc = new TransformControls(engine.camera, engine.canvas);
  tc.addEventListener('dragging-changed', e => { engine.controls.enabled = !e.value; });
  tc.addEventListener('change', () => { engine.ui && engine.ui.stats(); });
  tc.addEventListener('objectChange', () => { engine.ui && engine.ui.stats(); });
  tc.addEventListener('mouseDown', () => { engine._drag = true; });
  tc.addEventListener('mouseUp', () => {
    if (engine._drag) { engine.bus && engine.bus.emit('transform-end'); engine._drag = false; }
  });
  const helper = tc.getHelper();
  helper.visible = false;
  helper.traverse(o => { o.renderOrder = 999; });
  engine.scene.add(helper);
  engine.tc = tc;
  engine.tcHelper = helper;
  engine.setTransformMode = m => setMode(engine, m);
  tc.setSize(0.7);
  attachToSelection(engine);
  engine.bus.on('select-model', () => attachToSelection(engine));
  return { setMode, applyModeToModel };
}

function attachToSelection(engine) {
  const m = engine.selectedModel;
  const active = !!(m && engine.transformMode && !m.locked);
  if (active) engine.tc.attach(m.root);
  else engine.tc.detach();
  if (engine.tcHelper) engine.tcHelper.visible = active;
}

export function setMode(engine, mode) { // 'translate' | 'rotate' | 'scale' | null
  engine.transformMode = mode;
  if (mode) engine.tc.setMode(mode);
  attachToSelection(engine);
  engine.bus && engine.bus.emit('transform-mode', mode);
}

export function applyModeToModel(engine, model, mode) {
  if (!model || model.locked) return;
  engine.selectedModel = model;
  setMode(engine, mode);
}

export function duplicate(engine, model) {
  if (!model) return null;
  if (model.locked) return null;
  const url = model.url;
  const cur = model;
  // reuse loaded objectURL source
  return importModel(engine, url, { isCopy: true, src: model })
    .then(e => {
      // nudge so the copy is visible beside original
      const off = new THREE.Vector3(0.7, 0, 0.7);
      e.root.position.add(off);
      return e;
    }).catch(() => null);
}

async function importModel(engine, url, o) { return loadModel(engine, url, o); }

export function hide(engine, model) {
  if (!model || model.locked) return;
  model.root.visible = false;
  engine.bus && engine.bus.emit('scene-changed');
}
export function show(engine, model) { if (model) { model.root.visible = true; engine.bus && engine.bus.emit('scene-changed'); } }
export function toggleHidden(engine, model) {
  if (!model) return;
  if (model.locked) return;
  model.root.visible ? hide(engine, model) : show(engine, model);
}
export function setLock(engine, model, on) {
  if (!model) return; model.locked = on;
  if (on) engine.tc.detach();
  engine.bus && engine.bus.emit('scene-changed');
}
export function remove(engine, model) {
  if (!model || model.isDemo) return; // protect the primary demo model
  removeModel(engine, model);
  if (engine.selectedModel === model) { engine.selectedModel = null; engine.tc.detach(); }
  computeBounds(engine);
}
export function reset(engine, model) {
  if (!model || model.locked) return;
  model.root.position.set(0, 0, 0);
  model.root.quaternion.identity();
  model.root.scale.setScalar(1);
  // re-sit onto floor via scene helper
  const b = new THREE.Box3().setFromObject(model.root);
  model.root.position.y -= b.min.y;
  computeBounds(engine);
  engine.bus && engine.bus.emit('transform-end');
}
