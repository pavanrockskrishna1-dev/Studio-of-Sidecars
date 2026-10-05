import { useId, useSyncExternalStore } from "react";
import Icon from "./icons";
import { getSnapshot, subscribe, toggleSection } from "./reelSections";

/* ==========================================================================
   Slice U2 - one collapsible Reel sheet section (new file, UI ONLY)
   --------------------------------------------------------------------------
   The header is a button; opening a section closes the others (the open one
   is held in ui/reelSections.js, remembered for the session). A collapsed
   header shows a short summary ("3 of 16"). The body of a closed section stays
   mounted (so a half-typed field or the curve editor keeps its state) but is
   `inert`, folded to zero height by a 220 ms grid transition (ui-shell.css).
   ========================================================================== */

export default function ReelSection({ id, title, summary, children }) {
  const open = useSyncExternalStore(subscribe, getSnapshot, getSnapshot) === id;
  const bodyId = useId();
  return (
    <section className="sos2-sec" data-open={open || undefined} data-testid={`ui2-reel-sec-${id}`}>
      <h3 className="sos2-sec-title">
        <button
          type="button"
          className="sos2-sec-head"
          aria-expanded={open}
          aria-controls={bodyId}
          data-testid={`ui2-reel-sec-${id}-head`}
          onClick={() => toggleSection(id)}
          onMouseUp={(e) => e.currentTarget.blur()}
        >
          <span className="sos2-sec-chev" aria-hidden="true">
            <Icon name="chevron" size={14} />
          </span>
          <span className="sos2-sec-name">{title}</span>
          {!open && summary ? (
            <span className="sos2-sec-sum" data-testid={`ui2-reel-sec-${id}-summary`}>
              {summary}
            </span>
          ) : null}
        </button>
      </h3>
      <div className="sos2-sec-body" id={bodyId} inert={!open || undefined}>
        <div className="sos2-sec-inner">{children}</div>
      </div>
    </section>
  );
}
