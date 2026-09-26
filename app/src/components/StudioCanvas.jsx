import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { PRODUCTS } from "../products/registry";
import { ENVIRONMENTS } from "../environments/registry";
import SelectionInspector from "./SelectionInspector";
import { computeCameraShot, fitDistance, getBaseline, getCameraPreset } from "../camera/presets";
import * as cameraStudio from "../camera/cameraStudio";
import { DEFAULT_LIGHTING } from "../lighting/profiles";
import { computeExportSize, REEL_EXPORT, usesReelFraming } from "../capture/exportOptions";
import { platformReelPose, reelPose, sampleAt } from "../animation/path";
import * as animation from "../animation/animationStore";
import * as garageStore from "../garage/garageStore";
import * as garageMode from "../garage/garageMode";
import { buildPartIndex } from "../garage/partTree";
import { applyPartOverride, resetToBase } from "../garage/compose";
import { unionBounds, floorYFor } from "../garage/bounds";
import * as sceneObjects from "../garage/sceneObjects";
import * as layoutLibrary from "../garage/layoutLibrary";
import * as gizmo from "../garage/gizmo";
import * as measure from "../garage/measure";
import { backdropGate, withExportLock } from "../capture/exportGate";
import {
  backdropImageAspect,
  needsCoverCrop,
  photoToFrame,
  withBackdropCrop,
} from "../capture/backdropCrop";

const FOV = 45;

// Mission 5 — model selection tuning.
const SELECT_COLOR = 0xd9a441; // warm gold
const OUTLINE_OPACITY = 0.7; // premium rim, subtle but legible
const OUTLINE_EXPAND = 1.015; // thin inverted-hull silhouette
const RING_OPACITY = 0.95;
const CLICK_MOVE_TOLERANCE = 5; // px — below this a pointerup reads as a click

// Garage G3 — the selected-part overlay. Cyan (distinct from the gold whole-model
// outline), an editor-only group that every export hides.
const PART_COLOR = 0x38bdf8;
const PART_EXPAND = 1.03; // inverted hull grown about each part's own centre
const OVERLAY_NAME = "garage-overlay";

// Garage G7a — the group every added object hangs in (a sibling of the main
// model inside the Turntable pivot, so the turntable spins everything
// together and refit()'s union sees every visible object), the main
// product's fixed item id, and the Draco decoder path drei's useGLTF uses (the
// same loader setup, so an added copy renders like the main product).
const OBJECTS_NAME = "garage-objects";
const PRIMARY_ITEM_ID = "i0";
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";

// Garage G11 — the TransformControls helper's name: an editor-only object
// every export hides, exactly like the part overlay above.
const GIZMO_NAME = "garage-gizmo";

// Garage G9 — the old whole-model selection indicator: the gold outline group
// and the gold footprint ring. Both exist only because of a selection, so
// every PNG export hides them like the part overlay and the gizmo (the Reel
// already hides them through setOverlaysHidden). The floor disc and the
// shadow catcher are the normal look and are never hidden.
const OUTLINE_NAME = "selection-outline";
const RING_NAME = "selection-ring";

// Garage M0 — the measure tool's line + label: an editor-only, scene-root
// group (like the gizmo helper) every export hides, and every PNG export
// hides by name exactly like the rest of EXPORT_HIDDEN_NAMES.
const MEASURE_NAME = "garage-measure";
const EXPORT_HIDDEN_NAMES = [OVERLAY_NAME, GIZMO_NAME, OUTLINE_NAME, RING_NAME, MEASURE_NAME];

// Mission 6 (Transform Foundation) — the original transform reference. The
// transform layer is a wrapper group starting at identity, so identity is the
// exact original placement/rotation/scale of every model.
const DEFAULT_TRANSFORM = Object.freeze({
  x: 0,
  y: 0,
  z: 0,
  rx: 0, // degrees (Euler XYZ)
  ry: 0,
  rz: 0,
  s: 1, // uniform scale
});

const degToRad = THREE.MathUtils.degToRad;

// Collect every visible mesh into a plain array FIRST. Never create outline
// shells while iterating a live Object3D.children array — that traversal bug
// (mutating the scene graph mid-iteration) was the previous implementation's
// crash source.
function collectModelMeshes(root) {
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.visible && obj.geometry) meshes.push(obj);
  });
  return meshes;
}

// Garage G5 — names of runtime-only overlay groups that live inside the
// transform group but are never part of the model: they must never skew a
// measured bounds union (camera presets, Reel/PNG framing, the floor, the
// Turntable pivot). See the whole-model outline (buildOutlineShells) and the
// Garage part overlay (buildPartShells) below, which create these groups.
const REFIT_SKIP_NAMES = new Set([OUTLINE_NAME, OVERLAY_NAME]);

// Garage G5 — builds bounds.js's plain node tree from a LIVE three.js
// Object3D graph. Every node's pos/quat/scale is LOCAL (bounds.js composes
// the hierarchy itself, exactly like three.js's own matrixWorld chain); a
// mesh leaf also carries its LOCAL geometry bounding box (computed once and
// cached on the geometry, same as three.js's own Box3.setFromObject would
// read). This never touches bounds.js's own union/floor math.
function adaptObject3D(obj) {
  const node = {
    visible: obj.visible,
    pos: obj.position.toArray(),
    quat: obj.quaternion.toArray(),
    scale: obj.scale.toArray(),
  };
  if (obj.isMesh && obj.geometry) {
    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
    const bb = obj.geometry.boundingBox;
    if (bb) node.box = { min: bb.min.toArray(), max: bb.max.toArray() };
  }
  if (obj.children && obj.children.length) {
    const kids = obj.children.filter((c) => !REFIT_SKIP_NAMES.has(c.name));
    if (kids.length) node.children = kids.map(adaptObject3D);
  }
  return node;
}

const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);

// Garage G4 — a part mesh's base pose (position, quaternion, scale, visible)
// is recorded once, the first time it is touched, in a WeakMap the caller
// owns. Every later override composes against this same recorded base via
// compose.js, never against whatever the mesh currently holds.
// Garage G6 — the SAME base object also records the mesh's original material
// reference (the one the GLTF loader produced), captured on this same first
// touch. A REVISIT of a product (switch away, then back to the SAME product)
// can reach this function with a "new" WeakMap entry — e.g. a fresh effect
// instance — while the mesh's LIVE material is still whatever it was left as
// from before, which could already be a Garage clone if an override was
// active and never reset. Trusting `mesh.material` blindly in that case would
// permanently record the CLONE as "the original". Guard against exactly that
// by unwrapping through the clone's own self-contained back-reference
// (`sosGarageOriginal`, set in applyPartMaterial below) — the same field
// materials/apply.js's materialGroups() already reads for the identical
// reason, so a mesh is never mistaken for pristine while it visibly is not.
function ensurePartBase(mesh, bases) {
  let base = bases.get(mesh);
  if (!base) {
    const live = mesh.material;
    const trueOriginal = (live && live.userData && live.userData.sosGarageOriginal) || live;
    base = {
      pos: mesh.position.toArray(),
      quat: mesh.quaternion.toArray(),
      scale: mesh.scale.toArray(),
      visible: mesh.visible,
      material: trueOriginal,
    };
    bases.set(mesh, base);
  }
  return base;
}

// Garage G6 — hex string for a THREE.Color, matching materials/apply.js's own
// helper in spirit (this module stays free of that import; Garage owns its
// own tiny copy rather than reaching into the Materials editor's internals).
const hexOfColor = (c) => (c && c.isColor ? `#${c.getHexString()}` : "#ffffff");

// Garage G6 — applies (or removes) one part's colour override on the mesh's
// LIVE material. No override: the mesh must point at the recorded original
// material reference exactly (a hard reset, not a value copy), disposing any
// clone this module owns (shared textures are never touched). An override:
// clone the original exactly once (tagged so materials/apply.js's Materials
// panel skips it and so this function recognises its own clone later), then
// write every field with authoritative-copy semantics — a field present in
// the override replaces the clone's value, a field absent falls back to the
// ORIGINAL material's own value (read from `base`, never accumulated from
// whatever the clone currently holds), so clearing one field can never leave
// a trace of a value that used to be there.
function applyPartMaterial(mesh, base, matOv) {
  const original = base.material;
  if (!original) return;
  const isOwnClone = (m) => !!(m && m.userData && m.userData.sosGarageClone);
  if (!matOv) {
    if (mesh.material !== original) {
      const prev = mesh.material;
      mesh.material = original;
      if (isOwnClone(prev) && typeof prev.dispose === "function") prev.dispose();
    }
    return;
  }
  let clone = isOwnClone(mesh.material) ? mesh.material : null;
  if (!clone) {
    clone = original.clone(); // textures are references on the clone, never duplicated
    // sosGarageOriginal is a direct reference (not just a uuid/name copy) so
    // materials/apply.js's materialGroups() can group this clone's mesh back
    // under the ORIGINAL material's row without importing anything from
    // Garage — the clone carries everything it needs to stay invisible.
    clone.userData = { ...clone.userData, sosGarageClone: true, sosGarageOriginal: original };
    clone.name = `${original.name || "Material"} (Garage)`;
    mesh.material = clone;
  }
  if (clone.color) {
    if (typeof matOv.color === "string") clone.color.set(matOv.color);
    else if (original.color) clone.color.copy(original.color);
  }
  const numeric = (key, fallback) => {
    if (!(key in clone)) return;
    const v = typeof matOv[key] === "number" ? matOv[key] : fallback;
    clone[key] = v;
  };
  numeric("metalness", typeof original.metalness === "number" ? original.metalness : 0);
  numeric("roughness", typeof original.roughness === "number" ? original.roughness : 1);
  const opacity = typeof matOv.opacity === "number" ? matOv.opacity : (typeof original.opacity === "number" ? original.opacity : 1);
  clone.opacity = opacity;
  clone.transparent = opacity < 1 ? true : original.transparent === true;
  clone.vertexColors = matOv.ignoreVertexColors === true ? false : original.vertexColors;
  clone.needsUpdate = true;
}

// Build one inverted-hull shell per collected mesh, expressed in the transform
// group's LOCAL space so the outline follows the model when it is transformed.
// Shells SHARE the model's geometry (so geometry is never disposed here) but
// each owns a fresh material that the caller disposes when selection clears.
function buildOutlineShells(meshes, center, parent) {
  parent.updateWorldMatrix(true, false);
  const invParent = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const shells = [];

  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    m.copy(mesh.matrixWorld).premultiply(invParent);
    m.decompose(pos, quat, scale);
    offset.copy(pos).sub(center);
    const shell = new THREE.Mesh(
      mesh.geometry,
      new THREE.MeshBasicMaterial({
        color: SELECT_COLOR,
        side: THREE.BackSide,
        transparent: true,
        opacity: OUTLINE_OPACITY,
        depthWrite: true,
        toneMapped: false,
      })
    );
    shell.position.copy(center).addScaledVector(offset, OUTLINE_EXPAND);
    shell.quaternion.copy(quat);
    shell.scale.copy(scale).multiplyScalar(OUTLINE_EXPAND);
    shells.push(shell);
  }
  return shells;
}

// Garage G3 — one inverted-hull shell per selected part, in the transform
// group's LOCAL space like buildOutlineShells, but grown about the part's own
// geometry centre so a part whose geometry sits away from its node origin is
// still hugged. Shells share the part's geometry; each owns a fresh material.
function buildPartShells(meshes, parent) {
  parent.updateWorldMatrix(true, false);
  const invParent = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const toCentre = new THREE.Matrix4();
  const grow = new THREE.Matrix4().makeScale(PART_EXPAND, PART_EXPAND, PART_EXPAND);
  const fromCentre = new THREE.Matrix4();
  const shells = [];
  for (const mesh of meshes) {
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const c = mesh.geometry.boundingSphere ? mesh.geometry.boundingSphere.center : new THREE.Vector3();
    mesh.updateWorldMatrix(true, false);
    toCentre.makeTranslation(c.x, c.y, c.z);
    fromCentre.makeTranslation(-c.x, -c.y, -c.z);
    const shell = new THREE.Mesh(
      mesh.geometry,
      new THREE.MeshBasicMaterial({
        color: PART_COLOR,
        side: THREE.BackSide,
        transparent: true,
        opacity: OUTLINE_OPACITY,
        depthWrite: true,
        toneMapped: false,
      })
    );
    shell.matrixAutoUpdate = false;
    shell.matrix
      .copy(mesh.matrixWorld)
      .premultiply(invParent)
      .multiply(toCentre)
      .multiply(grow)
      .multiply(fromCentre);
    shell.matrixWorldNeedsUpdate = true;
    shells.push(shell);
  }
  return shells;
}

// Garage M0 — a mesh's box in the MODEL's own local frame: relative to
// modelScene, so it carries the mesh's full chain WITHIN the model (every
// GLTF node transform, plus any Garage per-part override already baked into
// the mesh's live local transform — Owner decision 1's "own Garage scale"),
// but excludes everything ABOVE modelScene: the turntable pivot groups
// (translation only, so this would not matter anyway) and, critically, the
// old whole-model Transform panel's position/rotation/scale.
function modelUnitBox(mesh, modelScene) {
  mesh.updateWorldMatrix(true, false);
  modelScene.updateWorldMatrix(true, false);
  const rel = new THREE.Matrix4().copy(modelScene.matrixWorld).invert().multiply(mesh.matrixWorld);
  const g = mesh.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  return g.boundingBox.clone().applyMatrix4(rel);
}

// Garage G3 — what the rail shows for one part (Garage M0: "model units" is
// modelUnitBox above, not the mesh's world box — see its comment for why).
function describeMesh(mesh, partId, modelScene) {
  const g = mesh.geometry;
  const vertices = g && g.attributes && g.attributes.position ? g.attributes.position.count : 0;
  const triangles = g ? Math.floor((g.index ? g.index.count : vertices) / 3) : 0;
  const size = modelUnitBox(mesh, modelScene).getSize(new THREE.Vector3());
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return {
    name: mesh.name || "(unnamed)",
    path: partId,
    triangles,
    vertices,
    size: { x: size.x, y: size.y, z: size.z },
    materialName: mat && mat.name ? mat.name : "",
  };
}

// Garage M0 — a small canvas-texture label for the measure tool's distance
// readout, in the same "paint on a canvas, wrap in a CanvasTexture" style as
// materials/textures.js. Built fresh per label (labels change rarely — one
// per pick, unit toggle or calibration edit — so no cache is needed).
function makeLabelSprite(text) {
  const scale = 2; // crisp on high-DPI screens
  const paddingX = 14;
  const height = 40;
  const font = "600 22px system-ui, sans-serif";
  const measuring = document.createElement("canvas").getContext("2d");
  measuring.font = font;
  const width = Math.ceil(measuring.measureText(text).width) + paddingX * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const r = 8;
  ctx.fillStyle = "rgba(20, 20, 24, 0.85)";
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(width, 0, width, height, r);
  ctx.arcTo(width, height, 0, height, r);
  ctx.arcTo(0, height, 0, 0, r);
  ctx.arcTo(0, 0, width, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f5deb3";
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, toneMapped: false });
  const sprite = new THREE.Sprite(material);
  const worldHeight = 0.05;
  sprite.scale.set((width / height) * worldHeight, worldHeight, 1);
  return sprite;
}

// Garage G7a — the triangles a subtree draws, counted per mesh node (the same
// way the model reports count them). visibleOnly skips hidden subtrees.
function countTriangles(root, visibleOnly) {
  let n = 0;
  const visit = (obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    const g = obj.geometry;
    const pos = g.attributes && g.attributes.position;
    n += Math.floor((g.index ? g.index.count : pos ? pos.count : 0) / 3);
  };
  if (visibleOnly) root.traverseVisible(visit);
  else root.traverse(visit);
  return n;
}

// Garage G7a — an added object is parsed by its OWN GLTFLoader call (never
// the drei cache the main product and the Materials panel read), so it shares
// no geometry, material or texture with either. Its own LoadingManager keeps
// drei's useProgress (the full-screen LoadingScreen) out of it, like the HDR
// loader above.
const objectLoadingManager = new THREE.LoadingManager();
let objectDracoLoader = null;

function loadObjectScene(url) {
  const loader = new GLTFLoader(objectLoadingManager);
  if (!objectDracoLoader) {
    objectDracoLoader = new DRACOLoader(objectLoadingManager);
    objectDracoLoader.setDecoderPath(DRACO_DECODER_PATH);
  }
  loader.setDRACOLoader(objectDracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

// Garage G7a — everything one added object exclusively owns.
function objectResources(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((obj) => {
    if (obj.geometry) geometries.add(obj.geometry);
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of list) {
      if (!m || !m.isMaterial) continue;
      materials.add(m);
      for (const v of Object.values(m)) if (v && v.isTexture) textures.add(v);
    }
  });
  return { geometries, materials, textures };
}

// Frees the GPU copies of an object's own resources. three.js uploads them
// again if the object is drawn again (a redo brings a removed object back),
// so the CPU data is kept for as long as the stage's history can reach it.
function releaseObjectGpu(res) {
  res.geometries.forEach((g) => g.dispose());
  res.materials.forEach((m) => m.dispose());
  res.textures.forEach((t) => t.dispose());
}

// Garage G7a — wraps a freshly parsed object so its item position is its BASE
// CENTRE: anchor (the item transform: metres, degrees XYZ, uniform scale) >
// inner (moves the model's own local box so its bottom-centre sits at the
// anchor's origin) > the parsed scene. Measured with bounds.js's own union.
function makeObjectEntry(assetId, modelPath, scene) {
  scene.updateMatrixWorld(true);
  const u = unionBounds(adaptObject3D(scene));
  if (!u) return null;
  enableModelShadows(scene);
  const inner = new THREE.Group();
  inner.position.set(-u.center[0], -u.min[1], -u.center[2]);
  inner.add(scene);
  const anchor = new THREE.Group();
  anchor.add(inner);
  return {
    key: null,
    itemId: null,
    assetId,
    modelPath,
    anchor,
    inner,
    scene,
    size: u.size.slice(),
    triangles: countTriangles(scene, false),
    resources: objectResources(scene),
    attached: false,
  };
}

// The whole-object transform, read the way the whole-model panel reads its own.
function poseObject(entry, item) {
  const t = item.transform;
  entry.anchor.position.set(t.x, t.y, t.z);
  entry.anchor.rotation.set(degToRad(t.rx), degToRad(t.ry), degToRad(t.rz), "XYZ");
  entry.anchor.scale.setScalar(t.s);
  entry.anchor.visible = item.hidden !== true;
}

// The added object (item id) a hit mesh belongs to, or null.
function objectItemIdOf(obj) {
  for (let o = obj; o; o = o.parent) {
    if (o.userData && typeof o.userData.sosGarageItemId === "string") return o.userData.sosGarageItemId;
  }
  return null;
}

// Mission 8 (Capture Shot Foundation) — capture reuses THIS renderer, exactly
// as-is: one synchronous gl.render (the same call the frame loop makes, so the
// PNG matches the current camera/environment/model/transform/selection
// presentation) followed by a PNG encode of the live WebGL canvas via toBlob.
// It never reads or writes scene state, never moves the camera, never starts
// animation, and never creates a second rendering pipeline.
// Mission 10C (Presentation Studio) — the export frame is drawn by THIS same
// renderer at the exact target size: the drawing buffer is resized without
// touching the CSS layout (updateStyle=false), the projection is refit to the
// target aspect while the camera position/orientation — the framing — stays
// exactly as the live view shows it, and for transparent exports the backdrop
// is dropped and the clear alpha zeroed so the PNG carries a real alpha
// channel (lights, tone mapping and the ShadowMaterial contact shadow all
// keep rendering, so lighting and shadows survive into the transparent PNG).
// Every renderer mutation is reverted afterwards and one frame is re-rendered
// at the live size so the on-screen presentation never flashes.
function renderExportFrame(gl, scene, camera, width, height, transparent) {
  const prevPixelRatio = gl.getPixelRatio();
  const prevSize = gl.getSize(new THREE.Vector2());
  const prevAspect = camera.aspect;
  const prevBackground = scene.background;
  const prevClearAlpha = gl.getClearAlpha();
  gl.setPixelRatio(1);
  gl.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (transparent) {
    scene.background = null;
    gl.setClearAlpha(0);
  }
  // Shadows come from the on-demand shadow map: ask for one clean update so
  // the export carries the same contact shadow the live view shows.
  gl.shadowMap.needsUpdate = true;
  // Slice C2: a portrait / square frame shows the backdrop photo cover-cropped
  // (not squashed); the crop is put back inside this same synchronous call.
  withBackdropCrop(scene, width / height, () => gl.render(scene, camera));
  return () => {
    gl.setPixelRatio(prevPixelRatio);
    gl.setSize(prevSize.x, prevSize.y, false);
    camera.aspect = prevAspect;
    camera.updateProjectionMatrix();
    scene.background = prevBackground;
    gl.setClearAlpha(prevClearAlpha);
    gl.shadowMap.needsUpdate = true;
    gl.render(scene, camera);
  };
}

function CaptureBridge({ captureRef, reelViewRef }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!captureRef) return undefined;
    const capture = (opts = {}) => {
      const [width, height] = computeExportSize(
        gl.domElement.width,
        gl.domElement.height,
        opts
      );
      // Slice E3: the three fixed social presets are framed exactly like the
      // Reel MP4. The stage puts the camera on the Reel pose (and returns the
      // function that puts it back) before the render below; anything else, and
      // any failure to compute the pose, runs today's code untouched.
      const restorePose =
        usesReelFraming(opts.presetId, width, height) && reelViewRef && reelViewRef.current
          ? reelViewRef.current.applyPngPose(width, height)
          : null;
      let restore;
      // Garage G3: the editor overlay never appears in an export frame. It is
      // hidden for the synchronous render only and put back in this same task,
      // also when the render fails. Garage G11: the gizmo, the same way.
      // Garage G9: the old whole-model outline and ring, the same way.
      const hidden = [];
      for (const name of EXPORT_HIDDEN_NAMES) {
        const obj = scene.getObjectByName(name);
        if (obj) {
          hidden.push([obj, obj.visible]);
          obj.visible = false;
        }
      }
      try {
        restore = renderExportFrame(
          gl,
          scene,
          camera,
          width,
          height,
          opts.background === "transparent"
        );
      } catch (err) {
        if (restorePose) restorePose();
        throw err;
      } finally {
        for (const [obj, wasVisible] of hidden) obj.visible = wasVisible;
      }
      return new Promise((resolve, reject) => {
        gl.domElement.toBlob(
          (blob) => {
            restore();
            if (blob) {
              resolve({ blob, width, height });
            } else {
              reject(new Error("Capture failed: canvas produced no image"));
            }
          },
          "image/png"
        );
        // toBlob has copied the bitmap at call time (HTML spec), so the camera
        // goes back in this SAME synchronous task: the live frame loop can never
        // draw the export pose to the visible canvas.
        if (restorePose) restorePose();
      });
    };
    // Cleanup slice: every Garage edit is refused while the PNG is captured;
    // the lock is released when the capture settles, also when it fails. The
    // render above still runs synchronously in the caller's task.
    captureRef.current = (opts) => withExportLock(garageStore, () => capture(opts));
    return () => {
      captureRef.current = null;
    };
  }, [captureRef, reelViewRef, gl, scene, camera]);
  return null;
}

// Imperative renderer configuration lives in module-level helpers: three.js
// mutates these objects by design (shadow map flags, tone-mapping exposure,
// mesh shadow flags), so the writes happen away from React render scope.
function setShadowMapOnDemand(gl, onDemand) {
  gl.shadowMap.autoUpdate = !onDemand;
  gl.shadowMap.needsUpdate = true;
}

function invalidateShadowMap(gl) {
  gl.shadowMap.needsUpdate = true;
}

// Camera projection writes for the export stepping (Slice C) live at module
// scope like the renderer helpers above: three.js mutates the camera by design.
function setCameraProjection(camera, { aspect, fov, near, far }) {
  if (aspect !== undefined) camera.aspect = aspect;
  if (fov !== undefined) camera.fov = fov;
  if (near !== undefined) camera.near = near;
  if (far !== undefined) camera.far = far;
  camera.updateProjectionMatrix();
}

function setExposure(gl, exposure) {
  gl.toneMappingExposure = exposure;
}

function enableModelShadows(root) {
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

// Image-based lighting. Lives outside StudioStage (which remounts on every
// product switch) so the converted environment survives product changes. An
// environment with an `hdri` lights the model from that equirect HDR; every
// other environment — and any HDR that fails to load — uses the local
// RoomEnvironment probe. The HDR loads through its own LoadingManager so
// drei's useProgress (and the full-screen LoadingScreen) never sees it.
// The r3f scene is the live, mutable three.js scene; like the other renderer
// writes above, this happens in a module-level helper.
function setSceneEnvironment(scene, texture) {
  scene.environment = texture;
}

const hdrLoadingManager = new THREE.LoadingManager();
const PROBE_KEY = "probe";

function EnvironmentLighting({ environment }) {
  const { scene, gl } = useThree();
  const stateRef = useRef(null);
  const { id, hdri } = environment;

  // One PMREM generator + result cache (env id -> render target) per canvas.
  useEffect(() => {
    const state = {
      pmrem: new THREE.PMREMGenerator(gl),
      cache: new Map(),
      failed: new Set(),
      pending: new Set(),
      current: null,
      dead: false,
    };
    stateRef.current = state;
    return () => {
      state.dead = true;
      setSceneEnvironment(scene, null);
      state.cache.forEach((rt) => rt.dispose());
      state.pmrem.dispose();
      stateRef.current = null;
    };
  }, [scene, gl]);

  useEffect(() => {
    const state = stateRef.current;
    const { pmrem, cache, failed, pending } = state;
    state.current = id;
    const applyProbe = () => {
      if (!cache.has(PROBE_KEY)) {
        const room = new RoomEnvironment();
        cache.set(PROBE_KEY, pmrem.fromScene(room, 0.04));
        room.dispose();
      }
      setSceneEnvironment(scene, cache.get(PROBE_KEY).texture);
    };
    if (!hdri || failed.has(id)) {
      applyProbe();
      return;
    }
    if (cache.has(id)) {
      setSceneEnvironment(scene, cache.get(id).texture);
      return;
    }
    // The probe lights the model until the HDR is converted.
    applyProbe();
    if (pending.has(id)) return;
    pending.add(id);
    const fail = (err) => {
      pending.delete(id);
      if (state.dead || failed.has(id)) return;
      failed.add(id);
      console.warn(`HDR environment "${id}" failed to load; using the default probe.`, err);
    };
    new HDRLoader(hdrLoadingManager).load(
      hdri,
      (tex) => {
        pending.delete(id);
        try {
          if (state.dead) return;
          tex.mapping = THREE.EquirectangularReflectionMapping;
          cache.set(id, pmrem.fromEquirectangular(tex));
        } catch (err) {
          fail(err);
          return;
        } finally {
          tex.dispose();
        }
        // A load that resolves after a newer switch is cached, not applied.
        if (state.current === id) setSceneEnvironment(scene, cache.get(id).texture);
      },
      undefined,
      fail
    );
  }, [scene, id, hdri]);

  return null;
}

function StudioStage({
  product,
  environment,
  transform,
  selected,
  onSelect,
  onClear,
  cameraRequest,
  customView,
  cameraApiRef,
  lighting,
  viewLive,
  onViewLive,
  focusLock,
  onLockChange,
  reelViewRef,
}) {
  const { scene, camera, gl, setFrameloop, get } = useThree();
  const controlsRef = useRef(null);
  // Camera Studio (Phase 16A) — frozen slider baseline of the last applied
  // view, the count of programmatic camera moves in flight, and whether the
  // view has been changed since (mirrored to App as viewLive). None of this is
  // camera state: the live camera and controls target stay the only truth.
  const baselineRef = useRef(null);
  const applyingRef = useRef(0);
  const liveRef = useRef(false);
  const transformRef = useRef(null);
  // Lock focus (Slice B) — the model centre the target last followed, and the
  // stage's copy of App's focusLock. Neither is camera state.
  const lastCentreRef = useRef(null);
  const lockRef = useRef(focusLock);
  // Turntable preview (Phase 16B Slice B) — the running preview { anim, start,
  // preView } (null = idle), the pivot group the model spins on, the selection
  // ring (hidden while it plays) and the Escape listener. Refs only: nothing
  // here is React state, so a playing frame never renders React.
  const animRunRef = useRef(null);
  const pivotRef = useRef(null);
  // Garage G5 — the group that cancels the pivot's translation, so the model
  // renders exactly where it did before the pivot existed. Both this and
  // pivotRef are positioned IMPERATIVELY by refit() (never a declarative JSX
  // prop — see the transform group's JSX below for why).
  const pivotOffsetRef = useRef(null);
  // Garage G7a — the group added objects hang in (next to the model, inside
  // the pivot offset) and the stage's pool of loaded objects, keyed
  // `${itemId}|${assetId}`: an entry stays in the pool (GPU copies released)
  // while it is removed, so Undo/Redo can bring it straight back.
  const objectsRootRef = useRef(null);
  const objectPoolRef = useRef(new Map());
  const pendingObjectRef = useRef(null); // { entry, adopted } during one addItem
  // Garage G7b — [{ entry, adopted }] during one loadLayoutItems commit, and
  // the running layout load ({ aborted }, null = none).
  const pendingListRef = useRef(null);
  const loadRunRef = useRef(null);
  const addingObjectRef = useRef(false);
  const knownTrianglesRef = useRef(new Map()); // modelPath -> triangles
  const stageAliveRef = useRef(true);
  const ringRef = useRef(null);
  const selectedRef = useRef(selected);
  const escHandlerRef = useRef(null);
  // Garage G11 — the live TransformControls (null = no gizmo), the function
  // that re-decides whether it shows, and whether the current pointer press
  // began on one of its handles (such a press never selects or clears).
  const gizmoRef = useRef(null);
  const gizmoSyncRef = useRef(null);
  const gizmoPressRef = useRef(false);
  // Deterministic frame stepping (Slice C) — the running export (null = none):
  // target size, the turntable spec, the Distance % read at begin, and what
  // endExport restores. A ref, never React state.
  const exportRunRef = useRef(null);
  // The current environment for stepExport (Slice E2). A ref, so switching the
  // environment does not change stepExport's identity (that would re-register
  // the animation api and end a running preview).
  const environmentRef = useRef(environment);
  // True only inside the synchronous window in which a portrait PNG export has the
  // camera on the Reel pose (Slice E3); publish() is skipped meanwhile.
  const pngPoseRef = useRef(false);
  useEffect(() => {
    environmentRef.current = environment;
  }, [environment]);

  const { scene: modelScene } = useGLTF(product.modelPath);

  // Environment background — locked library rule: applying an environment
  // changes ONLY the background (lighting, camera, and model stay untouched).
  // The photographic backdrops contain their own display platform, so the
  // 3D floor disc is hidden while one is active (see <mesh visible=...>).
  // Cleanup slice: the export buttons wait for this load through backdropGate
  // ("Loading backdrop..."); an environment with no photo is ready at once; a
  // failed load warns and lets exports run without it. An environment or
  // product switch (this effect's cleanup) re-engages the gate.
  useEffect(() => {
    let disposed = false;
    let texture = null;
    const token = backdropGate.begin(environment.file);
    if (environment.file) {
      const loader = new THREE.TextureLoader();
      loader.load(
        environment.file,
        (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          texture = tex;
          scene.background = tex;
          backdropGate.loaded(token);
        },
        undefined,
        (err) => {
          if (disposed) return;
          console.warn("Backdrop failed to load:", environment.file, err);
          backdropGate.failed(token);
        }
      );
    }
    return () => {
      disposed = true;
      if (texture) texture.dispose();
      scene.background = null;
      backdropGate.clear(token);
    };
  }, [scene, environment]);

  // Deterministic framing: measure the loaded model, fit camera + floor to it
  const fit = useMemo(() => {
    modelScene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(modelScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;
    const vFov = (FOV * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    // Distance needed for box height AND rotating footprint diagonal to fit
    const distV = size.y / 2 / Math.tan(vFov / 2);
    const distH =
      Math.hypot(size.x, size.z) / 2 / Math.tan(hFov / 2);
    // 0.7 => model fills ~70% of frame: comfortable product framing with
    // clear space around it (incl. the top-right controls panel).
    const distance = Math.max(distV, distH) / 0.7;
    const footprintRadius = Math.hypot(size.x, size.z) / 2;
    return { center, size, distance, footprintRadius, floorY: box.min.y };
  }, [modelScene, gl]);

  // Garage G5 — the live, continuously-refreshed twin of `fit`. liveFitRef is
  // read IMPERATIVELY (always current) by camera presets and Reel/PNG framing
  // (Decision 2 — the CAM-001 fix): they must reflect a moved/hidden part or a
  // moved/scaled whole model the instant they run, never through a React
  // effect dependency. liveFit (the SAME shape, as state) exists ONLY to drive
  // the floor disc / shadow catcher / ring / shadow-frustum JSX further below,
  // and is set exactly once per refit() call, never per frame. Both start out
  // exactly equal to `fit` (same values) until the first refit() confirms them
  // from the live scene graph.
  const liveFitRef = useRef(fit);
  const [liveFit, setLiveFit] = useState(fit);

  // Garage G5 — re-measures the model from the LIVE three.js scene graph, in
  // two passes over the same adapter (adaptObject3D + bounds.js's own
  // unionBounds/floorYFor — never a hand-rolled union). `world` is rooted at
  // transformRef, so it includes the pre-existing whole-model transform panel
  // (position/rotation/scale) on top of every part's current pose; it drives
  // liveFitRef/liveFit. `local` is rooted at modelScene directly — excluding
  // BOTH transformRef's own transform AND the pivot group this same call is
  // about to move (walking through the pivot here would be self-referential)
  // — and drives ONLY the Turntable pivot's translation (Decision 3): the
  // pivot lives INSIDE transformRef, so it must spin about the model's own
  // centre regardless of any whole-model move/scale, but only follow a PART
  // edit, never the whole-model transform (that is transformRef's own job).
  // Floor height is pinned: floorYFor returns fit.floorY (Decision 4) whenever
  // it is finite, i.e. always, so liveFit.floorY never actually moves.
  // Called synchronously from a Garage store commit, a whole-model transform
  // change, or once on mount — never inside useFrame, never per frame.
  const refit = useCallback(() => {
    const root = transformRef.current;
    if (root) {
      const worldUnion = unionBounds(adaptObject3D(root));
      if (worldUnion) {
        const center = new THREE.Vector3().fromArray(worldUnion.center);
        const size = new THREE.Vector3().fromArray(worldUnion.size);
        const floorY = floorYFor({ homeFloorY: fit.floorY, unionMinY: worldUnion.min[1] });
        const footprintRadius = Math.hypot(size.x, size.z) / 2;
        const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;
        const distance = fitDistance(size, aspect, FOV, 0.7);
        const next = { center, size, distance, footprintRadius, floorY };
        liveFitRef.current = next;
        setLiveFit(next);
      }
    }
    if (pivotRef.current && pivotOffsetRef.current) {
      // Garage G7a (Decision 6) — with visible added objects the turntable
      // spins the WHOLE scene about its common centre; with none, this is
      // exactly the original model-only union.
      const objectsRoot = objectsRootRef.current;
      const withObjects = !!objectsRoot && objectsRoot.children.some((c) => c.visible);
      const localUnion = withObjects
        ? unionBounds({ children: [adaptObject3D(modelScene), adaptObject3D(objectsRoot)] })
        : unionBounds(adaptObject3D(modelScene));
      const c = localUnion ? localUnion.center : fit.center.toArray();
      pivotRef.current.position.set(c[0], c[1], c[2]);
      pivotOffsetRef.current.position.set(-c[0], -c[1], -c[2]);
    }
    invalidateShadowMap(gl);
  }, [fit, gl, modelScene]);

  // Garage G5 (wiring b/c) — the pre-existing whole-model transform panel is
  // applied to transformRef via plain JSX props (see the transform group's
  // JSX below), not an effect, so this effect stands in for "the existing
  // whole-model transform's own effect": it fires once on mount (liveFitRef
  // starts out equal to `fit`, then this confirms it from the live scene) and
  // again on every transform-panel change (the CAM-001 fix for that path).
  useEffect(() => {
    refit();
  }, [transform, refit]);

  // react-three-fiber's useThree() intentionally returns the live, mutable
  // three.js camera; positioning it imperatively (as here) is the standard
  // r3f pattern, not a violation the immutability rule is meant to catch.
  // Phase 15A: the default hero framing is a callable so Reset Studio Session
  // can re-apply it (exposed as cameraApiRef.resetView); the effect below
  // still runs it on every fit change exactly as before.
  // Publish the camera's slider values (distance %, height %) to the shared
  // camera store. The store ignores a publish that changes no displayed value.
  const publish = useCallback(() => {
    // An export moves the camera to the Reel pose every step; the sliders and
    // the store must not follow it (nothing is published until endExport).
    if (exportRunRef.current || pngPoseRef.current) return;
    const controls = controlsRef.current;
    const baseline = baselineRef.current;
    if (!controls || !baseline) return;
    cameraStudio.publish({
      ...cameraStudio.readMetrics(
        camera.position.toArray(),
        controls.target.toArray(),
        baseline
      ),
      live: liveRef.current,
      lock: lockRef.current,
    });
  }, [camera]);

  // The model's current centre: the rigid transform applied to the fitted
  // centre (not a bounding box, so rotation does not inflate or drift it).
  const liveCentre = useCallback(() => {
    const group = transformRef.current;
    if (!group) return fit.center.clone();
    group.updateMatrixWorld(true);
    return fit.center.clone().applyMatrix4(group.matrixWorld);
  }, [fit]);

  // Every programmatic camera move runs inside this guard so the controls'
  // change event it causes is not mistaken for a user move.
  const moveGuarded = useCallback((move) => {
    applyingRef.current += 1;
    try {
      move();
      controlsRef.current?.update();
    } finally {
      applyingRef.current -= 1;
    }
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Turntable preview. The selection outline (a child of the transform group,
  // so it would not turn with the model) and the ring are hidden while it plays.
  const setOverlaysHidden = useCallback((hidden) => {
    const outline = transformRef.current?.getObjectByName(OUTLINE_NAME);
    if (outline) outline.visible = !hidden;
    const partOverlay = transformRef.current?.getObjectByName(OVERLAY_NAME);
    if (partOverlay) partOverlay.visible = !hidden;
    if (ringRef.current) ringRef.current.visible = hidden ? false : selectedRef.current;
    // Garage M0: the measure line/label, the same way (hidden while the
    // turntable plays or a Reel export runs — Owner decision 7). PNG export
    // hides it separately, by name, in CaptureBridge (EXPORT_HIDDEN_NAMES).
    const measureGroup = scene.getObjectByName(MEASURE_NAME);
    if (measureGroup) measureGroup.visible = hidden ? false : measure.getSnapshot().pointA != null;
    // Garage G11: the gizmo reads the preview / export refs itself.
    if (gizmoSyncRef.current) gizmoSyncRef.current();
  }, [scene]);

  // Ends the preview. `restore` puts the camera and target back through the
  // guard (so the view is not marked live and nothing is published as a user
  // move); it is false when the stage is going away, because the old camera
  // must never be applied to a new model. Never calls onViewLive and never
  // touches Lock, the baseline or the slider percentages.
  const stopPreview = useCallback(
    ({ restore = true } = {}) => {
      const run = animRunRef.current;
      if (!run) return false;
      animRunRef.current = null;
      if (escHandlerRef.current) {
        window.removeEventListener("keydown", escHandlerRef.current);
        escHandlerRef.current = null;
      }
      const controls = controlsRef.current;
      if (restore && controls) {
        moveGuarded(() => {
          camera.position.copy(run.preView.position);
          controls.target.copy(run.preView.target);
        });
      }
      if (controls) controls.enabled = true;
      if (pivotRef.current) pivotRef.current.rotation.y = 0;
      setOverlaysHidden(false);
      invalidateShadowMap(gl);
      animation.reportStopped();
      return true;
    },
    [camera, gl, moveGuarded, setOverlaysHidden]
  );

  // Starts only from a user event (the rail's Play through the animation
  // store), never from an effect. The camera does not move in this slice; its
  // position and target are saved so Stop can put them back exactly.
  const startPreview = useCallback(
    (anim) => {
      const controls = controlsRef.current;
      if (!controls || !pivotRef.current || animRunRef.current) return false;
      animRunRef.current = {
        anim,
        start: performance.now(),
        preView: { position: camera.position.clone(), target: controls.target.clone() },
      };
      controls.enabled = false;
      setOverlaysHidden(true);
      const onKey = (e) => {
        if (e.key === "Escape") stopPreview();
      };
      escHandlerRef.current = onKey;
      window.addEventListener("keydown", onKey);
      return true;
    },
    [camera, setOverlaysHidden, stopPreview]
  );

  // ---- Deterministic frame stepping (Phase 16B Slice C) ---------------------
  // beginExport / stepExport / endExport render the Turntable one exact frame at
  // a time on the SAME visible canvas and renderer as the PNG export
  // (renderExportFrame above, which is untouched), so tone mapping and colour
  // are identical. Nothing here uses state, timers or awaits.

  // Restores the renderer-owned state and ends the export. restoreCamera puts
  // the camera and target back through the guard; it is false when the stage is
  // going away (the old camera must never be applied to a new model). render
  // draws one frame at the restored size so the canvas is not stale.
  const finishExport = useCallback(
    ({ restoreCamera, render }) => {
      const run = exportRunRef.current;
      if (!run) return false;
      exportRunRef.current = null;
      gl.domElement.removeEventListener("webglcontextlost", run.onLost);
      const controls = controlsRef.current;
      if (pivotRef.current) pivotRef.current.rotation.y = 0;
      if (restoreCamera && controls) {
        moveGuarded(() => {
          camera.position.copy(run.saved.position);
          controls.target.copy(run.saved.target);
        });
      }
      // A window resize during the export made r3f resize the renderer to the
      // NEW layout size; the saved size would be stale, so use r3f's own.
      const live = get();
      const dpr = run.resized ? live.viewport.dpr : run.saved.pixelRatio;
      const cssW = run.resized ? live.size.width : run.saved.cssW;
      const cssH = run.resized ? live.size.height : run.saved.cssH;
      gl.setPixelRatio(dpr);
      gl.setSize(cssW, cssH, false);
      setCameraProjection(camera, {
        aspect: run.resized ? cssW / cssH : run.saved.aspect,
        fov: run.saved.fov,
        near: run.saved.near,
        far: run.saved.far,
      });
      setOverlaysHidden(false);
      invalidateShadowMap(gl);
      if (controls) controls.enabled = true;
      setFrameloop("always");
      live.invalidate(); // a stopped loop is not restarted by setFrameloop alone
      animation.reportStopped();
      if (render) {
        publish();
        gl.render(scene, camera);
      }
      return true;
    },
    [gl, scene, camera, get, moveGuarded, publish, setFrameloop, setOverlaysHidden]
  );

  // Only from idle, with the model ready. Sizes are rounded DOWN to even
  // integers in [2, 4096]. Renders nothing.
  const beginExport = useCallback(
    ({ width = REEL_EXPORT.width, height = REEL_EXPORT.height, anim } = {}) => {
      const controls = controlsRef.current;
      if (!controls || !pivotRef.current || !anim) return false;
      if (animRunRef.current || exportRunRef.current) return false;
      const even = (n) => Math.max(2, Math.min(4096, Math.floor(Number(n) / 2) * 2));
      const w = even(width);
      const h = even(height);
      if (!Number.isFinite(w) || !Number.isFinite(h)) return false;
      const css = gl.getSize(new THREE.Vector2());
      const buf = gl.getDrawingBufferSize(new THREE.Vector2());
      const run = {
        width: w,
        height: h,
        anim,
        // Distance % is read ONCE: the store is not published to during the
        // export, but reading it per step would also feed the Reel pose back.
        pct: cameraStudio.getSnapshot().distancePct,
        resized: false,
        saved: {
          position: camera.position.clone(),
          target: controls.target.clone(),
          aspect: camera.aspect,
          fov: camera.fov,
          near: camera.near,
          far: camera.far,
          pixelRatio: gl.getPixelRatio(),
          cssW: css.x,
          cssH: css.y,
          bufW: buf.x,
          bufH: buf.y,
        },
        onLost: null,
      };
      // A lost context restores the renderer state (there is nothing to draw).
      run.onLost = () => finishExport({ restoreCamera: true, render: false });
      exportRunRef.current = run;
      gl.domElement.addEventListener("webglcontextlost", run.onLost);
      setFrameloop("never");
      controls.enabled = false;
      setOverlaysHidden(true);
      gl.setPixelRatio(1);
      gl.setSize(w, h, false); // ONCE: assigning the size clears the canvas
      setCameraProjection(camera, { aspect: w / h });
      // The video path always renders the studio background: it ignores
      // exportOpts.background and never writes it.
      return true;
    },
    [gl, camera, finishExport, setFrameloop, setOverlaysHidden]
  );

  // The Reel framing (Slice E3: shared by stepExport and the portrait PNG export).
  // Portrait / square frames on an environment with a painted platform put the
  // model's base on it (the elevation is solved so the floor is seen at the
  // photo's angle; the Height slider is ignored); anything else, or any missing
  // or invalid input, gives the plain reelPose (centre target, live azimuth and
  // elevation). distance = fitDistance x Distance % / 100. Returns
  // { position, target, far } (fresh arrays) or null.
  // Garage G5 (Decision 2) — every framing input here (fitDistance's size,
  // the centre and the platform base point) reads liveFitRef, never the
  // frozen `fit` or liveCentre() (which only ever followed the whole-model
  // transform, never a part edit): a Reel/PNG export must frame the model
  // exactly as it currently stands.
  const computeReelView = useCallback(
    ({ width, height, livePosition, liveTarget, pct }) => {
      const aspect = width / height;
      const lf = liveFitRef.current ?? fit;
      const distance = fitDistance(lf.size, aspect, REEL_EXPORT.fovDeg, 0.7) * (pct / 100);
      const centreArr = lf.center.toArray();
      let pose = null;
      const env = environmentRef.current;
      if (needsCoverCrop(aspect) && env && env.platform) {
        const imageAspect = backdropImageAspect(scene);
        const frame = imageAspect ? photoToFrame(env.platform, imageAspect, aspect) : null;
        if (frame) {
          pose = platformReelPose({
            livePosition,
            liveTarget,
            centre: centreArr,
            basePoint: [lf.center.x, lf.floorY, lf.center.z],
            distance,
            floorAngleDeg: env.floorAngleDeg ?? 8,
            anchor: { x: frame.cx, y: frame.cy + (env.reelAnchorRy ?? 0) * frame.ry },
            fovDeg: REEL_EXPORT.fovDeg,
            aspect,
          });
        }
      }
      if (!pose) pose = reelPose(livePosition, liveTarget, centreArr, distance);
      if (!pose) return null;
      return {
        position: pose.position,
        target: pose.target,
        far: Math.max(camera.far, distance * 4 + 10),
      };
    },
    [fit, scene, camera]
  );

  // Portrait PNG export (Slice E3): puts the camera on the Reel pose, inside
  // moveGuarded, and returns the function that puts the camera, the controls
  // target and camera.far back exactly. null (today's behaviour) when there is no
  // controls object, an export or preview is running, or no pose can be computed.
  // The caller renders and calls toBlob, then restores, all in one synchronous
  // task; publish() is skipped meanwhile so the rail never sees the export pose.
  const applyReelPngPose = useCallback(
    (width, height) => {
      const controls = controlsRef.current;
      if (!controls || exportRunRef.current || animRunRef.current) return null;
      const savedPosition = camera.position.clone();
      const savedTarget = controls.target.clone();
      const savedFar = camera.far;
      const view = computeReelView({
        width,
        height,
        livePosition: savedPosition.toArray(),
        liveTarget: savedTarget.toArray(),
        pct: cameraStudio.getSnapshot().distancePct,
      });
      if (!view) return null;
      pngPoseRef.current = true;
      setCameraProjection(camera, { far: view.far });
      moveGuarded(() => {
        camera.position.fromArray(view.position);
        controls.target.fromArray(view.target);
      });
      return () => {
        moveGuarded(() => {
          camera.position.copy(savedPosition);
          controls.target.copy(savedTarget);
        });
        setCameraProjection(camera, { far: savedFar });
        pngPoseRef.current = false;
      };
    },
    [camera, computeReelView, moveGuarded]
  );

  useEffect(() => {
    if (!reelViewRef) return undefined;
    const api = { applyPngPose: applyReelPngPose };
    reelViewRef.current = api;
    return () => {
      if (reelViewRef.current === api) reelViewRef.current = null;
    };
  }, [reelViewRef, applyReelPngPose]);

  // Renders the frame at animation time t and returns { ok, resized }. The
  // Reel pose is recomputed every step from the CURRENT model state, from the
  // camera and target captured at begin, so every frame frames the same way.
  //
  // The frame is only valid to read (VideoFrame / drawImage / toBlob) in the
  // SAME synchronous task as this call: the drawing buffer is not preserved
  // across tasks, and the next step overwrites it.
  const stepExport = useCallback(
    (t) => {
      const run = exportRunRef.current;
      const controls = controlsRef.current;
      if (!run || !Number.isFinite(t)) return { ok: false, resized: false };
      if (!controls) {
        finishExport({ restoreCamera: false, render: false });
        return { ok: false, resized: false };
      }
      try {
        const el = gl.domElement;
        if (el.width !== run.width || el.height !== run.height) {
          // A window resize made r3f resize the renderer. Re-assert the export
          // size (only in this case: setting it clears the canvas) and report
          // it so the caller can abort; no frame is drawn.
          gl.setPixelRatio(1);
          gl.setSize(run.width, run.height, false);
          setCameraProjection(camera, { aspect: run.width / run.height });
          run.resized = true;
          return { ok: false, resized: true };
        }
        const aspect = run.width / run.height;
        // The Reel framing (Slice E2 platform pose, or the plain reelPose),
        // shared with the portrait PNG export through computeReelView.
        const view = computeReelView({
          width: run.width,
          height: run.height,
          livePosition: run.saved.position.toArray(),
          liveTarget: run.saved.target.toArray(),
          pct: run.pct,
        });
        if (!view) throw new Error("Reel pose is not valid");
        setCameraProjection(camera, { aspect, far: view.far });
        moveGuarded(() => {
          camera.position.fromArray(view.position);
          controls.target.fromArray(view.target);
        });
        pivotRef.current.rotation.y = sampleAt(run.anim, t).modelSpinRad;
        invalidateShadowMap(gl);
        // Slice C2: cover-cropped backdrop for portrait / square frames, restored
        // in the same synchronous call (nothing to undo on abort or unmount).
        withBackdropCrop(scene, aspect, () => gl.render(scene, camera));
        return { ok: true, resized: false };
      } catch (err) {
        console.error("Export step failed:", err);
        finishExport({ restoreCamera: true, render: true });
        return { ok: false, resized: false };
      }
    },
    [gl, scene, camera, computeReelView, moveGuarded, finishExport]
  );

  // Any engine change that moves the camera or the model ends a running
  // preview, and aborts a running export (restoring its camera), first.
  const endAnimations = useCallback(() => {
    stopPreview();
    if (exportRunRef.current) finishExport({ restoreCamera: true, render: true });
  }, [stopPreview, finishExport]);

  // Register the animation commands with the animation store. On cleanup (the
  // stage unmounting on a product switch) a preview or export ends WITHOUT
  // restoring the old camera; an export still restores the renderer-owned
  // state (pixel ratio, buffer size, camera aspect, frame loop). Only the
  // registering owner unregisters (StrictMode safe).
  useEffect(() => {
    const unregister = animation.registerApi({
      play: startPreview,
      stop: () => stopPreview(),
      beginExport,
      stepExport,
      endExport: () => finishExport({ restoreCamera: true, render: true }),
      getCanvas: () => gl.domElement,
    });
    return () => {
      stopPreview({ restore: false });
      // Cleanup slice: an export this ends can never finish, so its Garage
      // lock goes now (the rail's finally releases it again, harmlessly);
      // otherwise the next stage's startLayout would be refused as locked.
      if (finishExport({ restoreCamera: false, render: false })) garageStore.setLocked(false);
      unregister();
    };
  }, [startPreview, stopPreview, beginExport, stepExport, finishExport, gl.domElement]);

  // Move the camera to a view and freeze its slider baseline, measured AFTER
  // the move (the controls may adjust it, e.g. the Top preset's pole clamp).
  // `baseline` is passed only when re-applying a saved view that carries one;
  // `live` is true only when restoring a saved live (unsaved custom) view.
  // `shotFit` defaults to the FROZEN `fit` — Decision 1 (frameDefault and the
  // saved/custom-view baseline path must never read anything else); a preset
  // click (Decision 2) is the only caller that passes liveFitRef.current.
  const applyView = useCallback(
    (position, target, baseId, baseline, live = false, shotFit = fit) => {
      moveGuarded(() => {
        camera.position.copy(position);
        camera.far = shotFit.distance * 10 + 10;
        camera.updateProjectionMatrix();
        camera.lookAt(target);
        controlsRef.current?.target.copy(target);
      });
      baselineRef.current =
        baseline ??
        getBaseline(
          camera.position.toArray(),
          (controlsRef.current?.target ?? target).toArray(),
          baseId,
          shotFit.center
        );
      liveRef.current = live;
      lastCentreRef.current = liveCentre();
      publish();
    },
    [camera, fit, moveGuarded, publish, liveCentre]
  );

  const frameDefault = useCallback(() => {
    // Product-shot angle: slightly below model center. The offset scales with
    // model HEIGHT (not camera distance) so it reads the same at any scale —
    // a hero angle for a bike, a level eye-line for an aircraft.
    const dy = -0.1 * fit.size.y;
    const horiz = Math.sqrt(fit.distance * fit.distance - dy * dy);
    const dirH = new THREE.Vector2(0.35, 1).normalize();
    applyView(
      new THREE.Vector3(
        fit.center.x + dirH.x * horiz,
        fit.center.y + dy,
        fit.center.z + dirH.y * horiz
      ),
      fit.center,
      null
    );
  }, [fit, applyView]);

  useEffect(() => {
    frameDefault();
  }, [frameDefault]);

  // Camera preset — move the camera to a product-shot viewpoint on request.
  // Only the camera changes: model transform, environment and selection are
  // left untouched. Framing is recomputed from the model bounds so presets
  // adapt to any model size (Coffee Bike or C172) automatically.
  // Mission 7.2 (Save Custom View): the transient id "custom" restores the
  // session's single saved view (exact camera position + orbit target)
  // through this same request flow — no second camera state system.
  // react-three-fiber's useThree() intentionally returns the live, mutable
  // three.js camera; positioning it imperatively (as here) is the standard
  // r3f pattern, not a violation the immutability rule is meant to catch.
  useEffect(() => {
    if (!cameraRequest) return undefined;
    const { id: requestId, view, frame } = cameraRequest;
    if (!requestId && !view && !frame) return undefined;
    // Backstop: a preset, saved view, session restore or reset ends a running
    // preview or export first (restoring its camera), then the request applies.
    endAnimations();
    // A saved live view (session restore): exact position, target, baseline.
    if (view) {
      applyView(
        new THREE.Vector3().fromArray(view.position),
        new THREE.Vector3().fromArray(view.target),
        view.baseId ?? null,
        view.baseline,
        true
      );
      return undefined;
    }
    // Frame default (Reset, or a restored session with no preset).
    if (!requestId) {
      frameDefault();
      return undefined;
    }
    let position;
    let target;
    let baseId = cameraRequest.id;
    let baseline;
    // Garage G5 (Decision 1) — the saved/custom-view path stays on the FROZEN
    // `fit`, exactly as before; only an actual preset click below swaps in the
    // live measurement.
    let shotFit = fit;
    if (cameraRequest.id === "custom") {
      if (!customView) return undefined;
      position = new THREE.Vector3().fromArray(customView.position);
      target = new THREE.Vector3().fromArray(customView.target);
      // A view saved from this stage carries the baseline it was reached from,
      // so slider percentages do not jump on save / restore.
      baseId = customView.baseId ?? "custom";
      if (customView.dist0 > 0) {
        baseline = {
          baseId,
          dist0: customView.dist0,
          elev0: customView.elev0,
          offset: customView.offset,
        };
      }
    } else {
      const preset = getCameraPreset(cameraRequest.id);
      if (!preset) return undefined;
      const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;
      // Garage G5 (Decision 2, the CAM-001 fix) — a preset click reads the
      // LIVE measurement, imperatively, never the frozen `fit` and never as an
      // effect dependency (liveFitRef changes without ever re-running this
      // effect).
      shotFit = liveFitRef.current ?? fit;
      ({ position, target } = computeCameraShot(
        shotFit,
        preset,
        product.frontAz ?? 0,
        aspect,
        FOV
      ));
    }
    applyView(position, target, baseId, baseline, false, shotFit);
    return undefined;
  }, [cameraRequest, customView, fit, gl, product.frontAz, applyView, frameDefault, endAnimations]);

  // Keep the stage's copy of App's lock in step and refresh the store. Declared
  // before the follow effect below so the follow sees the new value.
  useEffect(() => {
    lockRef.current = focusLock;
    publish();
  }, [focusLock, publish]);

  // Lock focus follow: when the model is transformed, move the orbit TARGET by
  // the same amount as the model centre; the camera itself is untouched. The
  // ordering is load-bearing: this effect is declared AFTER the camera-request
  // effect so that, in a commit that carries both a new transform and a view
  // request (session restore, Reset), applyView has already refreshed
  // lastCentreRef from the new transform and no stale delta is applied. The
  // centre is tracked even with Lock OFF so turning it ON never carries a
  // stale delta. Guarded: it neither marks the view live nor clears a preset.
  useEffect(() => {
    // Backstop: a transform change (session restore / reset / inspector) ends a
    // running preview or export first. A no-op when idle, every steady frame.
    endAnimations();
    const c = liveCentre();
    const last = lastCentreRef.current;
    lastCentreRef.current = c;
    const controls = controlsRef.current;
    if (!last || !controls || !lockRef.current) return;
    const d = c.clone().sub(last);
    if (d.length() <= 1e-9) return;
    moveGuarded(() => controls.target.add(d));
    publish();
  }, [transform, focusLock, fit, moveGuarded, liveCentre, publish, endAnimations]);

  // Mission 7.2 (Save Custom View) — exposes the LIVE camera position and
  // OrbitControls target so the App can snapshot the exact current view.
  // Read-only: saving never moves the camera or touches any other state.
  // Camera Studio: the Distance / Height commands. Each moves the real camera
  // (guarded) around the controls target, marks the view live and publishes.
  const moveAndMarkLive = useCallback(
    (position) => {
      if (!position) return false;
      endAnimations();
      moveGuarded(() => camera.position.fromArray(position));
      if (!liveRef.current) {
        liveRef.current = true;
        onViewLive?.(true);
      }
      publish();
      return true;
    },
    [camera, moveGuarded, publish, onViewLive, endAnimations]
  );

  useEffect(() => {
    if (!cameraApiRef) return undefined;
    const api = {
      readView: () => ({
        position: camera.position.toArray(),
        fov: camera.fov,
        target: controlsRef.current
          ? controlsRef.current.target.toArray()
          : [0, 0, 0],
        ...(baselineRef.current ?? {}),
      }),
      resetView: frameDefault,
      // Lock focus command (an event, not an effect on the prop, so mount,
      // product switch and session restore never retarget). Turning ON
      // re-centres the target on the model at the baseline offset and leaves
      // the camera where it is; turning OFF changes nothing in the camera.
      setLock: (next) => {
        const controls = controlsRef.current;
        if (!controls) return false;
        endAnimations();
        if (next && baselineRef.current) {
          const before = controls.target.clone();
          const offset = new THREE.Vector3().fromArray(baselineRef.current.offset);
          moveGuarded(() => controls.target.copy(liveCentre()).add(offset));
          if (controls.target.distanceTo(before) > 1e-6 && !liveRef.current) {
            liveRef.current = true;
            onViewLive?.(true);
          }
        }
        lastCentreRef.current = liveCentre();
        lockRef.current = next;
        publish();
        onLockChange?.(next);
        return true;
      },
      setDistancePct: (pct) => {
        const controls = controlsRef.current;
        const baseline = baselineRef.current;
        if (!controls || !baseline) return false;
        return moveAndMarkLive(
          cameraStudio.positionForDistance(
            camera.position.toArray(),
            controls.target.toArray(),
            (baseline.dist0 * pct) / 100
          )
        );
      },
      setHeightPct: (pct) => {
        const controls = controlsRef.current;
        const baseline = baselineRef.current;
        if (!controls || !baseline) return false;
        return moveAndMarkLive(
          cameraStudio.positionForHeight(
            camera.position.toArray(),
            controls.target.toArray(),
            baseline.elev0,
            pct / 100,
            controls.getAzimuthalAngle()
          )
        );
      },
    };
    cameraApiRef.current = api;
    return () => {
      if (cameraApiRef.current === api) {
        cameraApiRef.current = null;
        cameraStudio.reset();
      }
    };
  }, [
    cameraApiRef,
    camera,
    frameDefault,
    moveAndMarkLive,
    moveGuarded,
    liveCentre,
    publish,
    onViewLive,
    onLockChange,
    endAnimations,
  ]);

  // App owns viewLive (it clears it on every preset / saved view / product
  // switch / session change); keep the stage's copy and the store in step.
  useEffect(() => {
    liveRef.current = viewLive;
    publish();
  }, [viewLive, publish]);

  // OrbitControls fires "change" (at most once per frame, from update()) only
  // when the camera or target really moved. An unguarded one is a user move
  // (orbit / pan / wheel): the view is now live. No per-frame React state —
  // the store only notifies when a displayed value changed.
  const handleControlsChange = useCallback(() => {
    if (applyingRef.current === 0 && baselineRef.current && !liveRef.current) {
      liveRef.current = true;
      onViewLive?.(true);
    }
    publish();
  }, [publish, onViewLive]);

  // Mission 9 (Lighting Foundation) — shadow ortho frustum derived from the
  // model bounds and the FIXED key-light direction, never from the view
  // camera: the ground shadow stays put while orbiting and survives every
  // camera preset.
  // Garage G5 — the shadow frustum is one of the four things allowed to read
  // liveFit (React state, set once per refit()), so the shadow keeps its
  // proper size after a part edit or a whole-model transform.
  const shadowExtent = liveFit.footprintRadius * 2.4 + liveFit.size.y;
  const shadowFar = 20 + liveFit.distance * 2;

  // The shadow map renders ON DEMAND (autoUpdate off): only model, transform
  // or fit changes invalidate it, so orbit/zoom/preset frames never re-render
  // it — no flicker, no disappearing shadows, flat per-frame cost.
  useEffect(() => {
    setShadowMapOnDemand(gl, true);
    return () => {
      setShadowMapOnDemand(gl, false);
    };
  }, [gl]);

  useEffect(() => {
    invalidateShadowMap(gl);
  }, [gl, modelScene, transform, fit]);

  // Exposure slider drives the renderer's existing tone-mapping exposure.
  useEffect(() => {
    setExposure(gl, lighting.exposure);
  }, [gl, lighting.exposure]);

  // Model meshes cast and receive the key-light shadow.
  useEffect(() => {
    enableModelShadows(modelScene);
    invalidateShadowMap(gl);
  }, [modelScene, gl]);

  // R3F's Suspense boundary hides previously-committed scenes via
  // hideInstance(), which writes visible=false onto the model object itself.
  // With loader-cached GLBs the object outlives its hiding instance (the
  // instance is deleted when the next product commits, so unhideInstance
  // never runs) — and the next mount of the same product resurrects a
  // silently hidden model. While this stage renders this product, assert
  // ownership of its visibility every frame (a one-shot effect is not
  // enough: the hide can land asynchronously after mount).
  useFrame(() => {
    // See comment above: this write-back is the whole point, not an
    // accidental mutation.
    // eslint-disable-next-line react-hooks/immutability
    if (!modelScene.visible) modelScene.visible = true;
  });

  // Turntable preview: while it runs, turn the pivot group and ask for one
  // shadow update so the shadow turns with the model. Returns at once when
  // idle. Nothing here touches React state or the animation store.
  useFrame(() => {
    const run = animRunRef.current;
    if (!run) return;
    const t = ((performance.now() - run.start) / 1000) % run.anim.durationS;
    pivotRef.current.rotation.y = sampleAt(run.anim, t).modelSpinRad;
    invalidateShadowMap(gl);
  });

  // Raycast targets: the model's visible meshes, collected once per model.
  const modelMeshes = useMemo(() => {
    modelScene.updateMatrixWorld(true);
    return collectModelMeshes(modelScene);
  }, [modelScene]);

  // Selection outline — built imperatively from the collected mesh list (never
  // while walking live children arrays), parented to the transform group so it
  // follows transforms, and fully disposed on clear/unmount.
  useEffect(() => {
    if (!selected) return undefined;
    const parent = transformRef.current;
    if (!parent) return undefined;
    const shells = buildOutlineShells(modelMeshes, fit.center, parent);
    const group = new THREE.Group();
    group.name = OUTLINE_NAME;
    group.add(...shells);
    parent.add(group);
    return () => {
      parent.remove(group);
      for (const shell of shells) {
        shell.material.dispose();
      }
      // Shell geometry is shared with the model — intentionally not disposed.
    };
  }, [selected, modelMeshes, fit.center]);

  // Garage G3 — one part index per model (a part is one mesh the file separates).
  const partIndex = useMemo(() => buildPartIndex(modelScene), [modelScene]);

  // A fresh Garage layout per stage (a product switch remounts the stage), which
  // also clears any part selection.
  useEffect(() => {
    garageStore.startLayout({ assetId: product.id, name: product.name });
  }, [product.id, product.name]);

  // Garage G4 — one base pose per part mesh, keyed on the mesh itself so a
  // fresh WeakMap per stage mount means a product switch never carries a
  // stale base into the next model.
  const partBasesRef = useRef(new WeakMap());

  // Garage G7a — the pool lives exactly as long as this stage: a product
  // switch (or unmount) releases every object's GPU copies and drops it. An
  // add still loading when the stage goes sees stageAliveRef false and throws
  // its object away instead of adding it.
  useEffect(() => {
    stageAliveRef.current = true;
    const pool = objectPoolRef.current;
    return () => {
      stageAliveRef.current = false;
      if (loadRunRef.current) loadRunRef.current.aborted = true;
      for (const entry of pool.values()) {
        if (entry.anchor.parent) entry.anchor.parent.remove(entry.anchor);
        entry.attached = false;
        releaseObjectGpu(entry.resources);
      }
      pool.clear();
    };
  }, []);

  // Garage G7a — puts the scene's added objects in step with the layout: every
  // non-primary item is posed from its whole-object transform and hidden flag
  // and hung in the objects group; a pooled object no longer in the layout
  // (removed, or its add undone) is taken out and its GPU copies released. A
  // brand-new item adopts the object addObject() is committing right now.
  const syncObjects = useCallback((layout) => {
    const root = objectsRootRef.current;
    if (!root) return;
    const pool = objectPoolRef.current;
    const live = new Set();
    for (const item of layout ? layout.items : []) {
      if (item.primary) continue;
      const key = `${item.itemId}|${item.assetId}`;
      let entry = pool.get(key);
      let pending = pendingObjectRef.current;
      // Garage G7b — a layout load hands over several loaded objects at once;
      // each new item takes the first unadopted one of its asset.
      if (!entry && !(pending && !pending.adopted && pending.entry.assetId === item.assetId) && pendingListRef.current) {
        pending = pendingListRef.current.find((p) => !p.adopted && p.entry.assetId === item.assetId) || null;
      }
      if (!entry && pending && !pending.adopted && pending.entry.assetId === item.assetId) {
        entry = pending.entry;
        pending.adopted = true;
        entry.key = key;
        entry.itemId = item.itemId;
        entry.anchor.name = `garage-object:${item.itemId}`;
        entry.anchor.userData.sosGarageItemId = item.itemId;
        pool.set(key, entry);
      }
      if (!entry) continue;
      live.add(key);
      poseObject(entry, item);
      if (!entry.attached) {
        root.add(entry.anchor);
        entry.attached = true;
      }
    }
    for (const entry of pool.values()) {
      if (entry.attached && !live.has(entry.key)) {
        root.remove(entry.anchor);
        entry.attached = false;
        releaseObjectGpu(entry.resources);
      }
    }
  }, []);

  const attachedObject = useCallback((itemId) => {
    for (const entry of objectPoolRef.current.values()) {
      if (entry.attached && entry.itemId === itemId) return entry;
    }
    return null;
  }, []);

  // Decision 2 — main product (its visible meshes) + every VISIBLE added object.
  const sceneTriangles = useCallback(() => {
    const main = countTriangles(modelScene, true);
    let added = 0;
    const layout = garageStore.getLayout();
    for (const item of layout ? layout.items : []) {
      if (item.primary || item.hidden) continue;
      const entry = objectPoolRef.current.get(`${item.itemId}|${item.assetId}`);
      if (entry) added += entry.triangles;
    }
    return { main, added, total: main + added };
  }, [modelScene]);

  // Decision 4 — what a new object must not overlap, in the pivot offset's
  // frame (where the model and the objects both hang): the main product's
  // visible union and every added object's box, hidden ones included (they
  // may be shown again).
  const occupiedBoxes = useCallback(() => {
    const boxes = [];
    const main = unionBounds(adaptObject3D(modelScene));
    if (main) boxes.push({ min: main.min, max: main.max });
    else {
      const half = fit.size.clone().multiplyScalar(0.5);
      boxes.push({ min: fit.center.clone().sub(half).toArray(), max: fit.center.clone().add(half).toArray() });
    }
    for (const entry of objectPoolRef.current.values()) {
      if (!entry.attached) continue;
      entry.anchor.updateMatrix();
      const u = unionBounds(adaptObject3D(entry.inner), { rootMatrix: entry.anchor.matrix.toArray() });
      if (u) boxes.push({ min: u.min, max: u.max });
    }
    return boxes;
  }, [modelScene, fit]);

  // Decisions 1-4 — loads a built-in product or an imported asset as a NEW
  // object (its own parse), checks the count and the triangle budget, places
  // it beside the main product on the floor and adds it with ONE
  // garageStore.addItem (one undo step). Anything refused or failed releases
  // the loaded object and changes nothing. Resolves { ok, reason?, message }.
  const addObject = useCallback(
    async (assetId) => {
      const refuse = (reason, message) => ({ ok: false, reason, message });
      const addedNow = () => {
        const l = garageStore.getLayout();
        return l ? l.items.filter((i) => !i.primary).length : 0;
      };
      if (!garageStore.getLayout()) return refuse("no-layout", "No product is loaded yet.");
      // Garage G7b — a new add cancels a layout load still in progress.
      if (loadRunRef.current) loadRunRef.current.aborted = true;
      const count = sceneObjects.checkAddCount(addedNow());
      if (!count.ok) return count;
      if (addingObjectRef.current) return refuse("busy", "Another object is still loading.");
      const asset = PRODUCTS.find((p) => p.id === assetId && !p.placeholder);
      if (!asset || !asset.modelPath) return refuse("unknown-asset", "That object is not in the library.");
      // A file whose weight is already known is refused before loading it again.
      const known = knownTrianglesRef.current.get(asset.modelPath);
      if (known !== undefined) {
        const pre = sceneObjects.checkBudget(sceneTriangles().total, known);
        if (!pre.ok) return pre;
      }
      addingObjectRef.current = true;
      let scene;
      try {
        scene = await loadObjectScene(asset.modelPath);
      } catch (err) {
        console.warn(`Garage: could not load "${asset.name}".`, err);
        return refuse("load-failed", `Could not load "${asset.name}"; nothing was added.`);
      } finally {
        addingObjectRef.current = false;
      }
      const entry = makeObjectEntry(assetId, asset.modelPath, scene);
      const discard = () => releaseObjectGpu(entry ? entry.resources : objectResources(scene));
      if (!stageAliveRef.current) {
        discard();
        return refuse("stage-gone", "The product changed while loading; nothing was added.");
      }
      if (!entry) {
        discard();
        return refuse("empty", `"${asset.name}" has nothing to show; nothing was added.`);
      }
      knownTrianglesRef.current.set(asset.modelPath, entry.triangles);
      // Both rules again, against the scene as it is now.
      const check = sceneObjects.checkAdd({
        addedCount: addedNow(),
        currentTriangles: sceneTriangles().total,
        newTriangles: entry.triangles,
      });
      if (!check.ok) {
        discard();
        return check;
      }
      const placed = sceneObjects.placeObject({
        occupied: occupiedBoxes(),
        objectSize: entry.size,
        floorY: fit.floorY,
        frontAz: product.frontAz ?? 0,
      });
      if (!placed.ok) {
        discard();
        return refuse("placement", "Could not find a free place for this object; nothing was added.");
      }
      const pending = { entry, adopted: false };
      pendingObjectRef.current = pending;
      let r;
      try {
        const [x, y, z] = placed.position;
        r = garageStore.addItem({ assetId, transform: { x, y, z, rx: 0, ry: 0, rz: 0, s: 1 } });
      } finally {
        pendingObjectRef.current = null;
      }
      // Not adopted: the pool already holds this very item (same id, same
      // file) from before an undo, so the fresh copy is surplus.
      if (!pending.adopted) discard();
      if (!r.ok) return refuse(r.reason, "The object could not be added.");
      return {
        ok: true,
        itemId: r.itemId,
        total: check.total,
        warn: check.warn,
        message: check.warn ? `Added "${asset.name}". ${check.message}` : `Added "${asset.name}".`,
      };
    },
    [fit, product.frontAz, sceneTriangles, occupiedBoxes]
  );

  // Garage G7b — the main product's visible triangles as they WILL be once
  // `parts` (a layout's per-part overrides) replaces the current ones: a part
  // mesh is visible by its override's flag, else by its recorded base; every
  // other node by its own flag (the root always counts, as the stage keeps it
  // visible every frame). Counted the same way as countTriangles.
  const mainTrianglesFor = useCallback(
    (parts) => {
      const bases = partBasesRef.current;
      let n = 0;
      const visit = (obj, isRoot) => {
        let visible = isRoot ? true : obj.visible;
        const id = partIndex.ok ? partIndex.byRef.get(obj) : undefined;
        if (id !== undefined) {
          const ov = Object.prototype.hasOwnProperty.call(parts, id) ? parts[id] : undefined;
          visible = ov && typeof ov.visible === "boolean" ? ov.visible : ensurePartBase(obj, bases).visible;
        }
        if (!visible) return;
        if (obj.isMesh && obj.geometry) {
          const g = obj.geometry;
          const pos = g.attributes && g.attributes.position;
          n += Math.floor((g.index ? g.index.count : pos ? pos.count : 0) / 3);
        }
        for (const child of obj.children) visit(child, false);
      };
      visit(modelScene, true);
      return n;
    },
    [modelScene, partIndex]
  );

  // Garage G7b — applies a formatVersion 2 layout: `parts` (the main product's
  // resolved overrides) and `specs` ([{ assetId, name, transform, hidden }],
  // the objects whose assets exist here) REPLACE the current parts and added
  // objects in ONE garageStore.loadLayoutItems commit (one undo step).
  // Owner conditions: the max-5 rule is checked before anything loads; the
  // objects load one at a time (each its own parse, as addObject does) and
  // the running total (main visible + every visible object loaded so far) is
  // checked after each — the first overflow releases everything loaded and
  // commits nothing; a product change, or another add or load starting,
  // aborts the same way; a file that fails to load is skipped with its reason.
  // Resolves { ok:true, changed, skipped:[{ assetId, name, reason }], total }
  // or { ok:false, reason, message }.
  const loadObjects = useCallback(
    async (parts, specs) => {
      const refuse = (reason, message) => ({ ok: false, reason, message });
      const layoutNow = garageStore.getLayout();
      const primary = layoutNow ? layoutNow.items.find((i) => i.primary) : null;
      if (!primary) return refuse("no-layout", "No product is loaded yet.");
      if (!isObj(parts) || !Array.isArray(specs)) return refuse("bad-input", "This layout is not valid and was not applied.");
      if (specs.length > sceneObjects.OBJECT_LIMITS.MAX_ADDED) return refuse("max-objects", layoutLibrary.maxObjectsMessage(specs.length));
      if (addingObjectRef.current) return refuse("busy", "Another object is still loading; the layout was not loaded.");
      if (loadRunRef.current) loadRunRef.current.aborted = true; // the newer load wins
      const run = { aborted: false };
      loadRunRef.current = run;
      const loaded = []; // [{ spec, entry }]
      const skipped = [];
      const releaseAll = () => {
        for (const l of loaded) releaseObjectGpu(l.entry.resources);
        loaded.length = 0;
      };
      const gone = () => run.aborted || !stageAliveRef.current;
      const aborted = () => {
        releaseAll();
        return refuse(
          "aborted",
          "Layout load cancelled: the product changed, or another add or load started. Nothing was changed."
        );
      };
      try {
        let running = mainTrianglesFor(parts);
        for (const spec of specs) {
          const label = typeof spec.name === "string" && spec.name ? spec.name : spec.assetId;
          const asset = PRODUCTS.find((p) => p.id === spec.assetId && !p.placeholder);
          if (!asset || !asset.modelPath) {
            skipped.push({ assetId: spec.assetId, name: label, reason: "missing" });
            continue;
          }
          const counts = spec.hidden !== true;
          // A file whose weight is already known is refused before loading it.
          const known = knownTrianglesRef.current.get(asset.modelPath);
          if (counts && known !== undefined) {
            const pre = layoutLibrary.loadBudgetStep(running, known);
            if (!pre.ok) {
              releaseAll();
              return pre;
            }
          }
          let scene;
          try {
            scene = await loadObjectScene(asset.modelPath);
          } catch (err) {
            if (gone()) return aborted();
            console.warn(`Garage: could not load "${label}" for the layout.`, err);
            skipped.push({ assetId: spec.assetId, name: label, reason: "load-failed" });
            continue;
          }
          const entry = makeObjectEntry(spec.assetId, asset.modelPath, scene);
          if (gone()) {
            releaseObjectGpu(entry ? entry.resources : objectResources(scene));
            return aborted();
          }
          if (!entry) {
            releaseObjectGpu(objectResources(scene));
            skipped.push({ assetId: spec.assetId, name: label, reason: "empty" });
            continue;
          }
          knownTrianglesRef.current.set(asset.modelPath, entry.triangles);
          if (counts) {
            const step = layoutLibrary.loadBudgetStep(running, entry.triangles);
            if (!step.ok) {
              releaseObjectGpu(entry.resources);
              releaseAll();
              return step;
            }
            running = step.total;
          }
          loaded.push({ spec, entry });
        }
        if (gone()) return aborted();
        const pending = loaded.map((l) => ({ entry: l.entry, adopted: false }));
        pendingListRef.current = pending;
        let r;
        try {
          r = garageStore.loadLayoutItems(
            primary.itemId,
            parts,
            loaded.map((l) => ({ assetId: l.spec.assetId, transform: l.spec.transform, hidden: l.spec.hidden === true }))
          );
        } finally {
          pendingListRef.current = null;
        }
        // Not adopted: the pool already holds that very item (same id, same
        // file), or nothing was committed — the fresh copy is surplus.
        for (const p of pending) if (!p.adopted) releaseObjectGpu(p.entry.resources);
        loaded.length = 0;
        if (!r.ok) return refuse(r.reason, "This layout could not be applied; nothing was changed.");
        return { ok: true, changed: r.changed === true, skipped, total: running };
      } finally {
        if (loadRunRef.current === run) loadRunRef.current = null;
      }
    },
    [mainTrianglesFor]
  );

  // Garage G4 — imperative live transform. On every real layout change (never
  // on a plain selection change, so a click never re-walks this) each part
  // mesh is set to its base pose composed with its current override (or reset
  // to base when the override is gone), via compose.js's own functions —
  // never a hand-rolled equivalent. Garage G5 — refit() runs at the end of the
  // SAME commit-triggered call (reusing this subscription rather than adding
  // a second one), after every mesh already has its new pose, so the world
  // and local unions it measures are never one commit stale.
  // See the modelScene.visible write-back above: mutating a mesh reached
  // through a memoized part index is the same deliberate imperative-three.js
  // pattern, not an accidental mutation of the memo itself.
  // Garage G7a — the same commit also syncs the added objects (syncObjects),
  // still before refit(), so the measured union always includes them; a model
  // without a part index still gets its objects synced and refit.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    const bases = partBasesRef.current;
    const parts = partIndex.ok ? partIndex.parts : [];
    let lastRevision = -1;
    const applyOverrides = () => {
      const snap = garageStore.getSnapshot();
      if (snap.revision === lastRevision) return;
      lastRevision = snap.revision;
      const layout = garageStore.getLayout();
      const item = layout ? layout.items.find((i) => i.itemId === "i0") : null;
      const overrides = item ? item.parts : {};
      // eslint-disable-next-line react-hooks/immutability
      for (const part of parts) {
        const mesh = part.ref;
        const base = ensurePartBase(mesh, bases);
        const ov = Object.prototype.hasOwnProperty.call(overrides, part.id) ? overrides[part.id] : undefined;
        const pose = ov ? applyPartOverride(base, ov) : resetToBase(base);
        if (pose) {
          mesh.position.fromArray(pose.pos);
          mesh.quaternion.fromArray(pose.quat);
          mesh.scale.fromArray(pose.scale);
        }
        mesh.visible = ov && typeof ov.visible === "boolean" ? ov.visible : base.visible;
        // Garage G6 — same commit, same loop: a part with no material override
        // never clones (rule 4); one that does gets authoritative-copy fields.
        applyPartMaterial(mesh, base, ov && isObj(ov.material) ? ov.material : undefined);
      }
      syncObjects(layout);
      refit();
    };
    applyOverrides();
    return garageStore.subscribe(applyOverrides);
  }, [partIndex, refit, syncObjects]);

  // Part overlay — imperative, rebuilt from a Garage store subscription (never
  // React state), parented to the same group as the whole-model outline. Hidden
  // by setOverlaysHidden (preview, MP4) and around the PNG render (CaptureBridge).
  useEffect(() => {
    const parent = transformRef.current;
    if (!parent) return undefined;
    let group = null;
    let shells = [];
    let lastKey = null;
    const teardown = () => {
      if (group) parent.remove(group);
      for (const shell of shells) shell.material.dispose();
      group = null;
      shells = [];
    };
    // Garage G4 — a hidden part never shows an outline shell even while still
    // selected, and the shell reappears the moment it is un-hidden; the key
    // below includes the revision (not just the selection array reference) so
    // a hide/un-hide on an already-selected part is caught, not only a
    // selection change.
    const rebuild = () => {
      const snap = garageStore.getSnapshot();
      const selection = snap.selection;
      // Garage G7a — the key carries the item id too: two added objects share
      // the same whole-object part id.
      const key = `${snap.revision}|${selection.map((e) => `${e.itemId}:${e.partId}`).join(",")}`;
      if (key === lastKey) return;
      lastKey = key;
      teardown();
      const meshes = [];
      for (const entry of selection) {
        if (entry.itemId === PRIMARY_ITEM_ID) {
          const mesh = partIndex.ok ? partIndex.byId.get(entry.partId) : undefined;
          if (mesh && mesh.geometry && mesh.visible) meshes.push(mesh);
        } else {
          // Garage G7a — an added object is outlined whole (Decision 5).
          const obj = attachedObject(entry.itemId);
          if (obj && obj.anchor.visible) {
            obj.scene.traverseVisible((m) => {
              if (m.isMesh && m.geometry) meshes.push(m);
            });
          }
        }
      }
      if (meshes.length === 0) return;
      shells = buildPartShells(meshes, parent);
      group = new THREE.Group();
      group.name = OVERLAY_NAME;
      group.visible = !animRunRef.current && !exportRunRef.current;
      group.add(...shells);
      parent.add(group);
    };
    rebuild();
    const unsubscribe = garageStore.subscribe(rebuild);
    return () => {
      unsubscribe();
      teardown();
    };
  }, [partIndex, fit.center, attachedObject]);

  // Garage M0 — the measure tool's line + label: two small markers, a line
  // between them once both are picked, and a distance label at the midpoint.
  // A scene-ROOT group (like the gizmo helper), never a child of
  // transformRef: its two points are literal world positions from the click
  // and must not inherit the whole-model Transform panel a second time.
  // Rebuilt on every points/unit/calibration change — measure.js's store
  // covers all three in one snapshot, so one subscription is enough.
  useEffect(() => {
    const group = new THREE.Group();
    group.name = MEASURE_NAME;
    group.visible = false;
    scene.add(group);
    const markerGeo = new THREE.SphereGeometry(0.015, 12, 8);
    const markerMat = new THREE.MeshBasicMaterial({ color: SELECT_COLOR, toneMapped: false, depthTest: false });
    const disposeChildren = () => {
      while (group.children.length) {
        const child = group.children.pop();
        if (child.geometry && child.geometry !== markerGeo) child.geometry.dispose();
        if (child.material && child.material !== markerMat) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    };
    const rebuild = () => {
      disposeChildren();
      const snap = measure.getSnapshot();
      group.visible = !!snap.pointA;
      if (snap.pointA) {
        const a = new THREE.Mesh(markerGeo, markerMat);
        a.position.fromArray(snap.pointA);
        a.renderOrder = 999;
        group.add(a);
      }
      if (snap.pointB) {
        const b = new THREE.Mesh(markerGeo, markerMat);
        b.position.fromArray(snap.pointB);
        b.renderOrder = 999;
        group.add(b);
      }
      if (snap.pointA && snap.pointB) {
        const a = new THREE.Vector3().fromArray(snap.pointA);
        const b = new THREE.Vector3().fromArray(snap.pointB);
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([a, b]),
          new THREE.LineBasicMaterial({ color: SELECT_COLOR, toneMapped: false, depthTest: false })
        );
        line.renderOrder = 999;
        group.add(line);

        // Owner decision 7: the label always uses the MAIN product's
        // calibration. World distance -> main model units divides out only
        // the old whole-model Transform panel's uniform scale (the pivot
        // groups above modelScene never scale, so they never enter here —
        // the same reasoning as modelUnitBox above).
        const worldDistance = a.distanceTo(b);
        const modelUnitsDistance = transform.s > 0 ? worldDistance / transform.s : worldDistance;
        const storage = typeof localStorage === "undefined" ? null : localStorage;
        const calibration = measure.readCalibration(storage, product.id);
        const label = makeLabelSprite(measure.formatDistance(modelUnitsDistance, calibration, snap.unit));
        label.position.copy(a).add(b).multiplyScalar(0.5);
        label.position.y += 0.03;
        label.renderOrder = 999;
        group.add(label);
      }
    };
    rebuild();
    const unsubscribe = measure.subscribe(rebuild);
    return () => {
      unsubscribe();
      disposeChildren();
      markerGeo.dispose();
      markerMat.dispose();
      scene.remove(group);
    };
  }, [scene, transform.s, product.id]);

  // The rail's part read-out, plus (Garage G4) the numeric-field read/commit
  // path. One registration, extended — never a second registerApi call.
  useEffect(
    () =>
      garageMode.registerApi({
        describePart: (partId) => {
          const mesh = partIndex.ok ? partIndex.byId.get(partId) : undefined;
          return mesh ? describeMesh(mesh, partId, modelScene) : null;
        },
        // Garage G4 — the part's current effective transform (its recorded
        // base pose composed with any existing override), in the numeric
        // fields' units: metres, degrees (Euler XYZ), a plain scale factor.
        getPartTransform: (itemId, partId) => {
          if (!partIndex.ok) return null;
          const mesh = partIndex.byId.get(partId);
          if (!mesh) return null;
          const base = ensurePartBase(mesh, partBasesRef.current);
          const layout = garageStore.getLayout();
          const item = layout ? layout.items.find((i) => i.itemId === itemId) : null;
          const ov = item && Object.prototype.hasOwnProperty.call(item.parts, partId) ? item.parts[partId] : undefined;
          const pose = ov ? applyPartOverride(base, ov) : resetToBase(base);
          if (!pose) return null;
          const q = new THREE.Quaternion(pose.quat[0], pose.quat[1], pose.quat[2], pose.quat[3]);
          const euler = new THREE.Euler().setFromQuaternion(q, "XYZ");
          return {
            pos: pose.pos.slice(),
            rot: [
              THREE.MathUtils.radToDeg(euler.x),
              THREE.MathUtils.radToDeg(euler.y),
              THREE.MathUtils.radToDeg(euler.z),
            ],
            scale: pose.scale.slice(),
            hidden: !(ov && typeof ov.visible === "boolean" ? ov.visible : base.visible),
            overridden: !!ov,
          };
        },
        // Garage G4 — converts an absolute { pos?, rot?(deg), scale? } target
        // (the rail always sends full 3-vectors, merging any unchanged axes
        // itself) into an override delta from the part's recorded base and
        // commits it via garageStore.setPartOverride. Refuses (returns null,
        // no store write) unless (itemId, partId) is exactly the current
        // single selection, so a stale caller can never edit the wrong part.
        commitPartEdit: (itemId, partId, patch) => {
          if (!partIndex.ok || !isObj(patch)) return null;
          const single = garageMode.singleSelectedPart(garageStore.getSnapshot());
          if (!single || single.itemId !== itemId || single.partId !== partId) return null;
          const mesh = partIndex.byId.get(partId);
          if (!mesh) return null;
          const base = ensurePartBase(mesh, partBasesRef.current);
          const ovPatch = {};
          if (Array.isArray(patch.pos) && patch.pos.length === 3 && patch.pos.every(Number.isFinite)) {
            ovPatch.pos = [patch.pos[0] - base.pos[0], patch.pos[1] - base.pos[1], patch.pos[2] - base.pos[2]];
          }
          if (Array.isArray(patch.rot) && patch.rot.length === 3 && patch.rot.every(Number.isFinite)) {
            const desired = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(degToRad(patch.rot[0]), degToRad(patch.rot[1]), degToRad(patch.rot[2]), "XYZ")
            );
            const baseQ = new THREE.Quaternion(base.quat[0], base.quat[1], base.quat[2], base.quat[3]);
            const ovQ = desired.multiply(baseQ.invert());
            ovPatch.quat = [ovQ.x, ovQ.y, ovQ.z, ovQ.w];
          }
          if (Array.isArray(patch.scale) && patch.scale.length === 3 && patch.scale.every(Number.isFinite)) {
            // Same 0.05 floor as the whole-model panel's uniform-scale field,
            // applied to the absolute value the rail shows before dividing
            // out the base scale to get the override's own multiplier.
            ovPatch.scale = [0, 1, 2].map((i) =>
              base.scale[i] !== 0 ? Math.max(0.05, patch.scale[i]) / base.scale[i] : 1
            );
          }
          if (Object.keys(ovPatch).length === 0) return null;
          return garageStore.setPartOverride(itemId, partId, ovPatch);
        },
        // Garage G6 — the part's current effective colour override, composed
        // as plain UI values: color as hex, metalness/roughness/opacity as
        // numbers (0..1), ignoreVertexColors as boolean, defaulting to the
        // ORIGINAL material's own values wherever no override field exists —
        // never to whatever the live clone (if any) currently holds.
        getPartMaterial: (itemId, partId) => {
          if (!partIndex.ok) return null;
          const mesh = partIndex.byId.get(partId);
          if (!mesh) return null;
          const base = ensurePartBase(mesh, partBasesRef.current);
          const original = base.material;
          if (!original) return null;
          const layout = garageStore.getLayout();
          const item = layout ? layout.items.find((i) => i.itemId === itemId) : null;
          const part = item && Object.prototype.hasOwnProperty.call(item.parts, partId) ? item.parts[partId] : undefined;
          const ov = part && isObj(part.material) ? part.material : undefined;
          return {
            color: ov && typeof ov.color === "string" ? ov.color : hexOfColor(original.color),
            metalness:
              ov && typeof ov.metalness === "number" ? ov.metalness : typeof original.metalness === "number" ? original.metalness : 0,
            roughness:
              ov && typeof ov.roughness === "number" ? ov.roughness : typeof original.roughness === "number" ? original.roughness : 1,
            opacity: ov && typeof ov.opacity === "number" ? ov.opacity : typeof original.opacity === "number" ? original.opacity : 1,
            ignoreVertexColors: ov && typeof ov.ignoreVertexColors === "boolean" ? ov.ignoreVertexColors : false,
            hasVertexColors: original.vertexColors === true,
            overridden: !!ov,
          };
        },
        // Garage G6 — commits a partial colour patch as one material override
        // (authoritative-copy: a value given replaces, `null` clears just
        // that field, keeping every other field). Same single-selection
        // guard as commitPartEdit — no mesh math needed here since colour
        // overrides are never base-relative.
        commitPartMaterial: (itemId, partId, patch) => {
          if (!partIndex.ok || !isObj(patch)) return null;
          const single = garageMode.singleSelectedPart(garageStore.getSnapshot());
          if (!single || single.itemId !== itemId || single.partId !== partId) return null;
          return garageStore.setPartOverride(itemId, partId, { material: patch });
        },
        // Garage G7a — added objects, as whole objects only (Decision 5).
        addObject,
        // Garage G7b — a formatVersion 2 layout's parts + objects, one commit.
        loadObjects,
        // The running triangle counter (Decision 2), plus its level/line.
        getSceneTriangles: () => {
          const t = sceneTriangles();
          return { ...t, level: sceneObjects.budgetLevel(t.total), message: sceneObjects.budgetMessage(t.total) };
        },
        // [{ itemId, assetId, name, hidden, triangles, transform }] in layout order.
        listObjects: () => {
          const layout = garageStore.getLayout();
          return (layout ? layout.items : [])
            .filter((i) => !i.primary)
            .map((i) => {
              const entry = objectPoolRef.current.get(`${i.itemId}|${i.assetId}`);
              const asset = PRODUCTS.find((p) => p.id === i.assetId);
              return {
                itemId: i.itemId,
                assetId: i.assetId,
                name: asset ? asset.name : i.assetId,
                hidden: i.hidden === true,
                triangles: entry ? entry.triangles : null,
                transform: { ...i.transform },
              };
            });
        },
        // Garage M0 — an added object's size in "model units": its own local
        // box (measured once, in makeObjectEntry, before the anchor/inner
        // wrapper groups) times its own Garage scale (item.transform.s, the
        // object's one uniform scale field) — the object equivalent of
        // describeMesh's modelUnitBox, and same reasoning: excludes the
        // pivot/turntable groups the object also hangs in (translation only).
        getObjectModelSize: (itemId) => {
          const layout = garageStore.getLayout();
          const item = layout ? layout.items.find((i) => i.itemId === itemId && !i.primary) : null;
          if (!item) return null;
          const entry = objectPoolRef.current.get(`${item.itemId}|${item.assetId}`);
          if (!entry) return null;
          const s = item.transform.s;
          return { x: entry.size[0] * s, y: entry.size[1] * s, z: entry.size[2] * s };
        },
        // Showing a hidden object brings its triangles back, so the same limit
        // applies; hiding is always allowed. One garageStore command either way.
        setObjectHidden: (itemId, hidden) => {
          const layout = garageStore.getLayout();
          const item = layout ? layout.items.find((i) => i.itemId === itemId && !i.primary) : null;
          if (!item) return { ok: false, reason: "unknown-item", message: "That object is no longer in the scene." };
          if (!hidden && item.hidden) {
            const entry = objectPoolRef.current.get(`${item.itemId}|${item.assetId}`);
            const c = sceneObjects.checkUnhide({
              currentTriangles: sceneTriangles().total,
              objectTriangles: entry ? entry.triangles : 0,
            });
            if (!c.ok) return c;
          }
          const r = garageStore.setItemHidden(itemId, hidden === true);
          return r.ok ? { ok: true } : { ok: false, reason: r.reason, message: "The object could not be changed." };
        },
      }),
    [partIndex, modelScene, addObject, loadObjects, sceneTriangles]
  );

  // Garage G11 — the TransformControls gizmo. It exists only while exactly one
  // SHOWN thing is selected (a part with Parts on, or an added object) and is
  // disposed the moment that stops, so it leaves nothing on the GPU. Its
  // helper hangs at the scene root (outside transformRef, so refit() never
  // measures it) under GIZMO_NAME, hidden and disabled while the preview or an
  // export runs and hidden around every PNG render (CaptureBridge).
  // One drag = one garageStore gesture: nothing is written to the store while
  // the handle is held (TransformControls moves the Object3D; gizmo.js turns
  // that into field values and the preview shows exactly those), and on
  // release the result is committed with the SAME command the numeric fields
  // use, inside the gesture, then the gesture closes — one undo step, one
  // store notification, so the G5 refit runs once, after the drag. Esc during
  // a drag puts the object's own saved pose back and cancels the gesture: no
  // undo entry. OrbitControls is disabled only while a handle is held; the
  // camera is never written here. No React state anywhere in this path.
  useEffect(() => {
    let tc = null;
    let helper = null;
    let target = null; // { kind, itemId, partId, obj }
    let drag = null; // { target, mode, start, saved, fields }
    const session = gizmo.createDragSession(garageStore);

    const hiddenNow = () => !!(animRunRef.current || exportRunRef.current);

    const setPartOverlayVisible = (visible) => {
      const overlay = transformRef.current?.getObjectByName(OVERLAY_NAME);
      if (overlay) overlay.visible = visible;
    };

    // Ends a drag in the engine: the orbit comes back (unless the preview or
    // an export, which own it then, is running) and the part overlay shows
    // again (a commit rebuilds it; a no-op or cancel keeps the old one).
    const releaseDrag = () => {
      drag = null;
      if (controlsRef.current && !hiddenNow()) controlsRef.current.enabled = true;
      setPartOverlayVisible(!hiddenNow());
      applySettings();
    };

    const restoreSaved = (d) => {
      d.target.obj.position.copy(d.saved.position);
      d.target.obj.quaternion.copy(d.saved.quaternion);
      d.target.obj.scale.copy(d.saved.scale);
      invalidateShadowMap(gl);
    };

    // Esc, or anything that takes the gizmo away mid-drag: exact pre-drag
    // pose, no undo entry. pointerUp(null) ends TransformControls' own drag
    // (its mouseUp then finds no drag and does nothing).
    const cancelDrag = () => {
      const d = drag;
      if (!d) return;
      releaseDrag();
      restoreSaved(d);
      session.cancel();
      if (tc) tc.pointerUp(null);
    };

    // The values the numeric fields show right now, in their units.
    const startFields = (t) => {
      if (t.kind === "part") {
        const pt = garageMode.getPartTransform(t.itemId, t.partId);
        return pt ? { pos: pt.pos, rot: pt.rot, scale: pt.scale } : null;
      }
      const layout = garageStore.getLayout();
      const item = layout ? layout.items.find((i) => i.itemId === t.itemId) : null;
      return item ? gizmo.fieldsFromItemTransform(item.transform) : null;
    };

    const onMouseDown = () => {
      gizmoPressRef.current = true;
      if (!target || drag) return;
      const start = startFields(target);
      const begun = start && !hiddenNow() ? session.begin() : null;
      if (!begun || !begun.ok) {
        // Locked, or nothing to edit: the press is swallowed, nothing moves.
        if (tc) tc.pointerUp(null);
        return;
      }
      const obj = target.obj;
      drag = {
        target,
        mode: tc.mode,
        start,
        saved: { position: obj.position.clone(), quaternion: obj.quaternion.clone(), scale: obj.scale.clone() },
        fields: null,
      };
      if (controlsRef.current) controlsRef.current.enabled = false;
      setPartOverlayVisible(false); // its shells were built for the old pose
    };

    // Mid-drag: what the fields WILL show, applied to the object so the view
    // matches the commit (snap, uniform scale and the 0.05 floor included).
    const onObjectChange = () => {
      const d = drag;
      if (!d) return;
      const obj = d.target.obj;
      const fields = gizmo.resolveDrag({
        kind: d.target.kind,
        mode: d.mode,
        start: d.start,
        live: { pos: obj.position.toArray(), quat: obj.quaternion.toArray(), scale: obj.scale.toArray() },
        snap: gizmo.getSnapshot().snap,
      });
      if (!fields) return;
      d.fields = fields;
      const pose = gizmo.poseFromFields(fields);
      obj.position.fromArray(pose.pos);
      obj.quaternion.fromArray(pose.quat);
      obj.scale.fromArray(pose.scale);
      invalidateShadowMap(gl);
    };

    const onMouseUp = () => {
      const d = drag;
      if (!d) return;
      releaseDrag();
      const t = d.target;
      const result = session.finish(() => {
        if (!d.fields) return null;
        if (t.kind === "part") return garageMode.commitPartEdit(t.itemId, t.partId, gizmo.partPatchFromFields(d.fields, d.mode));
        return garageStore.setItemTransform(t.itemId, gizmo.itemPatchFromFields(d.fields, d.mode));
      });
      // Changed: the store's commit has already re-posed the object from the
      // layout. Unchanged: put the exact saved pose back (the preview wrote
      // values converted through degrees).
      if (!result.changed) restoreSaved(d);
    };

    const applySettings = () => {
      if (!tc || drag) return;
      const s = gizmo.getSnapshot();
      if (tc.mode !== s.mode) tc.setMode(s.mode);
      const space = gizmo.effectiveSpace(s.mode, s.space);
      if (tc.space !== space) tc.setSpace(space);
    };

    const destroy = () => {
      if (!tc) return;
      cancelDrag();
      tc.detach();
      if (helper && helper.parent) helper.parent.remove(helper);
      tc.dispose(); // disconnects its listeners and frees the helper's geometry and materials
      tc = null;
      helper = null;
      target = null;
      gizmoRef.current = null;
    };

    const create = () => {
      tc = new TransformControls(camera, gl.domElement);
      helper = tc.getHelper();
      helper.name = GIZMO_NAME;
      tc.addEventListener("mouseDown", onMouseDown);
      tc.addEventListener("objectChange", onObjectChange);
      tc.addEventListener("mouseUp", onMouseUp);
      scene.add(helper);
      gizmoRef.current = tc;
    };

    // The one shown thing the selection names, as { kind, itemId, partId, obj }.
    const resolveTarget = () => {
      const t = gizmo.gizmoTarget({
        pickMode: garageMode.getSnapshot().pickMode,
        selection: garageStore.getSnapshot().selection,
        primaryItemId: PRIMARY_ITEM_ID,
        objectPartId: sceneObjects.OBJECT_PART_ID,
      });
      if (!t) return null;
      if (t.kind === "part") {
        const mesh = partIndex.ok ? partIndex.byId.get(t.partId) : undefined;
        if (!mesh || !mesh.parent) return null;
        const pt = garageMode.getPartTransform(t.itemId, t.partId);
        if (!pt || pt.hidden) return null;
        return { ...t, obj: mesh };
      }
      const entry = attachedObject(t.itemId);
      if (!entry || !entry.anchor.parent) return null;
      const layout = garageStore.getLayout();
      const item = layout ? layout.items.find((i) => i.itemId === t.itemId) : null;
      if (!item || item.hidden === true) return null;
      return { ...t, obj: entry.anchor };
    };

    const sync = () => {
      const next = resolveTarget();
      if (!next) {
        destroy();
        return;
      }
      if (!tc) create();
      if (!target || target.obj !== next.obj) {
        cancelDrag();
        tc.attach(next.obj);
      }
      target = next;
      const hidden = hiddenNow();
      if (hidden) cancelDrag();
      helper.visible = !hidden; // attach() shows it; the preview and exports hide it
      tc.enabled = !hidden;
      applySettings();
    };

    // Esc cancels a drag. Capture phase, so it runs before (and pre-empts,
    // via defaultPrevented) the Parts-mode Escape that clears the selection.
    const onEscape = (e) => {
      if (e.key !== "Escape" || !drag) return;
      e.preventDefault();
      cancelDrag();
    };

    // Decision 2 — W / E / R (unused anywhere else in the app) pick the mode
    // while a gizmo is shown; never with a modifier, never while typing, and
    // never mid-drag.
    const onShortcut = (e) => {
      if (!tc || !tc.enabled || drag || e.defaultPrevented) return;
      const t = e.target;
      const mode = gizmo.shortcutMode({
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        targetTag: t && t.nodeName,
        isContentEditable: !!(t && t.isContentEditable),
      });
      if (mode) gizmo.setMode(mode);
    };

    gizmoSyncRef.current = sync;
    sync();
    const unsubStore = garageStore.subscribe(sync);
    const unsubMode = garageMode.subscribe(sync);
    const unsubSettings = gizmo.subscribe(applySettings);
    window.addEventListener("keydown", onEscape, true);
    window.addEventListener("keydown", onShortcut);
    return () => {
      unsubStore();
      unsubMode();
      unsubSettings();
      window.removeEventListener("keydown", onEscape, true);
      window.removeEventListener("keydown", onShortcut);
      if (gizmoSyncRef.current === sync) gizmoSyncRef.current = null;
      destroy();
    };
  }, [scene, camera, gl, partIndex, attachedObject]);

  // Parts mode: turning it ON drops a whole-model selection (the two never
  // coexist); Escape clears the part selection, and that listener exists only
  // while Parts is ON. It yields to a running preview or export (the preview's
  // own Escape handler keeps priority) and to text-entry fields.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (animRunRef.current || exportRunRef.current) return;
      const t = e.target;
      const tag = t && t.nodeName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) {
        return;
      }
      garageStore.clearSelection();
    };
    let on = false;
    const sync = () => {
      const next = garageMode.getSnapshot().pickMode;
      if (next === on) return;
      on = next;
      if (on) {
        onClear();
        window.addEventListener("keydown", onKey);
      } else {
        window.removeEventListener("keydown", onKey);
      }
    };
    sync();
    const unsubscribe = garageMode.subscribe(sync);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClear]);

  // Garage M0 — Measure mode: Escape clears the current point pair without
  // turning Measure off (Owner decision 7), independent of the Parts Escape
  // listener above. Same export/preview and text-entry guards.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (animRunRef.current || exportRunRef.current) return;
      const t = e.target;
      const tag = t && t.nodeName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) {
        return;
      }
      measure.clearPoints();
    };
    let on = false;
    const sync = () => {
      const next = measure.getSnapshot().active;
      if (next === on) return;
      on = next;
      if (on) window.addEventListener("keydown", onKey);
      else window.removeEventListener("keydown", onKey);
    };
    sync();
    const unsubscribe = measure.subscribe(sync);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Garage M0 — the measure pair is cleared on a product switch (Owner
  // decision 7); Measure mode itself is left as the owner set it.
  useEffect(() => {
    measure.clearPoints();
  }, [product.modelPath]);

  // Click-to-select / click-empty-to-clear with drag guards.
  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let downButton = -1;

    const onPointerDown = (e) => {
      downX = e.clientX;
      downY = e.clientY;
      downButton = e.button;
      // Garage G11: a press on a gizmo handle (hovered now, or already taken
      // by the gizmo if its listener ran first) is the gizmo's, never a pick.
      const tc = gizmoRef.current;
      gizmoPressRef.current = !!(tc && tc.enabled && (tc.dragging || tc.axis !== null));
    };

    const onPointerUp = (e) => {
      if (gizmoPressRef.current) {
        gizmoPressRef.current = false;
        return;
      }
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      // A genuine click selects. Drags (orbit/pan/zoom-pinch) must NOT select.
      const isClick =
        e.button === 0 &&
        downButton === 0 &&
        moved < CLICK_MOVE_TOLERANCE;
      if (!isClick) return;
      // No selection while an export owns the canvas.
      if (exportRunRef.current) return;
      // A click on the canvas ends a running preview instead of selecting.
      if (animRunRef.current) {
        stopPreview();
        return;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Refresh world matrices (incl. the transform group) so raycasts always
      // hit the model where it currently is, even right after a transform.
      modelScene.updateWorldMatrix(true, true);
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      // Garage M0 — Measure mode: a click picks a surface point on the main
      // product OR any visible added object (regardless of Parts on/off) and
      // never selects a part (Owner decision 7); a miss is simply ignored. A
      // third pick starts a fresh pair (measure.pick's own rule).
      if (measure.getSnapshot().active) {
        objectsRootRef.current?.updateWorldMatrix(true, true);
        const measureTargets = modelMeshes.filter((m) => m.visible);
        for (const entry of objectPoolRef.current.values()) {
          if (!entry.attached || !entry.anchor.visible) continue;
          entry.scene.traverseVisible((m) => {
            if (m.isMesh && m.geometry) measureTargets.push(m);
          });
        }
        const measureHits = raycaster.intersectObjects(measureTargets, false);
        if (measureHits.length > 0) measure.pick(measureHits[0].point.toArray());
        return;
      }
      // Garage G4: three.js's own Raycaster never checks `.visible` (confirmed
      // in this build's node_modules/three/src/core/Raycaster.js — neither
      // intersect() nor Mesh.raycast() looks at it), so a part hidden via a
      // Garage override would otherwise still be clickable. Filter it out here
      // so a hidden part is never hit, in either pick mode.
      // Garage G7a: with Parts ON the visible added objects are pick targets
      // too (a hit selects the WHOLE object); with Parts OFF the targets are
      // exactly the model's meshes, as before.
      const pickMode = garageMode.getSnapshot().pickMode;
      const objectTargets = [];
      if (pickMode) {
        objectsRootRef.current?.updateWorldMatrix(true, true);
        for (const entry of objectPoolRef.current.values()) {
          if (!entry.attached || !entry.anchor.visible) continue;
          entry.scene.traverseVisible((m) => {
            if (m.isMesh && m.geometry) objectTargets.push(m);
          });
        }
      }
      const hits = raycaster.intersectObjects(
        objectTargets.length ? [...modelMeshes.filter((m) => m.visible), ...objectTargets] : modelMeshes.filter((m) => m.visible),
        false
      );
      // Garage G3: only with Parts ON does a click pick a part (shift toggles;
      // otherwise the pick replaces the selection); empty space clears. The
      // whole-model branch below is untouched and runs whenever Parts is OFF.
      if (pickMode) {
        const hitItemId = hits.length > 0 ? objectItemIdOf(hits[0].object) : null;
        const partId = hitItemId
          ? sceneObjects.OBJECT_PART_ID
          : hits.length > 0 && partIndex.ok
            ? partIndex.byRef.get(hits[0].object)
            : undefined;
        if (partId) {
          const entry = { itemId: hitItemId ?? PRIMARY_ITEM_ID, partId };
          if (e.shiftKey) garageStore.toggle(entry);
          else garageStore.select([entry]);
        } else if (hits.length === 0 && !e.shiftKey) {
          garageStore.clearSelection();
        }
        return;
      }
      if (hits.length > 0) {
        onSelect({
          name: product.name,
          size: { width: fit.size.x, height: fit.size.y, depth: fit.size.z },
        });
      } else {
        onClear();
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl, camera, modelMeshes, modelScene, partIndex, product.name, fit.size, onSelect, onClear, stopPreview]);

  return (
    <>
      {/* Lighting Foundation — the original three-light setup, now live-driven:
          key from front-above (casts the ground shadow), warm fill from the
          opposite side, cool rim from behind, plus the ambient base. */}
      <ambientLight intensity={lighting.ambient} />
      <directionalLight
        position={[4, 6, 5]}
        intensity={lighting.key}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={0.5}
        shadow-camera-far={shadowFar}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight
        position={[-6, 2, -4]}
        intensity={lighting.fill}
        color={0xffd2a1}
      />
      <directionalLight
        position={[-3, 5, -7]}
        intensity={lighting.rim}
        color={0xcfd8ff}
      />

      {/* Floor anchored to the model's actual base (was hardcoded at y=-1.2).
          Hidden while a photographic environment is active — its backdrop
          already contains the circular display platform. Garage G5: the
          horizontal centre and footprint follow liveFit (so the floor tracks
          a moved/hidden part or a moved/scaled whole model), but the Y stays
          the FROZEN fit.floorY always (Decision 4 — the floor never moves
          vertically, even if a part is dragged below it or the model is
          scaled; floorYFor already guarantees liveFit.floorY === fit.floorY
          whenever fit.floorY is finite, i.e. always — fit.floorY is used here
          directly so that invariant can never drift). */}
      <mesh
        visible={!environment.file}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[liveFit.center.x, fit.floorY, liveFit.center.z]}
      >
        <circleGeometry args={[liveFit.footprintRadius * 1.4, 64]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Ground shadow catcher — fully transparent except where the key light
          is occluded, so the product gains a soft contact shadow over the
          photographic backdrops (ShadowMaterial renders shadow only). Garage
          G5: same liveFit centre/footprint, same pinned fit.floorY, as the
          floor disc above. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[liveFit.center.x, fit.floorY + 0.003, liveFit.center.z]}
        receiveShadow
      >
        <circleGeometry args={[liveFit.footprintRadius * 2.6, 64]} />
        <shadowMaterial
          transparent
          opacity={lighting.shadow}
          depthWrite={false}
        />
      </mesh>

      {/* Selection ring — thin light/gold ring around the model footprint.
          Garage G5: same liveFit centre/footprint, same pinned fit.floorY. */}
      <mesh
        ref={ringRef}
        name={RING_NAME}
        visible={selected}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[liveFit.center.x, fit.floorY + 0.006, liveFit.center.z]}
      >
        <ringGeometry
          args={[
            liveFit.footprintRadius * 0.97,
            liveFit.footprintRadius * 1.03,
            128,
          ]}
        />
        <meshBasicMaterial
          color={SELECT_COLOR}
          transparent
          opacity={RING_OPACITY}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Transform layer — applies only to the selected model's wrapper group.
          Identity === the model's exact original transform (reset reference). */}
      <group
        ref={transformRef}
        position={[transform.x, transform.y, transform.z]}
        rotation={[degToRad(transform.rx), degToRad(transform.ry), degToRad(transform.rz)]}
        scale={[transform.s, transform.s, transform.s]}
      >
        {/* Turntable pivot (Phase 16B Slice B): turns about the model's own
            centre; the inner group cancels the offset, so at rotation 0 the
            model sits exactly where it did without the pivot. Only the
            preview's useFrame writes its rotation.y — Garage G5 additionally
            writes BOTH groups' .position imperatively from refit() (Decision
            3), never as a declarative prop: an array-literal position prop is
            a fresh reference every render, so React would silently re-apply
            it (and stomp the live pivot centre) on any unrelated re-render. */}
        <group ref={pivotRef}>
          <group ref={pivotOffsetRef}>
            <primitive object={modelScene} />
            {/* Garage G7a: added objects hang here (imperatively, syncObjects),
                beside the model and inside the pivot, so the turntable spins
                them with it and refit() measures them. */}
            <group ref={objectsRootRef} name={OBJECTS_NAME} />
          </group>
        </group>
      </group>

      {/* Left-drag orbits, right-drag pans (Lock focus OFF only), wheel zooms. No auto-rotate and no
          damping inertia: the camera must stop the instant the pointer is
          released (continuous orbit is reserved for an explicit future
          Auto-Rotate feature). */}
      <OrbitControls
        ref={controlsRef}
        enableDamping={false}
        enableZoom
        enablePan={!focusLock}
        onChange={handleControlsChange}
      />
    </>
  );
}

export default function StudioCanvas({
  product = PRODUCTS[0],
  environment = ENVIRONMENTS[0],
  cameraRequest = null,
  captureRef = null,
  customView = null,
  cameraApiRef = null,
  transformApiRef = null,
  lighting = DEFAULT_LIGHTING,
  viewLive = false,
  onViewLive = null,
  focusLock = true,
  onLockChange = null,
}) {
  // The stage's portrait-PNG pose function for CaptureBridge (Slice E3).
  const reelViewRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [transform, setTransform] = useState({ ...DEFAULT_TRANSFORM });
  const [selectionProductId, setSelectionProductId] = useState(product.id);

  // Reset selection AND transform state in the same render pass as a product
  // switch, so nothing leaks from one model to another and the inspector never
  // flashes stale data onto the incoming model.
  if (selectionProductId !== product.id) {
    setSelectionProductId(product.id);
    setSelection(null);
    setTransform({ ...DEFAULT_TRANSFORM });
  }

  const handleSelect = useCallback((info) => setSelection(info), []);
  // Clearing selection leaves the model where it is — it must not corrupt or
  // unexpectedly modify the current transform.
  const handleClear = useCallback(() => setSelection(null), []);
  const handleTransformChange = useCallback(
    (patch) => setTransform((prev) => ({ ...prev, ...patch })),
    []
  );
  const handleResetTransform = useCallback(
    () => setTransform({ ...DEFAULT_TRANSFORM }),
    []
  );

  // Phase 15A (Studio Session) — read/write access to the live transform for
  // Save / Restore / Reset. Same ref pattern as captureRef / cameraApiRef:
  // this component keeps owning the state, the session only reaches it here.
  // Writing also clears the selection (it is transient, never part of a session).
  useEffect(() => {
    if (!transformApiRef) return undefined;
    // Registering a callback bag on a ref passed in by App is the same
    // ref-handoff captureRef/cameraApiRef use; the rule assumes props are
    // immutable values, which does not hold for a ref object.
    // eslint-disable-next-line react-hooks/immutability
    transformApiRef.current = {
      read: () => ({ ...transform }),
      write: (t) => {
        const next = { ...DEFAULT_TRANSFORM };
        for (const k of Object.keys(DEFAULT_TRANSFORM)) {
          if (t && Number.isFinite(t[k])) next[k] = t[k];
        }
        setTransform(next);
        setSelection(null);
      },
      reset: () => {
        setTransform({ ...DEFAULT_TRANSFORM });
        setSelection(null);
      },
    };
    return () => {
      transformApiRef.current = null;
    };
  }, [transformApiRef, transform]);

  return (
    <>
      <Canvas
        // three r186 removed PCFSoftShadowMap and warns on every shadow
        // render if it is requested; "percentage" = PCFShadowMap, the exact
        // behavior the renderer already falls back to. Same verified visuals,
        // clean console.
        shadows="percentage"
        camera={{ fov: FOV, near: 0.1, far: 500, position: [0, 2, 5] }}
        // preserveDrawingBuffer keeps the rendered frame readable after the
        // compositor swaps, so Capture Shot can PNG-encode the exact current
        // presentation at any moment. No visual or scene-state change.
        gl={{ preserveDrawingBuffer: true }}
        style={{
          position: "fixed",
          inset: 0,
          background: "#050505",
          zIndex: 0,
        }}
      >
        <EnvironmentLighting environment={environment} />
        {/* Own Suspense boundary: a not-yet-loaded model suspends only the
            stage, so the canvas-level EnvironmentLighting above is never
            hidden (which would drop its cached environment) on product switch. */}
        <Suspense fallback={null}>
          {/* key=product.id: switching products remounts the stage cleanly */}
          <StudioStage
            key={product.id}
            product={product}
            environment={environment}
            transform={transform}
            selected={selection !== null}
            onSelect={handleSelect}
            onClear={handleClear}
            cameraRequest={cameraRequest}
            customView={customView}
            cameraApiRef={cameraApiRef}
            lighting={lighting}
            viewLive={viewLive}
            onViewLive={onViewLive}
            focusLock={focusLock}
            onLockChange={onLockChange}
            reelViewRef={reelViewRef}
          />
        </Suspense>
        <CaptureBridge captureRef={captureRef} reelViewRef={reelViewRef} />
      </Canvas>
      {selection && (
        <SelectionInspector
          name={selection.name}
          size={selection.size}
          transform={transform}
          onTransformChange={handleTransformChange}
          onResetTransform={handleResetTransform}
          onClear={handleClear}
        />
      )}
    </>
  );
}
