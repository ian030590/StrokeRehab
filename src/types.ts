export type Vector3 = [number, number, number];

export type GamePhase =
  | "setup"
  | "targeting"
  | "transporting"
  | "pouring"
  | "success"
  | "completed";

export type TrackingSource = "none" | "camera" | "demo";

export type AssistLevel = "light" | "standard" | "high";

export type AffectedSide = "left" | "right" | "bilateral";

export interface TherapySettings {
  graspThreshold: number;
  pourAngleThreshold: number;
  dropDebounceMs: number;
  pourHoldMs: number;
  fatigueAssistMs: number;
  cupsPerSession: number;
  cursorSmoothing: number;
  affectedSide: AffectedSide;
  assistLevel: AssistLevel;
}

export interface HandFrame {
  time: number;
  handPresent: boolean;
  cursor: Vector3;
  pinchDistance: number;
  isPinching: boolean;
  rollAngle: number;
  handedness?: string;
  confidence?: number;
  source: TrackingSource;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
  rollAngle: number;
}

export interface RoundRecord {
  round: number;
  target: Vector3;
  startedAt: number;
  graspedAt?: number;
  completedAt?: number;
  completionTimeMs?: number;
  drops: number;
  maxRomDeg: number;
  smoothnessScore?: number;
  assistanceApplied: boolean;
  trajectory: TrajectoryPoint[];
}

export interface SessionMetrics {
  successfulGrasps: number;
  drops: number;
  completedCups: number;
  averageCompletionMs: number;
  maxRomDeg: number;
  trajectorySmoothness: number;
}

export interface SessionExport {
  game: "cafe-barista";
  exportedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  settings: TherapySettings;
  summary: SessionMetrics & {
    plannedCups: number;
    graspToDropRatio: string;
  };
  rounds: Array<
    Omit<RoundRecord, "startedAt" | "graspedAt" | "completedAt"> & {
      startedAt: string;
      graspedAt?: string;
      completedAt?: string;
    }
  >;
}
