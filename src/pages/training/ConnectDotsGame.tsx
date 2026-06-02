import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const VIEWBOX_SIZE = 600;

const OUTLINES = {
  star: {
    label: "星星",
    path: "M300 70 L370 220 L535 235 L410 345 L450 515 L300 425 L150 515 L190 345 L65 235 L230 220 Z",
  },
  cat: {
    label: "貓咪",
    path: "M160 450 C110 390 115 275 190 245 L185 130 L255 200 C285 185 325 185 355 200 L425 130 L420 245 C495 275 500 390 440 450 C380 510 220 510 160 450 Z",
  },
  leaf: {
    label: "葉子",
    path: "M300 535 C145 455 115 250 300 80 C485 250 455 455 300 535 Z M300 535 C310 400 305 250 300 80",
  },
} as const;

const DENSITIES = {
  wide: { label: "低密度", spacing: 42 },
  standard: { label: "標準", spacing: 28 },
  dense: { label: "高密度", spacing: 20 },
} as const;

type OutlineId = keyof typeof OUTLINES;
type DensityId = keyof typeof DENSITIES;

interface DotPoint {
  id: number;
  x: number;
  y: number;
}

function normalizeOutline(value: string | null): OutlineId {
  if (value === "cat" || value === "leaf") return value;
  return "star";
}

function normalizeDensity(value: string | null): DensityId {
  if (value === "wide" || value === "dense") return value;
  return "standard";
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function ConnectDotsGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialOutline = normalizeOutline(searchParams.get("shape"));
  const density = normalizeDensity(searchParams.get("density"));
  const [outlineId, setOutlineId] = useState<OutlineId>(initialOutline);
  const [points, setPoints] = useState<DotPoint[]>([]);
  const [nextDotIndex, setNextDotIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const outline = OUTLINES[outlineId];
  const densityPreset = DENSITIES[density];
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const isDrawingRef = useRef(false);
  const pointsRef = useRef<DotPoint[]>([]);
  const nextDotIndexRef = useRef(0);

  const progressText = useMemo(
    () => `${Math.min(nextDotIndex, points.length)} / ${points.length}`,
    [nextDotIndex, points.length],
  );

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const totalLength = path.getTotalLength();
    const sampled: DotPoint[] = [];
    const count = Math.max(2, Math.floor(totalLength / densityPreset.spacing));
    for (let index = 0; index < count; index += 1) {
      const point = path.getPointAtLength((index / count) * totalLength);
      sampled.push({ id: index + 1, x: point.x, y: point.y });
    }

    pointsRef.current = sampled;
    nextDotIndexRef.current = 0;
    setPoints(sampled);
    setNextDotIndex(0);
    setIsComplete(false);
    clearDrawing();
  }, [outline.path, densityPreset.spacing]);

  useLayoutEffect(() => {
    const resizeCanvas = () => {
      const board = boardRef.current;
      const canvas = canvasRef.current;
      if (!board || !canvas) return;

      const rect = board.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#2563eb";
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    nextDotIndexRef.current = 0;
    setNextDotIndex(0);
    setIsComplete(false);
  };

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      rect,
    };
  };

  const toSvgPoint = (point: { x: number; y: number; rect: DOMRect }) => ({
    x: (point.x / point.rect.width) * VIEWBOX_SIZE,
    y: (point.y / point.rect.height) * VIEWBOX_SIZE,
  });

  const updateProgress = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const nextPoint = pointsRef.current[nextDotIndexRef.current];
    if (!nextPoint) return;

    const svgPoint = toSvgPoint(getCanvasPoint(event));
    const hitRadius = Math.max(16, densityPreset.spacing * 0.6);
    if (distance(svgPoint, nextPoint) > hitRadius) return;

    const nextIndex = nextDotIndexRef.current + 1;
    nextDotIndexRef.current = nextIndex;
    setNextDotIndex(nextIndex);
    if (nextIndex >= pointsRef.current.length) {
      setIsComplete(true);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    isDrawingRef.current = true;
    updateProgress(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const point = getCanvasPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    updateProgress(event);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const goNextOutline = () => {
    const ids = Object.keys(OUTLINES) as OutlineId[];
    const nextIndex = (ids.indexOf(outlineId) + 1) % ids.length;
    setOutlineId(ids[nextIndex]);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#f8fafc", color: "#0f172a", overflow: "auto" }}>
      <header style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid #dbe3ef", background: "#ffffff" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>連點遊戲</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b" }}>{outline.label} / {densityPreset.label} / {progressText}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={clearDrawing} style={toolbarButtonStyle}>重畫</button>
          <button type="button" onClick={goNextOutline} style={toolbarButtonStyle}>下一題</button>
          <button type="button" onClick={() => navigate("/cognitive")} style={toolbarButtonStyle}>返回</button>
        </div>
      </header>

      <main style={{ minHeight: "calc(100vh - 72px)", display: "grid", placeItems: "center", padding: 24 }}>
        <section
          ref={boardRef}
          style={{
            position: "relative",
            width: "min(86vmin, 720px)",
            aspectRatio: "1 / 1",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
            overflow: "hidden",
          }}
        >
          <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <path ref={pathRef} d={outline.path} fill="none" stroke="transparent" opacity={0} />
            {points.map((point) => (
              <g key={point.id}>
                <circle cx={point.x} cy={point.y} r="5" fill="#000000" />
                <text
                  x={point.x + 10}
                  y={point.y - 10}
                  fontSize="18"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="700"
                  fill="#000000"
                  stroke="#ffffff"
                  strokeWidth="4"
                  paintOrder="stroke"
                >
                  {point.id}
                </text>
              </g>
            ))}
          </svg>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: "crosshair" }}
          />
          {isComplete && (
            <div style={{ position: "absolute", right: 18, bottom: 18, padding: "10px 14px", borderRadius: 6, background: "#16a34a", color: "#ffffff", fontWeight: 700 }}>
              完成
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const toolbarButtonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 700,
  padding: "10px 14px",
};
