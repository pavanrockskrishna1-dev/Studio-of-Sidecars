import { chromium } from 'playwright-core';
import fs from 'fs';
const exe='/usr/bin/chromium';
const file='file:///home/user/design/redesign/studio_sidecars_cinematic.html';
const OUT='/home/user/design/redesign/exports';
fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:exe,args:['--enable-unsafe-swiftshader','--no-sandbox']});

async function fresh(viewport){
  const p=await b.newPage({viewport}); const errs=[];
  p.on('pageerror',e=>errs.push('PE:'+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CE:'+m.text());});
  await p.goto(file,{waitUntil:'load'});
  await p.waitForTimeout(1900); // splash + boot
  return {p,errs};
}
function cs(p){ return p.evaluate(()=>{
  const $=(s)=>{const e=document.querySelector(s);return e?getComputedStyle(e):null;};
  const g=(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),b:Math.round(r.bottom)};};
  const bodyText=document.body.innerText;
  const emoji=[/☕/,/🎬/,/📲/,/🐍/,/🎥/,/🧰/,/🎨/,/🌆/,/🌇/,/🛵/,/💡/,/🚲/,/🪑/,/🔒/,/⬇/,/★/,/☀/];
  return {
    overflow: document.documentElement.scrollWidth>innerWidth+1,
    emojiLeft: emoji.filter(r=>r.test(bodyText)).map(r=>r.source),
    logoBg:$('#soLogo').backgroundImage,
    logoFont:$('#soLogo').fontSize,
    title:$('#soTitle').fontSize,
    brandColor:$('#soTitle').color,
    primaryBg:$('#tbExport').backgroundColor,
    primaryColor:$('#tbExport').color,
    chipOnBg: (()=>{const e=document.querySelector('.vchip.on');return e?getComputedStyle(e).backgroundColor:null;})(),
    rchipShadow:$('.rchip.on').boxShadow,
    dockBg:$('#dock').backgroundColor,
    dockRadius:$('#dock').borderRadius,
    canvasRadius:$('.canvas').borderRadius,
    canvasBorder:$('.canvas').borderColor,
    bodyBgImg:(getComputedStyle(document.body).backgroundImage||'').replace(/\s+/g,' ').slice(0,120),
    vtIcon: document.querySelector('.vrow .vt svg')? 'svg' : null,
    lockIcon: document.querySelector('.side-foot .lock svg')? 'svg' : null,
    tagSvg: document.querySelector('.tag svg')? 'svg' : null,
    projMono: document.querySelector('.proj-th i.mono')? document.querySelector('.proj-th i.mono').textContent : null,
    sideNav:g('#sideNav'), inspector:g('aside.inspector'), dock:g('#dock'), topbar:g('#topbar'), canvas:g('.canvas'),
    envCur: document.querySelector('.p2-envcard.on b')?document.querySelector('.p2-envcard.on b').textContent:null,
    toast: !!document.querySelector('.p2-toast.show'),
  };
}); }

// desktop
{
  const {p,errs}=await fresh({width:1440,height:900});
  const s=await cs(p);
  await p.screenshot({path:OUT+'/cin_desktop_default_1440x900.png'});
  // interactions: open envbar, switch, camera, export close, learn tour
  await p.click('.p2-envtoggle'); await p.waitForTimeout(550);
  await p.screenshot({path:OUT+'/cin_desktop_envbar_1440x900.png'});
  await p.click('.p2-envcard:nth-child(8)'); await p.waitForTimeout(1300);
  const afterEnv=await p.evaluate(()=>({env:document.querySelector('.p2-envcard.on b').textContent,toast:!!document.querySelector('.p2-toast.show')}));
  await p.click('.p2-envtoggle'); await p.waitForTimeout(400);
  await p.evaluate(()=>{const dk=[...document.querySelectorAll('.dk-btn')].find(b=>b.getAttribute('for')==='tlCam');dk&&dk.click();}); await p.waitForTimeout(600);
  await p.evaluate(()=>{const a=[...document.querySelectorAll('.tray.t-cam .rchip')].find(c=>c.textContent.trim()==='Orbit spin');a&&a.click();});
  await p.waitForTimeout(1400);
  const s2=await cs(p);
  await p.click('#tbExport'); await p.waitForTimeout(3200);
  await p.evaluate(()=>{const d=document.querySelector('#p2ExpClose'); if(d&&d.disabled===false) d.click();});
  await p.waitForTimeout(300);
  await p.click('#tbLearn'); await p.waitForTimeout(700);
  await p.screenshot({path:OUT+'/cin_desktop_tour_1440x900.png'});
  console.log('DESKTOP',JSON.stringify({s,afterEnv,s2_io:s2,errs},null,0));
  await p.close();
}
// honorpad landscape
{
  const {p,errs}=await fresh({width:1194,height:834});
  const s=await cs(p);
  await p.screenshot({path:OUT+'/cin_honorpad_landscape_1194x834.png'});
  console.log('TAB-L',JSON.stringify({s,errs},null,0));
  await p.close();
}
// honorpad portrait
{
  const {p,errs}=await fresh({width:834,height:1112});
  const s=await cs(p);
  await p.screenshot({path:OUT+'/cin_honorpad_portrait_834x1112.png'});
  console.log('TAB-P',JSON.stringify({s,errs},null,0));
  await p.close();
}
await b.close();
console.log('DONE');
