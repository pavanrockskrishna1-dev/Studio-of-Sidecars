import { useEffect, useState } from "react";
import Icon from "./icons";

/* ==========================================================================
   Slice U1, Stage A/B — floating tool sheet (new file, UI ONLY)
   --------------------------------------------------------------------------
   One tool's content, floated in a single panel. Never resizes or pushes the
   canvas (fixed position, own stacking layer). `side` is where it docks
   ("center" above the dock, or the "left" / "right" edge); `tall` stretches
   an edge sheet from below the capsule to just above the dock row. The header
   carries the pin button (Stage B2): a pinned sheet stays open while another
   icon is clicked. StudioShell owns that rule and the placement; this only
   reports the click. Mounts with a short opacity/transform transition (CSS),
   honouring prefers-reduced-motion in ui-shell.css.
   ========================================================================== */

export default function Sheet({ id, title, icon, side = "center", tall, pinned, onPin, onClose, children }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="sos2-sheet"
      data-shown={shown || undefined}
      data-side={side}
      data-tall={tall || undefined}
      data-pinned={pinned || undefined}
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
          className="sos2-icon-btn sos2-pin-btn"
          data-on={pinned || undefined}
          aria-pressed={Boolean(pinned)}
          data-testid={`ui2-sheet-${id}-pin`}
          title={pinned ? "Unpin: this sheet closes with Esc or its icon again" : "Pin: keep this sheet open while you open another"}
          aria-label={pinned ? `Unpin ${title}` : `Pin ${title}`}
          onClick={onPin}
          onMouseUp={(e) => e.currentTarget.blur()}
        >
          <Icon name="pin" size={13} />
        </button>
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
