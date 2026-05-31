import { create } from "zustand";
import type {
  GamePhase,
  HandFrame,
  RoundRecord,
  SessionExport,
  SessionMetrics,
  TherapySettings,
  TrackingSource,
  TrajectoryPoint,
  Vector3,
} from "../types";
import { calculateTrajectorySmoothness } from "../rehab/smoothness";

export const SOURCE_CUP_POSITION: Vector3 = [-2.65, -0.45, 0];
export const TARGET_POSITIONS: Vector3[] = [
  [2.4, -0.35, 0],
  [1.85, 0.85, 0],
  [2.75, 0.55, 0],
  [1.45, -1.05, 0],
  [2.95, -0.9, 0],
];

export const defaultSettings: TherapySettings = {
  graspThreshold: 0.075,
  pourAngleThreshold: 45,
  dropDebounceMs: 300,
  pourHoldMs: 2000,
  fatigueAssistMs: 15000,
  cupsPerSession: 5,
  cursorSmoothing: 0.55,
  affectedSide: "right",
  assistLevel: "standard",
};

const initialMetrics: SessionMetrics = {
  successfulGrasps: 0,
  drops: 0,
  completedCups: 0,
  averageCompletionMs: 0,
  maxRomDeg: 0,
  trajectorySmoothness: 100,
};

const distance2d = (a: Vector3, b: Vector3) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const getTargetForRound = (roundIndex: number) =>
  TARGET_POSITIONS[roundIndex % TARGET_POSITIONS.length];

const createRoundRecord = (
  roundIndex: number,
  target: Vector3,
  now: number,
): RoundRecord => ({
  round: roundIndex + 1,
  target,
  startedAt: now,
  drops: 0,
  maxRomDeg: 0,
  assistanceApplied: false,
  trajectory: [],
});

const formatRatio = (successfulGrasps: number, drops: number) => {
  if (drops === 0) {
    return `${successfulGrasps}:0`;
  }
  return `${(successfulGrasps / drops).toFixed(2)}:1`;
};

const toIso = (time?: number) => (time ? new Date(time).toISOString() : undefined);

const summarizeRounds = (
  rounds: RoundRecord[],
  completedCups: number,
  currentMetrics: SessionMetrics,
): SessionMetrics => {
  const completionTimes = rounds
    .map((round) => round.completionTimeMs)
    .filter((time): time is number => typeof time === "number");
  const smoothnessScores = rounds
    .map((round) => round.smoothnessScore)
    .filter((score): score is number => typeof score === "number");

  return {
    ...currentMetrics,
    completedCups,
    averageCompletionMs:
      completionTimes.length > 0
        ? Math.round(
            completionTimes.reduce((sum, time) => sum + time, 0) /
              completionTimes.length,
          )
        : 0,
    maxRomDeg: Math.round(
      Math.max(currentMetrics.maxRomDeg, ...rounds.map((round) => round.maxRomDeg), 0),
    ),
    trajectorySmoothness:
      smoothnessScores.length > 0
        ? Math.round(
            smoothnessScores.reduce((sum, score) => sum + score, 0) /
              smoothnessScores.length,
          )
        : currentMetrics.trajectorySmoothness,
  };
};

interface GameStore {
  phase: GamePhase;
  message: string;
  settings: TherapySettings;
  startedAt: number | null;
  endedAt: number | null;
  successUntil: number | null;
  roundIndex: number;
  currentTarget: Vector3;
  activePourAngleThreshold: number;
  cupPosition: Vector3;
  cursor: Vector3;
  handPresent: boolean;
  trackingSource: TrackingSource;
  pinchDistance: number;
  isPinching: boolean;
  rollAngle: number;
  handedness?: string;
  confidence?: number;
  isGrabbed: boolean;
  hoverSource: boolean;
  overTarget: boolean;
  pourProgress: number;
  releaseStartedAt: number | null;
  arrivalAt: number | null;
  lastFrameTime: number | null;
  rounds: RoundRecord[];
  currentRound: RoundRecord | null;
  metrics: SessionMetrics;
  startSession: () => void;
  resetSession: () => void;
  updateSettings: (settings: Partial<TherapySettings>) => void;
  updateHandFrame: (frame: HandFrame) => void;
  tick: () => void;
  createExport: () => SessionExport;
}

const baseState = {
  phase: "setup" as GamePhase,
  message: "開始後將手移到水杯上方。",
  settings: defaultSettings,
  startedAt: null,
  endedAt: null,
  successUntil: null,
  roundIndex: 0,
  currentTarget: getTargetForRound(0),
  activePourAngleThreshold: defaultSettings.pourAngleThreshold,
  cupPosition: SOURCE_CUP_POSITION,
  cursor: [0, 0, 0] as Vector3,
  handPresent: false,
  trackingSource: "none" as TrackingSource,
  pinchDistance: 0,
  isPinching: false,
  rollAngle: 0,
  handedness: undefined,
  confidence: undefined,
  isGrabbed: false,
  hoverSource: false,
  overTarget: false,
  pourProgress: 0,
  releaseStartedAt: null,
  arrivalAt: null,
  lastFrameTime: null,
  rounds: [] as RoundRecord[],
  currentRound: null as RoundRecord | null,
  metrics: initialMetrics,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...baseState,

  startSession: () => {
    const now = Date.now();
    const target = getTargetForRound(0);

    set({
      ...baseState,
      settings: get().settings,
      phase: "targeting",
      message: "將手部游標移到水杯，捏合手指抓起。",
      startedAt: now,
      currentTarget: target,
      currentRound: createRoundRecord(0, target, now),
      activePourAngleThreshold: get().settings.pourAngleThreshold,
    });
  },

  resetSession: () => {
    set({
      ...baseState,
      settings: get().settings,
      activePourAngleThreshold: get().settings.pourAngleThreshold,
    });
  },

  updateSettings: (settings) => {
    set((state) => {
      const nextSettings = { ...state.settings, ...settings };
      return {
        settings: nextSettings,
        activePourAngleThreshold:
          typeof settings.pourAngleThreshold === "number"
            ? settings.pourAngleThreshold
            : state.activePourAngleThreshold,
      };
    });
  },

  updateHandFrame: (frame) => {
    set((state) => {
      const trackingPatch = {
        cursor: frame.cursor,
        handPresent: frame.handPresent,
        trackingSource: frame.source,
        pinchDistance: frame.pinchDistance,
        isPinching: frame.isPinching,
        rollAngle: frame.rollAngle,
        handedness: frame.handedness,
        confidence: frame.confidence,
        lastFrameTime: frame.time,
      };

      if (state.phase === "setup" || state.phase === "completed") {
        return trackingPatch;
      }

      if (!frame.handPresent) {
        return {
          ...trackingPatch,
          message: "請將手移回鏡頭範圍內。",
        };
      }

      if (state.phase === "success") {
        return trackingPatch;
      }

      const now = frame.time;
      const dt = state.lastFrameTime ? Math.max(now - state.lastFrameTime, 16) : 16;
      const hoverSource = distance2d(frame.cursor, SOURCE_CUP_POSITION) < 0.62;
      const overTarget = distance2d(frame.cursor, state.currentTarget) < 0.72;
      const absRoll = Math.min(120, Math.abs(frame.rollAngle));
      const updatedMetrics = {
        ...state.metrics,
        maxRomDeg: Math.max(state.metrics.maxRomDeg, absRoll),
      };

      if (state.phase === "targeting") {
        if (hoverSource && frame.isPinching) {
          const currentRound =
            state.currentRound ??
            createRoundRecord(state.roundIndex, state.currentTarget, now);

          return {
            ...trackingPatch,
            hoverSource,
            overTarget,
            phase: "transporting",
            message: "保持捏合，移到空杯上方。",
            isGrabbed: true,
            cupPosition: frame.cursor,
            releaseStartedAt: null,
            arrivalAt: null,
            pourProgress: 0,
            currentRound: {
              ...currentRound,
              graspedAt: now,
              maxRomDeg: Math.max(currentRound.maxRomDeg, absRoll),
            },
            metrics: {
              ...updatedMetrics,
              successfulGrasps: updatedMetrics.successfulGrasps + 1,
            },
          };
        }

        return {
          ...trackingPatch,
          hoverSource,
          overTarget,
          message: hoverSource ? "請捏合手指抓起水杯。" : "將手部游標移到水杯。",
          metrics: updatedMetrics,
        };
      }

      if (state.phase !== "transporting" && state.phase !== "pouring") {
        return {
          ...trackingPatch,
          hoverSource,
          overTarget,
          metrics: updatedMetrics,
        };
      }

      const currentRound =
        state.currentRound ?? createRoundRecord(state.roundIndex, state.currentTarget, now);
      const shouldDrop =
        !frame.isPinching &&
        state.releaseStartedAt !== null &&
        now - state.releaseStartedAt > state.settings.dropDebounceMs;

      if (!frame.isPinching && state.releaseStartedAt === null) {
        return {
          ...trackingPatch,
          hoverSource,
          overTarget,
          message: "保持捏合，水杯才會維持抓握。",
          cupPosition: frame.cursor,
          releaseStartedAt: now,
          currentRound,
          metrics: updatedMetrics,
        };
      }

      if (shouldDrop) {
        return {
          ...trackingPatch,
          hoverSource: false,
          overTarget: false,
          phase: "targeting",
          message: "水杯已回到吧台，請重新抓握。",
          isGrabbed: false,
          cupPosition: SOURCE_CUP_POSITION,
          releaseStartedAt: null,
          arrivalAt: null,
          pourProgress: 0,
          currentRound: {
            ...currentRound,
            drops: currentRound.drops + 1,
            maxRomDeg: Math.max(currentRound.maxRomDeg, absRoll),
          },
          metrics: {
            ...updatedMetrics,
            drops: updatedMetrics.drops + 1,
          },
        };
      }

      let activePourAngleThreshold = state.activePourAngleThreshold;
      let arrivalAt = overTarget ? state.arrivalAt ?? now : null;
      let currentRoundPatch: RoundRecord = {
        ...currentRound,
        maxRomDeg: Math.max(currentRound.maxRomDeg, absRoll),
      };

      if (
        overTarget &&
        arrivalAt &&
        now - arrivalAt > state.settings.fatigueAssistMs &&
        activePourAngleThreshold >= state.settings.pourAngleThreshold
      ) {
        activePourAngleThreshold = Math.max(24, state.settings.pourAngleThreshold - 12);
        currentRoundPatch = {
          ...currentRoundPatch,
          assistanceApplied: true,
        };
      }

      const trajectoryPoint: TrajectoryPoint = {
        x: frame.cursor[0],
        y: frame.cursor[1],
        t: now,
        rollAngle: absRoll,
      };
      const lastPoint =
        currentRoundPatch.trajectory[currentRoundPatch.trajectory.length - 1];
      const trajectory =
        !lastPoint || now - lastPoint.t > 70
          ? [...currentRoundPatch.trajectory, trajectoryPoint]
          : currentRoundPatch.trajectory;

      currentRoundPatch = {
        ...currentRoundPatch,
        trajectory,
      };

      const isPouring = overTarget && absRoll >= activePourAngleThreshold;
      const pourProgress = isPouring
        ? Math.min(1, state.pourProgress + dt / state.settings.pourHoldMs)
        : Math.max(0, state.pourProgress - dt / 6000);

      if (pourProgress >= 1) {
        const completedRound: RoundRecord = {
          ...currentRoundPatch,
          completedAt: now,
          completionTimeMs: currentRoundPatch.graspedAt
            ? now - currentRoundPatch.graspedAt
            : now - currentRoundPatch.startedAt,
          smoothnessScore: calculateTrajectorySmoothness(currentRoundPatch.trajectory),
        };
        const rounds = [...state.rounds, completedRound];
        const completedCups = state.metrics.completedCups + 1;

        return {
          ...trackingPatch,
          hoverSource,
          overTarget,
          phase: "success",
          message: "倒水完成。",
          successUntil: now + 1200,
          isGrabbed: false,
          cupPosition: state.currentTarget,
          releaseStartedAt: null,
          arrivalAt: null,
          pourProgress: 1,
          rounds,
          currentRound: null,
          metrics: summarizeRounds(rounds, completedCups, {
            ...updatedMetrics,
            completedCups,
          }),
        };
      }

      return {
        ...trackingPatch,
        hoverSource,
        overTarget,
        phase: isPouring ? "pouring" : "transporting",
        message: isPouring
          ? "維持旋轉角度，完成倒水。"
          : overTarget
            ? "轉動手腕開始倒水。"
            : "保持捏合，移到空杯上方。",
        isGrabbed: true,
        cupPosition: frame.cursor,
        releaseStartedAt: frame.isPinching ? null : state.releaseStartedAt,
        arrivalAt,
        pourProgress,
        activePourAngleThreshold,
        currentRound: currentRoundPatch,
        metrics: updatedMetrics,
      };
    });
  },

  tick: () => {
    set((state) => {
      if (state.phase !== "success" || !state.successUntil || Date.now() < state.successUntil) {
        return {};
      }

      if (state.metrics.completedCups >= state.settings.cupsPerSession) {
        return {
          phase: "completed",
          message: "本次訓練完成。",
          endedAt: Date.now(),
          successUntil: null,
          currentRound: null,
          isGrabbed: false,
          cupPosition: SOURCE_CUP_POSITION,
        };
      }

      const nextRoundIndex = state.roundIndex + 1;
      const target = getTargetForRound(nextRoundIndex);

      return {
        phase: "targeting",
        message: "下一杯：將手部游標移到水杯。",
        successUntil: null,
        roundIndex: nextRoundIndex,
        currentTarget: target,
        activePourAngleThreshold: state.settings.pourAngleThreshold,
        cupPosition: SOURCE_CUP_POSITION,
        pourProgress: 0,
        hoverSource: false,
        overTarget: false,
        releaseStartedAt: null,
        arrivalAt: null,
        currentRound: createRoundRecord(nextRoundIndex, target, Date.now()),
      };
    });
  },

  createExport: () => {
    const state = get();
    const activeRound =
      state.currentRound && state.phase !== "completed" ? [state.currentRound] : [];
    const rounds = [...state.rounds, ...activeRound];

    return {
      game: "cafe-barista",
      exportedAt: new Date().toISOString(),
      startedAt: state.startedAt ? new Date(state.startedAt).toISOString() : null,
      endedAt: state.endedAt ? new Date(state.endedAt).toISOString() : null,
      settings: state.settings,
      summary: {
        ...state.metrics,
        plannedCups: state.settings.cupsPerSession,
        graspToDropRatio: formatRatio(
          state.metrics.successfulGrasps,
          state.metrics.drops,
        ),
      },
      rounds: rounds.map(({ startedAt, graspedAt, completedAt, ...round }) => ({
        ...round,
        startedAt: toIso(startedAt) ?? new Date().toISOString(),
        graspedAt: toIso(graspedAt),
        completedAt: toIso(completedAt),
      })),
    };
  },
}));
