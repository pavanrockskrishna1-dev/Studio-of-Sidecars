import { useEffect, useState } from "react";

/* ==========================================================================
   Slice U1 — idle fade (new file, UI ONLY)
   --------------------------------------------------------------------------
   Drives the "fade to ~25% opacity after 2s of no input, back to full on
   pointer/wheel/key input; never while hovered or focused" rule shared by the capsule and the
   dock. One shared boolean so both fade in lockstep; each caller applies it
   as a `data-idle` attribute and does the actual opacity change in CSS
   (transform/opacity transitions only, per the LOOK rules).
   ========================================================================== */

const IDLE_MS = 2000;

// The loading overlay (components/LoadingScreen.jsx) sits above the chrome while
// the model loads. Idle time is not counted while it is up, otherwise a slow
// load would leave the dock already faded to 25% the moment it first appears.
const loadingUp = () => !!document.querySelector('.loading-screen[data-loading="true"]');

// The chrome never fades while the pointer is over it or keyboard focus is
// inside it (that also covers every visible dock tooltip, which only shows on
// hover or focus-visible of a dock button).
const CHROME = ".sos2-capsule, .sos2-dock, .sos2-sheet";
const chromeHeld = () =>
  [...document.querySelectorAll(CHROME)].some(
    (el) => el.matches(":hover") || el.contains(document.activeElement)
  );

const WAKE_EVENTS = ["pointermove", "pointerdown", "wheel", "keydown", "focusin"];

export default function useIdleFade(ms = IDLE_MS) {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let last = Date.now();
    const wake = () => {
      last = Date.now();
      setIdle(false);
    };
    const tick = setInterval(() => {
      if (loadingUp() || chromeHeld()) {
        last = Date.now();
        setIdle(false);
      } else if (Date.now() - last >= ms) setIdle(true);
    }, 100);
    WAKE_EVENTS.forEach((e) => window.addEventListener(e, wake, { capture: true, passive: true }));
    return () => {
      clearInterval(tick);
      WAKE_EVENTS.forEach((e) => window.removeEventListener(e, wake, { capture: true }));
    };
  }, [ms]);

  return idle;
}
