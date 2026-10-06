import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--window-size=540,960'] });
const p = await b.newPage(); await p.setViewport({ width: 540, height: 960 });
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' }); await wait(800);
await p.evaluate(() => localStorage.removeItem('urgentDefenseV1')); // fresh, 0 coins
await p.reload({ waitUntil: 'networkidle2' }); await wait(800);
await p.mouse.click(270, 500); // start
await wait(18000);              // play through wave 1 -> intermission (saves)
const coins = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('urgentDefenseV1')||'{}'); return s.coins; });
await b.close();
console.log('banked coins after wave1:', coins);
