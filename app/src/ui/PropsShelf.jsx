import { useState, useSyncExternalStore } from "react";
import * as garageStore from "../garage/garageStore";
import * as garageMode from "../garage/garageMode";
import { countObjects } from "../garage/sceneObjects";
import { MAX_PROPS, PROPS } from "../products/props";

/* ==========================================================================
   Slice P2 — the Props shelf in the Creator sheet.
   --------------------------------------------------------------------------
   Four cards (Burger, Roll, Wings, Drumsticks). A click adds that prop to the
   scene through the stage's own Garage addObject (garageMode.apiRef), so a
   prop is an ordinary Garage object. The count is read from the Garage layout
   itself (no second copy). At MAX_PROPS the cards grey out and the note reads
   "Max 12 props".
   ========================================================================== */

export default function PropsShelf() {
  const snap = useSyncExternalStore(garageStore.subscribe, garageStore.getSnapshot, garageStore.getSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const layout = snap.hasLayout ? garageStore.getLayout() : null;
  const count = layout ? countObjects(layout.items.filter((i) => !i.primary)).props : 0;
  const full = count >= MAX_PROPS;
  const ready = snap.hasLayout && !snap.locked;

  const add = async (id) => {
    const api = garageMode.apiRef.current;
    if (busy || full || !ready || !api || typeof api.addObject !== "function") return;
    setBusy(true);
    setMessage("Adding…");
    try {
      const r = await api.addObject(id);
      setMessage(r && r.message ? r.message : "The prop could not be added.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sos2-props" data-testid="ui2-props" data-full={full || undefined}>
      <div className="sos-lib" role="group" aria-label={`Props — ${PROPS.length} props`} data-testid="ui2-props-grid">
        {PROPS.map((p) => {
          const off = full || !ready;
          return (
            <div className="sos-asset-wrap" key={p.id} data-testid={`prop-card-${p.id}`}>
              <button
                type="button"
                className="sos-asset"
                data-disabled={off || undefined}
                aria-disabled={off ? "true" : undefined}
                title={full ? `${p.name} — Max ${MAX_PROPS} props` : `${p.name} — add to the scene`}
                aria-label={p.label}
                onClick={() => add(p.id)}
              >
                <span className="sos-asset-media">
                  <img
                    className="sos-asset-plate-img"
                    src={p.thumbUrl}
                    alt=""
                    width="120"
                    height="54"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                  />
                </span>
                <span className="sos-asset-txt">
                  <span className="sos-row-name">{p.label}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <p className="sos2-note sos2-props-note" role="status" aria-live="polite" data-testid="ui2-props-note">
        {full ? `Max ${MAX_PROPS} props` : message || "Click a card to drop it in the scene."}
        <span className="sos2-count" data-testid="ui2-props-count">
          {count} / {MAX_PROPS}
        </span>
      </p>
    </div>
  );
}
