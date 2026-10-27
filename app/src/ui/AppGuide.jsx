import { useEffect, useRef, useState } from "react";

const GUIDE_KEY = "sos_guide_seen_v1";

const SECTIONS = [
  {
    glyph: "◉",
    id: "scene",
    name: "SCENE",
    headline: "Pick your product & backdrop",
    body: "Choose Coffee Bike, Cosmo 175 or BBQ Bike. Switch environments — Pistons Loft, Vintage Garage, Night Market and more. Import your own GLB model.",
  },
  {
    glyph: "✦",
    id: "style",
    name: "STYLE",
    headline: "One-tap scene mood",
    body: "Scene Presets apply grade + lighting + environment together. Mood buttons (Warm & Cozy, Epic & Bold…) layer a colour grade on top. Anime mode converts everything to cel-shading.",
  },
  {
    glyph: "⬡",
    id: "props",
    name: "PROPS",
    headline: "Stage the shot",
    body: "Drag 3D props onto the stage — cups, flowers, lights, bags. Smart Prop Groups stage a whole scene in one tap. Garage mode lets you isolate and inspect individual parts.",
  },
  {
    glyph: "▲",
    id: "create",
    name: "CREATE",
    headline: "Design your post",
    body: "PostStudio templates (Depth Stack, Neon Glow, Cinematic…) wrap your live scene in a motion poster. Brand Art adds animated title cards. Caption Gen writes Instagram captions via AI.",
  },
  {
    glyph: "▷",
    id: "reel",
    name: "REEL",
    headline: "Build a motion reel",
    body: "Choose camera moves, set duration, add a turntable or cinematic pan. Preview the loop in real time before rendering.",
  },
  {
    glyph: "↓",
    id: "export",
    name: "EXPORT",
    headline: "Save your work",
    body: "Export a still PNG at 1:1, 4:5 or 9:16. Save a Reel MP4. Download your poster at full resolution. Session auto-saves to browser storage.",
  },
];

export default function AppGuide({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sos-guide-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="App Guide"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sos-guide-inner">
        {/* close X */}
        <button className="sos-guide-close" onClick={onClose} aria-label="Close guide">✕</button>

        {/* header */}
        <div className="sos-guide-header">
          <div className="sos-guide-speedlines" aria-hidden="true" />
          <div className="sos-guide-title-block">
            <span className="sos-guide-eyebrow">HOW TO USE</span>
            <h2 className="sos-guide-title">STUDIO OF SIDECARS</h2>
          </div>
        </div>

        {/* section cards */}
        <div className="sos-guide-grid">
          {SECTIONS.map((s) => (
            <div key={s.id} className="sos-guide-card">
              <span className="sos-guide-card-glyph" aria-hidden="true">{s.glyph}</span>
              <div className="sos-guide-card-content">
                <span className="sos-guide-card-name">{s.name}</span>
                <strong className="sos-guide-card-headline">{s.headline}</strong>
                <p className="sos-guide-card-body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* workflow strip */}
        <div className="sos-guide-flow">
          <span className="sos-guide-flow-label">WORKFLOW</span>
          {SECTIONS.map((s, i) => (
            <span key={s.id} className="sos-guide-flow-step">
              {s.name}{i < SECTIONS.length - 1 && <span className="sos-guide-flow-arrow">→</span>}
            </span>
          ))}
        </div>

        <button className="sos-guide-cta" onClick={onClose}>
          START CREATING →
        </button>
      </div>
    </div>
  );
}

export function useGuide() {
  const [open, setOpen] = useState(() => {
    try { return !localStorage.getItem(GUIDE_KEY); } catch { return true; }
  });

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(GUIDE_KEY, "1"); } catch {}
  };

  const show = () => setOpen(true);

  return { open, close, show };
}
