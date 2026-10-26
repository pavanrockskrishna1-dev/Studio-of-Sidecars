import { useState } from "react";
import { POSTER_FORMATS, POSTER_QUALITIES, posterApiRef } from "../utils/posterCapture";

// Poster Maker (Sheet "posterMaker") — a one-click PNG export of the current
// live view, at a chosen aspect and quality, downloaded straight to the
// owner's computer. No video, no Reel: a single still image. The panel
// remembers the last-used format/quality on this device.

const PREFS_KEY = "sos-poster-prefs-v1";

function readPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    return {
      format: saved && POSTER_FORMATS[saved.format] ? saved.format : "square",
      quality: saved && POSTER_QUALITIES[saved.quality] ? saved.quality : "standard",
    };
  } catch {
    return { format: "square", quality: "standard" };
  }
}
function writePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // best-effort only
  }
}

export default function PosterMakerPanel() {
  const initial = readPrefs();
  const [format, setFormat] = useState(initial.format);
  const [quality, setQuality] = useState(initial.quality);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const choose = (next) => {
    writePrefs(next);
    if (next.format !== undefined) setFormat(next.format);
    if (next.quality !== undefined) setQuality(next.quality);
  };

  const save = async () => {
    const api = posterApiRef.current;
    if (!api || typeof api.capture !== "function" || busy) return;
    setBusy(true);
    setMessage("Capturing…");
    try {
      const { dataUrl, widthPx, heightPx } = await api.capture({ format, quality });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `poster-${format}-${Date.now()}.png`;
      a.click();
      setMessage(`Saved ${widthPx} × ${heightPx}.`);
    } catch {
      setMessage("Could not capture the poster.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span className="sos-label">Format</span>
      <div className="sos-frow">
        {Object.entries(POSTER_FORMATS).map(([id, info]) => (
          <button
            key={id}
            type="button"
            className="sos-pchip"
            data-testid={`ui-poster-format-${id}`}
            data-on={format === id || undefined}
            aria-pressed={format === id}
            disabled={busy}
            title={`${info.label} (${info.width} × ${info.height})`}
            onClick={() => choose({ format: id, quality })}
          >
            {info.label}
          </button>
        ))}
      </div>
      <span className="sos-label">Quality</span>
      <div className="sos-frow">
        {Object.entries(POSTER_QUALITIES).map(([id, info]) => (
          <button
            key={id}
            type="button"
            className="sos-pchip"
            data-testid={`ui-poster-quality-${id}`}
            data-on={quality === id || undefined}
            aria-pressed={quality === id}
            disabled={busy}
            title={id === "high" ? `${info.label}: sharper, a larger file` : `${info.label}: a smaller file`}
            onClick={() => choose({ format, quality: id })}
          >
            {info.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="sos-btn sos-btn-gold"
        data-testid="ui-poster-save"
        disabled={busy}
        title="Save a PNG of the current view at the chosen format and quality"
        onClick={save}
      >
        {busy ? "Capturing…" : "Save poster"}
      </button>
      {message ? (
        <p className="sos-hint" data-testid="ui-poster-status">
          <span>{message}</span>
        </p>
      ) : null}
      <p className="sos-hint">
        <span>Captures exactly what the view shows now — the bike, props, effects and placed lights.</span>
      </p>
    </>
  );
}
