import { useCallback } from "react";
import * as gradeStore from "../fx/gradeStore.js";
import * as stageLookStore from "../fx/stageLook.js";
import * as lookStore from "../fx/lookStore.js";
import * as parallaxBgStore from "../fx/parallaxBgStore.js";
import * as occasionStore from "../animation/occasionStore.js";
import { GRADES, GRADE_IDS } from "../fx/gradeShader.js";
import { LOOK_PRESETS, LOOK_IDS } from "../fx/lookStore.js";
import { ENVS } from "../fx/ParallaxBg";
import { OCCASIONS } from "../animation/occasionDefs.js";
import { Hint } from "./InspectorRail.jsx";

const SCENE_PRESETS = [
  {
    id: "cinematic-night",
    name: "Cinematic Night",
    icon: "🎬",
    grade: "cinema",
    stageLook: "night",
    lookPreset: "moonlit",
    env: "city",
    occasion: "halloween",
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    icon: "☀️",
    grade: "warm",
    stageLook: "day",
    lookPreset: "sunset",
    env: "rooftop",
    occasion: "none",
  },
  {
    id: "neon-dream",
    name: "Neon Dream",
    icon: "🌈",
    grade: "moody",
    stageLook: "night",
    lookPreset: "moonlit",
    env: "arcade",
    occasion: "holi",
  },
  {
    id: "clean-studio",
    name: "Clean Studio",
    icon: "🎯",
    grade: "raw",
    stageLook: "studio",
    lookPreset: "studio",
    env: null,
    occasion: "none",
  },
  {
    id: "desert-dusk",
    name: "Desert Dusk",
    icon: "🏜️",
    grade: "cinema",
    stageLook: "day",
    lookPreset: "sunset",
    env: "desert",
    occasion: "diwali",
  },
  {
    id: "forest-morning",
    name: "Forest Morning",
    icon: "🌲",
    grade: "warm",
    stageLook: "day",
    lookPreset: "off",
    env: "forest",
    occasion: "christmas",
  },
];

function applyScenePreset(preset) {
  gradeStore.setGrade(preset.grade);
  stageLookStore.setStageLook(preset.stageLook);
  lookStore.setLookPreset(preset.lookPreset);
  if (preset.env) {
    parallaxBgStore.setEnv(preset.env);
  } else {
    parallaxBgStore.clearEnv();
  }
  occasionStore.setOccasion(preset.occasion);
}

export default function ScenePresets() {
  const handleApply = useCallback((preset) => {
    applyScenePreset(preset);
  }, []);

  return (
    <div className="sos-scene-presets">
      <div className="sos-group-head">
        <span className="sos-eyebrow">Scene Presets</span>
      </div>
      <div className="sos-chips sos-scene-chips">
        {SCENE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="sos-scene-chip"
            title={`${preset.name}: ${GRADES[preset.grade].label} grade · ${preset.stageLook} stage · ${LOOK_PRESETS[preset.lookPreset].label} look · ${preset.env ? ENVS.find(e => e.id === preset.env)?.label ?? preset.env : "no env"} · ${OCCASIONS.find(o => o.id === preset.occasion)?.name ?? preset.occasion}`}
            onClick={() => handleApply(preset)}
          >
            <span className="sos-scene-icon" aria-hidden="true">{preset.icon}</span>
            <span className="sos-scene-name">{preset.name}</span>
          </button>
        ))}
      </div>
      <Hint>One tap applies grade + stage look + look preset + parallax env + occasion together.</Hint>
    </div>
  );
}