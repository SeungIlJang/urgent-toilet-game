export class TapInputState {
  constructor(doubleTapMs = 285) {
    this.doubleTapMs = doubleTapMs;
    this.reset();
  }

  reset() { this.lastTapAt = -Infinity; }

  resolve(gameState, now) {
    if (gameState === 'ready') { this.reset(); return 'start'; }
    if (gameState === 'over') { this.reset(); return 'restart'; }
    if (gameState === 'paused') { this.reset(); return 'resume'; }
    if (gameState !== 'playing') return 'ignore';
    if (now - this.lastTapAt <= this.doubleTapMs) {
      this.reset();
      return 'dash';
    }
    this.lastTapAt = now;
    return 'jump';
  }
}
