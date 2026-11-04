export const LOOK_TYPES = Object.freeze(["none", "warm", "cool", "night", "bright", "cinema"]);

export function isLook(v) {
  if (v === undefined) return true;
  if (!v || typeof v !== "object") return false;
  if (!LOOK_TYPES.includes(v.type)) return false;
  if (typeof v.vignette !== "boolean") return false;
  return true;
}

export function normLook(v) {
  if (!v || typeof v !== "object") return undefined;
  if (v.type === "none" && !v.vignette) return undefined;
  if (!LOOK_TYPES.includes(v.type)) return undefined;
  if (typeof v.vignette !== "boolean") return undefined;
  return { type: v.type, vignette: v.vignette };
}

export function drawLook(ctx, look, w, h) {
  if (!look || (look.type === "none" && !look.vignette)) return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over"; // Explicitly, just in case, though we only use source-over

  // Draw tint
  if (look.type === "warm") {
    ctx.fillStyle = "rgba(255,150,60,0.14)";
    ctx.fillRect(0, 0, w, h);
  } else if (look.type === "cool") {
    ctx.fillStyle = "rgba(70,130,255,0.14)";
    ctx.fillRect(0, 0, w, h);
  } else if (look.type === "night") {
    ctx.fillStyle = "rgba(10,20,70,0.34)";
    ctx.fillRect(0, 0, w, h);
  } else if (look.type === "bright") {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, 0, w, h);
  } else if (look.type === "cinema") {
    const barH = Math.round(h * 0.09);
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);

    ctx.fillStyle = "rgba(0,90,110,0.08)";
    ctx.fillRect(0, 0, w, h);
  }

  // Draw vignette
  if (look.vignette) {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.sqrt(cx * cx + cy * cy);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}
