import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

export type DetectionMode = 'pose' | 'hands';

interface MediaPipeOptions {
  pose?: boolean;
  hands?: boolean;
}

export function useMediaPipe({ pose = true, hands = false }: MediaPipeOptions = {}) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const poseRef = useRef<PoseLandmarker | null>(null);
  const handRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        const tasks: Promise<void>[] = [];

        if (pose && !poseRef.current) {
          tasks.push(
            PoseLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
                delegate: 'CPU'
              },
              runningMode: 'VIDEO',
              numPoses: 1
            }).then(model => {
              if (active) poseRef.current = model;
              else model.close();
            })
          );
        }

        if (hands && !handRef.current) {
          tasks.push(
            HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
                delegate: 'CPU'
              },
              runningMode: 'VIDEO',
              numHands: 1
            }).then(model => {
              if (active) handRef.current = model;
              else model.close();
            })
          );
        }

        await Promise.all(tasks);

        if (active) {
          setModelsLoaded(true);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load MediaPipe models:', err);
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    
    init();
    
    return () => {
      active = false;
      try {
        if (poseRef.current) poseRef.current.close();
        if (handRef.current) handRef.current.close();
      } catch(e) {
        // ignore
      }
    };
  }, [pose, hands]);

  const detect = useCallback((video: HTMLVideoElement, mode: DetectionMode, timestamp: number) => {
    if (mode === 'pose' && poseRef.current) {
      return poseRef.current.detectForVideo(video, timestamp);
    }
    if (mode === 'hands' && handRef.current) {
      return handRef.current.detectForVideo(video, timestamp);
    }
    return null;
  }, []);

  return { modelsLoaded, loadError, detect };
}
