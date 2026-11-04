/* transitions.js - 2D transition drawing (pure data / canvas drawing, no DOM, no three.js, no react).
   ---------------------------------------------------------------------------
   A shot may carry transition: { type, frames } describing how it ENTERS from
   the previous shot. Types: "cut" (default, omitted), "flash", "dip", "whip".
   Frames is one of 6, 9, 12 or 18 (at 30 fps). */

export const TRANSITION_TYPES = Object.freeze(["cut", "flash", "dip", "whip"]);
export const TRANSITION_FRAMES = Object.freeze([6, 9, 12, 18]);

// flash: alpha rises to 1 at progress 0.2 and then falls to 0 at progress 1
export function flashAlpha(p) {
  if (p <= 0 || p >= 1) return 0;
  if (p <= 0.2) return p / 0.2;
  return (1 - p) / 0.8;
}

// dip: alpha 0 -> 1 over the first half (0..0.5), then 1 -> 0 over the second half (0.5..1)
export function dipAlpha(p) {
  if (p <= 0 || p >= 1) return 0;
  if (p <= 0.5) return p / 0.5;
  return (1 - p) / 0.5;
}

/**
 * Draw a transition overlay onto ctx.
 * @param {CanvasRenderingContext2D} ctx - 2D context to draw into
 * @param {string} type - "cut" | "flash" | "dip" | "whip"
 * @param {number} progress - 0..1 across the transition
 * @param {number} w - width of the canvas
 * @param {number} h - height of the canvas
 * @param {HTMLCanvasElement|null} [prev] - canvas holding the previous shot's last frame (or null)
 */
export function drawTransition(ctx, type, progress, w, h, prev = null) {
  if (!ctx || !type || type === "cut" || progress <= 0 || progress >= 1) return;

  if (type === "flash") {
    const alpha = flashAlpha(progress);
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "dip") {
    const alpha = dipAlpha(progress);
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  if (type === "whip") {
    // If prev is null, fall back to flash
    if (!prev) {
      drawTransition(ctx, "flash", progress, w, h, null);
      return;
    }

    ctx.save();
    if (progress < 0.5) {
      // For progress < 0.5: draw prev sliding out to the left with a horizontal motion smear (5 offset copies at falling alpha)
      const t = progress / 0.5; // 0..1
      const baseX = -t * w;
      const step = w * 0.04;
      for (let k = 0; k < 5; k += 1) {
        const copyAlpha = ((5 - k) / 5) * (1 - t * 0.3);
        ctx.globalAlpha = Math.max(0, Math.min(1, copyAlpha));
        if (typeof ctx.drawImage === "function") {
          ctx.drawImage(prev, baseX + k * step, 0, w, h);
        }
      }
    } else {
      // For progress >= 0.5: the current frame is already under the ctx,
      // so draw a decaying smear of it sliding in from the right.
      const t = (progress - 0.5) / 0.5; // 0..1
      const source = ctx.canvas || prev;
      if (source && typeof ctx.drawImage === "function") {
        const decay = 1 - t;
        const step = w * 0.04;
        for (let k = 0; k < 5; k += 1) {
          const copyAlpha = decay * ((5 - k) / 5) * 0.6;
          ctx.globalAlpha = Math.max(0, Math.min(1, copyAlpha));
          const dx = (1 - t) * (w * 0.2) + k * step;
          ctx.drawImage(source, dx, 0, w, h);
        }
      }
    }
    ctx.restore();
  }
}
