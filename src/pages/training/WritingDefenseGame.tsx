import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Application, Graphics, Text } from "pixi.js";

type Difficulty = "beginner" | "intermediate" | "advanced";
type PixiShapeKind =
  | "circle"
  | "triangle"
  | "square"
  | "vertical-line"
  | "horizontal-line"
  | "heart"
  | "star"
  | "oval"
  | "hexagon";
type ShapeTarget =
  | { type: "pixi"; kind: PixiShapeKind; label: string }
  | { type: "text"; value: string; label: string };

const TARGET_WIDTH = 72;
const TARGET_HEIGHT = 56;
const TARGET_COLOR = 0x000000;
const TRACKPAD_START_X_RATIO = 0.5;
const TRACKPAD_START_Y_RATIO = 2 / 3;
const TRACKPAD_SENSITIVITY = 1.1;

const SHAPES: Record<Difficulty, readonly ShapeTarget[]> = {
  beginner: [
    { type: "pixi", kind: "circle", label: "圓形" },
    { type: "pixi", kind: "triangle", label: "三角形" },
    { type: "pixi", kind: "square", label: "正方形" },
    { type: "pixi", kind: "vertical-line", label: "直線" },
    { type: "pixi", kind: "horizontal-line", label: "橫線" },
  ],
  intermediate: [
    { type: "pixi", kind: "heart", label: "愛心" },
    { type: "pixi", kind: "star", label: "星形" },
    { type: "pixi", kind: "oval", label: "橢圓形" },
    { type: "pixi", kind: "hexagon", label: "六邊形" },
  ],
  advanced: [
    { type: "text", value: "天", label: "天" },
    { type: "text", value: "古", label: "古" },
    { type: "text", value: "元", label: "元" },
    { type: "text", value: "右", label: "右" },
    { type: "text", value: "左", label: "左" },
    { type: "text", value: "夫", label: "夫" },
    { type: "text", value: "吉", label: "吉" },
  ],
};

const SPEED_PRESETS = {
  low: { enemySpeed: 0.15, spawnRate: 3000 },
  moderate: { enemySpeed: 0.2, spawnRate: 2000 },
  high: { enemySpeed: 0.25, spawnRate: 1500 },
};

const DIFFICULTY_LABELS = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "高級",
};

const SPEED_LABELS = {
  low: "慢速",
  moderate: "標準",
  high: "快速",
};

type SpeedLevel = keyof typeof SPEED_PRESETS;

interface Enemy {
  id: number;
  shape: ShapeTarget;
  x: number;
  y: number;
  speed: number;
}

function ShapeTargetCanvas({ shape }: { shape: ShapeTarget }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let initialized = false;
    const app = new Application();

    const init = async () => {
      await app.init({
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      initialized = true;
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.display = "block";
      canvas.style.width = `${TARGET_WIDTH}px`;
      canvas.style.height = `${TARGET_HEIGHT}px`;
      host.innerHTML = "";
      host.appendChild(canvas);
      drawTargetShape(app, shape);
    };

    init().catch((error) => {
      console.error("PixiJS target shape failed:", error);
    });

    return () => {
      cancelled = true;
      host.innerHTML = "";
      if (initialized) {
        app.destroy(true, { children: true });
      }
    };
  }, [shape]);

  return (
    <div
      ref={hostRef}
      aria-label={shape.label}
      role="img"
      style={{ width: TARGET_WIDTH, height: TARGET_HEIGHT }}
    />
  );
}

function drawTargetShape(app: Application, shape: ShapeTarget) {
  app.stage.removeChildren();

  if (shape.type === "text") {
    const text = new Text({
      text: shape.value,
      style: {
        fontFamily: "sans-serif",
        fontSize: 42,
        fontWeight: "700",
        fill: TARGET_COLOR,
      },
    });
    text.anchor.set(0.5);
    text.x = TARGET_WIDTH / 2;
    text.y = TARGET_HEIGHT / 2;
    app.stage.addChild(text);
    return;
  }

  const gfx = new Graphics();
  app.stage.addChild(gfx);
  drawPixiShape(gfx, shape.kind);
}

function drawPixiShape(gfx: Graphics, kind: PixiShapeKind) {
  const cx = TARGET_WIDTH / 2;
  const cy = TARGET_HEIGHT / 2;
  const stroke = { color: TARGET_COLOR, width: 5 };

  switch (kind) {
    case "circle":
      gfx.circle(cx, cy, 18).stroke(stroke);
      break;
    case "triangle":
      gfx.moveTo(cx, 9).lineTo(58, 47).lineTo(14, 47).lineTo(cx, 9).stroke(stroke);
      break;
    case "square":
      gfx.rect(18, 10, 36, 36).stroke(stroke);
      break;
    case "vertical-line":
      gfx.moveTo(cx, 8).lineTo(cx, 48).stroke({ color: TARGET_COLOR, width: 7 });
      break;
    case "horizontal-line":
      gfx.moveTo(14, cy).lineTo(58, cy).stroke({ color: TARGET_COLOR, width: 7 });
      break;
    case "heart":
      drawClosedPointShape(gfx, createHeartPoints(cx, cy + 3, 1.35), true);
      break;
    case "star":
      drawClosedPointShape(gfx, createStarPoints(cx, cy, 21, 9), true);
      break;
    case "oval":
      gfx.ellipse(cx, cy, 24, 16).stroke(stroke);
      break;
    case "hexagon":
      drawClosedPointShape(gfx, createRegularPolygonPoints(cx, cy, 23, 6), false);
      break;
  }
}

function drawClosedPointShape(
  gfx: Graphics,
  points: { x: number; y: number }[],
  filled: boolean,
) {
  if (points.length === 0) return;
  gfx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => gfx.lineTo(point.x, point.y));
  gfx.lineTo(points[0].x, points[0].y);

  if (filled) {
    gfx.fill({ color: TARGET_COLOR });
  } else {
    gfx.stroke({ color: TARGET_COLOR, width: 5 });
  }
}

function createRegularPolygonPoints(cx: number, cy: number, radius: number, sides: number) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function createStarPoints(cx: number, cy: number, outerRadius: number, innerRadius: number) {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function createHeartPoints(cx: number, cy: number, scale: number) {
  return Array.from({ length: 48 }, (_, index) => {
    const t = (index / 48) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return { x: cx + x * scale, y: cy + y * scale };
  });
}

const normalizeDifficulty = (value: string | null): Difficulty => {
  if (value === "intermediate" || value === "advanced") return value;
  if (value === "hard") return "advanced";
  return "beginner";
};

const normalizeSpeed = (value: string | null): SpeedLevel => {
  if (value === "moderate" || value === "high") return value;
  return "low";
};

const createEnemy = (difficulty: Difficulty, enemySpeed: number): Enemy => {
  const availableShapes = SHAPES[difficulty] || SHAPES.beginner;
  const randomShape = availableShapes[Math.floor(Math.random() * availableShapes.length)];

  return {
    id: Date.now() + Math.random(),
    shape: randomShape,
    x: Math.random() * 80 + 10,
    y: -5,
    speed: enemySpeed,
  };
};

export default function WritingDefenseGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const difficulty = normalizeDifficulty(searchParams.get("difficulty"));
  const speedLevel = normalizeSpeed(searchParams.get("speed"));
  const { enemySpeed, spawnRate } = SPEED_PRESETS[speedLevel];
  const durationStr = searchParams.get("duration") || "3";
  const duration = parseInt(durationStr, 10) * 60; // in seconds

  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; color: string; x: number; y: number } | null>(null);
  
  const device = searchParams.get("device") || "tablet";
  const hoverMode = device === "trackpad";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spawnTimerRef = useRef<number>(0);
  const drawingTimeoutRef = useRef<number | null>(null);
  const strokeTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const trackpadCursorRef = useRef<{ x: number; y: number } | null>(null);
  const trackpadLastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const trackpadSessionActiveRef = useRef(false);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [trackpadCursor, setTrackpadCursor] = useState<{ x: number; y: number } | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setIsGameOver(true);
    }
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTime: number | null = null;

    const loop = (time: number) => {
      if (lastTime === null) lastTime = time;
      const deltaTime = Math.min(time - lastTime, 100);
      lastTime = time;

      spawnTimerRef.current += deltaTime;
      const shouldSpawn = spawnTimerRef.current >= spawnRate;
      if (shouldSpawn) {
        spawnTimerRef.current = 0;
      }

      setEnemies((prev) => {
        const enemiesForFrame = shouldSpawn ? [...prev, createEnemy(difficulty, enemySpeed)] : prev;
        const dtRatio = (deltaTime || 16) / 16;
        const nextEnemies = enemiesForFrame.map((enemy) => ({
          ...enemy,
          y: enemy.y + enemy.speed * dtRatio,
        }));

        const remaining = nextEnemies.filter((e) => e.y < 100);
        const escaped = nextEnemies.length - remaining.length;
        if (escaped > 0) {
          setTimeout(() => setMissed((m) => m + escaped), 0);
        }
        return remaining;
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [difficulty, enemySpeed, isPlaying, spawnRate]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "white";
        ctxRef.current = ctx;
      }
    }
  }, []);

  useEffect(() => {
    if (!hoverMode || isPlaying) return;
    if (document.pointerLockElement === canvasRef.current) {
      document.exitPointerLock();
    }
    setTrackpadCursor(null);
    trackpadCursorRef.current = null;
    trackpadLastPointerRef.current = null;
    trackpadSessionActiveRef.current = false;
  }, [hoverMode, isPlaying]);

  useEffect(() => {
    return () => {
      if (document.pointerLockElement === canvasRef.current) {
        document.exitPointerLock();
      }
    };
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (hoverMode) return;
    if (!ctxRef.current || !isPlaying) return;
    setIsDrawing(true);
    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current);
    
    const { offsetX, offsetY } = getCoordinates(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ctxRef.current || !isPlaying) return;
    e.preventDefault();

    if (hoverMode) {
      if ("touches" in e) return;
      drawWithTrackpad(e);

      if (strokeTimeoutRef.current) clearTimeout(strokeTimeoutRef.current);
      strokeTimeoutRef.current = window.setTimeout(() => {
        setIsDrawing(false);
      }, 150); // Small pause lifts the pen

      if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current);
      drawingTimeoutRef.current = window.setTimeout(() => {
        setIsDrawing(false);
        trackpadSessionActiveRef.current = false;
        resetTrackpadCursor(false);
        handleRecognition();
      }, 800); // Longer pause triggers recognition
    } else {
      const { offsetX, offsetY } = getCoordinates(e);
      if (!isDrawing) return;
      ctxRef.current.lineTo(offsetX, offsetY);
      ctxRef.current.stroke();
    }
  };

  const stopDrawing = () => {
    if (hoverMode || !isDrawing) return;
    setIsDrawing(false);
    
    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current);
    drawingTimeoutRef.current = window.setTimeout(() => {
      handleRecognition();
    }, 600);
  };

  const showFeedback = (text: string, color: string, x: number, y: number) => {
    setFeedback({ text, color, x, y });
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
    }, 1000);
  };

  const handleRecognition = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    
    // Mock Recognition: 80% chance to match the lowest enemy, 20% chance to miss
    setEnemies((prev) => {
      if (prev.length === 0) {
        ctxRef.current?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        return prev;
      }
      
      let lowestIndex = 0;
      for (let i = 1; i < prev.length; i++) {
        if (prev[i].y > prev[lowestIndex].y) {
          lowestIndex = i;
        }
      }
      
      const targetEnemy = prev[lowestIndex];
      const isHit = Math.random() < 0.8;
      
      if (isHit) {
        setScore((s) => s + 1);
        showFeedback("完美！", "#4ade80", targetEnemy.x, targetEnemy.y);
        const newEnemies = [...prev];
        newEnemies.splice(lowestIndex, 1);
        ctxRef.current?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        return newEnemies;
      } else {
        showFeedback("未辨識", "#f87171", targetEnemy.x, targetEnemy.y);
        ctxRef.current?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        return prev;
      }
    });
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      return {
        offsetX: e.touches[0].clientX - rect.left,
        offsetY: e.touches[0].clientY - rect.top,
      };
    }
    return {
      offsetX: (e as React.MouseEvent).clientX - rect.left,
      offsetY: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const resetTrackpadCursor = (activateSession: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const cursor = {
      x: canvas.width * TRACKPAD_START_X_RATIO,
      y: canvas.height * TRACKPAD_START_Y_RATIO,
    };
    trackpadCursorRef.current = cursor;
    trackpadLastPointerRef.current = null;
    trackpadSessionActiveRef.current = activateSession;
    setTrackpadCursor(cursor);
    return cursor;
  };

  const getTrackpadMovement = (e: React.MouseEvent) => {
    const nativeEvent = e.nativeEvent;
    const movementX = Number.isFinite(nativeEvent.movementX) ? nativeEvent.movementX : 0;
    const movementY = Number.isFinite(nativeEvent.movementY) ? nativeEvent.movementY : 0;

    if (movementX !== 0 || movementY !== 0 || document.pointerLockElement === canvasRef.current) {
      return { dx: movementX, dy: movementY };
    }

    const current = getCoordinates(e);
    const last = trackpadLastPointerRef.current;
    trackpadLastPointerRef.current = { x: current.offsetX, y: current.offsetY };
    if (!last) return { dx: 0, dy: 0 };
    return {
      dx: current.offsetX - last.x,
      dy: current.offsetY - last.y,
    };
  };

  const drawWithTrackpad = (e: React.MouseEvent) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    let cursor = trackpadCursorRef.current;
    if (!trackpadSessionActiveRef.current || !cursor) {
      cursor = resetTrackpadCursor(true);
    }
    if (!cursor) return;

    const { dx, dy } = getTrackpadMovement(e);
    const nextCursor = {
      x: Math.max(0, Math.min(canvas.width, cursor.x + dx * TRACKPAD_SENSITIVITY)),
      y: Math.max(0, Math.min(canvas.height, cursor.y + dy * TRACKPAD_SENSITIVITY)),
    };

    if (!isDrawing) {
      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(cursor.x, cursor.y);
    }

    ctx.lineTo(nextCursor.x, nextCursor.y);
    ctx.stroke();
    trackpadCursorRef.current = nextCursor;
    setTrackpadCursor(nextCursor);
  };

  const requestTrackpadPointerLock = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hoverMode) return;

    const request = canvas.requestPointerLock();
    if (request && "catch" in request) {
      request.catch(() => {
        // Pointer Lock can fail outside a trusted browser gesture; fallback still draws with relative movement.
      });
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setMissed(0);
    setEnemies([]);
    setTimeLeft(duration);
    setIsGameOver(false);
    setFeedback(null);
    spawnTimerRef.current = spawnRate;
    if (hoverMode) {
      resetTrackpadCursor(false);
      window.setTimeout(requestTrackpadPointerLock, 0);
    }
  };

  return (
    <div className="writing-defense-container" style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#1a1a2e', overflow: 'hidden' }}>
      
      {/* HUD */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', display: 'flex', justifyContent: 'space-between', color: 'white', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', pointerEvents: 'none' }}>
        <div>
          <h2 style={{ margin: 0 }}>書寫保衛戰</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>圖像難度: {DIFFICULTY_LABELS[difficulty]} | 速度: {SPEED_LABELS[speedLevel]} | 時間: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={{ margin: 0, color: '#4ade80' }}>得分: {score}</h3>
          <p style={{ margin: 0, color: '#f87171' }}>錯過: {missed}</p>
        </div>
      </div>

      {/* Game Area (Enemies & Feedback) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <style>
          {`
            @keyframes fadeOutUp {
              0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
              100% { opacity: 0; transform: translate(-50%, -30px) scale(1.2); }
            }
          `}
        </style>
        {enemies.map((enemy) => (
          <div
            key={enemy.id}
            style={{
              position: 'absolute',
              left: `${enemy.x}%`,
              top: `${enemy.y}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: '38px',
                height: '24px',
                marginBottom: '-4px',
                zIndex: 2,
                border: '2px solid #dbeafe',
                borderRadius: '16px 16px 8px 8px',
                background: 'linear-gradient(180deg, #93c5fd 0%, #334155 100%)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.35)',
              }}
            />
            <div style={{
              backgroundColor: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
              border: '3px solid #3b82f6',
              zIndex: 1,
              minWidth: '96px',
              minHeight: '72px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShapeTargetCanvas shape={enemy.shape} />
            </div>
          </div>
        ))}

        {/* Feedback Animation */}
        {feedback && (
          <div
            style={{
              position: 'absolute',
              left: `${feedback.x}%`,
              top: `${feedback.y - 10}%`,
              transform: 'translate(-50%, -50%)',
              color: feedback.color,
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textShadow: '0 2px 8px rgba(0,0,0,0.9)',
              pointerEvents: 'none',
              animation: 'fadeOutUp 1s forwards',
              zIndex: 15
            }}
          >
            {feedback.text}
          </div>
        )}
      </div>

      {/* Drawing Canvas */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
        <p style={{ position: 'absolute', top: '100px', left: '20px', color: 'rgba(255,255,255,0.5)', margin: 0, pointerEvents: 'none', fontSize: '1.2rem' }}>在螢幕任何地方畫出圖形...</p>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
        />
        {hoverMode && isPlaying && trackpadCursor && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${trackpadCursor.x}px`,
              top: `${trackpadCursor.y}px`,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: '2px solid rgba(96, 165, 250, 0.95)',
              backgroundColor: 'rgba(255,255,255,0.18)',
              boxShadow: '0 0 12px rgba(96, 165, 250, 0.9)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Overlays */}
      {!isPlaying && !isGameOver && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '20px', color: '#60a5fa' }}>書寫保衛戰</h1>
            <p style={{ marginBottom: '10px', fontSize: '1.5rem' }}>外星人軍團帶著卡片入侵了！</p>
            <p style={{ marginBottom: '40px', fontSize: '1.2rem', color: '#9ca3af' }}>在螢幕上描繪出他們卡片上的形狀來擊退他們。</p>
            <button onClick={startGame} style={{ padding: '15px 40px', fontSize: '1.5rem', borderRadius: '30px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.5)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              開始遊戲
            </button>
            <br />
            <button onClick={() => navigate('/motor')} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.5)', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              返回模組列表
            </button>
          </div>
        </div>
      )}

      {isGameOver && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h1 style={{ fontSize: '5rem', marginBottom: '10px' }}>遊戲結束</h1>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '30px', borderRadius: '15px', marginBottom: '40px', minWidth: '350px' }}>
              <h2 style={{ fontSize: '3rem', color: '#4ade80', margin: '0 0 10px 0' }}>總得分: {score}</h2>
              <h3 style={{ fontSize: '2rem', color: '#f87171', margin: 0 }}>錯過: {missed}</h3>
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button onClick={startGame} style={{ padding: '15px 40px', fontSize: '1.5rem', borderRadius: '30px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
                再玩一次
              </button>
              <button onClick={() => navigate('/motor')} style={{ padding: '15px 40px', fontSize: '1.5rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.5)', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                結束訓練
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
