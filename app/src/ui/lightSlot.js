/* ==========================================================================
   Slice U1 — the Light sheet's slot for the engine's real Lighting sliders
   --------------------------------------------------------------------------
   The six Key/Fill/Rim/Ambient/Shadow/Exposure sliders are owned by the
   engine's own StudioControls panel (data-testid="light-*", the only inputs
   App.jsx's lighting pipeline listens to). The owner asked for them to be
   MOVED into the new Light sheet, not duplicated — so this is a portal
   target, not a second copy: StudioControls renders its existing
   LightingRow into whichever DOM node is registered here (a React portal),
   falling back to rendering inline (its original spot) when no sheet is
   open. Same subscribe/getSnapshot shape as cameraStudio.js / materialStore.js
   so StudioControls can pick it up with useSyncExternalStore.
   ========================================================================== */

let slot = null;
const listeners = new Set();

export function setLightSlot(el) {
  slot = el;
  listeners.forEach((fn) => fn());
}

export function getLightSlot() {
  return slot;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
