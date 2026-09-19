/* One shared entry point to the engine's PNG capture, for shell UI that lives
   outside <App/> (the header's Export button and the Inspector Rail's Render
   section). There is no export code here to keep in sync: StudioControls'
   Capture Shot button calls App's handleCaptureShot (capture the live canvas
   with the current export options → preview lightbox → "Download PNG"), and
   this just clicks that very button. */

const CAPTURE_BUTTON = '[data-testid="capture-shot"]';

/** @returns {boolean} false (a no-op, never a throw) when the engine panel is not mounted */
export function exportPng() {
  const el = document.querySelector(CAPTURE_BUTTON);
  if (!el) return false;
  el.click();
  return true;
}
