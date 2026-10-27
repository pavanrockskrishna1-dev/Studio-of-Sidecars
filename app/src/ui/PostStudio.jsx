import { useCallback, useEffect, useRef, useState } from "react";
import * as animationStore from "../animation/animationStore";

/* ── helpers ─────────────────────────────────────────────────── */
function hex2rgb(hex) {
  const n = parseInt(hex.replace("#",""), 16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(a, b, t) {
  const [ar,ag,ab2] = hex2rgb(a), [br,bg,bb] = hex2rgb(b);
  return `rgb(${Math.round(lerp(ar,br,t))},${Math.round(lerp(ag,bg,t))},${Math.round(lerp(ab2,bb,t))})`;
}
function sh(ctx, col, blur, ox, oy) {
  ctx.shadowColor=col; ctx.shadowBlur=blur; ctx.shadowOffsetX=ox; ctx.shadowOffsetY=oy;
}
function noSh(ctx) { ctx.shadowColor="transparent"; ctx.shadowBlur=ctx.shadowOffsetX=ctx.shadowOffsetY=0; }
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

/* ── palettes ────────────────────────────────────────────────── */
const PALETTES = [
  { id:"fire",    name:"BBQ Fire",      accent:"#ff6b00", dark:"#120800", mid:"#3d1500", text:"#fff" },
  { id:"gold",    name:"Midnight Gold", accent:"#f0c040", dark:"#080818", mid:"#18183a", text:"#fff" },
  { id:"saffron", name:"Saffron",       accent:"#ff9800", dark:"#160404", mid:"#3d0f0f", text:"#fff" },
  { id:"rose",    name:"Rose Bold",     accent:"#e85d8a", dark:"#140510", mid:"#35102a", text:"#fff" },
  { id:"steel",   name:"Steel Blue",    accent:"#4aa8d8", dark:"#040e18", mid:"#0f1f35", text:"#fff" },
  { id:"forest",  name:"Forest",        accent:"#52b788", dark:"#040e0a", mid:"#0f2016", text:"#fff" },
];

/* ── aspect ratios ───────────────────────────────────────────── */
const SIZES = {
  "1:1":  { w:1080, h:1080, label:"1:1" },
  "4:5":  { w:1080, h:1350, label:"4:5" },
  "9:16": { w:1080, h:1920, label:"9:16" },
};

/* ── templates ───────────────────────────────────────────────── */
const TEMPLATES = [
  { id:"depth",         label:"Depth Stack" },
  { id:"extrude",       label:"Extruded Type" },
  { id:"paper",         label:"Paper Cut" },
  { id:"neon",          label:"Neon Glow" },
  { id:"reveal",        label:"Cinematic" },
  { id:"story-reveal",  label:"Story Reveal" },
  { id:"story-price",   label:"Story Price Tag" },
  { id:"story-cinematic", label:"Story Cinematic" },
];

/* ═══════════════════════════════════════════════════════════════
   TEMPLATE DRAW FUNCTIONS  — all take (ctx, W, H, data, t, img)
   t = seconds (looping 0..8), img = scene HTMLImageElement | null
═══════════════════════════════════════════════════════════════ */

/* ── 1. DEPTH STACK MOTION ────────────────────────────────────── */
function drawDepth(ctx, W, H, d, t, img) {
  const [ar,ag,ab] = hex2rgb(d.accent);
  const pulse = 1 + 0.045 * Math.sin(t * 2.4);
  const shimX = ((t * 0.18) % 1.4) - 0.2;

  // BG
  const bg = ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0, d.dark); bg.addColorStop(1,`rgb(${Math.round(ar*.07)},${Math.round(ag*.07)},${Math.round(ab*.07)})`);
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  // Rotating accent ring
  ctx.save();
  ctx.translate(W*.72, H*.38);
  ctx.rotate(t * 0.08);
  sh(ctx,"rgba(0,0,0,.35)",W*.04,0,W*.03);
  ctx.fillStyle=`rgba(${ar},${ag},${ab},.13)`;
  ctx.beginPath(); ctx.arc(0,0,W*.52,0,Math.PI*2); ctx.fill();
  noSh(ctx); ctx.restore();

  // Scene image in circle
  if (img) {
    ctx.save();
    ctx.beginPath(); ctx.arc(W*.72,H*.38,W*.46,0,Math.PI*2); ctx.clip();
    ctx.drawImage(img,W*.26,H*.04,W*.7,W*.7);
    ctx.restore();
  }

  // Accent block with shimmer
  sh(ctx,"rgba(0,0,0,.45)",W*.05,0,W*.025);
  ctx.fillStyle=d.accent; rr(ctx,0,H*.68,W,H*.32,0); ctx.fill(); noSh(ctx);
  // Shimmer sweep on accent block
  const sg = ctx.createLinearGradient(shimX*W,0,(shimX+0.25)*W,0);
  sg.addColorStop(0,"rgba(255,255,255,0)"); sg.addColorStop(.5,"rgba(255,255,255,.18)"); sg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.save(); ctx.beginPath(); ctx.rect(0,H*.68,W,H*.32); ctx.clip();
  ctx.fillStyle=sg; ctx.fillRect(0,H*.68,W,H*.32); ctx.restore();

  // White card (floating)
  const cardY = H*.6 + Math.sin(t*.55)*H*.006;
  sh(ctx,"rgba(0,0,0,.5)",W*.06,0,W*.03);
  ctx.fillStyle="rgba(255,255,255,.96)"; rr(ctx,W*.06,cardY,W*.56,H*.22,W*.025); ctx.fill(); noSh(ctx);
  ctx.fillStyle="#111"; ctx.font=`600 ${W*.038}px Oswald,sans-serif`; ctx.textBaseline="top";
  ctx.fillText(d.sub||"Grilled BBQ Platter",W*.1,cardY+H*.025);
  ctx.fillStyle="#555"; ctx.font=`400 ${W*.028}px Oswald,sans-serif`;
  ctx.fillText(d.cta||"Order Now",W*.1,cardY+H*.075);

  // Headline
  ctx.fillStyle="#fff"; ctx.font=`700 ${W*.092}px Oswald,sans-serif`; ctx.textBaseline="alphabetic";
  (d.headline||"TODAY'S SPECIAL").split(" ").forEach((w,i)=>ctx.fillText(w,W*.07,H*.28+i*W*.1));

  // Price badge — pulsing
  ctx.save(); ctx.translate(W*.77,H*.68); ctx.scale(pulse,pulse);
  sh(ctx,"rgba(0,0,0,.6)",W*.07,0,W*.04);
  ctx.fillStyle="#fff"; rr(ctx,-W*.15,-H*.06,W*.3,H*.12,W*.04); ctx.fill(); noSh(ctx);
  ctx.fillStyle=d.accent; ctx.font=`700 ${W*.075}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(d.price||"₹99",0,0); ctx.textAlign="left"; ctx.restore();
}

/* ── 2. EXTRUDED TYPE MOTION ──────────────────────────────────── */
function drawExtrude(ctx, W, H, d, t) {
  const [ar,ag,ab] = hex2rgb(d.accent);
  const breathe = 0.7 + 0.3 * Math.sin(t * 0.9);
  const scanY = ((t * 0.14) % 1.15) - 0.05;

  ctx.fillStyle=d.dark; ctx.fillRect(0,0,W,H);

  // diagonal stripe
  ctx.save(); ctx.translate(W*.5,H*.5); ctx.rotate(-0.18);
  ctx.fillStyle=`rgba(${ar},${ag},${ab},.055)`;
  ctx.fillRect(-W*.6,-H*.06,W*1.2,H*.12); ctx.fillRect(-W*.6,H*.14,W*1.2,H*.06);
  ctx.restore();

  // Extruded headline
  const words = (d.headline||"TODAY'S SPECIAL").split(" ");
  const fs = W*.155;
  ctx.font=`700 ${fs}px Oswald,sans-serif`; ctx.textBaseline="top";
  const STEPS = Math.round(14 * breathe);
  words.forEach((word, wi) => {
    const bx=W*.06, by=H*.2+wi*(fs*1.05);
    for (let s=0;s<STEPS;s++) {
      const tk=s/(STEPS-1);
      ctx.fillStyle=lerpColor("#2d0f00",d.accent,tk*.55);
      ctx.fillText(word, bx+(STEPS-1-s)*1.3, by+(STEPS-1-s)*1.3);
    }
    sh(ctx,`rgba(${ar},${ag},${ab},.55)`,W*.022,0,0);
    ctx.fillStyle="#fff"; ctx.fillText(word,bx,by); noSh(ctx);
  });

  // Scan line across text area
  const sy = H*.18 + scanY*(H*.45);
  const scanGrad = ctx.createLinearGradient(0,sy-H*.015,0,sy+H*.015);
  scanGrad.addColorStop(0,"rgba(255,255,255,0)"); scanGrad.addColorStop(.5,"rgba(255,255,255,.18)"); scanGrad.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=scanGrad; ctx.fillRect(0,sy-H*.015,W,H*.03);

  // Rule + sub + cta
  ctx.fillStyle=d.accent; ctx.fillRect(W*.06,H*.59,W*.88,3);
  ctx.fillStyle="rgba(255,255,255,.82)"; ctx.font=`400 ${W*.042}px Oswald,sans-serif`; ctx.textBaseline="top";
  ctx.fillText(d.sub||"",W*.06,H*.62);
  ctx.fillStyle=`rgba(${ar},${ag},${ab},.85)`; ctx.font=`400 ${W*.032}px Oswald,sans-serif`;
  ctx.fillText(d.cta||"",W*.06,H*.68);

  // Price — glowing pulse
  const glow = 0.03 + 0.06 * Math.abs(Math.sin(t*2.1));
  sh(ctx,d.accent,W*glow*8,0,0);
  ctx.fillStyle=d.accent; ctx.font=`700 ${W*.13}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign="right"; ctx.textBaseline="bottom";
  ctx.fillText(d.price||"₹99",W*.94,H*.96); noSh(ctx); ctx.textAlign="left";
}

/* ── 3. PAPER CUT MOTION ─────────────────────────────────────── */
function drawPaper(ctx, W, H, d, t, img) {
  const [ar,ag,ab] = hex2rgb(d.accent);
  const floats = [
    Math.sin(t*.38)*H*.007,
    Math.sin(t*.52+1)*H*.01,
    Math.sin(t*.65+2)*H*.008,
  ];

  const wave = (yBot, wav, freq, yOff) => {
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.lineTo(W,H);
    for(let i=32;i>=0;i--){ const x=(i/32)*W; ctx.lineTo(x, yBot+yOff+Math.sin((i/32)*Math.PI*freq)*wav); }
    ctx.closePath(); ctx.fill();
  };

  // Layer 0 — BG
  ctx.fillStyle=d.dark; ctx.fillRect(0,0,W,H);

  // Layer 1
  sh(ctx,"rgba(0,0,0,.3)",H*.025,0,H*.018+floats[0]*.5);
  ctx.fillStyle=`rgb(${Math.round(ar*.22)},${Math.round(ag*.22)},${Math.round(ab*.22)})`;
  ctx.save(); ctx.translate(0,floats[0]); wave(H*.78,H*.025,2,0); ctx.restore(); noSh(ctx);

  // Layer 2 — accent
  sh(ctx,"rgba(0,0,0,.38)",H*.03,0,H*.022+floats[1]*.5);
  ctx.fillStyle=d.accent;
  ctx.save(); ctx.translate(0,floats[1]); wave(H*.72,H*.02,3,0); ctx.restore(); noSh(ctx);

  // Layer 3 — white card
  const cardY = H*.07 + floats[2];
  sh(ctx,"rgba(0,0,0,.5)",H*.04,0,H*.03);
  ctx.fillStyle="#fff"; rr(ctx,W*.06,cardY,W*.88,H*.48,W*.03); ctx.fill(); noSh(ctx);

  if (img) {
    ctx.save(); rr(ctx,W*.08,cardY+H*.02,W*.84,H*.35,W*.02); ctx.clip();
    ctx.drawImage(img,W*.08,cardY+H*.02,W*.84,H*.35); ctx.restore();
  }

  // Headline below card
  ctx.fillStyle="#fff"; ctx.font=`700 ${W*.082}px Oswald,sans-serif`; ctx.textBaseline="top";
  const hw = (d.headline||"TODAY'S SPECIAL").split(" ");
  ctx.fillText(hw[0]||"",W*.08,H*.575+floats[1]);
  ctx.fillStyle=d.accent; ctx.fillText(hw.slice(1).join(" ")||"",W*.08,H*.655+floats[1]);

  // Sub + CTA
  ctx.fillStyle="#333"; ctx.font=`500 ${W*.038}px Oswald,sans-serif`;
  ctx.fillText(d.sub||"",W*.1,cardY+H*.46);
  ctx.fillStyle="#fff"; ctx.font=`400 ${W*.032}px Oswald,sans-serif`;
  ctx.fillText(d.cta||"",W*.08,H*.74+floats[1]);

  // Price circle — floats + pulse
  const pScale = 1 + 0.04*Math.sin(t*2.6);
  ctx.save(); ctx.translate(W*.82,H*.14+floats[2]); ctx.scale(pScale,pScale);
  sh(ctx,"rgba(0,0,0,.55)",W*.05,0,W*.03);
  ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(0,0,W*.12,0,Math.PI*2); ctx.fill(); noSh(ctx);
  ctx.fillStyle=d.accent; ctx.font=`700 ${W*.062}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(d.price||"₹99",0,0);
  ctx.textAlign="left"; ctx.restore();
}

/* ── 4. NEON GLOW ───────────────────────────────────────────── */
function drawNeon(ctx, W, H, d, t) {
  const [ar,ag,ab] = hex2rgb(d.accent);
  const gPulse = 0.55 + 0.45*Math.sin(t*1.8);
  const scanY = ((t*.12)%1.1)-.05;

  // Near-black BG with subtle vignette
  ctx.fillStyle="#070707"; ctx.fillRect(0,0,W,H);
  const vig = ctx.createRadialGradient(W*.5,H*.5,H*.1,W*.5,H*.5,H*.75);
  vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,.7)");
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

  // Neon grid lines (perspective)
  ctx.strokeStyle=`rgba(${ar},${ag},${ab},.12)`; ctx.lineWidth=1;
  for(let i=0;i<8;i++){
    const x=W*(i/7); ctx.beginPath(); ctx.moveTo(x,H*.3); ctx.lineTo(W*.5,H*.05); ctx.stroke();
  }
  for(let i=0;i<5;i++){
    const y=H*.05+i*(H*.25/4); const spread=(y-H*.05)/(H*.3-H*.05);
    ctx.beginPath(); ctx.moveTo(W*.5-spread*W*.5,y); ctx.lineTo(W*.5+spread*W*.5,y); ctx.stroke();
  }

  // Neon horizontal rule
  sh(ctx,d.accent,W*.018*gPulse,0,0);
  ctx.strokeStyle=d.accent; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(W*.06,H*.36); ctx.lineTo(W*.94,H*.36); ctx.stroke(); noSh(ctx);

  // Neon headline
  const words=(d.headline||"NEON BBQ").split(" ");
  words.forEach((word,i)=>{
    const glow=W*.025*gPulse;
    sh(ctx,d.accent,glow*3,0,0);
    ctx.fillStyle=`rgba(${ar},${ag},${ab},.4)`;
    ctx.font=`700 ${W*.115}px Oswald,sans-serif`; ctx.textBaseline="top";
    ctx.fillText(word,W*.06,H*.38+i*W*.125);
    sh(ctx,"#fff",glow,0,0);
    ctx.fillStyle="#fff";
    ctx.fillText(word,W*.06,H*.38+i*W*.125); noSh(ctx);
  });

  // Sub text
  ctx.fillStyle=`rgba(${ar},${ag},${ab},.7)`; ctx.font=`400 ${W*.038}px Oswald,sans-serif`;
  ctx.textBaseline="top"; ctx.fillText(d.sub||"",W*.06,H*.67);

  // CTA
  ctx.fillStyle="rgba(255,255,255,.5)"; ctx.font=`400 ${W*.028}px Oswald,sans-serif`;
  ctx.fillText(d.cta||"",W*.06,H*.73);

  // Scan line
  const sy=H*.35+scanY*(H*.45);
  const sg=ctx.createLinearGradient(0,sy-H*.01,0,sy+H*.01);
  sg.addColorStop(0,"rgba(255,255,255,0)"); sg.addColorStop(.5,"rgba(255,255,255,.12)"); sg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=sg; ctx.fillRect(0,sy-H*.01,W,H*.02);

  // Price — neon circle
  const pr=1+0.05*Math.sin(t*3.1);
  ctx.save(); ctx.translate(W*.78,H*.78); ctx.scale(pr,pr);
  sh(ctx,d.accent,W*.055*gPulse,0,0);
  ctx.strokeStyle=d.accent; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(0,0,W*.13,0,Math.PI*2); ctx.stroke();
  sh(ctx,d.accent,W*.03*gPulse,0,0);
  ctx.fillStyle=d.accent; ctx.font=`700 ${W*.075}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(d.price||"₹99",0,0); noSh(ctx); ctx.textAlign="left"; ctx.restore();
}

/* ── 5. CINEMATIC REVEAL ────────────────────────────────────── */
function drawCinematic(ctx, W, H, d, t, img) {
  const [ar,ag,ab] = hex2rgb(d.accent);
  const rev = Math.min(t / 2, 1);

  // BG
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,d.dark); bg.addColorStop(1,d.mid);
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  // Scene image (fade in)
  if (img) {
    ctx.save(); ctx.globalAlpha=ease(rev); ctx.drawImage(img,0,0,W,H); ctx.globalAlpha=1;
    const ov=ctx.createLinearGradient(0,0,0,H);
    ov.addColorStop(0,"rgba(0,0,0,.55)"); ov.addColorStop(.6,"rgba(0,0,0,.2)"); ov.addColorStop(1,"rgba(0,0,0,.75)");
    ctx.fillStyle=ov; ctx.fillRect(0,0,W,H); ctx.restore();
  }

  // Letterbox bars
  const barH=H*.08;
  ctx.fillStyle="#000"; ctx.fillRect(0,0,W,barH); ctx.fillRect(0,H-barH,W,barH);

  // Headline — wipes in from left
  const hw=Math.min(t/0.8,1);
  ctx.save(); ctx.rect(0,0,W*ease(hw),H); ctx.clip();
  ctx.fillStyle="#fff"; ctx.font=`700 ${W*.095}px Oswald,sans-serif`; ctx.textBaseline="alphabetic";
  const words=(d.headline||"CINEMA BBQ").split(" ");
  words.forEach((w,i)=>ctx.fillText(w,W*.07,H*.52+i*W*.1));
  ctx.restore();

  // Sub — fades in
  const sf=Math.min(Math.max((t-0.6)/0.6,0),1);
  ctx.save(); ctx.globalAlpha=ease(sf);
  ctx.fillStyle=`rgba(${ar},${ag},${ab},1)`; ctx.font=`400 ${W*.042}px Oswald,sans-serif`; ctx.textBaseline="alphabetic";
  ctx.fillText(d.sub||"",W*.07,H*.76); ctx.restore();

  // Accent rule — draws in
  const rf=Math.min(Math.max((t-0.4)/0.6,0),1);
  ctx.fillStyle=d.accent; ctx.fillRect(W*.07,H*.58,W*.86*ease(rf),3);

  // CTA
  ctx.save(); ctx.globalAlpha=ease(sf);
  ctx.fillStyle="rgba(255,255,255,.65)"; ctx.font=`400 ${W*.028}px Oswald,sans-serif`;
  ctx.fillText(d.cta||"",W*.07,H*.82); ctx.restore();

  // Price — drops in from above
  const pf=Math.min(Math.max((t-0.5)/0.6,0),1);
  const dropY=H*.14 - H*.1*(1-ease(pf));
  ctx.save(); ctx.globalAlpha=ease(pf); ctx.translate(W*.82,dropY);
  sh(ctx,"rgba(0,0,0,.55)",W*.05,0,W*.03);
  ctx.fillStyle=d.accent; rr(ctx,-W*.12,-H*.065,W*.24,H*.13,W*.035); ctx.fill(); noSh(ctx);
  ctx.fillStyle="#fff"; ctx.font=`700 ${W*.07}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(d.price||"₹99",0,0);
  ctx.textAlign="left"; ctx.restore();
}

/* ── 6. STORY REVEAL (9:16 vertical) — layered parallax + DOF ── */
function drawStoryReveal(ctx, W, H, d, t, img) {
  const [ar, ag, ab] = hex2rgb(d.accent);
  const rev  = Math.min(t / 2.6, 1);
  const e    = ease(rev);

  // Dark gradient base
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, d.dark);
  bg.addColorStop(0.55, d.mid);
  bg.addColorStop(1, d.dark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (img) {
    // ---- Far plane (slow, heavy blur) ----
    ctx.save();
    const farScale = 1.22 - e * 0.08;
    const farY = (1 - e) * H * 0.04;
    ctx.globalAlpha = 0.7 * e;
    ctx.translate(W / 2, H / 2 + farY);
    ctx.scale(farScale, farScale);
    ctx.filter = "blur(9px) brightness(0.65)";
    ctx.drawImage(img, -W / 2, -H / 2, W, H);
    ctx.filter = "none";
    ctx.restore();

    // ---- Mid plane (medium parallax) ----
    ctx.save();
    const midScale = 1.10 - e * 0.05;
    const midY = (1 - e) * H * 0.02;
    ctx.globalAlpha = 0.9 * e;
    ctx.translate(W / 2, H / 2 + midY);
    ctx.scale(midScale, midScale);
    ctx.filter = "blur(3.5px) brightness(0.85)";
    ctx.drawImage(img, -W / 2, -H / 2, W, H);
    ctx.filter = "none";
    ctx.restore();

    // ---- Foreground plane (sharp + strongest zoom) ----
    ctx.save();
    const fgScale = 1.0 + e * 0.14;
    ctx.globalAlpha = e;
    ctx.translate(W / 2, H / 2);
    ctx.scale(fgScale, fgScale);
    ctx.drawImage(img, -W / 2, -H / 2, W, H);
    ctx.restore();

    // Soft vignette for extra depth
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.9);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(0.55, "rgba(0,0,0,0.15)");
    vig.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // Top accent bar
  const barH = H * 0.055;
  ctx.save();
  ctx.rect(0, 0, W * e, barH);
  ctx.clip();
  ctx.fillStyle = d.accent;
  ctx.fillRect(0, 0, W, barH);
  ctx.restore();

  // Headline wipe
  const hw = Math.min(t / 1.3, 1);
  ctx.save();
  ctx.rect(0, barH, W, H * 0.48 * ease(hw));
  ctx.clip();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${W * 0.1}px Oswald,sans-serif`;
  ctx.textBaseline = "alphabetic";
  const words = (d.headline || "TODAY'S SPECIAL").split(" ");
  words.forEach((w, i) => ctx.fillText(w, W * 0.08, H * 0.28 + i * W * 0.11));
  ctx.restore();

  // Sub + rule + CTA
  const sf = Math.min(Math.max((t - 1.7) / 1.3, 0), 1);
  ctx.save();
  ctx.globalAlpha = ease(sf);
  ctx.fillStyle = `rgba(${ar},${ag},${ab},1)`;
  ctx.font = `400 ${W * 0.045}px Oswald,sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(d.sub || "", W * 0.08, H * 0.56);

  ctx.fillStyle = d.accent;
  ctx.fillRect(W * 0.08, H * 0.60, W * 0.84 * ease(sf), 3);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `400 ${W * 0.032}px Oswald,sans-serif`;
  ctx.fillText(d.cta || "", W * 0.08, H * 0.66);
  ctx.restore();

  // Price badge slides up with slight overshoot
  const pf = Math.min(Math.max((t - 2.0) / 1.3, 0), 1);
  const slideY = H - H * 0.16 * (1 - ease(pf)) - Math.sin(ease(pf) * Math.PI) * H * 0.012;
  ctx.save();
  ctx.globalAlpha = ease(pf);
  ctx.translate(W * 0.5, slideY);
  sh(ctx, "rgba(0,0,0,0.55)", W * 0.06, 0, W * 0.035);
  ctx.fillStyle = d.accent;
  rr(ctx, -W * 0.22, -H * 0.065, W * 0.44, H * 0.13, W * 0.04);
  ctx.fill();
  noSh(ctx);
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${W * 0.08}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(d.price || "₹99", 0, 0);
  ctx.textAlign = "left";
  ctx.restore();
}

/* ── 7. STORY PRICE TAG (9:16 vertical) — parallax + DOF ── */
function drawStoryPriceTag(ctx, W, H, d, t, img) {
  const [ar, ag, ab] = hex2rgb(d.accent);
  const bounce   = 1 + 0.07 * Math.sin(t * 3.4);
  const pulse    = 1 + 0.045 * Math.sin(t * 3.8);
  const shimmerX = ((t * 0.16) % 1.5) - 0.25;
  const driftX   = Math.sin(t * 0.45) * W * 0.018;
  const driftY   = Math.cos(t * 0.38) * H * 0.012;

  // Base
  ctx.fillStyle = d.dark;
  ctx.fillRect(0, 0, W, H);

  if (img) {
    // Far blurred plane (slow opposite drift)
    ctx.save();
    ctx.translate(W / 2 - driftX * 0.5, H * 0.28 - driftY * 0.4);
    ctx.scale(1.18, 1.18);
    ctx.filter = "blur(8px) brightness(0.6)";
    ctx.globalAlpha = 0.75;
    ctx.drawImage(img, -W / 2, -H * 0.28, W, H * 0.55);
    ctx.filter = "none";
    ctx.restore();

    // Mid plane
    ctx.save();
    ctx.translate(W / 2 + driftX * 0.35, H * 0.28 + driftY * 0.3);
    ctx.scale(1.06, 1.06);
    ctx.filter = "blur(3px)";
    ctx.globalAlpha = 0.9;
    ctx.drawImage(img, -W / 2, -H * 0.28, W, H * 0.55);
    ctx.filter = "none";
    ctx.restore();

    // Sharp foreground plate
    ctx.save();
    ctx.translate(0, driftY * 0.15);
    ctx.drawImage(img, 0, 0, W, H * 0.52);
    // Soft bottom fade
    const fade = ctx.createLinearGradient(0, H * 0.40, 0, H * 0.52);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, d.dark);
    ctx.fillStyle = fade;
    ctx.fillRect(0, H * 0.40, W, H * 0.12);
    ctx.restore();
  }

  // Large price tag (floating in front)
  const tagW = W * 0.78;
  const tagH = H * 0.27;
  const tagX = W * 0.11;
  const tagY = H * 0.53 + (bounce - 1) * H * 0.018;

  // Depth shadow under tag
  sh(ctx, "rgba(0,0,0,0.5)", W * 0.09, 0, W * 0.055);
  const tagGrad = ctx.createLinearGradient(tagX, tagY, tagX, tagY + tagH);
  tagGrad.addColorStop(0, d.accent);
  tagGrad.addColorStop(1, `rgb(${Math.round(ar * 0.55)},${Math.round(ag * 0.55)},${Math.round(ab * 0.55)})`);
  ctx.fillStyle = tagGrad;
  rr(ctx, tagX, tagY, tagW, tagH, W * 0.04);
  ctx.fill();
  noSh(ctx);

  // Shimmer sweep
  const sg = ctx.createLinearGradient(shimmerX * W, tagY, (shimmerX + 0.28) * W, tagY);
  sg.addColorStop(0, "rgba(255,255,255,0)");
  sg.addColorStop(0.5, "rgba(255,255,255,0.28)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.beginPath();
  rr(ctx, tagX, tagY, tagW, tagH, W * 0.04);
  ctx.clip();
  ctx.fillStyle = sg;
  ctx.fillRect(tagX, tagY, tagW, tagH);
  ctx.restore();

  // Price text
  ctx.save();
  ctx.translate(W / 2, tagY + tagH / 2);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${W * 0.11}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(d.price || "₹99", 0, 0);
  ctx.restore();

  // "TODAY ONLY" floating slightly in front
  ctx.save();
  ctx.translate(W / 2, tagY + tagH + H * 0.025 + Math.sin(t * 2.8) * H * 0.004);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  rr(ctx, -W * 0.16, -H * 0.018, W * 0.32, H * 0.036, W * 0.018);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${W * 0.032}px Oswald,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TODAY ONLY", 0, 0);
  ctx.restore();

  // Headline (top)
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${W * 0.085}px Oswald,sans-serif`;
  ctx.textBaseline = "top";
  const words = (d.headline || "SPECIAL OFFER").split(" ");
  words.forEach((w, i) => ctx.fillText(w, W * 0.08, H * 0.055 + i * W * 0.095));

  // Sub
  ctx.fillStyle = `rgba(${ar},${ag},${ab},0.9)`;
  ctx.font = `400 ${W * 0.04}px Oswald,sans-serif`;
  ctx.fillText(d.sub || "", W * 0.08, H * 0.25);

  // CTA
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `400 ${W * 0.03}px Oswald,sans-serif`;
  ctx.fillText(d.cta || "", W * 0.08, H * 0.92);
}

/* ── 8. STORY CINEMATIC (9:16 vertical) — multi-plane + DOF ── */
function drawStoryCinematic(ctx, W, H, d, t, img) {
  const [ar, ag, ab] = hex2rgb(d.accent);
  const rev = Math.min(t / 3.1, 1);
  const e   = ease(rev);
  const letterboxH = H * 0.1;
  const farX = Math.sin(t * 0.28) * W * 0.022;
  const midX = Math.sin(t * 0.42 + 1.2) * W * 0.012;

  // Base
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#020202");
  bg.addColorStop(0.5, d.dark);
  bg.addColorStop(1, "#020202");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (img) {
    // Far plane — heavy blur + slow drift
    ctx.save();
    ctx.translate(W / 2 + farX, H / 2);
    ctx.scale(1.20, 1.20);
    ctx.filter = "blur(11px) brightness(0.5) contrast(1.15)";
    ctx.globalAlpha = 0.7 * e;
    ctx.drawImage(img, -W / 2, -H / 2, W, H);
    ctx.filter = "none";
    ctx.restore();

    // Mid plane
    ctx.save();
    ctx.translate(W / 2 + midX, H / 2);
    ctx.scale(1.07, 1.07);
    ctx.filter = "blur(3.8px) brightness(0.78)";
    ctx.globalAlpha = 0.88 * e;
    ctx.drawImage(img, -W / 2, -H / 2, W, H);
    ctx.filter = "none";
    ctx.restore();

    // Sharp subject plane (slight push-in)
    ctx.save();
    ctx.globalAlpha = e;
    ctx.translate(W / 2, H / 2);
    ctx.scale(1.0 + e * 0.05, 1.0 + e * 0.05);
    ctx.drawImage(img, -W / 2, -H / 2, W, H);
    ctx.restore();

    // Cinematic color grade
    const grade = ctx.createLinearGradient(0, 0, 0, H);
    grade.addColorStop(0, `rgba(${ar},${ag},${ab},0.12)`);
    grade.addColorStop(0.5, "rgba(0,0,0,0)");
    grade.addColorStop(1, `rgba(${Math.round(ar * 0.4)},${Math.round(ag * 0.4)},${Math.round(ab * 0.4)},0.18)`);
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, W, H);
  }

  // Letterbox bars
  const lbH = letterboxH * e;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, lbH);
  ctx.fillRect(0, H - lbH, W, lbH);

  // Subtle film grain
  if (t > 0.8) {
    ctx.save();
    ctx.globalAlpha = 0.045;
    for (let i = 0; i < 180; i++) {
      const gx = Math.random() * W;
      const gy = Math.random() * H;
      ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
      ctx.fillRect(gx, gy, 1.4, 1.4);
    }
    ctx.restore();
  }

  // Typewriter headline
  const typeProgress = Math.min(Math.max((t - 0.4) / 2.1, 0), 1);
  const full = d.headline || "CINEMATIC BBQ";
  const chars = Math.floor(full.length * ease(typeProgress));
  ctx.fillStyle = "#fff";
  ctx.font = `300 ${W * 0.075}px Oswald,sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 10;
  ctx.fillText(full.slice(0, chars), W * 0.08, H * 0.44);
  ctx.shadowBlur = 0;

  // Sub + divider + CTA
  const sf = Math.min(Math.max((t - 1.7) / 1.6, 0), 1);
  ctx.save();
  ctx.globalAlpha = ease(sf);
  ctx.fillStyle = `rgba(${ar},${ag},${ab},0.9)`;
  ctx.font = `400 ${W * 0.042}px Oswald,sans-serif`;
  ctx.fillText(d.sub || "", W * 0.08, H * 0.53);

  const lineP = Math.min(Math.max((t - 1.1) / 1.9, 0), 1);
  ctx.fillStyle = d.accent;
  ctx.fillRect(W * 0.08, H * 0.58, W * 0.84 * ease(lineP), 2);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `400 ${W * 0.028}px Oswald,sans-serif`;
  ctx.fillText(d.cta || "", W * 0.08, H * 0.64);
  ctx.restore();

  // Price badge (slides up from letterbox)
  const pf = Math.min(Math.max((t - 2.1) / 1.1, 0), 1);
  const badgeY = H - letterboxH - H * 0.11 * ease(pf);
  ctx.save();
  ctx.globalAlpha = ease(pf);
  ctx.translate(W * 0.88, badgeY);
  sh(ctx, "rgba(0,0,0,0.55)", W * 0.05, 0, W * 0.03);
  ctx.fillStyle = "rgba(18,18,18,0.92)";
  rr(ctx, -W * 0.18, -H * 0.055, W * 0.36, H * 0.11, W * 0.025);
  ctx.fill();
  noSh(ctx);
  ctx.fillStyle = d.accent;
  ctx.font = `700 ${W * 0.07}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(d.price || "₹99", 0, 0);
  ctx.textAlign = "left";
  ctx.restore();

  // Film perforation dots
  for (let i = 0; i < 11; i++) {
    const py = lbH + i * (H - 2 * lbH) / 10;
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    ctx.beginPath();
    ctx.arc(W * 0.028, py, W * 0.007, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ═══════════════════════════════════════════════════════════════
   GIF EXPORT (gif.js via CDN)
═══════════════════════════════════════════════════════════════ */
function loadGifJs() {
  return new Promise((res) => {
    if (window.GIF) { res(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js";
    s.onload = res;
    document.head.appendChild(s);
  });
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function PostStudio() {
  const [tmpl, setTmpl] = useState("depth");
  const [ratio, setRatio] = useState("1:1");
  const [paletteId, setPaletteId] = useState("fire");
  const [headline, setHeadline] = useState("TODAY'S SPECIAL");
  const [sub, setSub] = useState("Grilled BBQ Platter");
  const [price, setPrice] = useState("₹99");
  const [cta, setCta] = useState("Order Now · 9876543210");
  const [useScene, setUseScene] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [gifBusy, setGifBusy] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const sceneImgRef = useRef(null);
  const tRef = useRef(0);
  const lastTsRef = useRef(null);

  const palette = PALETTES.find(p => p.id === paletteId) || PALETTES[0];

  // Capture scene snapshot (low-res, reused each frame)
  const captureScene = useCallback(() => {
    if (!useScene) { sceneImgRef.current = null; return; }
    const sc = animationStore.getCanvas();
    if (!sc) return;
    const img = new Image();
    img.onload = () => { sceneImgRef.current = img; };
    img.src = sc.toDataURL("image/jpeg", 0.82);
  }, [useScene]);

  useEffect(() => { captureScene(); }, [captureScene]);

  // Draw one frame at time t
  const drawFrame = useCallback((canvas, t, W, H) => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const d = { headline, sub, price, cta, accent: palette.accent, dark: palette.dark, mid: palette.mid };
    const img = sceneImgRef.current;
    if (tmpl === "depth")           drawDepth(ctx, W, H, d, t, img);
    if (tmpl === "extrude")         drawExtrude(ctx, W, H, d, t);
    if (tmpl === "paper")           drawPaper(ctx, W, H, d, t, img);
    if (tmpl === "neon")            drawNeon(ctx, W, H, d, t);
    if (tmpl === "reveal")          drawCinematic(ctx, W, H, d, t, img);
    if (tmpl === "story-reveal")    drawStoryReveal(ctx, W, H, d, t, img);
    if (tmpl === "story-price")     drawStoryPriceTag(ctx, W, H, d, t, img);
    if (tmpl === "story-cinematic") drawStoryCinematic(ctx, W, H, d, t, img);
  }, [tmpl, headline, sub, price, cta, palette, sceneImgRef]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = SIZES[ratio];
    canvas.width = w; canvas.height = h;
    tRef.current = 0; lastTsRef.current = null;

    let stopped = false;
    const loop = (ts) => {
      if (stopped) return;
      if (lastTsRef.current !== null) tRef.current = (tRef.current + (ts - lastTsRef.current) / 1000) % 8;
      lastTsRef.current = ts;
      drawFrame(canvas, tRef.current, w, h);
      rafRef.current = requestAnimationFrame(loop);
    };
    document.fonts.ready.then(() => {
      if (!stopped) rafRef.current = requestAnimationFrame(loop);
    });
    return () => { stopped = true; cancelAnimationFrame(rafRef.current); };
  }, [ratio, drawFrame]);

  // Parallax tilt
  const onMouseMove = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 20, y: -((e.clientY - r.top) / r.height - 0.5) * 20 });
  };

  // PNG download (current frame)
  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `post-${tmpl}-${ratio.replace(":","x")}.png`;
    a.click();
  };

  // GIF export
  const downloadGif = async () => {
    if (gifBusy) return;
    setGifBusy(true); setGifProgress(0);
    await loadGifJs();
    const { w, h } = SIZES[ratio];
    const off = document.createElement("canvas");
    off.width = Math.round(w * 0.5); off.height = Math.round(h * 0.5);
    const scale = off.width / w;
    const FRAMES = 20, DELAY = 100;
    const gif = new window.GIF({ workers: 2, quality: 8, width: off.width, height: off.height });
    const ctx2 = off.getContext("2d");
    for (let f = 0; f < FRAMES; f++) {
      const ft = (f / FRAMES) * 8;
      const tmp = document.createElement("canvas");
      tmp.width = w; tmp.height = h;
      drawFrame(tmp, ft, w, h);
      ctx2.clearRect(0, 0, off.width, off.height);
      ctx2.drawImage(tmp, 0, 0, off.width, off.height);
      gif.addFrame(ctx2, { copy: true, delay: DELAY });
      setGifProgress(Math.round((f / FRAMES) * 85));
    }
    gif.on("finished", (blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `post-${tmpl}-${ratio.replace(":","x")}.gif`;
      a.click();
      setGifBusy(false); setGifProgress(0);
    });
    gif.on("progress", (p) => setGifProgress(85 + Math.round(p * 15)));
    gif.render();
  };

  const { w, h } = SIZES[ratio];

  return (
    <div className="sos2-posts">
      {/* template tabs */}
      <div className="sos2-posts-tabs">
        {TEMPLATES.map(t => (
          <button key={t.id} className={`sos2-posts-tab${tmpl===t.id?" active":""}`} onClick={()=>{ setTmpl(t.id); if (t.id.startsWith("story-")) setRatio("9:16"); }}>{t.label}</button>
        ))}
      </div>

      {/* tilt preview */}
      <div ref={containerRef} className="sos2-posts-preview-wrap"
        style={{ aspectRatio: `${w} / ${h}` }}
        onMouseMove={onMouseMove} onMouseLeave={()=>setTilt({x:0,y:0})}>
        <canvas ref={canvasRef} className="sos2-posts-canvas"
          style={{ transform:`perspective(700px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`, transition:tilt.x===0?"transform 0.6s ease":"none" }} />
      </div>

      {/* aspect ratio + scene toggle */}
      <div className="sos2-posts-row">
        {Object.entries(SIZES).map(([k,v])=>(
          <button key={k} className={`sos2-posts-chip${ratio===k?" active":""}`} onClick={()=>setRatio(k)}>{v.label}</button>
        ))}
        <label className="sos2-posts-chip" style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}>
          <input type="checkbox" checked={useScene} onChange={e=>setUseScene(e.target.checked)} style={{accentColor:"#ff6b00"}} />
          Scene
        </label>
      </div>

      {/* palette */}
      <div className="sos2-posts-row" style={{flexWrap:"wrap"}}>
        {PALETTES.map(p=>(
          <button key={p.id} className={`sos2-posts-pal${paletteId===p.id?" active":""}`}
            style={{"--pal":p.accent}} onClick={()=>setPaletteId(p.id)} title={p.name}>
            <span style={{background:p.accent}}/>
          </button>
        ))}
      </div>

      {/* text inputs */}
      {[["Headline",headline,setHeadline],["Sub",sub,setSub],["Price",price,setPrice],["CTA / Phone",cta,setCta]].map(([lbl,val,fn])=>(
        <label key={lbl} className="sos2-posts-field"><span>{lbl}</span>
          <input value={val} onChange={e=>fn(e.target.value)} />
        </label>
      ))}

      {/* export buttons */}
      <div className="sos2-posts-row">
        <button className="sos2-posts-dl" onClick={downloadPng}>↓ PNG</button>
        <button className="sos2-posts-dl sos2-posts-dl-gif" onClick={downloadGif} disabled={gifBusy}>
          {gifBusy ? `GIF ${gifProgress}%` : "↓ GIF"}
        </button>
      </div>
    </div>
  );
}
