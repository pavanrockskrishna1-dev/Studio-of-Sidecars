import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { backdropGate, exportsAllowed, GATE_LABEL } from "../capture/exportGate";
import { ENVIRONMENTS } from "../environments/registry";
import { PRODUCTS } from "../products/registry";
import { EXPORT_PRESETS, EXPORT_SCALES } from "../capture/exportOptions";
import { CAMERA_PRESETS } from "../camera/presets";
import { LIGHTING_CONTROLS } from "../lighting/profiles";
import { subscribe as subscribeLightSlot, getLightSlot } from "../ui/lightSlot";

const GOLD = "#e8b54d";

// Compact asset-selection controls (environment + model).
// Self-contained inline styles on purpose — no shared CSS files are touched.
// Placed top-right, small and translucent so it never obstructs the stage.
function Row({ label, options, activeId, onSelect }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 262 }}>
        {options.map((o) => {
          const active = o.id === activeId;
          return (
            <button
              key={o.id}
              title={o.name}
              onClick={() => onSelect(o.id)}
              style={{
                fontFamily: "inherit",
                fontSize: 10,
                letterSpacing: "0.04em",
                padding: "3px 8px",
                borderRadius: 999,
                border: `1px solid ${
                  active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)"
                }`,
                background: active ? "rgba(255,255,255,0.92)" : "rgba(10,10,10,0.5)",
                color: active ? "#0a0a0a" : "rgba(255,255,255,0.85)",
                cursor: "pointer",
              }}
            >
              {o.label ?? o.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Small schematic thumbnail: a presentation platform, a product stand-in, and
// a view frustum drawn from the preset's camera position toward the model. The
// frustum position communicates the viewpoint (front / side / 3/4 / rear /
// overhead / low), so the card reads at a glance instead of relying on names.
function PresetThumb({ thumb }) {
  const [cx, cy] = thumb.cam;
  const [tx, ty] = thumb.target;
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const reach = len * 0.55;
  const halfW = 2.6;
  const bx = cx + ux * reach;
  const by = cy + uy * reach;
  const b1 = `${(bx + px * halfW).toFixed(1)},${(by + py * halfW).toFixed(1)}`;
  const b2 = `${(bx - px * halfW).toFixed(1)},${(by - py * halfW).toFixed(1)}`;

  return (
    <svg
      width="44"
      height="26"
      viewBox="0 0 48 30"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* presentation platform */}
      <ellipse
        cx="24"
        cy="21.5"
        rx="14"
        ry="4.2"
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.16)"
      />
      {/* product stand-in */}
      <rect x="20" y="8" width="8" height="12" rx="2" fill="rgba(255,255,255,0.30)" />
      <rect x="21.5" y="9.5" width="2" height="8.5" rx="1" fill="rgba(255,255,255,0.16)" />
      {/* view axis */}
      <line
        x1={cx}
        y1={cy}
        x2={tx}
        y2={ty}
        stroke="rgba(232,181,77,0.55)"
        strokeDasharray="2 2"
      />
      {/* view frustum */}
      <polygon
        points={`${cx},${cy} ${b1} ${b2}`}
        fill="rgba(232,181,77,0.18)"
        stroke="rgba(232,181,77,0.75)"
      />
      {/* camera */}
      <circle cx={cx} cy={cy} r="1.6" fill={GOLD} />
    </svg>
  );
}

// Camera presets — compact visual cards (thumbnail + name), one-click apply.
// Mission 7.2 (Save Custom View): once a view is saved, one extra "Custom"
// card appears beside the built-ins (same card language, bookmark glyph);
// the ghost pill below snapshots the current camera as that Custom view.
function CameraRow({
  activePresetId,
  onPreset,
  hasCustomView,
  onSaveCustomView,
}) {
  const [hoverSave, setHoverSave] = useState(false);
  const customActive = activePresetId === "custom";
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          marginBottom: 4,
        }}
      >
        Camera
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 4,
          maxWidth: 262,
        }}
      >
        {CAMERA_PRESETS.map((p) => {
          const active = p.id === activePresetId;
          return (
            <button
              key={p.id}
              title={`${p.name} shot`}
              data-active={active ? "true" : "false"}
              onClick={() => onPreset(p.id)}
              style={{
                fontFamily: "inherit",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "5px 2px 4px",
                borderRadius: 8,
                border: `1px solid ${
                  active ? "rgba(232,181,77,0.9)" : "rgba(255,255,255,0.18)"
                }`,
                background: active ? "rgba(232,181,77,0.14)" : "rgba(10,10,10,0.5)",
                cursor: "pointer",
              }}
            >
              <PresetThumb thumb={p.thumb} />
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.03em",
                  color: active ? GOLD : "rgba(255,255,255,0.82)",
                  lineHeight: 1.1,
                }}
              >
                {p.name}
              </span>
            </button>
          );
        })}
        {hasCustomView && (
          <button
            key="custom"
            data-testid="custom-view-card"
            data-active={customActive ? "true" : "false"}
            title="Restore saved custom view"
            onClick={() => onPreset("custom")}
            style={{
              fontFamily: "inherit",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "5px 2px 4px",
              borderRadius: 8,
              border: `1px solid ${
                customActive ? "rgba(232,181,77,0.9)" : "rgba(255,255,255,0.18)"
              }`,
              background: customActive
                ? "rgba(232,181,77,0.14)"
                : "rgba(10,10,10,0.5)",
              cursor: "pointer",
            }}
          >
            <svg
              width="44"
              height="26"
              viewBox="0 0 48 30"
              aria-hidden="true"
              style={{ display: "block" }}
            >
              {/* bookmark glyph — the saved-view slot */}
              <path
                d="M18 6.5 h12 v17 l-6 -4.6 l-6 4.6 z"
                fill="rgba(232,181,77,0.18)"
                stroke="rgba(232,181,77,0.75)"
              />
            </svg>
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.03em",
                color: customActive ? GOLD : "rgba(255,255,255,0.82)",
                lineHeight: 1.1,
              }}
            >
              Custom
            </span>
          </button>
        )}
      </div>
      <button
        data-testid="save-custom-view"
        title="Save the current camera view as the Custom view"
        onClick={onSaveCustomView}
        onMouseEnter={() => setHoverSave(true)}
        onMouseLeave={() => setHoverSave(false)}
        style={{
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          width: "100%",
          marginTop: 4,
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "5px 8px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.18)",
          background: hoverSave ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.85)",
          cursor: "pointer",
        }}
      >
        <svg width="9" height="10" viewBox="0 0 12 13" aria-hidden="true">
          <path
            d="M2.5 1 h7 v11 l-3.5 -2.7 l-3.5 2.7 z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
        Save Custom View
      </button>
    </div>
  );
}

// Mission 9 (Lighting Foundation) — compact Lighting section: six live
// sliders (key / fill / rim / ambient / shadow / exposure) in a two-column
// grid, same compact dark language as the rest of the panel. Every input
// event updates the Studio renderer immediately.
function LightingRow({ lighting, onLightingChange }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          marginBottom: 4,
        }}
      >
        Lighting
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "5px 10px",
          maxWidth: 262,
        }}
      >
        {LIGHTING_CONTROLS.map((c) => (
          <label
            key={c.id}
            style={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 8,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <span>{c.label}</span>
              <span
                style={{
                  color: "rgba(255,255,255,0.62)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Number(lighting[c.id]).toFixed(2)}
              </span>
            </span>
            <input
              data-testid={`light-${c.id}`}
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={lighting[c.id]}
              onChange={(e) =>
                onLightingChange({ [c.id]: parseFloat(e.target.value) })
              }
              style={{
                width: "100%",
                height: 12,
                margin: 0,
                accentColor: GOLD,
                background: "transparent",
                cursor: "pointer",
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

// Slice U1 — the Light dock sheet asked for these sliders MOVED, not
// duplicated: one LightingRow instance, portaled into the sheet's slot
// (ui/lightSlot.js) while it's open, otherwise rendered right here exactly
// as before. Never two copies of the same six inputs at once.
function LightingSlot({ lighting, onLightingChange }) {
  const slot = useSyncExternalStore(subscribeLightSlot, getLightSlot, () => null);
  const row = <LightingRow lighting={lighting} onLightingChange={onLightingChange} />;
  return slot ? createPortal(row, slot) : row;
}

// Mission 10C (Presentation Studio) — compact export options beneath the
// Capture Shot action: background, resolution and presentation framing.
// Same visual language as the Lighting row (micro-uppercase label + inline
// segmented controls). Presentation only: the values live in App state and
// are consumed by the existing single capture pipeline — no second path.
function SegButton({ testId, active, disabled, onClick, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      data-testid={testId}
      aria-pressed={active}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: "inherit",
        fontSize: 9,
        letterSpacing: "0.08em",
        padding: "4px 8px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(232,181,77,0.55)"
          : "1px solid rgba(255,255,255,0.16)",
        background: active
          ? "rgba(232,181,77,0.16)"
          : hover && !disabled
            ? "rgba(255,255,255,0.1)"
            : "rgba(255,255,255,0.03)",
        color: active
          ? GOLD
          : disabled
            ? "rgba(255,255,255,0.28)"
            : "rgba(255,255,255,0.75)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

function ExportOptions({ exportOpts, onChange }) {
  const presetActive = exportOpts.presetId !== "current";
  const labelStyle = {
    fontSize: 9,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
  };
  return (
    <div
      data-testid="export-options"
      style={{ display: "flex", flexDirection: "column", gap: 5 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span style={labelStyle}>Background</span>
        <span style={{ display: "flex", gap: 4 }}>
          <SegButton
            testId="cap-bg-studio"
            active={exportOpts.background === "studio"}
            onClick={() => onChange({ background: "studio" })}
          >
            Studio
          </SegButton>
          <SegButton
            testId="cap-bg-transparent"
            active={exportOpts.background === "transparent"}
            onClick={() => onChange({ background: "transparent" })}
          >
            Transparent
          </SegButton>
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span style={labelStyle}>Resolution</span>
        <span style={{ display: "flex", gap: 4 }}>
          {EXPORT_SCALES.map((sc) => (
            <SegButton
              key={sc}
              testId={`cap-res-${sc}`}
              active={!presetActive && exportOpts.scale === sc}
              disabled={presetActive}
              onClick={() => onChange({ scale: sc })}
            >
              {sc}×
            </SegButton>
          ))}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span style={labelStyle}>Format</span>
        <select
          data-testid="cap-format"
          value={exportOpts.presetId}
          onChange={(e) => onChange({ presetId: e.target.value })}
          style={{
            fontFamily: "inherit",
            fontSize: 10,
            color: "rgba(255,255,255,0.8)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 8,
            padding: "3px 6px",
            maxWidth: 150,
          }}
        >
          {EXPORT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.width > 0 ? `${p.label} · ${p.width}×${p.height}` : p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Mission 8 (Capture Shot Foundation) — one compact gold action beneath the
// CAMERA presets. It captures the live WebGL presentation exactly as shown
// (environment, model, transform, camera, selection) and changes nothing.
function CaptureRow({ onCapture }) {
  const [hover, setHover] = useState(false);
  // Cleanup slice: disabled until the environment backdrop has loaded.
  const gate = useSyncExternalStore(backdropGate.subscribe, backdropGate.getSnapshot, backdropGate.getSnapshot);
  const blocked = !exportsAllowed(gate);
  return (
    <button
      data-testid="capture-shot"
      title={blocked ? "Waiting for the environment backdrop to load" : "Capture the current view as a PNG"}
      disabled={blocked}
      onClick={onCapture}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(232,181,77,0.35)",
        background: hover ? "rgba(232,181,77,0.18)" : "rgba(232,181,77,0.06)",
        color: GOLD,
        cursor: blocked ? "default" : "pointer",
        opacity: blocked ? 0.5 : 1,
      }}
    >
      {/* shutter glyph */}
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <circle
          cx="6"
          cy="6"
          r="4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="6" cy="6" r="2" fill="currentColor" />
      </svg>
      {blocked ? GATE_LABEL : "Capture Shot"}
    </button>
  );
}

export default function StudioControls({
  environmentId,
  onEnvironmentSelect,
  productId,
  onProductSelect,
  activePresetId,
  onCameraPreset,
  onCaptureShot,
  hasCustomView,
  onSaveCustomView,
  lighting,
  onLightingChange,
  exportOpts,
  onExportOptsChange,
}) {
  return (
    <div
      data-studio-controls=""
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 7,
        padding: "8px 10px",
        borderRadius: 12,
        background: "rgba(5,5,5,0.4)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.1)",
        // Never let the panel grow past the viewport: on short windows the
        // CAMERA section would otherwise overflow off-screen and become
        // unreachable. Cap the height and scroll the panel internally instead.
        maxHeight: "calc(100vh - 20px)",
        overflowY: "auto",
      }}
    >
      <Row
        label="Environment"
        options={ENVIRONMENTS}
        activeId={environmentId}
        onSelect={onEnvironmentSelect}
      />
      <Row
        label="Model"
        options={PRODUCTS}
        activeId={productId}
        onSelect={onProductSelect}
      />
      <CameraRow
        activePresetId={activePresetId}
        onPreset={onCameraPreset}
        hasCustomView={hasCustomView}
        onSaveCustomView={onSaveCustomView}
      />
      <LightingSlot lighting={lighting} onLightingChange={onLightingChange} />
      <CaptureRow onCapture={onCaptureShot} />
      {exportOpts && onExportOptsChange ? (
        <ExportOptions exportOpts={exportOpts} onChange={onExportOptsChange} />
      ) : null}
    </div>
  );
}
