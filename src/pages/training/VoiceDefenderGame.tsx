import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, type Ticker } from 'pixi.js';
import { initJsPsych } from 'jspsych';
import type { KaldiRecognizer, Model } from 'vosk-browser';
import { useT, type TranslationKey } from '../../i18n';
import { downloadCsvFile } from '../../utils/downloadFile';
import { getActiveUser } from '../../utils/settings';
import { saveTrainingSessionRecord } from '../../utils/trainingRecords';
import { csvCell, formatTestDate, writeJsPsychData } from './gameUtils';
import { verifySelectedTrainingUser } from './selectedUserGuard';
import type { TFunction } from './types';
import {
  createDefaultVoiceVocabulary,
  createVoiceVocabularyItem,
  loadVoiceVocabulary,
  saveVoiceVocabulary,
  type VoiceLanguage,
  type VoiceVocabularyItem,
} from './voiceDefenderVocabulary';
import { getCachedModelUrl, type CachedModelUrl } from './voskModelCache';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type GamePhase = 'editor' | 'playing' | 'paused' | 'results';
type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';
type GameResult = 'Defeat' | 'Stopped';

interface VoiceDefenderGameProps {
  onExit: () => void;
}

interface DifficultyConfig {
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  speed: number;
  spawnMinSec: number;
  spawnMaxSec: number;
}

interface Enemy {
  id: number;
  word: string;
  x: number;
  y: number;
  node: Container;
  spawnedAtSec: number;
  resultIndex: number;
}

interface EnemyResult {
  Enemy_Number: number;
  Word: string;
  Recognized_Text: string;
  Similarity_Percent: number | null;
  Reaction_Time_Seconds: number | null;
  Defeated: boolean;
}

interface SessionRecord {
  Test_Date: string;
  Participant_ID: string;
  Language: VoiceLanguage;
  Difficulty: Difficulty;
  Starting_HP: number;
  Total_Duration_Seconds: number;
  Enemies_Spawned: number;
  Enemies_Defeated: number;
  HP_Remaining: number;
  Score: number;
  Most_Difficult_Word: string;
  Game_Result: GameResult;
  Enemy_Results: EnemyResult[];
}

interface SpeechRuntime {
  stream: MediaStream;
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  mute: GainNode;
  recognizer: KaldiRecognizer;
}

const MODEL_URLS: Record<VoiceLanguage, string> = {
  zh: import.meta.env.VITE_VOSK_MODEL_ZH_URL?.trim()
    || 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-cn-0.3.tar.gz',
  en: import.meta.env.VITE_VOSK_MODEL_EN_URL?.trim()
    || 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz',
};

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  Beginner: {
    labelKey: 'voice.diff.beginner',
    descriptionKey: 'voice.diff.beginnerDesc',
    speed: 32,
    spawnMinSec: 2.8,
    spawnMaxSec: 4.2,
  },
  Intermediate: {
    labelKey: 'voice.diff.intermediate',
    descriptionKey: 'voice.diff.intermediateDesc',
    speed: 48,
    spawnMinSec: 2,
    spawnMaxSec: 3.2,
  },
  Advanced: {
    labelKey: 'voice.diff.advanced',
    descriptionKey: 'voice.diff.advancedDesc',
    speed: 66,
    spawnMinSec: 1.2,
    spawnMaxSec: 2.2,
  },
};

const HP_OPTIONS = [3, 5, 8] as const;
const DEFAULT_HP = 5;
const SIMILARITY_THRESHOLD = 0.75;
const ENEMY_WIDTH = 156;
const ENEMY_HEIGHT = 76;

export function VoiceDefenderGame({ onExit }: VoiceDefenderGameProps) {
  const { t } = useT();
  const pixiHostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const modelRef = useRef<Model | null>(null);
  const cachedModelUrlRef = useRef<CachedModelUrl | null>(null);
  const speechRuntimeRef = useRef<SpeechRuntime | null>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const enemyResultsRef = useRef<EnemyResult[]>([]);
  const wordMissesRef = useRef<Record<string, number>>({});
  const phaseRef = useRef<GamePhase>('editor');
  const loadGenerationRef = useRef(0);
  const lastRecognitionRef = useRef({ text: '', at: 0 });
  const metricsRef = useRef({
    elapsed: 0,
    hp: DEFAULT_HP,
    score: 0,
    spawned: 0,
    defeated: 0,
    spawnTimer: 0,
    nextSpawnSec: 0.5,
    nextId: 1,
  });
  const configRef = useRef({
    language: 'zh' as VoiceLanguage,
    difficulty: 'Beginner' as Difficulty,
    maxHp: DEFAULT_HP,
    activeWords: [] as string[],
  });
  const jsPsychRef = useRef<ReturnType<typeof initJsPsych> | null>(null);

  const [phase, setPhaseState] = useState<GamePhase>('editor');
  const [language, setLanguage] = useState<VoiceLanguage>('zh');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [maxHp, setMaxHp] = useState(DEFAULT_HP);
  const [vocabulary, setVocabulary] = useState<VoiceVocabularyItem[]>(loadVoiceVocabulary);
  const [newWord, setNewWord] = useState('');
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [modelProgress, setModelProgress] = useState(0);
  const [modelError, setModelError] = useState('');
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [microphoneError, setMicrophoneError] = useState('');
  const [hp, setHp] = useState(DEFAULT_HP);
  const [score, setScore] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recognizedText, setRecognizedText] = useState('');
  const [result, setResult] = useState<SessionRecord | null>(null);

  const activeConfig = DIFFICULTIES[difficulty];
  const languageVocabulary = useMemo(
    () => vocabulary.filter((item) => item.language === language),
    [language, vocabulary],
  );
  const activeWords = useMemo(
    () => languageVocabulary.filter((item) => item.isActive).map((item) => item.word),
    [languageVocabulary],
  );
  const canStart = modelStatus === 'ready' && microphoneReady && activeWords.length > 0;

  const setPhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => {
    configRef.current = { language, difficulty, maxHp, activeWords };
  }, [activeWords, difficulty, language, maxHp]);

  useEffect(() => {
    saveVoiceVocabulary(vocabulary);
  }, [vocabulary]);

  useEffect(() => {
    jsPsychRef.current = initJsPsych();
  }, []);

  const stopListening = useCallback(async () => {
    const runtime = speechRuntimeRef.current;
    speechRuntimeRef.current = null;
    if (!runtime) return;

    runtime.processor.onaudioprocess = null;
    runtime.source.disconnect();
    runtime.processor.disconnect();
    runtime.mute.disconnect();
    runtime.stream.getTracks().forEach((track) => track.stop());
    runtime.recognizer.remove();
    if (runtime.audioContext.state !== 'closed') {
      await runtime.audioContext.close().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const engineWindow = window as Window & { STT_Engine?: { stopListening: () => Promise<void> } };
    engineWindow.STT_Engine = { stopListening };
    return () => {
      delete engineWindow.STT_Engine;
    };
  }, [stopListening]);

  const loadModel = useCallback(async (targetLanguage: VoiceLanguage) => {
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    modelRef.current?.terminate();
    modelRef.current = null;
    cachedModelUrlRef.current?.revoke();
    cachedModelUrlRef.current = null;
    setModelStatus('loading');
    setModelProgress(0);
    setModelError('');

    try {
      const cachedUrl = await getCachedModelUrl(
        `voice-defender-${targetLanguage}`,
        MODEL_URLS[targetLanguage],
        (progress) => {
          if (loadGenerationRef.current === generation) {
            setModelProgress(Math.round(progress * 0.9));
          }
        },
      );
      if (loadGenerationRef.current !== generation) {
        cachedUrl.revoke();
        return;
      }
      cachedModelUrlRef.current = cachedUrl;
      setModelProgress(95);
      const { createModel } = await import('vosk-browser');
      const model = await createModel(cachedUrl.url, -1);
      if (loadGenerationRef.current !== generation) {
        model.terminate();
        cachedUrl.revoke();
        return;
      }
      modelRef.current = model;
      setModelProgress(100);
      setModelStatus('ready');
    } catch (error) {
      if (loadGenerationRef.current !== generation) return;
      console.error('Unable to load Vosk model.', error);
      setModelStatus('error');
      setModelError(error instanceof Error ? error.message : t('voice.model.error'));
    }
  }, [t]);

  useEffect(() => {
    void stopListening();
    setMicrophoneReady(false);
    setMicrophoneError('');
    void loadModel(language);
  }, [language, loadModel, stopListening]);

  useEffect(() => () => {
    loadGenerationRef.current += 1;
    void stopListening();
    modelRef.current?.terminate();
    cachedModelUrlRef.current?.revoke();
    enemiesRef.current.forEach((enemy) => enemy.node.destroy({ children: true }));
    enemiesRef.current = [];
  }, [stopListening]);

  const testMicrophone = useCallback(async () => {
    setMicrophoneError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneReady(true);
    } catch (error) {
      console.warn('Microphone permission was not granted.', error);
      setMicrophoneReady(false);
      setMicrophoneError(t('voice.microphone.denied'));
    }
  }, [t]);

  const clearEnemies = useCallback(() => {
    enemiesRef.current.forEach((enemy) => enemy.node.destroy({ children: true }));
    enemiesRef.current = [];
  }, []);

  const drawStage = useCallback((app: Application) => {
    app.stage.removeChildren();
    const width = app.renderer.width;
    const height = app.renderer.height;
    const background = new Graphics();
    background.rect(0, 0, width, height).fill({ color: 0x07152b });
    const grid = new Graphics();
    for (let y = 70; y < height; y += 70) {
      grid.moveTo(0, y).lineTo(width, y);
    }
    grid.stroke({ color: 0x1c3e66, width: 1, alpha: 0.32 });
    const defense = new Graphics();
    defense.rect(0, height - 92, width, 92).fill({ color: 0x0a2d4e, alpha: 0.96 });
    defense.rect(0, height - 96, width, 5).fill({ color: 0x38bdf8 });
    app.stage.addChild(background, grid, defense);
  }, []);

  const createHitEffect = useCallback((x: number, y: number) => {
    const app = appRef.current;
    if (!app) return;
    const effect = new Graphics();
    effect.circle(0, 0, 18).stroke({ color: 0x67e8f9, width: 5, alpha: 1 });
    effect.x = x;
    effect.y = y;
    app.stage.addChild(effect);
    let elapsed = 0;
    const animate = (ticker: Ticker) => {
      elapsed += ticker.deltaMS;
      const progress = Math.min(1, elapsed / 260);
      effect.scale.set(1 + progress * 2.2);
      effect.alpha = 1 - progress;
      if (progress >= 1) {
        app.ticker.remove(animate);
        effect.destroy();
      }
    };
    app.ticker.add(animate);
  }, []);

  const recordEnemyOutcome = useCallback((
    enemy: Enemy,
    defeatedEnemy: boolean,
    transcript = '',
    similarity: number | null = null,
  ) => {
    const outcome = enemyResultsRef.current[enemy.resultIndex];
    if (!outcome || outcome.Reaction_Time_Seconds !== null) return;
    outcome.Recognized_Text = transcript;
    outcome.Similarity_Percent = similarity === null ? null : Math.round(similarity * 100);
    outcome.Reaction_Time_Seconds = Number((metricsRef.current.elapsed - enemy.spawnedAtSec).toFixed(2));
    outcome.Defeated = defeatedEnemy;
  }, []);

  const finishGame = useCallback((gameResult: GameResult) => {
    if (phaseRef.current === 'results') return;
    void stopListening();
    enemiesRef.current.forEach((enemy) => recordEnemyOutcome(enemy, false));
    clearEnemies();
    const metrics = metricsRef.current;
    const troubleWord = getMostDifficultWord(wordMissesRef.current);
    const record: SessionRecord = {
      Test_Date: formatTestDate(new Date()),
      Participant_ID: getActiveUser() || 'Unknown',
      Language: configRef.current.language,
      Difficulty: configRef.current.difficulty,
      Starting_HP: configRef.current.maxHp,
      Total_Duration_Seconds: Number(metrics.elapsed.toFixed(1)),
      Enemies_Spawned: metrics.spawned,
      Enemies_Defeated: metrics.defeated,
      HP_Remaining: metrics.hp,
      Score: metrics.score,
      Most_Difficult_Word: troubleWord,
      Game_Result: gameResult,
      Enemy_Results: enemyResultsRef.current.map((item) => ({ ...item })),
    };
    setResult(record);
    setPhase('results');
    saveTrainingSessionRecord({
      userName: record.Participant_ID,
      moduleId: 'speech-training',
      gameId: 'voice-defender',
      gameTitle: t('voice.title'),
      difficulty: record.Difficulty,
      trainingDate: record.Test_Date,
      details: {
        Language: record.Language,
        Starting_HP: record.Starting_HP,
        Total_Duration_Seconds: record.Total_Duration_Seconds,
        Enemies_Spawned: record.Enemies_Spawned,
        Enemies_Defeated: record.Enemies_Defeated,
        HP_Remaining: record.HP_Remaining,
        Score: record.Score,
        Most_Difficult_Word: record.Most_Difficult_Word,
        Game_Result: record.Game_Result,
      },
      detailRows: record.Enemy_Results.map((item) => ({ ...item }) as Record<string, unknown>),
    });
    writeJsPsychData(
      jsPsychRef,
      record as unknown as Record<string, unknown>,
      'Unable to write voice defender result to jsPsych data.',
    );
  }, [clearEnemies, recordEnemyOutcome, setPhase, stopListening, t]);

  const handleRecognition = useCallback((transcript: string) => {
    if (phaseRef.current !== 'playing') return;
    const normalizedTranscript = normalizeSpeechText(transcript);
    if (!normalizedTranscript) return;
    setRecognizedText(transcript);

    const now = performance.now();
    if (
      lastRecognitionRef.current.text === normalizedTranscript
      && now - lastRecognitionRef.current.at < 650
    ) {
      return;
    }

    const matched = enemiesRef.current
      .map((enemy) => ({
        enemy,
        similarity: calculateSimilarity(normalizedTranscript, normalizeSpeechText(enemy.word)),
      }))
      .filter((candidate) => candidate.similarity > SIMILARITY_THRESHOLD)
      .sort((a, b) => b.enemy.y - a.enemy.y || b.similarity - a.similarity)[0];

    if (!matched) return;
    lastRecognitionRef.current = { text: normalizedTranscript, at: now };
    recordEnemyOutcome(matched.enemy, true, transcript, matched.similarity);
    createHitEffect(matched.enemy.x, matched.enemy.y);
    matched.enemy.node.destroy({ children: true });
    enemiesRef.current = enemiesRef.current.filter((enemy) => enemy.id !== matched.enemy.id);
    metricsRef.current.defeated += 1;
    metricsRef.current.score += Math.max(10, Math.round(100 * matched.similarity));
    setScore(metricsRef.current.score);
  }, [createHitEffect, recordEnemyOutcome]);

  const startListening = useCallback(async () => {
    const model = modelRef.current;
    if (!model) throw new Error(t('voice.model.notReady'));
    await stopListening();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    const audioContext = new AudioContext();
    await audioContext.resume();
    const grammar = JSON.stringify(['[unk]', ...configRef.current.activeWords]);
    const recognizer = new model.KaldiRecognizer(audioContext.sampleRate, grammar);
    recognizer.on('partialresult', (message) => {
      if ('result' in message && 'partial' in message.result) {
        handleRecognition(message.result.partial);
      }
    });
    recognizer.on('result', (message) => {
      if ('result' in message && 'text' in message.result) {
        handleRecognition(message.result.text);
      }
    });
    recognizer.on('error', (message) => {
      if (!('error' in message)) return;
      console.error('Vosk recognizer error.', message.error);
      setMicrophoneError(message.error);
    });

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const mute = audioContext.createGain();
    mute.gain.value = 0;
    processor.onaudioprocess = (event) => {
      try {
        recognizer.acceptWaveform(event.inputBuffer);
      } catch (error) {
        console.warn('Unable to process microphone audio.', error);
      }
    };
    source.connect(processor);
    processor.connect(mute);
    mute.connect(audioContext.destination);
    speechRuntimeRef.current = { stream, audioContext, source, processor, mute, recognizer };
  }, [handleRecognition, stopListening, t]);

  const spawnEnemy = useCallback((app: Application) => {
    const words = configRef.current.activeWords;
    if (words.length === 0) return;
    const word = words[Math.floor(Math.random() * words.length)];
    const enemyNumber = metricsRef.current.spawned + 1;
    const resultIndex = enemyResultsRef.current.length;
    const x = ENEMY_WIDTH / 2 + 20 + Math.random() * Math.max(1, app.renderer.width - ENEMY_WIDTH - 40);
    const node = new Container();
    const body = new Graphics();
    body.roundRect(-ENEMY_WIDTH / 2, -ENEMY_HEIGHT / 2, ENEMY_WIDTH, ENEMY_HEIGHT, 18)
      .fill({ color: 0xf8fafc })
      .stroke({ color: 0x38bdf8, width: 3 });
    const eyeLeft = new Graphics().circle(-43, -8, 5).fill(0x0f172a);
    const eyeRight = new Graphics().circle(43, -8, 5).fill(0x0f172a);
    const label = new Text({
      text: word,
      style: {
        fill: 0x0f172a,
        fontFamily: 'Arial, sans-serif',
        fontSize: word.length > 10 ? 19 : 24,
        fontWeight: '700',
        align: 'center',
      },
    });
    label.anchor.set(0.5);
    label.y = 14;
    node.addChild(body, eyeLeft, eyeRight, label);
    node.x = x;
    node.y = -ENEMY_HEIGHT;
    app.stage.addChild(node);

    const enemy: Enemy = {
      id: metricsRef.current.nextId++,
      word,
      x,
      y: -ENEMY_HEIGHT,
      node,
      spawnedAtSec: metricsRef.current.elapsed,
      resultIndex,
    };
    enemiesRef.current.push(enemy);
    enemyResultsRef.current.push({
      Enemy_Number: enemyNumber,
      Word: word,
      Recognized_Text: '',
      Similarity_Percent: null,
      Reaction_Time_Seconds: null,
      Defeated: false,
    });
    metricsRef.current.spawned += 1;
  }, []);

  const startGame = useCallback(async () => {
    if (!verifySelectedTrainingUser(t) || !canStart) return;
    const app = appRef.current;
    if (!app) return;

    setMicrophoneError('');
    configRef.current = { language, difficulty, maxHp, activeWords };
    try {
      await startListening();
    } catch (error) {
      console.error('Unable to start voice recognition.', error);
      setMicrophoneError(error instanceof Error ? error.message : t('voice.microphone.denied'));
      return;
    }

    clearEnemies();
    drawStage(app);
    metricsRef.current = {
      elapsed: 0,
      hp: maxHp,
      score: 0,
      spawned: 0,
      defeated: 0,
      spawnTimer: 0,
      nextSpawnSec: 0.3,
      nextId: 1,
    };
    enemyResultsRef.current = [];
    wordMissesRef.current = {};
    lastRecognitionRef.current = { text: '', at: 0 };
    setHp(maxHp);
    setScore(0);
    setElapsedSeconds(0);
    setRecognizedText('');
    setResult(null);
    setPhase('playing');
  }, [
    activeWords,
    canStart,
    clearEnemies,
    difficulty,
    drawStage,
    language,
    maxHp,
    setPhase,
    startListening,
    t,
  ]);

  const returnToEditor = useCallback(() => {
    void stopListening();
    clearEnemies();
    const app = appRef.current;
    if (app) drawStage(app);
    setPhase('editor');
  }, [clearEnemies, drawStage, setPhase, stopListening]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    setPhase('paused');
    void stopListening();
  }, [setPhase, stopListening]);

  const resumeGame = useCallback(async () => {
    if (phaseRef.current !== 'paused') return;
    try {
      await startListening();
      setPhase('playing');
    } catch (error) {
      console.error('Unable to resume voice recognition.', error);
      setMicrophoneError(error instanceof Error ? error.message : t('voice.microphone.denied'));
      returnToEditor();
    }
  }, [returnToEditor, setPhase, startListening, t]);

  const handleExit = useCallback(() => {
    void stopListening();
    onExit();
  }, [onExit, stopListening]);

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    appRef.current = app;

    const init = async () => {
      const host = pixiHostRef.current;
      if (!host) return;
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        resizeTo: host,
      });
      if (cancelled) return;
      host.appendChild(app.canvas);
      app.canvas.className = 'voice-defender-canvas';
      drawStage(app);
      app.ticker.add((ticker: Ticker) => {
        if (phaseRef.current !== 'playing') return;
        const dt = Math.min(ticker.deltaMS / 1000, 0.05);
        const metrics = metricsRef.current;
        const config = DIFFICULTIES[configRef.current.difficulty];
        metrics.elapsed += dt;
        metrics.spawnTimer += dt;
        const nextElapsed = Math.floor(metrics.elapsed);
        setElapsedSeconds((current) => current === nextElapsed ? current : nextElapsed);

        if (metrics.spawnTimer >= metrics.nextSpawnSec) {
          metrics.spawnTimer = 0;
          metrics.nextSpawnSec = randomBetween(config.spawnMinSec, config.spawnMaxSec);
          spawnEnemy(app);
        }

        const defenseY = app.renderer.height - 96;
        for (const enemy of [...enemiesRef.current]) {
          enemy.y += config.speed * dt;
          enemy.node.y = enemy.y;
          if (enemy.y + ENEMY_HEIGHT / 2 < defenseY) continue;
          recordEnemyOutcome(enemy, false);
          enemy.node.destroy({ children: true });
          enemiesRef.current = enemiesRef.current.filter((item) => item.id !== enemy.id);
          wordMissesRef.current[enemy.word] = (wordMissesRef.current[enemy.word] ?? 0) + 1;
          metrics.hp = Math.max(0, metrics.hp - 1);
          setHp(metrics.hp);
        }

        if (metrics.hp <= 0) finishGame('Defeat');
      });
    };

    void init();
    return () => {
      cancelled = true;
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, [drawStage, finishGame, recordEnemyOutcome, spawnEnemy]);

  const updateVocabulary = useCallback((updater: (items: VoiceVocabularyItem[]) => VoiceVocabularyItem[]) => {
    setVocabulary((current) => updater(current));
  }, []);

  const addWord = useCallback((event: FormEvent) => {
    event.preventDefault();
    const word = newWord.trim();
    if (!word) return;
    const normalized = normalizeSpeechText(word);
    if (vocabulary.some((item) => item.language === language && normalizeSpeechText(item.word) === normalized)) {
      setNewWord('');
      return;
    }
    updateVocabulary((items) => [...items, createVoiceVocabularyItem(word, language)]);
    setNewWord('');
  }, [language, newWord, updateVocabulary, vocabulary]);

  const downloadResult = useCallback(() => {
    if (!result) return;
    downloadCsvFile(toCsv(result), `voice_defender_${Date.now()}.csv`);
  }, [result]);

  return (
    <div className={`voice-defender voice-defender-phase-${phase}`}>
      <div ref={pixiHostRef} className="voice-defender-stage" />

      {phase === 'editor' && (
        <div className="training-panel">
          <div className="training-config voice-defender-config">
            <header className="training-config-header">
              <div>
                <span className="training-config-label">{t('voice.configLabel')}</span>
                <h1>{t('voice.title')}</h1>
              </div>
              <div className={`voice-model-status voice-model-status-${modelStatus}`}>
                <span>{getModelStatusText(modelStatus, modelProgress, t)}</span>
                <progress max="100" value={modelProgress} />
              </div>
            </header>

            <div className="training-config-body voice-defender-config-body">
              <section className="training-setting training-setting-wide">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('voice.config.language')}</h2>
                    <p>{t('voice.config.languageDesc')}</p>
                  </div>
                  <span>{t(language === 'zh' ? 'voice.language.zh' : 'voice.language.en')}</span>
                </div>
                <div className="training-option-grid training-option-grid-three">
                  {(['zh', 'en'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`training-option ${language === option ? 'active' : ''}`}
                      onClick={() => setLanguage(option)}
                    >
                      <span className="training-option-title">
                        {t(option === 'zh' ? 'voice.language.zh' : 'voice.language.en')}
                      </span>
                      <span className="training-option-meta">
                        {t(option === 'zh' ? 'voice.language.zhModel' : 'voice.language.enModel')}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="training-option"
                    onClick={() => void loadModel(language)}
                  >
                    <span className="training-option-title">{t('voice.model.reload')}</span>
                    <span className="training-option-meta">{modelError || t('voice.model.cacheHint')}</span>
                  </button>
                </div>
              </section>

              <section className="training-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('cognitive.config.difficulty')}</h2>
                    <p>{t(activeConfig.descriptionKey)}</p>
                  </div>
                  <span>{t(activeConfig.labelKey)}</span>
                </div>
                <div className="training-option-grid training-option-grid-three">
                  {Object.entries(DIFFICULTIES).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      className={`training-option ${difficulty === key ? 'active' : ''}`}
                      onClick={() => setDifficulty(key as Difficulty)}
                    >
                      <span className="training-option-title">{t(value.labelKey)}</span>
                      <span className="training-option-meta">{t(value.descriptionKey)}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="training-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('voice.config.hp')}</h2>
                    <p>{t('voice.config.hpDesc')}</p>
                  </div>
                  <span>{maxHp}</span>
                </div>
                <div className="training-option-grid training-option-grid-three">
                  {HP_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`training-option ${maxHp === option ? 'active' : ''}`}
                      onClick={() => setMaxHp(option)}
                    >
                      <span className="training-option-title">{t('voice.hpValue', { value: option })}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="training-setting training-setting-wide voice-vocabulary-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('voice.vocabulary.title')}</h2>
                    <p>{t('voice.vocabulary.desc')}</p>
                  </div>
                  <span>{t('voice.vocabulary.activeCount', { active: activeWords.length, total: languageVocabulary.length })}</span>
                </div>
                <div className="voice-vocabulary-editor">
                  <div className="voice-vocabulary-list">
                    {languageVocabulary.length === 0 ? (
                      <p className="voice-vocabulary-empty">{t('voice.vocabulary.empty')}</p>
                    ) : languageVocabulary.map((item) => (
                      <div className={`voice-vocabulary-row ${item.isActive ? 'active' : ''}`} key={item.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={item.isActive}
                            onChange={() => updateVocabulary((items) => items.map((candidate) => (
                              candidate.id === item.id
                                ? { ...candidate, isActive: !candidate.isActive }
                                : candidate
                            )))}
                          />
                          <span>{item.word}</span>
                        </label>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => updateVocabulary((items) => items.filter((candidate) => candidate.id !== item.id))}
                        >
                          {t('voice.vocabulary.delete')}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="voice-vocabulary-tools">
                    <form onSubmit={addWord}>
                      <label htmlFor="voice-new-word">{t('voice.vocabulary.add')}</label>
                      <input
                        id="voice-new-word"
                        value={newWord}
                        onChange={(event) => setNewWord(event.target.value)}
                        placeholder={t('voice.vocabulary.placeholder')}
                      />
                      <button className="btn btn-primary" type="submit">{t('voice.vocabulary.addButton')}</button>
                    </form>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => updateVocabulary((items) => items.map((item) => (
                        item.language === language ? { ...item, isActive: true } : item
                      )))}
                    >
                      {t('voice.vocabulary.enableAll')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => updateVocabulary((items) => items.filter((item) => item.language !== language))}
                    >
                      {t('voice.vocabulary.clear')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setVocabulary(createDefaultVoiceVocabulary())}
                    >
                      {t('voice.vocabulary.reset')}
                    </button>
                  </div>
                </div>
              </section>

              <section className="training-setting training-setting-wide voice-microphone-setting">
                <div className="training-setting-header">
                  <div>
                    <h2>{t('voice.microphone.title')}</h2>
                    <p>{microphoneError || t('voice.microphone.desc')}</p>
                  </div>
                  <span>{microphoneReady ? t('voice.microphone.ready') : t('voice.microphone.pending')}</span>
                </div>
                <button className="btn btn-secondary" type="button" onClick={() => void testMicrophone()}>
                  {t('voice.microphone.test')}
                </button>
              </section>
            </div>

            <div className="training-config-footer">
              <div className="training-config-summary">
                <strong>{t(activeConfig.labelKey)}</strong>
                <span>{t(language === 'zh' ? 'voice.language.zh' : 'voice.language.en')}</span>
                <span>{t('voice.vocabulary.activeCount', { active: activeWords.length, total: languageVocabulary.length })}</span>
              </div>
              <div className="training-config-actions">
                <button
                  className="btn btn-primary btn-lg config-start-btn"
                  disabled={!canStart}
                  onClick={() => void startGame()}
                >
                  {t('training.startGame')}
                </button>
                <button className="btn btn-ghost btn-lg" onClick={handleExit}>{t('training.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(phase === 'playing' || phase === 'paused') && (
        <div className="voice-defender-hud">
          <div><strong>{t('voice.hud.hp')}</strong> {hp}/{maxHp}</div>
          <div><strong>{t('voice.hud.score')}</strong> {score}</div>
          <div><strong>{t('voice.hud.time')}</strong> {elapsedSeconds}s</div>
          {phase === 'playing' && (
            <div className="voice-listening-indicator">
              <span aria-hidden="true" />
              <strong>{t('voice.hud.listening')}</strong>
            </div>
          )}
          <div><strong>{t('voice.hud.heard')}</strong> {recognizedText || '-'}</div>
          {phase === 'playing' && (
            <button className="btn btn-sm btn-secondary" onClick={pauseGame}>{t('training.pause')}</button>
          )}
          <button className="btn btn-sm btn-ghost" onClick={() => finishGame('Stopped')}>{t('voice.finish')}</button>
        </div>
      )}

      {phase === 'paused' && (
        <div className="training-panel training-panel-compact">
          <h1>{t('voice.pause.title')}</h1>
          <p>{t('voice.pause.desc')}</p>
          <div className="training-actions">
            <button className="btn btn-primary btn-lg" onClick={() => void resumeGame()}>{t('training.continueGame')}</button>
            <button className="btn btn-ghost btn-lg" onClick={returnToEditor}>{t('training.returnSettings')}</button>
          </div>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="experiment-container voice-defender-results-container" style={{ overflowY: 'auto' }}>
          <div className="experiment-results">
            <h1>{t('voice.results.title')}</h1>
            <div className="training-result-summary">
              <span><small>{t('voice.results.survival')}</small><strong>{result.Total_Duration_Seconds}s</strong></span>
              <span><small>{t('voice.results.defeated')}</small><strong>{result.Enemies_Defeated}</strong></span>
              <span><small>{t('voice.results.score')}</small><strong>{result.Score}</strong></span>
              <span><small>{t('voice.results.trouble')}</small><strong>{result.Most_Difficult_Word || '-'}</strong></span>
            </div>
            <table className="results-table">
              <tbody>
                <tr><th>{t('voice.results.language')}</th><td>{t(result.Language === 'zh' ? 'voice.language.zh' : 'voice.language.en')}</td></tr>
                <tr><th>{t('voice.results.spawned')}</th><td>{result.Enemies_Spawned}</td></tr>
                <tr><th>{t('voice.results.hp')}</th><td>{result.HP_Remaining}/{result.Starting_HP}</td></tr>
              </tbody>
            </table>
            <div className="results-actions">
              <button className="btn btn-primary btn-lg" onClick={() => void startGame()}>{t('voice.results.playAgain')}</button>
              <button className="btn btn-secondary btn-lg" onClick={returnToEditor}>{t('voice.results.back')}</button>
              <button className="btn btn-secondary btn-lg" onClick={downloadResult}>{t('exp.downloadCsv')}</button>
              <button className="btn btn-ghost btn-lg" onClick={handleExit}>{t('training.returnMenu')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getModelStatusText(status: ModelStatus, progress: number, t: TFunction): string {
  if (status === 'ready') return t('voice.model.ready');
  if (status === 'error') return t('voice.model.error');
  if (status === 'loading') return t('voice.model.loading', { value: progress });
  return t('voice.model.waiting');
}

function normalizeSpeechText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return [...b].length;
  if (!b) return [...a].length;
  const left = [...a];
  const right = [...b];
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  left.forEach((leftChar, leftIndex) => {
    const current = [leftIndex + 1];
    right.forEach((rightChar, rightIndex) => {
      current[rightIndex + 1] = Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + (leftChar === rightChar ? 0 : 1),
      );
    });
    previous = current;
  });

  return previous[right.length];
}

export function calculateSimilarity(a: string, b: string): number {
  const maxLength = Math.max([...a].length, [...b].length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLength;
}

function getMostDifficultWord(misses: Record<string, number>): string {
  return Object.entries(misses).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function toCsv(record: SessionRecord): string {
  const columns = [
    'Test_Date',
    'Participant_ID',
    'Language',
    'Difficulty',
    'Starting_HP',
    'Total_Duration_Seconds',
    'Enemies_Spawned',
    'Enemies_Defeated',
    'HP_Remaining',
    'Score',
    'Most_Difficult_Word',
    'Game_Result',
    'Enemy_Number',
    'Word',
    'Recognized_Text',
    'Similarity_Percent',
    'Reaction_Time_Seconds',
    'Defeated',
  ];
  const outcomes = record.Enemy_Results.length > 0 ? record.Enemy_Results : [null];
  const rows = outcomes.map((outcome) => [
    record.Test_Date,
    record.Participant_ID,
    record.Language,
    record.Difficulty,
    record.Starting_HP,
    record.Total_Duration_Seconds,
    record.Enemies_Spawned,
    record.Enemies_Defeated,
    record.HP_Remaining,
    record.Score,
    record.Most_Difficult_Word,
    record.Game_Result,
    outcome?.Enemy_Number,
    outcome?.Word,
    outcome?.Recognized_Text,
    outcome?.Similarity_Percent,
    outcome?.Reaction_Time_Seconds,
    outcome?.Defeated,
  ]);
  return [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
