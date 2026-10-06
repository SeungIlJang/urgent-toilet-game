import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const errors = [];
const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--window-size=540,960'] });
const p = await b.newPage(); await p.setViewport({ width: 540, height: 960 });
p.on('pageerror', e => errors.push(e.message));
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' }); await wait(700);
await p.evaluate(() => localStorage.setItem('urgentDefenseV1', JSON.stringify({coins:3000, weaponsOwned:['basic','laser','shotgun'], weaponLevels:{laser:6,shotgun:5}, upgrades:{rate:6,power:6}})));
await p.reload({ waitUntil: 'networkidle2' }); await wait(700);
await p.mouse.click(270, 672);   // 게임 시작 button
// bomb spam to clear faster + reach intermission
for (let i=0;i<24;i++){ await p.mouse.click(180+(i%4)*60, 250+(i%3)*60); await wait(700); }
await p.screenshot({ path: 'scripts/shot-inter2.png' });
await p.mouse.click(270, 432);   // 강화 상점 (if intermission)
await wait(500);
await p.screenshot({ path: 'scripts/shot-shop.png' });
await b.close();
console.log(errors.length?errors.join('\n'):'no page errors');
