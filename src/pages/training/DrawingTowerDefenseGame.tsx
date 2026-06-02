import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  spawnIntervalSec: number;
  maxConcurrentSpawns: number;
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
  Total_Duration_Seconds: number;
  Enemies_Defeated: number;
  HP_Remaining: number;
  Game_Result: GameResult;
}

const SHAPES: readonly ShapeId[] = ['circle', 'cross', 'square', 'triangle', 'vertical-line', 'horizontal-line'];

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  Beginner: { label: '初級', enemyCount: 12, spawnIntervalSec: 2.4, maxConcurrentSpawns: 1 },
  Intermediate: { label: '中級', enemyCount: 24, spawnIntervalSec: 1.55, maxConcurrentSpawns: 1 },
  Advanced: { label: '高級', enemyCount: 42, spawnIntervalSec: 1.05, maxConcurrentSpawns: 2 },
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
  const isDrawingRef = useRef(false);
  const metricsRef = useRef({ defeated: 0, hp: 3, spawned: 0, elapsed: 0, spawnTimer: 0, nextId: 1 });
  const phaseRef = useRef<GamePhase>('menu');
  const configRef = useRef({ difficulty: 'Beginner' as Difficulty, speed: 80, strictness: 45 });
  const jsPsychRef = useRef<ReturnType<typeof initJsPsych> | null>(null);

  const [phase, setPhaseState] = useState<GamePhase>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [speed, setSpeed] = useState(80);
  const [strictness, setStrictness] = useState(45);
  const [hp, setHp] = useState(3);
  const [defeated, setDefeated] = useState(0);
  const [spawned, setSpawned] = useState(0);
  const [recognized, setRecognized] = useState<string>('尚未作答');
  const [result, setResult] = useState<SessionRecord | null>(null);

  const activeConfig = DIFFICULTIES[difficulty];

  const setPhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => {
    configRef.current = { difficulty, speed, strictness };
  }, [difficulty, speed, strictness]);

  useEffect(() => {
    jsPsychRef.current = initJsPsych();
  }, []);

  const clearPixiState = useCallback(() => {
    enemiesRef.current.forEach((enemy) => enemy.node.destroy({ children: true }));
    enemiesRef.current = [];
    drawingLayerRef.current?.clear();
  }, []);

  const finishGame = useCallback((gameResult: GameResult) => {
    const metrics = metricsRef.current;
    const record: SessionRecord = {
      Participant_ID: getActiveUser() || 'Unknown',
      Difficulty: configRef.current.difficulty,
      Enemy_Speed: configRef.current.speed,
      Recognition_Strictness: configRef.current.strictness,
      Total_Duration_Seconds: Number(metrics.elapsed.toFixed(1)),
      Enemies_Defeated: metrics.defeated,
      HP_Remaining: metrics.hp,
      Game_Result: gameResult,
    };
    (jsPsychRef.current?.data.write as ((data: Record<string, unknown>) => void) | undefined)?.(record as unknown as Record<string, unknown>);
    setResult(record);
    setHp(metrics.hp);
    setDefeated(metrics.defeated);
    setPhase('results');
  }, [setPhase]);

  const drawLayout = useCallback((app: Application) => {
    const w = app.renderer.width;
    const h = app.renderer.height;
    const bg = new Graphics();
    bg.rect(0, 0, w, h).fill(0xf6f7f8);
    bg.rect(0, 0, w, h * 0.23).fill(0xe7edf4);
    bg.rect(0, h * 0.23, w, h * 0.55).fill(0xffffff);
    bg.rect(0, h * 0.78, w, h * 0.22).fill(0xf3f5f1);
    bg.rect(0, h * 0.76, w, 6).fill(0xba1a1a);
    app.stage.addChild(bg);

    const labels = [
      { text: '敵人生成區', y: 18 },
      { text: '移動路徑', y: h * 0.39 },
      { text: '防線區', y: h * 0.82 },
    ];
    labels.forEach((label) => {
      const text = new Text({ text: label.text, style: { fill: 0x424752, fontSize: 15, fontWeight: '700' } });
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
    const body = new Graphics();
    body.circle(0, 0, 24).fill(0x005eb8);
    body.rect(-18, 18, 36, 42).fill(0x8ba88e);
    const board = new Graphics();
    board.roundRect(-34, -6, 68, 50, 6).fill(0xffffff).stroke({ color: 0xc2c6d4, width: 2 });
    drawShape(enemy.shape, board, 0, 19, 54);
    enemy.node.addChild(body, board);
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
    const points = pathRef.current;
    if (points.length < 2) return;
    layer.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      layer.lineTo(points[i].x, points[i].y);
    }
    layer.stroke({ color: 0x005eb8, width: 7, alpha: 0.9, cap: 'round', join: 'round' });
  }, []);

  const handlePointerEnd = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const recognition = recognizeShape(pathRef.current, configRef.current.strictness);
    setRecognized(recognition ? SHAPE_LABEL[recognition] : '未辨識');
    const target = enemiesRef.current[0];
    if (recognition && target && recognition === target.shape) {
      target.node.destroy({ children: true });
      enemiesRef.current = enemiesRef.current.filter((enemy) => enemy.id !== target.id);
      metricsRef.current.defeated += 1;
      setDefeated(metricsRef.current.defeated);
    }
    window.setTimeout(() => {
      drawingLayerRef.current?.clear();
      pathRef.current = [];
    }, 180);
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
    setRecognized('尚未作答');
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
        backgroundColor: 0xf6f7f8,
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
        metrics.spawnTimer += dt;
        if (metrics.spawned < cfg.enemyCount && metrics.spawnTimer >= cfg.spawnIntervalSec) {
          metrics.spawnTimer = 0;
          const spawnBatch = cfg.maxConcurrentSpawns > 1 && Math.random() > 0.45 ? cfg.maxConcurrentSpawns : 1;
          for (let i = 0; i < spawnBatch && metrics.spawned < cfg.enemyCount; i += 1) spawnEnemy(app);
        }
        const defenseY = app.renderer.height * 0.76;
        for (const enemy of [...enemiesRef.current]) {
          enemy.y += configRef.current.speed * dt;
          enemy.node.y = enemy.y;
          if (enemy.y > defenseY) {
            enemy.node.destroy({ children: true });
            enemiesRef.current = enemiesRef.current.filter((item) => item.id !== enemy.id);
            metrics.hp = Math.max(0, metrics.hp - 1);
            setHp(metrics.hp);
            if (metrics.hp <= 0) finishGame('Defeat');
          }
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
    <div className="drawing-defense">
      <div ref={pixiHostRef} className="drawing-defense-stage" />
      <div ref={overlayRef} className="drawing-defense-input" />
      <div className="drawing-defense-hud">
        <div><strong>HP</strong> {hp}/3</div>
        <div><strong>消滅</strong> {defeated}</div>
        <div><strong>敵人</strong> {progressText}</div>
        <div><strong>辨識</strong> {recognized}</div>
        {phase === 'playing' && <button className="btn btn-sm btn-secondary" onClick={pauseGame}>暫停</button>}
      </div>

      {phase === 'menu' && (
        <div className="drawing-defense-panel">
          <h1>畫畫塔防</h1>
          <p>依照最前方敵人畫板上的圖形，在畫面上描繪相同圖形來消滅敵人。</p>
          <div className="drawing-defense-controls">
            <label>
              難度
              <select className="input" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
                {Object.entries(DIFFICULTIES).map(([key, value]) => (
                  <option key={key} value={key}>{value.label} - {value.enemyCount} 隻</option>
                ))}
              </select>
            </label>
            <label>
              敵人速度 {speed} px/s
              <input type="range" min="45" max="170" step="5" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
            </label>
            <label>
              辨識嚴格度 {strictness}%
              <input type="range" min="10" max="90" step="5" value={strictness} onChange={(event) => setStrictness(Number(event.target.value))} />
            </label>
          </div>
          <div className="drawing-defense-actions">
            <button className="btn btn-primary btn-lg" onClick={startGame}>開始遊戲</button>
            <button className="btn btn-ghost btn-lg" onClick={onExit}>返回目錄</button>
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
        <div className="drawing-defense-panel">
          <h1>{result.Game_Result === 'Victory' ? '勝利' : '失敗'}</h1>
          <div className="drawing-defense-results">
            <span>總時長：{result.Total_Duration_Seconds} 秒</span>
            <span>消滅敵人：{result.Enemies_Defeated}</span>
            <span>剩餘 HP：{result.HP_Remaining}/3</span>
            <span>嚴格度：{result.Recognition_Strictness}%</span>
          </div>
          <div className="drawing-defense-actions">
            <button className="btn btn-primary btn-lg" onClick={downloadResult}>下載成績 CSV</button>
            <button className="btn btn-secondary btn-lg" onClick={restartGame}>再玩一次</button>
            <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>返回目錄</button>
          </div>
        </div>
      )}
    </div>
  );
}

function recognizeShape(points: Point[], strictness: number): ShapeId | null {
  const simplified = simplify(points, 10 - strictness / 18);
  if (points.length < 6) return null;
  const box = getBox(points);
  const width = Math.max(1, box.maxX - box.minX);
  const height = Math.max(1, box.maxY - box.minY);
  const path = pathLength(points);
  const endDistance = distance(points[0], points[points.length - 1]);
  const diagonal = Math.hypot(width, height);
  const straightness = endDistance / Math.max(path, 1);
  const aspect = width / height;
  const tolerance = 1 - strictness / 100;
  const closed = endDistance < diagonal * (0.18 + tolerance * 0.34);
  const cornerCount = countCorners(simplified);

  if (straightness > 0.78 - tolerance * 0.2) {
    if (height > width * (1.7 - tolerance)) return 'vertical-line';
    if (width > height * (1.7 - tolerance)) return 'horizontal-line';
  }

  if (looksLikeCross(points, box, tolerance)) return 'cross';

  if (closed && Math.abs(aspect - 1) < 0.38 + tolerance * 0.34) {
    if (cornerCount <= 2 + Math.round(tolerance * 2) && Math.abs(path / Math.max(width, height) - Math.PI * 2) < 2.2 + tolerance) return 'circle';
    if (cornerCount <= 4) return 'triangle';
    if (cornerCount <= 7) return 'square';
  }

  if (closed && cornerCount <= 4 && Math.abs(aspect - 1) < 0.75 + tolerance * 0.35) return 'triangle';
  if (closed && cornerCount <= 8 && Math.abs(aspect - 1) < 0.55 + tolerance * 0.4) return 'square';
  return null;
}

function looksLikeCross(points: Point[], box: ReturnType<typeof getBox>, tolerance: number): boolean {
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

function toCsv(records: SessionRecord[]): string {
  const headers: (keyof SessionRecord)[] = [
    'Participant_ID',
    'Difficulty',
    'Enemy_Speed',
    'Recognition_Strictness',
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
