import { useEffect, useState } from "react";
import Icon from "./icons";

/* ==========================================================================
   Slice U1, Stage A/B — floating tool sheet (new file, UI ONLY)
   --------------------------------------------------------------------------
   One tool's content, floated in a single panel. Never resizes or pushes the
   canvas (fixed position, own stacking layer). `side` is the edge it docks to
   ("right", or "left" for a second open sheet; Slice U2 removed the centre
   position so a sheet never covers the middle of the view); `tall` stretches
   an edge sheet from below the capsule to just above the dock row. The header
   carries the peek button (Slice U2) and the pin button (Stage B2): a pinned
   sheet stays open while another icon is clicked. StudioShell owns that rule
   and the placement; this only reports the click. Mounts with a short
   opacity/transform transition (CSS), honouring prefers-reduced-motion in
   ui-shell.css.

   Slice U2:
   - `away` (a Reel Play or export is running): the sheet slides off its edge
     and fades out (CSS transform / opacity) but stays mounted, so it comes back
     exactly as it was (scroll position, open section, field drafts). While away
     it is `inert`: not focusable and not clickable.
   - Peek (eye button): while the button is held (mouse, touch or Space / Enter)
     the sheet is 10% opaque and lets clicks through; released, it returns.
   ========================================================================== */

export default function Sheet({ id, title, icon, side = "right", tall, pinned, away, onPin, onClose, children }) {
  const [shown, setShown] = useState(false);
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // A held peek ends on the pointer's release anywhere (the sheet is click-through
  // while peeking, so the release lands on whatever is under it), on cancel, and
  // when the window loses focus. The release is stopped at the window so the
  // canvas never sees a pointerup whose pointerdown it did not get (it would
  // count as a click against its last stored press point).
  useEffect(() => {
    if (!peek) return undefined;
    const end = (e) => {
      if (e && e.type !== "blur") e.stopPropagation();
      setPeek(false);
    };
    window.addEventListener("pointerup", end, true);
    window.addEventListener("pointercancel", end, true);
    window.addEventListener("blur", end);
    return () => {
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", end, true);
      window.removeEventListener("blur", end);
    };
  }, [peek]);

  return (
    <div
      className="sos2-sheet"
      data-shown={shown || undefined}
      data-side={side}
      data-tall={tall || undefined}
      data-pinned={pinned || undefined}
      data-away={away || undefined}
      data-peek={peek || undefined}
      inert={away || undefined}
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
          className="sos2-icon-btn sos2-peek-btn"
          data-on={peek || undefined}
          data-testid={`ui2-sheet-${id}-peek`}
          title="Peek: hold to see through this sheet"
          aria-label={`Peek through ${title} (hold)`}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            setPeek(true);
          }}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              setPeek(true);
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") setPeek(false);
          }}
          onBlur={() => setPeek(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Icon name="eye" size={14} />
        </button>
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
