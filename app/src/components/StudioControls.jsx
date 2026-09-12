import { ENVIRONMENTS } from "../environments/registry";
import { PRODUCTS } from "../products/registry";
import { CAMERA_PRESETS } from "../camera/presets";

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
function CameraRow({ activePresetId, onPreset }) {
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
      </div>
    </div>
  );
}

export default function StudioControls({
  environmentId,
  onEnvironmentSelect,
  productId,
  onProductSelect,
  activePresetId,
  onCameraPreset,
}) {
  return (
    <div
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
      <CameraRow activePresetId={activePresetId} onPreset={onCameraPreset} />
    </div>
  );
}
