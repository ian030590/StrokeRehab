import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { Application, type Ticker } from 'pixi.js';
import { initJsPsych } from 'jspsych';
import { useT } from '../../i18n';
import { downloadCsvFile } from '../../utils/downloadFile';
import { getActiveUser } from '../../utils/settings';
import { saveTrainingSessionRecord } from '../../utils/trainingRecords';
import { csvCell, formatTestDate, writeJsPsychData } from './gameUtils';
import {
  DEFAULT_HUD,
  DIFFICULTIES,
  REACTION_TRIAL_OPTIONS,
  REFERENCE_COGNITIVE_MODULES,
  SESSION_LIMIT_OPTIONS,
  WHACK_DURATION_OPTIONS,
} from './cognitive/constants';
import {
  buildLightsResultStats,
  createLightsState,
  drawLightsOut,
  handleLightsTap,
  isLightsAutoSuccess,
  summarizeLightsState,
} from './cognitive/lightsOut';
import {
  buildMemoryResultStats,
  createMemoryState,
  drawMemory,
  handleMemoryTap,
  isMemoryAutoSuccess,
  summarizeMemoryState,
  updateMemoryTimedState,
} from './cognitive/memoryMatch';
import {
  buildReactionResultStats,
  createReactionState,
  drawReaction,
  handleReactionStateTap,
  isReactionAutoSuccess,
  summarizeReactionState,
  updateReactionTimedState,
} from './cognitive/reactionTime';
import {
  buildSlidingResultStats,
  createSlidingState,
  drawSliding,
  handleSlidingTap,
  isSlidingAutoSuccess,
  summarizeSlidingState,
} from './cognitive/slidingPuzzle';
import {
  buildWhackResultStats,
  createWhackState,
  drawWhack,
  handleWhackTap,
  isWhackAutoSuccess,
  summarizeWhackState,
  updateWhackTimedState,
} from './cognitive/targetClick';
import type {
  CognitiveGameState,
  Difficulty,
  GamePhase,
  GameResult,
  HudState,
  ReferenceGameId,
  ResultStats,
  RuntimeMetrics,
  SessionLimitSeconds,
  SessionRecord,
} from './cognitive/types';
import { COGNITIVE_ACCENT_CSS, clearStage, drawBackground } from './cognitive/utils';
import { verifySelectedTrainingUser } from './selectedUserGuard';

export type { ReferenceGameId } from './cognitive/types';
export { REFERENCE_COGNITIVE_MODULES } from './cognitive/constants';

interface ReferenceCognitiveGameProps {
  gameId: ReferenceGameId;
  onExit: () => void;
}

export function isReferenceGameId(value: string | null): value is ReferenceGameId {
  return REFERENCE_COGNITIVE_MODULES.some((module) => module.id === value);
}

export function ReferenceCognitiveGame({ gameId, onExit }: ReferenceCognitiveGameProps) {
  const { t } = useT();
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
    saveTrainingSessionRecord({
      userName: record.Participant_ID,
      moduleId: 'cognitive-training',
      gameId: record.Game_ID,
      gameTitle: record.Game_Title,
      difficulty: record.Difficulty,
      trainingDate: record.Test_Date,
      details: {
        Session_Limit_Seconds: record.Session_Limit_Seconds,
        Target_Trials: record.Target_Trials,
        Total_Duration_Seconds: record.Total_Duration_Seconds,
        Score: record.Score,
        Accuracy_Percent: record.Accuracy_Percent,
        Moves: record.Moves,
        Attempts: record.Attempts,
        Success_Count: record.Success_Count,
        Error_Count: record.Error_Count,
        Game_Result: record.Game_Result,
        Details_JSON: record.Details_JSON,
      },
    });
    writeJsPsychData(jsPsychRef, record as unknown as Record<string, unknown>, 'Unable to write reference cognitive result to jsPsych data.');
  }, [difficulty, effectiveLimit, gameId, meta.title, reactionTrials, setPhase]);

  finishGameRef.current = finishGame;

  const startGame = useCallback(() => {
    if (!verifySelectedTrainingUser(t)) return;

    metricsRef.current = { elapsed: 0 };
    lastHudSecondRef.current = -1;
    stateRef.current = createInitialState(gameId, difficulty, reactionTrials);
    setResult(null);
    setElapsedSeconds(0);
    setHud(summarizeState(stateRef.current, 0, effectiveLimit));
    setPhase('playing');
    window.setTimeout(() => renderRef.current(), 0);
  }, [difficulty, effectiveLimit, gameId, reactionTrials, setPhase, t]);

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
    <div className={`cognitive-reference-game cognitive-reference-phase-${phase}`} style={{ '--cognitive-game-accent': COGNITIVE_ACCENT_CSS } as CSSProperties}>
      <div ref={pixiHostRef} className="cognitive-pixi-stage" />

      {phase === 'playing' && (
        <div className="cognitive-game-hud">
          <div><strong>時間</strong> {elapsedSeconds}s</div>
          <div><strong>{hud.primaryLabel}</strong> {hud.primaryValue}</div>
          <div><strong>{hud.secondaryLabel}</strong> {hud.secondaryValue}</div>
          <div><strong>{hud.tertiaryLabel}</strong> {hud.tertiaryValue}</div>
          <button className="btn btn-sm btn-secondary" onClick={pauseGame}>暫停</button>
          <button className="btn btn-sm btn-ghost" onClick={returnToMenu}>回選單</button>
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
                      <h2>測驗次數</h2>
                      <p>設定反應時間測驗要完成的點擊次數。</p>
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
                      <p>設定目標點擊訓練的總秒數。</p>
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
                      <h2>時間限制</h2>
                      <p>{sessionLimitSec === null ? '不限制訓練時間。' : `${sessionLimitSec} 秒內完成訓練。`}</p>
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
                    <h2>訓練重點</h2>
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
                <button className="btn btn-primary btn-lg config-start-btn" onClick={startGame}>開始訓練</button>
                <button className="btn btn-ghost btn-lg" onClick={onExit}>返回</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="drawing-defense-panel drawing-defense-panel-compact">
          <h1>訓練已暫停</h1>
          <p>{hud.primaryLabel} {hud.primaryValue}，已進行 {elapsedSeconds} 秒。</p>
          <div className="drawing-defense-actions">
            <button className="btn btn-primary btn-lg" onClick={resumeGame}>繼續訓練</button>
            <button className="btn btn-secondary btn-lg" onClick={restartGame}>重新開始</button>
            <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>回選單</button>
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
              <button className="btn btn-primary btn-lg" onClick={downloadResult}>下載 CSV 紀錄</button>
              <button className="btn btn-secondary btn-lg" onClick={restartGame}>再玩一次</button>
              <button className="btn btn-ghost btn-lg" onClick={returnToMenu}>回選單</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getModuleMeta(gameId: ReferenceGameId) {
  return REFERENCE_COGNITIVE_MODULES.find((module) => module.id === gameId) ?? REFERENCE_COGNITIVE_MODULES[0];
}

function createInitialState(gameId: ReferenceGameId, difficulty: Difficulty, reactionTrials: number): CognitiveGameState {
  if (gameId === 'memory-match') return createMemoryState(difficulty);
  if (gameId === 'lights-out') return createLightsState(difficulty);
  if (gameId === 'reaction-time') return createReactionState(reactionTrials);
  if (gameId === 'whack-a-mole') return createWhackState(difficulty);
  return createSlidingState(difficulty);
}

function updateTimedState(
  state: CognitiveGameState | null,
  elapsed: number,
  render: () => void,
  finishGame: (result: GameResult) => void,
) {
  if (!state) return;
  if (state.kind === 'memory-match') updateMemoryTimedState(state, elapsed, render);
  if (state.kind === 'reaction-time') updateReactionTimedState(state, elapsed, render);
  if (state.kind === 'whack-a-mole') updateWhackTimedState(state, elapsed, render);
}

function isAutoSuccess(state: CognitiveGameState | null) {
  if (!state) return false;
  if (state.kind === 'memory-match') return isMemoryAutoSuccess(state);
  if (state.kind === 'lights-out') return isLightsAutoSuccess(state);
  if (state.kind === 'reaction-time') return isReactionAutoSuccess(state);
  if (state.kind === 'whack-a-mole') return isWhackAutoSuccess(state);
  return isSlidingAutoSuccess(state);
}

function summarizeState(state: CognitiveGameState, elapsed: number, limit: SessionLimitSeconds): HudState {
  if (state.kind === 'memory-match') return summarizeMemoryState(state, elapsed, limit);
  if (state.kind === 'lights-out') return summarizeLightsState(state, elapsed, limit);
  if (state.kind === 'reaction-time') return summarizeReactionState(state, elapsed, limit);
  if (state.kind === 'whack-a-mole') return summarizeWhackState(state, elapsed, limit);
  return summarizeSlidingState(state, elapsed, limit);
}

function buildResultStats(state: CognitiveGameState): ResultStats {
  if (state.kind === 'memory-match') return buildMemoryResultStats(state);
  if (state.kind === 'lights-out') return buildLightsResultStats(state);
  if (state.kind === 'reaction-time') return buildReactionResultStats(state);
  if (state.kind === 'whack-a-mole') return buildWhackResultStats(state);
  return buildSlidingResultStats(state);
}

function formatLimit(value: SessionLimitSeconds) {
  return value === null ? '不限時' : `${value}s`;
}

function toCsv(records: SessionRecord[]): string {
  const columns: Array<{ label: string; value: (record: SessionRecord) => unknown }> = [
    { label: 'Test_Date', value: (record) => record.Test_Date },
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
