import Icon from "./icons";

/* ==========================================================================
   Slice U1 — floating tool dock (new file, UI ONLY)
   --------------------------------------------------------------------------
   Bottom-centre icon strip, no labels (tooltip on hover/focus via the
   `data-tip` attribute — see ui-shell.css). Seven tools, a divider, then
   Save and Capture. Every icon opens its own sheet (Stage B2: Garage, Poster
   and Reel included). This component only reports which id was clicked and
   highlights every id whose sheet is open (up to two: one pinned, one not).
   Capture opens its sheet; it never captures by itself.
   ========================================================================== */

// A mouse click leaves the button focused, and this CSS's tooltip shows on
// :focus-visible as well as :hover (needed for real keyboard use) — so a
// button clicked with the mouse would otherwise keep showing its tooltip
// indefinitely with the pointer long gone. Blur on mouseup only (never fires
// for a keyboard-driven click), so Tab navigation still shows the tooltip.
const blurOnMouseUp = (e) => e.currentTarget.blur();

const TOOLS = [
  { id: "creator", label: "Creator", icon: "cube" },
  { id: "materials", label: "Materials", icon: "palette" },
  { id: "camera", label: "Camera", icon: "camera" },
  { id: "light", label: "Light", icon: "sun" },
  { id: "garage", label: "Garage", icon: "frame" },
  { id: "poster", label: "Poster", icon: "swatch" },
  { id: "reel", label: "Reel", icon: "film" },
];

export default function StudioDock({ openIds = [], onSelect, idle }) {
  return (
    <nav className="sos2-dock" data-idle={idle || undefined} aria-label="Studio tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="sos2-dock-btn"
          data-on={openIds.includes(t.id) || undefined}
          aria-pressed={openIds.includes(t.id)}
          data-testid={`ui2-dock-${t.id}`}
          data-tip={t.label}
          aria-label={t.label}
          onClick={() => onSelect(t.id)}
          onMouseUp={blurOnMouseUp}
        >
          <Icon name={t.icon} size={18} />
        </button>
      ))}
      <span className="sos2-dock-divider" aria-hidden="true" />
      <button
        type="button"
        className="sos2-dock-btn"
        data-on={openIds.includes("save") || undefined}
        aria-pressed={openIds.includes("save")}
        data-testid="ui2-dock-save"
        data-tip="Save"
        aria-label="Save"
        onClick={() => onSelect("save")}
        onMouseUp={blurOnMouseUp}
      >
        <Icon name="save" size={18} />
      </button>
      <button
        type="button"
        className="sos2-dock-btn sos2-dock-capture"
        data-on={openIds.includes("capture") || undefined}
        aria-pressed={openIds.includes("capture")}
        data-testid="ui2-dock-capture"
        data-tip="Capture"
        aria-label="Capture"
        onClick={() => onSelect("capture")}
        onMouseUp={blurOnMouseUp}
      >
        <Icon name="aperture" size={18} />
      </button>
    </nav>
  );
}
