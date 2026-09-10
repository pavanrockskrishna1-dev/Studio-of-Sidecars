/* ================================================================
   PHASE 2 · INTERACTION & MOTION ENGINE — Studio of Sidecars
   Modules: 2.1 camera · 2.2 env switcher · 2.3 materials ·
            2.4 lighting · 2.5 learn/onboarding · 2.6 motion polish ·
            2.7 render presets + export workflow
   Layer only. Does not alter the locked Phase-1 chrome or assets.
   ================================================================ */
(function(){
'use strict';
const $=(s,c)=> (c||document).querySelector(s);
const $$=(s,c)=> Array.prototype.slice.call((c||document).querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease={'out':'cubic-bezier(.22,.8,.3,1)','spring':'cubic-bezier(.16,1.35,.3,1)','inout':'cubic-bezier(.65,.05,.36,1)'};
function ovShow(el){ if(!el) return; el.classList.add('open'); el.style.display='grid'; }
function ovHide(el){ if(!el) return; el.classList.remove('open'); el.style.display='none'; }
function camKey(t){ return {'Front':'Front','¾':'¾ hero','¾ hero':'¾ hero','Side':'Side','Detail':'Detail','Top':'Top','Orbit spin':'Orbit spin'}[t]||t; }
function canvasKey(t){ return {'9:16':'9:16 reel','9:16 reel':'9:16 reel','1:1':'1:1 square','1:1 square':'1:1 square','4:5':'4:5 story','4:5 story':'4:5 story','16:9':'16:9','Blender Cycles':'Blender Cycles'}[t]||null; }

/* ---------- environment registry (built at build time) ---------- */
const ENVS = __P2_ENVS__;

/* ---------- runtime module state ---------- */
const S={
  env: ENVS[0].id,
  envIdx:0,
  cam:'Front',
  light:'Softbox',
  mat:'Matte charcoal',
  render:'9:16 reel',
  guide:false,
};

/* ================= helpers: chip groups & trays ================= */
function setActive(el){
  if(!el) return;
  const group=el.closest('.tray-row')||el.closest('.row-chips')||el.closest('.tray');
  if(group) $$('.rchip,.pr-tile',group).forEach(c=>c.classList.remove('on'));
  if(el.classList.contains('pr-tile')) el.classList.add('on');
  else el.classList.add('on');
}
let quiet=false;
function toast(msg,ms){
  if(quiet) return;
  let t=$('.p2-toast'); if(!t){t=document.createElement('div');t.className='p2-toast';document.body.appendChild(t);}
  t.innerHTML='<span class="dot"></span>'+msg; t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'), ms||1800);
}

/* ================= 2.1 CAMERA PRESET LIBRARY ================= */
/* virtual framing applied to the environment stage layer (no engine yet):
   gentle scale + translate + micro parallax to preview each preset move */
const CAM_PRESETS={
  'Front':     {s:1.00,tx:0,    ty:0,   label:'Front · 24 mm' },
  '¾ hero':    {s:1.055,tx:-2.2,ty:-1.6,label:'¾ hero · 28 mm' },
  'Side':      {s:1.015,tx:-4.0,ty:0.4, label:'Side · profile' },
  'Detail':    {s:1.16, tx:3.0, ty:0.8, label:'Detail · 70 mm' },
  'Top':       {s:1.10, tx:0,   ty:-3.2,label:'Top · aerial' },
  'Orbit spin':{s:1.045,tx:0,   ty:-1,  label:'Orbit · auto spin' },
};
function applyCamera(name,flash){
  const p=CAM_PRESETS[name]; if(!p) return;
  S.cam=name;
  const fr=$('.p2s-frame'); const cur=$('#p2Cur');
  fr.classList.remove('p2-orbit'); fr.style.animation='';
  if(name==='Orbit spin'){
    fr.style.transform=''; fr.style.transition='none'; fr.classList.add('p2-orbit');
    cur&&cur.classList.remove('drift');
  } else {
    fr.style.transform='translate3d('+p.tx+'%, '+p.ty+'%,0) scale('+p.s+')';
    fr.style.transition='transform 1.1s '+ease.out;
    if(cur) cur.classList.remove('drift');
  }
  if(flash){
    document.body.classList.add('p2-cam');
    clearTimeout(applyCamera._fh);
    applyCamera._fh=setTimeout(()=>document.body.classList.remove('p2-cam'),1600);
  }
  $('.p2-camframe .cl') && ($('.p2-camframe .cl').textContent=p.label);
  $('.cv-status .pill.on') && ($('.cv-status .pill.on').textContent='CAM · '+name);
  if(S.guide&&!flash) toast('Camera preset · '+name);
}

/* ================= 2.2 ENVIRONMENT SWITCHER =================
   switches the full-bleed Studio Background behind the chrome */
function showEnvBar(open){
  document.body.classList.toggle('p2-envs',!!open);
  if(open){ $('.p2-envrow').scrollLeft=0; }
}
function buildEnvBar(){
  if($('.p2-envbar')) return;
  const bar=document.createElement('div'); bar.className='p2-envbar';
  bar.innerHTML='<div class="p2-envhead"><b>Studio Backgrounds</b><i id="p2EnvSub">Assets → Studio Backgrounds</i><span class="sp"></span><button id="p2EnvClose" type="button" title="Close">✕</button></div><div class="p2-envrow"></div>';
  const row=bar.querySelector('.p2-envrow');
  ENVS.forEach((e,i)=>{
    const c=document.createElement('div'); c.className='p2-envcard'+(i===S.envIdx?' on':'');
    c.innerHTML='<img class="th" alt="" src="'+e.src+'"><div class="meta"><b>'+e.name+'</b><i>'+e.mood+'</i></div><span class="ap">APPLY</span>';
    c.addEventListener('click',()=>setEnv(i,c));
    row.appendChild(c);
  });
  bar.querySelector('#p2EnvClose').addEventListener('click',()=>showEnvBar(false));
  document.querySelector('.canvas').appendChild(bar);
  const pill=document.createElement('button'); pill.className='p2-envtoggle'; pill.type='button';
  pill.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4" width="17" height="12.5" rx="2.6"/><circle cx="12" cy="10" r="2.2"/><path d="M3.5 16.5 9 11l4.5 4.4 2-2 5 4.6"/></svg><span class="lbl">Studio Backgrounds</span>';
  pill.addEventListener('click',()=>showEnvBar(!document.body.classList.contains('p2-envs')));
  document.querySelector('.canvas').appendChild(pill);
}
function setEnv(i,card){
  const prev=S.envIdx; S.envIdx=i; S.env=ENVS[i].id;
  const cur=$('#p2Cur'), nxt=$('#p2Prev');
  if(i===prev){ document.body.classList.add('p2-guide'); return; }
  nxt.src=ENVS[i].src;
  nxt.style.opacity='1';
  nxt.style.transform='scale(1.02)';
  // reflection sweep + re-apply camera framing on incoming layer
  document.querySelector('.canvas').classList.add('on-switch');
  requestAnimationFrame(()=>{ nxt.style.transform='scale(1)'; });
  $$('.p2-envcard').forEach((c,k)=>c.classList.toggle('on',k===i));
  $('#p2EnvSub').textContent=ENVS[i].mood;
  $('.cv-legend > div:first-child') && ($('.cv-legend > div:first-child').textContent=ENVS[i].name.toUpperCase()+' · STUDIO BACKGROUND');
  setTimeout(()=>{
    const tmp=cur.src; cur.src=nxt.src; nxt.src=tmp;
    nxt.style.opacity='0'; nxt.style.transform='scale(1.001)';
    document.querySelector('.canvas').classList.remove('on-switch');
    const pf=CAM_PRESETS[S.cam]; const fr=$('.p2s-frame');
    fr.style.transform='translate3d('+(pf?pf.tx:0)+'%, '+(pf?pf.ty:0)+'%,0) scale('+(pf?pf.s:1)+')';
  }, 900);
  toast('Applied · '+ENVS[i].name);
}

/* ================= 2.4 LIGHTING PRESETS ================= */
const LIGHT_PRESETS={
  'Softbox':    {tint:'rgba(255,255,255,.05)', color:'rgba(190,215,255,.05)', rim:0,  beam:0.16, sat:1 },
  'Café window':{tint:'rgba(255,200,120,.07)', color:'rgba(255,180,90,.06)',  rim:0,  beam:0.10, sat:1 },
  'Golden hour':{tint:'rgba(255,150,40,.10)',  color:'rgba(255,140,30,.10)',  rim:0,  beam:0.10, sat:1.02 },
  'Night neon': {tint:'rgba(10,20,60,.30)',    color:'rgba(90,90,255,.10)',   rim:0.9,beam:0.06, sat:1.08 },
  'Backlit rim':{tint:'rgba(255,255,255,.03)', color:'rgba(150,190,255,.07)', rim:1,  beam:0.20, sat:1 },
};
const LIGHT_HEX={
  'Warm':'rgba(255,168,90,.08)','Cool':'rgba(120,170,255,.08)','Neutral':'rgba(220,228,240,.05)'
};
function applyLight(name){
  S.light=name;
  const L=LIGHT_PRESETS[name];
  const ck=L?L:Object.assign({},LIGHT_PRESETS['Softbox']);
  const st=$('.p2s-tint'), cc=$('.p2s-color'), rm=$('.p2s-rim'), bm=$('.p2s-beam');
  if(name==='Warm'||name==='Cool'||name==='Neutral'){ st.style.background=LIGHT_HEX[name]; st.style.opacity='.55'; }
  else { st.style.background=ck.tint; st.style.opacity= ck.tint==='rgba(255,255,255,0)'?'0':'.8'; }
  cc.style.background=ck.color; cc.style.opacity='.6';
  rm.style.opacity=ck.rim; bm.style.opacity=ck.beam;
  toast('Lighting · '+name);
}

/* ================= 2.3 MATERIAL / FINISH INTERACTIONS ================= */
const MAT_FINISH={
  'Matte charcoal':{c:'#8b93a1', sw:'linear-gradient(150deg,#3a3f47,#14161a)', tint:'rgba(150,160,175,.04)'},
  'Brushed metal': {c:'#c3cad4', sw:'linear-gradient(150deg,#c9ced6,#6e7682)', tint:'rgba(190,200,215,.05)'},
  'Porcelain':     {c:'#efe9db', sw:'linear-gradient(150deg,#f6f3ea,#c9c4b6)', tint:'rgba(245,242,232,.05)'},
  'Copper':        {c:'#d29666', sw:'linear-gradient(150deg,#c98a5a,#7a4a2a)', tint:'rgba(215,150,95,.07)'},
  'Gloss black':   {c:'#3a3e47', sw:'linear-gradient(150deg,#2a2d33,#05060a)', tint:'rgba(20,26,34,.06)'},
};
function applyMat(name,part){
  S.mat=name;
  const f=MAT_FINISH[name]||MAT_FINISH['Matte charcoal'];
  const orb=$('.p2-slot');
  if(orb){
    orb.style.setProperty('--p2-mat-c',f.c);
    orb.classList.add('flash');
    clearTimeout(applyMat._fh);
    applyMat._fh=setTimeout(()=>{ orb.classList.remove('flash'); },1700);
  }
  // inspector material rows sync active
  $$('.mat-row').forEach(r=>{
    const hit=(part && r.textContent.toLowerCase().indexOf(part.toLowerCase())>=0) || (name.toLowerCase().indexOf(r.textContent.toLowerCase().trim())>=0);
    r.classList.toggle('on',hit);
  });
  toast((part?'Finish on '+part+' · ':'Finish · ')+name);
}

/* ================= 2.7 RENDER PRESETS + EXPORT ================= */
const RENDER_FORMATS={
  '9:16 reel':{ar:'9/16', wh:'1080 × 1920', frame:'tall'},
  '1:1 square':{ar:'1/1', wh:'1080 × 1080', frame:'square'},
  '4:5 story':{ar:'4/5', wh:'1080 × 1350', frame:'portrait'},
  '16:9':{ar:'16/9', wh:'1920 × 1080', frame:'wide'},
  'Blender Cycles':{ar:'16/9', wh:'4K · Cycles', frame:'wide'},
};
function applyRender(name,withSafe){
  S.render=name;
  const f=RENDER_FORMATS[name]||RENDER_FORMATS['9:16 reel'];
  const rs=$('.p2-rsafe .box');
  const cv=$('.canvas');
  if(name.indexOf('Blender')<0){
    if(withSafe){
      document.body.classList.add('p2-rsafe-on');
      const cvw=cv.clientWidth||1200, cvh=cv.clientHeight||800;
      const [arW,arH]=f.ar.split('/').map(Number);
      let w=Math.min(cvw*0.92, cvh*0.92*(arW/arH));
      if(arW<arH){ w=Math.min(cvw*0.30, cvh*0.8*(arW/arH)); }
      const h=w*(arH/arW);
      rs.style.width=Math.round(w)+'px'; rs.style.height=Math.round(h)+'px';
    }
  } else {
    document.body.classList.remove('p2-rsafe-on');
  }
  $('.cv-status .pill.on') && ($('.cv-status .pill.on').textContent=f.wh);
  $('.p2-camframe .cl') && ($('.p2-camframe .cl').textContent=f.wh+' · '+name);
  toast('Output · '+name+'  ('+f.wh+')');
}
/* export workflow modal */
function openExport(){
  const ov=$('#sosOv'); ovShow(ov);
  ov.innerHTML='<div class="p2-modal" id="p2ExportModal"></div>';
  const m=$('#p2ExportModal');
  m.innerHTML='<div class="ic">📦</div><h3>Export render pack</h3><p>Preparing reel, story, square + transparent PNG&nbsp;cut-out…</p>'+
    '<div class="p2-export-row">'+
    '<div class="er" data-step="0"><span class="st"></span><b>Compositing '+ENVS[S.envIdx].name+'</b><em></em></div>'+
    '<div class="er" data-step="1"><span class="st"></span><b>'+S.render+' · '+RENDER_FORMATS[S.render].wh+'</b><em></em></div>'+
    '<div class="er" data-step="2"><span class="st"></span><b>Brand kit · watermark</b><em></em></div>'+
    '<div class="er" data-step="3"><span class="st"></span><b>GLB / Blender Cycles pack</b><em></em></div>'+
    '</div><div class="fine">Offline · this device</div><button class="cta" id="p2ExpClose" type="button" disabled>Exporting…</button>';
  const rows=$$('.er',m); let i=0;
  const iv=setInterval(()=>{
    if(i>=rows.length){ clearInterval(iv); finishExport(); return; }
    rows[i].classList.add('done'); rows[i].querySelector('.st').textContent='✓';
    const em=rows[i].querySelector('em'); if(em){em.style.cssText='display:inline-block;width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;animation:p2-spin .7s linear infinite';}
    i++;
  },520);
  function spinKey(){ const st=document.createElement('style'); st.textContent='@keyframes p2-spin{to{transform:rotate(360deg)}}'; document.head.appendChild(st);} spinKey();
  function finishExport(){
    m.querySelector('.ic').textContent='✅';
    m.querySelector('h3').textContent='Export complete';
    m.querySelector('p').textContent='Reel, story, square, transparent PNG cut-out and GLB pack saved to this device.';
    m.querySelector('.fine').textContent='so_'+S.env+'_'+S.cam.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'_pack';
    const b=$('#p2ExpClose'); b.disabled=false; b.textContent='Done';
    b.addEventListener('click',()=>ovHide(ov));
    const sv=$('#saveOv'); ovShow(sv);
    sv.innerHTML='<div class="p2-modal" style="max-width:300px"><h3 style="font-size:16px">💾 Saved to this device</h3><p class="fine" style="margin-top:6px">Project snapshot + export pack</p></div>';
    setTimeout(()=>ovHide(sv),1400);
  }
}

/* ================= 2.5 LEARN STUDIO · ONBOARDING (V1–V6) ================= */
const STEPS=[
  {t:'Welcome to Studio of Sidecars',d:'A premium 3D creator studio. This guided tour covers the six workspaces and the core tools. Choose <b>V1–V6</b> in the top bar to switch workspaces at any time — your scene and edits are kept.',sel:'#topStrip',gap:40},
  {t:'V1 · Classic',d:'Clean, real-time showcase workspace for hero product shots.',sel:'.vchip[data-vid="classic"]',gap:20},
  {t:'V2 · Instagram Commercial',d:'The default workspace — 9:16 reel ready, cinematic lighting and one-tap presets.',sel:'.vchip[data-vid="commercial"]',gap:20},
  {t:'V3 · Blender Python',d:'Export an offline Cycles render pack (PNG + MP4 pipeline) with a single tap.',sel:'.vchip[data-vid="blender"]',gap:20},
  {t:'V4 · Creator Studio',d:'One-tap shot builder and playable reel workflow for creators.',sel:'.vchip[data-vid="creator"]',gap:20},
  {t:'V5 · Asset Library',d:'Tap-to-place embedded assets with search and favourites.',sel:'.vchip[data-vid="assetlib"]',gap:20},
  {t:'V6 · Brand Studio',d:'Brand kits, watermarking and the full Creator Hub for projects, presets and batch export.',sel:'.vchip[data-vid="brandstudio"]',gap:20},
  {t:'The stage & environment',d:'This is the live studio background. Use <b>Studio Backgrounds</b> to switch between the 10 premium environments — only the background changes.',sel:'.canvas',gap:70},
  {t:'Creator dock',d:'Select · Camera · Lighting · Materials · Floor · Render. Each opens a one-tap preset tray that animates in.',sel:'#dock',gap:40},
  {t:'Inspector',d:'Camera, Lighting, Materials and Render cards — exclusive accordion, one card at a time.',sel:'aside.inspector',gap:30},
  {t:'You’re ready',d:'Tap anywhere to begin. Reopen this tour anytime via <b>Learn Studio</b>.',sel:null,gap:40},
];
let stepIdx=0, guideActive=false;
function startTour(){
  if(guideActive) return; guideActive=true; stepIdx=0;
  const ov=$('#sosOv'); ovShow(ov);
  ov.innerHTML='<div class="p2-guide-dim"></div><div class="p2-guide" id="p2Guide"></div><div class="p2-guidecard"></div>';
  showStep();
}
function endTour(){ guideActive=false; const ov=$('#sosOv'); ovHide(ov); ov.innerHTML=''; }
function showStep(){
  const ov=$('#sosOv'); if(!ov) return;
  const s=STEPS[stepIdx];
  const card=ov.querySelector('.p2-guidecard');
  card.innerHTML='<div class="gt">'+(stepIdx===0?'LEARN STUDIO':'TOUR · '+(stepIdx)+' / '+(STEPS.length-1))+'</div><h3>'+s.t+'</h3><p>'+s.d+'</p>'+
    '<div class="p2-gnav"><div class="p2-gdots">'+STEPS.map((_,k)=>'<i class="'+(k===stepIdx?'on':'')+'"></i>').join('')+'</div>'+
    (stepIdx>0?'<button class="p2-gbtnghost" id="p2Prev">Back</button>':'')+
    (stepIdx<STEPS.length-1?'<button class="p2-gbtnghost" id="p2Skip">Skip</button><button class="p2-gbtn" id="p2Next">Next</button>':'<button class="p2-gbtn" id="p2Done">Start creating</button>')+
    '</div>';
  card.querySelector('#p2Prev')&&card.querySelector('#p2Prev').addEventListener('click',()=>{stepIdx--;showStep();});
  card.querySelector('#p2Skip')&&card.querySelector('#p2Skip').addEventListener('click',endTour);
  card.querySelector('#p2Next')&&card.querySelector('#p2Next').addEventListener('click',()=>{stepIdx++;showStep();});
  card.querySelector('#p2Done')&&card.querySelector('#p2Done').addEventListener('click',endTour);
  const g=$('#p2Guide');
  if(s.sel){
    const el=$(s.sel);
    if(el){ const r=el.getBoundingClientRect(); g.style.display='block';
      g.style.left=(r.left-(s.gap||20))+'px'; g.style.top=(r.top-(s.gap||20))+'px';
      g.style.width=(r.width+(s.gap||20)*2)+'px'; g.style.height=(r.height+(s.gap||20)*2)+'px';
    } else { g.style.display='none'; }
  } else { g.style.display='none'; }
}

/* ================= 2.6 MOTION POLISH / boot ================= */
function bootSplash(){
  const sp=$('#sosSplash'); ovShow(sp);
  sp.innerHTML='<div class="p2-splashcard"><div class="p2-logo">🎬</div><h2>Studio of Sidecars</h2><p>Opening workspace · V2 Instagram Commercial</p><div class="p2-bar"><i></i></div></div>';
  setTimeout(()=>{ ovHide(sp); },1200);
  setTimeout(()=>{ bootHint(); },1350);
}
function bootHint(){
  toast('Phase 2 · interaction preview — tap Studio Backgrounds',3200);
}

/* ================= wiring to the existing Phase-1 chrome ================= */
function wire(){
  buildEnvBar();
  const aside=$('aside.inspector')||document;
  const bind=(el,fn)=>{ el.addEventListener('click',()=>{ setActive(el); fn(el.textContent.trim()); }); };
  /* dock trays (static chip rows) */
  $$('.tray.t-cam .rchip').forEach(c=>c.addEventListener('click',()=>{ setActive(c); applyCamera(camKey(c.textContent.trim()),true); }));
  $$('.tray.t-light .rchip').forEach(c=>bind(c,applyLight));
  $$('.tray.t-mat .rchip').forEach(c=>bind(c,applyMat));
  $$('.tray.t-render .rchip').forEach(c=>bind(c,t=>applyRender(canvasKey(t)||t,false)));
  /* inspector exclusive chip groups: Framing / Colour / Canvas format */
  $$('.row-chips',aside).forEach(g=>{
    const prev=g.previousElementSibling;
    const lbl=prev&&prev.tagName==='LABEL'?prev.textContent.trim():'';
    if(lbl==='Framing') $$('.rchip',g).forEach(c=>c.addEventListener('click',()=>{ setActive(c); applyCamera(camKey(c.textContent.trim()),true); }));
    else if(lbl==='Colour') $$('.rchip',g).forEach(c=>bind(c,applyLight));
    else if(lbl==='Canvas format') $$('.rchip',g).forEach(c=>bind(c,t=>applyRender(canvasKey(t)||t,true)));
  });
  /* dock tool buttons -> toast describing the tool (native radios still switch the tray) */
  $$('.dk-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const forId=btn.getAttribute('for');
      const map={tlSelect:'Select · tap the stage to select parts (engine preview)',
                 tlCam:'Camera · one-tap framing', tlLight:'Lighting · one-tap looks',
                 tlMat:'Materials · quick finishes', tlFloor:'Floor · presets',
                 tlRender:'Render · one-tap output'};
      toast(map[forId]||'Tool',1200);
    });
  });
  /* top actions */
  $('#tbLearn')&&$('#tbLearn').addEventListener('click',startTour);
  $('#tbHelp')&&$('#tbHelp').addEventListener('click',startTour);
  $('#tbSettings')&&$('#tbSettings').addEventListener('click',()=>toast('Settings · engine-level (Phase 3)'));
  $('#tbExport')&&$('#tbExport').addEventListener('click',openExport);
  $('#btnDoExport')&&$('#btnDoExport').addEventListener('click',openExport);
  /* version chips -> active state + toast + legend */
  $$('.vchip').forEach(ch=>{
    ch.addEventListener('click',()=>{
      $$('.vchip').forEach(c=>c.classList.remove('on'));
      ch.classList.add('on');
      const lab=ch.querySelector('b')?ch.querySelector('b').textContent:ch.dataset.vid;
      toast('Workspace · '+lab);
      const tag=$('.cv-tag b'); if(tag) tag.textContent=(ch.querySelector('i').textContent+' · '+lab);
      $$('.vrow').forEach(r=>r.classList.remove('on'));
      const vr=$('.vrow[data-vid="'+ch.dataset.vid+'"]'); if(vr) vr.classList.add('on');
    });
  });
  /* asset-library sidebar: opening the Scenes group shows the environment switcher */
  const sceneGroup=$$('.group').find(g=>g.querySelector('#navScenes'));
  if(sceneGroup){
    const h=sceneGroup.querySelector('h3')||sceneGroup.querySelector('summary');
    if(h) h.addEventListener('click',()=>setTimeout(()=>{ if(document.body.classList.contains('side-open')) showEnvBar(true); },60));
  }
  /* Demo/Empty radio toggles: keep framing coherent */
  ['stDemo','stEmpty'].forEach(id=>{
    const r=document.getElementById(id); if(!r) return;
    r.addEventListener('change',()=>{ if(r.checked){ applyCamera(S.cam); if(id==='stEmpty') document.body.classList.remove('p2-rsafe-on'); } });
  });
  /* double-click the stage resets to the hero camera */
  const cv=$('.canvas'); if(cv){ cv.addEventListener('dblclick',()=>applyCamera('Front')); }
  /* gentle pointer parallax on the stage (desktop only) */
  const fr0=$('.p2s-frame'), par0=$('.p2s-par');
  const cv2=$('.canvas');
  if(cv2&&fr0&&par0&&matchMedia('(pointer:fine)').matches){
    // Do not enable parallax at boot. It is opt-in on actual pointer movement.
    let raf=null;
    cv2.addEventListener('pointermove',e=>{
      const r=cv2.getBoundingClientRect();
      const lx=(e.clientX-r.left-r.width/2)/(r.width/2), ly=(e.clientY-r.top-r.height/2)/(r.height/2);
      if(S.cam==='Orbit spin') return;
      // Background remains static; pointer movement must not shift the environment.
      if(raf) cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        par0.style.setProperty('--p2-px',(lx*-1.15).toFixed(3)+'%');
        par0.style.setProperty('--p2-py',(ly*-0.85).toFixed(3)+'%');
      });
    });
    cv2.addEventListener('pointerleave',()=>{
      if(raf) cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{ par0.style.setProperty('--p2-px','0%'); par0.style.setProperty('--p2-py','0%'); });
    });
  }
}

/* ================= boot ================= */
function boot(){
  /* prepare stage: replace demo layer children with the environment stage */
  const scene=$('.cv-scene');
  if(scene){
    scene.classList.add('p2s');
    scene.style.background='#07090d';
    scene.innerHTML=
      '<div class="p2s-frame">'+
        '<div class="p2s-par">'+
          '<img id="p2Cur" class="p2s-img" alt="Studio background">'+
          '<img id="p2Prev" class="p2s-img" alt="">'+
          '<div class="p2s-tint"></div><div class="p2s-color"></div>'+
          '<div class="p2s-rim"></div><div class="p2s-beam"></div>'+
          '<div class="p2s-sheen"></div>'+
        '</div>'+
        '<div class="p2s-vig"></div><div class="p2s-slot"></div>'+
      '</div>'+
      '<div class="p2-camframe"><div class="out" style="width:min(66%,780px);height:min(74%,600px)"><span class="cl" style="position:absolute;left:50%;top:calc(100% + 12px);transform:translateX(-50%);font:700 9px var(--font);letter-spacing:.18em;color:#bcd2f5;white-space:nowrap"></span></div></div>'+
      '<div class="p2-rsafe"><div class="box"></div></div>';
    const cur0=$('#p2Cur'); cur0.src=ENVS[0].src; cur0.classList.remove('drift');
  }
  wire();
  quiet=true;
  applyCamera('Front');
  applyLight('Softbox');
  applyRender(S.render,false);
  applyMat(S.mat);
  quiet=false;
  bootSplash();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
