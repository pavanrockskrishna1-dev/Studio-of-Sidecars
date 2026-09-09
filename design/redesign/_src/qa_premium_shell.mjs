import { chromium } from 'playwright-core';
import fs from 'fs';
const exe='/usr/bin/chromium';
const file='file:///home/user/design/redesign/studio_sidecars_premium_finish.html';
const OUT='/home/user/design/redesign/exports';
fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:exe,args:['--enable-unsafe-swiftshader','--no-sandbox']});
async function open(vp,opts={}){
  const p=await b.newPage({viewport:vp}); const errs=[];
  p.on('pageerror',e=>errs.push('PE:'+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CE:'+m.text());});
  await p.goto(file,{waitUntil:'load'}); await p.waitForTimeout(400);
  if(opts.tray){ await p.evaluate(id=>{const r=document.getElementById(id);if(r){r.checked=true;}},opts.tray); await p.waitForTimeout(600);}
  return {p,errs};
}
async function audit(p){
  return await p.evaluate(()=>{
    const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+'@'+Math.round(r.x)+','+Math.round(r.y);};
    const cs=s=>{const e=document.querySelector(s);return e?getComputedStyle(e):null;};
    const t=document.body.innerText;
    const emo=[/☕/,/🎬/,/📲/,/🐍/,/🎥/,/🧰/,/🎨/,/🌆/,/🌇/,/🛵/,/💡/,/🚲/,/🪑/,/🔒/,/⬇/,/★/,/📂/];
    return {ovf:document.documentElement.scrollWidth>innerWidth+1,
      emojiLeft:emo.filter(r=>r.test(t)).map(r=>r.source),
      logoIsSvg:!!(document.querySelector('#soLogo svg')),
      vtSvg:!!document.querySelector('.vrow .vt svg'),
      tileSvg:!!document.querySelector('#sideNav .tt-ic svg'),
      mono:document.querySelector('.proj-th i.mono')?document.querySelector('.proj-th i.mono').textContent:null,
      tagStar:!!document.querySelector('.tag svg'), lockSvg:!!document.querySelector('.lock svg'),
      side:q('#sideNav'), insp:q('aside.inspector'), dock:q('#dock'), topbar:q('#topbar'), canvas:q('.canvas'),
      topbarH:Math.round(document.querySelector('#topStrip').getBoundingClientRect().height),
      exportBg:cs('#tbExport').backgroundColor, canvasRadius:cs('.canvas').borderRadius,
      chipH:Math.round(document.querySelector('.vchip.on').getBoundingClientRect().height),
      selectedTray: (()=>{const vis=[...document.querySelectorAll('.tray')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.className);return vis;})() };
  });
}
const A={};
{ const {p,errs}=await open({width:1440,height:900});
  A.desk=await audit(p);
  await p.screenshot({path:OUT+'/premium_finish_desktop_1440x900.png'});
  const trayDock=await p.evaluate(()=>{const r=document.querySelector('.dk-btn[for=tlRender]'); return r?getComputedStyle(r).backgroundColor:null;});
  await p.close(); }
{ const {p,errs}=await open({width:1440,height:900},{tray:'tlRender'});
  A.deskTray=await audit(p);
  await p.screenshot({path:OUT+'/premium_finish_desktop_tray_render_1440x900.png'});
  await p.close(); }
{ const {p,errs}=await open({width:1194,height:834});
  A.tabl=await audit(p);
  await p.screenshot({path:OUT+'/premium_finish_honorpad_landscape_1194x834.png'});
  await p.close(); }
{ const {p,errs}=await open({width:834,height:1112});
  A.tabp=await audit(p);
  await p.screenshot({path:OUT+'/premium_finish_honorpad_portrait_834x1112.png'});
  await p.close(); }
await b.close();
console.log(JSON.stringify(A,null,1));
