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
  const product = getProduct(productId);
  const environment = getEnvironment(environmentId);

  return (
    <>
      <StudioCanvas product={product} environment={environment} />
      <StudioControls
        environmentId={environment.id}
        onEnvironmentSelect={setEnvironmentId}
        productId={product.id}
        onProductSelect={setProductId}
      />
      <Hero />
    </>
  );
}
