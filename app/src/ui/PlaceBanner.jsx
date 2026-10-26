import { useEffect, useSyncExternalStore } from "react";
import * as placeMode from "../garage/placeMode";
import { PROPS } from "../products/props";
import { EFFECT_TYPES } from "../fx/effectsStore";

// On-stage banner for the prop shelf: while placing it says what to do; after
// a click it shows what happened (added, or why not) for a few seconds.
export default function PlaceBanner() {
  const s = useSyncExternalStore(placeMode.subscribe, placeMode.getSnapshot, placeMode.getSnapshot);
  const placing = !s.assetId
    ? null
    : s.assetId.startsWith("fx:")
      ? { name: EFFECT_TYPES[s.assetId.slice(3)]?.label ?? "effect" }
      : PROPS.find((p) => p.id === s.assetId);

  useEffect(() => {
    if (s.assetId || !s.message || s.message === "Placing…") return undefined;
    const t = setTimeout(() => placeMode.stopPlacing(""), 4000);
    return () => clearTimeout(t);
  }, [s.assetId, s.message]);

  if (!placing && !s.message) return null;
  return (
    <div className="sos2-place-banner" role="status">
      {placing ? (
        <>
          <span>
            Click the ground to place <strong>{placing.name}</strong>
          </span>
          <button type="button" onClick={() => placeMode.stopPlacing("")}>
            Cancel (Esc)
          </button>
        </>
      ) : (
        <span>{s.message}</span>
      )}
    </div>
  );
}
