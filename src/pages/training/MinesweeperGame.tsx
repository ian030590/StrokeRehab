import { type CSSProperties, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initJsPsych } from 'jspsych';
import { downloadCsvFile } from '../../utils/downloadFile';
import { getActiveUser } from '../../utils/settings';

type MinesweeperPhase = 'menu' | 'playing' | 'paused' | 'results';
type MinesweeperDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type BoardPresetId = 'compact' | 'classic-easy' | 'classic-medium' | 'classic-hard' | 'large' | 'dense' | 'custom';
type GameResult = 'Victory' | 'Defeat';

interface MinesweeperGameProps {
  onExit: () => void;
}

interface DifficultyConfig {
  label: string;
  density: number;
  description: string;
}

interface Cell {
  x: number;
  y: number;
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
}

interface SessionRecord {
  Test_Date: string;
  Participant_ID: string;
  Difficulty: MinesweeperDifficulty;
  Board_Preset: string;
  Mine_Density_Percent: number;
  Board_Size: string;
  Total_Cells: number;
  Mines_Total: number;
  Correctly_Flagged_Mines: number;
  Incorrect_Flags: number;
  Flags_Placed: number;
  Successful_Opened_Cells: number;
  Total_Duration_Seconds: number;
  Game_Result: GameResult;
}

const DIFFICULTIES: Record<MinesweeperDifficulty, DifficultyConfig> = {
  Beginner: { label: '初級', density: 0.1, description: '地雷密度 10%，適合熟悉規則' },
  Intermediate: { label: '中級', density: 0.16, description: '地雷密度 16%，需要更多推理' },
  Advanced: { label: '高級', density: 0.24, description: '地雷密度 24%，挑戰高注意力' },
};

const BOARD_PRESETS: Record<Exclude<BoardPresetId, 'custom'>, { label: string; rows: number; cols: number; mines?: number; description: string }> = {
  compact: { label: '6x6', rows: 6, cols: 6, description: '原有短局訓練盤' },
  'classic-easy': { label: '9x9 / 10', rows: 9, cols: 9, mines: 10, description: 'reference 經典 Easy' },
  'classic-medium': { label: '16x16 / 40', rows: 16, cols: 16, mines: 40, description: 'reference 經典 Medium' },
  'classic-hard': { label: '16x30 / 99', rows: 16, cols: 30, mines: 99, description: 'reference 經典 Hard' },
  large: { label: '20x20', rows: 20, cols: 20, description: '原有大盤推理' },
  dense: { label: '80x80', rows: 80, cols: 80, description: '原有高密度掃描' },
};
const DEFAULT_DIFFICULTY: MinesweeperDifficulty = 'Beginner';
const DEFAULT_BOARD_PRESET: BoardPresetId = 'compact';
const DEFAULT_BOARD_ROWS = BOARD_PRESETS[DEFAULT_BOARD_PRESET].rows;
const DEFAULT_BOARD_COLS = BOARD_PRESETS[DEFAULT_BOARD_PRESET].cols;
const DEFAULT_CUSTOM_BOARD_SIZE = 12;

const MINESWEEPER_ACCENT = '#005EB8';

const DIRECTIONS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

export function MinesweeperGame({ onExit }: MinesweeperGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elapsedMillisRef = useRef(0);
  const playStartedAtRef = useRef<number>(Date.now());
  const jsPsychRef = useRef<ReturnType<typeof initJsPsych> | null>(null);
  const [phase, setPhase] = useState<MinesweeperPhase>('menu');
  const [difficulty, setDifficulty] = useState<MinesweeperDifficulty>(DEFAULT_DIFFICULTY);
  const [boardPreset, setBoardPreset] = useState<BoardPresetId>(DEFAULT_BOARD_PRESET);
  const [customBoardSize, setCustomBoardSize] = useState(DEFAULT_CUSTOM_BOARD_SIZE);
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard(DEFAULT_BOARD_ROWS, DEFAULT_BOARD_COLS));
  const [boardRows, setBoardRows] = useState(DEFAULT_BOARD_ROWS);
  const [boardCols, setBoardCols] = useState(DEFAULT_BOARD_COLS);
  const [mineCount, setMineCount] = useState(calculateMineCount(DEFAULT_BOARD_ROWS, DEFAULT_BOARD_COLS, DIFFICULTIES[DEFAULT_DIFFICULTY].density));
  const [minesGenerated, setMinesGenerated] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<SessionRecord | null>(null);

  const activeConfig = DIFFICULTIES[difficulty];
  const selectedBoardConfig = useMemo(() => getSelectedBoardConfig(boardPreset, customBoardSize, activeConfig.density), [activeConfig.density, boardPreset, customBoardSize]);
  const selectedMineCount = selectedBoardConfig.mines;
  const selectedDensityPercent = Math.round((selectedMineCount / Math.max(1, selectedBoardConfig.rows * selectedBoardConfig.cols)) * 100);
  const isCustomBoardSize = boardPreset === 'custom';
  const boardMetrics = useMemo(() => getBoardMetrics(boardRows, boardCols), [boardCols, boardRows]);
  const remainingMineEstimate = Math.max(0, mineCount - countFlags(board));

  const canvasStyle = useMemo<CSSProperties>(() => {
    return {
      width: `min(${boardMetrics.pixelWidth}px, calc(100vw - 48px))`,
      aspectRatio: `${boardMetrics.pixelWidth} / ${boardMetrics.pixelHeight}`,
      maxHeight: 'calc(100vh - 148px)',
    };
  }, [boardMetrics.pixelHeight, boardMetrics.pixelWidth]);

  useEffect(() => {
    jsPsychRef.current = initJsPsych();
  }, []);

  const finishGame = useCallback((nextBoard: Cell[][], gameResult: GameResult) => {
    const duration = Math.max(0, (elapsedMillisRef.current + Date.now() - playStartedAtRef.current) / 1000);
    elapsedMillisRef.current = duration * 1000;
    const stats = getBoardStats(nextBoard);
    const record: SessionRecord = {
      Test_Date: formatTestDate(new Date()),
      Participant_ID: getActiveUser() || 'Unknown',
      Difficulty: difficulty,
      Board_Preset: selectedBoardConfig.label,
      Mine_Density_Percent: Math.round((mineCount / Math.max(1, boardRows * boardCols)) * 100),
      Board_Size: `${boardRows}x${boardCols}`,
      Total_Cells: boardRows * boardCols,
      Mines_Total: mineCount,
      Correctly_Flagged_Mines: stats.correctFlags,
      Incorrect_Flags: stats.incorrectFlags,
      Flags_Placed: stats.flags,
      Successful_Opened_Cells: stats.openedSafeCells,
      Total_Duration_Seconds: Number(duration.toFixed(1)),
      Game_Result: gameResult,
    };
    setBoard(nextBoard);
    setElapsedSeconds(Math.floor(duration));
    setResult(record);
    setPhase('results');
    try {
      const jsPsychData = jsPsychRef.current?.data;
      const writeData = jsPsychData?.write as unknown as ((data: Record<string, unknown>) => void) | undefined;
      writeData?.call(jsPsychData, record as unknown as Record<string, unknown>);
    } catch (error) {
      console.warn('Unable to write minesweeper result to jsPsych data.', error);
    }
  }, [boardCols, boardRows, difficulty, mineCount, selectedBoardConfig.label]);

  const startGame = useCallback(() => {
    const nextRows = selectedBoardConfig.rows;
    const nextCols = selectedBoardConfig.cols;
    const nextMineCount = selectedBoardConfig.mines;
    setBoardRows(nextRows);
    setBoardCols(nextCols);
    setMineCount(nextMineCount);
    setBoard(createEmptyBoard(nextRows, nextCols));
    setMinesGenerated(false);
    setFlagMode(false);
    setElapsedSeconds(0);
    setResult(null);
    elapsedMillisRef.current = 0;
    playStartedAtRef.current = Date.now();
    setPhase('playing');
  }, [selectedBoardConfig]);

  const returnToMenu = useCallback(() => {
    setPhase('menu');
    setResult(null);
    setFlagMode(false);
  }, []);

  const restartGame = useCallback(() => {
    setBoard(createEmptyBoard(boardRows, boardCols));
    setMineCount(selectedBoardConfig.mines);
    setMinesGenerated(false);
    setFlagMode(false);
    setElapsedSeconds(0);
    setResult(null);
    elapsedMillisRef.current = 0;
    playStartedAtRef.current = Date.now();
    setPhase('playing');
  }, [boardCols, boardRows, selectedBoardConfig.mines]);

  const pauseGame = useCallback(() => {
    if (phase !== 'playing') return;
    elapsedMillisRef.current += Date.now() - playStartedAtRef.current;
    setElapsedSeconds(Math.floor(elapsedMillisRef.current / 1000));
    setPhase('paused');
  }, [phase]);

  const resumeGame = useCallback(() => {
    if (phase !== 'paused') return;
    playStartedAtRef.current = Date.now();
    setPhase('playing');
  }, [phase]);

  const toggleFlagAt = useCallback((x: number, y: number) => {
    if (phase !== 'playing') return;
    setBoard(board.map((row) => row.map((cell) => {
      if (cell.x !== x || cell.y !== y || cell.revealed) return cell;
      return { ...cell, flagged: !cell.flagged };
    })));
  }, [board, phase]);

  const revealAt = useCallback((x: number, y: number) => {
    if (phase !== 'playing') return;
    const target = board[y]?.[x];
    if (!target || target.flagged || target.revealed) return;

    let nextBoard = cloneBoard(board);
    if (!minesGenerated) {
      nextBoard = generateMines(nextBoard, mineCount, x, y);
      setMinesGenerated(true);
    }

    const clicked = nextBoard[y][x];
    if (clicked.mine) {
      finishGame(revealAllMines(nextBoard), 'Defeat');
      return;
    }

    const openedBoard = revealSafeCells(nextBoard, x, y);
    if (hasWon(openedBoard)) {
      finishGame(openedBoard, 'Victory');
      return;
    }
    setBoard(openedBoard);
  }, [board, finishGame, mineCount, minesGenerated, phase]);

  const handleCanvasPointerDown = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing') return;
    event.preventDefault();
    const position = getCanvasCell(event, boardRows, boardCols);
    if (!position) return;
    if (event.button === 2 || flagMode) {
      toggleFlagAt(position.x, position.y);
      return;
    }
    revealAt(position.x, position.y);
  }, [boardCols, boardRows, flagMode, phase, revealAt, toggleFlagAt]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((elapsedMillisRef.current + Date.now() - playStartedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    drawBoard(canvasRef.current, board, boardMetrics);
  }, [board, boardMetrics]);

  const downloadResult = () => {
    if (!result) return;
    downloadCsvFile(toCsv([result]), `minesweeper_${Date.now()}.csv`);
  };

  return (
    <div className={`minesweeper-game minesweeper-phase-${phase}`}>
      {phase === 'menu' && (
        <div className="drawing-defense-panel">
          <div className="drawing-defense-config">
            <header className="drawing-defense-config-header">
              <div>
                <span className="drawing-defense-config-label">認知訓練設定</span>
                <h1>踩地雷</h1>
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
                      onClick={() => setDifficulty(key as MinesweeperDifficulty)}
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
                    <h2>棋盤大小</h2>
                    <p>{selectedBoardConfig.rows}x{selectedBoardConfig.cols}</p>
                  </div>
                  <span>{isCustomBoardSize ? '自訂' : '預設'}</span>
                </div>
                <div className="drawing-defense-option-grid minesweeper-preset-grid">
                  {Object.entries(BOARD_PRESETS).map(([id, preset]) => (
                    <button
                      key={id}
                      type="button"
                      className={`drawing-defense-option ${boardPreset === id ? 'active' : ''}`}
                      onClick={() => setBoardPreset(id as BoardPresetId)}
                    >
                      <span className="drawing-defense-option-title">{preset.label}</span>
                      <span className="drawing-defense-option-meta">{preset.description}</span>
                    </button>
                  ))}
                  <label
                    className={`drawing-defense-option drawing-defense-option-custom ${isCustomBoardSize ? 'active' : ''}`}
                    onClick={() => setBoardPreset('custom')}
                  >
                    <span className="drawing-defense-option-title">自訂</span>
                    <input
                      className="drawing-defense-number-input"
                      type="number"
                      min="4"
                      max="100"
                      step="1"
                      value={customBoardSize}
                      onChange={(event) => {
                        const value = clamp(Number(event.target.value), 4, 100);
                        setCustomBoardSize(value);
                        setBoardPreset('custom');
                      }}
                      onFocus={() => setBoardPreset('custom')}
                      aria-label="自訂棋盤邊長"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div className="drawing-defense-config-footer">
              <div className="drawing-defense-config-summary">
                <strong>{activeConfig.label}</strong>
                <span>{selectedBoardConfig.label}</span>
                <span>{selectedDensityPercent}% 密度</span>
                <span>{selectedMineCount} 地雷</span>
              </div>
              <div className="drawing-defense-config-actions">
                <button className="btn btn-primary btn-lg config-start-btn" onClick={startGame}>
                  開始遊戲
                </button>
                <button className="btn btn-ghost btn-lg" onClick={onExit}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div className="minesweeper-hud">
            <div><strong>時間</strong> {elapsedSeconds}s</div>
            <div><strong>地雷</strong> {remainingMineEstimate}</div>
            <div><strong>已開闢</strong> {getBoardStats(board).openedSafeCells}</div>
            <button
              className={`btn btn-sm ${flagMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFlagMode((current) => !current)}
            >
              {flagMode ? '標記模式中' : '標記模式'}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={pauseGame}>暫停</button>
            <button className="btn btn-sm btn-ghost" onClick={returnToMenu}>返回設定</button>
          </div>
          <div className="minesweeper-board-stage">
            <canvas
              ref={canvasRef}
              className={`minesweeper-canvas ${flagMode ? 'flag-mode' : ''}`}
              style={canvasStyle}
              onPointerDown={handleCanvasPointerDown}
              onContextMenu={(event) => event.preventDefault()}
              aria-label="踩地雷棋盤"
            />
          </div>
        </>
      )}

      {phase === 'paused' && (
        <div className="drawing-defense-panel drawing-defense-panel-compact">
          <h1>遊戲暫停</h1>
          <p>目前時間 {elapsedSeconds} 秒，棋盤會保留在目前狀態。</p>
          <div className="drawing-defense-actions">
            <button className="btn btn-primary btn-lg" onClick={resumeGame}>繼續遊戲</button>
            <button className="btn btn-secondary btn-lg" onClick={restartGame}>重新開始</button>
            <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>返回設定</button>
          </div>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="experiment-container minesweeper-results-container" style={{ overflowY: 'auto' }}>
          <div className="experiment-results">
            <h1>{result.Game_Result === 'Victory' ? '成功完成！' : '遊戲結束'}</h1>
            <div className="drawing-defense-result-summary">
              <span>
                <small>成功標記的地雷數量</small>
                <strong>{result.Correctly_Flagged_Mines}</strong>
              </span>
              <span>
                <small>使用總時數</small>
                <strong>{result.Total_Duration_Seconds} 秒</strong>
              </span>
              <span>
                <small>成功開闢格子數量</small>
                <strong>{result.Successful_Opened_Cells}</strong>
              </span>
            </div>

            <table className="results-table">
              <tbody>
                <tr>
                  <th>棋盤大小</th>
                  <td>{result.Board_Size}</td>
                </tr>
                <tr>
                  <th>難度</th>
                  <td>{DIFFICULTIES[result.Difficulty].label}</td>
                </tr>
                <tr>
                  <th>地雷總數</th>
                  <td>{result.Mines_Total}</td>
                </tr>
                <tr>
                  <th>放置旗標</th>
                  <td>{result.Flags_Placed}</td>
                </tr>
                <tr>
                  <th>錯誤旗標</th>
                  <td>{result.Incorrect_Flags}</td>
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

function createEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, (_, y) => (
    Array.from({ length: cols }, (_, x) => ({
      x,
      y,
      mine: false,
      revealed: false,
      flagged: false,
      adjacentMines: 0,
    }))
  ));
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function getSelectedBoardConfig(presetId: BoardPresetId, customBoardSize: number, density: number) {
  if (presetId !== 'custom') {
    const preset = BOARD_PRESETS[presetId];
    return {
      label: preset.label,
      rows: preset.rows,
      cols: preset.cols,
      mines: preset.mines ?? calculateMineCount(preset.rows, preset.cols, density),
    };
  }
  const size = clamp(Math.round(customBoardSize), 4, 100);
  return {
    label: `${size}x${size}`,
    rows: size,
    cols: size,
    mines: calculateMineCount(size, size, density),
  };
}

function calculateMineCount(rows: number, cols: number, density: number): number {
  const cells = rows * cols;
  return clamp(Math.round(cells * density), 1, Math.max(1, cells - 9));
}

function generateMines(board: Cell[][], mineCount: number, safeX: number, safeY: number): Cell[][] {
  const candidates: Cell[] = [];
  board.forEach((row) => {
    row.forEach((cell) => {
      if (Math.abs(cell.x - safeX) <= 1 && Math.abs(cell.y - safeY) <= 1) return;
      candidates.push(cell);
    });
  });

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  candidates.slice(0, Math.min(mineCount, candidates.length)).forEach((cell) => {
    board[cell.y][cell.x].mine = true;
  });

  board.forEach((row) => {
    row.forEach((cell) => {
      if (cell.mine) return;
      cell.adjacentMines = getNeighbors(board, cell.x, cell.y).filter((neighbor) => neighbor.mine).length;
    });
  });

  return board;
}

function revealSafeCells(board: Cell[][], x: number, y: number): Cell[][] {
  const queue: Cell[] = [board[y][x]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const cell = queue.shift();
    if (!cell) continue;
    const key = `${cell.x},${cell.y}`;
    if (visited.has(key) || cell.flagged || cell.mine) continue;
    visited.add(key);
    cell.revealed = true;

    if (cell.adjacentMines === 0) {
      getNeighbors(board, cell.x, cell.y).forEach((neighbor) => {
        if (!neighbor.revealed && !neighbor.flagged && !neighbor.mine) queue.push(neighbor);
      });
    }
  }

  return board;
}

function revealAllMines(board: Cell[][]): Cell[][] {
  board.forEach((row) => {
    row.forEach((cell) => {
      if (cell.mine) cell.revealed = true;
    });
  });
  return board;
}

function hasWon(board: Cell[][]): boolean {
  return board.every((row) => row.every((cell) => cell.mine || cell.revealed));
}

function getNeighbors(board: Cell[][], x: number, y: number): Cell[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  return DIRECTIONS.flatMap(([dx, dy]) => {
    const nextX = x + dx;
    const nextY = y + dy;
    if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) return [];
    return [board[nextY][nextX]];
  });
}

function getBoardMetrics(rows: number, cols: number) {
  const maxDimension = Math.max(rows, cols);
  const cellSize = maxDimension <= 6 ? 72 : maxDimension <= 20 ? 34 : maxDimension <= 30 ? 22 : 12;
  return {
    cellSize,
    pixelWidth: cellSize * cols,
    pixelHeight: cellSize * rows,
  };
}

function drawBoard(canvas: HTMLCanvasElement | null, board: Cell[][], metrics: ReturnType<typeof getBoardMetrics>) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = metrics.pixelWidth * dpr;
  canvas.height = metrics.pixelHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, metrics.pixelWidth, metrics.pixelHeight);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, metrics.pixelWidth, metrics.pixelHeight);

  board.forEach((row) => {
    row.forEach((cell) => drawCell(ctx, cell, metrics.cellSize));
  });
}

function drawCell(ctx: CanvasRenderingContext2D, cell: Cell, cellSize: number) {
  const x = cell.x * cellSize;
  const y = cell.y * cellSize;
  const gap = Math.max(1, Math.floor(cellSize * 0.06));
  const innerX = x + gap;
  const innerY = y + gap;
  const innerSize = cellSize - gap * 2;

  ctx.fillStyle = cell.revealed ? '#FFFFFF' : MINESWEEPER_ACCENT;
  if (cell.flagged && !cell.revealed) ctx.fillStyle = MINESWEEPER_ACCENT;
  if (cell.revealed && cell.mine) ctx.fillStyle = MINESWEEPER_ACCENT;
  ctx.fillRect(innerX, innerY, innerSize, innerSize);

  ctx.strokeStyle = cell.revealed ? '#64748B' : '#FFFFFF';
  ctx.lineWidth = Math.max(1, cellSize * 0.04);
  ctx.strokeRect(innerX, innerY, innerSize, innerSize);

  if (cell.flagged && !cell.revealed) {
    drawFlag(ctx, x, y, cellSize);
    return;
  }

  if (!cell.revealed) return;

  if (cell.mine) {
    drawMine(ctx, x, y, cellSize);
    return;
  }

  if (cell.adjacentMines > 0) {
    ctx.fillStyle = MINESWEEPER_ACCENT;
    ctx.font = `800 ${Math.max(8, cellSize * 0.58)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(cell.adjacentMines), x + cellSize / 2, y + cellSize / 2 + cellSize * 0.04);
  }
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number) {
  const poleX = x + cellSize * 0.38;
  const topY = y + cellSize * 0.2;
  const bottomY = y + cellSize * 0.78;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(2, cellSize * 0.08);
  ctx.beginPath();
  ctx.moveTo(poleX, topY);
  ctx.lineTo(poleX, bottomY);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(poleX, topY);
  ctx.lineTo(x + cellSize * 0.74, y + cellSize * 0.34);
  ctx.lineTo(poleX, y + cellSize * 0.48);
  ctx.closePath();
  ctx.fill();
}

function drawMine(ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number) {
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;
  const radius = cellSize * 0.24;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(1.5, cellSize * 0.05);
  DIRECTIONS.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx * radius * 1.45, cy + dy * radius * 1.45);
    ctx.stroke();
  });
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function getCanvasCell(event: PointerEvent<HTMLCanvasElement>, rows: number, cols: number) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
  if (x < 0 || x >= cols || y < 0 || y >= rows) return null;
  return { x, y };
}

function countFlags(board: Cell[][]): number {
  return board.flat().filter((cell) => cell.flagged).length;
}

function getBoardStats(board: Cell[][]) {
  const cells = board.flat();
  const flags = cells.filter((cell) => cell.flagged);
  return {
    flags: flags.length,
    correctFlags: flags.filter((cell) => cell.mine).length,
    incorrectFlags: flags.filter((cell) => !cell.mine).length,
    openedSafeCells: cells.filter((cell) => cell.revealed && !cell.mine).length,
  };
}

function toCsv(records: SessionRecord[]): string {
  const columns: Array<{ label: string; value: (record: SessionRecord) => unknown }> = [
    { label: '測驗日期', value: (record) => record.Test_Date },
    { label: 'Participant_ID', value: (record) => record.Participant_ID },
    { label: 'Difficulty', value: (record) => record.Difficulty },
    { label: 'Board_Preset', value: (record) => record.Board_Preset },
    { label: 'Mine_Density_Percent', value: (record) => record.Mine_Density_Percent },
    { label: 'Board_Size', value: (record) => record.Board_Size },
    { label: 'Total_Cells', value: (record) => record.Total_Cells },
    { label: 'Mines_Total', value: (record) => record.Mines_Total },
    { label: 'Correctly_Flagged_Mines', value: (record) => record.Correctly_Flagged_Mines },
    { label: 'Incorrect_Flags', value: (record) => record.Incorrect_Flags },
    { label: 'Flags_Placed', value: (record) => record.Flags_Placed },
    { label: 'Successful_Opened_Cells', value: (record) => record.Successful_Opened_Cells },
    { label: 'Total_Duration_Seconds', value: (record) => record.Total_Duration_Seconds },
    { label: 'Game_Result', value: (record) => record.Game_Result },
  ];
  return [
    columns.map((column) => column.label).join(','),
    ...records.map((record) => columns.map((column) => csvCell(column.value(record))).join(',')),
  ].join('\n');
}

function csvCell(value: unknown): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatTestDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
