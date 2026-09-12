import { PRODUCTS } from "../products/registry";

// Minimal dual-studio toggle. Self-contained inline styles on purpose —
// no shared CSS files are touched.
export default function StudioSwitcher({ activeId, onSelect }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 10,
        display: "flex",
        gap: 8,
      }}
    >
      {PRODUCTS.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              fontFamily: "inherit",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${
                active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)"
              }`,
              background: active
                ? "rgba(255,255,255,0.92)"
                : "rgba(10,10,10,0.55)",
              color: active ? "#0a0a0a" : "#ffffff",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
