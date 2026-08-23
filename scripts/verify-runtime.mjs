import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RunDiagnostics } from '../src/run-diagnostics.js';
import { obstacleCandidates } from '../src/obstacle-selection.js';

const diagnostics = new RunDiagnostics();
diagnostics.start();
for (let elapsed = 0; elapsed <= 75.05; elapsed += .05) {
  diagnostics.sample(elapsed, 'playing', false, elapsed * 6.65);
}
assert.deepEqual(diagnostics.report.checkpoints.map(x => x.target), [2, 10, 30, 75]);
assert.ok(diagnostics.report.checkpoints.every(x => x.pass), 'playing/physics/distance checkpoint failed');

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
assert.ok(source.includes('disableVisibilityChange:true'), 'Phaser visibility pausing must be disabled');
assert.ok(!/visibilitychange|document\.hidden|pauseOnBlur|scene\.pause|timeScale\s*=/.test(source), 'automatic pause path remains');
assert.ok(!/serviceWorker\.register/.test(source), 'service worker registration remains');
assert.ok(source.includes("this.physics.add.overlap(this.player,this.obstacles"), 'collision handler missing');
assert.ok(source.includes("if(this.state==='over')return this.scene.restart({autoStart:true})"), 'restart path missing');
assert.ok(source.includes("this.pauseButton.on('pointerdown'"), 'manual pause button missing');

const obstacles = [{ kind: 'cone' }, { kind: 'barrier' }, { kind: 'puddle' }];
assert.deepEqual(
  obstacleCandidates(obstacles, 'cone', 14.3).map(x => x.kind),
  ['cone'],
  'tutorial spawn pool became empty after the first cone around 14–15s',
);
assert.deepEqual(
  obstacleCandidates(obstacles, 'cone', 18).map(x => x.kind),
  ['barrier', 'puddle'],
  'normal spawn pool must avoid repeating the previous obstacle',
);
assert.ok(source.includes('if(!spec)return'), 'empty obstacle pool guard missing');
console.log('PASS: 2/10/30/75s playing, physics active, distance advancing; 15s spawn regression guarded; auto-pause/SW absent; collision/restart wired');
