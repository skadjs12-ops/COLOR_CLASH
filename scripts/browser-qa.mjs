// Run on a machine with browser permissions. This script has NOT been executed in the restricted authoring environment.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const port=4317,origin=`http://127.0.0.1:${port}`,out=path.resolve('qa-browser');await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
let browser;const report=[];
try{
 for(let i=0;i<40;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch();
 for(const [width,height] of [[1440,900],[1024,768],[1280,800],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const edition of ['production','offline']){
   await page.goto(edition==='production'?origin:pathToFileURL(path.resolve('PLAY.html')).href);await page.locator('.play').waitFor();
   await page.screenshot({path:path.join(out,`${edition}-home-${width}x${height}.png`),fullPage:true});
   await page.locator('.play').click();await page.locator('.mode-local').click();await page.locator('.battle').waitFor();
   await page.getByLabel('RED 물감 추가',{exact:true}).click();await page.getByLabel('BLUE 물감 추가',{exact:true}).click();
   await page.screenshot({path:path.join(out,`${edition}-battle-${width}x${height}.png`),fullPage:true});
   const metrics=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,plates:Array.from(document.querySelectorAll('.plate')).map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}}),buttons:Array.from(document.querySelectorAll('button')).filter(e=>e.offsetWidth&&e.offsetHeight).map(e=>({label:e.getAttribute('aria-label')||e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}));
   if(metrics.scroll>width+1)errors.push(`Horizontal overflow: ${metrics.scroll} > ${width}`);
   for(let i=2;i<28;i++)await page.locator('.action-buttons>div>button').last().click();
   for(let i=0;i<2;i++){await page.locator('.handoff .primary').click();await page.getByLabel('RED 물감 추가',{exact:true}).click();await page.locator('.final-actions .primary').click();}
   await page.locator('.result-page').waitFor();report.push({edition,width,height,metrics,errors:[...errors]});
  }await context.close();
 }
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));if(report.some(r=>r.errors.length))throw Error('Browser errors detected; inspect qa-browser/report.json');
 console.log('Browser QA complete. Screenshots and measured layout report saved to qa-browser/.');
}finally{await browser?.close();server.kill();}
