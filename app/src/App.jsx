import { useState } from "react";
import Hero from "./components/Hero";
import StudioCanvas from "./components/StudioCanvas";
import StudioControls from "./components/StudioControls";
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

  return (
    <>
      <StudioCanvas
        product={product}
        environment={environment}
        cameraRequest={cameraRequest}
      />
      <StudioControls
        environmentId={environment.id}
        onEnvironmentSelect={setEnvironmentId}
        productId={product.id}
        onProductSelect={setProductId}
        activePresetId={cameraRequest.id}
        onCameraPreset={handleCameraPreset}
      />
      <Hero />
    </>
  );
}
