/* ==========================================================================
   Slice U1, Stage A — floating status capsule (new file, UI ONLY)
   --------------------------------------------------------------------------
   Top-centre floating pill: brand + product name. This component is the only
   place that text is composed.
   Slice C2b: while the Reel plays it adds "Shot N of M", and while a Reel
   export runs "Exporting NN%" (both read from the animation store); during
   either the capsule stays fully visible (no idle fade).
   ========================================================================== */

import { useSyncExternalStore } from "react";
import * as animationStore from "../animation/animationStore";

export default function StudioCapsule({ productName, idle }) {
  const anim = useSyncExternalStore(animationStore.subscribe, animationStore.getSnapshot, animationStore.getSnapshot);
  const status =
    anim.mode === "previewing"
      ? `Shot ${Math.max(0, anim.shot) + 1} of ${anim.sequence.length}`
      : anim.mode === "exporting"
        ? `Exporting ${String(anim.progress).padStart(2, "0")}%`
        : "";
  return (
    <div
      className="sos2-capsule"
      data-idle={(idle && !status) || undefined}
      role="status"
      aria-label="Studio status"
    >
      <span className="sos2-capsule-brand">Studio of Sidecars</span>
      {productName ? (
        <>
          <span className="sos2-capsule-dot" aria-hidden="true">
            ·
          </span>
          <span className="sos2-capsule-product">{productName}</span>
        </>
      ) : null}
      {status ? (
        <>
          <span className="sos2-capsule-dot" aria-hidden="true">
            ·
          </span>
          <span className="sos2-capsule-status" data-testid="capsule-status">
            {status}
          </span>
        </>
      ) : null}
    </div>
  );
}
