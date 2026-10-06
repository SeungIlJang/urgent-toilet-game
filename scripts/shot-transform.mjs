import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const errors = [];
const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--window-size=540,960'] });
const p = await b.newPage(); await p.setViewport({ width: 540, height: 960 });
p.on('pageerror', e => errors.push(e.message));
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' }); await wait(700);
await p.evaluate(() => { const s={coins:9000,upgrades:{power:6,rate:6}}; localStorage.setItem('urgentDefenseV1', JSON.stringify(s)); });
await p.reload({ waitUntil: 'networkidle2' }); await wait(700);
await p.mouse.click(270, 250);   // start (empty area)
let shotJob=false;
for (let i=0;i<80;i++){
  await p.mouse.click(270, 515); // advances intermission (다음웨이브) / bombs during play
  await wait(700);
  if (i===45){ await p.screenshot({ path:'scripts/shot-transform.png' }); }
}
await p.screenshot({ path:'scripts/shot-transform2.png' });
await b.close();
console.log(errors.length?errors.join('\n'):'no page errors');
