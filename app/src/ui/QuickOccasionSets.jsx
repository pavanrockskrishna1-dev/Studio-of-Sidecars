import { useState } from "react";
import { OCCASIONS } from "../animation/occasionDefs";
import { buildOccasionSet, OCCASION_SETS, SET_PRODUCT_ID } from "../animation/occasionSets";
import { applyOccasion } from "./OccasionSheet";

/* One-tap festival sets at the top of the Reel sheet. Each button does what the
   Occasions sheet (Props, last section) does in two clicks: pick the occasion
   (grade, title card, particles) and build its set (stage, props, effects and
   the Reel). Only occasions that have a ready-made set are listed. The sets are
   made for the BBQ Bike. */
const FESTIVAL_IDS = OCCASIONS.filter((o) => o.id !== "none" && OCCASION_SETS[o.id]).map((o) => o.id);

export default function QuickOccasionSets({ productId }) {
  const [status, setStatus] = useState({ busy: false, id: "", text: "", notes: [] });
  const onBike = productId === SET_PRODUCT_ID;

  async function build(id) {
    if (status.busy || !onBike) return;
    setStatus({ busy: true, id, text: "Building the set…", notes: [] });
    try {
      applyOccasion(id);
      const r = await buildOccasionSet(id, {
        productId,
        onProgress: (text) => setStatus((s) => ({ ...s, text })),
      });
      setStatus({ busy: false, id, text: r.ok ? `${r.message}` : r.message, notes: r.warnings || [] });
    } catch {
      setStatus({ busy: false, id, text: "Build failed. Please try again.", notes: [] });
    }
  }

  return (
    <div className="ai-sets" data-testid="quick-occasion-sets">
      <div className="ai-step-title">Or start from a ready-made festival set</div>
      <div className="ai-chips" role="group" aria-label="Festival sets">
        {FESTIVAL_IDS.map((id) => {
          const set = OCCASION_SETS[id];
          return (
            <button
              key={id}
              type="button"
              className="sos-pchip"
              data-on={status.id === id || undefined}
              disabled={status.busy || !onBike}
              title={set.blurb}
              onClick={() => build(id)}
            >
              {set.emoji} {set.name}
            </button>
          );
        })}
      </div>
      <p className="ai-hint">
        {onBike
          ? "Replaces your props, effects and reel shots, then press Play below to preview."
          : "These sets are made for the BBQ Bike. Switch to it in Scene first."}
      </p>
      {status.text && <p className="ai-hint" role="status">{status.text}</p>}
      {status.notes.map((n) => (
        <p key={n} className="ai-hint">{n}</p>
      ))}
    </div>
  );
}
