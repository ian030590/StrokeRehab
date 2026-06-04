import { type ChangeEvent, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, type Ticker } from 'pixi.js';
import { initJsPsych } from 'jspsych';
import { downloadCsvFile } from '../../utils/downloadFile';
import { getActiveUser } from '../../utils/settings';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type ShapeId = 'circle' | 'cross' | 'square' | 'triangle' | 'vertical-line' | 'horizontal-line';
type GamePhase = 'menu' | 'playing' | 'paused' | 'results';
type GameResult = 'Victory' | 'Defeat';
type BackgroundMode = 'stars' | 'color' | 'image';
type GameDurationSeconds = number | null;
type DrawingSampleUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface DrawingTowerDefenseGameProps {
  onExit: () => void;
}

interface DifficultyConfig {
  label: string;
  spawnMode: 'after-clear-delay' | 'after-clear' | 'fixed-interval';
  spawnIntervalSec: number;
  description: string;
}

interface Point {
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  shape: ShapeId;
  node: Container;
  spawnedAtSec: number;
  resultIndex: number;
}

interface EnemyResult {
  Enemy_Number: number;
  Shape: ShapeId;
  Reaction_Time_Seconds: number | null;
  Defeated: boolean;
}

interface DrawingSampleUploadState {
  status: DrawingSampleUploadStatus;
  pending: number;
  uploaded: number;
  failed: number;
  message: string;
}

interface DrawingSampleMetadata {
  sampleId: string;
  createdAt: string;
  participantId: string;
  targetShape: ShapeId | null;
  targetShapeLabel: string | null;
  recognizedShape: ShapeId | null;
  recognizedShapeLabel: string | null;
  matched: boolean;
  difficulty: Difficulty;
  gameTimeSeconds: GameDurationSeconds;
  enemyNumber: number | null;
  elapsedSeconds: number;
  elapsedSinceTargetSpawnSeconds: number | null;
  enemySpeed: number;
  recognitionStrictness: number;
  strokeWaitMilliseconds: number;
  strokeCount: number;
  pointCount: number;
  sourceCanvasWidth: number | null;
  sourceCanvasHeight: number | null;
  boundingBox: ReturnType<typeof getBox>;
  imageFormat: 'png-transparent';
  imageSize: number;
}

interface SessionRecord {
  Test_Date: string;
  Participant_ID: string;
  Difficulty: Difficulty;
  Game_Time_Seconds: GameDurationSeconds;
  Starting_HP: number;
  Enemy_Speed: number;
  Recognition_Strictness: number;
  Stroke_Wait_Milliseconds: number;
  Total_Duration_Seconds: number;
  Enemies_Spawned: number;
  Enemies_Defeated: number;
  HP_Remaining: number;
  Game_Result: GameResult;
  Enemy_Results: EnemyResult[];
}

const SHAPES: readonly ShapeId[] = ['circle', 'cross', 'square', 'triangle', 'vertical-line', 'horizontal-line'];
const DEFAULT_JUDGE_DELAY_MS = 300;
const STROKE_WAIT_OPTIONS = [220, DEFAULT_JUDGE_DELAY_MS, 350] as const;
const HP_OPTIONS = [1, 3, 5] as const;
const GAME_DURATION_OPTIONS = [30, 60, 300, null] as const;
const ENEMY_SPEED_OPTIONS = [5, 15, 30] as const;
const DEFAULT_HP = 3;
const DEFAULT_ENEMY_SPEED = 5;
const MIN_RECOGNITION_STRICTNESS = 10;
const DEFAULT_RECOGNITION_STRICTNESS = 20;
const MAX_RECOGNITION_STRICTNESS = 90;
const DEFAULT_GAME_DURATION_SECONDS: GameDurationSeconds = 30;
const DEFAULT_CUSTOM_GAME_DURATION_SECONDS = 120;
const ENEMY_VISUAL_HEIGHT = 98;
const ENEMY_SPAWN_Y = -ENEMY_VISUAL_HEIGHT - 8;
const BACKGROUND_COLOR_OPTIONS = ['#F6F7F8', '#E8F3FF', '#EAF7EF', '#FFF4E6', '#F3EAFE', '#111827'] as const;
const RECOGNIZER_POINTS = 64;
const RECOGNIZER_SIZE = 200;
const RDP_STATIONARY_POINT_DISTANCE_PX = 2.5;
const DEFAULT_RDP_EPSILON_RATIO = 0.08;
const MIN_RDP_EPSILON_RATIO = 0.05;
const MAX_RDP_EPSILON_RATIO = 0.1;
const RDP_CLOSED_ENDPOINT_DISTANCE_PX = 30;
const RDP_STRAIGHT_ANGLE_DEGREES = 160;
const starSkyBackgroundImage = `url(${import.meta.env.BASE_URL}assets/StarSky.png)`;
const DRAWING_SAMPLE_UPLOAD_ENDPOINT = import.meta.env.VITE_DRAWING_SAMPLE_UPLOAD_URL?.trim() || '/api/drawing-samples';
const DRAWING_SAMPLE_IMAGE_SIZE = 256;
const DRAWING_SAMPLE_IMAGE_PADDING = 24;
const DRAWING_SAMPLE_STROKE_WIDTH = 14;

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  Beginner: { label: '初級', spawnMode: 'after-clear-delay', spawnIntervalSec: 2, description: '消滅後 2 秒出現下一名' },
  Intermediate: { label: '中級', spawnMode: 'after-clear', spawnIntervalSec: 0, description: '消滅後馬上出現下一名' },
  Advanced: { label: '高級', spawnMode: 'fixed-interval', spawnIntervalSec: 3, description: '每 3 秒出現一名' },
};

const SHAPE_LABEL: Record<ShapeId, string> = {
  circle: '圓形',
  cross: '叉叉',
  square: '方形',
  triangle: '三角形',
  'vertical-line': '直線',
  'horizontal-line': '橫線',
};

export function DrawingTowerDefenseGame({ onExit }: DrawingTowerDefenseGameProps) {
  const pixiHostRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const drawingLayerRef = useRef<Graphics | null>(null);
  const pathRef = useRef<Point[]>([]);
  const strokesRef = useRef<Point[][]>([]);
  const enemyResultsRef = useRef<EnemyResult[]>([]);
  const recognitionTimerRef = useRef<number | null>(null);
  const uploadedBackgroundUrlRef = useRef<string | null>(null);
  const isDrawingRef = useRef(false);
  const metricsRef = useRef({ defeated: 0, hp: DEFAULT_HP, spawned: 0, elapsed: 0, spawnTimer: 0, nextId: 1 });
  const phaseRef = useRef<GamePhase>('menu');
  const configRef = useRef({
    difficulty: 'Beginner' as Difficulty,
    gameDurationSec: DEFAULT_GAME_DURATION_SECONDS,
    maxHp: DEFAULT_HP,
    speed: DEFAULT_ENEMY_SPEED,
    strictness: DEFAULT_RECOGNITION_STRICTNESS,
    strokeWaitMs: DEFAULT_JUDGE_DELAY_MS,
  });
  const jsPsychRef = useRef<ReturnType<typeof initJsPsych> | null>(null);

  const [phase, setPhaseState] = useState<GamePhase>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [gameDurationSec, setGameDurationSec] = useState<GameDurationSeconds>(DEFAULT_GAME_DURATION_SECONDS);
  const [customGameDurationSec, setCustomGameDurationSec] = useState(DEFAULT_CUSTOM_GAME_DURATION_SECONDS);
  const [maxHp, setMaxHp] = useState(DEFAULT_HP);
  const [customHp, setCustomHp] = useState(DEFAULT_HP);
  const [speed, setSpeed] = useState(DEFAULT_ENEMY_SPEED);
  const [customSpeed, setCustomSpeed] = useState(DEFAULT_ENEMY_SPEED);
  const [strictness, setStrictness] = useState(DEFAULT_RECOGNITION_STRICTNESS);
  const [strokeWaitMs, setStrokeWaitMs] = useState(DEFAULT_JUDGE_DELAY_MS);
  const [customStrokeWaitMs, setCustomStrokeWaitMs] = useState(DEFAULT_JUDGE_DELAY_MS);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('stars');
  const [backgroundColor, setBackgroundColor] = useState<string>(BACKGROUND_COLOR_OPTIONS[0]);
  const [uploadedBackgroundUrl, setUploadedBackgroundUrl] = useState<string | null>(null);
  const [uploadedBackgroundName, setUploadedBackgroundName] = useState('未選擇圖像');
  const [hp, setHp] = useState(DEFAULT_HP);
  const [defeated, setDefeated] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recognized, setRecognized] = useState<string>('尚未辨識');
  const [result, setResult] = useState<SessionRecord | null>(null);
  const [sampleUpload, setSampleUpload] = useState<DrawingSampleUploadState>({
    status: 'idle',
    pending: 0,
    uploaded: 0,
    failed: 0,
    message: '尚未上傳',
  });

  const activeConfig = DIFFICULTIES[difficulty];
  const isPresetGameDuration = GAME_DURATION_OPTIONS.includes(gameDurationSec as typeof GAME_DURATION_OPTIONS[number]);
  const isCustomHp = !HP_OPTIONS.includes(maxHp as typeof HP_OPTIONS[number]);
  const isCustomSpeed = !ENEMY_SPEED_OPTIONS.includes(speed as typeof ENEMY_SPEED_OPTIONS[number]);
  const gameDurationLabel = formatGameDuration(gameDurationSec);
  const backgroundSummary =
    backgroundMode === 'stars' ? '星空' : backgroundMode === 'color' ? backgroundColor : '自訂圖像';
  const backgroundModeLabel =
    backgroundMode === 'stars' ? '圖片' : backgroundMode === 'color' ? '顏色' : '自訂圖像';
  const backgroundStyle = useMemo<CSSProperties>(() => {
    if (backgroundMode === 'stars') return { backgroundImage: starSkyBackgroundImage };
    if (backgroundMode === 'image' && uploadedBackgroundUrl) {
      return { backgroundImage: `url("${uploadedBackgroundUrl}")` };
    }
    return { backgroundImage: 'none', backgroundColor };
  }, [backgroundColor, backgroundMode, uploadedBackgroundUrl]);
  const sampleUploadLabel = useMemo(() => {
    if (sampleUpload.pending > 0) return `上傳中 ${sampleUpload.pending}`;
    if (sampleUpload.failed > 0) return `已傳 ${sampleUpload.uploaded} / 失敗 ${sampleUpload.failed}`;
    if (sampleUpload.uploaded > 0) return `已傳 ${sampleUpload.uploaded}`;
    return sampleUpload.message;
  }, [sampleUpload]);

  const setPhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => {
    configRef.current = { difficulty, gameDurationSec, maxHp, speed, strictness, strokeWaitMs };
  }, [difficulty, gameDurationSec, maxHp, speed, strictness, strokeWaitMs]);

  useEffect(() => {
    jsPsychRef.current = initJsPsych();
  }, []);

  useEffect(() => () => {
    if (uploadedBackgroundUrlRef.current) URL.revokeObjectURL(uploadedBackgroundUrlRef.current);
  }, []);

  const clearPixiState = useCallback(() => {
    if (recognitionTimerRef.current !== null) {
      window.clearTimeout(recognitionTimerRef.current);
      recognitionTimerRef.current = null;
    }
    pathRef.current = [];
    strokesRef.current = [];
    enemiesRef.current.forEach((enemy) => enemy.node.destroy({ children: true }));
    enemiesRef.current = [];
    drawingLayerRef.current?.clear();
  }, []);

  const recordEnemyOutcome = useCallback((enemy: Enemy, defeatedEnemy: boolean) => {
    const result = enemyResultsRef.current[enemy.resultIndex];
    if (!result || result.Reaction_Time_Seconds !== null) return;
    const reactionTime = Math.max(0, metricsRef.current.elapsed - enemy.spawnedAtSec);
    result.Reaction_Time_Seconds = Number(reactionTime.toFixed(2));
    result.Defeated = defeatedEnemy;
  }, []);

  const finishGame = useCallback((gameResult: GameResult) => {
    if (phaseRef.current === 'results') return;
    if (recognitionTimerRef.current !== null) {
      window.clearTimeout(recognitionTimerRef.current);
      recognitionTimerRef.current = null;
    }
    isDrawingRef.current = false;
    pathRef.current = [];
    strokesRef.current = [];
    drawingLayerRef.current?.clear();
    enemiesRef.current.forEach((enemy) => recordEnemyOutcome(enemy, false));
    enemiesRef.current.forEach((enemy) => enemy.node.destroy({ children: true }));
    enemiesRef.current = [];
    const metrics = metricsRef.current;
    const record: SessionRecord = {
      Test_Date: formatTestDate(new Date()),
      Participant_ID: getActiveUser() || 'Unknown',
      Difficulty: configRef.current.difficulty,
      Game_Time_Seconds: configRef.current.gameDurationSec,
      Starting_HP: configRef.current.maxHp,
      Enemy_Speed: configRef.current.speed,
      Recognition_Strictness: configRef.current.strictness,
      Stroke_Wait_Milliseconds: configRef.current.strokeWaitMs,
      Total_Duration_Seconds: Number(metrics.elapsed.toFixed(1)),
      Enemies_Spawned: metrics.spawned,
      Enemies_Defeated: metrics.defeated,
      HP_Remaining: metrics.hp,
      Game_Result: gameResult,
      Enemy_Results: enemyResultsRef.current.map((enemyResult) => ({ ...enemyResult })),
    };
    setResult(record);
    setHp(metrics.hp);
    setDefeated(metrics.defeated);
    setElapsedSeconds(Math.floor(metrics.elapsed));
    setPhase('results');
    try {
      const jsPsychData = jsPsychRef.current?.data;
      const writeData = jsPsychData?.write as unknown as ((data: Record<string, unknown>) => void) | undefined;
      writeData?.call(jsPsychData, record as unknown as Record<string, unknown>);
    } catch (error) {
      console.warn('Unable to write drawing tower defense result to jsPsych data.', error);
    }
  }, [recordEnemyOutcome, setPhase]);

  const drawLayout = useCallback((app: Application) => {
    const w = app.renderer.width;
    const bg = new Graphics();
    bg.rect(0, 0, w, app.renderer.height).fill({ color: 0x050816, alpha: 0.22 });
    app.stage.addChild(bg);

    const drawing = new Graphics();
    app.stage.addChild(drawing);
    drawingLayerRef.current = drawing;
  }, []);

  const drawShape = useCallback((shape: ShapeId, g: Graphics, cx: number, cy: number, size: number, color = 0x1a1c1e) => {
    if (shape === 'circle') {
      g.circle(cx, cy, size * 0.34).stroke({ color, width: 3 });
    } else if (shape === 'cross') {
      g.moveTo(cx - size * 0.28, cy - size * 0.28).lineTo(cx + size * 0.28, cy + size * 0.28);
      g.moveTo(cx + size * 0.28, cy - size * 0.28).lineTo(cx - size * 0.28, cy + size * 0.28);
      g.stroke({ color, width: 4, cap: 'round' });
    } else if (shape === 'square') {
      g.rect(cx - size * 0.27, cy - size * 0.27, size * 0.54, size * 0.54).stroke({ color, width: 3 });
    } else if (shape === 'triangle') {
      g.moveTo(cx, cy - size * 0.32).lineTo(cx + size * 0.32, cy + size * 0.28).lineTo(cx - size * 0.32, cy + size * 0.28).lineTo(cx, cy - size * 0.32);
      g.stroke({ color, width: 3, join: 'round' });
    } else if (shape === 'vertical-line') {
      g.moveTo(cx, cy - size * 0.34).lineTo(cx, cy + size * 0.34).stroke({ color, width: 4, cap: 'round' });
    } else {
      g.moveTo(cx - size * 0.34, cy).lineTo(cx + size * 0.34, cy).stroke({ color, width: 4, cap: 'round' });
    }
  }, []);

  const spawnEnemy = useCallback((app: Application) => {
    const w = app.renderer.width;
    const enemyNumber = metricsRef.current.spawned + 1;
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const resultIndex = enemyResultsRef.current.length;
    const enemy: Enemy = {
      id: metricsRef.current.nextId++,
      x: 70 + Math.random() * Math.max(80, w - 140),
      y: ENEMY_SPAWN_Y,
      shape,
      node: new Container(),
      spawnedAtSec: metricsRef.current.elapsed,
      resultIndex,
    };
    enemyResultsRef.current.push({
      Enemy_Number: enemyNumber,
      Shape: shape,
      Reaction_Time_Seconds: null,
      Defeated: false,
    });
    const monster = new Text({ text: '👾', style: { fontSize: 42 } });
    monster.anchor.set(0.5);
    monster.x = 0;
    monster.y = 24;
    const board = new Graphics();
    board.roundRect(-34, 48, 68, 50, 6).fill(0xffffff).stroke({ color: 0xc2c6d4, width: 2 });
    drawShape(enemy.shape, board, 0, 73, 54);
    enemy.node.addChild(monster, board);
    enemy.node.x = enemy.x;
    enemy.node.y = enemy.y;
    app.stage.addChild(enemy.node);
    enemiesRef.current.push(enemy);
    metricsRef.current.spawned += 1;
  }, [drawShape]);

  const redrawPath = useCallback(() => {
    const layer = drawingLayerRef.current;
    if (!layer) return;
    layer.clear();
    const drawStroke = (points: Point[]) => {
      if (points.length < 2) return;
      layer.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        layer.lineTo(points[i].x, points[i].y);
      }
    };
    strokesRef.current.forEach(drawStroke);
    drawStroke(pathRef.current);
    if (strokesRef.current.length === 0 && pathRef.current.length < 2) {
      return;
    }
    layer.stroke({ color: 0x005eb8, width: 7, alpha: 0.9, cap: 'round', join: 'round' });
  }, []);

  const queueDrawingSampleUpload = useCallback((strokes: Point[][], recognition: ShapeId | null, target: Enemy | undefined, matched: boolean) => {
    const sampleStrokes = cloneUsableStrokes(strokes);
    const points = flattenStrokes(sampleStrokes);
    if (points.length < 2 || strokesPathLength(sampleStrokes) < 8) return;

    const participantId = getActiveUser() || 'Unknown';
    const createdAt = new Date();
    const sampleId = createDrawingSampleId(createdAt, participantId, target?.shape ?? null);
    const stageRect = overlayRef.current?.getBoundingClientRect();
    const targetResult = target ? enemyResultsRef.current[target.resultIndex] : undefined;
    const elapsedSinceTargetSpawnSeconds = target
      ? Number(Math.max(0, metricsRef.current.elapsed - target.spawnedAtSec).toFixed(2))
      : null;
    const metadata: DrawingSampleMetadata = {
      sampleId,
      createdAt: createdAt.toISOString(),
      participantId,
      targetShape: target?.shape ?? null,
      targetShapeLabel: target ? SHAPE_LABEL[target.shape] : null,
      recognizedShape: recognition,
      recognizedShapeLabel: recognition ? SHAPE_LABEL[recognition] : null,
      matched,
      difficulty: configRef.current.difficulty,
      gameTimeSeconds: configRef.current.gameDurationSec,
      enemyNumber: targetResult?.Enemy_Number ?? null,
      elapsedSeconds: Number(metricsRef.current.elapsed.toFixed(2)),
      elapsedSinceTargetSpawnSeconds,
      enemySpeed: configRef.current.speed,
      recognitionStrictness: configRef.current.strictness,
      strokeWaitMilliseconds: configRef.current.strokeWaitMs,
      strokeCount: sampleStrokes.length,
      pointCount: points.length,
      sourceCanvasWidth: stageRect ? Math.round(stageRect.width) : null,
      sourceCanvasHeight: stageRect ? Math.round(stageRect.height) : null,
      boundingBox: getBox(points),
      imageFormat: 'png-transparent',
      imageSize: DRAWING_SAMPLE_IMAGE_SIZE,
    };

    setSampleUpload((current) => ({
      ...current,
      status: 'uploading',
      pending: current.pending + 1,
      message: '上傳中',
    }));

    void createDrawingSampleBlob(sampleStrokes)
      .then((blob) => uploadDrawingSample(blob, metadata))
      .then(() => {
        setSampleUpload((current) => {
          const pending = Math.max(0, current.pending - 1);
          return {
            status: pending > 0 ? 'uploading' : 'success',
            pending,
            uploaded: current.uploaded + 1,
            failed: current.failed,
            message: '已上傳 Discord',
          };
        });
      })
      .catch((error) => {
        console.warn('Unable to upload drawing sample to Discord.', error);
        setSampleUpload((current) => {
          const pending = Math.max(0, current.pending - 1);
          return {
            status: pending > 0 ? 'uploading' : 'error',
            pending,
            uploaded: current.uploaded,
            failed: current.failed + 1,
            message: '上傳失敗',
          };
        });
      });
  }, []);

  const handlePointerEnd = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (pathRef.current.length > 1) {
      strokesRef.current.push(pathRef.current);
    }
    pathRef.current = [];
    if (recognitionTimerRef.current !== null) {
      window.clearTimeout(recognitionTimerRef.current);
    }
    recognitionTimerRef.current = window.setTimeout(() => {
      recognitionTimerRef.current = null;
      const recognition = recognizeShape(strokesRef.current, configRef.current.strictness);
      setRecognized(recognition ? SHAPE_LABEL[recognition] : '未辨識');
      const target = enemiesRef.current[0];
      const matched = Boolean(recognition && target && recognition === target.shape);
      queueDrawingSampleUpload(strokesRef.current, recognition, target, matched);
      if (matched && target) {
        recordEnemyOutcome(target, true);
        target.node.destroy({ children: true });
        enemiesRef.current = enemiesRef.current.filter((enemy) => enemy.id !== target.id);
        metricsRef.current.defeated += 1;
        setDefeated(metricsRef.current.defeated);
      }
      window.setTimeout(() => {
        strokesRef.current = [];
        drawingLayerRef.current?.clear();
      }, 650);
    }, configRef.current.strokeWaitMs);
  }, [queueDrawingSampleUpload, recordEnemyOutcome]);

  const startGame = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    clearPixiState();
    app.stage.removeChildren();
    drawLayout(app);
    const initialHp = configRef.current.maxHp;
    metricsRef.current = { defeated: 0, hp: initialHp, spawned: 0, elapsed: 0, spawnTimer: 0, nextId: 1 };
    enemyResultsRef.current = [];
    setHp(initialHp);
    setDefeated(0);
    setElapsedSeconds(0);
    setResult(null);
    setRecognized('尚未辨識');
    setSampleUpload({
      status: 'idle',
      pending: 0,
      uploaded: 0,
      failed: 0,
      message: '尚未上傳',
    });
    setPhase('playing');
  }, [clearPixiState, drawLayout, setPhase]);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const returnToMenu = useCallback(() => {
    const app = appRef.current;
    clearPixiState();
    if (app) {
      app.stage.removeChildren();
      drawLayout(app);
    }
    setPhase('menu');
  }, [clearPixiState, drawLayout, setPhase]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current === 'playing') setPhase('paused');
  }, [setPhase]);

  const resumeGame = useCallback(() => {
    if (phaseRef.current === 'paused') setPhase('playing');
  }, [setPhase]);

  const handleBackgroundImageUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (uploadedBackgroundUrlRef.current) URL.revokeObjectURL(uploadedBackgroundUrlRef.current);
    const imageUrl = URL.createObjectURL(file);
    uploadedBackgroundUrlRef.current = imageUrl;
    setUploadedBackgroundUrl(imageUrl);
    setUploadedBackgroundName(file.name);
    setBackgroundMode('image');
    event.target.value = '';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    appRef.current = app;

    const init = async () => {
      const host = pixiHostRef.current;
      if (!host) return;
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        resizeTo: host,
      });
      if (cancelled) return;
      host.appendChild(app.canvas);
      app.canvas.className = 'drawing-defense-canvas';
      drawLayout(app);
      app.ticker.add((ticker: Ticker) => {
        if (phaseRef.current !== 'playing') return;
        const dt = Math.min(ticker.deltaMS / 1000, 0.05);
        const metrics = metricsRef.current;
        const cfg = DIFFICULTIES[configRef.current.difficulty];
        const targetGameDurationSec = configRef.current.gameDurationSec;
        const isTimeUnlimited = targetGameDurationSec === null;
        metrics.elapsed += dt;
        const nextElapsedSeconds = Math.floor(metrics.elapsed);
        setElapsedSeconds((current) => current === nextElapsedSeconds ? current : nextElapsedSeconds);
        const noActiveEnemies = enemiesRef.current.length === 0;
        if (cfg.spawnMode === 'fixed-interval' || noActiveEnemies) {
          metrics.spawnTimer += dt;
        } else {
          metrics.spawnTimer = 0;
        }
        if (isTimeUnlimited || metrics.elapsed < targetGameDurationSec) {
          const shouldSpawn =
            metrics.spawned === 0 ||
            (cfg.spawnMode === 'after-clear-delay' && noActiveEnemies && metrics.spawnTimer >= cfg.spawnIntervalSec) ||
            (cfg.spawnMode === 'after-clear' && noActiveEnemies) ||
            (cfg.spawnMode === 'fixed-interval' && metrics.spawnTimer >= cfg.spawnIntervalSec);
          if (shouldSpawn) {
            metrics.spawnTimer = 0;
            spawnEnemy(app);
          }
        }
        const enemyBottomOffset = ENEMY_VISUAL_HEIGHT;
        const defenseY = app.renderer.height - enemyBottomOffset;
        for (const enemy of [...enemiesRef.current]) {
          enemy.y += configRef.current.speed * dt;
          enemy.node.y = enemy.y;
          if (enemy.y > defenseY) {
            recordEnemyOutcome(enemy, false);
            enemy.node.destroy({ children: true });
            enemiesRef.current = enemiesRef.current.filter((item) => item.id !== enemy.id);
            metrics.hp = Math.max(0, metrics.hp - 1);
            setHp(metrics.hp);
          }
        }
        if (metrics.hp <= 0) {
          finishGame('Defeat');
          return;
        }
        if (!isTimeUnlimited && metrics.elapsed >= targetGameDurationSec && metrics.hp > 0) {
          finishGame('Victory');
        }
      });
    };

    init();

    const onResize = () => {
      if (!appRef.current) return;
      if (phaseRef.current === 'playing' || phaseRef.current === 'paused') return;
      appRef.current.stage.removeChildren();
      drawLayout(appRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, [drawLayout, finishGame, recordEnemyOutcome, spawnEnemy]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (phaseRef.current === 'playing') pauseGame();
      else if (phaseRef.current === 'paused') resumeGame();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pauseGame, resumeGame]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const toPoint = (event: PointerEvent): Point => {
      const rect = overlay.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerDown = (event: PointerEvent) => {
      if (phaseRef.current !== 'playing') return;
      event.preventDefault();
      if (recognitionTimerRef.current !== null) {
        window.clearTimeout(recognitionTimerRef.current);
        recognitionTimerRef.current = null;
      }
      overlay.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;
      pathRef.current = [toPoint(event)];
      redrawPath();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!isDrawingRef.current || phaseRef.current !== 'playing') return;
      event.preventDefault();
      pathRef.current.push(toPoint(event));
      redrawPath();
    };
    overlay.addEventListener('pointerdown', onPointerDown);
    overlay.addEventListener('pointermove', onPointerMove);
    overlay.addEventListener('pointerup', handlePointerEnd);
    overlay.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      overlay.removeEventListener('pointerdown', onPointerDown);
      overlay.removeEventListener('pointermove', onPointerMove);
      overlay.removeEventListener('pointerup', handlePointerEnd);
      overlay.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [handlePointerEnd, redrawPath]);

  const timeProgressText = useMemo(() => {
    if (gameDurationSec === null) return `${elapsedSeconds}s / 無限`;
    return `${Math.min(elapsedSeconds, gameDurationSec)}/${gameDurationSec}s`;
  }, [elapsedSeconds, gameDurationSec]);

  const downloadResult = () => {
    if (!result) return;
    downloadCsvFile(toCsv([result]), `drawing_tower_defense_${Date.now()}.csv`);
  };

  return (
    <div className={`drawing-defense drawing-defense-phase-${phase}`} style={backgroundStyle}>
      <div ref={pixiHostRef} className="drawing-defense-stage" />
      <div ref={overlayRef} className="drawing-defense-input" />
      {phase !== 'results' && <div className="drawing-defense-hud">
        <div><strong>HP</strong> {hp}/{maxHp}</div>
        <div><strong>消滅</strong> {defeated}</div>
        <div><strong>時間</strong> {timeProgressText}</div>
        <div><strong>辨識</strong> {recognized}</div>
        <div><strong>圖像</strong> {sampleUploadLabel}</div>
        {phase === 'playing' && <button className="btn btn-sm btn-secondary" onClick={pauseGame}>暫停</button>}
      </div>}

      {phase === 'menu' && (
        <div className="drawing-defense-panel">
          <div className="drawing-defense-config">
            <header className="drawing-defense-config-header">
              <div>
                <span className="drawing-defense-config-label">訓練設定</span>
                <h1>畫畫塔防</h1>
              </div>
            </header>

            <div className="drawing-defense-config-body">
              <section className="drawing-defense-setting">
                <div className="drawing-defense-setting-header">
                  <div>
                    <h2>難度</h2>
                    <p>{activeConfig.description}</p>
                  </div>
                  <span>{activeConfig.label}</span>
                </div>
                <div className="drawing-defense-option-grid drawing-defense-option-grid-three">
                  {Object.entries(DIFFICULTIES).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      className={`drawing-defense-option ${difficulty === key ? 'active' : ''}`}
                      onClick={() => setDifficulty(key as Difficulty)}
                    >
                      <span className="drawing-defense-option-title">{value.label}</span>
                      <span className="drawing-defense-option-meta">{value.description}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="drawing-defense-setting">
                <div className="drawing-defense-setting-header">
                  <div>
                    <h2>生命值</h2>
                    <p>{maxHp} HP</p>
                  </div>
                  <span>{isCustomHp ? '自訂' : '預設'}</span>
                </div>
                <div className="drawing-defense-option-grid drawing-defense-option-grid-four">
                  {HP_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`drawing-defense-option ${maxHp === option ? 'active' : ''}`}
                      onClick={() => setMaxHp(option)}
                    >
                      <span className="drawing-defense-option-title">{option} HP</span>
                    </button>
                  ))}
                  <label
                    className={`drawing-defense-option drawing-defense-option-custom ${isCustomHp ? 'active' : ''}`}
                    onClick={() => setMaxHp(customHp)}
                  >
                    <span className="drawing-defense-option-title">自訂</span>
                    <input
                      className="drawing-defense-number-input"
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      value={customHp}
                      onChange={(event) => {
                        const value = clamp(Number(event.target.value), 1, 20);
                        setCustomHp(value);
                        setMaxHp(value);
                      }}
                      onFocus={() => setMaxHp(customHp)}
                      aria-label="自訂生命值"
                    />
                  </label>
                </div>
              </section>

              <section className="drawing-defense-setting drawing-defense-setting-wide">
                <div className="drawing-defense-setting-header">
                  <div>
                    <h2>遊戲時間</h2>
                    <p>{gameDurationLabel}</p>
                  </div>
                  <span>
                    {gameDurationSec === DEFAULT_GAME_DURATION_SECONDS ? '預設' : isPresetGameDuration ? '選用' : '自訂'}
                  </span>
                </div>
                <div className="drawing-defense-option-grid drawing-defense-duration-grid">
                  {GAME_DURATION_OPTIONS.filter((option) => option !== null).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`drawing-defense-option ${gameDurationSec === option ? 'active' : ''}`}
                      onClick={() => setGameDurationSec(option)}
                    >
                      <span className="drawing-defense-option-title">{formatGameDuration(option)}</span>
                    </button>
                  ))}
                  <label
                    className={`drawing-defense-option drawing-defense-option-custom ${!isPresetGameDuration ? 'active' : ''}`}
                    onClick={() => setGameDurationSec(customGameDurationSec)}
                  >
                    <span className="drawing-defense-option-title">自訂</span>
                    <input
                      className="drawing-defense-number-input"
                      type="number"
                      min="1"
                      max="1800"
                      step="1"
                      value={customGameDurationSec}
                      onChange={(event) => {
                        const value = clamp(Number(event.target.value), 1, 1800);
                        setCustomGameDurationSec(value);
                        setGameDurationSec(value);
                      }}
                      onFocus={() => setGameDurationSec(customGameDurationSec)}
                      aria-label="自訂遊戲時間秒數"
                    />
                  </label>
                  <button
                    type="button"
                    className={`drawing-defense-option ${gameDurationSec === null ? 'active' : ''}`}
                    onClick={() => setGameDurationSec(null)}
                  >
                    <span className="drawing-defense-option-title">無限模式</span>
                  </button>
                </div>
              </section>

              <section className="drawing-defense-setting">
                <div className="drawing-defense-setting-header">
                  <div>
                    <h2>敵人速度</h2>
                    <p>{speed} px/s</p>
                  </div>
                  <span>{isCustomSpeed ? '自訂' : '預設'}</span>
                </div>
                <div className="drawing-defense-option-grid drawing-defense-speed-grid">
                  {ENEMY_SPEED_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`drawing-defense-option ${speed === option ? 'active' : ''}`}
                      onClick={() => setSpeed(option)}
                    >
                      <span className="drawing-defense-option-title">{option}</span>
                      <span className="drawing-defense-option-meta">px/s</span>
                    </button>
                  ))}
                  <label
                    className={`drawing-defense-option drawing-defense-option-custom ${isCustomSpeed ? 'active' : ''}`}
                    onClick={() => setSpeed(customSpeed)}
                  >
                    <span className="drawing-defense-option-title">自訂</span>
                    <input
                      className="drawing-defense-number-input"
                      type="number"
                      min="1"
                      max="170"
                      step="1"
                      value={customSpeed}
                      onChange={(event) => {
                        const value = clamp(Number(event.target.value), 1, 170);
                        setCustomSpeed(value);
                        setSpeed(value);
                      }}
                      onFocus={() => setSpeed(customSpeed)}
                      aria-label="自訂敵人速度"
                    />
                  </label>
                </div>
              </section>

              <section className="drawing-defense-setting">
                <div className="drawing-defense-setting-header">
                  <div>
                    <h2>辨識嚴格度</h2>
                    <p>{strictness}%</p>
                  </div>
                </div>
                <input
                  className="drawing-defense-slider"
                  type="range"
                  min={MIN_RECOGNITION_STRICTNESS}
                  max={MAX_RECOGNITION_STRICTNESS}
                  step="5"
                  value={strictness}
                  onChange={(event) => setStrictness(Number(event.target.value))}
                />
              </section>

              <section className="drawing-defense-setting">
                <div className="drawing-defense-setting-header">
                  <div>
                    <h2>收筆等待</h2>
                    <p>{strokeWaitMs} ms</p>
                  </div>
                </div>
                <div className="drawing-defense-option-grid drawing-defense-wait-grid">
                  {STROKE_WAIT_OPTIONS.map((wait) => (
                    <button
                      key={wait}
                      type="button"
                      className={`drawing-defense-option ${strokeWaitMs === wait ? 'active' : ''}`}
                      onClick={() => setStrokeWaitMs(wait)}
                    >
                      <span className="drawing-defense-option-title">{wait / 1000}s</span>
                    </button>
                  ))}
                  <label
                    className={`drawing-defense-option drawing-defense-option-custom ${!STROKE_WAIT_OPTIONS.includes(strokeWaitMs as typeof STROKE_WAIT_OPTIONS[number]) ? 'active' : ''}`}
                    onClick={() => setStrokeWaitMs(customStrokeWaitMs)}
                  >
                    <span className="drawing-defense-option-title">自訂</span>
                    <input
                      className="drawing-defense-number-input"
                      type="number"
                      min="180"
                      max="600"
                      step="10"
                      value={customStrokeWaitMs}
                      onChange={(event) => {
                        const value = clamp(Number(event.target.value), 180, 600);
                        setCustomStrokeWaitMs(value);
                        setStrokeWaitMs(value);
                      }}
                      onFocus={() => setStrokeWaitMs(customStrokeWaitMs)}
                      aria-label="自訂收筆等待毫秒"
                    />
                  </label>
                </div>
              </section>

              <section className="drawing-defense-setting drawing-defense-setting-wide">
                <div className="drawing-defense-setting-header">
                  <div>
                    <h2>背景</h2>
                    <p>{backgroundSummary}</p>
                  </div>
                  <span>{backgroundModeLabel}</span>
                </div>
                <div className="drawing-defense-background-controls">
                  <button
                    type="button"
                    className={`drawing-defense-option ${backgroundMode === 'stars' ? 'active' : ''}`}
                    onClick={() => setBackgroundMode('stars')}
                  >
                    <span className="drawing-defense-option-title">星空圖片</span>
                    <span className="drawing-defense-option-meta">目前背景貼圖</span>
                  </button>
                  <div
                    className={`drawing-defense-background-card ${backgroundMode === 'color' ? 'active' : ''}`}
                    onClick={() => setBackgroundMode('color')}
                  >
                    <div className="drawing-defense-background-card-header">
                      <span>背景顏色</span>
                      <strong>{backgroundColor}</strong>
                    </div>
                    <div className="drawing-defense-color-palette" role="group" aria-label="背景色票">
                      {BACKGROUND_COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`drawing-defense-color-swatch ${backgroundColor === color ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={(event) => {
                            event.stopPropagation();
                            setBackgroundMode('color');
                            setBackgroundColor(color);
                          }}
                          aria-label={`背景顏色 ${color}`}
                        />
                      ))}
                      <input
                        className="drawing-defense-color-input"
                        type="color"
                        value={backgroundColor}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          setBackgroundMode('color');
                          setBackgroundColor(event.target.value);
                        }}
                        aria-label="自訂背景顏色"
                      />
                    </div>
                  </div>
                  <label
                    className={`drawing-defense-background-card ${backgroundMode === 'image' ? 'active' : ''}`}
                    onClick={() => {
                      if (uploadedBackgroundUrl) setBackgroundMode('image');
                    }}
                  >
                    <div className="drawing-defense-background-card-header">
                      <span>自訂圖像</span>
                      <strong>{uploadedBackgroundUrl ? '已上傳' : '未上傳'}</strong>
                    </div>
                    <span className="drawing-defense-option-meta">{uploadedBackgroundName}</span>
                    <span className="drawing-defense-upload-action">選擇圖像</span>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleBackgroundImageUpload}
                      aria-label="上傳自訂背景圖像"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div className="drawing-defense-config-footer">
              <div className="drawing-defense-config-summary">
                <strong>{activeConfig.label}</strong>
                <span>{gameDurationLabel}</span>
                <span>{maxHp} HP</span>
                <span>{speed} px/s</span>
                <span>{strictness}%</span>
                <span>{strokeWaitMs} ms</span>
                <span>{backgroundSummary}</span>
              </div>
              <div className="drawing-defense-config-actions">
                <button className="btn btn-primary btn-lg config-start-btn" onClick={startGame}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  開始訓練
                </button>
                <button className="btn btn-ghost btn-lg" onClick={onExit}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="drawing-defense-panel drawing-defense-panel-compact">
          <h1>暫停</h1>
          <button className="btn btn-primary btn-lg" onClick={resumeGame}>繼續遊戲</button>
          <button className="btn btn-secondary btn-lg" onClick={restartGame}>重新開始</button>
          <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>返回目錄</button>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="experiment-container drawing-defense-results-container" style={{ overflowY: 'auto' }}>
          <div className="experiment-results">
            <h1>訓練完成！</h1>
            <div className="drawing-defense-result-summary">
              <span>
                <small>使用者</small>
                <strong>{result.Participant_ID}</strong>
              </span>
              <span>
                <small>消滅敵人數 / 生成敵人數</small>
                <strong>{result.Enemies_Defeated}/{result.Enemies_Spawned}</strong>
              </span>
              <span>
                <small>總時長</small>
                <strong>{result.Total_Duration_Seconds} 秒</strong>
              </span>
              <span>
                <small>Discord 圖像上傳</small>
                <strong>{sampleUpload.pending > 0 ? sampleUploadLabel : `${sampleUpload.uploaded}/${sampleUpload.uploaded + sampleUpload.failed}`}</strong>
              </span>
            </div>

            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>圖形種類</th>
                  <th>反應時間</th>
                  <th>是否成功消滅</th>
                </tr>
              </thead>
              <tbody>
                {result.Enemy_Results.map((enemyResult) => (
                  <tr key={enemyResult.Enemy_Number}>
                    <td>{enemyResult.Enemy_Number}</td>
                    <td>{SHAPE_LABEL[enemyResult.Shape]}</td>
                    <td>
                      {enemyResult.Reaction_Time_Seconds === null ? '-' : `${enemyResult.Reaction_Time_Seconds} 秒`}
                    </td>
                    <td className={enemyResult.Defeated ? 'result-success' : 'result-fail'}>
                      {enemyResult.Defeated ? '成功' : '未消滅'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="results-actions">
              <button className="btn btn-primary btn-lg" onClick={downloadResult}>下載 CSV 成績</button>
              <button className="btn btn-secondary btn-lg" onClick={restartGame}>再玩一次</button>
              <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>返回設定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cloneUsableStrokes(strokes: Point[][]): Point[][] {
  return strokes
    .filter((stroke) => stroke.length >= 2)
    .map((stroke) => stroke.map((point) => ({ x: point.x, y: point.y })));
}

function createDrawingSampleBlob(strokes: Point[][]): Promise<Blob> {
  const points = flattenStrokes(strokes);
  if (points.length < 2) {
    return Promise.reject(new Error('Drawing sample has no usable points.'));
  }

  const box = getBox(points);
  const width = Math.max(1, box.maxX - box.minX);
  const height = Math.max(1, box.maxY - box.minY);
  const canvas = document.createElement('canvas');
  canvas.width = DRAWING_SAMPLE_IMAGE_SIZE;
  canvas.height = DRAWING_SAMPLE_IMAGE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas 2D context is unavailable.'));

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = DRAWING_SAMPLE_STROKE_WIDTH;

  const drawableSize = DRAWING_SAMPLE_IMAGE_SIZE - DRAWING_SAMPLE_IMAGE_PADDING * 2;
  const scale = drawableSize / Math.max(width, height);
  const offsetX = (DRAWING_SAMPLE_IMAGE_SIZE - width * scale) / 2 - box.minX * scale;
  const offsetY = (DRAWING_SAMPLE_IMAGE_SIZE - height * scale) / 2 - box.minY * scale;

  ctx.beginPath();
  strokes.forEach((stroke) => {
    stroke.forEach((point, index) => {
      const x = point.x * scale + offsetX;
      const y = point.y * scale + offsetY;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
  });
  ctx.stroke();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to encode drawing sample PNG.'));
    }, 'image/png');
  });
}

async function uploadDrawingSample(blob: Blob, metadata: DrawingSampleMetadata): Promise<void> {
  const filename = `drawing_${metadata.targetShape ?? 'unknown'}_${metadata.matched ? 'hit' : 'miss'}_${metadata.sampleId}.png`;
  const body = new FormData();
  body.append('image', blob, filename);
  body.append('metadata', JSON.stringify(metadata));

  const response = await fetch(DRAWING_SAMPLE_UPLOAD_ENDPOINT, {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload failed with ${response.status}${text ? `: ${text}` : ''}`);
  }
}

function createDrawingSampleId(date: Date, participantId: string, targetShape: ShapeId | null): string {
  const timestamp = date.toISOString().replace(/\D/g, '').slice(0, 17);
  const user = sanitizeFilenamePart(participantId) || 'user';
  const shape = targetShape ?? 'unknown';
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}_${user}_${shape}_${random}`;
}

function sanitizeFilenamePart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function recognizeShape(strokes: Point[][], strictness: number): ShapeId | null {
  const usableStrokes = strokes.filter((stroke) => stroke.length >= 2);
  const rawPoints = flattenStrokes(usableStrokes);
  if (rawPoints.length < 6) return null;

  if (looksLikeCircle(rawPoints, strictness)) return 'circle';
  const box = getBox(rawPoints);
  const tolerance = shapeTolerance(strictness);
  if (looksLikeIntersectingCross(usableStrokes, box, tolerance)) return 'cross';
  const polygonRecognition = recognizePolygonByRdpCorners(usableStrokes, rawPoints, box, strictness);
  if (polygonRecognition) return polygonRecognition;
  if (looksLikeCross(usableStrokes, rawPoints, box, tolerance)) return 'cross';

  const candidate = normalizeGesture(usableStrokes);
  let best: { shape: ShapeId; score: number } | null = null;

  for (const template of GESTURE_TEMPLATES) {
    if (template.shape === 'square' || template.shape === 'triangle') continue;
    for (const variant of template.variants) {
      const strokePenalty = Math.abs(usableStrokes.length - template.strokeCount) * 0.08;
      const distanceScore = pathDistance(candidate, variant) / (RECOGNIZER_SIZE * 0.48);
      const score = Math.max(0, 1 - distanceScore - strokePenalty);
      if (!best || score > best.score) {
        best = { shape: template.shape, score };
      }
    }
  }

  const threshold = 0.42 + strictness * 0.0025;
  const adjustedThreshold =
    best?.shape === 'cross'
      ? threshold - 0.06
      : threshold;
  return best && best.score >= adjustedThreshold ? best.shape : null;
}

function shapeTolerance(strictness: number): number {
  return 1 - clamp(strictness, 0, 100) / 100;
}

function looksLikeCircle(points: Point[], strictness: number): boolean {
  if (points.length < 12) return false;
  const box = getBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const maxSize = Math.max(width, height);
  const minSize = Math.min(width, height);
  if (maxSize < 24 || minSize / Math.max(1, maxSize) < 0.45) return false;

  const strictnessRatio = strictness / 100;
  const closedness = distance(points[0], points[points.length - 1]) / Math.max(1, maxSize);
  const area = polygonArea(points);
  const areaRatio = area / Math.max(1, width * height);
  const perimeter = pathLength(points) + distance(points[points.length - 1], points[0]);
  const circularity = 4 * Math.PI * area / Math.max(1, perimeter * perimeter);
  const radialVariation = radialCoefficientOfVariation(points, box);
  const simplified = simplify(points, Math.max(4, maxSize * 0.045));
  const corners = countCorners(simplified);
  const closureLimit = 0.5 - strictnessRatio * 0.18;
  const radialLimit = 0.42 - strictnessRatio * 0.14;
  const circularityFloor = 0.58 + strictness * 0.0012;

  return (
    closedness <= closureLimit &&
    areaRatio >= 0.48 &&
    areaRatio <= 0.95 &&
    circularity >= circularityFloor &&
    radialVariation <= radialLimit &&
    (corners >= 5 || simplified.length >= 7)
  );
}

interface GestureTemplate {
  shape: ShapeId;
  strokeCount: number;
  variants: Point[][];
}

const GESTURE_TEMPLATES: GestureTemplate[] = createGestureTemplates();

function createGestureTemplates(): GestureTemplate[] {
  const rawTemplates: Array<{ shape: ShapeId; strokes: Point[][] }> = [
    {
      shape: 'circle',
      strokes: [sampleEllipse(0, 0, 50, 50, 48)],
    },
    {
      shape: 'square',
      strokes: [[
        { x: -48, y: -48 },
        { x: 48, y: -48 },
        { x: 48, y: 48 },
        { x: -48, y: 48 },
        { x: -48, y: -48 },
      ]],
    },
    {
      shape: 'square',
      strokes: [
        [{ x: -48, y: -48 }, { x: 48, y: -48 }],
        [{ x: 48, y: -48 }, { x: 48, y: 48 }],
        [{ x: 48, y: 48 }, { x: -48, y: 48 }],
        [{ x: -48, y: 48 }, { x: -48, y: -48 }],
      ],
    },
    {
      shape: 'square',
      strokes: [
        [{ x: -48, y: -48 }, { x: -48, y: 48 }],
        [{ x: -48, y: -48 }, { x: 48, y: -48 }, { x: 48, y: 48 }],
        [{ x: -48, y: 48 }, { x: 48, y: 48 }],
      ],
    },
    {
      shape: 'triangle',
      strokes: [[
        { x: 0, y: -54 },
        { x: 52, y: 46 },
        { x: -52, y: 46 },
        { x: 0, y: -54 },
      ]],
    },
    {
      shape: 'triangle',
      strokes: [
        [{ x: 0, y: -54 }, { x: 52, y: 46 }],
        [{ x: 52, y: 46 }, { x: -52, y: 46 }],
        [{ x: -52, y: 46 }, { x: 0, y: -54 }],
      ],
    },
    {
      shape: 'cross',
      strokes: [
        [{ x: -50, y: -50 }, { x: 50, y: 50 }],
        [{ x: 50, y: -50 }, { x: -50, y: 50 }],
      ],
    },
    {
      shape: 'cross',
      strokes: [[
        { x: -50, y: -50 },
        { x: 50, y: 50 },
        { x: 50, y: -50 },
        { x: -50, y: 50 },
      ]],
    },
    {
      shape: 'vertical-line',
      strokes: [[{ x: 0, y: -55 }, { x: 0, y: 55 }]],
    },
    {
      shape: 'horizontal-line',
      strokes: [[{ x: -55, y: 0 }, { x: 55, y: 0 }]],
    },
  ];

  return rawTemplates.map((template) => ({
    shape: template.shape,
    strokeCount: template.strokes.length,
    variants: generateStrokeVariants(template.strokes).map(normalizeGesture),
  }));
}

function generateStrokeVariants(strokes: Point[][]): Point[][][] {
  const orders = permutations(strokes);
  const variants: Point[][][] = [];
  orders.forEach((orderedStrokes) => {
    const directionCount = 2 ** orderedStrokes.length;
    for (let mask = 0; mask < directionCount; mask += 1) {
      variants.push(orderedStrokes.map((stroke, index) => {
        const shouldReverse = (mask & (1 << index)) !== 0;
        return shouldReverse ? [...stroke].reverse() : stroke;
      }));
    }
  });
  return variants;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    permutations(rest).forEach((permutation) => result.push([item, ...permutation]));
  });
  return result;
}

function normalizeGesture(strokes: Point[][]): Point[] {
  const points = resamplePath(strokes.flatMap((stroke) => stroke), RECOGNIZER_POINTS);
  const box = getBox(points);
  const width = Math.max(1, box.maxX - box.minX);
  const height = Math.max(1, box.maxY - box.minY);
  const scale = RECOGNIZER_SIZE / Math.max(width, height);
  const scaled = points.map((point) => ({
    x: (point.x - box.minX) * scale,
    y: (point.y - box.minY) * scale,
  }));
  const center = centroid(scaled);
  return scaled.map((point) => ({
    x: point.x - center.x,
    y: point.y - center.y,
  }));
}

function resamplePath(points: Point[], targetCount: number): Point[] {
  if (points.length === 0) return [];
  const interval = pathLength(points) / Math.max(1, targetCount - 1);
  const result: Point[] = [{ ...points[0] }];
  let accumulated = 0;
  let previous = points[0];

  for (let i = 1; i < points.length; i += 1) {
    let current = points[i];
    let segmentLength = distance(previous, current);
    while (segmentLength > 0 && accumulated + segmentLength >= interval) {
      const ratio = (interval - accumulated) / segmentLength;
      const inserted = {
        x: previous.x + ratio * (current.x - previous.x),
        y: previous.y + ratio * (current.y - previous.y),
      };
      result.push(inserted);
      previous = inserted;
      segmentLength = distance(previous, current);
      accumulated = 0;
    }
    accumulated += segmentLength;
    previous = current;
  }

  while (result.length < targetCount) {
    result.push({ ...points[points.length - 1] });
  }
  return result.slice(0, targetCount);
}

function pathDistance(a: Point[], b: Point[]): number {
  const count = Math.min(a.length, b.length);
  if (count === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < count; i += 1) {
    sum += distance(a[i], b[i]);
  }
  return sum / count;
}

function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / Math.max(1, points.length), y: sum.y / Math.max(1, points.length) };
}

function sampleEllipse(cx: number, cy: number, rx: number, ry: number, count: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    points.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  }
  return points;
}

function recognizePolygonByRdpCorners(
  strokes: Point[][],
  points: Point[],
  box: ReturnType<typeof getBox>,
  strictness: number,
): ShapeId | null {
  const corners = getRdpPolygonCorners(strokes, points, box, strictness);
  if (corners.length === 3) return 'triangle';
  if (corners.length === 4) return 'square';
  return null;
}

function getRdpPolygonCorners(
  strokes: Point[][],
  points: Point[],
  box: ReturnType<typeof getBox>,
  strictness: number,
): Point[] {
  if (points.length < 6) return [];

  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const maxSize = Math.max(width, height);
  const minSize = Math.min(width, height);
  const diagonal = Math.hypot(width, height);
  if (maxSize < 24 || minSize / Math.max(1, maxSize) < 0.32) return [];

  const preprocessed = filterStationaryPoints(flattenStrokes(strokes), RDP_STATIONARY_POINT_DISTANCE_PX);
  if (preprocessed.length < 6) return [];

  const simplified = simplify(preprocessed, rdpEpsilon(strictness, diagonal));
  const closed = mergeClosedEndpoint(simplified, RDP_CLOSED_ENDPOINT_DISTANCE_PX);
  return removeNearlyStraightCorners(closed, RDP_STRAIGHT_ANGLE_DEGREES);
}

function rdpEpsilon(strictness: number, diagonal: number): number {
  return Math.max(1, diagonal) * rdpEpsilonRatio(strictness);
}

function rdpEpsilonRatio(strictness: number): number {
  const value = clamp(strictness, MIN_RECOGNITION_STRICTNESS, MAX_RECOGNITION_STRICTNESS);
  if (value <= DEFAULT_RECOGNITION_STRICTNESS) {
    const ratio = (DEFAULT_RECOGNITION_STRICTNESS - value) /
      Math.max(1, DEFAULT_RECOGNITION_STRICTNESS - MIN_RECOGNITION_STRICTNESS);
    return DEFAULT_RDP_EPSILON_RATIO + ratio * (MAX_RDP_EPSILON_RATIO - DEFAULT_RDP_EPSILON_RATIO);
  }

  const ratio = (value - DEFAULT_RECOGNITION_STRICTNESS) /
    Math.max(1, MAX_RECOGNITION_STRICTNESS - DEFAULT_RECOGNITION_STRICTNESS);
  return DEFAULT_RDP_EPSILON_RATIO - ratio * (DEFAULT_RDP_EPSILON_RATIO - MIN_RDP_EPSILON_RATIO);
}

function filterStationaryPoints(points: Point[], minDistance: number): Point[] {
  if (points.length === 0) return [];

  const filtered: Point[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (distance(points[i], filtered[filtered.length - 1]) >= minDistance) {
      filtered.push(points[i]);
    }
  }
  return filtered;
}

function mergeClosedEndpoint(points: Point[], closeDistance: number): Point[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (distance(first, last) > closeDistance) return points;

  return [
    { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 },
    ...points.slice(1, -1),
  ];
}

function removeNearlyStraightCorners(points: Point[], straightAngle: number): Point[] {
  const corners = [...points];
  let changed = true;

  while (changed && corners.length > 2) {
    changed = false;
    for (let i = 0; i < corners.length; i += 1) {
      const previous = corners[(i - 1 + corners.length) % corners.length];
      const current = corners[i];
      const next = corners[(i + 1) % corners.length];
      if (angle(previous, current, next) > straightAngle) {
        corners.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  return corners;
}

function looksLikeCross(strokes: Point[][], points: Point[], box: ReturnType<typeof getBox>, tolerance: number): boolean {
  const center = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
  const lineStrokes = strokes
    .map(getStrokeLineFeatures)
    .filter((stroke): stroke is StrokeLineFeatures => stroke !== null && stroke.straightness > 0.56 - tolerance * 0.18);
  if (lineStrokes.length >= 2) {
    for (let i = 0; i < lineStrokes.length; i += 1) {
      for (let j = i + 1; j < lineStrokes.length; j += 1) {
        const diff = angleDifference(lineStrokes[i].angle, lineStrokes[j].angle);
        const bothDiagonal = isDiagonal(lineStrokes[i].angle, tolerance) && isDiagonal(lineStrokes[j].angle, tolerance);
        const bothCrossCenter = linePassesNearCenter(lineStrokes[i], center, box, tolerance) && linePassesNearCenter(lineStrokes[j], center, box, tolerance);
        if (bothDiagonal && bothCrossCenter && diff > 42 - tolerance * 16 && diff < 138 + tolerance * 16) {
          return true;
        }
      }
    }
  }

  const quadrants = new Set<string>();
  let positive = 0;
  let negative = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    if (Math.abs(dx) < 2 || Math.abs(dy) < 2) continue;
    if (dx * dy > 0) positive += 1;
    else negative += 1;
  }
  points.forEach((point) => quadrants.add(`${point.x > center.x ? 'r' : 'l'}${point.y > center.y ? 'b' : 't'}`));
  return quadrants.size >= 4 && positive > 1 && negative > 1 && Math.min(positive, negative) / Math.max(positive, negative) > 0.12 - tolerance * 0.08;
}

function looksLikeIntersectingCross(strokes: Point[][], box: ReturnType<typeof getBox>, tolerance: number): boolean {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const maxSize = Math.max(width, height);
  const center = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
  const strokeLines = strokes
    .map(getStrokeLineFeatures)
    .filter((stroke): stroke is StrokeLineFeatures => stroke !== null && stroke.straightness > 0.58 - tolerance * 0.16);
  const segmentLines = getSimplifiedStrokeSegments(strokes, Math.max(4, maxSize * 0.04), Math.max(12, maxSize * 0.22));
  const diagonalLines = [...strokeLines, ...segmentLines]
    .filter((line) => isDiagonal(line.angle, tolerance) && distance(line.first, line.last) >= maxSize * (0.36 - tolerance * 0.06));
  const centerLimit = maxSize * (0.26 + tolerance * 0.08);
  const minInternalRatio = 0.04 - tolerance * 0.015;

  for (let i = 0; i < diagonalLines.length - 1; i += 1) {
    for (let j = i + 1; j < diagonalLines.length; j += 1) {
      const first = diagonalLines[i];
      const second = diagonalLines[j];
      const diff = angleDifference(first.angle, second.angle);
      if (diff < 48 - tolerance * 12 || diff > 132 + tolerance * 12) continue;

      const intersection = lineIntersection(first.first, first.last, second.first, second.last);
      if (!intersection) continue;
      if (distance(intersection, center) > centerLimit) continue;
      if (!pointInsideSegment(intersection, first.first, first.last, maxSize * 0.04)) continue;
      if (!pointInsideSegment(intersection, second.first, second.last, maxSize * 0.04)) continue;
      if (!pointIsInternalToSegment(intersection, first.first, first.last, minInternalRatio)) continue;
      if (!pointIsInternalToSegment(intersection, second.first, second.last, minInternalRatio)) continue;

      return true;
    }
  }

  return false;
}

interface StrokeLineFeatures {
  angle: number;
  first: Point;
  last: Point;
  straightness: number;
}

function flattenStrokes(strokes: Point[][]): Point[] {
  return strokes.flatMap((stroke) => stroke);
}

function strokesPathLength(strokes: Point[][]): number {
  return strokes.reduce((sum, stroke) => sum + pathLength(stroke), 0);
}

function getStrokeLineFeatures(stroke: Point[]): StrokeLineFeatures | null {
  if (stroke.length < 2) return null;
  const first = stroke[0];
  const last = stroke[stroke.length - 1];
  const length = pathLength(stroke);
  if (length < 12) return null;
  const angle = normalizeAngle(Math.atan2(last.y - first.y, last.x - first.x) * 180 / Math.PI);
  return {
    angle,
    first,
    last,
    straightness: distance(first, last) / Math.max(1, length),
  };
}

function getSimplifiedStrokeSegments(strokes: Point[][], epsilon: number, minLength: number): StrokeLineFeatures[] {
  const segments: StrokeLineFeatures[] = [];
  strokes.forEach((stroke) => {
    const simplified = simplify(stroke, epsilon);
    for (let i = 1; i < simplified.length; i += 1) {
      const first = simplified[i - 1];
      const last = simplified[i];
      const segmentLength = distance(first, last);
      if (segmentLength < minLength) continue;
      segments.push({
        angle: normalizeAngle(Math.atan2(last.y - first.y, last.x - first.x) * 180 / Math.PI),
        first,
        last,
        straightness: 1,
      });
    }
  });
  return segments;
}

function lineIntersection(aStart: Point, aEnd: Point, bStart: Point, bEnd: Point): Point | null {
  const denominator =
    (aStart.x - aEnd.x) * (bStart.y - bEnd.y) -
    (aStart.y - aEnd.y) * (bStart.x - bEnd.x);
  if (Math.abs(denominator) < 0.01) return null;

  const aCross = aStart.x * aEnd.y - aStart.y * aEnd.x;
  const bCross = bStart.x * bEnd.y - bStart.y * bEnd.x;
  return {
    x: (aCross * (bStart.x - bEnd.x) - (aStart.x - aEnd.x) * bCross) / denominator,
    y: (aCross * (bStart.y - bEnd.y) - (aStart.y - aEnd.y) * bCross) / denominator,
  };
}

function pointInsideSegment(point: Point, start: Point, end: Point, margin: number): boolean {
  return (
    point.x >= Math.min(start.x, end.x) - margin &&
    point.x <= Math.max(start.x, end.x) + margin &&
    point.y >= Math.min(start.y, end.y) - margin &&
    point.y <= Math.max(start.y, end.y) + margin
  );
}

function pointIsInternalToSegment(point: Point, start: Point, end: Point, minRatio: number): boolean {
  const ratio = segmentProjectionRatio(point, start, end);
  return ratio >= minRatio && ratio <= 1 - minRatio;
}

function segmentProjectionRatio(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 1) return 0;
  return ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
}

function normalizeAngle(angle: number): number {
  const normalized = ((angle % 180) + 180) % 180;
  return normalized;
}

function angleDifference(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 180 - diff);
}

function isDiagonal(angle: number, tolerance: number): boolean {
  return Math.abs(angle - 45) < 34 + tolerance * 18 || Math.abs(angle - 135) < 34 + tolerance * 18;
}

function linePassesNearCenter(line: StrokeLineFeatures, center: Point, box: ReturnType<typeof getBox>, tolerance: number): boolean {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const maxSize = Math.max(width, height);
  const margin = maxSize * (0.08 + tolerance * 0.05);
  const minX = Math.min(line.first.x, line.last.x) - margin;
  const maxX = Math.max(line.first.x, line.last.x) + margin;
  const minY = Math.min(line.first.y, line.last.y) - margin;
  const maxY = Math.max(line.first.y, line.last.y) + margin;
  if (center.x < minX || center.x > maxX || center.y < minY || center.y > maxY) return false;
  return perpendicularDistance(center, line.first, line.last) <= maxSize * (0.16 + tolerance * 0.08);
}

function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDistance) {
      index = i;
      maxDistance = d;
    }
  }
  if (maxDistance > epsilon) {
    const left = simplify(points.slice(0, index + 1), epsilon);
    const right = simplify(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function countCorners(points: Point[]): number {
  let corners = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = angle(points[i - 1], points[i], points[i + 1]);
    if (a < 135) corners += 1;
  }
  return corners;
}

function angle(a: Point, b: Point, c: Point): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  return Math.acos(Math.max(-1, Math.min(1, dot / Math.max(mag, 1)))) * 180 / Math.PI;
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  if (dx === 0 && dy === 0) return distance(point, lineStart);
  return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / Math.hypot(dx, dy);
}

function pathLength(points: Point[]): number {
  return points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getBox(points: Point[]) {
  return points.reduce(
    (box, point) => ({
      minX: Math.min(box.minX, point.x),
      maxX: Math.max(box.maxX, point.x),
      minY: Math.min(box.minY, point.y),
      maxY: Math.max(box.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
}

function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    area += points[i].x * next.y - next.x * points[i].y;
  }
  return Math.abs(area) / 2;
}

function radialCoefficientOfVariation(points: Point[], box: ReturnType<typeof getBox>): number {
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const distances = points.map((point) => Math.hypot(point.x - cx, point.y - cy));
  const mean = distances.reduce((sum, value) => sum + value, 0) / Math.max(1, distances.length);
  const variance = distances.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, distances.length);
  return Math.sqrt(variance) / Math.max(1, mean);
}

function toCsv(records: SessionRecord[]): string {
  const columns: Array<{ label: string; value: (record: SessionRecord, enemyResult: EnemyResult | null) => unknown }> = [
    { label: '測驗日期', value: (record) => record.Test_Date },
    { label: 'Participant_ID', value: (record) => record.Participant_ID },
    { label: 'Difficulty', value: (record) => record.Difficulty },
    { label: 'Game_Time_Seconds', value: (record) => record.Game_Time_Seconds ?? 'Infinite' },
    { label: 'Starting_HP', value: (record) => record.Starting_HP },
    { label: 'Enemy_Speed', value: (record) => record.Enemy_Speed },
    { label: 'Recognition_Strictness', value: (record) => record.Recognition_Strictness },
    { label: 'Stroke_Wait_Milliseconds', value: (record) => record.Stroke_Wait_Milliseconds },
    { label: 'Total_Duration_Seconds', value: (record) => record.Total_Duration_Seconds },
    { label: 'Enemies_Spawned', value: (record) => record.Enemies_Spawned },
    { label: 'Enemies_Defeated', value: (record) => record.Enemies_Defeated },
    { label: 'HP_Remaining', value: (record) => record.HP_Remaining },
    { label: 'Game_Result', value: (record) => record.Game_Result },
    { label: 'Enemy_Number', value: (_record, enemyResult) => enemyResult?.Enemy_Number ?? '' },
    { label: 'Enemy_Shape', value: (_record, enemyResult) => enemyResult ? SHAPE_LABEL[enemyResult.Shape] : '' },
    { label: 'Enemy_Reaction_Time_Seconds', value: (_record, enemyResult) => enemyResult?.Reaction_Time_Seconds ?? '' },
    { label: 'Enemy_Defeated', value: (_record, enemyResult) => enemyResult?.Defeated ?? '' },
  ];
  const rows = records.flatMap((record) => {
    const enemyResults = record.Enemy_Results.length > 0 ? record.Enemy_Results : [null];
    return enemyResults.map((enemyResult) => columns.map((column) => csvCell(column.value(record, enemyResult))).join(','));
  });
  return [columns.map((column) => column.label).join(','), ...rows].join('\n');
}

function csvCell(value: unknown): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatGameDuration(duration: GameDurationSeconds): string {
  return duration === null ? '無限模式' : `${duration}s`;
}

function formatTestDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
