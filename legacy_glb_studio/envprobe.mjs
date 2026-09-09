import { chromium } from 'playwright-core';
const http=await import('http'); const fs=await import('fs'); const path=await import('path');
const server=http.createServer((req,res)=>{let p=path.join('/home/user/webtest',req.url.split('?')[0]); if(!fs.existsSync(p)){res.statusCode=404;res.end();return;} res.setHeader('content-type','text/html'); res.end(fs.readFileSync(p));});
await new Promise(r=>server.listen(8921,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
for (const f of ['adv_fix4.html','std_envcheck.html']) {
  const page=await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  const logs=[]; page.on('console',m=>{const t=m.text(); if(t.includes('ENVCHECK')||m.type()==='error') logs.push(t.slice(0,400));});
  page.on('pageerror',e=>logs.push('PE '+e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:8921/'+f,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);
  await page.setInputFiles('#file','/home/user/unzipped/test-model.glb');
  await page.waitForTimeout(5000);
  console.log(f, '→', logs.join(' | ')||'(none)');
  await page.close();
}
await browser.close(); server.close();
