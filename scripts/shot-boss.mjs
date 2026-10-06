import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--window-size=540,960'] });
const p = await b.newPage(); await p.setViewport({ width: 540, height: 960 });
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' }); await wait(700);
await p.evaluate(() => localStorage.removeItem('urgentDefenseV1'));
await p.reload({ waitUntil: 'networkidle2' }); await wait(700);
await p.mouse.click(270, 250);   // start wave 1
await wait(4500);                // mini-boss + swarm descending
await p.screenshot({ path: 'scripts/shot-boss.png' });
await b.close();
console.log('done');
