/**
 * Optotype rendering on a Canvas 2D context.
 * Supports: Landolt C, Tumbling E, Sloan Letters, Picture optotypes,
 * and Preferential-Looking gratings.
 *
 * Ported from FrACT10's Optotypes.j (© Michael Bach).
 */

// ── Types ──

export type TestType = 'landolt' | 'tumblingE' | 'letters' | 'pictures' | 'gratings' | 'contrast';

/** Landolt C: 8 directions (0=right, 1=upper-right, 2=up, …, 7=lower-right) */
export type LandoltDirection = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Tumbling E: 4 cardinal directions */
export type EDirection = 0 | 2 | 4 | 6; // 0=right, 2=up, 4=left, 6=down

/** Sloan letters: C D H K N O R S V Z */
export const SLOAN_LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;
export type SloanLetterIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Picture optotypes */
export const PICTURE_NAMES = ['房子', '圓形', '正方形', '星星'] as const;
export type PictureIndex = 0 | 1 | 2 | 3;

/** Grating orientation for preferential looking */
export type GratingOrientation = 'left' | 'right';

export interface GratingRenderOptions {
  lightColor?: string;
  darkColor?: string;
}

// ── Color constants ──

const FORE = '#000000';
const BACK = '#FFFFFF';

// ── Helper: fill a polygon defined in a -5…+5 coordinate system ──

function fillPolygon(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  d: number,
  color: string = FORE,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(d * points[0][0], -d * points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(d * points[i][0], -d * points[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

// ── Landolt C ──

export function drawLandoltC(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  strokePx: number,
  direction: LandoltDirection,
  foreColor: string = FORE,
  backColor: string = BACK,
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Outer filled circle
  ctx.fillStyle = foreColor;
  ctx.beginPath();
  ctx.arc(0, 0, 2.5 * strokePx, 0, Math.PI * 2);
  ctx.fill();

  // Inner cutout circle
  ctx.fillStyle = backColor;
  ctx.beginPath();
  ctx.arc(0, 0, 1.5 * strokePx, 0, Math.PI * 2);
  ctx.fill();

  // Gap rectangle rotated to the correct direction
  const rot = (Math.PI / 180) * ((7 - (direction - 1)) / 8) * 360;
  ctx.rotate(rot);
  ctx.fillStyle = backColor;
  ctx.fillRect(
    strokePx * 1.4 - 1,
    -strokePx / 2,
    1.3 * strokePx + 1,
    strokePx,
  );
  ctx.rotate(-rot);

  ctx.restore();
}

// ── Tumbling E ──

export function drawTumblingE(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  strokePx: number,
  direction: EDirection,
  foreColor: string = FORE,
) {
  ctx.save();
  ctx.translate(cx, cy);

  const ePoints = [
    [5, -5], [-5, -5], [-5, 5], [5, 5], [5, 3],
    [-3, 3], [-3, 1], [5, 1], [5, -1],
    [-3, -1], [-3, -3], [5, -3],
  ];

  const angle = (-Math.PI / 4) * direction;
  ctx.rotate(angle);
  fillPolygon(ctx, ePoints, strokePx * 0.5, foreColor);
  ctx.rotate(-angle);

  ctx.restore();
}

// ── Sloan Letters ──

function drawSloanC(ctx: CanvasRenderingContext2D, stroke: number) {
  // C is a Landolt ring with gap at direction 0 (right)
  ctx.fillStyle = FORE;
  ctx.beginPath();
  ctx.arc(0, 0, 2.5 * stroke, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BACK;
  ctx.beginPath();
  ctx.arc(0, 0, 1.5 * stroke, 0, Math.PI * 2);
  ctx.fill();
  // Gap at right
  ctx.fillStyle = BACK;
  ctx.fillRect(stroke * 1.4 - 1, -stroke / 2, 1.3 * stroke + 1, stroke);
}

function drawSloanD(ctx: CanvasRenderingContext2D, d: number) {
  const s = d * 0.5;
  ctx.fillStyle = FORE;
  ctx.beginPath();
  ctx.moveTo(-5 * s, -5 * s);
  ctx.lineTo(1 * s, -5 * s);
  ctx.arc(1 * s, -1 * s, 4 * s, -Math.PI / 2, 0, true);
  ctx.lineTo(5 * s, 1 * s);
  ctx.arc(1 * s, 1 * s, 4 * s, 0, Math.PI / 2, true);
  ctx.lineTo(-5 * s, 5 * s);
  ctx.closePath();
  ctx.fill();
  // Inner cutout
  const s2 = d * 0.3;
  ctx.fillStyle = BACK;
  ctx.beginPath();
  ctx.moveTo(-5 * s2, -5 * s2);
  ctx.lineTo(1 * s2, -5 * s2);
  ctx.arc(1 * s2, -1 * s2, 4 * s2, -Math.PI / 2, 0, true);
  ctx.lineTo(5 * s2, 1 * s2);
  ctx.arc(1 * s2, 1 * s2, 4 * s2, 0, Math.PI / 2, true);
  ctx.lineTo(-5 * s2, 5 * s2);
  ctx.closePath();
  ctx.fill();
}

function drawSloanH(ctx: CanvasRenderingContext2D, d: number) {
  const pts = [
    [-5, -5], [-3, -5], [-3, -1], [3, -1], [3, -5], [5, -5],
    [5, 5], [3, 5], [3, 1], [-3, 1], [-3, 5], [-5, 5], [-5, -5],
  ];
  fillPolygon(ctx, pts, d * 0.5, FORE);
}

function drawSloanK(ctx: CanvasRenderingContext2D, d: number) {
  const pts = [
    [-5, -5], [-3, -5], [-3, -0.82], [-0.98, 0.69], [2.43, -5],
    [5, -5], [0.74, 1.98], [5, 5], [1.66, 5],
    [-3, 1.68], [-3, 5], [-5, 5], [-5, -5],
  ];
  fillPolygon(ctx, pts, d * 0.5, FORE);
}

function drawSloanN(ctx: CanvasRenderingContext2D, d: number) {
  const pts = [
    [-5, -5], [-3, -5], [-3, 1.9], [3, -5], [5, -5],
    [5, 5], [3, 5], [3, -1.9], [-3, 5], [-5, 5], [-5, -5],
  ];
  fillPolygon(ctx, pts, d * 0.5, FORE);
}

function drawSloanO(ctx: CanvasRenderingContext2D, d: number) {
  ctx.fillStyle = FORE;
  ctx.beginPath();
  ctx.arc(0, 0, 2.5 * d, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BACK;
  ctx.beginPath();
  ctx.arc(0, 0, 1.5 * d, 0, Math.PI * 2);
  ctx.fill();
}

function drawSloanR(ctx: CanvasRenderingContext2D, d: number) {
  const d5 = d * 0.5;
  // Main body
  const p1 = [[-5, -5], [-3, -5], [-3, -1], [2, -1], [2, 5], [-5, 5], [-5, -5]];
  fillPolygon(ctx, p1, d5, FORE);
  // Leg
  const p2 = [[0.7, 0], [2.8, -5], [5, -5], [2.85, 0], [0.7, 0]];
  fillPolygon(ctx, p2, d5, FORE);
  // Head circle
  ctx.fillStyle = FORE;
  ctx.beginPath();
  ctx.arc(d, -d, 3 * d5, 0, Math.PI * 2);
  ctx.fill();
  // Head cutout
  ctx.fillStyle = BACK;
  ctx.beginPath();
  ctx.arc(d, -d, d5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-3 * d5, -3 * d5, 5 * d5, d);
}

function drawSloanS(ctx: CanvasRenderingContext2D, d: number) {
  const s = d * 0.5;
  ctx.fillStyle = FORE;
  ctx.beginPath();
  ctx.moveTo(-5 * s, 2 * s);
  ctx.arc(-2 * s, 2 * s, 3 * s, Math.PI, Math.PI / 2, false);
  ctx.lineTo(2 * s, 5 * s);
  ctx.arc(2 * s, 2 * s, 3 * s, Math.PI / 2, -Math.PI / 2, false);
  ctx.lineTo(-2 * s, -1 * s);
  ctx.arc(-2 * s, -2 * s, s, Math.PI / 2, -Math.PI / 2, true);
  ctx.lineTo(2 * s, -3 * s);
  ctx.arc(2 * s, -2 * s, s, -Math.PI / 2, 0, true);
  ctx.lineTo(5 * s, -2 * s);
  ctx.arc(2 * s, -2 * s, 3 * s, 0, -Math.PI / 2, false);
  ctx.lineTo(-2 * s, -5 * s);
  ctx.arc(-2 * s, -2 * s, 3 * s, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(2 * s, 1 * s);
  ctx.arc(2 * s, 2 * s, s, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(-2 * s, 3 * s);
  ctx.arc(-2 * s, 2 * s, s, Math.PI / 2, Math.PI, true);
  ctx.closePath();
  ctx.fill();
}

function drawSloanV(ctx: CanvasRenderingContext2D, d: number) {
  const pts = [
    [-5, 5], [-1, -5], [1, -5], [5, 5], [3, 5], [0, -2.1], [-3, 5], [-5, 5],
  ];
  fillPolygon(ctx, pts, d / 2, FORE);
}

function drawSloanZ(ctx: CanvasRenderingContext2D, d: number) {
  const pts = [
    [-5, -5], [5, -5], [5, -3], [-1.9, -3], [5, 3], [5, 5],
    [-5, 5], [-5, 3], [1.9, 3], [-5, -3], [-5, -5],
  ];
  fillPolygon(ctx, pts, d / 2, FORE);
}

const SLOAN_DRAWERS = [
  drawSloanC, drawSloanD, drawSloanH, drawSloanK, drawSloanN,
  drawSloanO, drawSloanR, drawSloanS, drawSloanV, drawSloanZ,
];

export function drawSloanLetter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  strokePx: number,
  letterIndex: SloanLetterIndex,
) {
  ctx.save();
  ctx.translate(cx, cy);
  SLOAN_DRAWERS[letterIndex](ctx, strokePx);
  ctx.restore();
}

// ── Picture Optotypes ──
// Simple geometric shapes recognizable by young children

export function drawPictureOptotype(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  strokePx: number,
  index: PictureIndex,
) {
  const size = strokePx * 5; // overall optotype size
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = FORE;
  ctx.strokeStyle = FORE;
  ctx.lineWidth = strokePx;

  switch (index) {
    case 0: // House
      drawHouse(ctx, size);
      break;
    case 1: // Circle
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 2: // Square
      ctx.strokeRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
      break;
    case 3: // Star
      drawStar(ctx, size * 0.45, 5, strokePx);
      break;
  }

  ctx.restore();
}

function drawHouse(ctx: CanvasRenderingContext2D, size: number) {
  const h = size * 0.5;
  const w = size * 0.4;
  // walls
  ctx.strokeRect(-w, -h * 0.1, w * 2, h * 1.1);
  // roof
  ctx.beginPath();
  ctx.moveTo(-w * 1.15, -h * 0.1);
  ctx.lineTo(0, -h);
  ctx.lineTo(w * 1.15, -h * 0.1);
  ctx.closePath();
  ctx.stroke();
  // door
  ctx.strokeRect(-w * 0.2, h * 0.3, w * 0.4, h * 0.7);
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  r: number,
  points: number,
  lineW: number,
) {
  ctx.beginPath();
  const innerR = r * 0.4;
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? r : innerR;
    if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.lineWidth = lineW;
  ctx.stroke();
}

// ── Preferential Looking Gratings ──

export function drawGrating(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diameter: number,
  spatialFreqCPD: number,
  orientation: GratingOrientation,
  _pixPerDeg: number, // pixels per degree at current distance
  options: GratingRenderOptions = {},
) {
  ctx.save();
  ctx.translate(cx, cy);

  const r = diameter / 2;

  // Clip to circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // Calculate stripe width from spatial frequency
  // 1 cycle = 1 dark + 1 light bar
  const cycleWidthPx = _pixPerDeg / spatialFreqCPD;
  const barWidth = cycleWidthPx / 2;

  // Determine offset for left/right placement
  const xOffset = orientation === 'left' ? -r * 1.5 : r * 1.5;

  // Draw vertical stripes
  ctx.fillStyle = options.lightColor ?? BACK;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  ctx.fillStyle = options.darkColor ?? FORE;
  const startX = -r + (xOffset % cycleWidthPx);
  for (let x = startX - cycleWidthPx; x < r; x += cycleWidthPx) {
    ctx.fillRect(x, -r, barWidth, r * 2);
  }

  ctx.restore();
}

// ── Sine Wave Grating for Contrast Sensitivity ──

export function drawContrastGrating(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  direction: number, // 0, 2, 4, 6 (0=vertical, 2=diagonal, 4=horizontal, 6=diagonal)
  contrast: number, // 0 to 1
  backColorHex: string, // e.g. '#808080' for background
  periodPx: number = 40 // Default width of one cycle in pixels
) {
  ctx.save();
  ctx.translate(cx, cy);

  // circular mask
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  
  // rotation
  // direction: 0=Horizontal(Right), 1=/(UpRight), 2=Vertical(Up), 3=\(UpLeft)
  const angle = (-(direction - 2) * 45 * Math.PI) / 180;
  ctx.rotate(angle);

  // draw sinusoidal grating using ImageData
  // We need to render the grating pattern. Since we rotated the context, it's easier to just draw lines.
  // Actually, to get true sinusoid and avoid line-drawing artifacts, let's use ImageData without ctx.rotate, or use ImageData and put it on a temporary canvas, then drawImage with rotation.

  const s2 = Math.ceil(size * 1.5);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = s2;
  tempCanvas.height = s2;
  const tempCtx = tempCanvas.getContext('2d')!;
  
  const imgData = tempCtx.createImageData(s2, s2);
  const data = imgData.data;

  const bgR = parseInt(backColorHex.slice(1, 3), 16) || 128;
  const bgG = parseInt(backColorHex.slice(3, 5), 16) || 128;
  const bgB = parseInt(backColorHex.slice(5, 7), 16) || 128;

  const trigFactor = (2 * Math.PI) / periodPx;
  
  // Calculate sinusoid values in a 1D array to save time
  const sinVals = new Float32Array(s2);
  for (let x = 0; x < s2; x++) {
    sinVals[x] = Math.sin(x * trigFactor);
  }

  const rowData = new Uint8ClampedArray(s2 * 4);
  for (let x = 0; x < s2; x++) {
    const modulation = contrast * sinVals[x];
    rowData[x * 4] = Math.min(255, Math.max(0, bgR * (1 + modulation)));
    rowData[x * 4 + 1] = Math.min(255, Math.max(0, bgG * (1 + modulation)));
    rowData[x * 4 + 2] = Math.min(255, Math.max(0, bgB * (1 + modulation)));
    rowData[x * 4 + 3] = 255;
  }

  for (let y = 0; y < s2; y++) {
    data.set(rowData, y * s2 * 4);
  }
  
  tempCtx.putImageData(imgData, 0, 0);

  ctx.drawImage(tempCanvas, -s2 / 2, -s2 / 2);

  ctx.restore();
}

// ── Convenience: clear canvas with background color ──

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor = BACK,
) {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
}

// ── Direction labels for UI ──

export const LANDOLT_DIRECTION_LABELS: Record<LandoltDirection, string> = {
  0: '→',
  1: '↗',
  2: '↑',
  3: '↖',
  4: '←',
  5: '↙',
  6: '↓',
  7: '↘',
};

export const E_DIRECTION_LABELS: Record<EDirection, string> = {
  0: '→',
  2: '↑',
  4: '←',
  6: '↓',
};

/** Get the number of alternatives for each test type */
export function getAlternativeCount(testType: TestType): number {
  switch (testType) {
    case 'landolt':   return 8;
    case 'tumblingE': return 4;
    case 'letters':   return 10;
    case 'pictures':  return 4;
    case 'gratings':  return 2;
    case 'contrast':  return 8;
    default: return 0;
  }
}

/** Generate a random alternative for the given test type */
export function randomAlternative(testType: TestType): number {
  return Math.floor(Math.random() * getAlternativeCount(testType));
}
