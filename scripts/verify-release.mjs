// 출시 전 설정 점검. 버전/앱 이름/권한이 여러 파일에 흩어져 있어 서로 어긋난 채 빌드되던 걸 막는다.
// 실광고 빌드(VITE_REAL_ADS=1)일 때는 광고 유닛 ID까지 채워졌는지 함께 본다.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const at = rel => readFile(new URL(rel, import.meta.url), 'utf8');
const APP_NAME = '화장실 수비대';
const realAds = process.env.VITE_REAL_ADS === '1';

const pkg = JSON.parse(await at('../package.json'));
const gradle = await at('../android/app/build.gradle');
const manifest = await at('../android/app/src/main/AndroidManifest.xml');
const strings = await at('../android/app/src/main/res/values/strings.xml');
const indexHtml = await at('../index.html');
const webmanifest = JSON.parse(await at('../public/manifest.webmanifest'));
const main = await at('../src/main.js');

// --- 버전: package.json 이 유일한 출처 ---
const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
assert.equal(versionName, pkg.version, `versionName(${versionName}) 과 package.json(${pkg.version}) 불일치`);
assert.ok(Number.isInteger(versionCode) && versionCode > 0, 'versionCode 가 올바르지 않습니다');

// --- 앱 이름 ---
assert.ok(strings.includes(`<string name="app_name">${APP_NAME}</string>`), 'strings.xml 앱 이름 불일치');
assert.ok(indexHtml.includes(`<title>${APP_NAME}</title>`), 'index.html 제목 불일치');
assert.equal(webmanifest.name, APP_NAME, 'manifest.webmanifest 이름 불일치');
assert.ok(!/급해!/.test(indexHtml + JSON.stringify(webmanifest)), '옛 게임 이름(급해! 화장실)이 남아 있습니다');

// --- Android 권한/설정 ---
assert.ok(manifest.includes('android.permission.VIBRATE'), 'VIBRATE 권한이 없어 진동이 동작하지 않습니다');
assert.ok(manifest.includes('android.permission.INTERNET'), 'INTERNET 권한 누락');
assert.ok(/com\.google\.android\.gms\.ads\.APPLICATION_ID/.test(manifest), 'AdMob APPLICATION_ID 메타데이터 누락');
assert.ok(/android:screenOrientation="portrait"/.test(manifest), '세로 고정이 풀렸습니다');

// --- 광고 유닛 ---
const interId = main.match(/const ADMOB_INTER_ID\s*=\s*'([^']*)'/)?.[1];
const rewardId = main.match(/const ADMOB_REWARD_ID\s*=\s*'([^']*)'/)?.[1];
assert.ok(rewardId, '보상형 광고 유닛 ID 누락');
if (realAds) {
  assert.ok(interId, 'VITE_REAL_ADS=1 인데 ADMOB_INTER_ID 가 비어 있습니다. AdMob 에서 전면 광고단위를 만들어 넣으세요.');
} else if (!interId) {
  console.log('NOTE: ADMOB_INTER_ID 가 비어 있어 전면광고는 테스트 빌드에서만 노출됩니다.');
}

console.log(
  `PASS: v${pkg.version} (versionCode ${versionCode}) · 앱 이름 "${APP_NAME}" 일치 · 권한 OK · ` +
  `광고 ${realAds ? '실유닛' : '테스트 유닛'}`,
);
