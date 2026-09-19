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
import { computeCameraShot, getBaseline, getCameraPreset } from "../camera/presets";
import * as cameraStudio from "../camera/cameraStudio";
import { DEFAULT_LIGHTING } from "../lighting/profiles";
import { computeExportSize } from "../capture/exportOptions";

const FOV = 45;

// Mission 5 — model selection tuning.
const SELECT_COLOR = 0xd9a441; // warm gold
const OUTLINE_OPACITY = 0.7; // premium rim, subtle but legible
const OUTLINE_EXPAND = 1.015; // thin inverted-hull silhouette
const RING_OPACITY = 0.95;
const CLICK_MOVE_TOLERANCE = 5; // px — below this a pointerup reads as a click

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
  gl.render(scene, camera);
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

function CaptureBridge({ captureRef }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!captureRef) return undefined;
    captureRef.current = (opts = {}) => {
      const [width, height] = computeExportSize(
        gl.domElement.width,
        gl.domElement.height,
        opts
      );
      const restore = renderExportFrame(
        gl,
        scene,
        camera,
        width,
        height,
        opts.background === "transparent"
      );
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
      });
    };
    return () => {
      captureRef.current = null;
    };
  }, [captureRef, gl, scene, camera]);
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
}) {
  const { scene, camera, gl } = useThree();
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
  }, [cameraRequest, customView, fit, gl, product.frontAz, applyView, frameDefault]);

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
    const c = liveCentre();
    const last = lastCentreRef.current;
    lastCentreRef.current = c;
    const controls = controlsRef.current;
    if (!last || !controls || !lockRef.current) return;
    const d = c.clone().sub(last);
    if (d.length() <= 1e-9) return;
    moveGuarded(() => controls.target.add(d));
    publish();
  }, [transform, focusLock, fit, moveGuarded, liveCentre, publish]);

  // Mission 7.2 (Save Custom View) — exposes the LIVE camera position and
  // OrbitControls target so the App can snapshot the exact current view.
  // Read-only: saving never moves the camera or touches any other state.
  // Camera Studio: the Distance / Height commands. Each moves the real camera
  // (guarded) around the controls target, marks the view live and publishes.
  const moveAndMarkLive = useCallback(
    (position) => {
      if (!position) return false;
      moveGuarded(() => camera.position.fromArray(position));
      if (!liveRef.current) {
        liveRef.current = true;
        onViewLive?.(true);
      }
      publish();
      return true;
    },
    [camera, moveGuarded, publish, onViewLive]
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
      const hits = raycaster.intersectObjects(modelMeshes, false);
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
  }, [gl, camera, modelMeshes, modelScene, product.name, fit.size, onSelect, onClear]);

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
        <primitive object={modelScene} />
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
          />
        </Suspense>
        <CaptureBridge captureRef={captureRef} />
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
