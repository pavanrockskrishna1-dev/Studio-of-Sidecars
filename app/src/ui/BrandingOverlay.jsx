import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import * as animationStore from "../animation/animationStore";
import { brandingState, getBrandingSpec, getPreviewClock, drawBranding, FRAME_W, FRAME_H } from "../poster/branding";
import { posterState, ensureLogoImage } from "../poster/poster.js";

/* ==========================================================================
   Slice R1 - the live branding preview during Play (UI ONLY)
   --------------------------------------------------------------------------
   A 2D canvas laid over the stage at the largest 9:16 rectangle that fits the
   window (the Reel frame, as the Poster preview does for its aspects), shown
   only while a preview is playing and only when something would be drawn. Each
   animation frame it calls poster/branding.js drawBranding() with the time the
   stage's preview clock says, in the canvas's own pixels: the very function the
   MP4 exporter composites onto every exported frame.
   The overlay is below the shell (z-index 1, pointer-events none) like the
   Poster preview. It holds no React state per frame.
   ========================================================================== */

// The largest 9:16 rectangle centred in the window, CSS pixels.
function frameRect() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ratio = FRAME_W / FRAME_H;
  let w;
  let h;
  if (vw / vh > ratio) {
    h = vh;
    w = h * ratio;
  } else {
    w = vw;
    h = w / ratio;
  }
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}

function Overlay({ spec, loops }) {
  const canvasRef = useRef(null);
  const [resizeTick, setResizeTick] = useState(0);
  useEffect(() => {
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rect = useMemo(() => frameRect(), [resizeTick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.max(1, Math.round(rect.w * dpr));
    const bh = Math.max(1, Math.round(rect.h * dpr));
    canvas.width = bw;
    canvas.height = bh;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const start = getPreviewClock();
      if (start === null) return;
      let t = (performance.now() - start) / 1000;
      // a looping Turntable repeats its Reel (and its end card)
      if (loops) t %= spec.totalS;
      ctx.clearRect(0, 0, bw, bh);
      drawBranding(ctx, bw, bh, spec, t);
      canvas.sosT = t; // read by the test harness; no DOM write per frame
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spec, rect, loops]);

  return createPortal(
    <canvas
      ref={canvasRef}
      data-testid="ui-branding-preview"
      style={{ position: "fixed", left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: 1, pointerEvents: "none" }}
    />,
    document.body
  );
}

// Mounted once by the shell, always.
export function BrandingOverlayHost() {
  const anim = useSyncExternalStore(animationStore.subscribe, animationStore.getSnapshot, animationStore.getSnapshot);
  const b = useSyncExternalStore(brandingState.subscribe, brandingState.getSnapshot, brandingState.getSnapshot);
  const kitId = useSyncExternalStore(posterState.subscribe, () => posterState.getSnapshot().kitId, () => posterState.getSnapshot().kitId);
  const previewing = anim.mode === "previewing";
  const [logoTick, setLogoTick] = useState(0);
  useEffect(() => {
    if (!previewing) return undefined;
    let alive = true;
    ensureLogoImage(kitId).then(() => alive && setLogoTick((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [previewing, kitId]);
  const spec = useMemo(
    () => (previewing ? getBrandingSpec(anim.sequence) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewing, anim.sequence, b, kitId, logoTick]
  );
  if (!previewing || !spec) return null;
  const loops = anim.sequence.length === 1 && anim.sequence[0].move === "turntable";
  return <Overlay spec={spec} loops={loops} />;
}
