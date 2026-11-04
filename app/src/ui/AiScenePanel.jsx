import React, { useRef, useState } from "react";
import { useSyncExternalStore } from "react";
import * as aiScene from "../ai/aiScene.js";
import { suggestBriefs, BRIEF_ADDONS, appendToBrief } from "../ai/briefSuggestions.js";
import * as garageStore from "../garage/garageStore.js";
import * as stageLook from "../fx/stageLook.js";
import * as occasionStore from "../animation/occasionStore.js";
import { PRODUCTS } from "../products/registry";
import PropGroupShelf from "./PropGroupShelf";
import PropsShelf from "./PropsShelf";

const STAGES = [
  { id: "studio", label: "Studio" },
  { id: "night", label: "Night" },
  { id: "day", label: "Day" },
];

/* AI Reel Builder. Four steps, in the order a person works:
   1 Background  2 Props  3 Describe (with a suggestion bar)  4 Build.
   By default it keeps the stage and props the person picked and only directs the
   reel (camera shots, mood, motion). "Surprise me" lets the AI choose props and
   stage as well. The logic is in ai/aiScene.js. */
export default function AiScenePanel({ productId }) {
  const { busy, error, result } = useSyncExternalStore(aiScene.subscribe, aiScene.getSnapshot);
  // these three only make the panel re-read the scene when it changes
  useSyncExternalStore(garageStore.subscribe, garageStore.getSnapshot, garageStore.getSnapshot);
  const stage = useSyncExternalStore(stageLook.subscribe, stageLook.getSnapshot, stageLook.getSnapshot);
  useSyncExternalStore(occasionStore.subscribe, occasionStore.getSnapshot, occasionStore.getSnapshot);

  const [prompt, setPrompt] = useState("");
  const [modeChoice, setModeChoice] = useState(null);
  const [showProps, setShowProps] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem("sos_groq_key") ?? ""; } catch { return ""; }
  });
  const [changingKey, setChangingKey] = useState(false);

  const product = PRODUCTS.find((p) => p.id === productId);
  const scene = aiScene.readScene();
  const suggestions = suggestBriefs(scene);
  const hasKey = apiKey.trim().length > 0;
  const showKeyInput = !hasKey || changingKey;
  const mode = modeChoice ?? (scene.props.length > 0 ? "keep" : "surprise");

  const saveKey = (k) => {
    setApiKey(k);
    try { localStorage.setItem("sos_groq_key", k); } catch { /* storage blocked: the key still works for this visit */ }
  };

  const handleBuild = () => {
    if (!prompt.trim() || !hasKey || busy) return;
    aiScene.buildScene(prompt.trim(), apiKey.trim(), {
      productName: product?.name ?? "BBQ Bike",
      productId: productId ?? "",
      keepScene: mode === "keep",
      scene: mode === "keep" ? aiScene.readScene() : undefined,
    });
  };

  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setPrompt((p) => (p ? p + " " + t : t));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const hasSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const addons = ["Mood", "Pace", "Focus"].map((group) => ({ group, items: BRIEF_ADDONS.filter((a) => a.group === group) }));

  return (
    <div className="ai-scene-panel" data-testid="ai-reel-builder">
      <p className="ai-lead">
        Build your scene first: pick the background and the props. Then describe the reel and the builder directs
        it with what you picked. Press <strong>Play</strong> below to preview.
      </p>
      {product && (
        <div className="ai-product-badge">
          Building for: <strong>{product.name}</strong>
        </div>
      )}

      {/* the Groq key: one time */}
      <div className="ai-keyrow">
        {showKeyInput ? (
          <>
            <label className="ai-step-title" htmlFor="ai-groq-key">Your Groq key (one time)</label>
            <input
              id="ai-groq-key"
              type="password"
              className="ai-key-input"
              placeholder="gsk_..."
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
              autoComplete="off"
            />
            <p className="ai-hint">Free at console.groq.com. Kept in this browser only and sent only to Groq.</p>
            {hasKey && (
              <button type="button" className="ai-link-btn" onClick={() => setChangingKey(false)}>Done</button>
            )}
          </>
        ) : (
          <div className="ai-key-saved">
            <span>Groq key saved on this device ✓</span>
            <button type="button" className="ai-link-btn" onClick={() => setChangingKey(true)}>Change</button>
          </div>
        )}
      </div>

      {/* 1 background */}
      <div className="ai-step">
        <span className="ai-step-num" aria-hidden="true">1</span>
        <div className="ai-step-body">
          <div className="ai-step-title">Pick the background</div>
          <div className="ai-chips" role="radiogroup" aria-label="Stage">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={stage.look === s.id}
                className="sos-pchip"
                data-on={stage.look === s.id || undefined}
                disabled={busy}
                onClick={() => stageLook.setStageLook(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="ai-hint">Photo backdrops and the product are in <strong>Scene</strong>. A festival set below also sets the background.</p>
        </div>
      </div>

      {/* 2 props */}
      <div className="ai-step">
        <span className="ai-step-num" aria-hidden="true">2</span>
        <div className="ai-step-body">
          <div className="ai-step-title">Pick the props{scene.props.length ? ` (${scene.props.length} on stage)` : ""}</div>
          {scene.props.length > 0 ? (
            <div className="ai-proptags" aria-label="Props on stage">
              {scene.props.map((p) => (
                <span key={p.itemId} className="ai-proptag">{p.name}</span>
              ))}
            </div>
          ) : (
            <p className="ai-hint">No props yet. Add some below, or let the builder choose in step 4.</p>
          )}
          <button
            type="button"
            className="sos-pchip"
            data-on={showProps || undefined}
            aria-expanded={showProps}
            onClick={() => setShowProps((v) => !v)}
          >
            {showProps ? "Hide the props shelf" : "Add or change props"}
          </button>
          {showProps && (
            <div className="ai-propshelf">
              <PropGroupShelf />
              <PropsShelf />
            </div>
          )}
        </div>
      </div>

      {/* 3 describe */}
      <div className="ai-step">
        <span className="ai-step-num" aria-hidden="true">3</span>
        <div className="ai-step-body">
          <div className="ai-step-title">Describe the reel</div>
          <div className="ai-prompt-row">
            <textarea
              className="ai-prompt-textarea"
              rows={4}
              placeholder='For example: "Warm Diwali reel, slow push-in, finish close on the BBQ letters"'
              value={prompt}
              disabled={busy}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleBuild(); }}
              aria-label="Describe the reel"
            />
            {hasSpeech && (
              <button
                className={`ai-mic-btn${listening ? " ai-mic-active" : ""}`}
                onClick={toggleVoice}
                title={listening ? "Stop listening" : "Speak your reel brief"}
                type="button"
              >
                {listening ? "⏹" : "🎙"}
              </button>
            )}
          </div>

          <div className="ai-suggest" data-testid="ai-suggestions">
            <div className="ai-suggest-title">Ideas for your scene (tap one)</div>
            <div className="ai-suggest-list">
              {suggestions.map((text) => (
                <button key={text} type="button" className="ai-suggest-item" disabled={busy} onClick={() => setPrompt(text)}>
                  {text}
                </button>
              ))}
            </div>
            {addons.map(({ group, items }) => (
              <div key={group} className="ai-addon-row">
                <span className="ai-addon-label">{group}</span>
                {items.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    className="sos-pchip"
                    disabled={busy}
                    onClick={() => setPrompt((p) => appendToBrief(p, a.text))}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 build */}
      <div className="ai-step">
        <span className="ai-step-num" aria-hidden="true">4</span>
        <div className="ai-step-body">
          <div className="ai-step-title">Build it</div>
          <div className="ai-chips" role="radiogroup" aria-label="How to build">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "keep"}
              className="sos-pchip"
              data-on={mode === "keep" || undefined}
              disabled={busy}
              onClick={() => setModeChoice("keep")}
              title="Keeps your background and props. The builder only directs the camera shots, mood and motion."
            >
              Use my scene
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "surprise"}
              className="sos-pchip"
              data-on={mode === "surprise" || undefined}
              disabled={busy}
              onClick={() => setModeChoice("surprise")}
              title="The builder also chooses the props and the stage, replacing what you have."
            >
              Surprise me
            </button>
          </div>
          <button
            className="ai-build-btn"
            disabled={busy || !prompt.trim() || !hasKey}
            onClick={handleBuild}
            title={!hasKey ? "Add your Groq key at the top" : !prompt.trim() ? "Describe the reel in step 3" : "Build the reel (Ctrl+Enter)"}
          >
            {busy ? "Building…" : "✦ Build my reel"}
          </button>
          <p className="ai-hint">
            {busy
              ? mode === "keep" ? "Directing your reel…" : "This takes a little while. Props load one by one."
              : !hasKey
                ? "Add your Groq key at the top to switch this on."
                : !prompt.trim()
                  ? "Type or tap a brief in step 3 to switch this on."
                  : mode === "keep"
                    ? "Keeps your background and props. Replaces your reel shots. Ctrl+Enter also builds."
                    : "Replaces your props, effects, stage and reel shots. Ctrl+Enter also builds."}
          </p>
        </div>
      </div>

      {error && (
        <div className="ai-error" role="alert">
          {error}
          <button className="ai-error-dismiss" onClick={aiScene.clearError} aria-label="Dismiss">&times;</button>
        </div>
      )}
      {result && !error && (
        <div className="ai-result" role="status">
          <div className="ai-result-main">
            <div style={{ whiteSpace: "pre-line" }}>{result}</div>
            <div className="ai-result-next">Next: press Play below to preview. Open Shots to change anything.</div>
          </div>
          <button className="ai-error-dismiss" onClick={aiScene.clearError} aria-label="Dismiss">&times;</button>
        </div>
      )}
    </div>
  );
}
