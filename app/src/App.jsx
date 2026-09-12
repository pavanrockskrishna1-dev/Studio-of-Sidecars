import { useState } from "react";
import Hero from "./components/Hero";
import StudioCanvas from "./components/StudioCanvas";
import StudioSwitcher from "./components/StudioSwitcher";
import { getProduct } from "./products/registry";
import "./App.css";

export default function App() {
  const [productId, setProductId] = useState("coffee-bike");
  const product = getProduct(productId);

  return (
    <>
      <StudioCanvas product={product} />
      <StudioSwitcher activeId={product.id} onSelect={setProductId} />
      <Hero />
    </>
  );
}
