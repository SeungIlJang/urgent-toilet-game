// 웨이브 밸런스 점검. 게임과 같은 공식(src/balance.js)을 그대로 import 해서,
// 검증 스크립트만 따로 숫자를 적어 두던 예전 방식처럼 어긋날 수 없게 했다.
import assert from 'node:assert/strict';
import {
  waveSpawnCount, waveSpawnGap, enemyHpMul, enemySpeedMul, reachSeconds, arrivalRate,
  bossKind, isBossWave, SPAWN_GAP_FLOOR, BOSS_EVERY, DOUBLE_FROM, TRIPLE_FROM,
} from '../src/balance.js';

// 동시 스폰이 열리는 웨이브는 의도된 계단이라 급증 검사에서 뺀다.
const UNLOCK_WAVES = new Set([DOUBLE_FROM, TRIPLE_FROM]);

const GERM_SPEED = 58;    // 가장 느린 상시 적
const WAVES = 20;
const MIN_REACH = 3.5;    // 적이 기지에 닿기까지 최소 반응 시간(초)
const MAX_ARRIVAL = 9;    // 초당 등장 수 상한. 넘으면 화면이 감당 안 되는 벽이 된다.

let prevCount = -1, prevHp = -1, prevRate = -1, bosses = 0;
for (let w = 1; w <= WAVES; w++) {
  const count = waveSpawnCount(w), gap = waveSpawnGap(w), rate = arrivalRate(w);
  const hp = enemyHpMul(w), speed = enemySpeedMul(w), reach = reachSeconds(GERM_SPEED, w);
  const kind = bossKind(w);
  if (kind) bosses++;

  assert.ok(count > prevCount, `wave ${w}: 적 수가 늘지 않음 (${prevCount} -> ${count})`);
  assert.ok(hp > prevHp, `wave ${w}: 체력 배수가 늘지 않음`);
  assert.ok(gap >= SPAWN_GAP_FLOOR, `wave ${w}: 스폰 간격이 하한 아래 (${gap}ms)`);
  assert.ok(reach >= MIN_REACH, `wave ${w}: 적이 기지에 너무 빨리 닿음 (${reach.toFixed(1)}s)`);
  assert.ok(rate <= MAX_ARRIVAL, `wave ${w}: 초당 등장 수가 과도함 (${rate.toFixed(1)}/s)`);
  // 난이도는 계단이 아니라 완만하게 올라야 한다. 한 웨이브에 1.35배 넘게 뛰면 벽이다.
  if (prevRate > 0 && !UNLOCK_WAVES.has(w))
    assert.ok(rate / prevRate < 1.35, `wave ${w}: 등장 속도가 급증 (x${(rate / prevRate).toFixed(2)})`);
  assert.equal(isBossWave(w), w % BOSS_EVERY === 0, `wave ${w}: 보스 주기 불일치`);
  prevCount = count; prevHp = hp; prevRate = rate;

  console.log(
    `WAVE ${String(w).padStart(2)}: 적 ${String(count).padStart(3)}마리 · ${String(gap).padStart(3)}ms 간격` +
    ` · ${rate.toFixed(1)}/s · HP x${hp.toFixed(2)} · 속도 x${speed.toFixed(2)} · 기지까지 ${reach.toFixed(1)}s` +
    (kind ? `  << ${kind} 보스` : ''),
  );
}

assert.equal(bosses, Math.floor(WAVES / BOSS_EVERY), `보스 수가 ${BOSS_EVERY}웨이브 주기와 다름`);
const floorAt = Array.from({ length: WAVES }, (_, i) => i + 1).find(w => waveSpawnGap(w) === SPAWN_GAP_FLOOR);
console.log(`NOTE: WAVE ${floorAt} 부터 스폰 간격이 하한(${SPAWN_GAP_FLOOR}ms)에 고정됩니다.`);
console.log(`NOTE: 보스는 ${BOSS_EVERY}웨이브마다 (${[5, 10, 15, 20].map(w => `${w}:${bossKind(w)}`).join(', ')})`);
console.log('PASS: 적 수/체력 단조 증가, 등장 속도 상한·급증 없음, 기지 도달 시간 확보, 보스 주기 일치');
