import { useEffect, useRef } from "react";
import Icon from "./icons";

/*
  MotionLabOverlay — fullscreen iframe wrapper around /motionlab.html.

  When the iframe reports "ready" (or after a short timeout), we post the
  current product's GLB URL so MotionLab auto-imports it.  The overlay sits
  at z-index 300, above every sheet and poster layer.

  Props:
    modelPath  – e.g. "/models/bbq-bike.glb"
    modelName  – display name used as the GLB filename
    onClose    – called when the overlay should dismiss
*/
export default function MotionLabOverlay({ modelPath, modelName, onClose }) {
  const iframeRef = useRef(null);
  const sentRef = useRef(false);

  // Send the GLB to MotionLab exactly once, whichever fires first.
  const sendGlb = () => {
    if (sentRef.current) return;
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    sentRef.current = true;
    const url = window.location.origin + modelPath;
    const name = (modelName ?? "model").replace(/[^a-z0-9_-]/gi, "_") + ".glb";
    frame.contentWindow.postMessage({ type: "motionlab-load-glb", url, name }, "*");
  };

  useEffect(() => {
    sentRef.current = false;
    // Fallback: post after 3 s in case the iframe doesn't fire onLoad cleanly.
    const t = setTimeout(sendGlb, 3000);
    return () => clearTimeout(t);
  }, [modelPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC key closes the overlay (same convention as the sheets).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="motionlab-overlay"
      role="dialog"
      aria-label="Animation Studio"
      aria-modal="true"
    >
      <button
        className="motionlab-close"
        aria-label="Close Animation Studio"
        onClick={onClose}
        type="button"
      >
        <Icon name="close" size={18} />
        <span>Close</span>
      </button>
      <iframe
        ref={iframeRef}
        src="/motionlab.html"
        title="MotionLab Animation Studio"
        className="motionlab-frame"
        onLoad={sendGlb}
        allow="fullscreen"
      />
    </div>
  );
}
