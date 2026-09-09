import { chromium } from 'playwright-core';
import fs from 'fs';
const exe='/usr/bin/chromium';
const STATIC='file:///home/user/design/redesign/studio_sidecars_premium_finish.html';
const LIVE='file:///home/user/design/redesign/studio_sidecars_cinematic.html';
const OUT='/home/user/design/redesign/exports/premium_screens';
fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:exe,args:['--enable-unsafe-swiftshader','--no-sandbox']});
const errs=[];
function page(vp){ return b.newPage({viewport:vp}); }

// ---------- 1 · HOME STUDIO (static skin, sidecar centred in Hero loft) ----------
{ const p=await page({width:1440,height:900});
  p.on('pageerror',e=>errs.push('home:'+e.message));
  await p.goto(STATIC,{waitUntil:'load'}); await p.waitForTimeout(900);
  await p.screenshot({path:OUT+'/screen_01_home_studio.png'});
  await p.close(); }

// ---------- 2 · ENVIRONMENT LIBRARY (Hero + 10 cards) ----------
{ const p=await page({width:1440,height:900});
  p.on('pageerror',e=>errs.push('env:'+e.message));
  await p.goto(LIVE,{waitUntil:'load'}); await p.waitForTimeout(2000); // splash+boot
  await p.click('.p2-envtoggle'); await p.waitForTimeout(800);
  const n=await p.evaluate(()=>document.querySelectorAll('.p2-envcard').length);
  await p.screenshot({path:OUT+'/screen_02_environment_library.png'});
  await p.close(); console.log('env cards:',n); }

// ---------- 3 · TOOL PANELS  Camera / Lighting / Materials / Floor ----------
async function toolPanel(id,radioname,shot){
  const p=await page({width:1440,height:900});
  p.on('pageerror',e=>errs.push(radioname+':'+e.message));
  await p.goto(STATIC,{waitUntil:'load'}); await p.waitForTimeout(700);
  await p.evaluate(id=>{const r=document.getElementById(id); if(r){r.checked=true;}},id);
  await p.waitForTimeout(700);
  await p.screenshot({path:OUT+'/'+shot});
  const state=await p.evaluate(()=>[...document.querySelectorAll('.tray')].filter(t=>getComputedStyle(t).display!=='none').map(t=>t.className));
  await p.close(); console.log(radioname,'tray:',state);
}
await toolPanel('tlCam','camera','screen_03a_camera_panel.png');
await toolPanel('tlLight','lighting','screen_03b_lighting_panel.png');
await toolPanel('tlMat','materials','screen_03c_materials_panel.png');
await toolPanel('tlFloor','floor','screen_03d_floor_panel.png');

// ---------- 4 · LEARN STUDIO onboarding (tooltip spotlight) ----------
{ const p=await page({width:1440,height:900});
  p.on('pageerror',e=>errs.push('learn:'+e.message));
  await p.goto(LIVE,{waitUntil:'load'}); await p.waitForTimeout(2000);
  await p.click('#tbLearn'); await p.waitForTimeout(600);
  // advance to the "Creator dock" tooltip step (8 Nexts from welcome)
  for(let i=0;i<7;i++){ await p.click('#p2Next'); await p.waitForTimeout(280); }
  await p.screenshot({path:OUT+'/screen_04_learn_studio_tooltips.png'});
  const step=await p.evaluate(()=>document.querySelector('.p2-guidecard h3')?document.querySelector('.p2-guidecard h3').textContent:null);
  console.log('learn step shown:',step);
  await p.close(); }

await b.close();
console.log('errors:',errs.length?errs:'NONE');
console.log('screens saved to',OUT);
