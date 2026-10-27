import { useEffect, useState } from "react";

const KEY = (id) => `sos_tip_seen_${id}`;

export function useWhisperTip(id) {
  const [show, setShow] = useState(() => {
    try { return !localStorage.getItem(KEY(id)); }
    catch { return false; }
  });

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(KEY(id), "1"); } catch {}
  };

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(dismiss, 8000);
    return () => clearTimeout(t);
  }, [show]);

  return { show, dismiss };
}

export default function WhisperTip({ id, text }) {
  const { show, dismiss } = useWhisperTip(id);
  if (!show) return null;
  return (
    <div className="sos2-whisper" role="status">
      <span className="sos2-whisper-text">{text}</span>
      <button className="sos2-whisper-x" onClick={dismiss} aria-label="Dismiss tip">×</button>
    </div>
  );
}
