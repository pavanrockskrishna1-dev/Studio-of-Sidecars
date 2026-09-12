import { useState } from "react";

const GOLD = "#e8b54d";

// Hide native number-input spinners — keeps the compact fields clean.
const SPINNER_CSS = `
.sis-num::-webkit-outer-spin-button,
.sis-num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.sis-num { -moz-appearance: textfield; appearance: textfield; }
`;

function format(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "0";
}

// Compact numeric field. Keeps its own "draft" string only while focused so the
// user can type freely; while unfocused it mirrors the committed value (so a
// Reset instantly re-displays the restored numbers).
function NumberField({ label, value, onChange, step = 0.05, unit = "", testId }) {
  const [draft, setDraft] = useState(null);
  const display = draft !== null ? draft : format(value);

  const commit = (raw) => {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onChange(n);
  };

  return (
    <label
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        borderRadius: 10,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "5px 7px",
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
        {label}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <input
          className="sis-num"
          data-testid={testId}
          type="number"
          step={step}
          value={display}
          onFocus={() => setDraft(format(value))}
          onBlur={() => {
            commit(display);
            setDraft(null);
          }}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          style={{
            width: "100%",
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "rgba(255,255,255,0.92)",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
            fontVariantNumeric: "tabular-nums",
            padding: 0,
          }}
        />
        {unit ? (
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{unit}</span>
        ) : null}
      </span>
    </label>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: GOLD,
        opacity: 0.85,
      }}
    >
      {children}
    </div>
  );
}

function AxisRow({ children }) {
  return <div style={{ display: "flex", gap: 6 }}>{children}</div>;
}

export default function SelectionInspector({
  name,
  size,
  transform,
  onTransformChange,
  onResetTransform,
  onClear,
}) {
  const [hoverClear, setHoverClear] = useState(false);
  const [hoverReset, setHoverReset] = useState(false);

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
        width: 244,
        maxHeight: "calc(100vh - 28px)",
        overflowY: "auto",
        borderRadius: 14,
        background: "rgba(8,8,8,0.62)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 9,
        color: "rgba(255,255,255,0.9)",
        fontFamily: "Inter, Arial, sans-serif",
        textAlign: "left",
      }}
    >
      <style>{SPINNER_CSS}</style>

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

      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
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

      <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }} />

      <SectionLabel>Position</SectionLabel>
      <AxisRow>
        <NumberField
          label="X"
          value={transform.x}
          step={0.05}
          unit="m"
          testId="pos-x"
          onChange={(v) => onTransformChange({ x: v })}
        />
        <NumberField
          label="Y"
          value={transform.y}
          step={0.05}
          unit="m"
          testId="pos-y"
          onChange={(v) => onTransformChange({ y: v })}
        />
        <NumberField
          label="Z"
          value={transform.z}
          step={0.05}
          unit="m"
          testId="pos-z"
          onChange={(v) => onTransformChange({ z: v })}
        />
      </AxisRow>

      <SectionLabel>Rotation</SectionLabel>
      <AxisRow>
        <NumberField
          label="X"
          value={transform.rx}
          step={1}
          unit="°"
          testId="rot-x"
          onChange={(v) => onTransformChange({ rx: v })}
        />
        <NumberField
          label="Y"
          value={transform.ry}
          step={1}
          unit="°"
          testId="rot-y"
          onChange={(v) => onTransformChange({ ry: v })}
        />
        <NumberField
          label="Z"
          value={transform.rz}
          step={1}
          unit="°"
          testId="rot-z"
          onChange={(v) => onTransformChange({ rz: v })}
        />
      </AxisRow>

      <SectionLabel>Scale</SectionLabel>
      <NumberField
        label="Uniform"
        value={transform.s}
        step={0.05}
        unit="×"
        testId="scale"
        onChange={(v) => onTransformChange({ s: Math.max(0.05, v) })}
      />

      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        <button
          data-testid="reset-transform"
          onClick={onResetTransform}
          onMouseEnter={() => setHoverReset(true)}
          onMouseLeave={() => setHoverReset(false)}
          style={{
            fontFamily: "inherit",
            fontSize: 11,
            letterSpacing: "0.04em",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(232,181,77,0.35)",
            background: hoverReset ? "rgba(232,181,77,0.18)" : "rgba(232,181,77,0.06)",
            color: GOLD,
            cursor: "pointer",
          }}
        >
          ↺ Reset Transform
        </button>
        <button
          data-testid="clear-selection"
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
          }}
        >
          ✕ Clear selection
        </button>
      </div>
    </div>
  );
}
