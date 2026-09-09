/* ENGINE · scene.js — Phase 3. Scene graph, world group, ground/floor, model hosts. */
import * as THREE from 'three';
import { FLOORS } from './config.js';

export function init(engine) {
  const scene = new THREE.Scene();
  const world = new THREE.Group();      // product + duplicate hosts
  const floorHolder = new THREE.Group(); // reflection floor
  scene.add(floorHolder);
  scene.add(world);
  engine.scene = scene;
  engine.world = world;
  engine.floorHolder = floorHolder;
  engine.models = [];                  // {root,url,bbox,parts,isDemo,animMixer}
  engine.floor = { preset: 'White Studio' };
  buildFloor(engine, 'White Studio');
  engine.floorMeshes = {};
  return { scene, world, buildFloor, addModelHost, removeModel, clearModels };
}

export function buildFloor(engine, presetKey) {
  const p = FLOORS[presetKey];
  if (!p) return;
  engine.floorHolder.clear();
  const geo = new THREE.CircleGeometry(40, 128).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhysicalMaterial({
    color: p.color, metalness: p.metal, roughness: p.rough,
    envMapIntensity: p.env, clearcoat: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.02;
  mesh.receiveShadow = true;
  engine.floorHolder.add(mesh);
  engine.floorMesh = mesh;
  engine.floorMaterial = mat;
  engine.floor.preset = presetKey;
  // keep a gentle rim-contact glow ring when the preset is very glossy
  if (p.dark) {
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 6.2, 96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.02, side: THREE.DoubleSide })
    );
    rim.position.y = -0.015;
    engine.floorHolder.add(rim);
  }
  // emit event so lighting/env can adapt
  if (engine.bus) engine.bus.emit('floor', presetKey);
}

/* Add a fully-loaded model root to the stage, auto-fit onto the platform. */
export function addModelHost(engine, root, meta) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  // center horizontally, sit on floor (y=0)
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  // normalize to ~2.2 unit footprint
  const s = 2.2 / Math.max(maxDim, 0.0001);
  root.scale.setScalar(s);
  engine.world.add(root);
  const entry = { root, url: meta.url, isDemo: !!meta.isDemo, isSecondary: !!meta.isSecondary,
                  animMixer: meta.animMixer || null, size: maxDim };
  engine.models.push(entry);
  // fit all hosts together
  fitCameraToModels(engine);
  return entry;
}

export function removeModel(engine, entry) {
  engine.world.remove(entry.root);
  const i = engine.models.indexOf(entry);
  if (i >= 0) engine.models.splice(i, 1);
  disposeObject(entry.root);
  engine.bus && engine.bus.emit('scene-changed');
}

export function clearModels(engine) {
  [...engine.models].forEach(m => { engine.world.remove(m.root); disposeObject(m.root); });
  engine.models.length = 0;
}

export function disposeObject(obj) {
  obj.traverse(n => {
    if (n.isMesh) {
      n.geometry && n.geometry.dispose && n.geometry.dispose();
      const m = n.material;
      if (m) { (Array.isArray(m) ? m : [m]).forEach(x => x && x.dispose && x.dispose()); }
    }
    if (n.isLight) { n.dispose && n.dispose(); }
  });
}

export function computeBounds(engine) {
  if (!engine.models.length) {
    const box = new THREE.Box3(new THREE.Vector3(-1.1, 0, -1.1), new THREE.Vector3(1.1, 1.4, 1.1));
    return { center: box.getCenter(new THREE.Vector3()), radius: 1.8 };
  }
  const b = new THREE.Box3();
  engine.models.forEach(m => b.expandByObject(m.root));
  const center = b.getCenter(new THREE.Vector3());
  const radius = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 0.6);
  return { center, radius };
}

export function fitCameraToModels(engine) {
  engine.bounds = computeBounds(engine);
  engine.bus && engine.bus.emit('fit');
}

export function tickMixers(engine, dt) {
  engine.models.forEach(m => { if (m.animMixer) m.animMixer.update(dt); });
}
