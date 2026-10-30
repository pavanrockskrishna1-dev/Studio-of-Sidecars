import * as stageLook from "../fx/stageLook.js";
import * as gradeStore from "../fx/gradeStore.js";
import * as lookStore from "../fx/lookStore.js";
import * as occasionStore from "../animation/occasionStore.js";
import { MOOD_PRESETS } from "../ai/moodPresets.js";

function applyMood(mood) {
  stageLook.setStageLook(mood.stageLook);
  gradeStore.setGrade(mood.grade);
  lookStore.setLookPreset(mood.lookPreset);
  occasionStore.setOccasion(mood.occasion ?? "none");
}

export default function MoodPanel() {
  return (
    <div className="sos2-mood-panel" data-testid="ui-mood-panel">
      <span className="sos2-sheet-subhead">Mood</span>
      <p className="sos2-look-hint">One tap sets stage, grade, look and occasion.</p>
      <div className="sos2-mood-grid">
        {MOOD_PRESETS.map((m) => (
          <button
            key={m.id}
            type="button"
            className="sos2-mood-chip"
            data-testid={`ui-mood-${m.id}`}
            onClick={() => applyMood(m)}
          >
            <span className="sos2-mood-icon">{m.icon}</span>
            <span className="sos2-mood-name">{m.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
