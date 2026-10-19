// Play 스토어용 스크린샷을 현재 빌드(www/game.html)에서 직접 찍는다.
//   npm run shot:store
// 캔버스 크기(540x960)로 뷰포트를 맞춰 1:1 로 캡처하므로 확대/여백 없이 게임 화면만 나온다.
// 저장 데이터는 evaluateOnNewDocument 로 미리 심어, 매번 같은 화면이 나오게 한다.
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
// www/ 에 없는 파일(manifest 등)은 public/ 에서 찾는다. 없는 채로 두면 404 가 페이지 오류로 잡힌다.
const ROOT = fileURLToPath(new URL('../www/', import.meta.url));
const FALLBACK = fileURLToPath(new URL('../public/', import.meta.url));
const OUT = fileURLToPath(new URL('../store-assets/', import.meta.url));
const W = 540, H = 960;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const missing = new Set(); // 404 가 난 경로. 어떤 파일이 빠졌는지 보고에 쓴다.
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'game.html';
  if (rel === 'favicon.ico') { res.writeHead(204); res.end(); return; } // 브라우저가 항상 찾는 파일. 404 소음만 만든다.
  const body = await readFile(path.join(ROOT, rel)).catch(() => readFile(path.join(FALLBACK, rel)).catch(() => null));
  if (!body) { missing.add(rel); res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream' });
  res.end(body);
});

// 타이틀·상점이 비어 보이지 않도록 심어 두는 플레이 기록.
const SAVE = {
  coins: 1860, bestScore: 48230, bestWave: 23,
  unlocked: ['classic', 'mint', 'sunset', 'night', 'speedster', 'camel', 'golden'],
  selected: 'classic',
  weaponsOwned: ['basic', 'shotgun', 'rapid', 'laser'],
  weapon: 'laser',
  weaponLevels: { basic: 3, shotgun: 2, rapid: 1, laser: 4 },
  upgrades: { power: 3, rate: 3, bomb: 2, basehp: 2, coin: 1 },
  dailyProgress: { kills: 34, wave: 7, bomb: 12 },
  completed: {},
  scores: [
    { score: 48230, wave: 23, date: '2026-10-14' }, { score: 39110, wave: 19, date: '2026-10-13' },
    { score: 28640, wave: 16, date: '2026-10-11' }, { score: 17320, wave: 12, date: '2026-10-09' },
  ],
  soundOn: true, vibrationOn: true,
};

// 전투 화면용: 적을 화면 전체에 흩뿌리고 탄을 날아가는 중간 위치에 둔다.
// 한 판 중간 상태. 오버레이 샷에서도 뒤에 비치는 HUD(WAVE·점수·Lv)가 말이 되게 맞춰 둔다.
const midRun = (wave, score, level) => {
  const s = window.__game.scene.scenes[0];
  s.beginPlay();
  s.clearBanners();
  s.bombTip?.destroy(); s.bombTip = null;
  s.hint?.destroy(); s.hint = null;
  s.toSpawn = 0;
  for (const e of s.enemies.slice()) { e.bar?.destroy(); e.barBg?.destroy(); e.destroy(); }
  s.enemies = [];
  s.wave = wave; s.score = score; s.level = level; s.xp = 4; s.xpNext = 11;
  s.coins = 180 + wave * 95; // 🪙은 판 안에서만 쓰는 지갑이라 HUD에 그 판의 벌이가 보여야 한다
  s.baseHp = Math.round(s.baseMax * 0.74);
  s.updateHud();
  return s;
};

const combatScene = (wave, withBoss) => {
  const s = window.__midRun(wave, wave * 1835, 9);
  s.streak = 14; s.streakAt = s.time.now;
  // 전사 투구 + 2차 전직 오라. 작은 썸네일에서도 '전직했다'가 한눈에 보인다.
  s.job = 'warrior'; s.setJobLook('warrior', true);

  // spawnBoss 는 종류 문자열을 받는다('mini' | 'big' | 'septic'). 가장 화려한 정화조 보스로 찍는다.
  if (withBoss) { s.spawnBoss('septic'); const b = s.enemies[s.enemies.length - 1]; b.y = 300; b.hp = Math.round(b.maxHp * 0.62); }
  // 주인공이 서 있는 화면 중앙 하단(x 200~340, y>600)은 비워 둬 적/체력바가 겹치지 않게 한다.
  const spread = withBoss ? [[100, 560], [440, 520], [130, 680], [430, 655], [470, 420]]
    : [[90, 300], [250, 200], [420, 330], [140, 470], [350, 500], [470, 430], [110, 640], [440, 615], [300, 380], [185, 560]];
  for (const [x, y] of spread) {
    s.spawnEnemy();
    const e = s.enemies[s.enemies.length - 1];
    e.x = x; e.y = y;
    e.hp = Math.max(1, Math.round(e.maxHp * (0.4 + Math.random() * 0.5)));
  }
  for (let i = 0; i < 3; i++) for (const a of s.arsenal) s.fireWeapon(a);
  s.bolts.forEach((b, i) => { const t = 0.10 + i * 0.045; b.x += b.vx * t; b.y += b.vy * t; });
  s.updateHud();
};

const SHOTS = [
  {
    name: 'shot1-title', wait: 1400,
    run: () => { /* 타이틀 화면 그대로 */ },
  },
  {
    name: 'shot2-cards', wait: 700,
    // 카드는 무작위로 뽑히므로 희귀도가 보이도록 일반만 나온 패는 다시 뽑는다(스토어 노출용).
    run: () => {
      const s = window.__midRun(7, 12850, 9);
      const tags = () => s.upOverlay.list.filter(o => o.type === 'Text' && o.style.fontSize === '12px').map(o => o.text);
      s.offerUpgrade();
      for (let i = 0; i < 60 && !tags().some(t => t !== '일반'); i++) s.offerUpgrade();
    },
  },
  {
    name: 'shot3-shop', wait: 700,
    run: () => window.__midRun(7, 12850, 9).showWeapons(),
  },
  { name: 'shot4-combat', wait: 450, run: combatScene, args: [7, false] },
  {
    name: 'shot5-boss', wait: 560,
    run: (wave, withBoss) => {
      const s = window.__game.scene.scenes[0];
      window.__combat(wave, withBoss);
      s.banner('👑 웅장한 정화조 강림!', '#ffd24a', 212);
    },
    args: [10, true],
  },
  {
    name: 'shot6-jobs', wait: 700,
    run: () => { const s = window.__midRun(5, 6420, 5); s.job = ''; s.offerJob(); },
  },
];

await new Promise(r => server.listen(0, r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

await page.evaluateOnNewDocument(save => {
  const today = new Date().toLocaleDateString('sv-SE');
  localStorage.setItem('urgentDefenseV1', JSON.stringify({ ...save, missionDay: today }));
}, SAVE);
// 화면 구성 헬퍼는 모든 샷이 공유한다.
await page.evaluateOnNewDocument(`window.__midRun = ${midRun.toString()}; window.__combat = ${combatScene.toString()};`);

for (const shot of SHOTS) {
  await page.goto(`http://localhost:${port}/game.html`, { waitUntil: 'load' });
  await page.waitForFunction('!!window.__game && !!window.__game.scene.scenes[0].hero', { timeout: 15000 });
  await sleep(900);
  await page.evaluate(shot.run, ...(shot.args || []));
  await sleep(shot.wait);
  // 정지 컷이므로 (1) update 루프를 멈춰 적이 기지에 닿아 붉은 플래시가 또 터지는 걸 막고,
  // (2) 남아 있던 카메라 연출(플래시·셰이크·줌)을 걷어낸다. 안 하면 화면이 통째로 빨갛게 물든다.
  await page.evaluate(() => {
    const s = window.__game.scene.scenes[0];
    if (s.state === 'playing') s.state = 'shot'; // 'playing' 이 아니면 update() 가 즉시 반환한다
    const cam = s.cameras.main;
    cam.resetFX?.(); cam.setZoom(1);
  });
  await sleep(120);
  const clip = await page.$eval('canvas', c => {
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const file = path.join(OUT, shot.name + '.png');
  await page.screenshot({ path: file, type: 'png', clip });
  const png = await readFile(file);
  console.log(`${shot.name}.png  ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}  ${(png.length / 1024).toFixed(0)} KB`);
}

await browser.close();
server.close();

if (missing.size) console.log(`\n404 (캡처 서버에 없는 파일): ${[...missing].join(', ')}`);
if (pageErrors.length) {
  console.error('\n페이지 오류:\n' + pageErrors.slice(0, 5).map(e => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log(`\nPASS: ${SHOTS.length}장 저장 (store-assets/), 페이지 오류 없음`);
