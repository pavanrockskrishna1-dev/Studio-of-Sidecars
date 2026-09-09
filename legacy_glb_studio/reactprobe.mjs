import { chromium } from 'playwright-core';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
for (const model of ['test-diffuse.glb','test-model.glb']) {
  const page=await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  const logs=[];
  page.on('console',m=>{const t=m.text(); if(m.type()==='error') logs.push('ERR '+t.slice(0,300)); if(t.includes('Unable')||t.includes('failed')) logs.push('WARN '+t.slice(0,200));});
  page.on('pageerror',e=>logs.push('PE '+e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'load',timeout:60000});
  await page.waitForTimeout(6000);
  // dismiss instructions overlay
  try { const btn=page.locator('button:has-text("Get Started")'); if(await btn.count()) await btn.click({timeout:2000}).catch(()=>{});} catch(e){}
  await page.setInputFiles('input[type=file]', '/home/user/unzipped/'+model);
  await page.waitForTimeout(9000);
  await page.screenshot({path:'/home/user/shots/react_'+model+'.png'});
  const state=await page.evaluate(()=>({text:document.body.innerText.slice(0,200).replace(/\s+/g,' '), leva:!!document.querySelector('.leva-container, [class*="leva"]')}));
  console.log('== React with '+model+' ==');
  console.log('UI:', state.text, '| leva:', state.leva);
  console.log('console:', logs.slice(0,8).join(' | ')||'none');
  await page.close();
}
await browser.close();
