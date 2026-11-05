// 헤드리스 테스트용 브라우저 실행 파일 경로를 찾는다.
// 예전에는 Edge 경로를 스크립트마다 박아 뒀는데, Edge 가 깨지면(launch 가 Code: 0 으로 죽는다)
// verify:economy 가 빌드 게이트를 통째로 막아 버렸다. 설치된 것 중 실제로 있는 걸 골라 쓴다.
import { existsSync } from 'node:fs';

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

/** TEST_BROWSER_PATH 가 있으면 그걸, 없으면 설치된 Chrome/Edge 중 먼저 찾은 걸 돌려준다. */
export function findBrowser() {
  const forced = process.env.TEST_BROWSER_PATH;
  if (forced) return forced;
  const found = CANDIDATES.find(p => existsSync(p));
  if (!found) {
    throw new Error(
      '헤드리스 테스트용 Chrome/Edge 를 찾지 못했습니다. TEST_BROWSER_PATH 로 경로를 지정하세요.',
    );
  }
  return found;
}
