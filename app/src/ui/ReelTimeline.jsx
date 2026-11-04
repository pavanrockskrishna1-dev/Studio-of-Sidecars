import { useSyncExternalStore, useState, useEffect } from "react";
import WhisperTip from "./WhisperTip";
import * as animationStore from "../animation/animationStore";
import { canAdd, durationAllowed, MAX_TOTAL_S } from "../animation/reelSequence";
import { TRANSITION_FRAMES } from "../animation/transitions";
import { listMotionTemplates } from "../animation/motionHost";

const MOVE_LABELS = {
  turntable: "Turntable", orbit: "Orbit", "push-in": "Push In",
  "pull-back": "Pull Back", slide: "Slide", crane: "Crane",
};

const SHOT_COLORS = ["#ff6b00", "#e05500", "#c94400", "#b33300", "#9d2200"];

const fmtDur = (s) => (Number.isInteger(s) ? `${s}` : `${Number(s.toFixed(1))}`);

export default function ReelTimeline() {
  const { sequence, mode, durationS } = useSyncExternalStore(
    animationStore.subscribe,
    animationStore.getSnapshot,
    animationStore.getSnapshot
  );
  const busy = mode !== "idle";
  const pct = Math.min(100, (durationS / MAX_TOTAL_S) * 100);
  const canAddMore = canAdd(sequence).ok;

  const [motions, setMotions] = useState([]);
  useEffect(() => {
    let alive = true;
    listMotionTemplates().then(list => { if (alive) setMotions(list); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="sos2-timeline">
      <WhisperTip id="reel-timeline" text="↑↓ reorder shots · −/+ change duration · × remove · Add Shot for more" />
      {/* Duration bar */}
      <div className="sos2-tl-bar-wrap" title={`${fmtDur(durationS)}s of ${MAX_TOTAL_S}s max`}>
        <div className="sos2-tl-bar-track">
          {sequence.map((shot, i) => {
            const w = (shot.durationS / MAX_TOTAL_S) * 100;
            return (
              <div
                key={i}
                className="sos2-tl-bar-seg"
                style={{ width: `${w}%`, background: SHOT_COLORS[i % SHOT_COLORS.length] }}
                title={`Shot ${i + 1}: ${fmtDur(shot.durationS)}s`}
              >
                <span className="sos2-tl-bar-label">S{i + 1}</span>
              </div>
            );
          })}
          <div className="sos2-tl-bar-empty" style={{ width: `${100 - pct}%` }} />
        </div>
        <span className="sos2-tl-dur">{fmtDur(durationS)}s / {MAX_TOTAL_S}s</span>
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
                title={canMinus ? `Decrease to ${fmtDur(animationStore.DURATIONS[durIdx - 1])}s` : "Minimum duration"}
                onClick={() => animationStore.setShot(i, { durationS: animationStore.DURATIONS[durIdx - 1] })}
              >−</button>
              <span className="sos2-tl-dur-val">{fmtDur(shot.durationS)}s</span>
              <button
                type="button"
                className="sos2-tl-dur-btn"
                disabled={busy || !canPlus}
                title={canPlus ? `Increase to ${fmtDur(animationStore.DURATIONS[durIdx + 1])}s` : "Maximum duration"}
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

            {/* Look (every shot) */}
            <div className="sos2-tl-shot-trans" style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
              <span style={{ fontSize: "11px", opacity: 0.6, flexShrink: 0 }}>Look:</span>
              <select
                className="sos2-tl-move-sel"
                style={{ height: "24px", minWidth: "60px", fontSize: "11px" }}
                disabled={busy}
                value={shot.look?.type ?? "none"}
                aria-label={`Shot ${i + 1} look`}
                onChange={(e) => {
                  const type = e.target.value;
                  const vignette = shot.look?.vignette ?? false;
                  if (type === "none" && !vignette) {
                    animationStore.setShot(i, { look: undefined });
                  } else {
                    animationStore.setShot(i, { look: { type, vignette } });
                  }
                }}
              >
                <option value="none">None</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
                <option value="night">Night</option>
                <option value="bright">Bright</option>
                <option value="cinema">Cinema</option>
              </select>
              <label style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "2px", opacity: busy ? 0.5 : 1 }}>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={shot.look?.vignette ?? false}
                  onChange={(e) => {
                    const vignette = e.target.checked;
                    const type = shot.look?.type ?? "none";
                    if (type === "none" && !vignette) {
                      animationStore.setShot(i, { look: undefined });
                    } else {
                      animationStore.setShot(i, { look: { type, vignette } });
                    }
                  }}
                  style={{ margin: 0 }}
                />
                Vignette
              </label>
            </div>

            {/* Motion */}
            <div className="sos2-tl-shot-trans" style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", opacity: 0.6, flexShrink: 0 }}>Motion:</span>
              <select
                className="sos2-tl-move-sel"
                style={{ height: "24px", minWidth: "60px", fontSize: "11px" }}
                disabled={busy}
                value={shot.motion?.id ?? "none"}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id === "none") {
                    animationStore.setShot(i, { motion: undefined });
                  } else {
                    animationStore.setShot(i, { motion: { id } });
                  }
                }}
              >
                <option value="none">None</option>
                {motions.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              {shot.motion && motions.find(m => m.id === shot.motion.id) && (
                <>
                  <label style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "2px", opacity: busy ? 0.5 : 1 }}>
                    <input type="checkbox" disabled={busy} checked={shot.motion.clear ?? false} onChange={(e) => animationStore.setShot(i, { motion: { ...shot.motion, clear: e.target.checked } })} style={{ margin: 0 }} /> Clear bg
                  </label>
                  <label style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "2px", opacity: busy ? 0.5 : 1 }}>
                    <input type="checkbox" disabled={busy} checked={shot.motion.hold ?? false} onChange={(e) => animationStore.setShot(i, { motion: { ...shot.motion, hold: e.target.checked } })} style={{ margin: 0 }} /> Hold last
                  </label>
                  {motions.find(m => m.id === shot.motion.id).texts.length > 0 && (
                    <div style={{ flexBasis: "100%", display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" }}>
                      {motions.find(m => m.id === shot.motion.id).texts.map((t, idx) => (
                        <input
                          key={idx}
                          type="text"
                          disabled={busy}
                          className="sos2-tl-move-sel"
                          style={{ height: "24px", fontSize: "11px", width: "80px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "0 4px" }}
                          placeholder={motions.find(m => m.id === shot.motion.id).fieldLabels?.[idx] || t}
                          value={shot.motion.texts && shot.motion.texts[idx] !== undefined ? shot.motion.texts[idx] : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const nt = [...(shot.motion.texts || [])];
                            while(nt.length <= idx) nt.push(undefined);
                            nt[idx] = val === "" ? undefined : val;
                            animationStore.setShot(i, { motion: { ...shot.motion, texts: nt } });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Transition (every shot after the first) */}
            {i > 0 && (
              <div className="sos2-tl-shot-trans" style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", opacity: 0.6, flexShrink: 0 }}>Into:</span>
                <select
                  className="sos2-tl-move-sel"
                  style={{ height: "24px", minWidth: "60px", fontSize: "11px" }}
                  disabled={busy}
                  value={shot.transition?.type ?? "cut"}
                  aria-label={`Shot ${i + 1} transition`}
                  onChange={(e) => {
                    const type = e.target.value;
                    if (type === "cut") {
                      animationStore.setShot(i, { transition: undefined });
                    } else {
                      const frames = shot.transition?.frames ?? 9;
                      animationStore.setShot(i, { transition: { type, frames } });
                    }
                  }}
                >
                  <option value="cut">Cut</option>
                  <option value="flash">Flash</option>
                  <option value="dip">Dip</option>
                  <option value="whip">Whip</option>
                </select>
                {shot.transition?.type && shot.transition.type !== "cut" && (
                  <select
                    className="sos2-tl-view-sel"
                    style={{ height: "24px", minWidth: "48px", width: "52px", flex: "none", fontSize: "11px" }}
                    disabled={busy}
                    value={shot.transition?.frames ?? 9}
                    aria-label={`Shot ${i + 1} transition frames`}
                    onChange={(e) => {
                      const frames = Number(e.target.value);
                      animationStore.setShot(i, {
                        transition: { type: shot.transition.type, frames },
                      });
                    }}
                  >
                    {TRANSITION_FRAMES.map((f) => (
                      <option key={f} value={f}>{f}f</option>
                    ))}
                  </select>
                )}
              </div>
            )}
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
