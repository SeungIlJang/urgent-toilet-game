const CHECKPOINTS = [2, 10, 30, 75];

export class RunDiagnostics {
  constructor() {
    this.report = { startedAt: null, checkpoints: [], errors: [] };
    this.previousDistance = 0;
  }

  start() {
    this.report.startedAt = new Date().toISOString();
    this.report.checkpoints.length = 0;
    this.report.errors.length = 0;
    this.previousDistance = 0;
  }

  sample(elapsed, state, physicsPaused, distance) {
    const target = CHECKPOINTS[this.report.checkpoints.length];
    if (target === undefined || elapsed < target) return;
    const snapshot = {
      target,
      elapsed: Number(elapsed.toFixed(2)),
      state,
      physicsPaused,
      distance: Number(distance.toFixed(2)),
      distanceIncreased: distance > this.previousDistance,
    };
    snapshot.pass = state === 'playing' && physicsPaused === false && snapshot.distanceIncreased;
    this.report.checkpoints.push(snapshot);
    this.previousDistance = distance;
  }

  error(value) {
    this.report.errors.push(String(value?.stack || value?.message || value));
  }
}
