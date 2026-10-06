import puppeteer from 'puppeteer-core';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const VP = { width: 540, height: 1200 };
const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox',`--window-size=${VP.width},${VP.height}`] });
const p = await b.newPage(); await p.setViewport(VP);
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle2' }); await wait(600);
await p.evaluate(() => localStorage.setItem('urgentDefenseV1', JSON.stringify({coins:9000, weaponsOwned:['basic','shotgun','rapid','laser','grenade'], weapon:'shotgun', weaponLevels:{shotgun:3}})));
await p.reload({ waitUntil: 'networkidle2' }); await wait(900);
// game is 540x960; fit width in 540x1200 -> scale 1, letterbox top/bottom 120px. Visual screen y = 120 + gameY.
const TOPPAD = 120;
async function tryClose(open, gx, gy, key){
  await p.evaluate(open); await wait(250);
  await p.mouse.click(gx, TOPPAD+gy); await wait(200);
  const open2 = await p.evaluate(k=>!!window.__game.scene.scenes[0][k], key);
  await p.evaluate(()=>{const s=window.__game.scene.scenes[0];['weaponOverlay','shopOverlay','charOverlay','lbOverlay'].forEach(k=>{s[k]?.destroy();s[k]=null});});
  return !open2;
}
const wpX = await tryClose(()=>window.__game.scene.scenes[0].showWeapons(), 506, 52, 'weaponOverlay');
const wpC = await tryClose(()=>window.__game.scene.scenes[0].showWeapons(), 270, 724, 'weaponOverlay');
const cssMode = await p.evaluate(()=>{const c=window.__game.canvas;const r=c.getBoundingClientRect();return {h:Math.round(r.height),style:getComputedStyle(c).objectFit};});
console.log(`canvas rect height=${cssMode.h} object-fit=${cssMode.style}  ->  무기 ✖ closed=${wpX?'OK':'FAIL'}  무기 닫기 closed=${wpC?'OK':'FAIL'}`);
await b.close();
