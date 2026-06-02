import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Application, Graphics } from "pixi.js";
import { useT } from "../../i18n";

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

type SpeedLevel = keyof typeof SPEED_PRESETS;

const DIFFICULTY_LABELS: Record<"zh" | "en", Record<Difficulty, string>> = {
  zh: {
    beginner: "初級",
    intermediate: "中級",
    advanced: "高級",
  },
  en: {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
};

const SPEED_LABELS: Record<"zh" | "en", Record<SpeedLevel, string>> = {
  zh: {
    low: "慢速",
    moderate: "標準",
    high: "快速",
  },
  en: {
    low: "Slow",
    moderate: "Standard",
    high: "Fast",
  },
};

interface Enemy {
  id: number;
  shape: ShapeTarget;
  x: number;
  y: number;
  speed: number;
}

function ShapeTargetCanvas({ shape }: { shape: ShapeTarget }) {
  if (shape.type === "text") {
    return (
      <div
        aria-label={shape.label}
        role="img"
        style={{
          width: TARGET_WIDTH,
          height: TARGET_HEIGHT,
          color: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontSize: 42,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {shape.value}
      </div>
    );
  }

  return <PixiShapeCanvas kind={shape.kind} label={shape.label} />;
}

function PixiShapeCanvas({ kind, label }: { kind: PixiShapeKind; label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let app: Application | null = null;

    const mountPixiShape = async () => {
      const pixiApp = new Application();
      await pixiApp.init({
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        autoStart: false,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });

      if (cancelled) {
        pixiApp.destroy({ removeView: true }, { children: true });
        return;
      }

      const host = hostRef.current;
      if (!host) {
        pixiApp.destroy({ removeView: true }, { children: true });
        return;
      }

      const canvas = pixiApp.canvas as HTMLCanvasElement;
      canvas.style.width = `${TARGET_WIDTH}px`;
      canvas.style.height = `${TARGET_HEIGHT}px`;
      canvas.style.display = "block";

      pixiApp.stage.addChild(createPixiShapeGraphics(kind));
      host.replaceChildren(canvas);
      pixiApp.render();
      app = pixiApp;
    };

    void mountPixiShape();

    return () => {
      cancelled = true;
      hostRef.current?.replaceChildren();
      app?.destroy({ removeView: true }, { children: true });
    };
  }, [kind]);

  return (
    <div
      ref={hostRef}
      aria-label={label}
      role="img"
      style={{ width: TARGET_WIDTH, height: TARGET_HEIGHT }}
    />
  );
}

function createPixiShapeGraphics(kind: PixiShapeKind) {
  const graphics = new Graphics();
  const outline = { color: TARGET_COLOR, width: 5 };
  const thickLine = { color: TARGET_COLOR, width: 7 };

  switch (kind) {
    case "circle":
      graphics.circle(36, 28, 18).stroke(outline);
      break;
    case "triangle":
      graphics.poly([36, 9, 58, 47, 14, 47], true).stroke(outline);
      break;
    case "square":
      graphics.rect(18, 10, 36, 36).stroke(outline);
      break;
    case "vertical-line":
      graphics.moveTo(36, 8).lineTo(36, 48).stroke(thickLine);
      break;
    case "horizontal-line":
      graphics.moveTo(14, 28).lineTo(58, 28).stroke(thickLine);
      break;
    case "heart":
      graphics
        .moveTo(36, 48)
        .bezierCurveTo(17, 34, 10, 23, 17, 15)
        .bezierCurveTo(23, 8, 32, 13, 36, 20)
        .bezierCurveTo(40, 13, 49, 8, 55, 15)
        .bezierCurveTo(62, 23, 55, 34, 36, 48)
        .closePath()
        .fill(TARGET_COLOR);
      break;
    case "star":
      graphics.poly([36, 7, 42, 21, 57, 22, 45, 32, 49, 47, 36, 39, 23, 47, 27, 32, 15, 22, 30, 21], true).fill(TARGET_COLOR);
      break;
    case "oval":
      graphics.ellipse(36, 28, 24, 16).stroke(outline);
      break;
    case "hexagon":
      graphics.poly([36, 6, 56, 17, 56, 39, 36, 50, 16, 39, 16, 17], true).stroke(outline);
      break;
  }

  return graphics;
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
  const { lang } = useT();

  const difficulty = normalizeDifficulty(searchParams.get("difficulty"));
  const speedLevel = normalizeSpeed(searchParams.get("speed"));
  const { enemySpeed, spawnRate } = SPEED_PRESETS[speedLevel];
  const durationStr = searchParams.get("duration") || "3";
  const duration = parseInt(durationStr, 10) * 60; // in seconds
  const text = lang === "en" ? {
    title: "Writing Defense",
    imageDifficulty: "Image Difficulty",
    speed: "Speed",
    time: "Time",
    score: "Score",
    missed: "Missed",
    drawHint: "Draw the target shape anywhere on the screen...",
    startLead: "Enemies are approaching with target cards!",
    startSub: "Draw the shape on their card to defeat them.",
    startGame: "Start Game",
    backToModules: "Back to Modules",
    gameOver: "Game Over",
    totalScore: "Total Score",
    playAgain: "Play Again",
    finishTraining: "End Training",
    hit: "Perfect!",
    miss: "Not recognized",
  } : {
    title: "書寫保衛戰",
    imageDifficulty: "圖像難度",
    speed: "速度",
    time: "時間",
    score: "得分",
    missed: "錯過",
    drawHint: "在螢幕任何地方畫出圖形...",
    startLead: "外星人軍團帶著卡片入侵了！",
    startSub: "在螢幕上描繪出他們卡片上的形狀來擊退他們。",
    startGame: "開始遊戲",
    backToModules: "返回模組列表",
    gameOver: "遊戲結束",
    totalScore: "總得分",
    playAgain: "再玩一次",
    finishTraining: "結束訓練",
    hit: "完美！",
    miss: "未辨識",
  };

  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; color: string; x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spawnTimerRef = useRef<number>(0);
  const drawingTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
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
    let frameId: number | null = null;

    const setupCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width <= 0 || height <= 0) {
        frameId = window.requestAnimationFrame(setupCanvas);
        return;
      }

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "white";
        ctxRef.current = ctx;
      }
    };

    frameId = window.requestAnimationFrame(setupCanvas);
    window.addEventListener("resize", setupCanvas);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", setupCanvas);
    };
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
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

    const { offsetX, offsetY } = getCoordinates(e);
    if (!isDrawing) return;
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
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
        showFeedback(text.hit, "#4ade80", targetEnemy.x, targetEnemy.y);
        const newEnemies = [...prev];
        newEnemies.splice(lowestIndex, 1);
        ctxRef.current?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        return newEnemies;
      } else {
        showFeedback(text.miss, "#f87171", targetEnemy.x, targetEnemy.y);
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

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setMissed(0);
    setEnemies([createEnemy(difficulty, enemySpeed)]);
    setTimeLeft(duration);
    setIsGameOver(false);
    setFeedback(null);
    spawnTimerRef.current = 0;
  };

  return (
    <div className="writing-defense-container" style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#1a1a2e', overflow: 'hidden' }}>
      
      {/* HUD */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', display: 'flex', justifyContent: 'space-between', color: 'white', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', pointerEvents: 'none' }}>
        <div>
          <h2 style={{ margin: 0 }}>{text.title}</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>
            {text.imageDifficulty}: {DIFFICULTY_LABELS[lang][difficulty]} | {text.speed}: {SPEED_LABELS[lang][speedLevel]} | {text.time}: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={{ margin: 0, color: '#4ade80' }}>{text.score}: {score}</h3>
          <p style={{ margin: 0, color: '#f87171' }}>{text.missed}: {missed}</p>
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
        <p style={{ position: 'absolute', top: '100px', left: '20px', color: 'rgba(255,255,255,0.5)', margin: 0, pointerEvents: 'none', fontSize: '1.2rem' }}>{text.drawHint}</p>
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
      </div>

      {/* Overlays */}
      {!isPlaying && !isGameOver && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '20px', color: '#60a5fa' }}>{text.title}</h1>
            <p style={{ marginBottom: '10px', fontSize: '1.5rem' }}>{text.startLead}</p>
            <p style={{ marginBottom: '40px', fontSize: '1.2rem', color: '#9ca3af' }}>{text.startSub}</p>
            <button onClick={startGame} style={{ padding: '15px 40px', fontSize: '1.5rem', borderRadius: '30px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.5)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              {text.startGame}
            </button>
            <br />
            <button onClick={() => navigate('/motor')} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.5)', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              {text.backToModules}
            </button>
          </div>
        </div>
      )}

      {isGameOver && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h1 style={{ fontSize: '5rem', marginBottom: '10px' }}>{text.gameOver}</h1>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '30px', borderRadius: '15px', marginBottom: '40px', minWidth: '350px' }}>
              <h2 style={{ fontSize: '3rem', color: '#4ade80', margin: '0 0 10px 0' }}>{text.totalScore}: {score}</h2>
              <h3 style={{ fontSize: '2rem', color: '#f87171', margin: 0 }}>{text.missed}: {missed}</h3>
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button onClick={startGame} style={{ padding: '15px 40px', fontSize: '1.5rem', borderRadius: '30px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
                {text.playAgain}
              </button>
              <button onClick={() => navigate('/motor')} style={{ padding: '15px 40px', fontSize: '1.5rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.5)', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                {text.finishTraining}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
