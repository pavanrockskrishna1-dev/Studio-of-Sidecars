import { useCallback, useEffect, useRef, useState } from "react";
import Hero from "./components/Hero";
import StudioCanvas from "./components/StudioCanvas";
import StudioControls from "./components/StudioControls";
import CapturePreview from "./components/CapturePreview";
import { getProduct } from "./products/registry";
import { getEnvironment, DEFAULT_ENVIRONMENT_ID } from "./environments/registry";
import "./App.css";

export default function App() {
  const [productId, setProductId] = useState("coffee-bike");
  // Canonical default: Propeller & Pistons Loft (locked hero environment).
  const [environmentId, setEnvironmentId] = useState(DEFAULT_ENVIRONMENT_ID);
  // Camera presets are transient shot requests: { id, seq }. `seq` bumps on
  // every click so re-applying the same preset still re-frames the camera.
  const [cameraRequest, setCameraRequest] = useState({ id: null, seq: 0 });
  const [prevProductId, setPrevProductId] = useState(productId);

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
  if (prevProductId !== productId) {
    setPrevProductId(productId);
    setCameraRequest({ id: null, seq: 0 });
  }

  const handleCameraPreset = (id) =>
    setCameraRequest((prev) => ({ id, seq: prev.seq + 1 }));

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
      />
      <StudioControls
        environmentId={environment.id}
        onEnvironmentSelect={setEnvironmentId}
        productId={product.id}
        onProductSelect={setProductId}
        activePresetId={cameraRequest.id}
        onCameraPreset={handleCameraPreset}
        onCaptureShot={handleCaptureShot}
      />
      <CapturePreview shot={shot} onClose={handleCloseShot} />
      <Hero />
    </>
  );
}
