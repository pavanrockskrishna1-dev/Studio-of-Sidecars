import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import StudioShell from "./ui/StudioShell";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <StudioShell />
  </StrictMode>
);
