import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// Isolated manager keeps thumbnail loads out of drei's useProgress so the
// full-screen LoadingScreen never fires for prop thumbnails.
const thumbLoadingManager = new THREE.LoadingManager();

// Shared off-screen renderer — created lazily on first requestThumb call.
let renderer = null;
let camera = null;
let scene = null;

function ensureRenderer() {
  if (renderer) return;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.setClearColor(0x111111, 1);
  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  scene = new THREE.Scene();
}

let cache = {};
const queue = [];
let running = false;
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSnapshot = () => cache;

function notify() {
  for (const fn of listeners) fn();
}

export function requestThumb(id, modelPath) {
  if (cache[id]) return cache[id];
  if (!queue.some((q) => q.id === id)) {
    queue.push({ id, modelPath });
    if (!running) processQueue();
  }
  return null;
}

function processQueue() {
  if (!queue.length) { running = false; return; }
  ensureRenderer();
  running = true;
  const { id, modelPath } = queue.shift();

  const dracoLoader = new DRACOLoader(thumbLoadingManager);
  dracoLoader.setDecoderPath("/draco/");
  const gltfLoader = new GLTFLoader(thumbLoadingManager);
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      const box = new THREE.Box3().setFromObject(model);
      const centre = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();

      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
        mixer.update(0);
      }

      const cx = centre.x, cy = centre.y, cz = centre.z;
      camera.position.set(cx + size * 0.9, cy + size * 0.5, cz + size * 1.1);
      camera.lookAt(centre);
      camera.near = size * 0.01;
      camera.far = size * 10;
      camera.updateProjectionMatrix();

      const ambient = new THREE.AmbientLight(0xffffff, 1.2);
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
      dirLight.position.set(3, 5, 4);
      scene.add(ambient);
      scene.add(dirLight);

      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL("image/jpeg", 0.85);
      cache = { ...cache, [id]: dataUrl };

      // Clean up model
      scene.remove(model);
      model.traverse((obj) => {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      });

      // Clean up lights
      scene.remove(ambient);
      scene.remove(dirLight);

      dracoLoader.dispose();

      notify();
      setTimeout(() => {
        if (queue.length) processQueue();
        else running = false;
      }, 20);
    },
    undefined,
    () => {
      dracoLoader.dispose();
      setTimeout(() => {
        if (queue.length) processQueue();
        else running = false;
      }, 20);
    },
  );
}
