import { useState } from "react";

const GOLD = "#e8b54d";

// Small contextual inspector card shown only while a model is selected.
// Positioned top-left (top-right is the asset selector, center is the hero).
// Self-contained inline styles on purpose — no shared CSS files are touched.
export default function SelectionInspector({ name, size, onClear }) {
  const [hoverClear, setHoverClear] = useState(false);

  const dims = [
    { label: "Width", value: size.width },
    { label: "Height", value: size.height },
    { label: "Depth", value: size.depth },
  ];

  return (
    <div
      role="dialog"
      aria-label="Selected model"
      style={{
        position: "fixed",
        top: 14,
        left: 14,
        zIndex: 20,
        width: 220,
        borderRadius: 14,
        background: "rgba(8,8,8,0.62)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        color: "rgba(255,255,255,0.9)",
        fontFamily: "Inter, Arial, sans-serif",
        textAlign: "left",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
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
        Selected model
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "0.01em",
          color: "#ffffff",
          lineHeight: 1.2,
        }}
      >
        {name}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        {dims.map((d) => (
          <div
            key={d.label}
            style={{
              flex: 1,
              borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "6px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span
              style={{
                fontSize: 8,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {d.label}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.92)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {d.value.toFixed(2)} m
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onClear}
        onMouseEnter={() => setHoverClear(true)}
        onMouseLeave={() => setHoverClear(false)}
        style={{
          fontFamily: "inherit",
          fontSize: 11,
          letterSpacing: "0.04em",
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.18)",
          background: hoverClear ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.85)",
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        ✕ Clear selection
      </button>
    </div>
  );
}
