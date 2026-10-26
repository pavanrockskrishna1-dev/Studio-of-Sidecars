import React, { useState } from "react";
import { useSyncExternalStore } from "react";
import * as aiScene from "../ai/aiScene.js";
import { PRODUCTS } from "../products/registry";

export default function AiScenePanel({ productId }) {
  const { busy, error, result } = useSyncExternalStore(aiScene.subscribe, aiScene.getSnapshot);
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem("sos_groq_key") ?? ""; } catch { return ""; }
  });

  const product = PRODUCTS.find((p) => p.id === productId);

  const saveKey = (k) => {
    setApiKey(k);
    try { localStorage.setItem("sos_groq_key", k); } catch {}
  };

  const handleBuild = () => {
    if (!prompt.trim() || !apiKey.trim() || busy) return;
    aiScene.buildScene(prompt.trim(), apiKey.trim(), {
      productName: product?.name ?? "BBQ Bike",
      productId: productId ?? "",
    });
  };

  return (
    <div className="ai-scene-panel">
      <div className="inspector-label">Groq API key — free at console.groq.com</div>
      <input
        type="password"
        className="ai-key-input"
        placeholder="gsk_..."
        value={apiKey}
        onChange={(e) => saveKey(e.target.value)}
        autoComplete="off"
      />
      {product && (
        <div className="ai-product-badge">
          Building for: <strong>{product.name}</strong>
        </div>
      )}
      <div className="inspector-label" style={{ marginTop: 12 }}>Describe the scene</div>
      <textarea
        className="ai-prompt-textarea"
        rows={4}
        placeholder={`e.g. "Diwali night market with warm lights and golden glow"`}
        value={prompt}
        disabled={busy}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleBuild(); }}
      />
      <button
        className="ai-build-btn"
        disabled={busy || !prompt.trim() || !apiKey.trim()}
        onClick={handleBuild}
      >
        {busy ? "Building…" : "✦ Build scene"}
      </button>
      {error && (
        <div className="ai-error">
          {error}
          <button className="ai-error-dismiss" onClick={aiScene.clearError}>&times;</button>
        </div>
      )}
      {result && !error && (
        <div className="ai-result">
          {result}
          <button className="ai-error-dismiss" onClick={aiScene.clearError}>&times;</button>
        </div>
      )}
      <p className="ai-hint">
        Ctrl+Enter to build. Sets stage, lighting, reel shots and prop animations.
      </p>
    </div>
  );
}
