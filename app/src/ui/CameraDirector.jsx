import { useState } from "react";
import * as animationStore from "../animation/animationStore";
import * as garageMode from "../garage/garageMode";
import { DIRECTOR_MOVES, directorKeys, hasCamKeys, MAX_CAM_KEYS } from "../animation/cameraKeys";

/* Reel sheet → Camera director: give the selected shot its own camera path.
   One-click moves around a subject (the bike, any prop, or the whole set), or
   key the live view at a moment of the shot. A shot with camera keys follows
   them in Play and in the export, instead of its move. */
export default function CameraDirector({ selected, shot, busy }) {
  const [subject, setSubject] = useState("product");
  const [at, setAt] = useState(0);
  const [notice, setNotice] = useState("");
  const api = garageMode.apiRef.current;
  const objects = api && typeof api.listObjects === "function" ? api.listObjects().filter((o) => !o.hidden) : [];
  const keys = hasCamKeys(shot) ? shot.cam.keys : [];
  const dur = shot.durationS;
  const t = Math.min(at, dur);

  const write = (nextKeys, okText) => {
    const r = animationStore.setShot(selected, { cam: nextKeys && nextKeys.length ? { keys: nextKeys } : null });
    setNotice(r.ok ? okText : r.reason);
  };
  const applyMove = (move) => {
    if (!api || typeof api.getWorldBox !== "function") return setNotice("The studio is still loading.");
    const box = api.getWorldBox(subject === "product" ? null : subject);
    if (!box) return setNotice("That subject isn't in the scene.");
    const from = api.getView ? api.getView().position : null;
    write(directorKeys(move, box, from, dur), `${DIRECTOR_MOVES[move]} set for shot ${selected + 1}. Press Play to watch it.`);
  };
  const keyView = () => {
    if (!api || typeof api.getView !== "function") return setNotice("The studio is still loading.");
    const v = api.getView();
    const tt = Math.round(t * 30) / 30;
    const rest = keys.filter((k) => Math.abs(k.t - tt) > 1e-3);
    if (rest.length >= MAX_CAM_KEYS) return setNotice(`A shot can have at most ${MAX_CAM_KEYS} camera keys.`);
    write([...rest, { t: tt, position: v.position, target: v.target }], `Keyed this view at ${tt.toFixed(1)} s.`);
  };

  return (
    <div className="sos2-director">
      <p className="sos-hint">
        <span>
          {keys.length
            ? `Shot ${selected + 1} follows its own camera path (${keys.length} key${keys.length > 1 ? "s" : ""}).`
            : `Shot ${selected + 1} uses its move. Give it a camera path below.`}
        </span>
      </p>

      <label className="sos-field">
        <em>Subject</em>
        <select id="director-subject" value={subject} disabled={busy} onChange={(e) => setSubject(e.target.value)}>
          <option value="product">The bike</option>
          <option value="set">The whole set</option>
          {objects.map((o) => (
            <option key={o.itemId} value={o.itemId}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <div className="sos2-director-moves">
        {Object.entries(DIRECTOR_MOVES).map(([id, label]) => (
          <button key={id} type="button" className="sos-pchip" disabled={busy} onClick={() => applyMove(id)} title={`${label}: filmed from the side you're looking from now`}>
            {label}
          </button>
        ))}
      </div>
      <p className="sos-hint">
        <span>Moves are filmed from the side you're viewing the scene from, so orbit there first.</span>
      </p>

      <span className="sos-label">Key this view</span>
      <label className="sos2-look-row">
        <span>At</span>
        <input id="director-at" type="range" min={0} max={dur} step={1 / 30} value={t} disabled={busy} onChange={(e) => setAt(Number(e.target.value))} />
        <output>{t.toFixed(1)} s</output>
      </label>
      <div className="sos-frow">
        <button type="button" className="sos-btn sos-btn-ghost" disabled={busy} onClick={keyView} title="Save the current camera view as a key at this moment of the shot">
          Key this view
        </button>
        {keys.length ? (
          <button type="button" className="sos-btn sos-btn-ghost" disabled={busy} onClick={() => write(null, `Shot ${selected + 1} uses its move again.`)}>
            Clear camera path
          </button>
        ) : null}
      </div>
      {keys.length ? (
        <ul className="sos2-director-keys">
          {keys.map((k, i) => (
            <li key={`${k.t}-${i}`}>
              <span>Key at {k.t.toFixed(1)} s</span>
              <button type="button" className="sos-btn sos-btn-ghost" disabled={busy} onClick={() => write(keys.filter((_, j) => j !== i), "Key removed.")}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="sos-hint">
        <span>The video is a tall 9:16 frame: keep the subject near the middle of your view when keying.</span>
      </p>
      {notice ? (
        <p className="sos-hint" role="status">
          <span>{notice}</span>
        </p>
      ) : null}
    </div>
  );
}
