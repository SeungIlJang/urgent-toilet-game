// cap sync 이후 APK 안에 들어간 웹 자산이 방금 만든 빌드인지 확인한다.
// 예전 버전은 dist/assets/index-*.js 를 찾았지만, viteSingleFile 빌드는 그런 파일을 만들지 않아 항상 실패했다.
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const nativeDir = '../android/app/src/main/assets/public/';
const read = async (rel, label) =>
  readFile(new URL(nativeDir + rel, import.meta.url), 'utf8').catch(() => {
    throw new Error(`${label} 가 APK 자산에 없습니다 (${rel}). npx cap sync android 를 먼저 실행하세요.`);
  });

const nativeGame = await read('game.html', '게임 본체');
const nativeIndex = await read('index.html', 'OTA 로더');
const builtGame = await readFile(new URL('../www/game.html', import.meta.url), 'utf8');

assert.equal(nativeGame, builtGame, 'APK 안의 game.html 이 최신 빌드와 다릅니다 (cap sync 누락)');
assert.ok(nativeIndex.includes("location.replace('game.html')"), 'APK 안의 index.html 이 OTA 로더가 아닙니다');
assert.ok(nativeGame.includes('__URGENT_DIAGNOSTICS__'), 'APK 번들에 진단 훅이 없습니다');
// game.html 이 참조하는 매니페스트가 APK 안에도 있어야 한다(없으면 실행 때마다 404).
const manifestName = nativeGame.match(/rel="manifest"\s+href="\.?\/?([^"]+)"/)?.[1];
if (manifestName) await read(manifestName, '웹 매니페스트');
assert.ok(!/serviceWorker\.register/.test(nativeGame), 'APK 번들에 service worker 등록이 남아 있습니다');
await assert.rejects(
  access(new URL(nativeDir + 'sw.js', import.meta.url), constants.F_OK),
  undefined,
  'sw.js 가 APK 에 포함되면 안 됩니다',
);

console.log('PASS: APK 자산이 최신 www/game.html 과 일치, OTA 로더 포함, sw.js/등록 없음');
