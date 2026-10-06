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
  await page.goto('http://localhost:'+port+'/',{waitUntil:'networkidle0'});await sleep(2000);
  await page.mouse.click(270,480);await sleep(900);await page.mouse.click(270,480);await sleep(1000);
  await page.evaluate(()=>{const s=window.__S;const t=['e_roll','e_plunger','e_sink','e_soap','e_mosquito','e_tissue_red','e_tissue_blue'];
    // stop spawns, clear
    s.toSpawn=99; s.enemies.forEach(e=>e.destroy&&e.destroy()); s.enemies.length=0;
    let x=70,y=300; t.forEach((k,i)=>{ const sp=s.add.sprite(x+(i%4)*130, y+Math.floor(i/4)*180, k).setScale(1.1).setDepth(40); const lbl=s.add.text(sp.x, sp.y+70, k.replace('e_',''), {fontSize:'14px',color:'#fff',stroke:'#000',strokeThickness:3}).setOrigin(.5).setDepth(41); });
  });
  await sleep(500);
  await page.screenshot({path:path.join(OUT,'enemy-lineup.png')});console.log('lineup done');
  await browser.close();server.close();console.log('DONE');
})().catch(e=>{console.error(e);process.exit(1)});
