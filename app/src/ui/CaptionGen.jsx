import React, { useState } from "react";
import { useSyncExternalStore } from "react";
import * as occasionStore from "../animation/occasionStore.js";
import { OCCASIONS } from "../animation/occasionDefs.js";
import { PRODUCTS } from "../products/registry.js";

const TONES = [
  { id: "excited",  label: "Excited",  hint: "hype, energy, emojis" },
  { id: "casual",   label: "Casual",   hint: "friendly, everyday" },
  { id: "premium",  label: "Premium",  hint: "aspirational, clean" },
  { id: "hinglish", label: "Hinglish", hint: "Hindi + English mix" },
];

function buildPrompt(productName, occasionLabel, tone, notes) {
  const toneGuide = {
    excited:  "High energy, lots of relevant emojis, hype language, FOMO-inducing. Use 2–3 emojis per line.",
    casual:   "Friendly and conversational, like texting a friend. Natural, no hard sell. 1–2 emojis max.",
    premium:  "Aspirational and polished. Short sentences. No slang, no excessive emojis. Evokes quality.",
    hinglish: "Mix Hindi and English naturally (Hinglish). Use Devanagari words in Roman script (e.g. yaar, ekdum, zabardast). Sound like a young Indian food lover.",
  };

  return `You are a social media expert for Indian food and lifestyle brands.

Product: "${productName}"
Occasion/mood: "${occasionLabel}"
Caption tone: ${toneGuide[tone]}
${notes ? `Director's notes: "${notes}"` : ""}

Write 3 short Instagram captions for this product. Each caption:
- 1–3 sentences max (under 150 characters ideal)
- Match the tone exactly
- Feel authentic and platform-native
- Do NOT include hashtags in the captions themselves

Also write a hashtag block of 10–15 relevant hashtags (single string, space-separated, e.g. #BBQRide #StreetFood …).

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "captions": [
    { "text": "..." },
    { "text": "..." },
    { "text": "..." }
  ],
  "hashtags": "#tag1 #tag2 ..."
}`;
}

export default function CaptionGen({ productId }) {
  const { occasionId } = useSyncExternalStore(
    occasionStore.subscribe,
    occasionStore.getSnapshot,
    occasionStore.getSnapshot,
  );
  const [tone, setTone] = useState("excited");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(null);

  const apiKey = (() => { try { return localStorage.getItem("sos_groq_key") ?? ""; } catch { return ""; } })();

  const product = PRODUCTS.find((p) => p.id === productId);
  const occasion = OCCASIONS.find((o) => o.id === occasionId);
  const productName = product?.name ?? "BBQ Bike";
  const occasionLabel = occasion?.name ?? "General";

  const generate = async () => {
    if (!apiKey || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          temperature: 0.72,
          max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are a JSON-only API. Output only a single valid JSON object." },
            { role: "user", content: buildPrompt(productName, occasionLabel, tone, notes.trim()) },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}${body ? ": " + body.slice(0, 120) : ""}`);
      }
      const data = await res.json();
      let text = data?.choices?.[0]?.message?.content ?? "";
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      let parsed;
      try { parsed = JSON.parse(text); }
      catch { const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error("No JSON in response"); parsed = JSON.parse(m[0]); }
      if (!Array.isArray(parsed.captions)) throw new Error("Unexpected response shape");
      setResult(parsed);
    } catch (err) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  return (
    <div className="caption-gen">
      {!apiKey && (
        <div className="caption-no-key">
          Set your Groq API key in the <strong>AI Builder</strong> section first.
        </div>
      )}

      <div className="inspector-label">Tone</div>
      <div className="sos-chips">
        {TONES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="sos-chip"
            data-on={tone === t.id || undefined}
            onClick={() => setTone(t.id)}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="inspector-label" style={{ marginTop: 10 }}>Notes (optional)</div>
      <textarea
        className="caption-notes"
        rows={2}
        maxLength={120}
        placeholder="e.g. mention the smoky flavour, weekend vibe…"
        value={notes}
        disabled={busy}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="caption-context-line">
        {productName} · {occasionLabel} · {TONES.find(t => t.id === tone)?.label}
      </div>

      <button
        className="caption-gen-btn"
        disabled={busy || !apiKey}
        onClick={generate}
      >
        {busy ? "Writing…" : "✦ Generate captions"}
      </button>

      {error && <div className="caption-error">{error}</div>}

      {result && (
        <div className="caption-results">
          {result.captions.map((c, i) => (
            <div key={i} className="caption-card">
              <p className="caption-text">{c.text}</p>
              <div className="caption-card-actions">
                <button
                  className="caption-copy-btn"
                  onClick={() => copy(c.text, `cap${i}`)}
                >
                  {copied === `cap${i}` ? "Copied!" : "Copy"}
                </button>
                {i === 0 && result.hashtags && (
                  <button
                    className="caption-copy-btn caption-copy-combo"
                    onClick={() => copy(`${c.text}\n\n${result.hashtags}`, "combo")}
                  >
                    {copied === "combo" ? "Copied!" : "Copy + tags"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {result.hashtags && (
            <div className="caption-card caption-hashtag-card">
              <p className="caption-hashtags">{result.hashtags}</p>
              <button
                className="caption-copy-btn"
                onClick={() => copy(result.hashtags, "tags")}
              >
                {copied === "tags" ? "Copied!" : "Copy tags"}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="ai-hint">Uses the Groq key from AI Builder. Free tier is generous.</p>
    </div>
  );
}