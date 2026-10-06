const http=require('http'),fs=require('fs'),path=require('path');
const puppeteer=require('./node_modules/puppeteer-core');
const EDGE='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT=path.join(__dirname,'dist'),OUT=__dirname;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404);res.end('nf');return}res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});res.end(d)})});
(async()=>{
  await new Promise(r=>server.listen(0,r));const port=server.address().port;
  const browser=await puppeteer.launch({executablePath:EDGE,headless:'new',args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage();await page.setViewport({width:540,height:960,deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')console.log('ERR:',m.text())});
  await page.goto('http://localhost:'+port+'/',{waitUntil:'networkidle0'});await sleep(2200);
  await page.mouse.click(270,480);await sleep(1000);await page.mouse.click(270,480);await sleep(1500);
  // force death → revive offer
  await page.evaluate(()=>{const s=window.__S;s.score=1800;s.bestScore=2000;s.wave=6;s.streak=12;s.baseHp=0;s.gameOver()});
  await sleep(500);
  await page.screenshot({path:path.join(OUT,'revive-offer.png')});console.log('revive-offer done');
  // click the ad button → ad overlay
  await page.mouse.click(270,472);await sleep(700);
  await page.screenshot({path:path.join(OUT,'revive-ad.png')});console.log('revive-ad done');
  await sleep(3500);
  await page.screenshot({path:path.join(OUT,'revive-after.png')});console.log('revive-after done');
  await browser.close();server.close();console.log('DONE');
})().catch(e=>{console.error(e);process.exit(1)});
