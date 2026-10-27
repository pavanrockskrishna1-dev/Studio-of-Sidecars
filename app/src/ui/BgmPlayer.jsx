import { useEffect, useRef, useState } from "react";

const TRACKS = [
  { name: "Energetic",  file: "/audio/bgm/energetic.mp3" },
  { name: "Moody",      file: "/audio/bgm/moody.mp3" },
  { name: "Upbeat",     file: "/audio/bgm/upbeat.mp3" },
  { name: "Chill",      file: "/audio/bgm/chill.mp3" },
];

export default function BgmPlayer() {
  const [trackIdx, setTrackIdx] = useState(() => {
    try { return parseInt(localStorage.getItem("sos_bgm_track") || "0", 10); } catch { return 0; }
  });
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem("sos_bgm_vol") || "0.35"); } catch { return 0.35; }
  });
  const audioRef = useRef(null);

  const track = TRACKS[trackIdx % TRACKS.length];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.loop = true;
    if (playing) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [playing, trackIdx]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    try { localStorage.setItem("sos_bgm_vol", String(volume)); } catch {}
  }, [volume]);

  const prev = () => {
    const i = (trackIdx - 1 + TRACKS.length) % TRACKS.length;
    setTrackIdx(i);
    try { localStorage.setItem("sos_bgm_track", String(i)); } catch {}
  };
  const next = () => {
    const i = (trackIdx + 1) % TRACKS.length;
    setTrackIdx(i);
    try { localStorage.setItem("sos_bgm_track", String(i)); } catch {}
  };

  return (
    <div className="sos2-bgm">
      <audio ref={audioRef} src={track.file} preload="none" />
      <button className="sos2-bgm-prev" onClick={prev} title="Previous track">‹</button>
      <button className="sos2-bgm-play" onClick={() => setPlaying((p) => !p)} title={playing ? "Pause" : "Play BGM"}>
        {playing ? "⏸" : "♪"}
      </button>
      <button className="sos2-bgm-next" onClick={next} title="Next track">›</button>
      <span className="sos2-bgm-name">{track.name}</span>
      <input
        type="range" min="0" max="1" step="0.05"
        value={volume}
        className="sos2-bgm-vol"
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        title="Volume"
      />
    </div>
  );
}
