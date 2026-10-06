import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const errors = [];
const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--window-size=540,960'] });
const p = await b.newPage(); await p.setViewport({ width: 540, height: 960 });
p.on('pageerror', e => errors.push(e.message));
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' }); await wait(700);
await p.evaluate(() => localStorage.setItem('urgentDefenseV1', JSON.stringify({coins:1500, bestScore:8200, bestWave:9, weaponsOwned:['basic','shotgun']})));
await p.reload({ waitUntil: 'networkidle2' }); await wait(1200);
await p.screenshot({ path: 'scripts/shot-start.png' });
await p.mouse.click(270, 772);   // 데이터 초기화
await wait(400);
await p.screenshot({ path: 'scripts/shot-reset.png' });
await b.close();
console.log(errors.length?errors.join('\n'):'no page errors');
