import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const root='/home/user/webtest';
const server=http.createServer((req,res)=>{
  let p=path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if(p.includes('..')||!fs.existsSync(p)){res.statusCode=404;res.end('nf');return;}
  res.setHeader('content-type', p.endsWith('.html')?'text/html':'application/octet-stream');
  res.end(fs.readFileSync(p));
});
await new Promise(r=>server.listen(8917,'127.0.0.1',r));

const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
for (const f of ['ADVANCED_MULTI_MODEL_VIEWER_dbg.html','ULTIMATE_VIEWER_dbg.html']){
  const page=await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  const logs=[]; page.on('console',m=>{const t=m.text(); if(t.includes('DBG')||m.type()==='error') logs.push(t.slice(0,600));});
  page.on('pageerror',e=>logs.push('PAGEERR '+e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:8917/'+f,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(2500);
  await page.setInputFiles('#file','/home/user/unzipped/test-model.glb');
  await page.waitForTimeout(6000);
  console.log('=== '+f+' ===\n'+ (logs.join('\n')||'(no logs)'));
  await page.close();
}
await browser.close(); server.close();
