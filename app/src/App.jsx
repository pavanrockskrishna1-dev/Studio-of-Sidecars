import { useCallback, useEffect, useRef, useState } from "react";
import Hero from "./components/Hero";
import StudioCanvas from "./components/StudioCanvas";
import StudioControls from "./components/StudioControls";
import CapturePreview from "./components/CapturePreview";
import { getProduct } from "./products/registry";
import { getEnvironment, DEFAULT_ENVIRONMENT_ID } from "./environments/registry";
import { getLightingProfile } from "./lighting/profiles";
import "./App.css";

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

  const handleCaptureShot = useCallback(async () => {
    const capture = captureRef.current;
    // One capture in flight at a time: a double click must not race two
    // encodes against the same single-preview slot (which would revoke an
    // object URL the preview is still showing).
    if (!capture || capturingRef.current) return;
    capturingRef.current = true;
    try {
      const { blob, width, height } = await capture();
      const next = {
        url: URL.createObjectURL(blob),
        width,
        height,
        filename: "studio-capture.png",
      };
      if (shotRef.current) URL.revokeObjectURL(shotRef.current.url);
      shotRef.current = next;
      setShot(next);
    } catch (err) {
      console.error("Capture Shot failed:", err);
    } finally {
      capturingRef.current = false;
    }
  }, []);

  const handleCloseShot = useCallback(() => {
    if (shotRef.current) {
      URL.revokeObjectURL(shotRef.current.url);
      shotRef.current = null;
    }
    setShot(null);
  }, []);

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
      />
      <CapturePreview shot={shot} onClose={handleCloseShot} />
      <Hero />
    </>
  );
}
