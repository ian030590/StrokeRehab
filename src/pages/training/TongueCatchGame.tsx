import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import type { KNNClassifier } from '@tensorflow-models/knn-classifier';
import * as tf from '@tensorflow/tfjs';
import {
  Application,
  Container,
  Graphics,
  MeshRope,
  Point,
  Texture,
  type Ticker,
} from 'pixi.js';
import { initJsPsych } from 'jspsych';
import { useT, type TranslationKey } from '../../i18n';
import { downloadCsvFile } from '../../utils/downloadFile';
import { getActiveUser } from '../../utils/settings';
import {
  playFailureSound,
  playGameEndSound,
  playSuccessSound,
  prepareAudioFeedback,
} from '../../utils/soundManager';
import {
  DEFAULT_TONGUE_SETTINGS,
  getTongueTrainingSettings,
  loadTongueClassifier,
  saveTongueClassifier,
  saveTongueTrainingSettings,
  type SerializedTongueClassifier,
  type TongueTrainingSettings,
} from '../../utils/tongueRehabStorage';
import { saveTrainingSessionRecord } from '../../utils/trainingRecords';
import { clamp, csvCell, formatTestDate, writeJsPsychData } from './gameUtils';
import { verifySelectedTrainingUser } from './selectedUserGuard';

type TongueClass = 'Rest' | 'Tongue_Left' | 'Tongue_Right';
type GamePhase = 'menu' | 'initializing' | 'calibration' | 'playing' | 'paused' | 'results';

interface TongueCatchGameProps {
  onExit: () => void;
}

interface CalibrationStep {
  label: TongueClass;
  titleKey: TranslationKey;
  instructionKey: TranslationKey;
}

interface AppleSprite {
  view: Container;
  size: number;
}

interface TongueScene {
  root: Container;
  tongue: MeshRope;
  tongueTexture: Texture;
  points: Point[];
  apples: AppleSprite[];
  mouthX: number;
  mouthY: number;
  tongueLength: number;
  tongueDirection: -1 | 0 | 1;
  spawnElapsed: number;
}

interface RecognitionState {
  label: TongueClass;
  confidence: number;
  faceVisible: boolean;
}

interface SessionMetrics {
  startedAt: number;
  elapsed: number;
  score: number;
  missed: number;
  holdStartedAt: number | null;
  holdDirection: TongueClass | null;
  holdDurations: number[];
}

interface SessionResult {
  Test_Date: string;
  Participant_ID: string;
  Duration_Seconds: number;
  Score: number;
  Missed: number;
  Average_Hold_Seconds: number;
  Sensitivity: number;
  Growth_Rate_PX_Per_Second: number;
  Apple_Speed_PX_Per_Second: number;
  Spawn_Interval_Seconds: number;
  Edge_Chance_Percent: number;
}

const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const DETECTION_INTERVAL_MS = 72;
const CALIBRATION_CAPTURE_MS = 1900;
const MIN_CLASS_EXAMPLES = 10;
const MOUTH_FEATURE_WIDTH = 32;
const MOUTH_FEATURE_HEIGHT = 24;
const MAX_TONGUE_SEGMENTS = 10;
const CALIBRATION_STEPS: readonly CalibrationStep[] = [
  {
    label: 'Rest',
    titleKey: 'tongue.calibration.restTitle',
    instructionKey: 'tongue.calibration.restInstruction',
  },
  {
    label: 'Tongue_Left',
    titleKey: 'tongue.calibration.leftTitle',
    instructionKey: 'tongue.calibration.leftInstruction',
  },
  {
    label: 'Tongue_Right',
    titleKey: 'tongue.calibration.rightTitle',
    instructionKey: 'tongue.calibration.rightInstruction',
  },
];
const LIP_LANDMARK_INDICES = Array.from(new Set(
  FaceLandmarker.FACE_LANDMARKS_LIPS.flatMap((connection) => [connection.start, connection.end]),
));

export function TongueCatchGame({ onExit }: TongueCatchGameProps) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const featureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixiHostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<TongueScene | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionAtRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const classifierRef = useRef<KNNClassifier | null>(null);
  const predictionBusyRef = useRef(false);
  const mountedRef = useRef(true);
  const phaseRef = useRef<GamePhase>('menu');
  const calibrationIndexRef = useRef(0);
  const calibrationCaptureRef = useRef({
    active: false,
    startedAt: 0,
    samples: 0,
  });
  const lastMouthRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: 0.5,
    y: 0.64,
    visible: false,
  });
  const recognitionRef = useRef<RecognitionState>({
    label: 'Rest',
    confidence: 0,
    faceVisible: false,
  });
  const configRef = useRef<TongueTrainingSettings>({ ...DEFAULT_TONGUE_SETTINGS });
  const metricsRef = useRef<SessionMetrics>(createSessionMetrics());
  const jsPsychRef = useRef<ReturnType<typeof initJsPsych> | null>(null);
  const finishSessionRef = useRef<() => void>(() => undefined);
  const lastHudUpdateRef = useRef(0);

  const activeUser = getActiveUser() || '';
  const [phase, setPhaseState] = useState<GamePhase>('menu');
  const [config, setConfig] = useState<TongueTrainingSettings>(() => (
    activeUser ? getTongueTrainingSettings(activeUser) : { ...DEFAULT_TONGUE_SETTINGS }
  ));
  const [hasCalibration, setHasCalibration] = useState(false);
  const [lastCalibrated, setLastCalibrated] = useState('');
  const [calibrationIndex, setCalibrationIndex] = useState(0);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [visionError, setVisionError] = useState('');
  const [recognition, setRecognition] = useState<RecognitionState>(recognitionRef.current);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);

  const setPhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => {
    configRef.current = config;
    if (activeUser) saveTongueTrainingSettings(activeUser, config);
  }, [activeUser, config]);

  useEffect(() => {
    jsPsychRef.current = initJsPsych();
  }, []);

  useEffect(() => {
    if (!activeUser) return;
    let cancelled = false;
    setConfig(getTongueTrainingSettings(activeUser));
    void loadTongueClassifier(activeUser)
      .then((saved) => {
        if (cancelled) return;
        setHasCalibration(Boolean(saved && hasCompleteDataset(saved)));
        setLastCalibrated(saved?.lastCalibrated ?? '');
      })
      .catch((error) => console.warn('Unable to inspect saved tongue classifier.', error));
    return () => {
      cancelled = true;
    };
  }, [activeUser]);

  const stopVision = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    faceLandmarkerRef.current?.close();
    faceLandmarkerRef.current = null;
    predictionBusyRef.current = false;
    lastMouthRef.current.visible = false;
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    stopVision();
    classifierRef.current?.dispose();
    classifierRef.current = null;
  }, [stopVision]);

  const syncRecognition = useCallback((next: RecognitionState) => {
    recognitionRef.current = next;
    setRecognition(next);
  }, []);

  const beginGame = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    resetTongueScene(app, sceneRef);
    metricsRef.current = {
      ...createSessionMetrics(),
      startedAt: performance.now(),
    };
    recognitionRef.current = { label: 'Rest', confidence: 0, faceVisible: false };
    setRecognition(recognitionRef.current);
    setElapsedSeconds(0);
    setScore(0);
    setMissed(0);
    setResult(null);
    setStatusMessage(t('tongue.game.ready'));
    lastHudUpdateRef.current = 0;
    setPhase('playing');
  }, [setPhase, t]);

  const finishCalibrationStep = useCallback(async () => {
    if (!calibrationCaptureRef.current.active) return;
    calibrationCaptureRef.current.active = false;
    setIsCapturing(false);
    setCalibrationProgress(1);
    const currentStep = CALIBRATION_STEPS[calibrationIndexRef.current];
    writeJsPsychData(jsPsychRef, {
      trial_type: 'tongue-calibration',
      class_label: currentStep.label,
      sample_count: calibrationCaptureRef.current.samples,
      participant_id: getActiveUser() || 'Unknown',
    }, 'Unable to write tongue calibration data to jsPsych.');

    const nextIndex = calibrationIndexRef.current + 1;
    if (nextIndex < CALIBRATION_STEPS.length) {
      calibrationIndexRef.current = nextIndex;
      setCalibrationIndex(nextIndex);
      window.setTimeout(() => setCalibrationProgress(0), 180);
      return;
    }

    const classifier = classifierRef.current;
    const userId = getActiveUser();
    if (!classifier || !userId) return;
    try {
      const saved = await saveTongueClassifier(userId, classifier);
      if (!mountedRef.current) return;
      setHasCalibration(true);
      setLastCalibrated(saved.lastCalibrated);
      setStatusMessage(t('tongue.calibration.saved'));
      beginGame();
    } catch (error) {
      console.error('Unable to save tongue classifier.', error);
      setVisionError(t('tongue.error.storage'));
      setPhase('menu');
      stopVision();
    }
  }, [setPhase, stopVision, t]);

  const classifyFeature = useCallback(async (feature: tf.Tensor) => {
    const classifier = classifierRef.current;
    if (!classifier || predictionBusyRef.current) {
      feature.dispose();
      return;
    }
    predictionBusyRef.current = true;
    try {
      const prediction = await classifier.predictClass(feature, 3);
      if (!mountedRef.current || phaseRef.current !== 'playing') return;
      const label = isTongueClass(prediction.label) ? prediction.label : 'Rest';
      const confidence = prediction.confidences[prediction.label] ?? 0;
      const acceptedLabel = confidence >= configRef.current.sensitivity ? label : 'Rest';
      syncRecognition({
        label: acceptedLabel,
        confidence,
        faceVisible: true,
      });
    } catch (error) {
      console.warn('Tongue KNN prediction failed.', error);
    } finally {
      feature.dispose();
      predictionBusyRef.current = false;
    }
  }, [syncRecognition]);

  const processFrame = useCallback((now: number) => {
    animationFrameRef.current = window.requestAnimationFrame(processFrame);
    if (phaseRef.current !== 'calibration' && phaseRef.current !== 'playing') return;
    if (now - lastDetectionAtRef.current < DETECTION_INTERVAL_MS) return;
    const video = videoRef.current;
    const landmarker = faceLandmarkerRef.current;
    const featureCanvas = featureCanvasRef.current;
    if (!video || !landmarker || !featureCanvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (video.currentTime === lastVideoTimeRef.current) return;
    lastVideoTimeRef.current = video.currentTime;
    lastDetectionAtRef.current = now;

    try {
      const detection = landmarker.detectForVideo(video, now);
      const landmarks = detection.faceLandmarks[0];
      if (!landmarks) {
        lastMouthRef.current.visible = false;
        if (phaseRef.current === 'playing') {
          syncRecognition({ label: 'Rest', confidence: 0, faceVisible: false });
        }
        return;
      }

      const mouth = calculateMouthAnchor(landmarks);
      lastMouthRef.current = { ...mouth, visible: true };
      const feature = extractMouthFeature(video, featureCanvas, landmarks);
      if (phaseRef.current === 'calibration') {
        if (!calibrationCaptureRef.current.active) {
          feature.dispose();
          return;
        }
        const step = CALIBRATION_STEPS[calibrationIndexRef.current];
        classifierRef.current?.addExample(feature, step.label);
        feature.dispose();
        calibrationCaptureRef.current.samples += 1;
        const progress = clamp((now - calibrationCaptureRef.current.startedAt) / CALIBRATION_CAPTURE_MS, 0, 1);
        setCalibrationProgress(progress);
        if (progress >= 1 && calibrationCaptureRef.current.samples >= MIN_CLASS_EXAMPLES) {
          void finishCalibrationStep();
        }
        return;
      }

      void classifyFeature(feature);
    } catch (error) {
      console.warn('Face landmark detection failed.', error);
    }
  }, [classifyFeature, finishCalibrationStep, syncRecognition]);

  const startSession = useCallback(async (forceCalibration: boolean) => {
    if (!verifySelectedTrainingUser(t)) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setVisionError(t('tongue.error.unsupported'));
      return;
    }
    prepareAudioFeedback(jsPsychRef);
    stopVision();
    setVisionError('');
    setStatusMessage(t('tongue.loading.camera'));
    setPhase('initializing');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
      });
      cameraStreamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Camera preview is unavailable.');
      video.srcObject = stream;
      await video.play();

      setStatusMessage(t('tongue.loading.model'));
      await tf.ready();
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      if (!mountedRef.current) {
        landmarker.close();
        return;
      }
      faceLandmarkerRef.current = landmarker;

      classifierRef.current?.dispose();
      const classifier = knnClassifier.create();
      classifierRef.current = classifier;
      const userId = getActiveUser() || '';
      const saved = forceCalibration ? null : await loadTongueClassifier(userId);
      if (saved && hasCompleteDataset(saved)) restoreClassifierDataset(classifier, saved);

      lastDetectionAtRef.current = 0;
      lastVideoTimeRef.current = -1;
      animationFrameRef.current = window.requestAnimationFrame(processFrame);
      if (forceCalibration || !saved || !hasCompleteDataset(saved)) {
        classifier.clearAllClasses();
        calibrationIndexRef.current = 0;
        calibrationCaptureRef.current = { active: false, startedAt: 0, samples: 0 };
        setCalibrationIndex(0);
        setCalibrationProgress(0);
        setIsCapturing(false);
        setPhase('calibration');
      } else {
        beginGame();
      }
    } catch (error) {
      console.error('Unable to initialize tongue training.', error);
      stopVision();
      setVisionError(error instanceof DOMException && error.name === 'NotAllowedError'
        ? t('tongue.error.permission')
        : t('tongue.error.initialization'));
      setPhase('menu');
    }
  }, [beginGame, processFrame, setPhase, stopVision, t]);

  const startCalibrationCapture = useCallback(() => {
    const classifier = classifierRef.current;
    const step = CALIBRATION_STEPS[calibrationIndexRef.current];
    if (!classifier || !step) return;
    if ((classifier.getClassExampleCount()[step.label] ?? 0) > 0) {
      classifier.clearClass(step.label);
    }
    calibrationCaptureRef.current = {
      active: true,
      startedAt: performance.now(),
      samples: 0,
    };
    setCalibrationProgress(0);
    setIsCapturing(true);
  }, []);

  const finishSession = useCallback(() => {
    if (phaseRef.current !== 'playing' && phaseRef.current !== 'paused') return;
    const metrics = metricsRef.current;
    closeActiveHold(metrics, performance.now());
    const configSnapshot = configRef.current;
    const participantId = getActiveUser() || 'Unknown';
    const averageHold = metrics.holdDurations.length > 0
      ? metrics.holdDurations.reduce((total, value) => total + value, 0) / metrics.holdDurations.length
      : 0;
    const session: SessionResult = {
      Test_Date: formatTestDate(new Date()),
      Participant_ID: participantId,
      Duration_Seconds: Number(metrics.elapsed.toFixed(1)),
      Score: metrics.score,
      Missed: metrics.missed,
      Average_Hold_Seconds: Number(averageHold.toFixed(2)),
      Sensitivity: configSnapshot.sensitivity,
      Growth_Rate_PX_Per_Second: configSnapshot.growthRate,
      Apple_Speed_PX_Per_Second: configSnapshot.appleSpeed,
      Spawn_Interval_Seconds: configSnapshot.spawnIntervalSec,
      Edge_Chance_Percent: Math.round(configSnapshot.edgeChance * 100),
    };
    setResult(session);
    setPhase('results');
    stopVision();
    playGameEndSound('Victory', jsPsychRef);
    void saveTrainingSessionRecord({
      userName: participantId,
      moduleId: 'speech-training',
      moduleName: t('home.module.speech.title'),
      gameId: 'tongue-catch',
      gameTitle: t('tongue.title'),
      difficulty: difficultyLabel(configSnapshot),
      trainingDate: session.Test_Date,
      details: {
        Duration_Seconds: session.Duration_Seconds,
        Score: session.Score,
        Missed: session.Missed,
        Average_Hold_Seconds: session.Average_Hold_Seconds,
        Sensitivity: session.Sensitivity,
        Growth_Rate_PX_Per_Second: session.Growth_Rate_PX_Per_Second,
        Apple_Speed_PX_Per_Second: session.Apple_Speed_PX_Per_Second,
        Spawn_Interval_Seconds: session.Spawn_Interval_Seconds,
        Edge_Chance_Percent: session.Edge_Chance_Percent,
      },
    });
    writeJsPsychData(
      jsPsychRef,
      session as unknown as Record<string, unknown>,
      'Unable to write tongue training result to jsPsych data.',
    );
  }, [setPhase, stopVision, t]);

  finishSessionRef.current = finishSession;

  useEffect(() => {
    let cancelled = false;
    let initialized = false;
    const app = new Application();

    const initialize = async () => {
      const host = pixiHostRef.current;
      if (!host) return;
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        resizeTo: host,
      });
      initialized = true;
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      appRef.current = app;
      host.appendChild(app.canvas);
      app.canvas.className = 'tongue-catch-canvas';
      resetTongueScene(app, sceneRef);
      app.ticker.add((ticker: Ticker) => {
        if (phaseRef.current !== 'playing') return;
        updateTongueGame({
          app,
          ticker,
          sceneRef,
          recognition: recognitionRef.current,
          mouth: lastMouthRef.current,
          config: configRef.current,
          metrics: metricsRef.current,
          onCatch: () => {
            playSuccessSound(jsPsychRef);
            setScore(metricsRef.current.score);
          },
          onMiss: () => {
            playFailureSound(jsPsychRef);
            setMissed(metricsRef.current.missed);
          },
        });
        if (metricsRef.current.elapsed - lastHudUpdateRef.current >= 0.2) {
          lastHudUpdateRef.current = metricsRef.current.elapsed;
          setElapsedSeconds(Math.floor(metricsRef.current.elapsed));
        }
        if (metricsRef.current.elapsed >= configRef.current.durationSec) {
          finishSessionRef.current();
        }
      });
    };
    void initialize();

    const handleResize = () => {
      const currentApp = appRef.current;
      if (currentApp) resetTongueScene(currentApp, sceneRef);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current) destroyTongueScene(sceneRef.current);
      sceneRef.current = null;
      appRef.current = null;
      if (initialized) app.destroy(true, { children: true });
    };
  }, []);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    closeActiveHold(metricsRef.current, performance.now());
    setPhase('paused');
  }, [setPhase]);

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    setPhase('playing');
  }, [setPhase]);

  const returnToMenu = useCallback(() => {
    stopVision();
    setPhase('menu');
    setResult(null);
    setRecognition({ label: 'Rest', confidence: 0, faceVisible: false });
    recognitionRef.current = { label: 'Rest', confidence: 0, faceVisible: false };
    const app = appRef.current;
    if (app) resetTongueScene(app, sceneRef);
  }, [setPhase, stopVision]);

  const exitGame = useCallback(() => {
    stopVision();
    onExit();
  }, [onExit, stopVision]);

  const downloadResult = useCallback(() => {
    if (!result) return;
    const rows = [
      Object.keys(result),
      Object.values(result),
    ];
    downloadCsvFile(
      rows.map((row) => row.map(csvCell).join(',')).join('\n'),
      `tongue_catch_${Date.now()}.csv`,
    );
  }, [result]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (phaseRef.current === 'playing') pauseGame();
      else if (phaseRef.current === 'paused') resumeGame();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pauseGame, resumeGame]);

  const activeCalibrationStep = CALIBRATION_STEPS[calibrationIndex];
  const remainingSeconds = Math.max(0, config.durationSec - elapsedSeconds);
  const confidencePercent = Math.round(recognition.confidence * 100);
  const directionLabel = recognition.label === 'Tongue_Left'
    ? t('tongue.direction.left')
    : recognition.label === 'Tongue_Right'
      ? t('tongue.direction.right')
      : t('tongue.direction.rest');

  return (
    <div className={`tongue-catch tongue-catch-phase-${phase}`}>
      <video
        ref={videoRef}
        className="tongue-catch-video"
        style={{ opacity: config.cameraOpacity }}
        muted
        playsInline
        aria-label={t('tongue.camera.preview')}
      />
      <div ref={pixiHostRef} className="tongue-catch-stage" />
      <canvas
        ref={featureCanvasRef}
        className="tongue-feature-canvas"
        width={MOUTH_FEATURE_WIDTH}
        height={MOUTH_FEATURE_HEIGHT}
        aria-hidden="true"
      />

      {phase === 'menu' && (
        <div className="training-panel tongue-menu-panel">
          <div className="training-config tongue-config">
            <header className="training-config-header">
              <div>
                <span className="training-config-label">{t('tongue.config.label')}</span>
                <h1>{t('tongue.title')}</h1>
              </div>
              <div className={`tongue-calibration-status ${hasCalibration ? 'ready' : ''}`}>
                <strong>{hasCalibration ? t('tongue.calibration.ready') : t('tongue.calibration.required')}</strong>
                {lastCalibrated && <span>{new Date(lastCalibrated).toLocaleDateString()}</span>}
              </div>
            </header>

            {visionError && <div className="gesture-error" role="alert">{visionError}</div>}

            <div className="training-config-body">
              <section className="training-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('tongue.config.sensitivity')}</h2>
                    <p>{t('tongue.config.sensitivityDesc')}</p>
                  </div>
                  <span>{Math.round(config.sensitivity * 100)}%</span>
                </div>
                <input
                  className="training-slider"
                  type="range"
                  min="45"
                  max="90"
                  step="5"
                  value={config.sensitivity * 100}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    sensitivity: Number(event.target.value) / 100,
                  }))}
                />
              </section>

              <section className="training-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('tongue.config.growthRate')}</h2>
                    <p>{t('tongue.config.growthRateDesc')}</p>
                  </div>
                  <span>{config.growthRate} px/s</span>
                </div>
                <input
                  className="training-slider"
                  type="range"
                  min="80"
                  max="360"
                  step="20"
                  value={config.growthRate}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    growthRate: Number(event.target.value),
                  }))}
                />
              </section>

              <section className="training-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('tongue.config.duration')}</h2>
                    <p>{t('tongue.config.durationDesc')}</p>
                  </div>
                  <span>{t('training.secondsShort', { value: config.durationSec })}</span>
                </div>
                <div className="training-option-grid training-option-grid-three">
                  {[60, 90, 120].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`training-option ${config.durationSec === value ? 'active' : ''}`}
                      onClick={() => setConfig((current) => ({ ...current, durationSec: value }))}
                    >
                      <span className="training-option-title">{t('training.secondsShort', { value })}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="training-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('tongue.config.appleSpeed')}</h2>
                    <p>{t('tongue.config.appleSpeedDesc')}</p>
                  </div>
                  <span>{config.appleSpeed} px/s</span>
                </div>
                <input
                  className="training-slider"
                  type="range"
                  min="60"
                  max="260"
                  step="10"
                  value={config.appleSpeed}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    appleSpeed: Number(event.target.value),
                  }))}
                />
              </section>

              <section className="training-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('tongue.config.spawnRate')}</h2>
                    <p>{t('tongue.config.spawnRateDesc')}</p>
                  </div>
                  <span>{config.spawnIntervalSec.toFixed(1)}s</span>
                </div>
                <input
                  className="training-slider"
                  type="range"
                  min="0.6"
                  max="3.5"
                  step="0.1"
                  value={config.spawnIntervalSec}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    spawnIntervalSec: Number(event.target.value),
                  }))}
                />
              </section>

              <section className="training-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('tongue.config.edgeChance')}</h2>
                    <p>{t('tongue.config.edgeChanceDesc')}</p>
                  </div>
                  <span>{Math.round(config.edgeChance * 100)}%</span>
                </div>
                <input
                  className="training-slider"
                  type="range"
                  min="0"
                  max="90"
                  step="10"
                  value={config.edgeChance * 100}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    edgeChance: Number(event.target.value) / 100,
                  }))}
                />
              </section>

              <section className="training-setting training-setting-wide gesture-privacy-note">
                <strong>{t('tongue.privacy.title')}</strong>
                <span>{t('tongue.privacy.desc')}</span>
              </section>
            </div>

            <div className="training-config-footer">
              <div className="training-config-summary">
                <strong>{t('tongue.title')}</strong>
                <span>{t('training.secondsShort', { value: config.durationSec })}</span>
                <span>{Math.round(config.sensitivity * 100)}%</span>
                <span>{difficultyLabel(config)}</span>
              </div>
              <div className="training-config-actions">
                <button className="btn btn-secondary btn-lg" onClick={() => void startSession(true)}>
                  {hasCalibration ? t('tongue.calibration.recalibrate') : t('tongue.calibration.start')}
                </button>
                <button className="btn btn-primary btn-lg config-start-btn" onClick={() => void startSession(false)}>
                  {hasCalibration ? t('training.startGame') : t('tongue.calibration.start')}
                </button>
                <button className="btn btn-ghost btn-lg" onClick={exitGame}>{t('training.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'initializing' && (
        <div className="gesture-calibration-overlay">
          <div className="gesture-loading-card">
            <div className="gesture-loader" />
            <h1>{t('tongue.loading.title')}</h1>
            <p>{statusMessage}</p>
          </div>
        </div>
      )}

      {phase === 'calibration' && activeCalibrationStep && (
        <div className="tongue-calibration-overlay">
          <div className="tongue-calibration-card">
            <span className="gesture-step-count">
              {t('tongue.calibration.step', { current: calibrationIndex + 1, total: CALIBRATION_STEPS.length })}
            </span>
            <div className={`tongue-direction-cue tongue-direction-${activeCalibrationStep.label.toLowerCase()}`}>
              <TongueCue label={activeCalibrationStep.label} />
            </div>
            <h1>{t(activeCalibrationStep.titleKey)}</h1>
            <p>{t(activeCalibrationStep.instructionKey)}</p>
            <div className="gesture-calibration-progress">
              <span style={{ width: `${calibrationProgress * 100}%` }} />
            </div>
            <strong>
              {isCapturing
                ? t('tongue.calibration.capturing')
                : t('tongue.calibration.capturePrompt')}
            </strong>
            <div className="gesture-calibration-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={startCalibrationCapture}
                disabled={isCapturing}
              >
                {isCapturing ? t('tongue.calibration.capturing') : t('tongue.calibration.capture')}
              </button>
              <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>{t('training.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {(phase === 'playing' || phase === 'paused') && (
        <>
          <div className="tongue-game-hud">
            <span><small>{t('tongue.hud.time')}</small><strong>{remainingSeconds}s</strong></span>
            <span><small>{t('tongue.hud.score')}</small><strong>{score}</strong></span>
            <span><small>{t('tongue.hud.missed')}</small><strong>{missed}</strong></span>
            <span className={`tongue-recognition-chip tongue-recognition-${recognition.label.toLowerCase()}`}>
              <small>{t('tongue.hud.direction')}</small>
              <strong>{directionLabel} · {confidencePercent}%</strong>
            </span>
            <button className="btn btn-sm btn-secondary" onClick={pauseGame}>{t('training.pause')}</button>
            <button className="btn btn-sm btn-ghost" onClick={finishSession}>{t('tongue.finish')}</button>
          </div>
          {!recognition.faceVisible && (
            <div className="tongue-face-warning">{t('tongue.game.findFace')}</div>
          )}
        </>
      )}

      {phase === 'paused' && (
        <div className="training-panel training-panel-compact tongue-pause-panel">
          <h1>{t('tongue.pause.title')}</h1>
          <p>{t('tongue.pause.desc')}</p>
          <div className="training-actions">
            <button className="btn btn-primary btn-lg" onClick={resumeGame}>{t('training.continueGame')}</button>
            <button className="btn btn-secondary btn-lg" onClick={finishSession}>{t('tongue.finish')}</button>
            <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>{t('training.returnSettings')}</button>
          </div>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="experiment-container tongue-results-container" style={{ overflowY: 'auto' }}>
          <div className="experiment-results">
            <h1>{t('tongue.results.title')}</h1>
            <div className="training-result-summary">
              <span>
                <small>{t('tongue.results.score')}</small>
                <strong>{result.Score}</strong>
              </span>
              <span>
                <small>{t('tongue.results.missed')}</small>
                <strong>{result.Missed}</strong>
              </span>
              <span>
                <small>{t('tongue.results.duration')}</small>
                <strong>{result.Duration_Seconds}s</strong>
              </span>
              <span>
                <small>{t('tongue.results.avgHold')}</small>
                <strong>{result.Average_Hold_Seconds}s</strong>
              </span>
            </div>
            <table className="results-table">
              <tbody>
                <tr><th>{t('tongue.results.user')}</th><td>{result.Participant_ID}</td></tr>
                <tr><th>{t('tongue.config.sensitivity')}</th><td>{Math.round(result.Sensitivity * 100)}%</td></tr>
                <tr><th>{t('tongue.config.growthRate')}</th><td>{result.Growth_Rate_PX_Per_Second} px/s</td></tr>
                <tr><th>{t('tongue.config.appleSpeed')}</th><td>{result.Apple_Speed_PX_Per_Second} px/s</td></tr>
              </tbody>
            </table>
            <div className="results-actions">
              <button className="btn btn-primary btn-lg" onClick={downloadResult}>{t('training.downloadCsvRecord')}</button>
              <button className="btn btn-secondary btn-lg" onClick={() => void startSession(false)}>{t('training.playAgain')}</button>
              <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>{t('training.returnSettings')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TongueCue({ label }: { label: TongueClass }) {
  const tongueX = label === 'Tongue_Left' ? 35 : label === 'Tongue_Right' ? 105 : 70;
  const tongueWidth = label === 'Rest' ? 18 : 54;
  return (
    <svg viewBox="0 0 140 100" aria-hidden="true">
      <path d="M25 52 C33 24 107 24 115 52 C105 77 35 77 25 52Z" fill="#fff" stroke="currentColor" strokeWidth="5" />
      <path d="M38 51 C52 63 88 63 102 51" fill="none" stroke="#7f1d1d" strokeWidth="5" strokeLinecap="round" />
      <rect
        x={tongueX - tongueWidth / 2}
        y="50"
        width={tongueWidth}
        height="22"
        rx="11"
        fill="#fb7185"
        stroke="#be123c"
        strokeWidth="3"
      />
    </svg>
  );
}

function createSessionMetrics(): SessionMetrics {
  return {
    startedAt: 0,
    elapsed: 0,
    score: 0,
    missed: 0,
    holdStartedAt: null,
    holdDirection: null,
    holdDurations: [],
  };
}

function resetTongueScene(
  app: Application,
  sceneRef: { current: TongueScene | null },
): void {
  if (sceneRef.current) destroyTongueScene(sceneRef.current);
  const root = new Container();
  const points = Array.from({ length: MAX_TONGUE_SEGMENTS }, () => new Point(app.screen.width / 2, app.screen.height * 0.66));
  const tongueTexture = createTongueTexture();
  const tongue = new MeshRope({
    texture: tongueTexture,
    points,
    width: 28,
  });
  root.addChild(tongue);
  app.stage.addChild(root);
  sceneRef.current = {
    root,
    tongue,
    tongueTexture,
    points,
    apples: [],
    mouthX: app.screen.width / 2,
    mouthY: app.screen.height * 0.66,
    tongueLength: 0,
    tongueDirection: 0,
    spawnElapsed: 0,
  };
}

function destroyTongueScene(scene: TongueScene): void {
  scene.apples.forEach((apple) => apple.view.destroy({ children: true }));
  scene.apples = [];
  scene.root.removeFromParent();
  scene.root.destroy({ children: true });
  scene.tongueTexture.destroy(true);
}

function createTongueTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#fda4af');
    gradient.addColorStop(1, '#e11d48');
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(1, 2, 94, 28, 14);
    context.fill();
    context.strokeStyle = '#9f1239';
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.moveTo(10, 11);
    context.lineTo(84, 11);
    context.strokeStyle = 'rgba(255,255,255,0.45)';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.stroke();
  }
  return Texture.from(canvas);
}

function updateTongueGame(args: {
  app: Application;
  ticker: Ticker;
  sceneRef: { current: TongueScene | null };
  recognition: RecognitionState;
  mouth: { x: number; y: number; visible: boolean };
  config: TongueTrainingSettings;
  metrics: SessionMetrics;
  onCatch: () => void;
  onMiss: () => void;
}) {
  const scene = args.sceneRef.current;
  if (!scene) return;
  const dt = Math.min(args.ticker.deltaMS / 1000, 0.05);
  args.metrics.elapsed += dt;

  const mappedMouth = mapVideoPointToStage(
    args.mouth.x,
    args.mouth.y,
    args.app.screen.width,
    args.app.screen.height,
  );
  if (args.mouth.visible) {
    scene.mouthX += (mappedMouth.x - scene.mouthX) * Math.min(1, dt * 9);
    scene.mouthY += (mappedMouth.y - scene.mouthY) * Math.min(1, dt * 9);
  }

  const direction = args.recognition.faceVisible && args.recognition.confidence >= args.config.sensitivity
    ? args.recognition.label === 'Tongue_Left'
      ? -1
      : args.recognition.label === 'Tongue_Right'
        ? 1
        : 0
    : 0;
  const maxLength = Math.min(args.app.screen.width * 0.42, 420);
  if (direction === 0) {
    scene.tongueLength = Math.max(0, scene.tongueLength - args.config.growthRate * 1.7 * dt);
    closeActiveHold(args.metrics, performance.now());
  } else {
    if (args.metrics.holdDirection !== args.recognition.label) {
      closeActiveHold(args.metrics, performance.now());
      args.metrics.holdStartedAt = performance.now();
      args.metrics.holdDirection = args.recognition.label;
    }
    scene.tongueDirection = direction;
    scene.tongueLength = Math.min(maxLength, scene.tongueLength + args.config.growthRate * dt);
  }
  if (scene.tongueLength <= 1) scene.tongueDirection = direction;
  updateTonguePoints(scene, args.ticker.lastTime);

  scene.spawnElapsed += dt;
  if (scene.spawnElapsed >= args.config.spawnIntervalSec) {
    scene.spawnElapsed = 0;
    spawnApple(scene, args.app.screen.width, args.config.edgeChance);
  }

  const tip = scene.points[scene.points.length - 1];
  for (let index = scene.apples.length - 1; index >= 0; index -= 1) {
    const apple = scene.apples[index];
    apple.view.y += args.config.appleSpeed * dt;
    apple.view.rotation = Math.sin(args.ticker.lastTime / 320 + index) * 0.08;
    const half = apple.size / 2;
    const caught = scene.tongueLength > 20
      && tip.x + 12 >= apple.view.x - half
      && tip.x - 12 <= apple.view.x + half
      && tip.y + 12 >= apple.view.y - half
      && tip.y - 12 <= apple.view.y + half;
    if (caught) {
      removeApple(scene, index);
      args.metrics.score += 1;
      args.onCatch();
      continue;
    }
    if (apple.view.y - half > args.app.screen.height) {
      removeApple(scene, index);
      args.metrics.missed += 1;
      args.onMiss();
    }
  }
}

function updateTonguePoints(scene: TongueScene, time: number): void {
  const direction = scene.tongueDirection || 1;
  const dx = direction * 0.86;
  const dy = -0.5;
  scene.points.forEach((point, index) => {
    const progress = index / (scene.points.length - 1);
    const wave = Math.sin(progress * Math.PI + time / 210) * Math.min(7, scene.tongueLength * 0.04) * progress;
    point.x = scene.mouthX + dx * scene.tongueLength * progress;
    point.y = scene.mouthY + dy * scene.tongueLength * progress + wave;
  });
  scene.tongue.visible = scene.tongueLength > 2;
}

function spawnApple(scene: TongueScene, width: number, edgeChance: number): void {
  const useEdge = Math.random() < edgeChance;
  const side = Math.random() < 0.5 ? -1 : 1;
  const normalizedX = useEdge
    ? side < 0
      ? randomBetween(0.1, 0.28)
      : randomBetween(0.72, 0.9)
    : randomBetween(0.27, 0.73);
  const size = randomBetween(38, 48);
  const apple = createAppleSprite(size);
  apple.view.x = width * normalizedX;
  apple.view.y = -size;
  scene.apples.push(apple);
  scene.root.addChild(apple.view);
}

function createAppleSprite(size: number): AppleSprite {
  const view = new Container();
  const radius = size * 0.35;
  const body = new Graphics()
    .circle(-radius * 0.55, 1, radius)
    .circle(radius * 0.55, 1, radius)
    .fill({ color: 0xef4444 })
    .stroke({ color: 0x991b1b, width: 3 });
  const highlight = new Graphics()
    .ellipse(-radius * 0.55, -radius * 0.35, radius * 0.3, radius * 0.5)
    .fill({ color: 0xffffff, alpha: 0.58 });
  const stem = new Graphics()
    .moveTo(0, -radius * 0.75)
    .lineTo(radius * 0.08, -radius * 1.35)
    .stroke({ color: 0x713f12, width: 5, cap: 'round' });
  const leaf = new Graphics()
    .ellipse(radius * 0.38, -radius * 1.18, radius * 0.48, radius * 0.22)
    .fill({ color: 0x65a30d })
    .stroke({ color: 0x3f6212, width: 2 });
  leaf.rotation = -0.35;
  view.addChild(body, highlight, stem, leaf);
  return { view, size };
}

function removeApple(scene: TongueScene, index: number): void {
  const [apple] = scene.apples.splice(index, 1);
  if (!apple) return;
  apple.view.removeFromParent();
  apple.view.destroy({ children: true });
}

function closeActiveHold(metrics: SessionMetrics, now: number): void {
  if (metrics.holdStartedAt !== null) {
    const duration = Math.max(0, (now - metrics.holdStartedAt) / 1000);
    if (duration >= 0.12) metrics.holdDurations.push(duration);
  }
  metrics.holdStartedAt = null;
  metrics.holdDirection = null;
}

function calculateMouthAnchor(landmarks: NormalizedLandmark[]): { x: number; y: number } {
  const points = LIP_LANDMARK_INDICES.map((index) => landmarks[index]).filter(Boolean);
  if (points.length === 0) return { x: 0.5, y: 0.64 };
  return {
    x: points.reduce((total, point) => total + point.x, 0) / points.length,
    y: points.reduce((total, point) => total + point.y, 0) / points.length,
  };
}

function extractMouthFeature(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
): tf.Tensor {
  const points = LIP_LANDMARK_INDICES.map((index) => landmarks[index]).filter(Boolean);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const mouthWidth = Math.max(maxX - minX, 0.04);
  const mouthHeight = Math.max(maxY - minY, 0.025);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2 + mouthHeight * 0.55;
  const cropWidth = mouthWidth * 1.65;
  const cropHeight = Math.max(mouthHeight * 3.2, cropWidth * 0.7);
  const sourceX = clamp((centerX - cropWidth / 2) * video.videoWidth, 0, video.videoWidth - 1);
  const sourceY = clamp((centerY - cropHeight / 2) * video.videoHeight, 0, video.videoHeight - 1);
  const sourceWidth = Math.min(cropWidth * video.videoWidth, video.videoWidth - sourceX);
  const sourceHeight = Math.min(cropHeight * video.videoHeight, video.videoHeight - sourceY);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return tf.zeros([MOUTH_FEATURE_WIDTH * MOUTH_FEATURE_HEIGHT]);
  context.save();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  context.restore();
  return tf.tidy(() => {
    const image = tf.browser.fromPixels(canvas, 1).toFloat().div(255);
    const moments = tf.moments(image);
    return image.sub(moments.mean).div(moments.variance.sqrt().add(0.05)).flatten();
  });
}

function mapVideoPointToStage(
  normalizedX: number,
  normalizedY: number,
  stageWidth: number,
  stageHeight: number,
): { x: number; y: number } {
  const video = document.querySelector<HTMLVideoElement>('.tongue-catch-video');
  const videoWidth = video?.videoWidth || 4;
  const videoHeight = video?.videoHeight || 3;
  const scale = Math.max(stageWidth / videoWidth, stageHeight / videoHeight);
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;
  const offsetX = (stageWidth - renderedWidth) / 2;
  const offsetY = (stageHeight - renderedHeight) / 2;
  return {
    x: offsetX + (1 - normalizedX) * renderedWidth,
    y: offsetY + normalizedY * renderedHeight,
  };
}

function restoreClassifierDataset(
  classifier: KNNClassifier,
  saved: SerializedTongueClassifier,
): void {
  const dataset = Object.fromEntries(
    Object.entries(saved.dataset).map(([label, tensor]) => [
      label,
      tf.tensor2d(tensor.data, tensor.shape),
    ]),
  );
  classifier.setClassifierDataset(dataset);
}

function hasCompleteDataset(saved: SerializedTongueClassifier): boolean {
  return CALIBRATION_STEPS.every((step) => (saved.dataset[step.label]?.shape[0] ?? 0) >= MIN_CLASS_EXAMPLES);
}

function isTongueClass(value: string): value is TongueClass {
  return value === 'Rest' || value === 'Tongue_Left' || value === 'Tongue_Right';
}

function difficultyLabel(config: TongueTrainingSettings): string {
  const pressure = config.appleSpeed / 120 + 1.5 / config.spawnIntervalSec + config.edgeChance;
  if (pressure < 2.15) return 'beginner';
  if (pressure < 3) return 'intermediate';
  return 'advanced';
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
