import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const errors = [];
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--window-size=540,960'] });
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1 });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
const wait = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2', timeout: 30000 });
await wait(900);
await page.mouse.click(270, 500);   // start
await wait(1300);                    // enemies mid-descent, bolts flying
await page.screenshot({ path: 'scripts/shot-combat.png' });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
