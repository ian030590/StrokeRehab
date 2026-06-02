import { useEffect, useRef, useState } from 'react';
import { Activity, Camera } from 'lucide-react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { OneEuroFilter } from '../utils/oneEuroFilter';

const MotorTherapy = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTracking, setIsTracking] = useState(false);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  
  const filterX = useRef(new OneEuroFilter(0.5, 0.05));
  const filterY = useRef(new OneEuroFilter(0.5, 0.05));

  useEffect(() => {
    let active = true;

    const initializeMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (!active) return;

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        poseLandmarkerRef.current = poseLandmarker;
      } catch (error) {
        console.error("Error initializing MediaPipe PoseLandmarker:", error);
      }
    };

    initializeMediaPipe();

    return () => {
      active = false;
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const startTracking = async () => {
    if (!videoRef.current || !canvasRef.current || !poseLandmarkerRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setIsTracking(true);
        predictWebcam();
      };
    } catch (err) {
      console.error("Error accessing webcam: ", err);
      alert("請允許相機權限以進行動作追蹤");
    }
  };

  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !poseLandmarker || !isTracking) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawingUtils = new DrawingUtils(ctx);
    let lastVideoTime = -1;

    const renderLoop = () => {
      if (!isTracking) return;
      
      const startTimeMs = performance.now();
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const result = poseLandmarker.detectForVideo(video, startTimeMs);
        
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0];
          
          drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#ffffff', lineWidth: 2 });
          drawingUtils.drawLandmarks(landmarks, { color: '#10b981', lineWidth: 1, radius: 3 });

          const rightWrist = landmarks[16];
          if (rightWrist && rightWrist.visibility && rightWrist.visibility > 0.5) {
            const rawX = rightWrist.x * canvas.width;
            const rawY = rightWrist.y * canvas.height;
            
            const timestamp = startTimeMs / 1000.0;
            const smoothX = filterX.current.filter(rawX, timestamp);
            const smoothY = filterY.current.filter(rawY, timestamp);

            ctx.beginPath();
            ctx.arc(smoothX, smoothY, 15, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#3b82f6';
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      
      if (isTracking) {
        requestRef.current = requestAnimationFrame(renderLoop);
      }
    };

    renderLoop();
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Activity size={32} color="var(--accent-color)" />
        <h1>動作協調與本體感覺復健</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center' }}>
          系統將透過您的攝影機即時捕捉肢體動作，並使用一歐元濾波器(One Euro Filter)消除抖動雜訊，讓畫面游標平滑跟隨您的手部軌跡。
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          {!isTracking ? (
            <button className="btn btn-primary" onClick={startTracking}>
              <Camera size={20} /> 開啟相機並開始追蹤
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={stopTracking}>
              停止追蹤
            </button>
          )}
        </div>

        <div className="canvas-container" style={{ position: 'relative', width: '640px', height: '480px', margin: '0 auto' }}>
          <video 
            ref={videoRef} 
            style={{ display: 'none' }} 
            width={640} 
            height={480} 
            playsInline 
          />
          <canvas 
            ref={canvasRef} 
            width={640} 
            height={480}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          
          {!isTracking && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <Camera size={48} opacity={0.5} />
              <p>點擊上方按鈕以啟動</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MotorTherapy;
