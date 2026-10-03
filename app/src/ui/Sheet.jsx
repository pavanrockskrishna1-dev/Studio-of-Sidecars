import { useEffect, useState } from "react";
import Icon from "./icons";

/* ==========================================================================
   Slice U1, Stage A — floating tool sheet (new file, UI ONLY)
   --------------------------------------------------------------------------
   One tool's content, floated in a single panel anchored above the dock.
   Never resizes or pushes the canvas (fixed position, own stacking layer).
   Stage A ships exactly one of these (Light) with a plain close button;
   the pin feature is a Stage B item (see HANDOFF/the slice brief) and is not
   built yet. Mounts with a short opacity/transform transition (CSS),
   honouring prefers-reduced-motion in ui-shell.css.
   ========================================================================== */

export default function Sheet({ id, title, icon, onClose, children }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="sos2-sheet"
      data-shown={shown || undefined}
      role="dialog"
      aria-label={title}
      data-testid={`ui2-sheet-${id}`}
    >
      <div className="sos2-sheet-head">
        <span className="sos2-sheet-tile" aria-hidden="true">
          {icon ? <Icon name={icon} size={15} /> : null}
        </span>
        <span className="sos2-sheet-title">{title}</span>
        <button
          type="button"
          className="sos2-icon-btn"
          data-testid={`ui2-sheet-${id}-close`}
          title="Close"
          aria-label="Close"
          onClick={onClose}
          onMouseUp={(e) => e.currentTarget.blur()}
        >
          <Icon name="plus" size={13} style={{ transform: "rotate(45deg)" }} />
        </button>
      </div>
      <div className="sos2-sheet-body">{children}</div>
    </div>
  );
}
