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
  for(const cls of ['warrior','mage','archer']){
    await page.evaluate((c)=>{const s=window.__S;s.hero.setTexture({warrior:'poop_warrior',mage:'poop_mage',archer:'poop_archer'}[c]);s.hero.clearTint();},cls);
    await sleep(400);
    await page.screenshot({path:path.join(OUT,'job-'+cls+'.png'),clip:{x:150,y:640,width:240,height:260}});
    console.log('job-'+cls+' done');
  }
  await browser.close();server.close();console.log('DONE');
})().catch(e=>{console.error(e);process.exit(1)});
