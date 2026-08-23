import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';

const distAssets = await readdir(new URL('../dist/assets/', import.meta.url));
const nativeAssets = await readdir(new URL('../android/app/src/main/assets/public/assets/', import.meta.url));
const distJs = distAssets.find(x => /^index-.*\.js$/.test(x));
assert.ok(distJs, 'dist hashed JS missing');
assert.ok(nativeAssets.includes(distJs), `native assets missing latest ${distJs}`);
const index = await readFile(new URL('../android/app/src/main/assets/public/index.html', import.meta.url), 'utf8');
assert.ok(index.includes(`/assets/${distJs}`), 'native index does not reference latest hash');
await assert.rejects(access(new URL('../android/app/src/main/assets/public/sw.js', import.meta.url), constants.F_OK), undefined, 'sw.js must not be packaged');
const bundle = await readFile(new URL(`../android/app/src/main/assets/public/assets/${distJs}`, import.meta.url), 'utf8');
assert.ok(bundle.includes('__URGENT_DIAGNOSTICS__'), 'diagnostics missing from native bundle');
assert.ok(!bundle.includes('serviceWorker.register'), 'service worker registration found in native bundle');
console.log(`PASS: native APK assets use latest ${distJs}; no sw.js/registration; diagnostics bundled`);
