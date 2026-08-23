const phases = [
  { name: '초반', from: 0, to: 25, gap: 2.15, speed: 285 },
  { name: '중반', from: 25, to: 52, gap: 1.8, speed: 335 },
  { name: '후반', from: 52, to: 78, gap: 1.48, speed: 385 },
];
const obstacles = [
  { kind: 'cone', cue: '▲', avoid: 'jump', window: [0.42, 0.92] },
  { kind: 'barrier', cue: '✦', avoid: 'dash', window: [0.34, 0.78] },
  { kind: 'puddle', cue: '≈', avoid: 'late-jump', window: [0.18, 0.58] },
];
let count = 0;
for (const phase of phases) {
  const spawns = Math.floor((phase.to - phase.from) / phase.gap);
  const reaction = 420 / phase.speed;
  if (reaction < 1.05) throw new Error(`${phase.name}: reaction time too short`);
  if (phase.gap < 1.45) throw new Error(`${phase.name}: impossible spawn gap`);
  count += spawns;
  console.log(`${phase.name}: ${spawns} obstacles, ${reaction.toFixed(2)}s visible reaction`);
}
for (const o of obstacles) {
  if (o.window[1] - o.window[0] < .35) throw new Error(`${o.kind}: avoidance window too narrow`);
}
const nominalSeconds = 500 / 6.65;
if (nominalSeconds < 60 || nominalSeconds > 120) throw new Error('session duration outside 60–120 seconds');
console.log(`PASS: ${obstacles.length} obstacle types, ${count} fair spawns, nominal ${nominalSeconds.toFixed(1)}s session`);
