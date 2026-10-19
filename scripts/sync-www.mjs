// vite build 결과(dist/index.html, 단일 파일)를 Capacitor webDir 인 www/game.html 로 옮긴다.
// 예전에는 이 복사를 손으로 해서, npm run android:sync 를 돌려도 APK 안에는 옛 빌드가 들어갔다.
// www/index.html 은 OTA 로더라 절대 덮어쓰지 않는다.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/index.html', import.meta.url);
const target = new URL('../www/game.html', import.meta.url);
const loader = new URL('../www/index.html', import.meta.url);

const built = await readFile(dist, 'utf8').catch(() => {
  throw new Error('dist/index.html 이 없습니다. 먼저 vite build 를 실행하세요.');
});
assert.ok(built.includes('__URGENT_DIAGNOSTICS__'), '빌드 산출물에 진단 훅이 없습니다');
assert.ok(!/serviceWorker\.register/.test(built), '빌드 산출물에 service worker 등록이 남아 있습니다');
assert.ok(!/<script[^>]+src=/.test(built), '단일 파일 빌드가 아닙니다 (외부 script 참조가 남음)');

// 광고 모드가 의도대로 굳었는지 산출물에서 직접 확인한다.
// (환경변수 치환이 깨지면 실광고 빌드인데 조용히 테스트 광고가 들어가는 사고가 난다.)
const wantReal = process.env.VITE_REAL_ADS === '1';
const want = wantReal ? 'ad-mode:real' : 'ad-mode:test';
const other = wantReal ? 'ad-mode:test' : 'ad-mode:real';
assert.ok(built.includes(want), `빌드 산출물이 ${want} 가 아닙니다 (광고 플래그 치환 실패)`);
assert.ok(!built.includes(other), `빌드 산출물에 ${other} 가 함께 남아 있습니다 (상수 폴딩 실패)`);

const loaderHtml = await readFile(loader, 'utf8');
assert.ok(loaderHtml.includes("location.replace('game.html')"), 'www/index.html 이 OTA 로더가 아닙니다');

// game.html 이 참조하는 웹 매니페스트도 같이 옮긴다.
// 예전에는 index.html 만 복사해서 www/ 와 APK 자산에 manifest 가 없어 매번 404 가 났다.
const manifestName = built.match(/rel="manifest"\s+href="\.?\/?([^"]+)"/)?.[1];
if (manifestName) {
  const manifest = await readFile(new URL(`../dist/${manifestName}`, import.meta.url)).catch(() => null);
  assert.ok(manifest, `dist/${manifestName} 이 없습니다. public/ 에 있는지 확인하세요.`);
  await writeFile(new URL(`../www/${manifestName}`, import.meta.url), manifest);
}

await writeFile(target, built);
console.log(`PASS: dist/index.html -> www/game.html (${(built.length / 1024).toFixed(0)} KB)` +
  `${manifestName ? ` + ${manifestName}` : ''}, OTA 로더 보존, ${want}`);
