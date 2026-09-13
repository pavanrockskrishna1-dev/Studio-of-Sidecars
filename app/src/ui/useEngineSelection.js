import { useCallback, useEffect, useState } from "react";
import { PRODUCTS } from "../products/registry";
import { ENVIRONMENTS } from "../environments/registry";

/* ==========================================================================
   Asset Library ⇄ Studio engine bridge (Agent #2 · UI ONLY)
   --------------------------------------------------------------------------
   Asset selection lives in App state (`productId` / `environmentId`) and the
   engine exposes it only through the compact chips it renders in
   StudioControls. App.jsx is Agent #1's file, so the library deliberately does
   NOT grow a second selection path, a store, or a mirrored copy of the state:

     click  → the engine's own chip for that registry entry is invoked, which
              runs App's setProductId / handleEnvironmentSelect unchanged;
     state  ← read back from those same chips, so clicking Studio Controls'
              own selector updates the library just as well.

   The registries are imported, never copied, so ids and names can never drift
   from what the studio can actually load. If the engine panel is not mounted,
   or an entry has no chip, selection is a no-op and nothing is highlighted —
   the UI never claims a state the engine does not have.
   ========================================================================== */

const SEED = '[data-testid="capture-shot"]';
const LIST = { product: PRODUCTS, environment: ENVIRONMENTS };
// StudioControls paints the active chip with this inline background; it is the
// engine's own signal, read (never written) by the shell.
const CHIP_ACTIVE_BG = "rgba(255, 255, 255, 0.92)";
// which labelled section of the engine panel carries each picker
const SECTION = { product: "Model", environment: "Environment" };

const norm = (s) => (s || "").replace(/\s+/g, "");

/** The engine's Studio Controls panel (the fixed ancestor of its own anchor). */
export function enginePanel() {
  const seed = document.querySelector(SEED);
  let el = seed ? seed.parentElement : null;
  while (el && getComputedStyle(el).position !== "fixed") el = el.parentElement;
  return el && el.matches("[data-sos-shell], [data-sos-shell] *") ? null : el;
}

/** Section root of the engine panel whose heading reads `Model` / `Environment`. */
function sectionRoot(panel, kind) {
  const label = SECTION[kind];
  if (!panel || !label) return null;
  for (const child of panel.children) {
    if (child.firstElementChild && child.firstElementChild.textContent.trim() === label) {
      return child;
    }
  }
  return null;
}

function chipFor(panel, kind, name) {
  const root = sectionRoot(panel, kind);
  if (!root || !name) return null;
  const value = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(name) : name.replace(/"/g, '\\"');
  return root.querySelector(`button[title="${value}"]`);
}

/**
 * Drive the existing engine handler for one registry entry.
 * @returns {boolean} whether the engine actually received the selection.
 */
export function selectAsset(kind, id) {
  const list = LIST[kind];
  const item = list && list.find((x) => x.id === id);
  if (!item) return false;
  const chip = chipFor(enginePanel(), kind, item.name);
  if (!chip) return false;
  chip.click();
  return true;
}

function readSelection(panel) {
  const out = { productId: null, environmentId: null };
  if (!panel) return out;
  for (const kind of Object.keys(LIST)) {
    const key = kind === "product" ? "productId" : "environmentId";
    for (const item of LIST[kind]) {
      const chip = chipFor(panel, kind, item.name);
      if (chip && norm(chip.style.background) === norm(CHIP_ACTIVE_BG)) {
        out[key] = item.id;
        break;
      }
    }
  }
  return out;
}

export default function useEngineSelection() {
  const [sel, setSel] = useState({ productId: null, environmentId: null, ready: false });

  useEffect(() => {
    let panel = null;
    let observer = null;
    let timer = null;
    let tries = 0;

    const publish = (ready) => {
      const next = readSelection(panel);
      setSel((prev) =>
        prev.productId === next.productId &&
        prev.environmentId === next.environmentId &&
        prev.ready === ready
          ? prev
          : { ...next, ready }
      );
    };

    const attach = () => {
      panel = enginePanel();
      if (!panel) {
        // the engine mounts as a sibling; give it a few frames, then stop
        if (++tries < 40) timer = setTimeout(attach, 100);
        else publish(false);
        return;
      }
      observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => publish(true), 16);
      });
      observer.observe(panel, {
        attributes: true,
        attributeFilter: ["style"],
        childList: true,
        subtree: true,
      });
      publish(true);
    };

    attach();
    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, []);

  const select = useCallback((kind, id) => selectAsset(kind, id), []);

  return { ...sel, select };
}
