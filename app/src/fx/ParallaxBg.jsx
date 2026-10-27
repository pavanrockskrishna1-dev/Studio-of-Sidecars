import { useEffect, useRef, useSyncExternalStore } from "react";
import * as parallaxBgStore from "./parallaxBgStore";

/* ── environment definitions ─────────────────────────────────────
   Each environment is an array of layer draw functions.
   Layer fn signature: drawLayer(ctx, W, H, t, shiftX, shiftY)
   - t: seconds (RAF timestamp / 1000)
   - shiftX/Y: pixel offset for this layer (depth * mouse delta)
   Layers ordered back-to-front. Each is drawn on a temporary
   off-screen canvas that is then composited at its shift offset.
─────────────────────────────────────────────────────────────────*/

// ── helpers
function rnd(seed, n) { // deterministic float 0..1
  let s = seed * 9301 + 49297; s %= 233280;
  return (((s * 9301 + (n*7321)) % 233280) / 233280);
}

// ── ENV: City Night ─────────────────────────────────────────────
const cityNight = [
  // Layer 0: sky gradient + moon
  (ctx, W, H, t) => {
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#05050f"); g.addColorStop(1,"#0e122a");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // moon
    const mx=W*.76, my=H*.18;
    ctx.shadowColor="#fffff0"; ctx.shadowBlur=W*.06;
    ctx.fillStyle="#fffde0"; ctx.beginPath(); ctx.arc(mx,my,W*.04,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // star field (50 stars)
    for(let i=0;i<50;i++){
      const sx=rnd(i,1)*W, sy=rnd(i,2)*H*.55;
      const blink=0.4+0.6*Math.abs(Math.sin(t*0.9+i));
      ctx.globalAlpha=blink*rnd(i,3);
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(sx,sy,rnd(i,4)*W*.003+W*.001,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  },
  // Layer 1: far skyline silhouette
  (ctx, W, H) => {
    ctx.fillStyle="#080b1a";
    [[0,0.38,0.18,0.72],[0.14,0.30,0.12,0.70],[0.24,0.44,0.08,0.56],[0.31,0.26,0.15,0.74],
     [0.44,0.40,0.10,0.60],[0.52,0.22,0.18,0.78],[0.68,0.34,0.14,0.66],[0.80,0.28,0.12,0.72],[0.90,0.42,0.14,0.58]].forEach(([x,top,w,bot])=>{
      ctx.fillRect(x*W,top*H,w*W,(bot-top)*H);
    });
    // lit windows
    for(let i=0;i<60;i++){
      const wx=rnd(i,10)*W, wy=rnd(i,11)*H*.55+H*.25;
      if(wy>H*.73) return;
      const lit=rnd(i,12)>0.35;
      if(!lit) return;
      ctx.fillStyle=`rgba(255,220,120,${0.3+rnd(i,13)*.5})`;
      ctx.fillRect(wx,wy,W*.012,H*.02);
    }
  },
  // Layer 2: near rooftops + neon glow pools
  (ctx, W, H, t) => {
    ctx.fillStyle="#060810";
    [[0,0.58,0.22,1],[0.20,0.62,0.30,1],[0.48,0.55,0.25,1],[0.70,0.60,0.32,1]].forEach(([x,top,w,bot])=>{
      ctx.fillRect(x*W,top*H,w*W,(bot-top)*H);
    });
    // neon signs glow pools
    [[255,64,128,0.12,0.64],[0,229,255,0.42,0.59],[255,152,0,0.71,0.63]].forEach(([r,g2,b2,nx,ny],i)=>{
      const pulse=0.6+0.4*Math.abs(Math.sin(t*1.8+i));
      const rg2=ctx.createRadialGradient(nx*W,ny*H,0,nx*W,ny*H,W*.14);
      rg2.addColorStop(0,`rgba(${r},${g2},${b2},${.22*pulse})`);
      rg2.addColorStop(1,`rgba(${r},${g2},${b2},0)`);
      ctx.fillStyle=rg2; ctx.fillRect(0,0,W,H);
    });
  },
];

// ── ENV: Market Street ──────────────────────────────────────────
const marketStreet = [
  // Layer 0: warm evening sky
  (ctx, W, H) => {
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#1a0510"); g.addColorStop(.4,"#3d0f05"); g.addColorStop(.7,"#8b3a00"); g.addColorStop(1,"#c85c00");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // distant minaret/dome silhouette
    ctx.fillStyle="#120403";
    ctx.beginPath(); ctx.arc(W*.85,H*.38,W*.09,Math.PI,0); ctx.fill();
    ctx.fillRect(W*.84,H*.28,W*.02,H*.12);
    // crescent
    ctx.fillStyle="#c85c00";
    ctx.beginPath(); ctx.arc(W*.85,H*.25,W*.018,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#1a0510";
    ctx.beginPath(); ctx.arc(W*.857,H*.247,W*.015,0,Math.PI*2); ctx.fill();
  },
  // Layer 1: middle — canopies
  (ctx, W, H, t) => {
    [[0,"#c0391b"],[0.25,"#e67e22"],[0.5,"#27ae60"],[0.75,"#2980b9"]].forEach(([x,col],i)=>{
      const sway=Math.sin(t*.6+i)*H*.007;
      ctx.fillStyle=col; ctx.beginPath();
      ctx.moveTo(x*W,H*.52+sway); ctx.lineTo((x+.27)*W,H*.52+sway);
      ctx.lineTo((x+.25)*W,H*.65+sway); ctx.lineTo((x+.02)*W,H*.65+sway);
      ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.18)";
      for(let s=0;s<5;s++) ctx.fillRect((x+s*.05)*W,H*.52+sway,W*.015,H*.13);
    });
    // string lights
    for(let i=0;i<20;i++){
      const blink=0.5+0.5*Math.sin(t*2+i*1.3);
      ctx.fillStyle=`rgba(255,220,100,${blink})`;
      const lx=i/19*W, ly=H*.54+(Math.sin(i*.8)*.012*H);
      ctx.beginPath(); ctx.arc(lx,ly,W*.008,0,Math.PI*2); ctx.fill();
    }
  },
  // Layer 2: near ground + lamp posts
  (ctx, W, H) => {
    const g=ctx.createLinearGradient(0,H*.72,0,H);
    g.addColorStop(0,"#1a0a00"); g.addColorStop(1,"#0a0500");
    ctx.fillStyle=g; ctx.fillRect(0,H*.72,W,H*.28);
    [0.15,0.48,0.82].forEach((lx)=>{
      ctx.fillStyle="#2c1800"; ctx.fillRect(lx*W-W*.008,H*.55,W*.016,H*.45);
      const rg=ctx.createRadialGradient(lx*W,H*.56,0,lx*W,H*.56,W*.15);
      rg.addColorStop(0,"rgba(255,160,30,.3)"); rg.addColorStop(1,"rgba(255,160,30,0)");
      ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
    });
  },
];

// ── ENV: Desert Sunset ──────────────────────────────────────────
const desertSunset = [
  // Layer 0: sky
  (ctx, W, H) => {
    const g=ctx.createLinearGradient(0,0,0,H*.65);
    g.addColorStop(0,"#150025"); g.addColorStop(.35,"#7b1fa2"); g.addColorStop(.65,"#f57c00"); g.addColorStop(1,"#ffcc02");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H*.65);
    // sun disc
    ctx.fillStyle="#ffec80"; ctx.shadowColor="#ff8f00"; ctx.shadowBlur=W*.12;
    ctx.beginPath(); ctx.arc(W*.5,H*.62,W*.065,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // sun rays (horizon)
    const rg=ctx.createRadialGradient(W*.5,H*.62,W*.07,W*.5,H*.62,W*.6);
    rg.addColorStop(0,"rgba(255,200,30,.18)"); rg.addColorStop(1,"rgba(255,100,0,0)");
    ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
  },
  // Layer 1: dunes far
  (ctx, W, H) => {
    ctx.fillStyle="#8b4513";
    ctx.beginPath(); ctx.moveTo(0,H*.72);
    for(let i=0;i<=20;i++){
      const x=i/20*W;
      const y=H*.72+Math.sin(i*.7+1)*H*.06+Math.sin(i*.3+2)*H*.04;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#5c2d0a";
    ctx.beginPath(); ctx.moveTo(0,H*.75);
    for(let i=0;i<=20;i++){
      const x=i/20*W;
      const y=H*.77+Math.sin(i*.7+1)*H*.04+Math.sin(i*.3+2)*H*.025;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
  },
  // Layer 2: near dune edge + subtle wind haze
  (ctx, W, H, t) => {
    ctx.fillStyle="#6b3410";
    ctx.beginPath(); ctx.moveTo(0,H*.82);
    for(let i=0;i<=20;i++){
      const x=i/20*W;
      const y=H*.82+Math.sin(i*.9+t*.15)*H*.04;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#3d1f08"; ctx.fillRect(0,H*.9,W,H*.1);
  },
];

// ── ENV: Neon Arcade ────────────────────────────────────────────
const neonArcade = [
  // Layer 0: dark BG + perspective grid
  (ctx, W, H, t) => {
    ctx.fillStyle="#04000c"; ctx.fillRect(0,0,W,H);
    const hor=H*.62;
    ctx.strokeStyle=`rgba(120,0,255,${0.18+0.06*Math.sin(t*1.1)})`; ctx.lineWidth=1;
    for(let i=0;i<=18;i++){
      const x=W*(i/18); ctx.beginPath(); ctx.moveTo(x,hor); ctx.lineTo(W*.5,H*.15); ctx.stroke();
    }
    for(let r=0;r<7;r++){
      const prog=Math.pow(r/6,1.6);
      const y=hor+(H-hor)*prog;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }
  },
  // Layer 1: neon arch portals
  (ctx, W, H, t) => {
    [[W*.5,H*.15,W*.48,[255,0,204]],[W*.5,H*.15,W*.36,[0,229,255]]].forEach(([cx,cy,rx,[r2,g2,b2]])=>{
      const pulse=0.7+0.3*Math.abs(Math.sin(t*1.5));
      const col=`rgb(${r2},${g2},${b2})`;
      ctx.shadowColor=col; ctx.shadowBlur=W*.025*pulse;
      ctx.strokeStyle=`rgba(${r2},${g2},${b2},${.8*pulse})`;
      ctx.lineWidth=3; ctx.beginPath();
      ctx.arc(cx,cy,rx,Math.PI,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-rx,cy); ctx.lineTo(cx-rx,H*.62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+rx,cy); ctx.lineTo(cx+rx,H*.62); ctx.stroke();
    });
    ctx.shadowBlur=0;
    for(let y=0;y<H;y+=4){
      ctx.fillStyle="rgba(0,0,0,.12)"; ctx.fillRect(0,y,W,2);
    }
  },
  // Layer 2: floor reflection + near elements
  (ctx, W, H, t) => {
    const fg=ctx.createLinearGradient(0,H*.62,0,H);
    fg.addColorStop(0,"rgba(20,0,40,.85)"); fg.addColorStop(1,"rgba(4,0,12,.98)");
    ctx.fillStyle=fg; ctx.fillRect(0,H*.62,W,H*.38);
    const pulse=0.5+0.5*Math.sin(t*2.2);
    const rg=ctx.createLinearGradient(0,H*.62,0,H*.85);
    rg.addColorStop(0,`rgba(120,0,255,${.3*pulse})`); rg.addColorStop(1,"rgba(120,0,255,0)");
    ctx.fillStyle=rg; ctx.fillRect(W*.45,H*.62,W*.1,H*.23);
  },
];

// ── ENV: Forest Dawn ────────────────────────────────────────────
const forestDawn = [
  // Layer 0: misty morning sky
  (ctx, W, H) => {
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#0d1a26"); g.addColorStop(.4,"#1e4060"); g.addColorStop(.65,"#2e7d8c"); g.addColorStop(1,"#78bfa8");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    const sg=ctx.createRadialGradient(W*.5,H*.55,0,W*.5,H*.55,W*.4);
    sg.addColorStop(0,"rgba(255,220,120,.25)"); sg.addColorStop(1,"rgba(255,180,60,0)");
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
    const mist=ctx.createLinearGradient(0,H*.55,0,H*.75);
    mist.addColorStop(0,"rgba(200,230,240,0)"); mist.addColorStop(.5,"rgba(200,230,240,.18)"); mist.addColorStop(1,"rgba(200,230,240,0)");
    ctx.fillStyle=mist; ctx.fillRect(0,H*.5,W,H*.3);
  },
  // Layer 1: distant tree line
  (ctx, W, H) => {
    ctx.fillStyle="#0d2218";
    for(let i=0;i<30;i++){
      const tx=rnd(i,20)*W, th=rnd(i,21)*H*.22+H*.12;
      const tw=rnd(i,22)*W*.04+W*.015;
      ctx.beginPath(); ctx.moveTo(tx,H*.65); ctx.lineTo(tx-tw,H*.65); ctx.lineTo(tx-tw*.4,H*.65-th);
      ctx.lineTo(tx,H*.65-th*1.3); ctx.lineTo(tx+tw*.4,H*.65-th); ctx.lineTo(tx+tw,H*.65); ctx.fill();
    }
  },
  // Layer 2: near trees (bigger, partially cut off)
  (ctx, W, H) => {
    ctx.fillStyle="#071510";
    [-.05,.15,.32,.55,.72,.88,1.02].forEach((nx,i)=>{
      const tw=W*.08+rnd(i,30)*W*.06;
      const th=H*.45+rnd(i,31)*H*.2;
      ctx.beginPath(); ctx.moveTo(nx*W,H); ctx.lineTo(nx*W-tw,H);
      ctx.lineTo(nx*W-tw*.5,H-th*1.2); ctx.lineTo(nx*W,H-th*1.5);
      ctx.lineTo(nx*W+tw*.5,H-th*1.2); ctx.lineTo(nx*W+tw,H); ctx.fill();
    });
    const mist=ctx.createLinearGradient(0,H*.7,0,H);
    mist.addColorStop(0,"rgba(120,200,180,0)"); mist.addColorStop(.5,"rgba(120,200,180,.12)"); mist.addColorStop(1,"rgba(0,20,15,.8)");
    ctx.fillStyle=mist; ctx.fillRect(0,H*.7,W,H*.3);
  },
];

// ── ENV: Rooftop Golden Hour ─────────────────────────────────────
const rooftopGoldenHour = [
  // Layer 0: golden sky
  (ctx, W, H) => {
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#0a1020"); g.addColorStop(.3,"#1a2050"); g.addColorStop(.6,"#e65100"); g.addColorStop(1,"#ffb300");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    const sg=ctx.createRadialGradient(W*.62,H*.58,0,W*.62,H*.58,W*.25);
    sg.addColorStop(0,"rgba(255,200,50,.4)"); sg.addColorStop(1,"rgba(255,100,0,0)");
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
    const hz=ctx.createLinearGradient(0,H*.5,0,H*.7);
    hz.addColorStop(0,"rgba(255,120,0,0)"); hz.addColorStop(.5,"rgba(255,120,0,.12)"); hz.addColorStop(1,"rgba(255,120,0,0)");
    ctx.fillStyle=hz; ctx.fillRect(0,H*.5,W,H*.2);
  },
  // Layer 1: city silhouette
  (ctx, W, H) => {
    ctx.fillStyle="#060810";
    [[0,0.42,0.15],[0.13,0.32,0.13],[0.24,0.46,0.08],[0.30,0.28,0.18],
     [0.46,0.38,0.12],[0.56,0.25,0.16],[0.70,0.36,0.14],[0.82,0.30,0.18]].forEach(([x,top,w])=>{
      ctx.fillRect(x*W,top*H,w*W,(0.68-top)*H);
    });
    ctx.strokeStyle="rgba(255,160,30,.15)"; ctx.lineWidth=2;
    [[0,0.42,0.15],[0.30,0.28,0.18],[0.56,0.25,0.16]].forEach(([x,top,w])=>{
      ctx.strokeRect(x*W,top*H,w*W,(0.68-top)*H);
    });
  },
  // Layer 2: rooftop floor + AC units + railing
  (ctx, W, H) => {
    const fg=ctx.createLinearGradient(0,H*.68,0,H);
    fg.addColorStop(0,"#1a1510"); fg.addColorStop(1,"#0a0805");
    ctx.fillStyle=fg; ctx.fillRect(0,H*.68,W,H*.32);
    ctx.fillStyle="#1a1510"; ctx.fillRect(0,H*.68,W,H*.025);
    for(let i=0;i<30;i++) ctx.fillRect(i/29*W-W*.003,H*.63,W*.006,H*.05);
    [[0.1,0.76],[0.35,0.74],[0.6,0.77],[0.82,0.73]].forEach(([x,y])=>{
      ctx.fillStyle="#111"; ctx.fillRect(x*W,y*H,W*.09,H*.06);
      const rg=ctx.createRadialGradient(x*W+W*.045,y*H+H*.03,0,x*W+W*.045,y*H+H*.03,W*.1);
      rg.addColorStop(0,"rgba(255,140,30,.06)"); rg.addColorStop(1,"rgba(255,100,0,0)");
      ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
    });
  },
];

/* ── environment registry ─────────────────────────────────────── */
export const ENVS = [
  { id:"city",     label:"City Night",        layers: cityNight,        depths:[0, 0.25, 0.55] },
  { id:"market",   label:"Market Street",     layers: marketStreet,     depths:[0, 0.3,  0.65] },
  { id:"desert",   label:"Desert Sunset",     layers: desertSunset,     depths:[0, 0.2,  0.5]  },
  { id:"arcade",   label:"Neon Arcade",       layers: neonArcade,       depths:[0, 0.35, 0.7]  },
  { id:"forest",   label:"Forest Dawn",       layers: forestDawn,       depths:[0, 0.2,  0.55] },
  { id:"rooftop",  label:"Rooftop Golden Hr", layers: rooftopGoldenHour,depths:[0, 0.22, 0.5]  },
];
const MAX_SHIFT = 60; // max pixel parallax at max mouse travel

/* ── component ────────────────────────────────────────────────── */
export default function ParallaxBg() {
  const { env: envId } = useSyncExternalStore(parallaxBgStore.subscribe, parallaxBgStore.getSnapshot);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const smoothRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5),
        y: (e.clientY / window.innerHeight - 0.5),
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !envId) return;
    const env = ENVS.find(e => e.id === envId);
    if (!env) return;

    let stopped = false;
    const offscreens = env.layers.map(() => document.createElement("canvas"));

    const loop = (ts) => {
      if (stopped) return;
      const t = ts / 1000;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      offscreens.forEach(o => { if (o.width!==W||o.height!==H) { o.width=W; o.height=H; } });

      // smooth mouse
      const sm = smoothRef.current, m = mouseRef.current;
      sm.x += (m.x - sm.x) * 0.06;
      sm.y += (m.y - sm.y) * 0.06;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);

      env.layers.forEach((drawFn, i) => {
        const depth = env.depths[i] || 0;
        const sx = sm.x * MAX_SHIFT * depth;
        const sy = sm.y * MAX_SHIFT * depth * 0.5;
        const oc = offscreens[i];
        const octx = oc.getContext("2d");
        octx.clearRect(0, 0, W, H);
        // draw slightly oversized to allow shift without gaps
        octx.save(); octx.translate(-MAX_SHIFT*depth, -MAX_SHIFT*depth*0.5);
        octx.scale(1 + depth*MAX_SHIFT*2/W, 1 + depth*MAX_SHIFT*2/H);
        drawFn(octx, W, H, t, 0, 0);
        octx.restore();
        ctx.drawImage(oc, sx, sy);
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { stopped = true; cancelAnimationFrame(rafRef.current); };
  }, [envId]);

  if (!envId) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        zIndex: 0, pointerEvents: "none", display: "block",
      }}
    />
  );
}
