import { useSyncExternalStore } from "react";
import WhisperTip from "./WhisperTip";
import * as animationStore from "../animation/animationStore";
import { canAdd, durationAllowed, MAX_TOTAL_S } from "../animation/reelSequence";

const MOVE_LABELS = {
  turntable: "Turntable", orbit: "Orbit", "push-in": "Push In",
  "pull-back": "Pull Back", slide: "Slide", crane: "Crane",
};

const SHOT_COLORS = ["#ff6b00", "#e05500", "#c94400", "#b33300", "#9d2200"];

export default function ReelTimeline() {
  const { sequence, mode, durationS } = useSyncExternalStore(
    animationStore.subscribe,
    animationStore.getSnapshot,
    animationStore.getSnapshot
  );
  const busy = mode !== "idle";
  const pct = Math.min(100, (durationS / MAX_TOTAL_S) * 100);
  const canAddMore = canAdd(sequence).ok;

  return (
    <div className="sos2-timeline">
      <WhisperTip id="reel-timeline" text="↑↓ reorder shots · −/+ change duration · × remove · Add Shot for more" />
      {/* Duration bar */}
      <div className="sos2-tl-bar-wrap" title={`${durationS}s of ${MAX_TOTAL_S}s max`}>
        <div className="sos2-tl-bar-track">
          {sequence.map((shot, i) => {
            const w = (shot.durationS / MAX_TOTAL_S) * 100;
            return (
              <div
                key={i}
                className="sos2-tl-bar-seg"
                style={{ width: `${w}%`, background: SHOT_COLORS[i % SHOT_COLORS.length] }}
                title={`Shot ${i + 1}: ${shot.durationS}s`}
              >
                <span className="sos2-tl-bar-label">S{i + 1}</span>
              </div>
            );
          })}
          <div className="sos2-tl-bar-empty" style={{ width: `${100 - pct}%` }} />
        </div>
        <span className="sos2-tl-dur">{durationS}s / {MAX_TOTAL_S}s</span>
      </div>

      {/* Shot cards */}
      {sequence.map((shot, i) => {
        const canUp = i > 0;
        const canDown = i < sequence.length - 1;
        const canDelete = sequence.length > 1;
        const durIdx = animationStore.DURATIONS.indexOf(shot.durationS);
        const canMinus = durIdx > 0 && durationAllowed(sequence, i, animationStore.DURATIONS[durIdx - 1]).ok;
        const canPlus = durIdx < animationStore.DURATIONS.length - 1 && durationAllowed(sequence, i, animationStore.DURATIONS[durIdx + 1]).ok;

        return (
          <div key={i} className="sos2-tl-shot" data-testid={`ui2-tl-shot-${i}`}>
            {/* Shot header */}
            <div className="sos2-tl-shot-head">
              <span
                className="sos2-tl-shot-dot"
                style={{ background: SHOT_COLORS[i % SHOT_COLORS.length] }}
              />
              <span className="sos2-tl-shot-num">Shot {i + 1}</span>
              <span className="sos2-tl-shot-move">{MOVE_LABELS[shot.move] ?? shot.move}</span>
              <div className="sos2-tl-shot-actions">
                <button
                  type="button"
                  className="sos2-tl-btn"
                  disabled={busy || !canUp}
                  title="Move shot earlier"
                  onClick={() => animationStore.moveShot(i, -1)}
                >↑</button>
                <button
                  type="button"
                  className="sos2-tl-btn"
                  disabled={busy || !canDown}
                  title="Move shot later"
                  onClick={() => animationStore.moveShot(i, 1)}
                >↓</button>
                <button
                  type="button"
                  className="sos2-tl-btn sos2-tl-btn-del"
                  disabled={busy || !canDelete}
                  title="Remove this shot"
                  onClick={() => animationStore.deleteShot(i)}
                >×</button>
              </div>
            </div>

            {/* Duration controls */}
            <div className="sos2-tl-shot-dur">
              <button
                type="button"
                className="sos2-tl-dur-btn"
                disabled={busy || !canMinus}
                title={canMinus ? `Decrease to ${animationStore.DURATIONS[durIdx - 1]}s` : "Minimum duration"}
                onClick={() => animationStore.setShot(i, { durationS: animationStore.DURATIONS[durIdx - 1] })}
              >−</button>
              <span className="sos2-tl-dur-val">{shot.durationS}s</span>
              <button
                type="button"
                className="sos2-tl-dur-btn"
                disabled={busy || !canPlus}
                title={canPlus ? `Increase to ${animationStore.DURATIONS[durIdx + 1]}s` : "Maximum duration"}
                onClick={() => animationStore.setShot(i, { durationS: animationStore.DURATIONS[durIdx + 1] })}
              >+</button>

              {/* Move selector */}
              <select
                className="sos2-tl-move-sel"
                disabled={busy}
                value={shot.move}
                aria-label={`Shot ${i + 1} camera move`}
                onChange={(e) => animationStore.setShot(i, { move: e.target.value })}
              >
                {animationStore.PRESETS.map((m) => (
                  <option key={m} value={m}>{MOVE_LABELS[m] ?? m}</option>
                ))}
              </select>

              {/* Start view selector */}
              <select
                className="sos2-tl-view-sel"
                disabled={busy}
                value={shot.startView}
                aria-label={`Shot ${i + 1} start view`}
                onChange={(e) => animationStore.setShot(i, { startView: e.target.value })}
              >
                {animationStore.START_VIEWS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        );
      })}

      {/* Add shot */}
      <button
        type="button"
        className="sos2-tl-add"
        disabled={busy || !canAddMore}
        title={canAddMore ? "Add a new shot" : canAdd(sequence).reason}
        onClick={() => animationStore.addShot()}
      >
        + Add Shot
      </button>
      {!canAddMore && (
        <p className="sos2-hint">{canAdd(sequence).reason}</p>
      )}
    </div>
  );
}
