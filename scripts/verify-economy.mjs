// 지갑 분리 규칙을 실제 빌드(www/game.html)를 돌려 확인한다.
//   🪙 코인 = 판 안에서만 (무기 강화). 판이 끝나면 사라진다.
//   💎 보석 = 영구 (영구 강화·스킨·무기 해금). 죽어도 남는다.
// 한 줄만 잘못 건드려도 "죽으면 전부 0" 이던 예전 동작으로 되돌아가므로 빌드 게이트로 둔다.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = fileURLToPath(new URL('../www/', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'game.html';
  if (rel === 'favicon.ico') { res.writeHead(204); res.end(); return; }
  const body = await readFile(path.join(ROOT, rel)).catch(() => null);
  if (!body) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream' });
  res.end(body);
});

await new Promise(r => server.listen(0, r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('urgentDefenseV1', JSON.stringify({
    gems: 300, upgrades: { power: 2 }, unlocked: ['classic'], selected: 'classic',
    weaponsOwned: ['basic', 'shotgun'], weapon: 'basic',
    missionDay: new Date().toLocaleDateString('sv-SE'),
    dailyProgress: { kills: 0, wave: 0, bomb: 0 }, completed: {},
    lastAttend: new Date().toLocaleDateString('sv-SE'), attendStreak: 1,
  }));
});
await page.goto(`http://localhost:${port}/game.html`, { waitUntil: 'load' });
await page.waitForFunction('!!window.__game && !!window.__game.scene.scenes[0].hero', { timeout: 15000 });

const result = await page.evaluate(async () => {
  const S = () => window.__game.scene.scenes[0];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const s = S();
  s.beginPlay();
  await wait(200);

  // 코인은 런 지갑만 늘린다
  const gemsAtStart = s.settings.gems;
  s.coins = 0; s.addCoin(500);
  const coinIsRunOnly = s.coins > 0 && s.settings.gems === gemsAtStart;

  // 무기 강화는 런 코인으로 산다
  s.settings.weaponLevels = { basic: 4 };

  // 사망 처리
  s.wave = 8; s.score = 12000; s.revived = true;
  const upgradesBefore = JSON.stringify(s.settings.upgrades);
  s.gameOver();
  await wait(400);
  const afterDeath = JSON.parse(localStorage.getItem('urgentDefenseV1'));

  // 다음 판
  s.scene.restart({ autoStart: false });
  await wait(1800);
  const n = S();
  // 다음 판 상태는 포기 정산으로 또 바뀌기 전에 찍어 둔다.
  const nextRun = {
    restarted: n.state === 'ready' && n.wave === 0,
    coins: n.coins, gems: n.settings.gems, power: n.upg.power,
    weaponLevels: Object.keys(n.settings.weaponLevels || {}).length,
  };

  // 중도 포기도 '끝난 판'이라 정산돼야 한다(💎 지급 + 일일 미션 진행 저장).
  n.beginPlay();
  await wait(200);
  n.wave = 6; n.score = 5000; n.kills = 40; n.bombsUsed = 9;
  const beforeQuit = { gems: n.settings.gems, kills: n.settings.dailyProgress.kills || 0 };
  n.pauseGame();
  const quitBtn = n.pauseOverlay.list.find(o => o.type === 'Text' && /처음으로/.test(o.text || ''));
  const pauseNote = n.pauseOverlay.list.find(o => o.type === 'Text' && /그만둬도/.test(o.text || ''))?.text || '';
  quitBtn.emit('pointerdown', {});
  await wait(1800);
  const afterQuit = JSON.parse(localStorage.getItem('urgentDefenseV1'));

  return {
    quit: {
      note: pauseNote,
      gemsGained: afterQuit.gems - beforeQuit.gems,
      killsRecorded: (afterQuit.dailyProgress.kills || 0) - beforeQuit.kills,
      waveRecorded: afterQuit.dailyProgress.wave,
    },
    coinIsRunOnly,
    gemsAtStart, gemsAfterDeath: afterDeath.gems,
    upgradesKept: JSON.stringify(afterDeath.upgrades) === upgradesBefore,
    weaponLevelsReset: Object.keys(afterDeath.weaponLevels || {}).length === 0,
    weaponsKept: (afterDeath.weaponsOwned || []).length,
    restarted: nextRun.restarted,
    nextRunCoins: nextRun.coins,
    nextRunGems: nextRun.gems,
    nextRunPower: nextRun.power,
    nextRunWeaponLevels: nextRun.weaponLevels,
  };
});

await browser.close();
server.close();

assert.ok(result.coinIsRunOnly, '🪙 획득이 💎까지 늘렸습니다 (지갑이 분리되지 않음)');
assert.ok(result.gemsAfterDeath > result.gemsAtStart, '사망 후 💎가 지급되지 않았습니다');
assert.ok(result.upgradesKept, '영구 강화가 사망 시 초기화됐습니다');
assert.ok(result.weaponLevelsReset, '무기 강화가 판을 넘어 유지됐습니다 (런 범위여야 함)');
assert.equal(result.weaponsKept, 2, '해금한 무기가 사라졌습니다');
assert.ok(result.restarted, '다음 판이 시작되지 않았습니다');
assert.equal(result.nextRunCoins, 0, '다음 판이 🪙 0 으로 시작하지 않았습니다');
assert.equal(result.nextRunGems, result.gemsAfterDeath, '다음 판에서 💎가 사라졌습니다');
assert.equal(result.nextRunPower, 2, '다음 판에 영구 강화가 반영되지 않았습니다');
assert.equal(result.nextRunWeaponLevels, 0, '다음 판 무기 강화가 0 이 아닙니다');
// 중도 포기 경로
assert.ok(result.quit.gemsGained > 0, '일시정지 → 처음으로 로 나갈 때 💎가 지급되지 않았습니다');
assert.equal(result.quit.killsRecorded, 40, '포기 시 일일 미션 처치 수가 저장되지 않았습니다');
assert.ok(result.quit.waveRecorded >= 6, '포기 시 일일 미션 웨이브가 저장되지 않았습니다');
assert.ok(/💎\d+/.test(result.quit.note), `일시정지 화면이 받게 될 💎를 알려주지 않습니다: "${result.quit.note}"`);
assert.equal(errors.length, 0, `페이지 오류: ${errors[0]}`);

console.log(
  `PASS: 💎 ${result.gemsAtStart}→${result.gemsAfterDeath} (사망 보상) · 영구 강화/해금 무기 유지 · ` +
  `다음 판 🪙0 · 무기Lv 초기화 · 중도 포기도 💎+${result.quit.gemsGained}·미션 ${result.quit.killsRecorded}처치 반영`,
);
