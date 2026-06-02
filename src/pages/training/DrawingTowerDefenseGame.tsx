import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, type Ticker } from 'pixi.js';
import { initJsPsych } from 'jspsych';
import { downloadCsvFile } from '../../utils/downloadFile';
import { getActiveUser } from '../../utils/settings';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type ShapeId = 'circle' | 'cross' | 'square' | 'triangle' | 'vertical-line' | 'horizontal-line';
type GamePhase = 'menu' | 'playing' | 'paused' | 'results';
type GameResult = 'Victory' | 'Defeat';

interface DrawingTowerDefenseGameProps {
  onExit: () => void;
}

interface DifficultyConfig {
  label: string;
  enemyCount: number;
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
}

interface SessionRecord {
  Participant_ID: string;
  Difficulty: Difficulty;
  Enemy_Speed: number;
  Recognition_Strictness: number;
  Stroke_Wait_Milliseconds: number;
  Total_Duration_Seconds: number;
  Enemies_Defeated: number;
  HP_Remaining: number;
  Game_Result: GameResult;
}

const SHAPES: readonly ShapeId[] = ['circle', 'cross', 'square', 'triangle', 'vertical-line', 'horizontal-line'];
const DEFAULT_JUDGE_DELAY_MS = 300;
const STROKE_WAIT_OPTIONS = [220, DEFAULT_JUDGE_DELAY_MS, 350] as const;
const ENEMY_SPEED_OPTIONS = [30, 60, 90] as const;
const DEFAULT_ENEMY_SPEED = 30;
const DEFAULT_ENEMY_COUNT = 12;
const RECOGNIZER_POINTS = 64;
const RECOGNIZER_SIZE = 200;
const starSkyBackgroundStyle: CSSProperties = {
  backgroundImage: `url(${import.meta.env.BASE_URL}assets/StarSky.png)`,
};

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  Beginner: { label: '初級', enemyCount: DEFAULT_ENEMY_COUNT, spawnMode: 'after-clear-delay', spawnIntervalSec: 2, description: '消滅後 2 秒出現下一名' },
  Intermediate: { label: '中級', enemyCount: DEFAULT_ENEMY_COUNT, spawnMode: 'after-clear', spawnIntervalSec: 0, description: '消滅後馬上出現下一名' },
  Advanced: { label: '高級', enemyCount: DEFAULT_ENEMY_COUNT, spawnMode: 'fixed-interval', spawnIntervalSec: 3, description: '每 3 秒出現一名' },
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
  const recognitionTimerRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);
  const metricsRef = useRef({ defeated: 0, hp: 3, spawned: 0, elapsed: 0, spawnTimer: 0, nextId: 1 });
  const phaseRef = useRef<GamePhase>('menu');
  const configRef = useRef({ difficulty: 'Beginner' as Difficulty, speed: DEFAULT_ENEMY_SPEED, strictness: 45, strokeWaitMs: DEFAULT_JUDGE_DELAY_MS });
  const jsPsychRef = useRef<ReturnType<typeof initJsPsych> | null>(null);

  const [phase, setPhaseState] = useState<GamePhase>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [speed, setSpeed] = useState(DEFAULT_ENEMY_SPEED);
  const [customSpeed, setCustomSpeed] = useState(DEFAULT_ENEMY_SPEED);
  const [strictness, setStrictness] = useState(45);
  const [strokeWaitMs, setStrokeWaitMs] = useState(DEFAULT_JUDGE_DELAY_MS);
  const [customStrokeWaitMs, setCustomStrokeWaitMs] = useState(DEFAULT_JUDGE_DELAY_MS);
  const [hp, setHp] = useState(3);
  const [defeated, setDefeated] = useState(0);
  const [spawned, setSpawned] = useState(0);
  const [recognized, setRecognized] = useState<string>('尚未辨識');
  const [result, setResult] = useState<SessionRecord | null>(null);

  const activeConfig = DIFFICULTIES[difficulty];
  const isCustomSpeed = !ENEMY_SPEED_OPTIONS.includes(speed as typeof ENEMY_SPEED_OPTIONS[number]);

  const setPhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => {
    configRef.current = { difficulty, speed, strictness, strokeWaitMs };
  }, [difficulty, speed, strictness, strokeWaitMs]);

  useEffect(() => {
    jsPsychRef.current = initJsPsych();
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
    enemiesRef.current.forEach((enemy) => enemy.node.destroy({ children: true }));
    enemiesRef.current = [];
    const metrics = metricsRef.current;
    const record: SessionRecord = {
      Participant_ID: getActiveUser() || 'Unknown',
      Difficulty: configRef.current.difficulty,
      Enemy_Speed: configRef.current.speed,
      Recognition_Strictness: configRef.current.strictness,
      Stroke_Wait_Milliseconds: configRef.current.strokeWaitMs,
      Total_Duration_Seconds: Number(metrics.elapsed.toFixed(1)),
      Enemies_Defeated: metrics.defeated,
      HP_Remaining: metrics.hp,
      Game_Result: gameResult,
    };
    setResult(record);
    setHp(metrics.hp);
    setDefeated(metrics.defeated);
    setPhase('results');
    try {
      const jsPsychData = jsPsychRef.current?.data;
      const writeData = jsPsychData?.write as unknown as ((data: Record<string, unknown>) => void) | undefined;
      writeData?.call(jsPsychData, record as unknown as Record<string, unknown>);
    } catch (error) {
      console.warn('Unable to write drawing tower defense result to jsPsych data.', error);
    }
  }, [setPhase]);

  const drawLayout = useCallback((app: Application) => {
    const w = app.renderer.width;
    const h = app.renderer.height;
    const bg = new Graphics();
    bg.rect(0, 0, w, h).fill({ color: 0x050816, alpha: 0.22 });
    app.stage.addChild(bg);

    const labels = [
      { text: '畫出敵人板上的圖形', y: h * 0.39 },
    ];
    labels.forEach((label) => {
      const text = new Text({ text: label.text, style: { fill: 0xdbeafe, fontSize: 15, fontWeight: '700' } });
      text.x = 20;
      text.y = label.y;
      app.stage.addChild(text);
    });

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
    const enemy: Enemy = {
      id: metricsRef.current.nextId++,
      x: 70 + Math.random() * Math.max(80, w - 140),
      y: 58,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      node: new Container(),
    };
    const monster = new Text({ text: '👾', style: { fontSize: 42 } });
    monster.anchor.set(0.5);
    monster.x = 0;
    monster.y = -6;
    const board = new Graphics();
    board.roundRect(-34, 18, 68, 50, 6).fill(0xffffff).stroke({ color: 0xc2c6d4, width: 2 });
    drawShape(enemy.shape, board, 0, 43, 54);
    enemy.node.addChild(monster, board);
    enemy.node.x = enemy.x;
    enemy.node.y = enemy.y;
    app.stage.addChild(enemy.node);
    enemiesRef.current.push(enemy);
    metricsRef.current.spawned += 1;
    setSpawned(metricsRef.current.spawned);
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
      if (recognition && target && recognition === target.shape) {
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
  }, []);

  const startGame = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    clearPixiState();
    app.stage.removeChildren();
    drawLayout(app);
    metricsRef.current = { defeated: 0, hp: 3, spawned: 0, elapsed: 0, spawnTimer: 0, nextId: 1 };
    setHp(3);
    setDefeated(0);
    setSpawned(0);
    setResult(null);
    setRecognized('尚未辨識');
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
        metrics.elapsed += dt;
        const noActiveEnemies = enemiesRef.current.length === 0;
        if (cfg.spawnMode === 'fixed-interval' || noActiveEnemies) {
          metrics.spawnTimer += dt;
        } else {
          metrics.spawnTimer = 0;
        }
        if (metrics.spawned < cfg.enemyCount) {
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
        const enemyBottomOffset = 68;
        const defenseY = app.renderer.height - enemyBottomOffset;
        for (const enemy of [...enemiesRef.current]) {
          enemy.y += configRef.current.speed * dt;
          enemy.node.y = enemy.y;
          if (enemy.y > defenseY) {
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
        if (metrics.spawned >= cfg.enemyCount && enemiesRef.current.length === 0 && metrics.hp > 0) {
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
  }, [drawLayout, finishGame, spawnEnemy]);

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

  const progressText = useMemo(() => `${spawned}/${activeConfig.enemyCount}`, [activeConfig.enemyCount, spawned]);

  const downloadResult = () => {
    if (!result) return;
    downloadCsvFile(toCsv([result]), `drawing_tower_defense_${Date.now()}.csv`);
  };

  return (
    <div className={`drawing-defense drawing-defense-phase-${phase}`} style={starSkyBackgroundStyle}>
      <div ref={pixiHostRef} className="drawing-defense-stage" />
      <div ref={overlayRef} className="drawing-defense-input" />
      {phase !== 'results' && <div className="drawing-defense-hud">
        <div><strong>HP</strong> {hp}/3</div>
        <div><strong>消滅</strong> {defeated}</div>
        <div><strong>敵人</strong> {progressText}</div>
        <div><strong>辨識</strong> {recognized}</div>
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
              <div className="drawing-defense-config-stats">
                <span><strong>{activeConfig.enemyCount}</strong> 敵人</span>
                <span><strong>3</strong> HP</span>
                <span><strong>{speed}</strong> px/s</span>
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
                      min="10"
                      max="170"
                      step="5"
                      value={customSpeed}
                      onChange={(event) => {
                        const value = clamp(Number(event.target.value), 10, 170);
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
                  min="10"
                  max="90"
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
            </div>

            <div className="drawing-defense-config-footer">
              <div className="drawing-defense-config-summary">
                <strong>{activeConfig.label}</strong>
                <span>{speed} px/s</span>
                <span>{strictness}%</span>
                <span>{strokeWaitMs} ms</span>
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
            <div className="results-score">
              {result.Enemies_Defeated}/{DIFFICULTIES[result.Difficulty].enemyCount}
            </div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 24, color: 'var(--text-secondary)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span>使用者：<b style={{ color: 'var(--accent)' }}>{result.Participant_ID}</b></span>
              <span>總時長：<b style={{ color: 'var(--accent)' }}>{result.Total_Duration_Seconds} 秒</b></span>
              <span>剩餘 HP：<b style={{ color: 'var(--accent)' }}>{result.HP_Remaining}/3</b></span>
            </div>

            <table className="results-table">
              <thead>
                <tr>
                  <th>項目</th>
                  <th>結果</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>消滅敵人</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{result.Enemies_Defeated}</td>
                </tr>
                <tr>
                  <td>總敵人數</td>
                  <td>{DIFFICULTIES[result.Difficulty].enemyCount}</td>
                </tr>
                <tr>
                  <td>難度</td>
                  <td>{DIFFICULTIES[result.Difficulty].label}</td>
                </tr>
                <tr>
                  <td>敵人速度</td>
                  <td>{result.Enemy_Speed} px/s</td>
                </tr>
                <tr>
                  <td>辨識嚴格度</td>
                  <td>{result.Recognition_Strictness}%</td>
                </tr>
                <tr>
                  <td>收筆等待</td>
                  <td>{result.Stroke_Wait_Milliseconds} ms</td>
                </tr>
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

function recognizeShape(strokes: Point[][], strictness: number): ShapeId | null {
  const usableStrokes = strokes.filter((stroke) => stroke.length >= 2);
  const rawPoints = flattenStrokes(usableStrokes);
  if (rawPoints.length < 6) return null;

  if (looksLikeCircle(rawPoints, strictness)) return 'circle';

  const candidate = normalizeGesture(usableStrokes);
  let best: { shape: ShapeId; score: number } | null = null;

  for (const template of GESTURE_TEMPLATES) {
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
  return best && best.score >= threshold ? best.shape : null;
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
      shape: 'triangle',
      strokes: [[
        { x: 0, y: -54 },
        { x: 52, y: 46 },
        { x: -52, y: 46 },
        { x: 0, y: -54 },
      ]],
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

function looksLikeCross(strokes: Point[][], points: Point[], box: ReturnType<typeof getBox>, tolerance: number): boolean {
  const lineStrokes = strokes
    .map(getStrokeLineFeatures)
    .filter((stroke): stroke is StrokeLineFeatures => stroke !== null && stroke.straightness > 0.68 - tolerance * 0.18);
  if (lineStrokes.length >= 2) {
    for (let i = 0; i < lineStrokes.length; i += 1) {
      for (let j = i + 1; j < lineStrokes.length; j += 1) {
        const diff = angleDifference(lineStrokes[i].angle, lineStrokes[j].angle);
        const bothDiagonal = isDiagonal(lineStrokes[i].angle, tolerance) && isDiagonal(lineStrokes[j].angle, tolerance);
        if (bothDiagonal && diff > 55 - tolerance * 18 && diff < 125 + tolerance * 18) {
          return true;
        }
      }
    }
  }

  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
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
  points.forEach((point) => quadrants.add(`${point.x > cx ? 'r' : 'l'}${point.y > cy ? 'b' : 't'}`));
  return quadrants.size >= 4 && positive > 2 && negative > 2 && Math.min(positive, negative) / Math.max(positive, negative) > 0.18 - tolerance * 0.1;
}

interface StrokeLineFeatures {
  angle: number;
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
    straightness: distance(first, last) / Math.max(1, length),
  };
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
  return Math.abs(angle - 45) < 28 + tolerance * 14 || Math.abs(angle - 135) < 28 + tolerance * 14;
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
  const headers: (keyof SessionRecord)[] = [
    'Participant_ID',
    'Difficulty',
    'Enemy_Speed',
    'Recognition_Strictness',
    'Stroke_Wait_Milliseconds',
    'Total_Duration_Seconds',
    'Enemies_Defeated',
    'HP_Remaining',
    'Game_Result',
  ];
  const rows = records.map((record) => headers.map((header) => csvCell(record[header])).join(','));
  return [headers.join(','), ...rows].join('\n');
}

function csvCell(value: unknown): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
