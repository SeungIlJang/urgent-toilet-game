import assert from 'node:assert/strict';
import { TapInputState } from '../src/input-state.js';

const input = new TapInputState(285);
assert.equal(input.resolve('ready', 0), 'start', 'start tap must not leak into gameplay');
assert.equal(input.resolve('playing', 50), 'jump', 'first gameplay tap must jump');
assert.equal(input.resolve('playing', 300), 'dash', 'second tap inside window must dash');
assert.equal(input.resolve('playing', 400), 'jump', 'dash must consume its tap pair');
assert.equal(input.resolve('paused', 500), 'resume', 'paused tap must only resume');
assert.equal(input.resolve('playing', 510), 'jump', 'resume tap must not become a dash');
input.reset();
assert.equal(input.resolve('playing', 1000), 'jump');
assert.equal(input.resolve('playing', 1286), 'jump', 'tap outside window must remain jump');
assert.equal(input.resolve('over', 1400), 'restart');
assert.equal(input.resolve('playing', 1410), 'jump', 'restart tap must not become a dash');
console.log('PASS: start/restart/pause/background reset and single/double tap transitions');
