import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, type Ticker } from 'pixi.js';
import { initJsPsych } from 'jspsych';
import { downloadCsvFile } from '../../utils/downloadFile';
import { getActiveUser } from '../../utils/settings';

export type ReferenceGameId = 'memory-match' | 'lights-out' | 'reaction-time' | 'whack-a-mole' | 'sliding-puzzle';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type GamePhase = 'menu' | 'playing' | 'paused' | 'results';
type GameResult = 'Victory' | 'Defeat';
type SessionLimitSeconds = number | null;

interface ReferenceCognitiveGameProps {
  gameId: ReferenceGameId;
  onExit: () => void;
}

interface ReferenceModuleMeta {
  id: ReferenceGameId;
  title: string;
  referenceTitle: string;
  description: string;
  focus: string;
}

interface SessionRecord {
  Test_Date: string;
  Participant_ID: string;
  Game_ID: ReferenceGameId;
  Game_Title: string;
  Difficulty: Difficulty;
  Session_Limit_Seconds: string;
  Target_Trials: number;
  Total_Duration_Seconds: number;
  Score: number;
  Accuracy_Percent: number;
  Moves: number;
  Attempts: number;
  Success_Count: number;
  Error_Count: number;
  Game_Result: GameResult;
  Details_JSON: string;
}

interface HudState {
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  tertiaryLabel: string;
  tertiaryValue: string;
}

interface RuntimeMetrics {
  elapsed: number;
}

interface MemoryCard {
  value: string;
  revealed: boolean;
  matched: boolean;
}

interface MemoryState {
  kind: 'memory-match';
  rows: number;
  cols: number;
  pairs: number;
  cards: MemoryCard[];
  flipped: number[];
  matchedPairs: number;
  moves: number;
  errors: number;
  mismatchClearAt: number | null;
}

interface LightsOutState {
  kind: 'lights-out';
  size: number;
  lights: boolean[][];
  moves: number;
}

interface ReactionState {
  kind: 'reaction-time';
  status: 'waiting' | 'ready' | 'go' | 'result' | 'too-early';
  attempts: number[];
  falseStarts: number;
  targetTrials: number;
  goAt: number | null;
  goStartedAt: number | null;
  lastReactionMs: number | null;
}

interface WhackState {
  kind: 'whack-a-mole';
  gridSize: number;
  activeIndex: number | null;
  nextTargetAt: number;
  targetExpiresAt: number | null;
  targetMs: number;
  minDelay: number;
  maxDelay: number;
  hits: number;
  misses: number;
  taps: number;
}

interface SlidingState {
  kind: 'sliding-puzzle';
  size: number;
  tiles: number[];
  blankIndex: number;
  moves: number;
  errors: number;
}

type CognitiveGameState = MemoryState | LightsOutState | ReactionState | WhackState | SlidingState;

const MODULES: ReferenceModuleMeta[] = [
  {
    id: 'memory-match',
    title: '記憶配對',
    referenceTitle: 'Memory Match',
    description: '翻開卡片尋找成對圖樣，訓練工作記憶、視覺搜尋與錯誤抑制。',
    focus: '記憶',
  },
  {
    id: 'lights-out',
    title: '關燈',
    referenceTitle: 'Lights Out',
    description: '切換目標與相鄰格，將盤面全部關閉，訓練邏輯推理與步驟規劃。',
    focus: '邏輯',
  },
  {
    id: 'reaction-time',
    title: '反應時間',
    referenceTitle: 'Reaction Time',
    description: '等待目標變色後快速反應，訓練持續注意力與反應抑制。',
    focus: '注意力',
  },
  {
    id: 'whack-a-mole',
    title: '打地鼠',
    referenceTitle: 'Whack-a-Mole',
    description: '快速點擊隨機出現的目標，訓練視覺掃描、手眼協調與速度控制。',
    focus: '速度',
  },
  {
    id: 'sliding-puzzle',
    title: '滑塊拼圖',
    referenceTitle: 'Sliding Puzzle',
    description: '移動數字滑塊完成排序，訓練空間規劃、序列推理與問題解決。',
    focus: '空間',
  },
];

export const REFERENCE_COGNITIVE_MODULES = MODULES;

const DIFFICULTIES: Record<Difficulty, { label: string; description: string }> = {
  Beginner: { label: '初級', description: '較小盤面或較慢節奏' },
  Intermediate: { label: '中級', description: '標準盤面與節奏' },
  Advanced: { label: '高級', description: '較大盤面或較快節奏' },
};

const SESSION_LIMIT_OPTIONS = [60, 120, 300, null] as const;
const REACTION_TRIAL_OPTIONS = [5, 8, 12] as const;
const WHACK_DURATION_OPTIONS = [30, 45, 60] as const;
const CARD_VALUES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const MEMORY_CONFIG: Record<Difficulty, { rows: number; cols: number; pairs: number }> = {
  Beginner: { rows: 3, cols: 4, pairs: 6 },
  Intermediate: { rows: 4, cols: 4, pairs: 8 },
  Advanced: { rows: 4, cols: 5, pairs: 10 },
};

const LIGHTS_CONFIG: Record<Difficulty, { size: number; shuffles: number }> = {
  Beginner: { size: 3, shuffles: 8 },
  Intermediate: { size: 4, shuffles: 14 },
  Advanced: { size: 5, shuffles: 24 },
};

const REACTION_CONFIG: Record<Difficulty, { minDelay: number; maxDelay: number }> = {
  Beginner: { minDelay: 1.4, maxDelay: 3.2 },
  Intermediate: { minDelay: 1.8, maxDelay: 4.4 },
  Advanced: { minDelay: 2.2, maxDelay: 5.2 },
};

const WHACK_CONFIG: Record<Difficulty, { gridSize: number; targetMs: number; minDelay: number; maxDelay: number }> = {
  Beginner: { gridSize: 3, targetMs: 1100, minDelay: 0.35, maxDelay: 0.9 },
  Intermediate: { gridSize: 3, targetMs: 850, minDelay: 0.25, maxDelay: 0.72 },
  Advanced: { gridSize: 4, targetMs: 720, minDelay: 0.18, maxDelay: 0.58 },
};

const SLIDING_CONFIG: Record<Difficulty, { size: number; shuffles: number }> = {
  Beginner: { size: 3, shuffles: 36 },
  Intermediate: { size: 4, shuffles: 72 },
  Advanced: { size: 5, shuffles: 120 },
};

const DEFAULT_HUD: HudState = {
  primaryLabel: '時間',
  primaryValue: '0s',
  secondaryLabel: '進度',
  secondaryValue: '-',
  tertiaryLabel: '成績',
  tertiaryValue: '-',
};

export function isReferenceGameId(value: string | null): value is ReferenceGameId {
  return MODULES.some((module) => module.id === value);
}

export function ReferenceCognitiveGame({ gameId, onExit }: ReferenceCognitiveGameProps) {
  const pixiHostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const phaseRef = useRef<GamePhase>('menu');
  const stateRef = useRef<CognitiveGameState | null>(null);
  const metricsRef = useRef<RuntimeMetrics>({ elapsed: 0 });
  const jsPsychRef = useRef<ReturnType<typeof initJsPsych> | null>(null);
  const renderRef = useRef<() => void>(() => undefined);
  const finishGameRef = useRef<(result: GameResult) => void>(() => undefined);
  const lastHudSecondRef = useRef(-1);

  const [phase, setPhaseState] = useState<GamePhase>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [sessionLimitSec, setSessionLimitSec] = useState<SessionLimitSeconds>(120);
  const [reactionTrials, setReactionTrials] = useState<number>(8);
  const [whackDurationSec, setWhackDurationSec] = useState<number>(30);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hud, setHud] = useState<HudState>(DEFAULT_HUD);
  const [result, setResult] = useState<SessionRecord | null>(null);

  const meta = getModuleMeta(gameId);
  const activeConfig = DIFFICULTIES[difficulty];
  const effectiveLimit = gameId === 'whack-a-mole' ? whackDurationSec : sessionLimitSec;
  const settingsStyle = useMemoStyle(gameId);

  const setPhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const syncHud = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    const summary = summarizeState(state, metricsRef.current.elapsed, effectiveLimit);
    setHud(summary);
    setElapsedSeconds(Math.floor(metricsRef.current.elapsed));
  }, [effectiveLimit]);

  const renderCurrent = useCallback(() => {
    const app = appRef.current;
    const state = stateRef.current;
    if (!app || !state) return;
    clearStage(app);
    drawBackground(app);
    switch (state.kind) {
      case 'memory-match':
        drawMemory(app, state, handleCellTap);
        break;
      case 'lights-out':
        drawLightsOut(app, state, handleCellTap);
        break;
      case 'reaction-time':
        drawReaction(app, state, handleReactionTap);
        break;
      case 'whack-a-mole':
        drawWhack(app, state, metricsRef.current.elapsed, effectiveLimit ?? whackDurationSec, handleCellTap);
        break;
      case 'sliding-puzzle':
        drawSliding(app, state, handleCellTap);
        break;
      default:
        break;
    }
  }, [effectiveLimit, whackDurationSec]);

  renderRef.current = renderCurrent;

  const finishGame = useCallback((gameResult: GameResult) => {
    if (phaseRef.current === 'results') return;
    const state = stateRef.current;
    if (!state) return;
    const stats = buildResultStats(state);
    const record: SessionRecord = {
      Test_Date: formatTestDate(new Date()),
      Participant_ID: getActiveUser() || 'Unknown',
      Game_ID: gameId,
      Game_Title: meta.title,
      Difficulty: difficulty,
      Session_Limit_Seconds: effectiveLimit === null ? 'Infinite' : String(effectiveLimit),
      Target_Trials: gameId === 'reaction-time' ? reactionTrials : 0,
      Total_Duration_Seconds: Number(metricsRef.current.elapsed.toFixed(1)),
      Score: stats.score,
      Accuracy_Percent: stats.accuracy,
      Moves: stats.moves,
      Attempts: stats.attempts,
      Success_Count: stats.success,
      Error_Count: stats.errors,
      Game_Result: gameResult,
      Details_JSON: JSON.stringify(stats.details),
    };
    setResult(record);
    setHud(summarizeState(state, metricsRef.current.elapsed, effectiveLimit));
    setPhase('results');
    try {
      const jsPsychData = jsPsychRef.current?.data;
      const writeData = jsPsychData?.write as unknown as ((data: Record<string, unknown>) => void) | undefined;
      writeData?.call(jsPsychData, record as unknown as Record<string, unknown>);
    } catch (error) {
      console.warn('Unable to write reference cognitive result to jsPsych data.', error);
    }
  }, [difficulty, effectiveLimit, gameId, meta.title, reactionTrials, setPhase]);

  finishGameRef.current = finishGame;

  const startGame = useCallback(() => {
    metricsRef.current = { elapsed: 0 };
    lastHudSecondRef.current = -1;
    stateRef.current = createInitialState(gameId, difficulty, reactionTrials);
    setResult(null);
    setElapsedSeconds(0);
    setHud(summarizeState(stateRef.current, 0, effectiveLimit));
    setPhase('playing');
    window.setTimeout(() => renderRef.current(), 0);
  }, [difficulty, effectiveLimit, gameId, reactionTrials, setPhase]);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const returnToMenu = useCallback(() => {
    setPhase('menu');
    setResult(null);
    stateRef.current = null;
    metricsRef.current = { elapsed: 0 };
    setElapsedSeconds(0);
    setHud(DEFAULT_HUD);
    const app = appRef.current;
    if (app) {
      clearStage(app);
      drawBackground(app);
    }
  }, [setPhase]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    setPhase('paused');
    syncHud();
  }, [setPhase, syncHud]);

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    setPhase('playing');
  }, [setPhase]);

  const downloadResult = useCallback(() => {
    if (!result) return;
    downloadCsvFile(toCsv([result]), `cognitive_${gameId}_${Date.now()}.csv`);
  }, [gameId, result]);

  function handleCellTap(index: number) {
    if (phaseRef.current !== 'playing') return;
    const state = stateRef.current;
    if (!state) return;
    if (state.kind === 'memory-match') handleMemoryTap(state, index, metricsRef.current.elapsed, finishGameRef.current);
    if (state.kind === 'lights-out') handleLightsTap(state, index, finishGameRef.current);
    if (state.kind === 'whack-a-mole') handleWhackTap(state, index, metricsRef.current.elapsed);
    if (state.kind === 'sliding-puzzle') handleSlidingTap(state, index, finishGameRef.current);
    syncHud();
    renderRef.current();
  }

  function handleReactionTap() {
    if (phaseRef.current !== 'playing') return;
    const state = stateRef.current;
    if (!state || state.kind !== 'reaction-time') return;
    handleReactionStateTap(state, metricsRef.current.elapsed, difficulty, finishGameRef.current);
    syncHud();
    renderRef.current();
  }

  useEffect(() => {
    jsPsychRef.current = initJsPsych();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let initialized = false;
    const app = new Application();

    const init = async () => {
      const host = pixiHostRef.current;
      if (!host) return;
      try {
        await app.init({
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
          resizeTo: host,
        });
        initialized = true;
        if (cancelled) {
          app.destroy(true, { children: true });
          return;
        }
        appRef.current = app;
        host.appendChild(app.canvas);
        app.canvas.className = 'cognitive-pixi-canvas';
        drawBackground(app);
        app.ticker.add((ticker: Ticker) => {
          if (phaseRef.current !== 'playing') return;
          const dt = Math.min(ticker.deltaMS / 1000, 0.05);
          metricsRef.current.elapsed += dt;
          updateTimedState(stateRef.current, metricsRef.current.elapsed, renderRef.current, finishGameRef.current);
          const limit = gameId === 'whack-a-mole' ? whackDurationSec : sessionLimitSec;
          if (limit !== null && metricsRef.current.elapsed >= limit) {
            finishGameRef.current(isAutoSuccess(stateRef.current) ? 'Victory' : 'Defeat');
            return;
          }
          const nextSecond = Math.floor(metricsRef.current.elapsed);
          if (lastHudSecondRef.current !== nextSecond) {
            lastHudSecondRef.current = nextSecond;
            syncHud();
            if (stateRef.current?.kind === 'whack-a-mole') renderRef.current();
          }
        });
        if (phaseRef.current === 'playing') renderRef.current();
      } catch (error) {
        if (!cancelled) console.error('PixiJS init failed for cognitive game:', error);
      }
    };

    void init();
    const handleResize = () => renderRef.current();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      if (appRef.current === app) appRef.current = null;
      if (initialized) app.destroy(true, { children: true });
    };
  }, [gameId, sessionLimitSec, syncHud, whackDurationSec]);

  useEffect(() => {
    if (phase === 'menu') {
      const app = appRef.current;
      if (app) {
        clearStage(app);
        drawBackground(app);
      }
    }
  }, [phase]);

  return (
    <div className={`cognitive-reference-game cognitive-reference-phase-${phase}`} style={settingsStyle}>
      <div ref={pixiHostRef} className="cognitive-pixi-stage" />

      {phase === 'playing' && (
        <div className="cognitive-game-hud">
          <div><strong>時間</strong> {elapsedSeconds}s</div>
          <div><strong>{hud.primaryLabel}</strong> {hud.primaryValue}</div>
          <div><strong>{hud.secondaryLabel}</strong> {hud.secondaryValue}</div>
          <div><strong>{hud.tertiaryLabel}</strong> {hud.tertiaryValue}</div>
          <button className="btn btn-sm btn-secondary" onClick={pauseGame}>暫停</button>
          <button className="btn btn-sm btn-ghost" onClick={returnToMenu}>返回設定</button>
        </div>
      )}

      {phase === 'menu' && (
        <div className="drawing-defense-panel">
          <div className="drawing-defense-config cognitive-config">
            <header className="drawing-defense-config-header">
              <div>
                <span className="drawing-defense-config-label">reference/javascript-games</span>
                <h1>{meta.title}</h1>
              </div>
              <div className="drawing-defense-config-stats">
                <span>{meta.referenceTitle}</span>
                <span>{meta.focus}</span>
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

              {gameId === 'reaction-time' ? (
                <section className="drawing-defense-setting">
                  <div className="drawing-defense-setting-header">
                    <div>
                      <h2>回合數</h2>
                      <p>完成指定反應次數後結算</p>
                    </div>
                    <span>{reactionTrials} 次</span>
                  </div>
                  <div className="drawing-defense-option-grid drawing-defense-option-grid-three">
                    {REACTION_TRIAL_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`drawing-defense-option ${reactionTrials === value ? 'active' : ''}`}
                        onClick={() => setReactionTrials(value)}
                      >
                        <span className="drawing-defense-option-title">{value} 次</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : gameId === 'whack-a-mole' ? (
                <section className="drawing-defense-setting">
                  <div className="drawing-defense-setting-header">
                    <div>
                      <h2>訓練時間</h2>
                      <p>時間到後自動結算</p>
                    </div>
                    <span>{whackDurationSec}s</span>
                  </div>
                  <div className="drawing-defense-option-grid drawing-defense-option-grid-three">
                    {WHACK_DURATION_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`drawing-defense-option ${whackDurationSec === value ? 'active' : ''}`}
                        onClick={() => setWhackDurationSec(value)}
                      >
                        <span className="drawing-defense-option-title">{value}s</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="drawing-defense-setting">
                  <div className="drawing-defense-setting-header">
                    <div>
                      <h2>時間上限</h2>
                      <p>{sessionLimitSec === null ? '不限時間' : `${sessionLimitSec} 秒內完成`}</p>
                    </div>
                    <span>{formatLimit(sessionLimitSec)}</span>
                  </div>
                  <div className="drawing-defense-option-grid drawing-defense-duration-grid">
                    {SESSION_LIMIT_OPTIONS.map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        className={`drawing-defense-option ${sessionLimitSec === value ? 'active' : ''}`}
                        onClick={() => setSessionLimitSec(value)}
                      >
                        <span className="drawing-defense-option-title">{formatLimit(value)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="drawing-defense-setting drawing-defense-setting-wide">
                <div className="drawing-defense-setting-header">
                  <div>
                    <h2>訓練內容</h2>
                    <p>{meta.description}</p>
                  </div>
                  <span>{meta.focus}</span>
                </div>
              </section>
            </div>

            <div className="drawing-defense-config-footer">
              <div className="drawing-defense-config-summary">
                <strong>{meta.title}</strong>
                <span>{activeConfig.label}</span>
                <span>{gameId === 'reaction-time' ? `${reactionTrials} 次` : formatLimit(effectiveLimit)}</span>
              </div>
              <div className="drawing-defense-config-actions">
                <button className="btn btn-primary btn-lg config-start-btn" onClick={startGame}>開始遊戲</button>
                <button className="btn btn-ghost btn-lg" onClick={onExit}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="drawing-defense-panel drawing-defense-panel-compact">
          <h1>訓練暫停</h1>
          <p>{hud.primaryLabel} {hud.primaryValue}，目前時間 {elapsedSeconds} 秒。</p>
          <div className="drawing-defense-actions">
            <button className="btn btn-primary btn-lg" onClick={resumeGame}>繼續遊戲</button>
            <button className="btn btn-secondary btn-lg" onClick={restartGame}>重新開始</button>
            <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>返回設定</button>
          </div>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="experiment-container cognitive-results-container" style={{ overflowY: 'auto' }}>
          <div className="experiment-results">
            <h1>{result.Game_Result === 'Victory' ? '訓練完成' : '訓練結束'}</h1>
            <div className="drawing-defense-result-summary">
              <span>
                <small>分數</small>
                <strong>{result.Score}</strong>
              </span>
              <span>
                <small>正確率</small>
                <strong>{result.Accuracy_Percent}%</strong>
              </span>
              <span>
                <small>使用時間</small>
                <strong>{result.Total_Duration_Seconds}s</strong>
              </span>
            </div>

            <table className="results-table">
              <tbody>
                <tr>
                  <th>遊戲</th>
                  <td>{result.Game_Title}</td>
                </tr>
                <tr>
                  <th>難度</th>
                  <td>{DIFFICULTIES[result.Difficulty].label}</td>
                </tr>
                <tr>
                  <th>嘗試次數</th>
                  <td>{result.Attempts}</td>
                </tr>
                <tr>
                  <th>成功次數</th>
                  <td>{result.Success_Count}</td>
                </tr>
                <tr>
                  <th>錯誤次數</th>
                  <td>{result.Error_Count}</td>
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

function useMemoStyle(gameId: ReferenceGameId): CSSProperties {
  const accent =
    gameId === 'memory-match' ? '#005EB8' :
      gameId === 'lights-out' ? '#506C22' :
        gameId === 'reaction-time' ? '#8A3FFC' :
          gameId === 'whack-a-mole' ? '#B54708' :
            '#006B6B';
  return { '--cognitive-game-accent': accent } as CSSProperties;
}

function getModuleMeta(gameId: ReferenceGameId) {
  return MODULES.find((module) => module.id === gameId) ?? MODULES[0];
}

function createInitialState(gameId: ReferenceGameId, difficulty: Difficulty, reactionTrials: number): CognitiveGameState {
  if (gameId === 'memory-match') return createMemoryState(difficulty);
  if (gameId === 'lights-out') return createLightsState(difficulty);
  if (gameId === 'reaction-time') return createReactionState(reactionTrials);
  if (gameId === 'whack-a-mole') return createWhackState(difficulty);
  return createSlidingState(difficulty);
}

function createMemoryState(difficulty: Difficulty): MemoryState {
  const config = MEMORY_CONFIG[difficulty];
  const values = shuffle(CARD_VALUES).slice(0, config.pairs);
  const cards = shuffle([...values, ...values]).map((value) => ({ value, revealed: false, matched: false }));
  return {
    kind: 'memory-match',
    rows: config.rows,
    cols: config.cols,
    pairs: config.pairs,
    cards,
    flipped: [],
    matchedPairs: 0,
    moves: 0,
    errors: 0,
    mismatchClearAt: null,
  };
}

function createLightsState(difficulty: Difficulty): LightsOutState {
  const config = LIGHTS_CONFIG[difficulty];
  const lights = Array.from({ length: config.size }, () => Array.from({ length: config.size }, () => false));
  for (let i = 0; i < config.shuffles; i += 1) {
    toggleLights(lights, Math.floor(Math.random() * config.size), Math.floor(Math.random() * config.size));
  }
  if (lights.every((row) => row.every((light) => !light))) {
    toggleLights(lights, Math.floor(config.size / 2), Math.floor(config.size / 2));
  }
  return { kind: 'lights-out', size: config.size, lights, moves: 0 };
}

function createReactionState(targetTrials: number): ReactionState {
  return {
    kind: 'reaction-time',
    status: 'waiting',
    attempts: [],
    falseStarts: 0,
    targetTrials,
    goAt: null,
    goStartedAt: null,
    lastReactionMs: null,
  };
}

function createWhackState(difficulty: Difficulty): WhackState {
  const config = WHACK_CONFIG[difficulty];
  return {
    kind: 'whack-a-mole',
    gridSize: config.gridSize,
    activeIndex: null,
    nextTargetAt: 0.6,
    targetExpiresAt: null,
    targetMs: config.targetMs,
    minDelay: config.minDelay,
    maxDelay: config.maxDelay,
    hits: 0,
    misses: 0,
    taps: 0,
  };
}

function createSlidingState(difficulty: Difficulty): SlidingState {
  const config = SLIDING_CONFIG[difficulty];
  const total = config.size * config.size;
  const tiles = Array.from({ length: total }, (_, index) => (index + 1) % total);
  let blankIndex = total - 1;
  let lastBlank = -1;
  for (let i = 0; i < config.shuffles; i += 1) {
    const neighbors = getSlidingNeighbors(blankIndex, config.size).filter((index) => index !== lastBlank);
    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[blankIndex], tiles[next]] = [tiles[next], tiles[blankIndex]];
    lastBlank = blankIndex;
    blankIndex = next;
  }
  return { kind: 'sliding-puzzle', size: config.size, tiles, blankIndex, moves: 0, errors: 0 };
}

function handleMemoryTap(state: MemoryState, index: number, elapsed: number, finishGame: (result: GameResult) => void) {
  if (state.mismatchClearAt !== null || state.flipped.length >= 2) return;
  const card = state.cards[index];
  if (!card || card.revealed || card.matched) return;
  card.revealed = true;
  state.flipped.push(index);
  if (state.flipped.length !== 2) return;

  state.moves += 1;
  const [first, second] = state.flipped;
  if (state.cards[first].value === state.cards[second].value) {
    state.cards[first].matched = true;
    state.cards[second].matched = true;
    state.flipped = [];
    state.matchedPairs += 1;
    if (state.matchedPairs === state.pairs) finishGame('Victory');
  } else {
    state.errors += 1;
    state.mismatchClearAt = elapsed + 0.75;
  }
}

function handleLightsTap(state: LightsOutState, index: number, finishGame: (result: GameResult) => void) {
  const row = Math.floor(index / state.size);
  const col = index % state.size;
  toggleLights(state.lights, row, col);
  state.moves += 1;
  if (state.lights.every((line) => line.every((light) => !light))) finishGame('Victory');
}

function handleReactionStateTap(state: ReactionState, elapsed: number, difficulty: Difficulty, finishGame: (result: GameResult) => void) {
  if (state.status === 'waiting' || state.status === 'result' || state.status === 'too-early') {
    const cfg = REACTION_CONFIG[difficulty];
    state.status = 'ready';
    state.goAt = elapsed + cfg.minDelay + Math.random() * (cfg.maxDelay - cfg.minDelay);
    state.goStartedAt = null;
    state.lastReactionMs = null;
    return;
  }
  if (state.status === 'ready') {
    state.falseStarts += 1;
    state.status = 'too-early';
    state.goAt = null;
    return;
  }
  if (state.status === 'go' && state.goStartedAt !== null) {
    const reactionMs = Math.max(0, Math.round((elapsed - state.goStartedAt) * 1000));
    state.attempts.push(reactionMs);
    state.lastReactionMs = reactionMs;
    state.status = 'result';
    state.goAt = null;
    state.goStartedAt = null;
    if (state.attempts.length >= state.targetTrials) finishGame('Victory');
  }
}

function handleWhackTap(state: WhackState, index: number, elapsed: number) {
  state.taps += 1;
  if (state.activeIndex === index) {
    state.hits += 1;
    state.activeIndex = null;
    state.targetExpiresAt = null;
    state.nextTargetAt = elapsed + randomBetween(state.minDelay, state.maxDelay);
    return;
  }
  state.misses += 1;
}

function handleSlidingTap(state: SlidingState, index: number, finishGame: (result: GameResult) => void) {
  if (!getSlidingNeighbors(state.blankIndex, state.size).includes(index)) {
    state.errors += 1;
    return;
  }
  [state.tiles[state.blankIndex], state.tiles[index]] = [state.tiles[index], state.tiles[state.blankIndex]];
  state.blankIndex = index;
  state.moves += 1;
  if (isSlidingSolved(state.tiles)) finishGame('Victory');
}

function updateTimedState(
  state: CognitiveGameState | null,
  elapsed: number,
  render: () => void,
  finishGame: (result: GameResult) => void,
) {
  if (!state) return;
  if (state.kind === 'memory-match' && state.mismatchClearAt !== null && elapsed >= state.mismatchClearAt) {
    state.flipped.forEach((index) => {
      if (!state.cards[index].matched) state.cards[index].revealed = false;
    });
    state.flipped = [];
    state.mismatchClearAt = null;
    render();
  }
  if (state.kind === 'reaction-time' && state.status === 'ready' && state.goAt !== null && elapsed >= state.goAt) {
    state.status = 'go';
    state.goStartedAt = elapsed;
    render();
  }
  if (state.kind === 'whack-a-mole') {
    if (state.activeIndex !== null && state.targetExpiresAt !== null && elapsed >= state.targetExpiresAt) {
      state.misses += 1;
      state.activeIndex = null;
      state.targetExpiresAt = null;
      state.nextTargetAt = elapsed + randomBetween(state.minDelay, state.maxDelay);
      render();
    }
    if (state.activeIndex === null && elapsed >= state.nextTargetAt) {
      state.activeIndex = Math.floor(Math.random() * state.gridSize * state.gridSize);
      state.targetExpiresAt = elapsed + state.targetMs / 1000;
      render();
    }
  }
  if (state.kind === 'reaction-time' && state.attempts.length >= state.targetTrials) finishGame('Victory');
}

function isAutoSuccess(state: CognitiveGameState | null) {
  if (!state) return false;
  if (state.kind === 'whack-a-mole') return state.hits > 0;
  if (state.kind === 'reaction-time') return state.attempts.length >= state.targetTrials;
  if (state.kind === 'memory-match') return state.matchedPairs === state.pairs;
  if (state.kind === 'lights-out') return state.lights.every((line) => line.every((light) => !light));
  return isSlidingSolved(state.tiles);
}

function summarizeState(state: CognitiveGameState, elapsed: number, limit: SessionLimitSeconds): HudState {
  const timeValue = limit === null ? `${Math.floor(elapsed)}s` : `${Math.max(0, Math.ceil(limit - elapsed))}s`;
  if (state.kind === 'memory-match') {
    return {
      primaryLabel: '配對',
      primaryValue: `${state.matchedPairs}/${state.pairs}`,
      secondaryLabel: '步數',
      secondaryValue: String(state.moves),
      tertiaryLabel: '剩餘',
      tertiaryValue: timeValue,
    };
  }
  if (state.kind === 'lights-out') {
    const lightsOn = state.lights.flat().filter(Boolean).length;
    return {
      primaryLabel: '亮燈',
      primaryValue: String(lightsOn),
      secondaryLabel: '步數',
      secondaryValue: String(state.moves),
      tertiaryLabel: '剩餘',
      tertiaryValue: timeValue,
    };
  }
  if (state.kind === 'reaction-time') {
    const avg = average(state.attempts);
    return {
      primaryLabel: '回合',
      primaryValue: `${state.attempts.length}/${state.targetTrials}`,
      secondaryLabel: '平均',
      secondaryValue: avg === null ? '-' : `${avg}ms`,
      tertiaryLabel: '誤觸',
      tertiaryValue: String(state.falseStarts),
    };
  }
  if (state.kind === 'whack-a-mole') {
    return {
      primaryLabel: '命中',
      primaryValue: String(state.hits),
      secondaryLabel: '錯失',
      secondaryValue: String(state.misses),
      tertiaryLabel: '剩餘',
      tertiaryValue: timeValue,
    };
  }
  return {
    primaryLabel: '步數',
    primaryValue: String(state.moves),
    secondaryLabel: '錯誤',
    secondaryValue: String(state.errors),
    tertiaryLabel: '剩餘',
    tertiaryValue: timeValue,
  };
}

function buildResultStats(state: CognitiveGameState) {
  if (state.kind === 'memory-match') {
    const accuracy = state.moves > 0 ? Math.round((state.matchedPairs / state.moves) * 100) : 0;
    return {
      score: Math.max(0, state.matchedPairs * 120 - state.errors * 20 - state.moves * 2),
      accuracy,
      moves: state.moves,
      attempts: state.moves,
      success: state.matchedPairs,
      errors: state.errors,
      details: { rows: state.rows, cols: state.cols, pairs: state.pairs },
    };
  }
  if (state.kind === 'lights-out') {
    const lightsOn = state.lights.flat().filter(Boolean).length;
    return {
      score: Math.max(0, 1000 - state.moves * 12 - lightsOn * 35),
      accuracy: lightsOn === 0 ? 100 : Math.max(0, Math.round(((state.size * state.size - lightsOn) / (state.size * state.size)) * 100)),
      moves: state.moves,
      attempts: state.moves,
      success: state.size * state.size - lightsOn,
      errors: lightsOn,
      details: { size: state.size, lightsOn },
    };
  }
  if (state.kind === 'reaction-time') {
    const avg = average(state.attempts) ?? 0;
    const best = state.attempts.length > 0 ? Math.min(...state.attempts) : 0;
    const attemptsWithFalseStarts = state.attempts.length + state.falseStarts;
    return {
      score: Math.max(0, Math.round(1000 - avg * 1.8 - state.falseStarts * 80)),
      accuracy: attemptsWithFalseStarts > 0 ? Math.round((state.attempts.length / attemptsWithFalseStarts) * 100) : 0,
      moves: 0,
      attempts: attemptsWithFalseStarts,
      success: state.attempts.length,
      errors: state.falseStarts,
      details: { attemptsMs: state.attempts, averageMs: avg, bestMs: best },
    };
  }
  if (state.kind === 'whack-a-mole') {
    return {
      score: Math.max(0, state.hits * 100 - state.misses * 25),
      accuracy: state.taps > 0 ? Math.round((state.hits / state.taps) * 100) : 0,
      moves: 0,
      attempts: state.taps,
      success: state.hits,
      errors: state.misses,
      details: { gridSize: state.gridSize, targetMs: state.targetMs },
    };
  }
  return {
    score: Math.max(0, 1000 - state.moves * 10 - state.errors * 25),
    accuracy: state.moves + state.errors > 0 ? Math.round((state.moves / (state.moves + state.errors)) * 100) : 0,
    moves: state.moves,
    attempts: state.moves + state.errors,
    success: state.moves,
    errors: state.errors,
    details: { size: state.size, solved: isSlidingSolved(state.tiles) },
  };
}

function drawBackground(app: Application) {
  const bg = new Graphics();
  bg.rect(0, 0, app.renderer.width, app.renderer.height).fill(0xf2f4f3);
  app.stage.addChild(bg);
}

function drawMemory(app: Application, state: MemoryState, onTap: (index: number) => void) {
  const { cell, gap, startX, startY } = getGridLayout(app, state.cols, state.rows, 92, 10);
  state.cards.forEach((card, index) => {
    const row = Math.floor(index / state.cols);
    const col = index % state.cols;
    const x = startX + col * (cell + gap);
    const y = startY + row * (cell + gap);
    const node = new Container();
    node.x = x;
    node.y = y;
    node.eventMode = card.matched ? 'none' : 'static';
    node.cursor = card.matched ? 'default' : 'pointer';
    node.on('pointertap', () => onTap(index));
    const cardColor = card.matched ? 0xd9f2e6 : card.revealed ? 0xffffff : 0x005eb8;
    const borderColor = card.matched ? 0x177245 : card.revealed ? 0x64748b : 0x00478d;
    const g = new Graphics();
    g.roundRect(0, 0, cell, cell, 8).fill(cardColor).stroke({ color: borderColor, width: 2 });
    node.addChild(g);
    addText(node, card.revealed || card.matched ? card.value : '?', cell / 2, cell / 2, {
      fontSize: Math.max(24, cell * 0.42),
      fontWeight: '800',
      fill: card.revealed || card.matched ? '#1A1C1E' : '#FFFFFF',
    });
    app.stage.addChild(node);
  });
}

function drawLightsOut(app: Application, state: LightsOutState, onTap: (index: number) => void) {
  const { cell, gap, startX, startY } = getGridLayout(app, state.size, state.size, 96, 10);
  state.lights.forEach((row, yIndex) => {
    row.forEach((light, xIndex) => {
      const index = yIndex * state.size + xIndex;
      const x = startX + xIndex * (cell + gap);
      const y = startY + yIndex * (cell + gap);
      const node = new Container();
      node.x = x;
      node.y = y;
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.on('pointertap', () => onTap(index));
      const g = new Graphics();
      g.roundRect(0, 0, cell, cell, 8)
        .fill(light ? 0xffd166 : 0x1f2937)
        .stroke({ color: light ? 0xb7791f : 0x111827, width: 2 });
      node.addChild(g);
      if (light) {
        const glow = new Graphics();
        glow.circle(cell / 2, cell / 2, cell * 0.18).fill({ color: 0xffffff, alpha: 0.72 });
        node.addChild(glow);
      }
      app.stage.addChild(node);
    });
  });
}

function drawReaction(app: Application, state: ReactionState, onTap: () => void) {
  const w = app.renderer.width;
  const h = app.renderer.height;
  const boxW = Math.min(w - 48, 720);
  const boxH = Math.min(h - 150, 420);
  const x = (w - boxW) / 2;
  const y = (h - boxH) / 2 + 24;
  const colors = {
    waiting: 0xffffff,
    ready: 0xfbd38d,
    go: 0x2f9e44,
    result: 0xe8f3ff,
    'too-early': 0xffe3e3,
  };
  const labels = {
    waiting: '開始',
    ready: '等待',
    go: '現在',
    result: state.lastReactionMs === null ? '完成' : `${state.lastReactionMs} ms`,
    'too-early': '太早',
  };
  const node = new Container();
  node.eventMode = 'static';
  node.cursor = 'pointer';
  node.on('pointertap', onTap);
  const g = new Graphics();
  g.roundRect(x, y, boxW, boxH, 8).fill(colors[state.status]).stroke({ color: 0x424752, width: 2 });
  node.addChild(g);
  addText(node, labels[state.status], w / 2, y + boxH / 2 - 20, {
    fontSize: 52,
    fontWeight: '900',
    fill: state.status === 'go' ? '#FFFFFF' : '#1A1C1E',
  });
  const avg = average(state.attempts);
  addText(node, `${state.attempts.length}/${state.targetTrials}${avg === null ? '' : `  AVG ${avg} ms`}`, w / 2, y + boxH / 2 + 58, {
    fontSize: 22,
    fontWeight: '700',
    fill: state.status === 'go' ? '#FFFFFF' : '#424752',
  });
  app.stage.addChild(node);
}

function drawWhack(app: Application, state: WhackState, elapsed: number, duration: number, onTap: (index: number) => void) {
  const { cell, gap, startX, startY } = getGridLayout(app, state.gridSize, state.gridSize, 104, 14);
  const total = state.gridSize * state.gridSize;
  for (let index = 0; index < total; index += 1) {
    const row = Math.floor(index / state.gridSize);
    const col = index % state.gridSize;
    const x = startX + col * (cell + gap);
    const y = startY + row * (cell + gap);
    const node = new Container();
    node.x = x;
    node.y = y;
    node.eventMode = 'static';
    node.cursor = 'pointer';
    node.on('pointertap', () => onTap(index));
    const g = new Graphics();
    g.roundRect(0, 0, cell, cell, 8).fill(0xffffff).stroke({ color: 0xc2c6d4, width: 2 });
    g.circle(cell / 2, cell / 2, cell * 0.28).fill(0xe7eef5).stroke({ color: 0x64748b, width: 2 });
    node.addChild(g);
    if (state.activeIndex === index) {
      const target = new Graphics();
      target.circle(cell / 2, cell / 2, cell * 0.28).fill(0xb54708);
      target.circle(cell / 2, cell / 2, cell * 0.14).fill(0xffffff);
      target.circle(cell / 2, cell / 2, cell * 0.06).fill(0x1a1c1e);
      node.addChild(target);
    }
    app.stage.addChild(node);
  }
  const progressWidth = Math.min(app.renderer.width - 48, 520);
  const progressX = (app.renderer.width - progressWidth) / 2;
  const progressY = Math.max(80, startY - 36);
  const ratio = clamp(1 - elapsed / Math.max(1, duration), 0, 1);
  const bar = new Graphics();
  bar.roundRect(progressX, progressY, progressWidth, 10, 5).fill(0xd8dee8);
  bar.roundRect(progressX, progressY, progressWidth * ratio, 10, 5).fill(0xb54708);
  app.stage.addChild(bar);
}

function drawSliding(app: Application, state: SlidingState, onTap: (index: number) => void) {
  const { cell, gap, startX, startY } = getGridLayout(app, state.size, state.size, 96, 8);
  state.tiles.forEach((tile, index) => {
    if (tile === 0) return;
    const row = Math.floor(index / state.size);
    const col = index % state.size;
    const x = startX + col * (cell + gap);
    const y = startY + row * (cell + gap);
    const node = new Container();
    node.x = x;
    node.y = y;
    node.eventMode = 'static';
    node.cursor = 'pointer';
    node.on('pointertap', () => onTap(index));
    const g = new Graphics();
    g.roundRect(0, 0, cell, cell, 8).fill(0x006b6b).stroke({ color: 0x024b4b, width: 2 });
    node.addChild(g);
    addText(node, String(tile), cell / 2, cell / 2, {
      fontSize: Math.max(22, cell * 0.38),
      fontWeight: '900',
      fill: '#FFFFFF',
    });
    app.stage.addChild(node);
  });
}

function getGridLayout(app: Application, cols: number, rows: number, preferredCell: number, gap: number) {
  const maxW = app.renderer.width - 48;
  const maxH = app.renderer.height - 138;
  const cell = Math.floor(Math.min(preferredCell, (maxW - gap * (cols - 1)) / cols, (maxH - gap * (rows - 1)) / rows));
  const width = cell * cols + gap * (cols - 1);
  const height = cell * rows + gap * (rows - 1);
  return {
    cell,
    gap,
    startX: (app.renderer.width - width) / 2,
    startY: (app.renderer.height - height) / 2 + 28,
  };
}

function addText(container: Container, text: string, x: number, y: number, style: Record<string, unknown>) {
  const label = new Text({ text, style });
  label.anchor.set(0.5);
  label.x = x;
  label.y = y;
  container.addChild(label);
}

function clearStage(app: Application) {
  const children = app.stage.removeChildren();
  children.forEach((child) => child.destroy({ children: true }));
}

function toggleLights(lights: boolean[][], row: number, col: number) {
  const size = lights.length;
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dy, dx]) => {
    const y = row + dy;
    const x = col + dx;
    if (y < 0 || y >= size || x < 0 || x >= size) return;
    lights[y][x] = !lights[y][x];
  });
}

function getSlidingNeighbors(index: number, size: number) {
  const row = Math.floor(index / size);
  const col = index % size;
  return [
    row > 0 ? index - size : null,
    row < size - 1 ? index + size : null,
    col > 0 ? index - 1 : null,
    col < size - 1 ? index + 1 : null,
  ].filter((value): value is number => value !== null);
}

function isSlidingSolved(tiles: number[]) {
  return tiles.every((tile, index) => tile === (index + 1) % tiles.length);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatLimit(value: SessionLimitSeconds) {
  return value === null ? '不限時' : `${value}s`;
}

function toCsv(records: SessionRecord[]): string {
  const columns: Array<{ label: string; value: (record: SessionRecord) => unknown }> = [
    { label: '測驗日期', value: (record) => record.Test_Date },
    { label: 'Participant_ID', value: (record) => record.Participant_ID },
    { label: 'Game_ID', value: (record) => record.Game_ID },
    { label: 'Game_Title', value: (record) => record.Game_Title },
    { label: 'Difficulty', value: (record) => record.Difficulty },
    { label: 'Session_Limit_Seconds', value: (record) => record.Session_Limit_Seconds },
    { label: 'Target_Trials', value: (record) => record.Target_Trials },
    { label: 'Total_Duration_Seconds', value: (record) => record.Total_Duration_Seconds },
    { label: 'Score', value: (record) => record.Score },
    { label: 'Accuracy_Percent', value: (record) => record.Accuracy_Percent },
    { label: 'Moves', value: (record) => record.Moves },
    { label: 'Attempts', value: (record) => record.Attempts },
    { label: 'Success_Count', value: (record) => record.Success_Count },
    { label: 'Error_Count', value: (record) => record.Error_Count },
    { label: 'Game_Result', value: (record) => record.Game_Result },
    { label: 'Details_JSON', value: (record) => record.Details_JSON },
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

function formatTestDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
