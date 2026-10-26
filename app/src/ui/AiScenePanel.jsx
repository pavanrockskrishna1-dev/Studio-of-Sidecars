import React, { useState } from "react";
import { useSyncExternalStore } from "react";
import * as aiScene from "../ai/aiScene.js";

export default function AiScenePanel() {
  const { busy, error } = useSyncExternalStore(aiScene.subscribe, aiScene.getSnapshot);
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem("sos_anthropic_key") ?? ""; } catch { return ""; }
  });

  const saveKey = (k) => {
    setApiKey(k);
    try { localStorage.setItem("sos_anthropic_key", k); } catch {}
  };

  const handleBuild = () => {
    if (!prompt.trim() || !apiKey.trim() || busy) return;
    aiScene.buildScene(prompt.trim(), apiKey.trim());
  };

  return (
    <div className="ai-scene-panel">
      <div className="inspector-label">Anthropic API key</div>
      <input
        type="password"
        className="ai-key-input"
        placeholder="sk-ant-..."
        value={apiKey}
        onChange={(e) => saveKey(e.target.value)}
        autoComplete="off"
      />
      <div className="inspector-label" style={{ marginTop: 12 }}>Describe the scene</div>
      <textarea
        className="ai-prompt-textarea"
        rows={4}
        placeholder="BBQ bike at a Diwali night market with warm lights and a crowd"
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
      <p className="ai-hint">
        Ctrl+Enter to build. Adds props and effects &mdash; does not remove existing ones.
      </p>
    </div>
  );
}
