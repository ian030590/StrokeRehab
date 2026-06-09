import { useState, useEffect, useRef, useCallback } from 'react';
import { useT } from '../../../i18n';
import type { BrunnstromSettings } from './types';
import { useMediaPipe } from './useMediaPipe';

interface CalibrationPhaseProps {
  onComplete: (settings: BrunnstromSettings) => void;
}

function calculateAngle(a: {x: number, y: number}, b: {x: number, y: number}, c: {x: number, y: number}) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

export function CalibrationPhase({ onComplete }: CalibrationPhaseProps) {
  const { t } = useT();
  const [calStep, setCalStep] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafId = useRef<number | null>(null);

  // During auto-calibration, we only need pose to detect basic arm movements.
  // Stage 6 (hand) can be inferred if arm movements are extremely good, or set manually.
  const { modelsLoaded, loadError, detect } = useMediaPipe({ pose: true, hands: false });
  
  const [status, setStatus] = useState<string>('initializing');
  const [timeLeft, setTimeLeft] = useState(5);
  const [webcamError, setWebcamError] = useState(false);

  // Manual Override states
  const [stage, setStage] = useState<3 | 4 | 5 | 6>(3);
  const [elbowFlexion, setElbowFlexion] = useState(130);
  const [elbowExtension, setElbowExtension] = useState(20);
  const [shoulderFlexion, setShoulderFlexion] = useState(90);
  const [gripDistance, setGripDistance] = useState(0.1);
  const [antiCheat, setAntiCheat] = useState(true);

  // Auto Calibration Peaks
  const peaksRef = useRef({
    elbowFlexion: 0,
    elbowExtension: 180,
    shoulderFlexion: 0,
    gripDistance: 0,
    framesDetected: 0
  });

  const stopWebcam = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('capturing');
        
        let lastTime = performance.now();
        let secondsPassed = 0;
        peaksRef.current = { elbowFlexion: 0, elbowExtension: 180, shoulderFlexion: 0, gripDistance: 0, framesDetected: 0 };

        const processFrame = (timestamp: number) => {
          if (!videoRef.current || !canvasRef.current) return;
          
          if (timestamp - lastTime >= 1000) {
            secondsPassed++;
            lastTime = timestamp;
            setTimeLeft(Math.max(0, 5 - secondsPassed));
          }

          if (secondsPassed >= 5) {
            stopWebcam();
            
            // Analyze captured data
            const frames = peaksRef.current.framesDetected;
            let recommendedStage: 3 | 4 | 5 | 6 = 3;
            let finalElbowFlexion = 130;
            let finalElbowExtension = 20;
            let finalShoulderFlexion = 90;
            let finalGripDistance = 0.1;

            if (frames > 10) {
              // Valid detection occurred
              finalElbowFlexion = Math.round(peaksRef.current.elbowFlexion);
              finalElbowExtension = Math.round(peaksRef.current.elbowExtension);
              finalShoulderFlexion = Math.round(peaksRef.current.shoulderFlexion);
              
              // Stage heuristics
              if (finalShoulderFlexion > 90 && finalElbowExtension < 30) {
                // Good shoulder flexion and can almost fully extend elbow
                recommendedStage = 5;
              } else if (finalElbowFlexion > 90 || finalElbowExtension < 60) {
                // Can flex elbow reasonably well or extend partially
                recommendedStage = 4;
              } else {
                // Synergy movements only
                recommendedStage = 3;
              }
            }
            
            setStage(recommendedStage);
            setElbowFlexion(finalElbowFlexion);
            setElbowExtension(finalElbowExtension);
            setShoulderFlexion(finalShoulderFlexion);
            setGripDistance(finalGripDistance);
            setCalStep('MANUAL');
            return;
          }

          // Detect
          const poseResults = detect(videoRef.current, 'pose', performance.now());
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            if (poseResults && poseResults.landmarks && poseResults.landmarks.length > 0) {
              peaksRef.current.framesDetected++;
              const lm = poseResults.landmarks[0];
              // Calculate angles (using left arm 11-13-15 for simplicity here)
              const flex = calculateAngle(lm[11], lm[13], lm[15]);
              const shoulder = calculateAngle({x: lm[11].x, y: lm[11].y + 1}, lm[11], lm[13]);
              
              peaksRef.current.elbowFlexion = Math.max(peaksRef.current.elbowFlexion, flex);
              peaksRef.current.elbowExtension = Math.min(peaksRef.current.elbowExtension, flex);
              peaksRef.current.shoulderFlexion = Math.max(peaksRef.current.shoulderFlexion, shoulder);
              
              // Draw
              ctx.fillStyle = 'red';
              for (const pt of lm) {
                ctx.beginPath();
                ctx.arc(pt.x * canvasRef.current.width, pt.y * canvasRef.current.height, 4, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
          }
          rafId.current = requestAnimationFrame(processFrame);
        };
        rafId.current = requestAnimationFrame(processFrame);
      }
    } catch (err) {
      console.error(err);
      setWebcamError(true);
      setStatus('error');
    }
  }, [detect, stopWebcam]);

  useEffect(() => {
    if (modelsLoaded && calStep === 'AUTO' && status === 'initializing') {
      startWebcam();
    }
  }, [modelsLoaded, calStep, status, startWebcam]);

  if (calStep === 'AUTO') {
    return (
      <div className="training-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          {t('training.brunnstrom.autoCalTitle')}
        </h2>
        
        {loadError && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>
            {loadError}
          </div>
        )}
        
        {webcamError && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>
            {t('training.brunnstrom.webcamFailed')}
            <button className="btn btn-sm btn-secondary" onClick={() => setCalStep('MANUAL')} style={{ marginLeft: '1rem' }}>
              {t('training.brunnstrom.skipToManual')}
            </button>
          </div>
        )}

        {!modelsLoaded && !loadError && (
          <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #005EB8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div>{t('training.brunnstrom.loadingModels')}</div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {modelsLoaded && status === 'capturing' && (
          <>
            <p style={{ marginBottom: '1rem' }}>
              {t('training.brunnstrom.capturingPeaks').replace('{seconds}', String(timeLeft))}
            </p>
            <div style={{ position: 'relative', width: '100%', maxWidth: '640px', aspectRatio: '4/3', backgroundColor: '#000', margin: '0 auto', borderRadius: '8px', overflow: 'hidden' }}>
              <video ref={videoRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef} width={640} height={480} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="training-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="training-config-header" style={{ marginBottom: '1.5rem' }}>
        <span className="training-config-label">{t('training.brunnstrom.manualCalTitle')}</span>
      </header>
      
      <div className="training-config-body">
        <section className="training-setting">
          <div className="training-setting-header">
            <span className="training-setting-title">{t('training.brunnstrom.stage')}</span>
          </div>
          <select 
            value={stage}
            onChange={(e) => setStage(Number(e.target.value) as 3 | 4 | 5 | 6)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {[3, 4, 5, 6].map(s => (
              <option key={s} value={s}>{t('training.brunnstrom.stageOption').replace('{stage}', String(s))}</option>
            ))}
          </select>
        </section>

        <section className="training-setting">
          <div className="training-setting-header">
            <span className="training-setting-title">
              {t('training.brunnstrom.elbowFlexionThreshold')} ({elbowFlexion}°)
            </span>
            <span className="training-setting-desc">{t('training.brunnstrom.minDegrees').replace('{min}', '30')}</span>
          </div>
          <input 
            type="range" min="30" max="180" 
            value={elbowFlexion}
            onChange={(e) => setElbowFlexion(Number(e.target.value))}
            className="training-slider"
            style={{ width: '100%' }}
          />
        </section>

        <section className="training-setting">
          <div className="training-setting-header">
            <span className="training-setting-title">{t('training.brunnstrom.elbowExtensionThreshold')} ({elbowExtension}°)</span>
          </div>
          <input 
            type="range" min="0" max="180" 
            value={elbowExtension}
            onChange={(e) => setElbowExtension(Number(e.target.value))}
            className="training-slider"
            style={{ width: '100%' }}
          />
        </section>

        <section className="training-setting">
          <div className="training-setting-header">
            <span className="training-setting-title">{t('training.brunnstrom.shoulderFlexionThreshold')} ({shoulderFlexion}°)</span>
          </div>
          <input 
            type="range" min="0" max="180" 
            value={shoulderFlexion}
            onChange={(e) => setShoulderFlexion(Number(e.target.value))}
            className="training-slider"
            style={{ width: '100%' }}
          />
        </section>

        <section className="training-setting">
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              checked={antiCheat}
              onChange={(e) => setAntiCheat(e.target.checked)}
            />
            <span className="training-setting-title">{t('training.brunnstrom.antiCheat')}</span>
          </label>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setCalStep('AUTO');
              setTimeLeft(5);
              setStatus('initializing');
            }}
          >
            {t('training.brunnstrom.retryAutoCal')}
          </button>
          <button 
            className="btn"
            onClick={() => onComplete({
              stage,
              antiCheat,
              thresholds: { elbowFlexion, elbowExtension, shoulderFlexion, gripDistance }
            })}
          >
            {t('btn.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
