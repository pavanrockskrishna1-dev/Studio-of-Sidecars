import { useState } from "react";
import Icon from "./icons";
import {
  CAMERA_FRAMINGS,
  INSPECTOR_PLACEHOLDERS,
  RAIL_CHIPS,
} from "./content";

/* ==========================================================================
   Right inspector rail (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   The mockup's `#inspector`: an exclusive accordion (one section open) holding
   Camera · Lighting · Materials · Render.

   Two honesty rules shaped this file:
   1. The engine already owns camera framing — its Studio Controls panel is
      docked directly above this rail, so the rail mirrors the real preset
      names (read from camera/presets.js, never duplicated) instead of
      shipping a second, decorative set of buttons that do nothing.
   2. Everything the engine has not built yet (lighting, materials, render) is
      a labelled placeholder with inert controls — visibly a shell, never a
      dead-looking fake.
   ========================================================================== */

const SECTIONS = [
  { id: "camera", name: "Camera", sub: "one-tap framing", icon: "camera" },
  { id: "lighting", name: "Lighting", sub: "cinematic looks", icon: "sun" },
  { id: "materials", name: "Materials", sub: "tap a part to style", icon: "cube" },
  { id: "render", name: "Render", sub: "output presets", icon: "render" },
];

function Chips({ items }) {
  return (
    <div className="sos-frow">
      {items.map((text) => (
        <span key={text} className="sos-pchip">
          {text}
        </span>
      ))}
    </div>
  );
}

// Read-only value bar: the mockup's slider look without pretending to drive
// anything. Kept as a div (not an <input>) so it can never steal focus or
// fire a change the engine would ignore.
function VisualField({ label, value, fill }) {
  return (
    <div className="sos-field">
      <div className="sos-field-top">
        <span className="sos-label">{label}</span>
        <span className="sos-field-val">{value}</span>
      </div>
      <div className="sos-slider" aria-hidden="true">
        <i style={{ width: fill }} />
        <b style={{ left: fill }} />
      </div>
    </div>
  );
}

function Hint({ children }) {
  return (
    <p className="sos-hint">
      <Icon name="info" size={12} stroke={1.8} />
      <span>{children}</span>
    </p>
  );
}

function RailCard({ section, open, onToggle, collapsed, onOpenFromStrip, children }) {
  const panelId = `sos-card-${section.id}`;
  return (
    <section className="sos-card" data-open={open}>
      <button
        type="button"
        className="sos-card-head"
        aria-expanded={collapsed ? undefined : open}
        aria-controls={panelId}
        data-testid={`ui-inspector-${section.id}`}
        onClick={collapsed ? onOpenFromStrip : onToggle}
        title={
          collapsed
            ? `${section.name} — expand the inspector on this section`
            : `${section.name} — ${open ? "collapse" : "expand"} panel`
        }
      >
        <span className="sos-tile" aria-hidden="true">
          <Icon name={section.icon} size={16} />
        </span>
        <span className="sos-group-txt">
          <span className="sos-group-name">{section.name}</span>
          <span className="sos-group-sub">{section.sub}</span>
        </span>
        <Icon name="chevron" size={13} className="sos-chev" />
      </button>
      {open ? (
        <div className="sos-card-body" id={panelId} role="region">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export default function InspectorRail({
  dodgeBelow = 0,
  collapsed = false,
  onCollapse,
}) {
  const [openId, setOpenId] = useState("camera");
  const openSection = (id) => setOpenId((prev) => (prev === id ? null : id));
  // From the collapsed strip: bring the rail back with that section open.
  const openFromStrip = (id) => {
    setOpenId(id);
    onCollapse?.();
  };

  return (
    <aside
      className="sos-rail sos-panel"
      aria-label="Inspector"
      // the engine's Studio Controls panel owns the top of this column
      style={dodgeBelow ? { "--sos-dodge": `${dodgeBelow}px` } : undefined}
    >
      <div className="sos-rail-head">
        <button
          type="button"
          className="sos-collapse"
          data-testid="ui-rail-collapse"
          aria-label={collapsed ? "Expand inspector" : "Collapse inspector to icons"}
          title={collapsed ? "Expand inspector" : "Collapse to icons — gives the stage the room back"}
          onClick={onCollapse}
        >
          <Icon name="chevron" size={12} stroke={2} />
        </button>
        <div className="sos-chips">
          {RAIL_CHIPS.map((chip) => (
            <span key={chip.id} className="sos-chip" data-live={chip.live || undefined}>
              {chip.text}
            </span>
          ))}
        </div>
      </div>

      <div className="sos-rail-scroll">
        {SECTIONS.map((section) => (
          <RailCard
            key={section.id}
            section={section}
            open={openId === section.id}
            collapsed={collapsed}
            onOpenFromStrip={() => openFromStrip(section.id)}
            onToggle={() => openSection(section.id)}
          >
            {section.id === "camera" ? (
              <>
                <span className="sos-label">Framing</span>
                <Chips items={CAMERA_FRAMINGS} />
                <div className="sos-fields">
                  <VisualField label="Distance" value="1.8 m" fill="46%" />
                  <VisualField label="Height" value="0.9 m" fill="38%" />
                </div>
                <div className="sos-switchrow">
                  <span className="sos-label">Lock focus on product</span>
                  <span className="sos-switch" aria-hidden="true">
                    <b />
                  </span>
                </div>
                <Hint>Live presets: engine panel above.</Hint>
              </>
            ) : (
              <>
                <Chips items={INSPECTOR_PLACEHOLDERS[section.id]} />
                <Hint>{section.name} preset — UI shell only.</Hint>
              </>
            )}
          </RailCard>
        ))}
      </div>

      <div className="sos-rail-foot">
        <span className="sos-meta">
          UI SHELL · NO ENGINE CONTROL WIRED
        </span>
      </div>
    </aside>
  );
}
