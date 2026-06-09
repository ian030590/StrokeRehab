import { useEffect, useRef, useState, useCallback } from 'react';
import { initJsPsych } from 'jspsych';
import { Application, Graphics, Text as PixiText } from 'pixi.js';
import type { BrunnstromSettings } from './types';
import { useT } from '../../../i18n';
import { getActiveUser } from '../../../utils/settings';
import { saveTrainingSessionRecord } from '../../../utils/trainingRecords';
import { formatTestDate, writeJsPsychData } from '../gameUtils';
import { useMediaPipe } from './useMediaPipe';

interface GamePhaseProps {
  settings: BrunnstromSettings;
  onExit: () => void;
}

function calculateAngle(a: {x: number, y: number}, b: {x: number, y: number}, c: {x: number, y: number}) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

export function GamePhase({ settings, onExit }: GamePhaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const jsPsychRef = useRef<ReturnType<typeof initJsPsych> | null>(null);
  const { t } = useT();

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'ENDED'>('IDLE');
  
  // MediaPipe & Webcam
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafId = useRef<number | null>(null);
  const { modelsLoaded, detect } = useMediaPipe({ pose: true, hands: settings.stage === 6 });

  // Game state refs for Pixi
  const trialsRef = useRef({ total: 5, current: 0, successful: 0 });
  const metricsRef = useRef({ startTime: 0, initiationTime: 0 });
  const promptTextRef = useRef<PixiText | null>(null);
  const circleRef = useRef<Graphics | null>(null);
  const timeoutRef = useRef<number | null>(null);
  
  // Data tracking
  const detailRowsRef = useRef<any[]>([]);
  const trialStateRef = useRef<'WAITING' | 'ACTION' | 'DONE'>('DONE');

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      stopWebcam();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [clearTimers, stopWebcam]);

  const finishGame = useCallback(() => {
    setGameState('ENDED');
    clearTimers();
    stopWebcam();
    
    // Save record
    const record: any = {
      Test_Date: formatTestDate(new Date()),
      Participant_ID: getActiveUser() || 'Unknown',
      Stage: settings.stage,
      AntiCheat: settings.antiCheat,
      Total_Trials: trialsRef.current.total,
      Successful_Trials: trialsRef.current.successful,
    };

    void saveTrainingSessionRecord({
      userName: record.Participant_ID,
      moduleId: 'motor-training',
      gameId: 'brunnstrom',
      gameTitle: t('training.brunnstrom.title'),
      difficulty: `Stage ${record.Stage}`,
      trainingDate: record.Test_Date,
      details: {
        Total_Trials: record.Total_Trials,
        Successful_Trials: record.Successful_Trials,
        AntiCheat: record.AntiCheat
      },
      detailRows: detailRowsRef.current
    });

    if (jsPsychRef.current) {
      writeJsPsychData(jsPsychRef, record, 'Unable to write brunnstrom result to jsPsych data.');
    }
  }, [settings, t, clearTimers, stopWebcam]);

  const nextTrial = useCallback(() => {
    if (trialsRef.current.current >= trialsRef.current.total) {
      finishGame();
      return;
    }

    trialsRef.current.current++;
    trialStateRef.current = 'WAITING';

    if (promptTextRef.current && circleRef.current) {
      const promptReady = t('training.brunnstrom.trialReady')
        .replace('{current}', String(trialsRef.current.current))
        .replace('{total}', String(trialsRef.current.total));
      promptTextRef.current.text = promptReady;
      promptTextRef.current.style.fill = 0xffffff;
      circleRef.current.clear().circle(0, 0, 50).fill(0x888888);
    }

    timeoutRef.current = window.setTimeout(() => {
      if (promptTextRef.current && circleRef.current) {
        promptTextRef.current.text = t('training.brunnstrom.performAction');
        promptTextRef.current.style.fill = 0xff0000;
        circleRef.current.clear().circle(0, 0, 50).fill(0xff0000);
      }
      metricsRef.current.startTime = performance.now();
      metricsRef.current.initiationTime = 0;
      trialStateRef.current = 'ACTION';
      
      // Auto-fail after 10 seconds if not achieved
      timeoutRef.current = window.setTimeout(() => {
        if (trialStateRef.current === 'ACTION') {
          trialStateRef.current = 'DONE';
          detailRowsRef.current.push({
            trial: trialsRef.current.current,
            success: false,
            initiation_time: metricsRef.current.initiationTime,
            movement_time: 10000,
            target_action: 'Elbow Flexion'
          });
          nextTrial();
        }
      }, 10000);
    }, 1500);
  }, [finishGame, t]);

  const handleSuccess = useCallback(() => {
    if (trialStateRef.current !== 'ACTION') return;
    trialStateRef.current = 'DONE';
    clearTimers(); // clear 10s auto-fail

    const moveTime = performance.now() - metricsRef.current.startTime;
    trialsRef.current.successful++;

    detailRowsRef.current.push({
      trial: trialsRef.current.current,
      success: true,
      initiation_time: metricsRef.current.initiationTime || (moveTime / 2),
      movement_time: moveTime,
      target_action: 'Elbow Flexion'
    });

    if (promptTextRef.current && circleRef.current) {
      promptTextRef.current.text = t('training.brunnstrom.great');
      promptTextRef.current.style.fill = 0x00ff00;
      circleRef.current.clear().circle(0, 0, 50).fill(0x00ff00);
    }
    timeoutRef.current = window.setTimeout(nextTrial, 1500);
  }, [clearTimers, nextTrial, t]);

  const startGame = useCallback(async () => {
    if (!containerRef.current || !modelsLoaded) return;
    jsPsychRef.current = initJsPsych();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error('Failed webcam for game:', e);
      // fallback to simulate if webcam fails, but ideally shouldn't happen if calibrated
    }

    const app = new Application();
    await app.init({ 
      resizeTo: containerRef.current,
      backgroundColor: 0x222222 
    });
    containerRef.current.appendChild(app.canvas);
    appRef.current = app;

    const w = app.screen.width;
    const h = app.screen.height;

    const text = new PixiText({
      text: t('training.brunnstrom.starting'),
      style: { fill: 0xffffff, fontSize: 36, align: 'center' }
    });
    text.anchor.set(0.5);
    text.x = w / 2;
    text.y = h / 2 - 100;
    app.stage.addChild(text);
    promptTextRef.current = text;

    const circle = new Graphics();
    circle.circle(0, 0, 50).fill(0x888888);
    circle.x = w / 2;
    circle.y = h / 2 + 50;
    app.stage.addChild(circle);
    circleRef.current = circle;

    setGameState('PLAYING');
    nextTrial();

    // Vision processing loop
    const processFrame = () => {
      if (trialStateRef.current === 'ACTION' && videoRef.current && videoRef.current.readyState === 4) {
        const poseResults = detect(videoRef.current, 'pose', performance.now());
        if (poseResults && poseResults.landmarks && poseResults.landmarks.length > 0) {
          const lm = poseResults.landmarks[0];
          const flex = calculateAngle(lm[11], lm[13], lm[15]);
          
          if (!metricsRef.current.initiationTime && flex < 160) {
            metricsRef.current.initiationTime = performance.now() - metricsRef.current.startTime;
          }

          // Very simple check: If elbow flexion reaches the threshold
          if (flex <= settings.thresholds.elbowFlexion) {
            handleSuccess();
          }
        }
      }
      rafId.current = requestAnimationFrame(processFrame);
    };
    rafId.current = requestAnimationFrame(processFrame);

  }, [nextTrial, handleSuccess, detect, modelsLoaded, settings, t]);

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      
      {gameState === 'IDLE' && (
        <div className="training-panel" style={{ margin: 'auto', textAlign: 'center' }}>
          <h2>{t('training.brunnstrom.title')}</h2>
          <p>{t('training.brunnstrom.stageDisplay').replace('{stage}', String(settings.stage))}</p>
          <button className="btn" onClick={startGame} disabled={!modelsLoaded}>
            {modelsLoaded ? t('training.startGame') : t('training.brunnstrom.loadingModels')}
          </button>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        style={{ flex: 1, display: gameState === 'PLAYING' ? 'block' : 'none' }} 
      />

      {gameState === 'ENDED' && (
        <div className="training-panel" style={{ margin: 'auto', textAlign: 'center', zIndex: 10 }}>
          <h2>{t('training.brunnstrom.completed')}</h2>
          <p>
            {t('training.brunnstrom.successfulTrials')
              .replace('{successful}', String(trialsRef.current.successful))
              .replace('{total}', String(trialsRef.current.total))}
          </p>
          <button className="btn btn-secondary" onClick={onExit} style={{ marginTop: '1rem' }}>
            {t('training.returnMenu')}
          </button>
        </div>
      )}
    </div>
  );
}
