import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const errors = [];
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--window-size=540,960'] });
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1 });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
const wait = ms => new Promise(r => setTimeout(r, ms));
const click = async (x, y, ms=350) => { await page.mouse.click(x, y); await wait(ms); };

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2', timeout: 30000 });
await wait(1000);
// give coins to exercise shop/character buy paths
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('urgentDefenseV1')||'{}'); s.coins = 5000; localStorage.setItem('urgentDefenseV1', JSON.stringify(s)); });
await page.reload({ waitUntil: 'networkidle2' }); await wait(900);

// open character + shop from start screen then close
await click(270, 551);            // 수비대(characters)
await click(430, 166 + 4*92 + 8); // buy a coin skin (speedster row idx 4)
await click(270, 904);            // close
await click(270, 599);            // shop
await click(430, 185);            // buy first upgrade
await click(270, 896);            // close

// start & play a wave: tap around to bomb
await click(270, 500);            // start (ready -> playing)
await wait(2500);
for (let i=0;i<5;i++){ await click(200 + i*30, 300 + i*40, 600); }
await wait(2000);
await page.screenshot({ path: 'scripts/smoke-defense.png' });
const diag = await page.evaluate(() => window.__URGENT_DIAGNOSTICS__ || null);
await browser.close();
console.log('=== PAGE ERRORS ==='); console.log(errors.length ? errors.join('\n') : '(none)');
console.log('=== GAME ERRORS ==='); console.log(JSON.stringify(diag?.errors || [], null, 2));
process.exit(errors.length ? 1 : 0);
