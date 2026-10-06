import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const errors = [];
const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--window-size=540,960'] });
const p = await b.newPage(); await p.setViewport({ width: 540, height: 960 });
p.on('pageerror', e => errors.push(e.message));
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' }); await wait(700);
await p.evaluate(() => localStorage.removeItem('urgentDefenseV1'));
await p.reload({ waitUntil: 'networkidle2' }); await wait(700);
await p.mouse.click(270, 500); // start -> wave1 shows bomb tip
await wait(1200);
await p.screenshot({ path: 'scripts/shot-bomb-tip.png' });   // tutorial pointer + gauge (ready)
await p.mouse.click(230, 360); // throw a bomb -> starts cooldown, removes tip
await wait(700);
await p.screenshot({ path: 'scripts/shot-bomb-cd.png' });     // cooldown arc on gauge
await b.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
