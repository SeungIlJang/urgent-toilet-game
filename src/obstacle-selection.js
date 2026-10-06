export function obstacleCandidates(obstacles, lastKind, elapsed) {
  if (elapsed < 8) return obstacles.filter(obstacle => obstacle.kind === 'cone');
  return obstacles.filter(obstacle => obstacle.kind !== lastKind);
}
