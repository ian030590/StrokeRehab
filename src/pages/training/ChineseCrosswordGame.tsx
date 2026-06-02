import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import idiomDataRaw from "./data/chinese-crossword/idioms.json?raw";
import { useT } from "../../i18n";

type Direction = "across" | "down";
type PuzzleLevel = "standard" | "easy" | "challenge";

interface IdiomEntry {
  word: string;
  pinyin: string;
  definition: string;
}

interface Placement {
  entry: IdiomEntry;
  row: number;
  col: number;
  direction: Direction;
}

interface CrosswordClue extends Placement {
  number: number;
}

interface CrosswordPuzzle {
  cells: string[][];
  clues: CrosswordClue[];
  startNumbers: Record<string, number>;
  playableKeys: string[];
}

const IDIOMS = JSON.parse(idiomDataRaw) as IdiomEntry[];

const LEVELS: Record<PuzzleLevel, { label: string; labelEn: string; size: number; targetWords: number; candidatePool: number }> = {
  standard: { label: "標準", labelEn: "Standard", size: 13, targetWords: 8, candidatePool: 42 },
  easy: { label: "入門", labelEn: "Easy", size: 11, targetWords: 6, candidatePool: 32 },
  challenge: { label: "挑戰", labelEn: "Challenge", size: 15, targetWords: 10, candidatePool: 56 },
};

function normalizeLevel(value: string | null): PuzzleLevel {
  if (value === "easy" || value === "challenge") return value;
  return "standard";
}

function createGrid(size: number) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => ""));
}

function cloneGrid(grid: string[][]) {
  return grid.map((row) => [...row]);
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function canPlaceWord(
  grid: string[][],
  entry: IdiomEntry,
  row: number,
  col: number,
  direction: Direction,
  requireOverlap: boolean,
) {
  const chars = Array.from(entry.word);
  const size = grid.length;
  let overlap = 0;

  const beforeRow = row - (direction === "down" ? 1 : 0);
  const beforeCol = col - (direction === "across" ? 1 : 0);
  const afterRow = row + (direction === "down" ? chars.length : 0);
  const afterCol = col + (direction === "across" ? chars.length : 0);

  if (beforeRow >= 0 && beforeCol >= 0 && beforeRow < size && beforeCol < size && grid[beforeRow][beforeCol]) return false;
  if (afterRow >= 0 && afterCol >= 0 && afterRow < size && afterCol < size && grid[afterRow][afterCol]) return false;

  for (let index = 0; index < chars.length; index += 1) {
    const r = row + (direction === "down" ? index : 0);
    const c = col + (direction === "across" ? index : 0);
    if (r < 0 || c < 0 || r >= size || c >= size) return false;

    const existing = grid[r][c];
    if (existing && existing !== chars[index]) return false;
    if (existing) {
      overlap += 1;
      continue;
    }

    if (direction === "across") {
      if ((r > 0 && grid[r - 1][c]) || (r < size - 1 && grid[r + 1][c])) return false;
    } else {
      if ((c > 0 && grid[r][c - 1]) || (c < size - 1 && grid[r][c + 1])) return false;
    }
  }

  return !requireOverlap || overlap > 0;
}

function placeWord(grid: string[][], placement: Placement) {
  const chars = Array.from(placement.entry.word);
  for (let index = 0; index < chars.length; index += 1) {
    const row = placement.row + (placement.direction === "down" ? index : 0);
    const col = placement.col + (placement.direction === "across" ? index : 0);
    grid[row][col] = chars[index];
  }
}

function findPlacements(grid: string[][], entry: IdiomEntry): Placement[] {
  const placements: Placement[] = [];
  const chars = Array.from(entry.word);

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      const existing = grid[row][col];
      if (!existing) continue;

      chars.forEach((char, charIndex) => {
        if (char !== existing) return;

        const across = { entry, row, col: col - charIndex, direction: "across" as const };
        if (canPlaceWord(grid, entry, across.row, across.col, across.direction, true)) placements.push(across);

        const down = { entry, row: row - charIndex, col, direction: "down" as const };
        if (canPlaceWord(grid, entry, down.row, down.col, down.direction, true)) placements.push(down);
      });
    }
  }

  return placements;
}

function backtrack(
  grid: string[][],
  placed: Placement[],
  remaining: IdiomEntry[],
  targetWords: number,
  depth = 0,
): { grid: string[][]; placed: Placement[] } {
  if (placed.length >= targetWords || depth > targetWords * 3) return { grid, placed };

  let best = { grid, placed };
  const candidates = shuffle(remaining).slice(0, 18);

  for (const entry of candidates) {
    const placements = shuffle(findPlacements(grid, entry)).slice(0, 28);
    for (const placement of placements) {
      const nextGrid = cloneGrid(grid);
      placeWord(nextGrid, placement);
      const nextRemaining = remaining.filter((item) => item.word !== entry.word);
      const result = backtrack(nextGrid, [...placed, placement], nextRemaining, targetWords, depth + 1);
      if (result.placed.length > best.placed.length) best = result;
      if (best.placed.length >= targetWords) return best;
    }
  }

  return best;
}

function trimPuzzle(grid: string[][], placed: Placement[]): CrosswordPuzzle {
  let minRow = grid.length;
  let minCol = grid.length;
  let maxRow = 0;
  let maxCol = 0;

  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return;
      minRow = Math.min(minRow, rowIndex);
      minCol = Math.min(minCol, colIndex);
      maxRow = Math.max(maxRow, rowIndex);
      maxCol = Math.max(maxCol, colIndex);
    });
  });

  const top = Math.max(0, minRow - 1);
  const left = Math.max(0, minCol - 1);
  const bottom = Math.min(grid.length - 1, maxRow + 1);
  const right = Math.min(grid.length - 1, maxCol + 1);
  const cells = grid.slice(top, bottom + 1).map((row) => row.slice(left, right + 1));

  const adjusted = placed.map((placement) => ({
    ...placement,
    row: placement.row - top,
    col: placement.col - left,
  }));

  const startNumbers: Record<string, number> = {};
  let nextNumber = 1;
  const clues = adjusted
    .sort((a, b) => a.row - b.row || a.col - b.col || a.direction.localeCompare(b.direction))
    .map((placement) => {
      const key = `${placement.row},${placement.col}`;
      if (!startNumbers[key]) {
        startNumbers[key] = nextNumber;
        nextNumber += 1;
      }
      return { ...placement, number: startNumbers[key] };
    });

  const playableKeys = cells.flatMap((row, rowIndex) =>
    row.map((cell, colIndex) => (cell ? `${rowIndex},${colIndex}` : "")).filter(Boolean),
  );

  return { cells, clues, startNumbers, playableKeys };
}

function buildPuzzle(level: PuzzleLevel): CrosswordPuzzle {
  const config = LEVELS[level];
  const entries = shuffle(IDIOMS.filter((entry) => Array.from(entry.word).length >= 4 && Array.from(entry.word).length <= 6))
    .slice(0, config.candidatePool);

  let best: { grid: string[][]; placed: Placement[] } | null = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const grid = createGrid(config.size);
    const seed = entries[attempt % entries.length];
    const seedCol = Math.floor((config.size - Array.from(seed.word).length) / 2);
    const seedPlacement: Placement = {
      entry: seed,
      row: Math.floor(config.size / 2),
      col: Math.max(0, seedCol),
      direction: "across",
    };
    placeWord(grid, seedPlacement);

    const result = backtrack(
      grid,
      [seedPlacement],
      entries.filter((entry) => entry.word !== seed.word),
      config.targetWords,
    );

    if (!best || result.placed.length > best.placed.length) best = result;
    if (best.placed.length >= config.targetWords) break;
  }

  return trimPuzzle(best?.grid ?? createGrid(config.size), best?.placed ?? []);
}

export default function ChineseCrosswordGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useT();
  const level = normalizeLevel(searchParams.get("level"));
  const [puzzleSeed, setPuzzleSeed] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showCheck, setShowCheck] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const puzzle = useMemo(() => buildPuzzle(level), [level, puzzleSeed]);
  const text = lang === "en"
    ? {
        title: "Chinese Crossword",
        checkedStatus: (correct: number) => `${correct} correct cells`,
        status: (filled: number, clueCount: number) => `${filled} cells filled / ${clueCount} clues`,
        check: "Check",
        newPuzzle: "New Puzzle",
        back: "Back",
        complete: "Complete",
        clues: "Clues",
        across: "Across",
        down: "Down",
        cellLabel: (row: number, col: number) => `Row ${row}, column ${col}`,
      }
    : {
        title: "中文填字遊戲",
        checkedStatus: (correct: number) => `${correct} 格正確`,
        status: (filled: number, clueCount: number) => `${filled} 格已填 / ${clueCount} 題`,
        check: "檢查",
        newPuzzle: "新題目",
        back: "返回",
        complete: "完成",
        clues: "提示",
        across: "橫",
        down: "直",
        cellLabel: (row: number, col: number) => `第 ${row} 列第 ${col} 欄`,
      };

  const filledCount = puzzle.playableKeys.filter((key) => answers[key]).length;
  const correctCount = puzzle.playableKeys.filter((key) => {
    const [row, col] = key.split(",").map(Number);
    return answers[key] === puzzle.cells[row][col];
  }).length;
  const solved = puzzle.playableKeys.length > 0 && correctCount === puzzle.playableKeys.length;

  const resetPuzzle = () => {
    setAnswers({});
    setShowCheck(false);
    setPuzzleSeed((current) => current + 1);
  };

  const focusNextCell = (key: string) => {
    const index = puzzle.playableKeys.indexOf(key);
    const nextKey = puzzle.playableKeys[index + 1];
    if (nextKey) inputRefs.current[nextKey]?.focus();
  };

  const updateAnswer = (key: string, rawValue: string) => {
    const chars = Array.from(rawValue.trim());
    const value = chars[chars.length - 1] ?? "";
    setAnswers((current) => ({ ...current, [key]: value }));
    setShowCheck(false);
    if (value) window.setTimeout(() => focusNextCell(key), 0);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#f1f5f9", color: "#0f172a", overflow: "auto" }}>
      <header style={{ minHeight: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, padding: "12px 24px", borderBottom: "1px solid #d5dde8", background: "#ffffff" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>{text.title}</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b" }}>
            {lang === "en" ? LEVELS[level].labelEn : LEVELS[level].label} / {showCheck ? text.checkedStatus(correctCount) : text.status(filledCount, puzzle.clues.length)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => setShowCheck(true)} style={toolbarButtonStyle}>{text.check}</button>
          <button type="button" onClick={resetPuzzle} style={toolbarButtonStyle}>{text.newPuzzle}</button>
          <button type="button" onClick={() => navigate("/cognitive")} style={toolbarButtonStyle}>{text.back}</button>
        </div>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(280px, 380px)", gap: 24, padding: 24, alignItems: "start" }}>
        <section style={{ display: "grid", placeItems: "center", minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${puzzle.cells[0]?.length ?? 1}, minmax(34px, 46px))`,
              gridAutoRows: "minmax(34px, 46px)",
              gap: 2,
              background: "#000000",
              border: "10px solid #000000",
              borderRadius: 8,
              boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)",
              maxWidth: "100%",
              overflow: "auto",
            }}
          >
            {puzzle.cells.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const key = `${rowIndex},${colIndex}`;
                if (!cell) return <div key={key} style={{ background: "#000000" }} />;

                const isCorrect = answers[key] === cell;
                const borderColor = showCheck && answers[key] ? (isCorrect ? "#16a34a" : "#dc2626") : "#cbd5e1";
                return (
                  <div key={key} style={{ position: "relative", background: "#ffffff", border: `2px solid ${borderColor}` }}>
                    {puzzle.startNumbers[key] && (
                      <span style={{ position: "absolute", left: 3, top: 1, fontSize: 10, color: "#475569", fontWeight: 700 }}>
                        {puzzle.startNumbers[key]}
                      </span>
                    )}
                    <input
                      ref={(element) => {
                        inputRefs.current[key] = element;
                      }}
                      aria-label={text.cellLabel(rowIndex + 1, colIndex + 1)}
                      value={answers[key] ?? ""}
                      onChange={(event) => updateAnswer(key, event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: 0,
                        outline: 0,
                        textAlign: "center",
                        fontSize: 24,
                        fontWeight: 800,
                        background: "transparent",
                        color: "#0f172a",
                        padding: "10px 0 2px",
                      }}
                    />
                  </div>
                );
              }),
            )}
          </div>
          {solved && (
            <div style={{ marginTop: 16, padding: "10px 16px", background: "#16a34a", color: "#ffffff", borderRadius: 6, fontWeight: 800 }}>
              {text.complete}
            </div>
          )}
        </section>

        <aside style={{ background: "#ffffff", border: "1px solid #d5dde8", borderRadius: 8, padding: 18, boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>{text.clues}</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {puzzle.clues.map((clue) => (
              <div key={`${clue.number}-${clue.direction}-${clue.entry.word}`} style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 800 }}>
                  <span>{clue.number}. {clue.direction === "across" ? text.across : text.down}</span>
                  <span style={{ color: "#64748b" }}>{clue.entry.pinyin}</span>
                </div>
                <p style={{ margin: "6px 0 0", color: "#334155", lineHeight: 1.5 }}>{clue.entry.definition}</p>
              </div>
            ))}
          </div>
        </aside>
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
