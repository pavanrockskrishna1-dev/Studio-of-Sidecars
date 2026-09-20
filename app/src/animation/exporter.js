/* Animation Studio (Phase 16B, Slice D1) — the Reel MP4 exporter.
   ---------------------------------------------------------------------------
   Drives the Slice C stepping (beginExport / stepExport / endExport in the
   animation store) one frame at a time, encodes each frame as H.264 through the
   MP4 writer (mp4.js) and returns the finished file. Plain JS, no React.

   Frame rules: frames = durationS x 30, t_i = i / 30, no duplicate end frame.
   The canvas is read in the SAME synchronous block as stepExport (nothing is
   awaited between them), because the drawing buffer is only valid until the
   next task. Only ever one full-size frame exists at a time; nothing is kept in
   an array. The loop yields to the event loop with a MessageChannel round trip
   (timers and requestAnimationFrame are throttled in background tabs), after
   awaiting the writer's backpressure. */

import * as animation from "./animationStore";
import { makeTurntable, frameTimes } from "./path";
import { REEL_EXPORT } from "../capture/exportOptions";
import { preloadMp4, canEncode, createMp4Writer } from "./mp4";

const BITRATE = 10_000_000; // about 10 Mbps
const STATUS_INTERVAL_MS = 250;

// Only one export at a time, claimed synchronously (before any await).
let busy = false;

// { ok, reason }: can this page export an MP4 at all?
export async function checkExportSupport() {
  try {
    if (typeof window === "undefined" || !window.isSecureContext) {
      return { ok: false, reason: "This page is not a secure context." };
    }
    if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
      return { ok: false, reason: "This browser has no WebCodecs video encoder." };
    }
    const ok = await canEncode({
      width: REEL_EXPORT.width,
      height: REEL_EXPORT.height,
      bitrate: BITRATE,
      fps: REEL_EXPORT.fps,
    });
    if (!ok) return { ok: false, reason: "This browser cannot encode H.264 at 1080x1920." };
    return { ok: true, reason: "" };
  } catch {
    return { ok: false, reason: "Could not check video encoding support." };
  }
}

// The stage rounds the requested size down to an even integer in [2, 4096].
const even = (n) => Math.max(2, Math.min(4096, Math.floor(Number(n) / 2) * 2));

function makeYield() {
  const channel = new MessageChannel();
  const wait = () =>
    new Promise((resolve) => {
      channel.port1.onmessage = () => resolve();
      channel.port2.postMessage(0);
    });
  wait.close = () => {
    channel.port1.close();
    channel.port2.close();
  };
  return wait;
}

// Renders the Turntable at the Reel size and encodes it. Resolves
// { ok:true, blob, filename, bytes, frames, width, height, fps, ms } or
// { ok:false, canceled?, error }. Never throws; never leaves the canvas at the
// export size.
export async function exportReel({ width = REEL_EXPORT.width, height = REEL_EXPORT.height } = {}) {
  if (busy) return { ok: false, error: "An export is already running." };
  busy = true;
  const t0 = performance.now();
  let writer = null;
  let started = false; // beginExport succeeded: endExport is owed
  let finished = false;
  let canceled = false;
  let refused = false; // turned away before touching anything: no status message
  let failure = "";
  let blob = null;
  let frames = 0;
  let outW = 0;
  let outH = 0;
  const yieldToLoop = makeYield();
  try {
    const snap = animation.getSnapshot();
    if (snap.mode !== "idle" || !snap.ready) {
      failure = snap.mode === "idle" ? "the studio is not ready" : "an animation is already running";
      refused = true;
      return { ok: false, error: failure };
    }
    const support = await checkExportSupport();
    if (!support.ok) {
      failure = support.reason;
      return { ok: false, error: failure };
    }
    try {
      await preloadMp4();
    } catch (err) {
      failure = "could not load the MP4 writer (" + (err && err.message ? err.message : err) + ")";
      return { ok: false, error: failure };
    }

    // The same spec the store fixes at begin: the current duration at 30 fps.
    const anim = makeTurntable({ durationS: animation.getSnapshot().durationS, fps: REEL_EXPORT.fps });
    const times = frameTimes(anim);
    frames = times.length;

    if (!animation.beginExport({ width, height })) {
      failure = "the studio is busy or not ready";
      return { ok: false, error: failure };
    }
    started = true;
    animation.setStatus({ progress: 0, message: "" });

    const canvas = animation.getCanvas();
    if (!canvas || canvas.width !== even(width) || canvas.height !== even(height)) {
      failure = "the canvas did not take the export size";
      return { ok: false, error: failure };
    }
    outW = canvas.width;
    outH = canvas.height;
    writer = createMp4Writer({ width: outW, height: outH, fps: REEL_EXPORT.fps, bitrate: BITRATE });

    let lastStatus = performance.now();
    for (let i = 0; i < frames; i += 1) {
      if (animation.isCancelRequested()) {
        canceled = true;
        break;
      }
      const r = animation.stepExport(times[i]);
      if (!r.ok) {
        failure = r.resized ? "the window was resized" : "the export was interrupted";
        break;
      }
      // Same synchronous block as stepExport: the frame is captured before
      // anything is awaited.
      const pending = writer.addFrame(canvas, i);
      await pending;
      const now = performance.now();
      if (now - lastStatus >= STATUS_INTERVAL_MS && i + 1 < frames) {
        lastStatus = now;
        animation.setStatus({ progress: Math.floor((100 * (i + 1)) / frames) });
      }
      await yieldToLoop();
    }

    if (!canceled && !failure && animation.isCancelRequested()) canceled = true;
    if (!canceled && !failure) {
      animation.setStatus({ progress: 100, message: "Finalizing" });
      blob = await writer.finish();
      finished = true;
    }
  } catch (err) {
    failure = err && err.message ? err.message : String(err);
  } finally {
    if (writer && !finished) await writer.cancel();
    if (started) animation.endExport(); // idempotent
    yieldToLoop.close();
    busy = false;
    if (!refused) {
      animation.clearCancel();
      let message;
      if (finished) message = "Reel exported";
      else if (canceled) message = "Export canceled";
      else message = "Export stopped: " + (failure || "unknown reason");
      animation.setStatus({ progress: 0, message });
    }
  }

  if (finished && blob) {
    return {
      ok: true,
      blob,
      filename: `sidecar-reel-${outW}x${outH}-${REEL_EXPORT.fps}fps.mp4`,
      bytes: blob.size,
      frames,
      width: outW,
      height: outH,
      fps: REEL_EXPORT.fps,
      ms: Math.round(performance.now() - t0),
    };
  }
  if (canceled) return { ok: false, canceled: true, error: "Export canceled" };
  return { ok: false, error: failure || "unknown reason" };
}

// Saves a Blob through a temporary download link.
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
