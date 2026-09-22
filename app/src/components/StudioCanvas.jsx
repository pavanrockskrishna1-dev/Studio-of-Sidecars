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

const isObj = (o) => typeof o === "object" && o !== null && !Array.isArray(o);

// Garage G4 — a part mesh's base pose (position, quaternion, scale, visible)
// is recorded once, the first time it is touched, in a WeakMap the caller
// owns. Every later override composes against this same recorded base via
// compose.js, never against whatever the mesh currently holds.
function ensurePartBase(mesh, bases) {
  let base = bases.get(mesh);
  if (!base) {
    base = {
      pos: mesh.position.toArray(),
      quat: mesh.quaternion.toArray(),
      scale: mesh.scale.toArray(),
      visible: mesh.visible,
    };
    bases.set(mesh, base);
  }
  return base;
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

// Garage G3 — what the rail shows for one part (model units: the world box of
// the part, so it includes the Scale slider).
function describeMesh(mesh, partId) {
  const g = mesh.geometry;
  const vertices = g && g.attributes && g.attributes.position ? g.attributes.position.count : 0;
  const triangles = g ? Math.floor((g.index ? g.index.count : vertices) / 3) : 0;
  mesh.updateWorldMatrix(true, false);
  const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
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
    captureRef.current = (opts = {}) => {
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
      // also when the render fails.
      const overlay = scene.getObjectByName(OVERLAY_NAME);
      const overlayWasVisible = overlay ? overlay.visible : false;
      if (overlay) overlay.visible = false;
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
        if (overlay) overlay.visible = overlayWasVisible;
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
  const ringRef = useRef(null);
  const selectedRef = useRef(selected);
  const escHandlerRef = useRef(null);
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
  useEffect(() => {
    let disposed = false;
    let texture = null;
    const loader = new THREE.TextureLoader();
    loader.load(environment.file, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      texture = tex;
      scene.background = tex;
    });
    return () => {
      disposed = true;
      if (texture) texture.dispose();
      scene.background = null;
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

  // World position of the model's base centre (Slice E2): x and z of the live
  // centre, y = the world y of the floor point under it (the transform applied
  // to (centre.x, floorY, centre.z)).
  const liveBase = useCallback(() => {
    const c = liveCentre();
    const group = transformRef.current;
    const p = new THREE.Vector3(fit.center.x, fit.floorY, fit.center.z);
    if (group) {
      group.updateMatrixWorld(true);
      p.applyMatrix4(group.matrixWorld);
    }
    return [c.x, p.y, c.z];
  }, [fit, liveCentre]);

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
    const outline = transformRef.current?.getObjectByName("selection-outline");
    if (outline) outline.visible = !hidden;
    const partOverlay = transformRef.current?.getObjectByName(OVERLAY_NAME);
    if (partOverlay) partOverlay.visible = !hidden;
    if (ringRef.current) ringRef.current.visible = hidden ? false : selectedRef.current;
  }, []);

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
  const computeReelView = useCallback(
    ({ width, height, livePosition, liveTarget, pct }) => {
      const aspect = width / height;
      const distance = fitDistance(fit.size, aspect, REEL_EXPORT.fovDeg, 0.7) * (pct / 100);
      const centreArr = liveCentre().toArray();
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
            basePoint: liveBase(),
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
    [fit, liveCentre, liveBase, scene, camera]
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
      finishExport({ restoreCamera: false, render: false });
      unregister();
    };
  }, [startPreview, stopPreview, beginExport, stepExport, finishExport, gl.domElement]);

  // Move the camera to a view and freeze its slider baseline, measured AFTER
  // the move (the controls may adjust it, e.g. the Top preset's pole clamp).
  // `baseline` is passed only when re-applying a saved view that carries one;
  // `live` is true only when restoring a saved live (unsaved custom) view.
  const applyView = useCallback(
    (position, target, baseId, baseline, live = false) => {
      moveGuarded(() => {
        camera.position.copy(position);
        camera.far = fit.distance * 10 + 10;
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
          fit.center
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
      ({ position, target } = computeCameraShot(
        fit,
        preset,
        product.frontAz ?? 0,
        aspect,
        FOV
      ));
    }
    applyView(position, target, baseId, baseline);
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
  const shadowExtent = fit.footprintRadius * 2.4 + fit.size.y;
  const shadowFar = 20 + fit.distance * 2;

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
    group.name = "selection-outline";
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

  // Garage G4 — imperative live transform. On every real layout change (never
  // on a plain selection change, so a click never re-walks this) each part
  // mesh is set to its base pose composed with its current override (or reset
  // to base when the override is gone), via compose.js's own functions —
  // never a hand-rolled equivalent. This never touches fit, floorY, the floor
  // disc, shadow catcher, ring geometry, camera presets or Reel/PNG framing
  // (Decision 4): a moved or hidden part is not refit until Garage G5.
  // See the modelScene.visible write-back above: mutating a mesh reached
  // through a memoized part index is the same deliberate imperative-three.js
  // pattern, not an accidental mutation of the memo itself.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    if (!partIndex.ok) return undefined;
    const bases = partBasesRef.current;
    const parts = partIndex.parts;
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
      }
    };
    applyOverrides();
    return garageStore.subscribe(applyOverrides);
  }, [partIndex]);

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
      const key = `${snap.revision}|${selection.map((e) => e.partId).join(",")}`;
      if (key === lastKey) return;
      lastKey = key;
      teardown();
      const meshes = [];
      if (partIndex.ok) {
        for (const entry of selection) {
          const mesh = partIndex.byId.get(entry.partId);
          if (mesh && mesh.geometry && mesh.visible) meshes.push(mesh);
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
  }, [partIndex, fit.center]);

  // The rail's part read-out, plus (Garage G4) the numeric-field read/commit
  // path. One registration, extended — never a second registerApi call.
  useEffect(
    () =>
      garageMode.registerApi({
        describePart: (partId) => {
          const mesh = partIndex.ok ? partIndex.byId.get(partId) : undefined;
          return mesh ? describeMesh(mesh, partId) : null;
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
      }),
    [partIndex]
  );

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
    };

    const onPointerUp = (e) => {
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
      // Garage G4: three.js's own Raycaster never checks `.visible` (confirmed
      // in this build's node_modules/three/src/core/Raycaster.js — neither
      // intersect() nor Mesh.raycast() looks at it), so a part hidden via a
      // Garage override would otherwise still be clickable. Filter it out here
      // so a hidden part is never hit, in either pick mode.
      const hits = raycaster.intersectObjects(
        modelMeshes.filter((m) => m.visible),
        false
      );
      // Garage G3: only with Parts ON does a click pick a part (shift toggles;
      // otherwise the pick replaces the selection); empty space clears. The
      // whole-model branch below is untouched and runs whenever Parts is OFF.
      if (garageMode.getSnapshot().pickMode) {
        const partId = hits.length > 0 && partIndex.ok ? partIndex.byRef.get(hits[0].object) : undefined;
        if (partId) {
          const entry = { itemId: "i0", partId };
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
          already contains the circular display platform. */}
      <mesh
        visible={!environment.file}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[fit.center.x, fit.floorY, fit.center.z]}
      >
        <circleGeometry args={[fit.footprintRadius * 1.4, 64]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Ground shadow catcher — fully transparent except where the key light
          is occluded, so the product gains a soft contact shadow over the
          photographic backdrops (ShadowMaterial renders shadow only). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[fit.center.x, fit.floorY + 0.003, fit.center.z]}
        receiveShadow
      >
        <circleGeometry args={[fit.footprintRadius * 2.6, 64]} />
        <shadowMaterial
          transparent
          opacity={lighting.shadow}
          depthWrite={false}
        />
      </mesh>

      {/* Selection ring — thin light/gold ring around the model footprint */}
      <mesh
        ref={ringRef}
        visible={selected}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[fit.center.x, fit.floorY + 0.006, fit.center.z]}
      >
        <ringGeometry
          args={[
            fit.footprintRadius * 0.97,
            fit.footprintRadius * 1.03,
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
            preview's useFrame writes its rotation.y. */}
        <group ref={pivotRef} position={fit.center}>
          <group position={[-fit.center.x, -fit.center.y, -fit.center.z]}>
            <primitive object={modelScene} />
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
