const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('./node_modules/puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = path.join(__dirname, 'dist');
const OUT = __dirname;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.json':'application/json', '.webmanifest':'application/manifest+json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const url = `http://localhost:${port}/`;
  console.log('serving', url);

  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type()==='error') console.log('PAGE ERR:', m.text()); });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(2500);

  // start screen
  await page.screenshot({ path: path.join(OUT, 'poop-1-start.png') });
  console.log('poop-1-start done');

  // tap to start, then tap a few times to play/throw bombs
  const cx = 270, cy = 480;
  await page.mouse.click(cx, cy);
  await sleep(1500);
  await page.mouse.click(cx, cy);
  await sleep(3500);
  await page.mouse.click(200, 400);
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, 'poop-2-play.png') });
  console.log('poop-2-play done');

  await browser.close();
  server.close();
  console.log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
