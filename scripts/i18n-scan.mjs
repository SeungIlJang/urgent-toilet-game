// 언어팩 점검.
//   node scripts/i18n-scan.mjs          사람이 읽는 보고서
//   node scripts/i18n-scan.mjs --check  문제가 있으면 실패(빌드 게이트용)
//
// 두 가지를 본다.
//  1) t() 로 감싸지 않고 소스에 그냥 박힌 한글 문자열 — 그 자리는 영어·일본어로 안 바뀐다.
//  2) t('키') 로 부르는데 영어·일본어 표에 없는 키 — 그 자리만 한국어로 남는다.
// 주석은 전부 한글이라 세면 안 되므로, 문자열 리터럴만 본다.
import { readFile } from 'node:fs/promises';
import { DICT, LANGS } from '../src/i18n.js';

const FILES = ['src/main.js', 'src/hud-ui.js', 'src/ui-screens.js', 'src/sound-kit.js', 'src/balance.js'];
const HANGUL = /[가-힣]/;

/** 주석 밖 문자열 리터럴을 위치와 함께 모은다. t( 바로 뒤인지도 표시한다. */
function literals(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '/' && n === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    if (c !== "'" && c !== '"' && c !== '`') { i++; continue; }
    const q = c; let j = i + 1, v = '', tpl = false;
    while (j < src.length) {
      if (src[j] === '\\') { v += src[j + 1] === 'n' ? '\n' : (src[j + 1] ?? ''); j += 2; continue; }
      if (src[j] === q) break;
      if (q === '`' && src[j] === '$' && src[j + 1] === '{') tpl = true;
      if (q !== '`' && src[j] === '\n') break;
      v += src[j]; j++;
    }
    // 바로 앞이 t( 또는 k( 이면 번역 키다. 단 split( · setText( 처럼 t( 로 끝나는 함수와
    // 구별해야 하므로, 앞 글자가 식별자 문자가 아닌 것까지 확인한다.
    const fn = src.slice(i - 2, i);
    const isKey = (fn === 't(' || fn === 'k(') && !/[A-Za-z0-9_$.]/.test(src[i - 3] ?? '');
    out.push({ value: v, index: i, isKey, tpl });
    i = j + 1;
  }
  return out;
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

const raw = [];   // 안 감싼 한글
const keys = new Set();
for (const file of FILES) {
  const src = await readFile(new URL('../' + file, import.meta.url), 'utf8');
  for (const l of literals(src)) {
    if (l.isKey) { keys.add(l.value); continue; }
    if (HANGUL.test(l.value)) raw.push({ file, line: lineOf(src, l.index), value: l.value, tpl: l.tpl });
  }
}

if (raw.length) {
  console.log('■ t() 로 감싸지 않은 한글 문자열');
  for (const r of raw) console.log(`  ${r.file}:${r.line}${r.tpl ? ' (템플릿)' : ''}  ${JSON.stringify(r.value)}`);
}

const missing = {};
for (const lang of LANGS.filter(l => l !== 'ko')) {
  const gone = [...keys].filter(k => !(k in DICT[lang]));
  if (gone.length) missing[lang] = gone;
}
for (const [lang, gone] of Object.entries(missing)) {
  console.log(`\n■ ${lang} 번역이 없는 키 (${gone.length})`);
  for (const k of gone) console.log(`  ${JSON.stringify(k)}`);
}

// t 라는 이름의 지역 변수/파라미터는 번역 함수를 가린다. 실제로 콜백을 t=> 로 받아 두고
// 그 안에서 t('…') 를 부르는 코드가 있었고, 그대로 뒀으면 그 화면에서 죽었다.
const shadow = [];
for (const file of FILES) {
  const src = await readFile(new URL('../' + file, import.meta.url), 'utf8');
  // 번역 함수를 안 쓰는 파일(sound-kit 등)에서 t 는 그냥 흔한 변수 이름이라 문제가 없다.
  if (!/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*'\.\/i18n\.js'/.test(src)) continue;
  for (const m of src.matchAll(/(?:\b(?:const|let|var)\s+t\s*=|[(,]\s*t\s*=>)/g)) {
    shadow.push(`${file}:${lineOf(src, m.index)}  ${JSON.stringify(src.slice(m.index, m.index + 24).split('\n')[0])}`);
  }
}
if (shadow.length) {
  console.log(`\n■ 번역 함수 t() 를 가리는 지역 이름 (${shadow.length})`);
  for (const s of shadow) console.log('  ' + s);
  console.log('  → 다른 이름으로 바꿔 주세요. 이 범위 안에서는 t(\'…\') 가 죽습니다.');
}

const bad = raw.length + shadow.length + Object.values(missing).reduce((a, b) => a + b.length, 0);
console.log(`\n키 ${keys.size}개 · 안 감싼 한글 ${raw.length}개 · 번역 누락 ${bad - raw.length}개`);
if (process.argv.includes('--check')) {
  if (bad) { console.error('\nFAIL: 위 항목을 채워 주세요.'); process.exit(1); }
  console.log(`PASS: ${keys.size}개 키가 ${LANGS.join('/')} 모두 채워져 있습니다`);
}
