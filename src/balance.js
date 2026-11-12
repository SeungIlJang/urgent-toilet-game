// 웨이브 난이도 공식. main.js 와 scripts/verify-balance.mjs 가 같은 함수를 쓰도록 분리했다.
// (예전에는 검증 스크립트가 공식을 따로 적어 두어서, 게임과 다른 숫자를 검사하고도 PASS 했다.)

export const SPAWN_GAP_FLOOR = 220; // ms. 예전 150ms 는 WAVE 6 부터 걸려 8~12 구간이 벽이 됐다.
export const SPAWN_TOP = 36;        // 적이 생성되는 y. 화면 위(-40)에서 만들면 HUD 경계에 반쯤 잘린 채
                                    // 나타나 보기 나쁘다. 플레이 영역 안쪽에서 통째로 등장시킨다.
export const BASE_LINE = 812;       // 기지 판정선
export const RUSH_FROM = BASE_LINE - 230; // 이 아래로 내려오면 속도 1.7배
export const RUSH_MUL = 1.7;

/** 웨이브 w 에서 생성되는 일반 적 수 */
export const waveSpawnCount = w =>
  Math.round(6 + w * 2.7 + Math.max(0, w - 1) * 2 + Math.max(0, w - 2) * 2.4);

/** 웨이브 w 의 스폰 간격(ms) */
export const waveSpawnGap = w =>
  Math.max(SPAWN_GAP_FLOOR, 820 - w * 38 - Math.max(0, w - 3) * 26);

/** 웨이브 w 의 적 체력 배수 */
export const enemyHpMul = w =>
  1 + w * 0.24 + Math.max(0, w - 1) * 0.10 + Math.max(0, w - 2) * 0.19;

/** 웨이브 w 의 적 이동속도 배수 */
export const enemySpeedMul = w =>
  1 + w * 0.045 + Math.max(0, w - 1) * 0.02 + Math.max(0, w - 2) * 0.03;

// 한 번의 스폰 틱에서 적이 여러 마리 나오는 확률. 간격 하한과 곱해져 체감 밀도를 정한다.
// 예전에는 WAVE 5 부터 3연속(45%)이 열려 초당 12마리까지 쏟아졌다.
export const DOUBLE_FROM = 2, DOUBLE_PCT = 55;
export const TRIPLE_FROM = 8, TRIPLE_PCT = 30;

/** 스폰 틱 1회당 평균 적 수 */
export const spawnsPerTick = w =>
  1 + (w >= DOUBLE_FROM ? DOUBLE_PCT / 100 : 0) * (1 + (w >= TRIPLE_FROM ? TRIPLE_PCT / 100 : 0));

/** 웨이브 w 의 평균 적 등장 속도(마리/초). 체감 난이도는 적 수보다 이 값이 좌우한다. */
export const arrivalRate = w => spawnsPerTick(w) / (waveSpawnGap(w) / 1000);

// 보스는 5웨이브마다. 그 사이 웨이브는 잡졸만 나와 보스가 '사건'으로 느껴지게 한다.
export const BOSS_EVERY = 5;

/* W11 부터는 스폰 간격이 하한(220ms)에 걸려 도착률이 7.8/s 로 고정된다. 그 뒤로는 체력·속도
   배수만 올라서 후반이 순수 DPS 체크가 됐다 — 못 뚫으면 다음 판도 똑같이 못 뚫는다.
   엘리트 변종으로 '숫자' 대신 '구성'을 바꿔, 후반에도 대응할 거리를 남긴다. */
export const ELITE_FROM = 11;
export const ELITE_CAP = 0.35;
export const eliteChance = w => w < ELITE_FROM ? 0 : Math.min(ELITE_CAP, (w - ELITE_FROM + 1) * 0.05);
/** shield: 체력 2.4배 · swift: 속도 1.5배 · splitter: 죽을 때 분열 */
export const ELITE_KINDS = ['shield', 'swift', 'splitter'];
export const isBossWave = w => w % BOSS_EVERY === 0;
/** 보스 종류: 10웨이브마다 정화조, 첫 보스(5)는 소형, 나머지는 대형 */
export const bossKind = w => (!isBossWave(w) ? null : w % 10 === 0 ? 'septic' : w === BOSS_EVERY ? 'mini' : 'big');

/** 적이 화면 위에서 기지까지 닿는 데 걸리는 시간(초). 기지 근처 가속까지 반영한다. */
export function reachSeconds(baseSpeed, w) {
  const speed = baseSpeed * enemySpeedMul(w);
  return (RUSH_FROM - SPAWN_TOP) / speed + (BASE_LINE - RUSH_FROM) / (speed * RUSH_MUL);
}
