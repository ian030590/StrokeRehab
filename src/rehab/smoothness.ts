import type { TrajectoryPoint } from "../types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function calculateTrajectorySmoothness(points: TrajectoryPoint[]) {
  if (points.length < 4) {
    return 100;
  }

  let distance = 0;
  let directionChanges = 0;
  let accelerationSum = 0;
  let accelerationSamples = 0;
  let previousAngle: number | null = null;
  let previousVelocity: { x: number; y: number } | null = null;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const dt = Math.max((current.t - previous.t) / 1000, 0.001);
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const segmentDistance = Math.hypot(dx, dy);

    distance += segmentDistance;

    if (segmentDistance > 0.015) {
      const angle = Math.atan2(dy, dx);
      if (
        previousAngle !== null &&
        Math.abs(Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle))) >
          Math.PI / 3
      ) {
        directionChanges += 1;
      }
      previousAngle = angle;
    }

    const velocity = { x: dx / dt, y: dy / dt };
    if (previousVelocity) {
      const acceleration = Math.hypot(
        (velocity.x - previousVelocity.x) / dt,
        (velocity.y - previousVelocity.y) / dt,
      );
      accelerationSum += acceleration;
      accelerationSamples += 1;
    }
    previousVelocity = velocity;
  }

  if (distance < 0.05) {
    return 100;
  }

  const meanAcceleration =
    accelerationSamples > 0 ? accelerationSum / accelerationSamples : 0;
  const directionPenalty = (directionChanges / points.length) * 55;
  const tremorPenalty = clamp(meanAcceleration / 9, 0, 55);

  return Math.round(clamp(100 - directionPenalty - tremorPenalty, 0, 100));
}
