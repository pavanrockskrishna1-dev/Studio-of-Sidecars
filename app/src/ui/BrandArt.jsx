import { useCallback, useEffect, useRef, useState } from "react";

/* ── shared helpers ─────────────────────────────────────────── */
function hex2rgb(hex) { const n=parseInt(hex.replace("#",""),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function rr(ctx,x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function rnd(seed,n) { let s=(seed*9301+49297)%233280; return ((s*9301+n*7321)%233280)/233280; }
function sh(ctx,col,blur) { ctx.shadowColor=col; ctx.shadowBlur=blur; }
function noSh(ctx) { ctx.shadowColor="transparent"; ctx.shadowBlur=0; }

const PALETTES = [
  { id:"fire",    name:"BBQ Fire",      accent:"#ff6b00", dark:"#120800", mid:"#3d1500" },
  { id:"gold",    name:"Midnight Gold", accent:"#f0c040", dark:"#080818", mid:"#18183a" },
  { id:"saffron", name:"Saffron",       accent:"#ff9800", dark:"#160404", mid:"#3d0f0f" },
  { id:"rose",    name:"Rose Bold",     accent:"#e85d8a", dark:"#140510", mid:"#35102a" },
  { id:"steel",   name:"Steel Blue",    accent:"#4aa8d8", dark:"#040e18", mid:"#0f1f35" },
  { id:"forest",  name:"Forest",        accent:"#52b788", dark:"#040e0a", mid:"#0f2016" },
];

const SIZES = { "1:1":{w:1080,h:1080}, "4:5":{w:1080,h:1350}, "9:16":{w:1080,h:1920} };

const ARTS = [
  { id:"steam",   label:"Steam & Serve" },
  { id:"diorama", label:"Product Diorama" },
  { id:"window",  label:"Neon Window" },
  { id:"pulse",   label:"Event Pulse" },
  { id:"bike",    label:"BBQ Bike Hero" },
  { id:"manga",   label:"Manga Panel" },
];

/* ── 1. STEAM & SERVE ─────────────────────────────────────── */
function drawSteam(ctx, W, H, t, mx, my, d) {
  const [ar,ag,ab] = hex2rgb(d.accent);
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,d.dark); bg.addColorStop(1,d.mid);
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  const gl=ctx.createRadialGradient(W*.5,H*.9,0,W*.5,H*.9,W*.65);
  gl.addColorStop(0,`rgba(${ar},${ag},${ab},.18)`); gl.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=gl; ctx.fillRect(0,0,W,H);

  const INGR = [
    {lbl:d.ing1||"Chicken",  ox:.22, oy:.30, r:.08, dep:.4},
    {lbl:d.ing2||"Spices",   ox:.78, oy:.25, r:.07, dep:.25},
    {lbl:"Sauce",    ox:.15, oy:.62, r:.075,dep:.55},
    {lbl:"Veggies",  ox:.82, oy:.60, r:.07, dep:.35},
    {lbl:"Fire",     ox:.50, oy:.18, r:.065,dep:.2},
  ];
  INGR.forEach(({lbl,ox,oy,r,dep},i)=>{
    const floatX=Math.sin(t*.42+i*1.4)*W*.015;
    const floatY=Math.cos(t*.37+i*1.1)*H*.012;
    const cx=(ox+mx*dep*.12)*W+floatX;
    const cy=(oy+my*dep*.12)*H+floatY;
    const rad=r*W;
    sh(ctx,`rgba(${ar},${ag},${ab},.35)`,W*.04);
    ctx.fillStyle=`rgba(${ar},${ag},${ab},.18)`;
    ctx.beginPath(); ctx.arc(cx,cy,rad,0,Math.PI*2); ctx.fill(); noSh(ctx);
    ctx.strokeStyle=`rgba(${ar},${ag},${ab},.55)`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,rad,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle="#fff"; ctx.font=`500 ${W*.028}px Oswald,sans-serif`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(lbl,cx,cy); ctx.textAlign="left";
  });

  const pz={x:W*.28,y:H*.37,w:W*.44,h:H*.32};
  sh(ctx,"rgba(0,0,0,.55)",W*.06); ctx.fillStyle="rgba(0,0,0,.55)";
  rr(ctx,pz.x,pz.y,pz.w,pz.h,W*.04); ctx.fill(); noSh(ctx);
  const plateCx=pz.x+pz.w*.5, plateCy=pz.y+pz.h*.5;
  ctx.fillStyle="rgba(255,255,255,.07)"; ctx.beginPath(); ctx.arc(plateCx,plateCy,pz.w*.38,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=`rgba(${ar},${ag},${ab},.4)`; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(plateCx,plateCy,pz.w*.38,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,.55)"; ctx.font=`400 ${W*.022}px Oswald,sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("your dish here",plateCx,plateCy); ctx.textAlign="left";

  for(let i=0;i<12;i++){
    const phase=(t*.28+i/12)%1;
    const sx=plateCx+(rnd(i,1)-.5)*pz.w*.55;
    const sy=pz.y+pz.h*.15-phase*H*.32;
    const life=phase<0.15?phase/.15:phase>0.8?(1-phase)/.2:1;
    ctx.globalAlpha=life*.35;
    ctx.fillStyle="rgba(255,255,255,1)";
    const swX=Math.sin(phase*Math.PI*3+i)*W*.025;
    ctx.beginPath(); ctx.arc(sx+swX,sy,W*.015*(0.5+phase*.8),0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  ctx.fillStyle="#fff"; ctx.font=`700 ${W*.072}px Oswald,sans-serif`; ctx.textBaseline="top";
  const hw=(d.headline||"DAILY SPECIAL").split(" ");
  hw.forEach((w,i)=>ctx.fillText(w,W*.07,H*.03+i*W*.08));

  const prScale=1+0.04*Math.sin(t*2.8);
  ctx.save(); ctx.translate(W*.82,H*.88); ctx.scale(prScale,prScale);
  sh(ctx,"rgba(0,0,0,.5)",W*.05);
  ctx.fillStyle=d.accent; rr(ctx,-W*.13,-H*.065,W*.26,H*.13,W*.03); ctx.fill(); noSh(ctx);
  ctx.fillStyle="#fff"; ctx.font=`700 ${W*.065}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(d.price||"₹99",0,0);
  ctx.textAlign="left"; ctx.restore();

  ctx.fillStyle="rgba(255,255,255,.8)"; ctx.font=`400 ${W*.032}px Oswald,sans-serif`; ctx.textBaseline="bottom";
  ctx.fillText(d.sub||"",W*.07,H*.97);
  ctx.fillStyle=`rgba(${ar},${ag},${ab},.75)`;
  ctx.fillText(d.cta||"",W*.07,H*.93);
}

/* ── 2. PRODUCT DIORAMA ──────────────────────────────────── */
function drawDiorama(ctx, W, H, t, mx, my, d) {
  const [ar,ag,ab] = hex2rgb(d.accent);
  const bg=ctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.5,W*.85);
  bg.addColorStop(0,"#2a2a2a"); bg.addColorStop(.6,d.mid); bg.addColorStop(1,d.dark);
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  const lx=W*.5+mx*W*.15, ly=H*.25+my*H*.1;
  const lg=ctx.createRadialGradient(lx,ly,0,lx,ly,W*.7);
  lg.addColorStop(0,"rgba(255,240,200,.28)"); lg.addColorStop(.4,"rgba(255,200,100,.08)"); lg.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=lg; ctx.fillRect(0,0,W,H);

  const sweepX=((t*.08)%1.4)-.2;
  const sg=ctx.createLinearGradient(sweepX*W,0,(sweepX+.22)*W,0);
  sg.addColorStop(0,"rgba(255,255,255,0)"); sg.addColorStop(.5,"rgba(255,255,255,.07)"); sg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);

  const shadowX=W*.5+mx*W*.08, shadowY=H*.78+my*H*.04;
  ctx.save(); ctx.translate(shadowX,shadowY); ctx.scale(1,.25);
  const se=ctx.createRadialGradient(0,0,0,0,0,W*.28);
  se.addColorStop(0,"rgba(0,0,0,.55)"); se.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=se; ctx.fillRect(-W*.28,-W*.28,W*.56,W*.56); ctx.restore();

  const float=Math.sin(t*.6)*H*.012;
  const px=W*.2, py=H*.25+float, pw=W*.6, ph=H*.44;
  sh(ctx,"rgba(0,0,0,.5)",W*.06);
  ctx.fillStyle=`rgba(${ar},${ag},${ab},.12)`;
  rr(ctx,px,py,pw,ph,W*.035); ctx.fill(); noSh(ctx);
  ctx.strokeStyle=`rgba(${ar},${ag},${ab},.35)`; ctx.lineWidth=2;
  rr(ctx,px,py,pw,ph,W*.035); ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,.3)"; ctx.font=`400 ${W*.026}px Oswald,sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("your product here",px+pw*.5,py+ph*.5); ctx.textAlign="left";
  const corners=[[px,py],[px+pw,py],[px,py+ph],[px+pw,py+ph]];
  ctx.strokeStyle=d.accent; ctx.lineWidth=3;
  corners.forEach(([cx2,cy2],i)=>{
    const sx=i%2===0?1:-1, sy=i<2?1:-1;
    ctx.beginPath(); ctx.moveTo(cx2,cy2); ctx.lineTo(cx2+sx*W*.05,cy2); ctx.moveTo(cx2,cy2); ctx.lineTo(cx2,cy2+sy*H*.035); ctx.stroke();
  });

  [
    {txt:d.spec1||"100% Halal",  nx:.1, ny:.38, dep:.6},
    {txt:d.spec2||"Chef's Pick", nx:.72,ny:.32, dep:.4},
    {txt:d.spec3||"Fresh Daily", nx:.08,ny:.65, dep:.5},
  ].forEach(({txt,nx,ny,dep},i)=>{
    const bx=(nx+mx*dep*.1)*W+Math.sin(t*.4+i)*W*.008;
    const by=(ny+my*dep*.1)*H+Math.cos(t*.35+i)*H*.006;
    sh(ctx,"rgba(0,0,0,.45)",W*.025);
    ctx.fillStyle="rgba(255,255,255,.92)"; rr(ctx,bx,by,W*.18,H*.04,W*.015); ctx.fill(); noSh(ctx);
    ctx.fillStyle="#111"; ctx.font=`500 ${W*.022}px Oswald,sans-serif`;
    ctx.textBaseline="middle"; ctx.fillText(txt,bx+W*.015,by+H*.02);
  });

  ctx.fillStyle="#fff"; ctx.font=`700 ${W*.082}px Oswald,sans-serif`; ctx.textBaseline="bottom";
  ctx.fillText(d.headline||"NEW ARRIVAL",W*.07,H*.23);
  ctx.fillStyle=d.accent; ctx.font=`700 ${W*.11}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign="right"; ctx.fillText(d.price||"₹99",W*.93,H*.95); ctx.textAlign="left";
  ctx.fillStyle="rgba(255,255,255,.65)"; ctx.font=`400 ${W*.032}px Oswald,sans-serif`; ctx.textBaseline="bottom";
  ctx.fillText(d.sub||"",W*.07,H*.97);
  ctx.fillStyle=`rgba(${ar},${ag},${ab},.75)`;
  ctx.fillText(d.cta||"",W*.07,H*.945);
}

/* ── 3. NEON WINDOW ──────────────────────────────────────── */
function drawWindow(ctx, W, H, t, mx, my, d) {
  const [ar,ag,ab] = hex2rgb(d.accent);
  const BORDER = W*.08;

  ctx.save();
  ctx.rect(BORDER,BORDER,W-BORDER*2,H-BORDER*2); ctx.clip();
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,"#04040e"); sky.addColorStop(1,"#0e122a");
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#07091a";
  [[0,.4,.18,.72],[.15,.32,.14,.72],[.27,.45,.09,.6],[.34,.28,.16,.72],[.48,.38,.11,.64],[.56,.24,.19,.72],[.70,.36,.14,.64],[.82,.30,.12,.7]].forEach(([x,top,w,bot])=>{
    ctx.fillRect(x*W+mx*8,top*H+my*4,(w||.12)*W,(bot-top)*H);
  });
  const SIGNS=[
    {x:.12,y:.52,txt:d.neon1||"BBQ",col:`rgb(${ar},${ag},${ab})`},
    {x:.55,y:.45,txt:d.neon2||"OPEN",col:"#00e5ff"},
    {x:.72,y:.58,txt:d.neon3||"HOT",col:"#ff4080"},
  ];
  SIGNS.forEach(({x,y,txt,col},i)=>{
    const fx=x*W+mx*20, fy=y*H+my*10;
    const flicker=0.6+0.4*Math.abs(Math.sin(t*3.2+i*2.1));
    ctx.globalAlpha=flicker;
    sh(ctx,col,W*.022); ctx.fillStyle=col;
    ctx.font=`700 ${W*.062}px 'Saira Stencil One',sans-serif`;
    ctx.textBaseline="top"; ctx.fillText(txt,fx,fy); noSh(ctx); ctx.globalAlpha=1;
  });
  ctx.strokeStyle="rgba(150,200,255,.22)"; ctx.lineWidth=1;
  for(let i=0;i<80;i++){
    const phase=(t*1.8+i/80)%1;
    const rx=rnd(i,1)*W+mx*55, ry=phase*H;
    ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-W*.004,ry+H*.025); ctx.stroke();
  }
  for(let i=0;i<15;i++){
    const dropPhase=(t*.3+i/15+rnd(i,5))%1;
    const dx=BORDER+rnd(i,6)*(W-BORDER*2);
    const dy=BORDER+dropPhase*(H-BORDER*2)*.4;
    ctx.globalAlpha=0.12+rnd(i,7)*.1;
    ctx.fillStyle="#c8e8ff"; ctx.beginPath(); ctx.arc(dx,dy,W*.006,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
  ctx.restore();

  ctx.fillStyle=d.dark;
  ctx.fillRect(0,0,W,BORDER); ctx.fillRect(0,H-BORDER,W,BORDER);
  ctx.fillRect(0,0,BORDER,H); ctx.fillRect(W-BORDER,0,BORDER,H);
  ctx.strokeStyle=d.accent; ctx.lineWidth=3;
  ctx.strokeRect(BORDER,BORDER,W-BORDER*2,H-BORDER*2);
  const cb=BORDER*1.6;
  [[0,0],[W,0],[0,H],[W,H]].forEach(([cx,cy])=>{
    const sx=cx===0?1:-1, sy=cy===0?1:-1;
    ctx.strokeStyle=d.accent; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(cx+sx*BORDER,cy+sy*cb); ctx.lineTo(cx+sx*BORDER,cy+sy*BORDER); ctx.lineTo(cx+sx*cb,cy+sy*BORDER); ctx.stroke();
  });
  const gPhase=((t*.06)%1.4)-.2;
  const fgr=ctx.createLinearGradient(gPhase*W,0,(gPhase+.15)*W,0);
  fgr.addColorStop(0,"rgba(255,255,255,0)"); fgr.addColorStop(.5,"rgba(255,255,255,.15)"); fgr.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=fgr; ctx.fillRect(0,0,BORDER,H); ctx.fillRect(W-BORDER,0,BORDER,H);
  ctx.fillRect(0,0,W,BORDER); ctx.fillRect(0,H-BORDER,W,BORDER);

  ctx.fillStyle="#fff"; ctx.font=`700 ${W*.048}px Oswald,sans-serif`; ctx.textBaseline="middle";
  ctx.textAlign="center"; ctx.fillText(d.headline||"BBQ NIGHTS",W*.5,BORDER*.5); ctx.textAlign="left";
  ctx.fillStyle=d.accent; ctx.font=`700 ${W*.052}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(d.price||"₹99",W*.5,H-BORDER*.5); ctx.textAlign="left";
  ctx.fillStyle="rgba(255,255,255,.6)"; ctx.font=`400 ${W*.024}px Oswald,sans-serif`;
  ctx.textAlign="center"; ctx.fillText(d.sub||"",W*.5,H-BORDER*.5+W*.036); ctx.textAlign="left";
}

/* ── 4. EVENT PULSE ──────────────────────────────────────── */
function drawPulse(ctx, W, H, t, mx, my, d) {
  const [ar,ag,ab] = hex2rgb(d.accent);
  const bg=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,H*.75);
  bg.addColorStop(0,d.mid); bg.addColorStop(1,d.dark);
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  for(let r=0;r<4;r++){
    const phase=((t*.18+r/4)%1);
    const rad=phase*W*.65;
    const alpha=(1-phase)*.28;
    ctx.strokeStyle=`rgba(${ar},${ag},${ab},${alpha})`;
    ctx.lineWidth=Math.max(1,(1-phase)*W*.015);
    ctx.beginPath(); ctx.arc(W*.5,H*.5,rad,0,Math.PI*2); ctx.stroke();
  }

  ctx.fillStyle="#050305";
  for(let i=0;i<32;i++){
    const hx=(i/31)*W+mx*25;
    const hy=H*.82+Math.sin(i*.9)*H*.06+rnd(i,2)*H*.04;
    const hw=W*.035+rnd(i,3)*W*.02;
    const hh=H*.18+rnd(i,4)*H*.08;
    ctx.beginPath(); ctx.arc(hx,hy-hh*.3,hw*.4,0,Math.PI*2); ctx.fill();
    ctx.fillRect(hx-hw*.5,hy-hh*.2,hw,hh*.6);
  }

  for(let i=0;i<8;i++){
    const speed=0.04+rnd(i,10)*.03;
    const phase=(t*speed+rnd(i,11))%1;
    const lx=(rnd(i,12)*.75+.12)*W+Math.sin(t*.4+i)*W*.025+mx*35*rnd(i,13);
    const ly=H*(1.05-phase*1.3);
    if(ly<-H*.1||ly>H*1.05) continue;
    const sz=W*.025+rnd(i,14)*W*.015;
    sh(ctx,d.accent,sz*2);
    ctx.fillStyle=d.accent;
    ctx.beginPath(); ctx.ellipse(lx,ly,sz,sz*1.4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(255,240,150,.6)";
    ctx.beginPath(); ctx.arc(lx,ly+sz*.5,sz*.35,0,Math.PI*2); ctx.fill();
    noSh(ctx);
    ctx.strokeStyle=`rgba(${ar},${ag},${ab},.3)`; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(lx,ly+sz*1.4); ctx.lineTo(lx,ly+sz*2.5); ctx.stroke();
  }

  const cardW=W*.82, cardH=H*.28;
  const cardX=(W-cardW)*.5, cardY=(H-cardH)*.5-H*.03;
  sh(ctx,"rgba(0,0,0,.55)",W*.06);
  ctx.fillStyle=`rgba(${ar},${ag},${ab},.15)`;
  rr(ctx,cardX,cardY,cardW,cardH,W*.03); ctx.fill();
  ctx.strokeStyle=d.accent; ctx.lineWidth=2;
  rr(ctx,cardX,cardY,cardW,cardH,W*.03); ctx.stroke(); noSh(ctx);
  ctx.fillStyle="#fff"; ctx.font=`700 ${W*.088}px Oswald,sans-serif`; ctx.textBaseline="top";
  ctx.textAlign="center"; ctx.fillText(d.headline||"GRAND OPENING",W*.5,cardY+cardH*.1);
  ctx.fillStyle=d.accent; ctx.font=`400 ${W*.042}px Oswald,sans-serif`;
  ctx.fillText(d.date||"12 Nov 2025 · 7 PM",W*.5,cardY+cardH*.58);
  ctx.fillStyle="rgba(255,255,255,.65)"; ctx.font=`400 ${W*.03}px Oswald,sans-serif`;
  ctx.fillText(d.sub||"",W*.5,cardY+cardH*.8);
  ctx.textAlign="left";

  ctx.fillStyle="rgba(255,255,255,.75)"; ctx.font=`400 ${W*.03}px Oswald,sans-serif`; ctx.textBaseline="bottom";
  ctx.textAlign="center"; ctx.fillText(d.cta||"",W*.5,H*.98); ctx.textAlign="left";

  const burstPhase=t%4;
  if(burstPhase<0.6){
    const bp=burstPhase/0.6;
    for(let p=0;p<20;p++){
      const angle=rnd(p,20)*Math.PI*2;
      const dist=bp*W*.28;
      const px2=W*.5+Math.cos(angle)*dist, py2=H*.5+Math.sin(angle)*dist;
      ctx.globalAlpha=(1-bp)*.7;
      ctx.fillStyle=d.accent; ctx.beginPath(); ctx.arc(px2,py2,W*.008*(1-bp)+W*.003,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  }
}

/* ── wheel draw helper ──────────────────────────────────────── */
function drawWheel(ctx, cx, cy, rad, angle, rimCol, accentCol) {
  ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = rad * 0.22;
  ctx.beginPath(); ctx.arc(cx, cy, rad * 0.84, 0, Math.PI * 2); ctx.stroke();
  sh(ctx, accentCol, rad * 0.12);
  ctx.strokeStyle = rimCol; ctx.lineWidth = rad * 0.07;
  ctx.beginPath(); ctx.arc(cx, cy, rad * 0.72, 0, Math.PI * 2); ctx.stroke();
  noSh(ctx);
  ctx.strokeStyle = rimCol; ctx.lineWidth = rad * 0.05;
  for (let s = 0; s < 6; s++) {
    const a = angle + (s / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rad * 0.14, cy + Math.sin(a) * rad * 0.14);
    ctx.lineTo(cx + Math.cos(a) * rad * 0.68, cy + Math.sin(a) * rad * 0.68);
    ctx.stroke();
  }
  ctx.fillStyle = rimCol; ctx.beginPath(); ctx.arc(cx, cy, rad * 0.15, 0, Math.PI * 2); ctx.fill();
  sh(ctx, accentCol, rad * 0.2);
  ctx.fillStyle = accentCol; ctx.beginPath(); ctx.arc(cx, cy, rad * 0.07, 0, Math.PI * 2); ctx.fill();
  noSh(ctx);
}

/* ── food icon helper ───────────────────────────────────────── */
function drawFoodIcon(ctx, type, cx, cy, sz, accent) {
  const [ar, ag, ab] = hex2rgb(accent);
  ctx.save(); ctx.translate(cx, cy);
  if (type === "flame") {
    ctx.fillStyle = accent;
    sh(ctx, accent, sz * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, sz * 0.6);
    ctx.bezierCurveTo(-sz * 0.4, sz * 0.2, -sz * 0.45, -sz * 0.3, 0, -sz * 0.6);
    ctx.bezierCurveTo(sz * 0.45, -sz * 0.3, sz * 0.4, sz * 0.2, 0, sz * 0.6);
    ctx.fill(); noSh(ctx);
    ctx.fillStyle = `rgba(255,240,100,0.7)`;
    ctx.beginPath();
    ctx.moveTo(0, sz * 0.3);
    ctx.bezierCurveTo(-sz * 0.2, sz * 0.1, -sz * 0.22, -sz * 0.15, 0, -sz * 0.32);
    ctx.bezierCurveTo(sz * 0.22, -sz * 0.15, sz * 0.2, sz * 0.1, 0, sz * 0.3);
    ctx.fill();
  } else if (type === "kebab") {
    ctx.strokeStyle = "#888"; ctx.lineWidth = sz * 0.08;
    ctx.beginPath(); ctx.moveTo(0, -sz * 0.65); ctx.lineTo(0, sz * 0.65); ctx.stroke();
    [-0.32, 0, 0.32].forEach((oy, i) => {
      ctx.fillStyle = i === 1 ? accent : `rgb(${ar},${Math.round(ag*.7)},${Math.round(ab*.5)})`;
      ctx.beginPath(); ctx.arc(0, oy * sz * 2, sz * 0.28, 0, Math.PI * 2); ctx.fill();
    });
  } else if (type === "chai") {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-sz * 0.32, -sz * 0.45); ctx.lineTo(sz * 0.32, -sz * 0.45);
    ctx.lineTo(sz * 0.28, sz * 0.42); ctx.lineTo(-sz * 0.28, sz * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-sz * 0.28, -sz * 0.1); ctx.lineTo(sz * 0.28, -sz * 0.1);
    ctx.lineTo(sz * 0.25, sz * 0.38); ctx.lineTo(-sz * 0.25, sz * 0.38);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = sz * 0.1;
    ctx.beginPath(); ctx.arc(sz * 0.38, 0, sz * 0.2, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.arc(sz * 0.08, -sz * 0.65, sz * 0.1, 0, Math.PI * 2); ctx.fill();
  } else if (type === "star") {
    sh(ctx, accent, sz * 0.4); ctx.fillStyle = accent;
    ctx.beginPath();
    for (let p = 0; p < 12; p++) {
      const a = (p / 12) * Math.PI * 2 - Math.PI / 2;
      const r2 = p % 2 === 0 ? sz * 0.55 : sz * 0.26;
      p === 0 ? ctx.moveTo(Math.cos(a)*r2, Math.sin(a)*r2) : ctx.lineTo(Math.cos(a)*r2, Math.sin(a)*r2);
    }
    ctx.closePath(); ctx.fill(); noSh(ctx);
  }
  ctx.restore();
}

/* ── 5. BBQ BIKE HERO ─────────────────────────────────────────── */
function drawBikeHero(ctx, W, H, t, mx, my, d) {
  const [ar, ag, ab] = hex2rgb(d.accent);
  const s = Math.min(W, H);

  const BX = W * 0.5;
  const WY = H * 0.72;
  const WR = s * 0.125;
  const LWX = BX - s * 0.225;
  const RWX = BX + s * 0.215;
  const wheelAngle = t * 2.8;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, d.dark); bg.addColorStop(0.6, d.mid); bg.addColorStop(1, "#000");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const stageGl = ctx.createRadialGradient(BX, H * 0.85, 0, BX, H * 0.85, W * 0.7);
  stageGl.addColorStop(0, `rgba(${ar},${ag},${ab},0.25)`);
  stageGl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = stageGl; ctx.fillRect(0, 0, W, H);

  const csx = mx * 12;
  ctx.fillStyle = `rgba(${ar},${ag},${ab},0.07)`;
  [[0,.4,.18],[.14,.3,.14],[.26,.48,.09],[.33,.26,.15],[.46,.37,.12],
   [.56,.22,.18],[.70,.33,.14],[.82,.27,.13]].forEach(([x,top,w])=>{
    ctx.fillRect(x*W+csx, top*H, w*W, (0.62-top)*H);
  });

  const roadY = H * 0.82;
  const roadG = ctx.createLinearGradient(0, roadY, 0, H);
  roadG.addColorStop(0, "#141414"); roadG.addColorStop(1, "#060606");
  ctx.fillStyle = roadG; ctx.fillRect(0, roadY, W, H - roadY);
  ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.5)`;
  ctx.lineWidth = W * 0.008; ctx.setLineDash([W * 0.055, W * 0.038]);
  ctx.beginPath(); ctx.moveTo(BX, roadY + H * 0.01); ctx.lineTo(BX, H); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.2)`; ctx.lineWidth = W * 0.004;
  ctx.beginPath(); ctx.moveTo(0, roadY); ctx.lineTo(W, roadY); ctx.stroke();

  const speedPhase = (t * 0.55) % 1;
  for (let i = 0; i < 7; i++) {
    const ph = (speedPhase + i / 7) % 1;
    const ly = H * (0.44 + i * 0.052);
    const llen = W * (0.07 + rnd(i, 40) * 0.1);
    const lx = LWX - WR * 1.1 - ph * W * 0.12;
    const alpha = ph < 0.25 ? ph / 0.25 : ph > 0.65 ? (1 - ph) / 0.35 : 1;
    ctx.globalAlpha = alpha * 0.38;
    ctx.strokeStyle = d.accent; ctx.lineWidth = W * 0.004;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - llen, ly); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.save(); ctx.translate(BX + mx * 15, WY + WR * 1.02);
  ctx.scale(1, 0.2);
  const gs = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.35);
  gs.addColorStop(0, "rgba(0,0,0,0.65)"); gs.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gs; ctx.fillRect(-W * 0.35, -W * 0.35, W * 0.7, W * 0.7);
  ctx.restore();

  const exTipX = RWX + WR * 0.9, exTipY = WY + WR * 0.18;
  for (let i = 0; i < 10; i++) {
    const ep = (t * 0.35 + i / 10) % 1;
    const ex = exTipX + ep * W * 0.14 + rnd(i, 50) * W * 0.02;
    const ey = exTipY - ep * H * 0.06 + Math.sin(ep * Math.PI * 4 + i) * H * 0.015;
    const er = W * 0.018 * (0.3 + ep * 0.7);
    ctx.globalAlpha = (1 - ep) * 0.28;
    ctx.fillStyle = "rgba(200,200,200,1)";
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save(); ctx.translate(BX + mx * 18, H * 0.02 + my * 10);

  const lx = LWX - BX;
  const rx = RWX - BX;
  const wy = WY - H * 0.02;

  const frameCol = "#c8c8c8";
  ctx.strokeStyle = frameCol; ctx.lineCap = "round"; ctx.lineJoin = "round";

  const seatTopX = lx + s * 0.055, seatTopY = wy - WR * 1.98;
  const engTopX = lx + s * 0.185, engTopY = wy - WR * 1.72;

  ctx.lineWidth = s * 0.025;
  ctx.strokeStyle = "#888";
  ctx.beginPath();
  ctx.moveTo(lx, wy - WR * 0.12);
  ctx.lineTo(seatTopX, seatTopY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(lx + s * 0.04, wy - WR * 0.1);
  ctx.lineTo(engTopX, engTopY);
  ctx.stroke();

  const headTubeTopX = rx - s * 0.06, headTubeTopY = wy - WR * 1.82;
  const headTubeBot = { x: rx - s * 0.05, y: wy - WR * 1.1 };
  ctx.lineWidth = s * 0.032;
  ctx.strokeStyle = frameCol;
  ctx.beginPath();
  ctx.moveTo(engTopX, engTopY);
  ctx.quadraticCurveTo(BX - BX + s * 0.02, wy - WR * 2.1, headTubeTopX, headTubeTopY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headTubeBot.x, headTubeBot.y);
  ctx.lineTo(lx + s * 0.14, wy - WR * 0.22);
  ctx.stroke();
  ctx.lineWidth = s * 0.018; ctx.strokeStyle = "#999";
  ctx.beginPath();
  ctx.moveTo(seatTopX, seatTopY);
  ctx.lineTo(lx + s * 0.12, wy - WR * 0.2);
  ctx.stroke();

  const engX = lx + s * 0.02, engY = wy - WR * 1.55;
  const engW = s * 0.34, engH = s * 0.38;
  sh(ctx, "rgba(0,0,0,0.5)", s * 0.04);
  ctx.fillStyle = "#1c1c1c";
  rr(ctx, engX, engY, engW, engH, s * 0.03); ctx.fill(); noSh(ctx);
  ctx.strokeStyle = "#555"; ctx.lineWidth = s * 0.012;
  rr(ctx, engX, engY, engW, engH, s * 0.03); ctx.stroke();
  ctx.strokeStyle = "#333"; ctx.lineWidth = s * 0.008;
  for (let f = 1; f < 5; f++) {
    const fy = engY + (f / 5) * engH;
    ctx.beginPath(); ctx.moveTo(engX + s * 0.02, fy); ctx.lineTo(engX + engW - s * 0.02, fy); ctx.stroke();
  }

  const tankStartX = seatTopX + s * 0.02, tankStartY = seatTopY - s * 0.02;
  sh(ctx, d.accent, s * 0.04);
  ctx.fillStyle = d.accent;
  ctx.beginPath();
  ctx.moveTo(tankStartX, tankStartY + s * 0.12);
  ctx.bezierCurveTo(
    tankStartX - s * 0.03, tankStartY - s * 0.01,
    headTubeTopX - s * 0.14, headTubeTopY - s * 0.04,
    headTubeTopX - s * 0.08, headTubeTopY + s * 0.04
  );
  ctx.lineTo(headTubeTopX, headTubeTopY + s * 0.14);
  ctx.bezierCurveTo(
    headTubeTopX - s * 0.06, headTubeTopY + s * 0.22,
    tankStartX + s * 0.06, tankStartY + s * 0.22,
    tankStartX, tankStartY + s * 0.12
  );
  ctx.fill(); noSh(ctx);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.ellipse(
    (tankStartX + headTubeTopX) * 0.5 - s * 0.02,
    (tankStartY + headTubeTopY) * 0.5 - s * 0.01,
    s * 0.1, s * 0.035, -0.3, 0, Math.PI * 2
  );
  ctx.fill();

  const seatX = lx - s * 0.06, seatY = seatTopY - s * 0.01;
  sh(ctx, "rgba(0,0,0,0.3)", s * 0.02);
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.moveTo(seatX, seatY + s * 0.06);
  ctx.bezierCurveTo(seatX, seatY - s * 0.01, seatX + s * 0.24, seatY - s * 0.025, seatX + s * 0.24, seatY + s * 0.06);
  ctx.bezierCurveTo(seatX + s * 0.24, seatY + s * 0.11, seatX, seatY + s * 0.11, seatX, seatY + s * 0.06);
  ctx.fill(); noSh(ctx);

  ctx.lineWidth = s * 0.028; ctx.strokeStyle = "#aaa";
  ctx.beginPath();
  ctx.moveTo(headTubeBot.x - s * 0.015, headTubeBot.y);
  ctx.lineTo(rx - s * 0.015, wy - WR * 0.18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headTubeBot.x + s * 0.015, headTubeBot.y);
  ctx.lineTo(rx + s * 0.015, wy - WR * 0.18);
  ctx.stroke();

  const hbY = headTubeTopY - s * 0.04;
  ctx.lineWidth = s * 0.02; ctx.strokeStyle = frameCol;
  ctx.beginPath();
  ctx.moveTo(headTubeTopX - s * 0.12, hbY);
  ctx.lineTo(headTubeTopX + s * 0.06, hbY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headTubeTopX, hbY + s * 0.02);
  ctx.lineTo(headTubeTopX, headTubeTopY + s * 0.04);
  ctx.stroke();
  ctx.lineWidth = s * 0.032;
  ctx.strokeStyle = "#555";
  ctx.beginPath(); ctx.moveTo(headTubeTopX - s * 0.12, hbY); ctx.lineTo(headTubeTopX - s * 0.16, hbY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(headTubeTopX + s * 0.06, hbY); ctx.lineTo(headTubeTopX + s * 0.1, hbY); ctx.stroke();

  ctx.lineWidth = s * 0.028; ctx.strokeStyle = "#888";
  ctx.beginPath();
  ctx.moveTo(lx + s * 0.22, wy - WR * 0.52);
  ctx.quadraticCurveTo(rx - s * 0.04, wy - WR * 0.35, rx + WR * 0.85, wy - WR * 0.1);
  ctx.stroke();
  ctx.lineWidth = s * 0.018; ctx.strokeStyle = "#666";
  ctx.beginPath();
  ctx.moveTo(lx + s * 0.22, wy - WR * 0.42);
  ctx.quadraticCurveTo(rx - s * 0.04, wy - WR * 0.28, rx + WR * 0.82, wy - WR * 0.02);
  ctx.stroke();
  sh(ctx, `rgba(${ar},${ag},${ab},0.7)`, s * 0.025);
  ctx.fillStyle = `rgba(${ar},${ag},${ab},0.4)`;
  ctx.beginPath(); ctx.arc(rx + WR * 0.88, wy - WR * 0.12, s * 0.022, 0, Math.PI * 2); ctx.fill();
  noSh(ctx);

  drawWheel(ctx, lx, wy, WR, wheelAngle, frameCol, d.accent);
  drawWheel(ctx, rx, wy, WR * 0.92, wheelAngle * 1.04, frameCol, d.accent);

  const hlX = headTubeTopX + s * 0.04, hlY = headTubeTopY + s * 0.1;
  const glowPulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 1.9));
  sh(ctx, "#fff", s * 0.06 * glowPulse);
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(hlX, hlY, s * 0.035, 0, Math.PI * 2); ctx.fill();
  noSh(ctx);
  const beam = ctx.createLinearGradient(hlX, hlY, hlX + s * 0.55, hlY + s * 0.08);
  beam.addColorStop(0, `rgba(255,255,240,${0.15 * glowPulse})`);
  beam.addColorStop(1, "rgba(255,255,240,0)");
  ctx.save();
  ctx.translate(hlX, hlY);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(s * 0.55, -s * 0.06);
  ctx.lineTo(s * 0.55, s * 0.12);
  ctx.closePath();
  ctx.fillStyle = beam; ctx.fill();
  ctx.restore();

  ctx.restore();

  const ORBIT_ITEMS = [
    { type: "flame",  baseAngle: 0,           orbitR: s * 0.36, spd: 0.30, dep: 0.42, sz: s * 0.055 },
    { type: "kebab",  baseAngle: Math.PI/2,   orbitR: s * 0.41, spd: 0.22, dep: 0.28, sz: s * 0.048 },
    { type: "chai",   baseAngle: Math.PI,     orbitR: s * 0.34, spd: 0.26, dep: 0.5,  sz: s * 0.05  },
    { type: "star",   baseAngle: Math.PI*1.5, orbitR: s * 0.44, spd: 0.18, dep: 0.32, sz: s * 0.042 },
  ];

  ORBIT_ITEMS.forEach(({ type, baseAngle, orbitR, spd, dep, sz }) => {
    const angle = baseAngle + t * spd;
    const ox = BX + Math.cos(angle) * orbitR + mx * dep * 40;
    const oy = WY - WR * 0.8 + Math.sin(angle) * orbitR * 0.55 + my * dep * 20;
    sh(ctx, d.accent, sz * 0.4);
    ctx.fillStyle = `rgba(${ar},${ag},${ab},0.12)`;
    ctx.beginPath(); ctx.arc(ox, oy, sz * 0.95, 0, Math.PI * 2); ctx.fill();
    noSh(ctx);
    drawFoodIcon(ctx, type, ox, oy, sz, d.accent);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `500 ${sz * 0.48}px Oswald,sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(type === "chai" ? "CHAI" : type === "kebab" ? "BBQ" : type === "flame" ? "FIRE" : "INDIA", ox, oy + sz * 1.05);
  });
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

  const brandPulse = 1 + 0.02 * Math.sin(t * 1.4);
  ctx.save(); ctx.translate(W * 0.5, H * 0.11); ctx.scale(brandPulse, brandPulse);
  sh(ctx, d.accent, s * 0.04);
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${s * 0.1}px 'Saira Stencil One',sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(d.headline || "BBQ RIDE", 0, 0); noSh(ctx);
  ctx.restore();

  ctx.save(); ctx.translate(W * 0.5, H * 0.195);
  sh(ctx, d.accent, s * 0.025);
  ctx.fillStyle = d.accent;
  ctx.font = `700 ${s * 0.062}px Oswald,sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("INDIA", 0, 0); noSh(ctx);
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `400 ${s * 0.028}px Oswald,sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(d.sub || "Fuel Your Ride. Fire Your Taste.", W * 0.5, H * 0.25);

  if (d.price && d.price !== "₹99") {
    const prPulse = 1 + 0.04 * Math.sin(t * 2.6);
    ctx.save(); ctx.translate(W * 0.86, H * 0.88); ctx.scale(prPulse, prPulse);
    sh(ctx, "rgba(0,0,0,0.5)", s * 0.04);
    ctx.fillStyle = d.accent; rr(ctx, -s * 0.12, -s * 0.062, s * 0.24, s * 0.124, s * 0.03); ctx.fill(); noSh(ctx);
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${s * 0.065}px 'Saira Stencil One',sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(d.price, 0, 0); ctx.restore();
  }

  ctx.fillStyle = `rgba(${ar},${ag},${ab},0.8)`;
  ctx.font = `400 ${s * 0.028}px Oswald,sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText(d.cta || "", W * 0.5, H * 0.97);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

/* ── 6. MANGA PANEL ─────────────────────────────────────────── */
function drawMangaPanel(ctx, t, W, H, sceneImg, _opts) {
  const s = Math.min(W, H);
  // 12fps staccato: integer frame index, changes position jitter
  const step = Math.floor(t * 12);
  const jit = (seed, amp) =>
    Math.sin(step * 7.31 + seed * 3.17) * amp;

  // 1. Cream/paper background
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, W, H);

  // 2. Halftone dots
  const ds = s * 0.038;
  const dr = ds * 0.19;
  ctx.fillStyle = "rgba(0,0,0,0.055)";
  for (let row = 0, y = 0; y < H + ds; y += ds, row++) {
    for (let x = (row % 2) * ds * 0.5; x < W + ds; x += ds) {
      ctx.beginPath();
      ctx.arc(x, y, dr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Speed lines from focal point (upper-right-ish)
  const FX = W * 0.56 + jit(1, W * 0.008);
  const FY = H * 0.42 + jit(2, H * 0.006);
  const lineCount = 40;
  ctx.save();
  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2;
    const thick = i % 4 === 0;
    ctx.lineWidth = thick ? s * 0.003 : s * 0.001;
    ctx.globalAlpha = thick ? 0.18 : 0.09;
    ctx.strokeStyle = "#111";
    const dist = Math.max(W, H) * 1.5;
    ctx.beginPath();
    ctx.moveTo(FX, FY);
    ctx.lineTo(FX + Math.cos(angle) * dist, FY + Math.sin(angle) * dist);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Main scene panel — manga-ink filtered scene snapshot
  const pw = W * 0.84, ph = H * 0.56;
  const pcx = W * 0.5 + jit(3, W * 0.003);
  const pcy = H * 0.43 + jit(4, H * 0.003);
  const pRot = jit(5, 0.009);
  ctx.save();
  ctx.translate(pcx, pcy);
  ctx.rotate(pRot);
  // Clip to panel rectangle
  ctx.save();
  ctx.beginPath();
  ctx.rect(-pw / 2, -ph / 2, pw, ph);
  ctx.clip();
  if (sceneImg) {
    // Manga-ink look: grayscale + high contrast base
    ctx.filter = "grayscale(1) contrast(1.8) brightness(1.08)";
    ctx.drawImage(sceneImg, -pw / 2, -ph / 2, pw, ph);
    // Edge ink layer: very high contrast overlay in multiply
    ctx.globalCompositeOperation = "multiply";
    ctx.filter = "grayscale(1) contrast(9) brightness(1.5)";
    ctx.globalAlpha = 0.45;
    ctx.drawImage(sceneImg, -pw / 2, -ph / 2, pw, ph);
  } else {
    // Placeholder if no scene loaded yet
    ctx.fillStyle = "#ddd";
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  }
  ctx.restore(); // remove clip
  // Panel border
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.lineWidth = s * 0.013;
  ctx.strokeStyle = "#111";
  ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
  ctx.restore();

  // 5. Small accent panel — bottom right corner, slight tilt
  const ap = { w: W * 0.29, h: H * 0.16 };
  const acx = W * 0.8 + jit(6, W * 0.005);
  const acy = H * 0.8 + jit(7, H * 0.005);
  ctx.save();
  ctx.translate(acx, acy);
  ctx.rotate(0.035 + jit(8, 0.012));
  ctx.fillStyle = "rgba(224,90,26,0.18)";
  ctx.fillRect(-ap.w / 2, -ap.h / 2, ap.w, ap.h);
  ctx.lineWidth = s * 0.009;
  ctx.strokeStyle = "#111";
  ctx.strokeRect(-ap.w / 2, -ap.h / 2, ap.w, ap.h);
  ctx.restore();

  // 6. Impact sound word — rotates every ~0.8 s
  const SOUNDS = ["ドカーン!", "ガシャン!", "CRASH!", "SIZZLE!", "ズドン!", "BAM!"];
  const sound = SOUNDS[Math.floor(t * 1.25) % SOUNDS.length];
  const sfx = s * 0.11;
  const stx = W * 0.25 + jit(9, W * 0.012);
  const sty = H * 0.82 + jit(10, H * 0.008);
  ctx.save();
  ctx.translate(stx, sty);
  ctx.rotate(-0.07 + jit(11, 0.03));
  ctx.font = `900 ${sfx}px Oswald, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = sfx * 0.2;
  ctx.strokeStyle = "#111";
  ctx.lineJoin = "round";
  ctx.strokeText(sound, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.fillText(sound, 0, 0);
  ctx.restore();

  // 7. Top black banner — brand name
  const bh = H * 0.09;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, bh);
  ctx.font = `700 ${bh * 0.52}px Oswald, sans-serif`;
  ctx.fillStyle = "#e05a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BBQ RIDE INDIA", W / 2, bh / 2);

  // 8. Full-frame ink border
  const bw = s * 0.016;
  ctx.lineWidth = bw;
  ctx.strokeStyle = "#111";
  ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
}

/* ── GIF export ─────────────────────────────────────────── */
function loadGifJs() {
  return new Promise(res=>{
    if(window.GIF){res();return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js";
    s.onload=res; document.head.appendChild(s);
  });
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function BrandArt() {
  const [art, setArt]         = useState("steam");
  const [ratio, setRatio]     = useState("1:1");
  const [paletteId, setPalId] = useState("fire");
  const [headline, setHL]     = useState("");
  const [sub, setSub]         = useState("");
  const [price, setPrice]     = useState("₹99");
  const [cta, setCta]         = useState("");
  const [date, setDate]       = useState("12 Nov · 7 PM");
  const [spec1, setS1]        = useState("100% Halal");
  const [spec2, setS2]        = useState("Chef's Pick");
  const [spec3, setS3]        = useState("Fresh Daily");
  const [neon1, setN1]        = useState("BBQ");
  const [neon2, setN2]        = useState("OPEN");
  const [neon3, setN3]        = useState("HOT");
  const [ing1, setI1]         = useState("Chicken");
  const [ing2, setI2]         = useState("Spices");
  const [gifBusy, setGifBusy] = useState(false);
  const [gifProg, setGifProg] = useState(0);

  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const rafRef       = useRef(null);
  const tRef         = useRef(0);
  const lastTsRef    = useRef(null);
  const mouseRef     = useRef({x:0,y:0});
  const smoothRef    = useRef({x:0,y:0});

  const palette = PALETTES.find(p=>p.id===paletteId)||PALETTES[0];

  const getData = useCallback(() => ({
    accent:palette.accent, dark:palette.dark, mid:palette.mid,
    headline, sub, price, cta, date, spec1, spec2, spec3, neon1, neon2, neon3, ing1, ing2,
  }), [palette, headline, sub, price, cta, date, spec1, spec2, spec3, neon1, neon2, neon3, ing1, ing2]);

  const drawFrame = useCallback((canvas, t2, W, H, mx2, my2) => {
    const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,W,H);
    const d=getData();
    if(art==="steam")   drawSteam(ctx,W,H,t2,mx2,my2,d);
    if(art==="diorama") drawDiorama(ctx,W,H,t2,mx2,my2,d);
    if(art==="window")  drawWindow(ctx,W,H,t2,mx2,my2,d);
    if(art==="pulse")   drawPulse(ctx,W,H,t2,mx2,my2,d);
    if(art==="bike")    drawBikeHero(ctx,W,H,t2,mx2,my2,d);
    if(art==="manga")   drawMangaPanel(ctx,t2,W,H,null,d);
  }, [art, getData]);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const {w,h}=SIZES[ratio]; canvas.width=w; canvas.height=h;
    tRef.current=0; lastTsRef.current=null;
    let stopped=false;
    const loop=(ts)=>{
      if(stopped) return;
      if(lastTsRef.current!==null) tRef.current=(tRef.current+(ts-lastTsRef.current)/1000)%8;
      lastTsRef.current=ts;
      const sm=smoothRef.current, m=mouseRef.current;
      sm.x+=(m.x-sm.x)*.06; sm.y+=(m.y-sm.y)*.06;
      const{w:W,h:H}=SIZES[ratio];
      drawFrame(canvas,tRef.current,W,H,sm.x,sm.y);
      rafRef.current=requestAnimationFrame(loop);
    };
    document.fonts.ready.then(()=>{ if(!stopped) rafRef.current=requestAnimationFrame(loop); });
    return()=>{ stopped=true; cancelAnimationFrame(rafRef.current); };
  }, [ratio, drawFrame]);

  const onMouseMove=(e)=>{
    const el=containerRef.current; if(!el) return;
    const r=el.getBoundingClientRect();
    mouseRef.current={ x:(e.clientX-r.left)/r.width-.5, y:(e.clientY-r.top)/r.height-.5 };
  };

  const downloadPng=()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const a=document.createElement("a"); a.href=canvas.toDataURL("image/png");
    a.download=`art-${art}-${ratio.replace(":","x")}.png`; a.click();
  };

  const downloadGif=async()=>{
    if(gifBusy) return; setGifBusy(true); setGifProg(0);
    await loadGifJs();
    const{w,h}=SIZES[ratio];
    const off=document.createElement("canvas");
    off.width=Math.round(w*.5); off.height=Math.round(h*.5);
    const FRAMES=20, DELAY=100;
    const gif=new window.GIF({workers:2,quality:8,width:off.width,height:off.height});
    const ctx2=off.getContext("2d");
    for(let f=0;f<FRAMES;f++){
      const ft=(f/FRAMES)*8;
      const tmp=document.createElement("canvas"); tmp.width=w; tmp.height=h;
      drawFrame(tmp,ft,w,h,0,0);
      ctx2.clearRect(0,0,off.width,off.height);
      ctx2.drawImage(tmp,0,0,off.width,off.height);
      gif.addFrame(ctx2,{copy:true,delay:DELAY});
      setGifProg(Math.round((f/FRAMES)*85));
    }
    gif.on("finished",blob=>{
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
      a.download=`art-${art}-${ratio.replace(":","x")}.gif`; a.click();
      setGifBusy(false); setGifProg(0);
    });
    gif.on("progress",p=>setGifProg(85+Math.round(p*15)));
    gif.render();
  };

  const {w,h}=SIZES[ratio];

  const extraControls = {
    steam: (
      <>
        <label className="sos2-posts-field"><span>Ingredient 1</span><input value={ing1} onChange={e=>setI1(e.target.value)}/></label>
        <label className="sos2-posts-field"><span>Ingredient 2</span><input value={ing2} onChange={e=>setI2(e.target.value)}/></label>
      </>
    ),
    diorama: (
      <>
        <label className="sos2-posts-field"><span>Badge 1</span><input value={spec1} onChange={e=>setS1(e.target.value)}/></label>
        <label className="sos2-posts-field"><span>Badge 2</span><input value={spec2} onChange={e=>setS2(e.target.value)}/></label>
        <label className="sos2-posts-field"><span>Badge 3</span><input value={spec3} onChange={e=>setS3(e.target.value)}/></label>
      </>
    ),
    window: (
      <>
        <label className="sos2-posts-field"><span>Sign 1</span><input value={neon1} onChange={e=>setN1(e.target.value)}/></label>
        <label className="sos2-posts-field"><span>Sign 2</span><input value={neon2} onChange={e=>setN2(e.target.value)}/></label>
        <label className="sos2-posts-field"><span>Sign 3</span><input value={neon3} onChange={e=>setN3(e.target.value)}/></label>
      </>
    ),
    pulse: (
      <label className="sos2-posts-field"><span>Date / Time</span><input value={date} onChange={e=>setDate(e.target.value)}/></label>
    ),
    bike: null,
    manga: null,
  };

  useEffect(() => {
    if (art === "bike" && headline === "") setHL("BBQ RIDE");
  }, [art]);

  return (
    <div className="sos2-posts sos2-art">
      <div className="sos2-posts-tabs">
        {ARTS.map(a=>(
          <button key={a.id} className={`sos2-posts-tab${art===a.id?" active":""}`} onClick={()=>setArt(a.id)}>{a.label}</button>
        ))}
      </div>

      <div ref={containerRef} className="sos2-posts-preview-wrap"
        style={{aspectRatio:`${w}/${h}`}}
        onMouseMove={onMouseMove} onMouseLeave={()=>{ mouseRef.current={x:0,y:0}; }}>
        <canvas ref={canvasRef} className="sos2-posts-canvas" />
      </div>

      <div className="sos2-posts-row">
        {Object.entries(SIZES).map(([k])=>(
          <button key={k} className={`sos2-posts-chip${ratio===k?" active":""}`} onClick={()=>setRatio(k)}>{k}</button>
        ))}
      </div>
      <div className="sos2-posts-row" style={{flexWrap:"wrap"}}>
        {PALETTES.map(p=>(
          <button key={p.id} className={`sos2-posts-pal${paletteId===p.id?" active":""}`}
            style={{"--pal":p.accent}} onClick={()=>setPalId(p.id)} title={p.name}>
            <span style={{background:p.accent}}/>
          </button>
        ))}
      </div>

      <label className="sos2-posts-field"><span>Headline</span>
        <input value={headline} onChange={e=>setHL(e.target.value)} placeholder={art==="pulse"?"GRAND OPENING":"TODAY'S SPECIAL"}/>
      </label>
      <label className="sos2-posts-field"><span>Sub</span>
        <input value={sub} onChange={e=>setSub(e.target.value)} placeholder="Tagline or venue"/>
      </label>
      {art!=="pulse" && (
        <label className="sos2-posts-field"><span>Price</span>
          <input value={price} onChange={e=>setPrice(e.target.value)}/>
        </label>
      )}
      <label className="sos2-posts-field"><span>CTA / Phone</span>
        <input value={cta} onChange={e=>setCta(e.target.value)} placeholder="Order Now · 9876543210"/>
      </label>
      {extraControls[art]}

      <div className="sos2-posts-row">
        <button className="sos2-posts-dl" onClick={downloadPng}>↓ PNG</button>
        <button className="sos2-posts-dl sos2-posts-dl-gif" onClick={downloadGif} disabled={gifBusy}>
          {gifBusy?`GIF ${gifProg}%`:"↓ GIF"}
        </button>
      </div>
    </div>
  );
}
