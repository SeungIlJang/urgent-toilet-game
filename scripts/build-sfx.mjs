// 효과음 WAV 를 게임에 실을 압축 음원(m4a/AAC)으로 변환한다.
//   npm run sfx:build
// WAV 는 무압축이라 13개 합계 514KB 인데, 단일 HTML 에 base64 로 들어가면 +33% 가 더 붙는다.
// AAC 로 줄이면 수십 KB 로 떨어진다. m4a 를 고른 이유는 decodeAudioData 지원이 가장 넓어서다
// (Chrome·Android WebView·Safari 전부. ogg/opus 는 구형 Safari 에서 못 읽는다).
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';

const run = promisify(execFile);
const SRC = process.env.SFX_SRC || 'D:/AI/workspace/game/games/output/toilet-effects/wav';
const OUT = fileURLToPath(new URL('../src/assets/sfx/', import.meta.url));
const BITRATE = '48k'; // 짧은 효과음 + 모노라 이 정도면 원본과 구분이 안 된다

await mkdir(OUT, { recursive: true });
const wavs = (await readdir(SRC)).filter(f => f.toLowerCase().endsWith('.wav')).sort();
if (!wavs.length) throw new Error(`WAV 를 찾지 못했습니다: ${SRC}`);

let before = 0, after = 0;
const rows = [];
for (const wav of wavs) {
  const name = wav.replace(/\.wav$/i, '');
  const src = path.join(SRC, wav), dst = path.join(OUT, name + '.m4a');
  // -movflags +faststart: moov 를 앞으로 보내 통째로 받기 전에도 디코드가 시작된다
  await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', src,
    '-ac', '1', '-c:a', 'aac', '-b:a', BITRATE, '-movflags', '+faststart', dst]);
  const a = (await stat(src)).size, b = (await stat(dst)).size;
  before += a; after += b;
  rows.push(`  ${name.padEnd(8)} ${(a / 1024).toFixed(0).padStart(4)}KB → ${(b / 1024).toFixed(1).padStart(5)}KB`);
}

console.log(rows.join('\n'));
console.log(`\n합계 ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB` +
  ` (${(100 - after / before * 100).toFixed(0)}% 감소), base64 인라인 시 약 ${(after * 1.34 / 1024).toFixed(0)}KB`);
console.log(`PASS: ${wavs.length}개 변환 → src/assets/sfx/`);
