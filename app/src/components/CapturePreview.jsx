import { useState } from "react";

const GOLD = "#e8b54d";

// Mission 8 (Capture Shot Foundation) — compact lightbox for the captured PNG.
// Shows the real WebGL-canvas render (never a DOM screenshot), with Close and
// Download PNG actions. It owns no scene state: closing it returns the Studio
// to the exact state it was in when the shot was taken.

function GhostButton({ testId, onClick, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: "inherit",
        fontSize: 11,
        letterSpacing: "0.04em",
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        background: hover ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.85)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function CapturePreview({ shot, onClose }) {
  const [hoverDownload, setHoverDownload] = useState(false);
  const [hoverCloseX, setHoverCloseX] = useState(false);
  if (!shot) return null;

  return (
    <div
      role="dialog"
      aria-label="Captured shot preview"
      data-testid="capture-preview"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        fontFamily: "Inter, Arial, sans-serif",
        textAlign: "left",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 12,
          borderRadius: 14,
          background: "rgba(8,8,8,0.72)",
          border: "1px solid rgba(232,181,77,0.35)",
          boxShadow: "0 16px 60px rgba(0,0,0,0.6)",
          maxWidth: "min(88vw, 880px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: GOLD,
                boxShadow: `0 0 8px ${GOLD}`,
                display: "inline-block",
              }}
            />
            Captured shot
            <span
              data-testid="capture-meta"
              style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}
            >
              {shot.width}×{shot.height} · PNG
            </span>
          </div>
          <button
            data-testid="capture-close-x"
            onClick={onClose}
            onMouseEnter={() => setHoverCloseX(true)}
            onMouseLeave={() => setHoverCloseX(false)}
            title="Close preview"
            aria-label="Close preview"
            style={{
              fontFamily: "inherit",
              fontSize: 12,
              lineHeight: 1,
              width: 24,
              height: 24,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: hoverCloseX
                ? "rgba(255,255,255,0.14)"
                : "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.85)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <img
          data-testid="capture-image"
          src={shot.url}
          alt="Captured Studio scene"
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "64vh",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <a
            data-testid="capture-download"
            href={shot.url}
            download={shot.filename}
            onMouseEnter={() => setHoverDownload(true)}
            onMouseLeave={() => setHoverDownload(false)}
            style={{
              fontFamily: "inherit",
              fontSize: 11,
              letterSpacing: "0.04em",
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(232,181,77,0.35)",
              background: hoverDownload
                ? "rgba(232,181,77,0.18)"
                : "rgba(232,181,77,0.06)",
              color: GOLD,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            ⤓ Download PNG
          </a>
          <GhostButton testId="capture-close" onClick={onClose}>
            Close
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
