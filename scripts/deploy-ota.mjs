// OTA 배포: dist/index.html 을 games 레포의 toilet.html 로 옮긴다.
//
// 앱의 www/index.html 은 OTA 로더다. 켜질 때마다 games/toilet.html 을 받아 그걸 실행하고,
// 못 받으면 내장 www/game.html 로 폴백한다. 즉 **AAB 를 새로 올려도 평소에는 원격본이 뜬다.**
// 2026-11-03 에 확인해 보니 서빙되던 toilet.html 이 실배너·실전면 작업(93af7fd)보다 한 달
// 가까이 뒤처져 있었다 — 그동안 배너와 전면이 구글 테스트 광고로 나가고 있었다.
//
// 사용: npm run deploy          (빌드 + 복사 — 커밋·푸시는 games 레포에서 직접)
//       빌드 체인 끝의 verify:economy 가 puppeteer 를 띄우느라 환경에 따라 실패하는데,
//       그때는 dist 가 이미 만들어져 있으니 `node scripts/deploy-ota.mjs` 만 따로 돌리면 된다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.resolve(import.meta.dirname, '..');
const SRC = path.join(HERE, 'dist', 'index.html');
// games 레포는 이 프로젝트 옆에 체크아웃돼 있다 (SeungIlJang/games)
const DEST = process.argv[2] || path.join(HERE, '..', 'games', 'toilet.html');

if (!fs.existsSync(SRC)) throw new Error('dist/index.html 이 없다 — npm run build:release 를 먼저 돌려라');
if (!fs.existsSync(path.dirname(DEST))) throw new Error('games 레포를 찾을 수 없다: ' + DEST);

const html = fs.readFileSync(SRC, 'utf8');

// 1) 로더를 올리면 자기 자신을 불러오는 무한 리다이렉트가 된다.
if (html.includes("REMOTE='https://seungiljang.github.io/games/"))
  throw new Error('OTA 로더를 복사하려 한다 — dist 가 아니라 www/index.html 을 집었다');
// 2) 단일 파일 빌드가 아니면 원격에서 자원을 못 찾는다(dist 에는 index.html 하나만 올린다).
if (/<script[^>]+src=/.test(html))
  throw new Error('단일 파일 빌드가 아니다 — 외부 script 참조가 남아 있다');
// 3) 실광고 빌드인지. 테스트 광고본을 운영에 올리면 수익이 조용히 0 이 된다.
if (!html.includes('ad-mode:real'))
  throw new Error('실광고 빌드가 아니다 — VITE_REAL_ADS=1 로(npm run build:release) 다시 빌드해라');

// 4) 빌드 이후에 소스를 더 고쳤으면 옛 산출물을 올리게 된다.
const built = fs.statSync(SRC).mtimeMs;
const newer = [];
(function walk(p) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const q = path.join(p, e.name);
    if (e.isDirectory()) walk(q);
    else if (fs.statSync(q).mtimeMs > built) newer.push(path.relative(HERE, q));
  }
})(path.join(HERE, 'src'));
if (newer.length) throw new Error(`dist 보다 새로운 소스가 있다 — 다시 빌드해라:\n  ${newer.slice(0, 5).join('\n  ')}`);

fs.copyFileSync(SRC, DEST);
console.log(`배포본 생성 · ${path.relative(path.join(HERE, '..'), DEST)} · ${(fs.statSync(DEST).size / 1048576).toFixed(1)}MB`);

// 출처를 games/ota-sources.json 에 남긴다. games 의 신선도 검사(tools/check-ota-freshness.mjs)가
// 이 커밋을 소스 저장소의 현재 HEAD 와 비교해서, 복사를 빠뜨리면 CI 가 빨간불을 낸다.
const git = (...a) => execFileSync('git', a, { cwd: HERE }).toString().trim();
const sources = path.join(path.dirname(DEST), 'ota-sources.json');
const all = fs.existsSync(sources) ? JSON.parse(fs.readFileSync(sources, 'utf8')) : {};
const dirty = git('status', '--porcelain') !== '';
all['toilet.html'] = { repo: 'urgent-toilet-game', commit: git('rev-parse', 'HEAD'), dirty, builtAt: new Date().toISOString() };
// 키 순서를 고정해야 다른 앱을 배포할 때 쓸데없는 diff 가 생기지 않는다.
const sorted = Object.fromEntries(Object.keys(all).sort().map(k => [k, all[k]]));
fs.writeFileSync(sources, JSON.stringify(sorted, null, 2) + '\n');
if (dirty) console.warn('⚠️ 커밋 안 된 변경이 있는 상태로 빌드했다 — 기록한 커밋이 이 배포본과 다르다');

console.log('다음: games 레포에서 toilet.html 과 ota-sources.json 커밋·푸시');
