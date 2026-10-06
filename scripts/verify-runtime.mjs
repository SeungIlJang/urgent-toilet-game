import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RunDiagnostics } from '../src/run-diagnostics.js';

// RunDiagnostics module remains the generic progress sampler.
const diagnostics = new RunDiagnostics();
diagnostics.start();
for (let t = 0, d = 0; t <= 75.05; t += 0.05) {
  d += 0.05;
  diagnostics.sample(t, 'playing', false, d);
}
assert.deepEqual(diagnostics.report.checkpoints.map(x => x.target), [2, 10, 30, 75]);
assert.ok(diagnostics.report.checkpoints.every(x => x.pass), 'playing/active/progress checkpoint failed');

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
assert.ok(source.includes('disableVisibilityChange:true'), 'Phaser visibility pausing must be disabled');
assert.ok(!/visibilitychange|document\.hidden|pauseOnBlur|scene\.pause|timeScale\s*=/.test(source), 'automatic pause path remains');
assert.ok(!/serviceWorker\.register/.test(source), 'service worker registration remains');
assert.ok(source.includes("if(this.state==='over')return this.scene.restart({autoStart:true})"), 'restart path missing');
assert.ok(source.includes("this.pauseButton.on('pointerdown'"), 'manual pause button missing');
// Defense-game wiring must be present.
assert.ok(source.includes('spawnEnemy'), 'enemy spawner missing');
assert.ok(source.includes('throwBomb'), 'bomb action missing');
assert.ok(source.includes('baseHit'), 'base damage handler missing');
assert.ok(source.includes('startWave'), 'wave loop missing');
console.log('PASS: diagnostics checkpoints; auto-pause/SW absent; restart/pause wired; defense wave/enemy/bomb/base handlers present');
