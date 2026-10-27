import { useSyncExternalStore } from "react";
import * as occasionStore from "../animation/occasionStore.js";
import { getOccasion } from "../animation/occasionDefs.js";

export default function OccasionBadge() {
  const { occasionId } = useSyncExternalStore(
    occasionStore.subscribe,
    occasionStore.getSnapshot,
    occasionStore.getSnapshot
  );

  const occasion = getOccasion(occasionId);
  if (occasion.id === "none") return null;

  return (
    <div className="sos-occasion-badge" data-occasion={occasion.id}>
      <span className="sos-occasion-emoji" aria-hidden="true">{occasion.emoji}</span>
      <span className="sos-occasion-name">{occasion.name}</span>
    </div>
  );
}