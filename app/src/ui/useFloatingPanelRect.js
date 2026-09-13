import { useEffect, useState } from "react";

/* ==========================================================================
   useFloatingPanelRect — read-only layout awareness (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   The creator interface floats over a full-bleed WebGL stage, and two engine
   panels occupy the corners the new chrome also wants:
     · StudioControls  (environment / model / camera presets / Capture Shot)
                       fixed top-right  — it owns the top-right column
     · SelectionInspector (transform read-outs) fixed top-left — present only
                       while a model is selected
   The engine owns those components, so instead of restyling or moving them
   (out of scope, and a guaranteed merge conflict with the Studio Engine
   mission) the shell MEASURES them and parks itself in the space that is left:
   the inspector rail sits under the top-right panel, the header/tab bars stop
   short of its column, and the sidebar steps down while the inspector is open.

   Result: zero overlap and zero engine edits, and it self-corrects when the
   engine panel grows (it gained a Save Custom View row mid-mission), when the
   inspector mounts and unmounts, and on resize. Nothing here mutates, imports
   or styles an engine component — only geometry is read.
   ========================================================================== */

const PANELS = {
  // The engine's shoot-controls panel is identified by its Capture Shot
  // action, then resolved up to the fixed-position panel that hosts it.
  "shoot-controls": () => {
    const trigger = document.querySelector('[data-testid="capture-shot"]');
    if (!trigger) return null;
    let node = trigger.parentElement;
    while (node) {
      if (getComputedStyle(node).position === "fixed") return node;
      node = node.parentElement;
    }
    return null;
  },
  "selection-inspector": () =>
    document.querySelector('[role="dialog"][aria-label="Selected model"]'),
};

// Engine panels carry their own 10/14px inset; only a panel that really
// occupies viewport area is worth dodging.
const MIN_SIZE = 60;

const read = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < MIN_SIZE || r.height < MIN_SIZE) return null;
  return { bottom: Math.round(r.bottom), width: Math.round(r.width) };
};

export default function useFloatingPanelRect(panel) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const find = PANELS[panel];
    if (!find) return undefined;

    let current = null;
    let last = null;
    let resizeObserver = null;
    let timer = 0;

    const publish = (next) => {
      const same = (!next && !last) || (next && last &&
        next.bottom === last.bottom && next.width === last.width);
      if (same) return;          // unrelated engine DOM churn must not re-render the shell
      last = next;
      setRect(next);
    };

    const apply = () => {
      const next = find();
      if (next !== current) {
        if (resizeObserver) resizeObserver.disconnect();
        current = next;
        if (current && typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => publish(read(current)));
          resizeObserver.observe(current);
        }
      }
      publish(read(current));
    };
    // A timer, not requestAnimationFrame: this page renders WebGL on demand, so
    // an idle tab may not schedule a frame for a long time — and the shell's
    // dodge has to follow the engine panel immediately, not on the next input.
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(apply, 16);
    };

    apply();

    // The selection inspector appears and disappears; watch for that, but only
    // on structural changes, and coalesce them into one frame.
    const mutation = new MutationObserver(schedule);
    mutation.observe(document.getElementById("root") ?? document.body, {
      childList: true,
      subtree: true,
    });
    window.addEventListener("resize", schedule);

    return () => {
      clearTimeout(timer);
      mutation.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [panel]);

  return rect;
}
