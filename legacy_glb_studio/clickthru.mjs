import { chromium } from 'playwright-core';
const FILES=['STANDALONE_VIEWER.html','ENHANCED_VIEWER.html','ADVANCED_MULTI_MODEL_VIEWER.html','ULTIMATE_VIEWER.html','FINAL_ULTIMATE_VIEWER.html','ABSOLUTE_FINAL_VIEWER.html','ULTIMATE_SPECIAL_VIEWER.html'];
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
for (const file of FILES){
  const page=await (await browser.newContext({viewport:{width:1280,height:900}})).newPage();
  const errs=[];
  page.on('pageerror',e=>errs.push('PE:'+e.message.split('\n')[0]));
  page.on('dialog',d=>d.accept().catch(()=>{})); // accept alerts/confirms
  await page.goto('file:///home/user/unzipped/'+file,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  await page.setInputFiles('#file','/home/user/unzipped/test-model.glb');
  await page.waitForTimeout(4500);
  const clicks=[];
  // try clicking each button/control by visible text (first match each), only visible ones
  const labels=['Auto Rotate','Rotate','Stop Rotation','Reset','Reset Camera','Reset View','Photo','Screenshot','4K','Record','Stop','Wireframe','X-Ray','Grid','Front','Top','Right','Left','Back','45','Merge','Duplicate','Delete Selected','Clear','Add Model','Background','Studio','Sunset','Warehouse','Standard','Metallic','Chrome','Glossy','Save','Load','Drag Mode','Select Parts','Upload'];
  for (const lbl of labels){
    try{
      const loc=page.locator(`button:has-text("${lbl}"), label:has-text("${lbl}")`).first();
      if(await loc.count()&&await loc.isVisible({timeout:400}).catch(()=>false)){
        await loc.click({timeout:1200, force:true}).catch(()=>{});
        await page.waitForTimeout(220);
        clicks.push(lbl);
      }
    }catch(e){}
  }
  await page.waitForTimeout(500);
  // click a model list item if any (select)
  try{ const item=page.locator('.model-item, li').first(); if(await item.count()&&await item.isVisible().catch(()=>false)){ await item.click({force:true}).catch(()=>{}); clicks.push('select-model'); await page.waitForTimeout(300);} }catch(e){}
  const finalErrs=[...new Set(errs)];
  console.log(`${file}\n  clicked: ${clicks.join(', ')||'(none found)'}\n  page errors: ${finalErrs.length?finalErrs.slice(0,6).join(' ;; '):'NONE'}`);
  await page.close();
}
await browser.close();
