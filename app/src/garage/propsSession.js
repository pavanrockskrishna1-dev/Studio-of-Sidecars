/* Slice P2 — props in the Studio Session: the pure part.
   ---------------------------------------------------------------------------
   A prop is an ordinary Garage added object (see products/props.js), so the
   session only needs to remember which props stand where. The session saves
   them as props = [{ itemId, assetId, transform, hidden }]
   (item ids are kept so Reel keys and cycles that point at a prop still do).
   A session saved before props existed has no `props` key: restoring it leaves
   the scene's props alone (parseSessionProps(undefined) is null).

   Pure JS, nothing here throws. The impure half (waiting for the stage and
   adding the props) is session/propsRestore.js. */

import { isPropId } from "../products/props.js";
import { OBJECT_LIMITS } from "./sceneObjects.js";

const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const TRANSFORM_KEYS = ["x", "y", "z", "rx", "ry", "rz", "s"];

// The props of a Garage layout, in layout order.
export function propsForSession(layout) {
  if (!layout || !Array.isArray(layout.items)) return [];
  return layout.items
    .filter((i) => !i.primary && isPropId(i.assetId))
    .map((i) => ({
      itemId: i.itemId,
      assetId: i.assetId,
      transform: Object.fromEntries(TRANSFORM_KEYS.map((k) => [k, i.transform[k]])),
      hidden: i.hidden === true,
      locked: i.locked === true,
      ...(typeof i.animationClip === "string" && i.animationClip ? { animationClip: i.animationClip } : {}),
      ...(typeof i.blackboardText === "string" && i.blackboardText ? { blackboardText: i.blackboardText } : {}),
    }));
}

// The clean list from a saved `props` value, or null when the session has none
// (undefined / not an array). Entries that are not valid props are dropped; the
// list is cut at MAX_PROPS; a repeated item id keeps its first entry.
export function parseSessionProps(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  const seen = new Set();
  for (const e of raw) {
    if (out.length >= OBJECT_LIMITS.MAX_PROPS) break;
    if (!e || typeof e !== "object") continue;
    if (!isPropId(e.assetId)) continue;
    if (typeof e.itemId !== "string" || !/^i[0-9]{1,6}$/.test(e.itemId) || e.itemId === "i0" || seen.has(e.itemId)) continue;
    const t = e.transform;
    if (!t || typeof t !== "object" || !TRANSFORM_KEYS.every((k) => isNum(t[k])) || !(t.s > 0)) continue;
    seen.add(e.itemId);
    out.push({
      itemId: e.itemId,
      assetId: e.assetId,
      transform: Object.fromEntries(TRANSFORM_KEYS.map((k) => [k, t[k]])),
      hidden: e.hidden === true,
      locked: e.locked === true,
      ...(typeof e.animationClip === "string" && e.animationClip ? { animationClip: e.animationClip } : {}),
      ...(typeof e.blackboardText === "string" && e.blackboardText.trim() ? { blackboardText: e.blackboardText.trim().slice(0, 200) } : {}),
    });
  }
  return out;
}
