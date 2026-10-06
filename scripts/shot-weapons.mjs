import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const errors = [];
const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--window-size=540,960'] });
const p = await b.newPage(); await p.setViewport({ width: 540, height: 960 });
p.on('pageerror', e => errors.push(e.message));
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' }); await wait(700);
await p.evaluate(() => localStorage.setItem('urgentDefenseV1', JSON.stringify({coins:9000, weaponsOwned:['basic','shotgun'], weapon:'shotgun', weaponLevels:{shotgun:3}})));
await p.reload({ waitUntil: 'networkidle2' }); await wait(700);
await p.mouse.click(270, 572);   // 무기 button
await wait(400);
await p.screenshot({ path: 'scripts/shot-weapons.png' });
// upgrade shotgun once (its 강화 button ~ row idx1: y=142+112=254 -> +30 = 284, x right)
await p.mouse.click(470, 284);
await wait(300);
await p.screenshot({ path: 'scripts/shot-weapons2.png' });
await b.close();
console.log(errors.length?errors.join('\n'):'no page errors');
