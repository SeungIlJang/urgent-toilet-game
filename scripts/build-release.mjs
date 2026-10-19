// 실광고 릴리스 빌드. VITE_REAL_ADS=1 을 세팅해 npm run build 를 그대로 돌린다.
// (윈도우에서 npm 스크립트는 cmd 로 실행돼 `VITE_REAL_ADS=1 npm run build` 가 동작하지 않아 노드로 감쌌다.)
import { spawnSync } from 'node:child_process';

console.log('실광고(AdMob 실유닛)로 빌드합니다. 디버그 설치본에서 직접 광고를 누르지 마세요.');
const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_REAL_ADS: '1' },
});
process.exit(result.status ?? 1);
