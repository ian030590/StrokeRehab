import type { HandFrame, TherapySettings, Vector3 } from "../types";

export interface NormalizedHandLandmark {
  x: number;
  y: number;
  z?: number;
}

export function landmarkDistance(
  a: NormalizedHandLandmark,
  b: NormalizedHandLandmark,
) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

export function calculateRollAngle(
  indexBase: NormalizedHandLandmark,
  pinkyBase: NormalizedHandLandmark,
) {
  const angle = Math.atan2(pinkyBase.y - indexBase.y, pinkyBase.x - indexBase.x);
  return (angle * 180) / Math.PI;
}

export function mapLandmarkToWorld(landmark: NormalizedHandLandmark): Vector3 {
  return [(0.5 - landmark.x) * 6.6, (0.55 - landmark.y) * 4.2, 0];
}

export function smoothVector(
  previous: Vector3,
  next: Vector3,
  smoothing: number,
): Vector3 {
  const keep = Math.min(Math.max(smoothing, 0), 0.92);
  const take = 1 - keep;
  return [
    previous[0] * keep + next[0] * take,
    previous[1] * keep + next[1] * take,
    previous[2] * keep + next[2] * take,
  ];
}

export function createHandFrameFromLandmarks(
  landmarks: NormalizedHandLandmark[],
  settings: TherapySettings,
  previousCursor: Vector3,
  time: number,
  handedness?: string,
  confidence?: number,
): HandFrame | null {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const palmCenter = landmarks[9];
  const indexBase = landmarks[5];
  const pinkyBase = landmarks[17];

  if (!thumbTip || !indexTip || !palmCenter || !indexBase || !pinkyBase) {
    return null;
  }

  const pinchDistance = landmarkDistance(thumbTip, indexTip);
  const rawCursor = mapLandmarkToWorld(palmCenter);

  return {
    time,
    handPresent: true,
    cursor: smoothVector(previousCursor, rawCursor, settings.cursorSmoothing),
    pinchDistance,
    isPinching: pinchDistance < settings.graspThreshold,
    rollAngle: calculateRollAngle(indexBase, pinkyBase),
    handedness,
    confidence,
    source: "camera",
  };
}
