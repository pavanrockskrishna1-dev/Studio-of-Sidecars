import { ENVIRONMENTS } from "../environments/registry";
import { PRODUCTS } from "../products/registry";

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

export default function StudioControls({
  environmentId,
  onEnvironmentSelect,
  productId,
  onProductSelect,
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
    </div>
  );
}
