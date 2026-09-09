/* ENGINE · assets.js — Phase 3. GLB loader, demo catalog, import, multi-model scene. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { addModelHost, removeModel } from './scene.js';
import { indexParts } from './materials.js';
import { CFG } from './config.js';

export function init(engine) {
  engine.assets = { loader: new GLTFLoader(), ready: false };
}

export function loadModel(engine, url, opts = {}) {
  engine.bus && engine.bus.emit('asset-load-start', url);
  return new Promise((res, rej) => {
    engine.assets.loader.load(url, gltf => {
      const root = gltf.scene;
      let mixer = null;
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(root);
        const anim = mixer.clipAction(gltf.animations[0]);
        anim.play();
      }
      const entry = addModelHost(engine, root, { url, isDemo: opts.isDemo, isSecondary: opts.isSecondary, animMixer: mixer });
      indexParts(engine);
      engine.assets.ready = true;
      engine.bus && engine.bus.emit('asset-loaded', { url, entry });
      res(entry);
    }, undefined, err => { console.warn('load failed', url, err); engine.bus && engine.bus.emit('asset-load-error', url); rej(err); });
  });
}

export function importFile(engine, file) {
  const url = URL.createObjectURL(file);
  return loadModel(engine, url, { imported: true }).then(e => { e.objectURL = url; return e; });
}

export function remove(engine, entry) {
  if (entry && entry.objectURL) URL.revokeObjectURL(entry.objectURL);
  removeModel(engine, entry);
}

export function clearAll(engine) {
  engine.models.forEach(m => { if (m.objectURL) URL.revokeObjectURL(m.objectURL); });
  engine.models.length = 0;
  engine.world.clear();
  engine.bus && engine.bus.emit('scene-changed');
}

export function loadDemo(engine) {
  return Promise.all([
    loadModel(engine, CFG.model.path, { isDemo: true }).catch(() => null),
    loadModel(engine, CFG.model.secondary, { isSecondary: true }).catch(() => null),
  ]);
}
