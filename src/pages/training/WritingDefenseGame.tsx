import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const SHAPES = {
  beginner: ["⭕", "🔺", "🟥", "｜", "一"],
  intermediate: ["❤️", "⭐", "🥚", "⬡"],
  hard: ["天", "古", "元", "右", "左", "夫", "吉"],
};

const SPEEDS = {
  beginner: 0.5,
  intermediate: 1.0,
  hard: 1.5,
};

interface Enemy {
  id: number;
  shape: string;
  x: number;
  y: number;
  speed: number;
}

export default function WritingDefenseGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const difficulty = (searchParams.get("difficulty") || "beginner") as keyof typeof SHAPES;
  const durationStr = searchParams.get("duration") || "3";
  const duration = parseInt(durationStr, 10) * 60; // in seconds

  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const drawingTimeoutRef = useRef<number | null>(null);
  
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

  const gameLoop = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (isPlaying) {
      spawnTimerRef.current += deltaTime;
      if (spawnTimerRef.current > 2000) {
        spawnTimerRef.current = 0;
        const availableShapes = SHAPES[difficulty] || SHAPES.beginner;
        const randomShape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
        const newEnemy: Enemy = {
          id: Date.now(),
          shape: randomShape,
          x: Math.random() * 80 + 10, // 10% to 90% width
          y: -10, // Start slightly above screen
          speed: (SPEEDS[difficulty] || SPEEDS.beginner) * (deltaTime / 16),
        };
        setEnemies((prev) => [...prev, newEnemy]);
      }

      setEnemies((prev) => {
        const nextEnemies = prev.map((enemy) => ({
          ...enemy,
          y: enemy.y + enemy.speed,
        }));
        
        const remaining = nextEnemies.filter((e) => e.y < 100);
        const escaped = nextEnemies.length - remaining.length;
        if (escaped > 0) {
          setMissed((m) => m + escaped);
        }
        return remaining;
      });
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isPlaying, difficulty]);

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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ctxRef.current || !isPlaying) return;
    setIsDrawing(true);
    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current);
    
    const { offsetX, offsetY } = getCoordinates(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctxRef.current || !isPlaying) return;
    e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Simulate shape recognition after a short delay
    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current);
    drawingTimeoutRef.current = window.setTimeout(() => {
      handleRecognition();
    }, 800);
  };

  const handleRecognition = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    // Clear canvas
    ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Mock Recognition: Destroys the lowest enemy
    setEnemies((prev) => {
      if (prev.length === 0) return prev;
      let lowestIndex = 0;
      for (let i = 1; i < prev.length; i++) {
        if (prev[i].y > prev[lowestIndex].y) {
          lowestIndex = i;
        }
      }
      setScore((s) => s + 1);
      const newEnemies = [...prev];
      newEnemies.splice(lowestIndex, 1);
      return newEnemies;
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
    setEnemies([]);
    setTimeLeft(duration);
    setIsGameOver(false);
  };

  return (
    <div className="writing-defense-container" style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#1a1a2e', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* HUD */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', color: 'white', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
        <div>
          <h2 style={{ margin: 0 }}>書寫保衛戰</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>難度: {difficulty} | 時間: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={{ margin: 0, color: '#4ade80' }}>得分: {score}</h3>
          <p style={{ margin: 0, color: '#f87171' }}>錯過: {missed}</p>
        </div>
      </div>

      {/* Game Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {enemies.map((enemy) => (
          <div
            key={enemy.id}
            style={{
              position: 'absolute',
              left: `${enemy.x}%`,
              top: `${enemy.y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '2rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              color: 'black',
              fontWeight: 'bold',
              transition: 'top 0.1s linear',
            }}
          >
            {enemy.shape}
          </div>
        ))}
      </div>

      {/* Drawing Canvas */}
      <div style={{ height: '40%', borderTop: '2px solid #4a4a6a', position: 'relative', backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <p style={{ position: 'absolute', top: '10px', left: '10px', color: 'rgba(255,255,255,0.5)', margin: 0, pointerEvents: 'none' }}>在此畫出敵人的形狀來擊退他們...</p>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
        />
      </div>

      {/* Overlays */}
      {!isPlaying && !isGameOver && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>書寫保衛戰</h1>
            <p style={{ marginBottom: '30px', fontSize: '1.2rem' }}>畫出敵人身上的形狀來擊退他們！</p>
            <button onClick={startGame} style={{ padding: '15px 40px', fontSize: '1.5rem', borderRadius: '30px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.5)' }}>
              開始遊戲
            </button>
            <br />
            <button onClick={() => navigate('/motor')} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1rem', borderRadius: '20px', border: '1px solid white', backgroundColor: 'transparent', color: 'white', cursor: 'pointer' }}>
              返回
            </button>
          </div>
        </div>
      )}

      {isGameOver && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '10px' }}>遊戲結束</h1>
            <h2 style={{ fontSize: '2rem', color: '#4ade80' }}>總得分: {score}</h2>
            <h3 style={{ fontSize: '1.5rem', color: '#f87171', marginBottom: '30px' }}>錯過: {missed}</h3>
            <button onClick={startGame} style={{ padding: '15px 40px', fontSize: '1.5rem', borderRadius: '30px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', marginRight: '20px' }}>
              再玩一次
            </button>
            <button onClick={() => navigate('/motor')} style={{ padding: '15px 40px', fontSize: '1.5rem', borderRadius: '30px', border: '1px solid white', backgroundColor: 'transparent', color: 'white', cursor: 'pointer' }}>
              結束
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
