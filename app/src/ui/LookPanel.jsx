import { useSyncExternalStore } from "react";
import * as lookStore from "../fx/lookStore";

// Light sheet → Look: one finish for the live view and the Reel/MP4 export,
// plus Smooth mode for lighter editing.
const SLIDERS = [
  { key: "exposure", label: "Exposure", step: 0.01, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "contrast", label: "Contrast", step: 0.01, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "saturation", label: "Colour", step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: "bloom", label: "Glow", step: 0.01, fmt: (v) => v.toFixed(2) },
  { key: "warmth", label: "Warmth", step: 0.01, fmt: (v) => (v === 0 ? "neutral" : v > 0 ? `warm ${Math.round(v * 100)}` : `cool ${Math.round(-v * 100)}`) },
  { key: "vignette", label: "Vignette", step: 0.01, fmt: (v) => v.toFixed(2) },
  { key: "sharpen", label: "Sharpness", step: 0.01, fmt: (v) => v.toFixed(2) },
  { key: "focusBlur", label: "Focus blur", step: 0.01, fmt: (v) => (v > 0 ? v.toFixed(2) : "off") },
];

export default function LookPanel() {
  const s = useSyncExternalStore(lookStore.subscribe, lookStore.getSnapshot, lookStore.getSnapshot);
  const on = lookStore.isLookActive(s);
  return (
    <div className="sos2-look">
      <span className="sos2-sheet-subhead">Look</span>
      <p className="sos2-look-hint">One finish for the live view and the exported video: what you see is what exports.</p>
      <div className="sos2-look-presets" role="group" aria-label="Look presets">
        {lookStore.LOOK_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="sos2-look-chip"
            aria-pressed={s.preset === id}
            data-testid={`ui-look-preset-${id}`}
            onClick={() => lookStore.setLookPreset(id)}
          >
            {lookStore.LOOK_PRESETS[id].label}
          </button>
        ))}
        {s.preset === "custom" ? (
          <span className="sos2-look-chip" aria-pressed="true">
            Custom
          </span>
        ) : null}
      </div>
      {SLIDERS.map((sl) => {
        const [min, max] = lookStore.LOOK_RANGES[sl.key];
        const v = s.params[sl.key];
        return (
          <label key={sl.key} className="sos2-look-row">
            <span>{sl.label}</span>
            <input
              id={`look-${sl.key}`}
              type="range"
              min={min}
              max={max}
              step={sl.step}
              value={v}
              disabled={!on && s.preset !== "custom"}
              onChange={(e) => lookStore.setLookParam(sl.key, Number(e.target.value))}
            />
            <output>{sl.fmt(v)}</output>
          </label>
        );
      })}
      {!on ? <p className="sos2-look-hint">Pick a preset to start; the sliders then fine-tune it.</p> : null}
      {s.params.focusBlur > 0 && s.smooth ? (
        <p className="sos2-look-hint">Focus blur shows in the exported video. Smooth mode skips it while you edit; turn Smooth mode off to preview it.</p>
      ) : null}

      <div className="sos2-sheet-divider" aria-hidden="true" />
      <label className="sos2-look-toggle">
        <input type="checkbox" id="look-smooth" checked={s.smooth} onChange={(e) => lookStore.setSmooth(e.target.checked)} />
        <span>
          <strong>Smooth mode</strong>
          <em>Lighter live view for slower laptops: lower resolution, cheaper shadows and glow while you edit. Exports always render at full quality.</em>
        </span>
      </label>
    </div>
  );
}
