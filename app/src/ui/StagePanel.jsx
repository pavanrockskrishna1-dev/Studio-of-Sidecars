import { useSyncExternalStore } from "react";
import * as stageLook from "../fx/stageLook";
import { GROUND_SURFACES, GROUND_IDS } from "../fx/groundSurfaces";

// Light sheet → Stage: Studio (the environment's backdrop photo) or one of
// the two outdoor sets (DayStage.jsx, NightStage.jsx), each with its own
// sky, ground and lights and no backdrop photo. Night and Day also offer a
// ground-surface chip row (groundSurfaces.js).
const STAGES = [
  { id: "studio", label: "Studio" },
  { id: "night", label: "Night" },
  { id: "day", label: "Day" },
];

export default function StagePanel() {
  const s = useSyncExternalStore(stageLook.subscribe, stageLook.getSnapshot, stageLook.getSnapshot);
  const outdoor = stageLook.isOutdoor(s.look);
  return (
    <div className="sos2-stage">
      <span className="sos2-sheet-subhead">Stage</span>
      <p className="sos2-look-hint">Where the bike stands: the studio backdrop, or an outdoor set with its own sky, ground and lights.</p>
      <div className="sos2-look-presets" role="group" aria-label="Stage">
        {STAGES.map((st) => (
          <button
            key={st.id}
            type="button"
            className="sos2-look-chip"
            aria-pressed={s.look === st.id}
            data-testid={`ui-stage-${st.id}`}
            onClick={() => stageLook.setStageLook(st.id)}
          >
            {st.label}
          </button>
        ))}
      </div>
      {outdoor ? (
        <div className="sos2-ground-chips" role="group" aria-label="Ground surface">
          {GROUND_IDS.map((id) => {
            const def = GROUND_SURFACES[id];
            return (
              <button
                key={id}
                type="button"
                className="sos2-ground-chip"
                aria-pressed={s.ground === id}
                data-testid={`ui-ground-${id}`}
                onClick={() => stageLook.setGround(id)}
              >
                <span className="sos2-ground-swatch" style={{ background: def.swatch }} aria-hidden="true" />
                {def.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
