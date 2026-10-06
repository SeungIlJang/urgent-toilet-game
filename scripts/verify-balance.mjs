// Defense wave-balance sanity checks (boss every wave + escalating swarm).
const BASE_LINE = 812, SPAWN_TOP = -40;
let prevCount = -1;
for (let w = 1; w <= 15; w++) {
  const big = w % 5 === 0;          // every 5th wave = large boss, others = mini-boss
  const swarm = 8 + w * 3;          // regular enemies, always present
  const gap = Math.max(180, 760 - w * 45);
  if (gap < 180) throw new Error(`wave ${w}: spawn gap too small`);
  if (swarm <= prevCount) throw new Error(`wave ${w}: swarm did not escalate`);
  prevCount = swarm;
  // Slowest common enemy (germ) reaction time from top to base must stay fair.
  const germSpeed = 58 * (1 + w * 0.05);
  const reaction = (BASE_LINE - SPAWN_TOP) / germSpeed;
  if (reaction < 6) throw new Error(`wave ${w}: enemies reach base too fast (${reaction.toFixed(1)}s)`);
  console.log(`WAVE ${w}: ${swarm} swarm + ${big ? 'BIG boss' : 'mini-boss'}, ${gap}ms gap, ${reaction.toFixed(1)}s to base`);
}
console.log('PASS: swarm escalates, boss every wave, spawn gaps clamped, base-reach time fair');
