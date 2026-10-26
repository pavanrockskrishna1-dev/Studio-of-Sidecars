/* Slice P2 — props in the Studio Session: the half that touches the stage.
   ---------------------------------------------------------------------------
   Restoring a session that has a `props` list replaces the scene's props with
   the saved ones: the current props are removed, then each saved prop is added
   again at its saved pose and item id through the stage's own addObject (the
   same path a Props card takes, so the cap, the triangle budget and the one
   undo step per add all apply). If the session also switches the product, the
   new stage mounts a moment later: this waits until the Garage layout belongs
   to that product and the stage's api is registered, and gives up quietly
   after a timeout. Nothing is added to a product other than the saved one. */

import * as garageStore from "../garage/garageStore";
import * as garageMode from "../garage/garageMode";
import { isPropId } from "../products/props";
import { parseSessionProps, propsForSession } from "../garage/propsSession";

// The props now in the scene, as the session stores them.
export function currentSessionProps() {
  return propsForSession(garageStore.getLayout());
}

export function removeAllProps() {
  const layout = garageStore.getLayout();
  if (!layout) return 0;
  let n = 0;
  for (const i of layout.items) {
    if (!i.primary && isPropId(i.assetId) && garageStore.removeItem(i.itemId).ok) n += 1;
  }
  return n;
}

const stageReady = (productId) => {
  const layout = garageStore.getLayout();
  const primary = layout ? layout.items.find((i) => i.primary) : null;
  const api = garageMode.apiRef.current;
  return !!primary && primary.assetId === productId && !!api && typeof api.addObject === "function";
};

let runId = 0;

/** @returns a promise of { ok, restored, skipped } (never rejects) */
export function restoreSessionProps(productId, raw, { timeoutMs = 20000 } = {}) {
  const list = parseSessionProps(raw);
  if (list === null) return Promise.resolve({ ok: true, restored: 0, skipped: 0, untouched: true });
  const mine = ++runId;
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = async () => {
      if (mine !== runId) return resolve({ ok: false, restored: 0, skipped: list.length, reason: "superseded" });
      if (!stageReady(productId)) {
        if (Date.now() - t0 > timeoutMs) return resolve({ ok: false, restored: 0, skipped: list.length, reason: "timeout" });
        return void setTimeout(tick, 100);
      }
      try {
        removeAllProps();
        let restored = 0;
        for (const p of list) {
          if (mine !== runId) break;
          const r = await garageMode.apiRef.current.addObject(p.assetId, {
            transform: p.transform,
            itemId: p.itemId,
            hidden: p.hidden,
            locked: p.locked,
          });
          if (r && r.ok) restored += 1;
        }
        resolve({ ok: true, restored, skipped: list.length - restored });
      } catch {
        resolve({ ok: false, restored: 0, skipped: list.length, reason: "error" });
      }
    };
    tick();
  });
}

/** Cancels a restore still waiting for the stage (a newer restore does it too). */
export function cancelRestore() {
  runId += 1;
}
