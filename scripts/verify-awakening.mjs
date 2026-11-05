import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { findBrowser } from './browser-path.mjs';

const root=fileURLToPath(new URL('../www/',import.meta.url));
const body=await readFile(path.join(root,'game.html'));
const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
assert.ok(!source.includes('hairFx'),'Legacy awakening triangles remain');
const server=http.createServer((req,res)=>{if(req.url!=='/'){res.writeHead(204);res.end();return}res.setHeader('Content-Type','text/html');res.end(body)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await puppeteer.launch({executablePath:findBrowser(),headless:true,args:['--disable-gpu','--mute-audio']});
 const page=await browser.newPage();await page.setViewport({width:540,height:960});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.waitForFunction(()=>window.__game?.scene.scenes[0]?.hero);
 const shots=process.env.AWAKENING_SHOT_DIR;if(shots)await mkdir(shots,{recursive:true});
 const reports=[];
 for(const [first,second] of [['warrior','berserker'],['mage','archmage'],['archer','sniper']]){
  const report=await page.evaluate(async({first,second})=>{
   const s=window.__game.scene.scenes[0];
   if(s.state==='ready')s.beginPlay();
   s.job='';s.job2='';s.toSpawn=0;s.clearBanners();s.bombTip?.destroy();s.bombTip=null;
   s.applyJob(first,true);const firstTexture=s.hero.texture.key;
   const triangleCount=s.children.list.filter(o=>o.type==='Triangle').length;
   s.level=10;s.offerJob();
   const choiceTextures=s.jobOverlay.list.filter(o=>o.type==='Image').map(o=>o.texture.key);
   s.applyJob(second,false);s.clearBanners();s.state='paused';s.cameras.main.resetFX();s.cameras.main.setZoom(1);
   const image=s.hero.texture.getSourceImage();
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   return {first,second,firstTexture,texture:s.hero.texture.key,choiceTextures,job:s.job,job2:s.job2,
     tint:s.hero.tintTopLeft,width:image.width,height:image.height,auraBig:s.auraBig,
     trianglesBefore:triangleCount,trianglesAfter:s.children.list.filter(o=>o.type==='Triangle').length};
  },{first,second});
  assert.equal(report.firstTexture,`poop_${first}`);assert.equal(report.texture,`poop_${second}`);
  assert.ok(report.choiceTextures.includes(`poop_${second}`),'Second-job choice shows first-job art');
  assert.equal(report.job,first);assert.equal(report.job2,second);assert.equal(report.tint,0xffffff);
  assert.equal(report.width,480);assert.equal(report.height,540);assert.equal(report.auraBig,true);
  assert.equal(report.trianglesAfter,report.trianglesBefore,'Awakening added triangle decorations');
  if(shots)await page.screenshot({path:path.join(shots,second+'.png')});
  reports.push(report);
 }
 assert.deepEqual(errors,[],'Browser errors');
 console.log(JSON.stringify({pass:true,reports},null,2));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
