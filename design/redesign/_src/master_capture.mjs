import { chromium } from 'playwright-core';
import fs from 'fs';
const exe='/usr/bin/chromium';
const LIVE='file:///home/user/design/redesign/studio_sidecars_cinematic.html';
const OUT='/home/user/design/redesign/exports/premium_finish_master';
const VP=[['desktop',1440,900],['honorpad_ls',1194,834],['honorpad_pt',834,1112]];
fs.mkdirSync(OUT,{recursive:true});
for (const [d] of VP) fs.mkdirSync(OUT+'/'+d,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:exe,args:['--enable-unsafe-swiftshader','--no-sandbox']});
const errs=[];
const auditJS=()=>{
  const t=document.body.innerText;
  const emo=/[☕🎬📲🐍🎥🧰🎨🌆🌇🛵💡🚲🪑🔒⬇★📂↗✓☀]/;
  return {ovf:document.documentElement.scrollWidth>innerWidth+1,
    emoji:emo.test(t),
    sprite:!!document.getElementById('pi-sprite'),
    uses:document.querySelectorAll('svg.pi').length};
};
async function openAudit(w,h){
  const p=await b.newPage({viewport:{width:w,height:h}});
  p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(LIVE,{waitUntil:'load'});
  return p;
}
async function shot(p,rel){
  await p.screenshot({path:OUT+'/'+rel});
  console.log('shot',rel,JSON.stringify(await p.evaluate(auditJS)));
}
async function setDock(p,name){
  await p.evaluate(name=>{
    ['tlSelect','tlCam','tlLight','tlMat','tlFloor','tlRender'].forEach(id=>{const r=document.getElementById(id); if(r) r.checked=false;});
    const r=document.getElementById(name); if(r) r.checked=true;
  },name);
}
// ---------- capture loop over viewports ----------
for (const [dir,w,h] of VP){
  const sz={desktop:'1440x900',honorpad_ls:'1194x834',honorpad_pt:'834x1112'}[dir];
  const p=await openAudit(w,h); await p.waitForTimeout(3200);
  await shot(p,dir+'/artboard_'+sz+'.png');
  if(dir!=='honorpad_pt'){ // dock tool panels open above the dock (compact portrait hides trays in the locked canonical layout)
    for (const [id,name,letter] of [['tlCam','camera','a'],['tlLight','lighting','b'],['tlMat','materials','c'],['tlFloor','floor','d']]){
      await setDock(p,id); await p.waitForTimeout(700);
      const tv=await p.evaluate(()=>{const t=document.querySelector('.trays'); if(!t)return null; const r=t.getBoundingClientRect(); return Math.round(r.width)+'x'+Math.round(r.height);});
      if(tv==='0x0'||!tv) errs.push(dir+' '+name+' tray hidden');
      await shot(p,dir+'/screen_03'+letter+'_'+name+'_panel.png');
    }
    await p.evaluate(()=>{['tlSelect','tlCam','tlLight','tlMat','tlFloor','tlRender'].forEach(id=>{const r=document.getElementById(id); if(r) r.checked=false;});});
    await p.waitForTimeout(400);
  }
  try{
    const has=await p.$('.p2-envtoggle');
    if(has) await has.click();
    else await p.evaluate(()=>{[...document.querySelectorAll('button,label')].find(x=>/environ/i.test(x.textContent||''))?.click();});
    await p.waitForTimeout(1200);
    const n=await p.evaluate(()=>document.querySelectorAll('.p2-envcard').length);
    console.log(dir,'env library cards:',n);
    await shot(p,dir+'/screen_02_environment_library.png');
    if(has) await has.click();
  }catch(e){ errs.push('env '+dir+': '+e.message); }
  await p.waitForTimeout(600);
  try{
    await p.evaluate(()=>{const b=document.getElementById('tbLearn')||[...document.querySelectorAll('button,label')].find(x=>/learn|studio tour|guided/i.test(x.textContent||'')); if(b)b.click();});
    await p.waitForTimeout(1000);
    await shot(p,dir+'/screen_04_learn_studio.png');
  }catch(e){ errs.push('learn '+dir+': '+e.message); }
  await p.close();
}
await b.close();
console.log('errors:',errs.length?errs:'NONE');
