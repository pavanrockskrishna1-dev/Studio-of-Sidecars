/* Mission 10E (Asset Import Manager) — offline preview + framing generator.
   Uses its OWN throwaway three.js renderer/scenes (never the Studio's), so
   the engine's renderer, lighting and camera math stay untouched:
     · GLB  → 1080×1080 transparent PNG, neutral three-point studio light,
               auto-centered orbit framing from the model's bounding box,
               plus the framing metadata (bbox/center/distance/target).
     · HDRI → tone-mapped equirect JPEG backdrop for the engine's existing
               TextureLoader path + 16:9 and 1:1 gallery previews.
   Everything is disposed after each call; nothing is left bound to the GPU. */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

function makeRenderer(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  return renderer;
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("preview encode failed"))),
      type,
      quality
    );
  });
}

function parseGltf(buffer) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(buffer, "", resolve, reject);
  });
}

/** Neutral studio rig for previews — independent of the Studio lighting. */
function neutralLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 6, 5);
  const fill = new THREE.DirectionalLight(0xfff2e0, 0.9);
  fill.position.set(-6, 2, -4);
  const rim = new THREE.DirectionalLight(0xe8eeff, 1.2);
  rim.position.set(-3, 5, -7);
  scene.add(key, fill, rim);
}

/** Feature 11 — bounding box, center, orbit target and camera distance. */
export function computeFraming(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return { bbox: null, center: [0, 0, 0], radius: 1, cameraDistance: 3, orbitTarget: [0, 0, 0] };
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
  const distance = radius / Math.sin((THREE.MathUtils.degToRad(45) / 2)) * 1.15;
  return {
    bbox: {
      min: box.min.toArray().map((v) => +v.toFixed(3)),
      max: box.max.toArray().map((v) => +v.toFixed(3)),
      size: size.toArray().map((v) => +v.toFixed(3)),
    },
    center: center.toArray().map((v) => +v.toFixed(3)),
    radius: +radius.toFixed(3),
    cameraDistance: +distance.toFixed(3),
    orbitTarget: center.toArray().map((v) => +v.toFixed(3)),
  };
}

export async function renderGlbThumbnail(buffer, { size = 1080 } = {}) {
  const gltf = await parseGltf(buffer);
  const model = gltf.scene;
  const framing = computeFraming(model);
  let meshes = 0;
  let missingMaterial = 0;
  const materialSet = new Set();
  const textureSet = new Set();
  model.traverse((o) => {
    if (o.isMesh) {
      meshes += 1;
      if (!o.material) missingMaterial += 1;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        materialSet.add(m);
        ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"].forEach((k) => {
          if (m[k]) textureSet.add(m[k]);
        });
      });
    }
  });

  const scene = new THREE.Scene();
  neutralLights(scene);
  scene.add(model);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, framing.radius * 200 + 100);
  const target = new THREE.Vector3(...framing.orbitTarget);
  camera.position.copy(target).add(
    new THREE.Vector3(1, 0.55, 1).normalize().multiplyScalar(framing.cameraDistance)
  );
  camera.lookAt(target);

  const renderer = makeRenderer(size, size);
  renderer.setClearAlpha(0);
  renderer.render(scene, camera);
  const thumb = await canvasBlob(renderer.domElement, "image/png");
  renderer.dispose();
  scene.remove(model);
  model.traverse((o) => {
    if (o.isMesh) {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m?.dispose?.());
    }
  });
  return {
    thumb,
    meta: {
      ...framing,
      meshes,
      materials: materialSet.size,
      textures: textureSet.size,
      warnings: [
        ...(missingMaterial ? [`meshes without material: ${missingMaterial}`] : []),
        ...(textureSet.size === 0 && materialSet.size > 0 ? ["no textures referenced"] : []),
      ],
    },
  };
}

function loadHdri(buffer, kind) {
  const loader = kind === "exr" ? new EXRLoader() : new RGBELoader();
  const parsed = loader.parse(buffer);
  const tex = new THREE.DataTexture(parsed.data, parsed.width, parsed.height);
  tex.format = parsed.format ?? THREE.RGBAFormat;
  tex.type = parsed.type ?? THREE.HalfFloatType;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Equirect HDRI → engine backdrop JPEG + 16:9 and 1:1 gallery previews. */
export async function renderHdriPreviews(buffer, kind) {
  const tex = loadHdri(buffer, kind);
  const ratio = tex.image.width / Math.max(1, tex.image.height);
  const W = 1600;
  const H = Math.round(W / ratio);
  const renderer = makeRenderer(W, H);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: true });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(quad);
  renderer.render(scene, cam);

  const pano = document.createElement("canvas");
  pano.width = W;
  pano.height = H;
  pano.getContext("2d").drawImage(renderer.domElement, 0, 0);
  renderer.dispose();
  mat.dispose();
  quad.geometry.dispose();
  tex.dispose();

  const crop = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const sx = (W - w) / 2;
    const sy = (H - h) / 2;
    c.getContext("2d").drawImage(pano, sx, sy, w, h, 0, 0, w, h);
    return c;
  };
  const wideH = Math.round((W * 9) / 16);
  const sq = Math.min(W, H);
  const [backdrop, thumbWide, thumb] = await Promise.all([
    canvasBlob(pano, "image/jpeg", 0.9),
    canvasBlob(crop(W, Math.min(wideH, H)), "image/png"),
    canvasBlob(crop(sq, sq), "image/png"),
  ]);
  return { backdrop, thumbWide, thumb, ratio: +ratio.toFixed(3), width: tex.image?.width || W, height: tex.image?.height || H };
}
