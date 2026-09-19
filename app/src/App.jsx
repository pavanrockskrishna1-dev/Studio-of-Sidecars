import { useCallback, useEffect, useRef, useState } from "react";
import Hero from "./components/Hero";
import StudioCanvas from "./components/StudioCanvas";
import StudioControls from "./components/StudioControls";
import CapturePreview from "./components/CapturePreview";
import LoadingScreen from "./components/LoadingScreen";
import { registerEngine } from "./session/studioSession";
import { getProduct } from "./products/registry";
import { getEnvironment, DEFAULT_ENVIRONMENT_ID } from "./environments/registry";
import { getLightingProfile } from "./lighting/profiles";
import { DEFAULT_EXPORT_OPTS, exportFilename } from "./capture/exportOptions";
import "./App.css";
import "./export/export.css";

export default function App() {
  const [productId, setProductId] = useState("coffee-bike");
  // Canonical default: Propeller & Pistons Loft (locked hero environment).
  const [environmentId, setEnvironmentId] = useState(DEFAULT_ENVIRONMENT_ID);
  // Camera presets are transient shot requests: { id, seq }. `seq` bumps on
  // every click so re-applying the same preset still re-frames the camera.
  const [cameraRequest, setCameraRequest] = useState({ id: null, seq: 0 });
  const [prevProductId, setPrevProductId] = useState(productId);

  // Mission 7.2 (Save Custom View) — the single session-only custom view
  // slot: { position: [x,y,z], target: [x,y,z] } snapshotted from the live
  // camera + OrbitControls target. Lives purely in React state: never in
  // localStorage, never on disk, gone on refresh. Cleared together with the
  // camera request when the product switches; environment swaps keep it.
  const [customView, setCustomView] = useState(null);
  const cameraApiRef = useRef(null);
  // Phase 15A (Studio Session) — StudioCanvas registers read/write/reset for
  // its live model transform here (same ref pattern as cameraApiRef).
  const transformApiRef = useRef(null);
  // A restored session that switches product waits here until the new product
  // has committed (the switch itself resets camera + transform).
  const pendingSessionRef = useRef(null);

  // Mission 10C (Presentation Studio) — export options for Capture Shot:
  // background (studio | transparent), resolution scale (1x/2x/4x on the
  // current view) and presentation framing preset. Session-only React state;
  // the defaults reproduce the pre-10C capture exactly.
  const [exportOpts, setExportOpts] = useState(DEFAULT_EXPORT_OPTS);

  // Mission 9 (Lighting Foundation) — live lighting state for the Studio
  // renderer. Starts from (and resets to) the environment's tuned profile on
  // every environment switch; session-only React state like everything else.
  const [lighting, setLighting] = useState(() =>
    getLightingProfile(DEFAULT_ENVIRONMENT_ID)
  );

  // Mission 8 (Capture Shot Foundation) — the capture function is registered
  // by the CaptureBridge inside the existing Canvas (same renderer, same
  // scene). One shot at a time; every object URL is revoked as soon as it is
  // replaced or closed so repeated captures never accumulate blob memory.
  const captureRef = useRef(null);
  const shotRef = useRef(null);
  const capturingRef = useRef(false);
  const [shot, setShot] = useState(null);

  const product = getProduct(productId);
  const environment = getEnvironment(environmentId);

  // Reset the camera request in the same render pass as a product switch so the
  // incoming model gets its default hero framing (no camera-state leakage).
  // The saved Custom View belongs to the outgoing model's session framing, so
  // it is cleared in the same pass.
  if (prevProductId !== productId) {
    setPrevProductId(productId);
    setCameraRequest({ id: null, seq: 0 });
    setCustomView(null);
  }

  const handleCameraPreset = (id) =>
    setCameraRequest((prev) => ({ id, seq: prev.seq + 1 }));

  // Environment switch also loads that environment's lighting profile.
  const handleEnvironmentSelect = useCallback((id) => {
    setEnvironmentId(id);
    setLighting(getLightingProfile(id));
  }, []);

  const handleLightingChange = useCallback(
    (patch) => setLighting((prev) => ({ ...prev, ...patch })),
    []
  );

  // Mission 7.2 (Save Custom View) — snapshot the exact current camera
  // position + orbit target (read-only), then route a "custom" request
  // through the same transient-request flow the built-in presets use so the
  // Custom card reads as the active view immediately after saving. Saving
  // again simply overwrites the single slot.
  const handleSaveCustomView = useCallback(() => {
    const api = cameraApiRef.current;
    if (!api) return;
    setCustomView(api.readView());
    setCameraRequest((prev) => ({ id: "custom", seq: prev.seq + 1 }));
  }, []);

  const handleExportOptsChange = useCallback((patch) => {
    setExportOpts((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleCaptureShot = useCallback(async () => {
    const capture = captureRef.current;
    // One capture in flight at a time: a double click must not race two
    // encodes against the same single-preview slot (which would revoke an
    // object URL the preview is still showing).
    if (!capture || capturingRef.current) return;
    capturingRef.current = true;
    // Mission 10C — hide every UI surface for the duration of the export
    // render (CSS visibility via body[data-exporting], no reflow), let the
    // hidden state paint once, then restore immediately afterwards.
    document.body.dataset.exporting = "true";
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    try {
      const { blob, width, height } = await capture(exportOpts);
      const next = {
        url: URL.createObjectURL(blob),
        width,
        height,
        filename: exportFilename(exportOpts),
      };
      if (shotRef.current) URL.revokeObjectURL(shotRef.current.url);
      shotRef.current = next;
      setShot(next);
    } catch (err) {
      console.error("Capture Shot failed:", err);
    } finally {
      delete document.body.dataset.exporting;
      capturingRef.current = false;
    }
  }, [exportOpts]);

  const handleCloseShot = useCallback(() => {
    if (shotRef.current) {
      URL.revokeObjectURL(shotRef.current.url);
      shotRef.current = null;
    }
    setShot(null);
  }, []);

  // Phase 15A — the stage-level part of a session (camera preset, saved custom
  // view, transform). `frame` re-applies the default hero framing when the
  // session had no preset active (skipped across a product switch: the new
  // stage frames itself on mount).
  const applyStageState = useCallback((snap, frame) => {
    const custom = snap.customView ?? null;
    setCustomView(custom);
    const id = snap.cameraPresetId;
    if (id && (id !== "custom" || custom)) {
      setCameraRequest((prev) => ({ id, seq: prev.seq + 1 }));
    } else {
      setCameraRequest({ id: null, seq: 0 });
      if (frame) cameraApiRef.current?.resetView?.();
    }
    transformApiRef.current?.write(snap.transform);
  }, []);

  useEffect(() => {
    const pending = pendingSessionRef.current;
    if (pending && pending.productId === productId) {
      pendingSessionRef.current = null;
      applyStageState(pending, false);
    }
  }, [productId, applyStageState]);

  // Phase 15A — Studio Session bridge. The shell (a sibling of <App/>) saves,
  // restores and resets the studio through this registered API; it reads and
  // writes THIS state directly, so nothing is mirrored anywhere else.
  useEffect(
    () =>
      registerEngine({
        snapshot: () => ({
          productId,
          environmentId,
          cameraPresetId: cameraRequest.id,
          customView,
          lighting,
          exportOpts,
          transform: transformApiRef.current?.read() ?? null,
        }),
        apply: (snap) => {
          const productOk = getProduct(snap.productId).id === snap.productId;
          const envOk = getEnvironment(snap.environmentId).id === snap.environmentId;
          const switching = productOk && snap.productId !== productId;
          if (productOk) setProductId(snap.productId);
          if (envOk) setEnvironmentId(snap.environmentId);
          if (snap.lighting) setLighting(snap.lighting);
          setExportOpts({ ...DEFAULT_EXPORT_OPTS, ...snap.exportOpts });
          if (switching) pendingSessionRef.current = snap;
          else applyStageState(snap, true);
        },
        reset: () => {
          pendingSessionRef.current = null;
          setEnvironmentId(DEFAULT_ENVIRONMENT_ID);
          setLighting(getLightingProfile(DEFAULT_ENVIRONMENT_ID));
          setExportOpts(DEFAULT_EXPORT_OPTS);
          setCustomView(null);
          setCameraRequest({ id: null, seq: 0 });
          cameraApiRef.current?.resetView?.();
          transformApiRef.current?.reset();
        },
      }),
    [productId, environmentId, cameraRequest.id, customView, lighting, exportOpts, applyStageState]
  );

  // Safety net: release any live object URL if the App unmounts.
  useEffect(
    () => () => {
      if (shotRef.current) URL.revokeObjectURL(shotRef.current.url);
    },
    []
  );

  return (
    <>
      <StudioCanvas
        product={product}
        environment={environment}
        cameraRequest={cameraRequest}
        captureRef={captureRef}
        customView={customView}
        cameraApiRef={cameraApiRef}
        transformApiRef={transformApiRef}
        lighting={lighting}
      />
      <StudioControls
        environmentId={environment.id}
        onEnvironmentSelect={handleEnvironmentSelect}
        productId={product.id}
        onProductSelect={setProductId}
        activePresetId={cameraRequest.id}
        onCameraPreset={handleCameraPreset}
        onCaptureShot={handleCaptureShot}
        hasCustomView={customView !== null}
        onSaveCustomView={handleSaveCustomView}
        lighting={lighting}
        onLightingChange={handleLightingChange}
        exportOpts={exportOpts}
        onExportOptsChange={handleExportOptsChange}
      />
      <CapturePreview shot={shot} onClose={handleCloseShot} />
      <Hero />
      <LoadingScreen />
    </>
  );
}
