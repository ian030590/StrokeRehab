import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandFrame, TherapySettings, Vector3 } from "../types";
import { createHandFrameFromLandmarks } from "../rehab/handMetrics";

type TrackingStatus = "idle" | "loading" | "running" | "error";

interface UseHandTrackingOptions {
  settings: TherapySettings;
  onFrame: (frame: HandFrame) => void;
}

const WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export function useHandTracking({ settings, onFrame }: UseHandTrackingOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const callbackRef = useRef(onFrame);
  const settingsRef = useRef(settings);
  const previousCursorRef = useRef<Vector3>([0, 0, 0]);
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callbackRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    landmarkerRef.current?.close();
    landmarkerRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("idle");
  }, []);

  const runDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      frameRef.current = window.requestAnimationFrame(runDetectionLoop);
      return;
    }

    const result = landmarker.detectForVideo(video, performance.now());
    const landmarks = result.landmarks?.[0];

    if (landmarks) {
      const handedness = result.handednesses?.[0]?.[0];
      const frame = createHandFrameFromLandmarks(
        landmarks,
        settingsRef.current,
        previousCursorRef.current,
        Date.now(),
        handedness?.displayName,
        handedness?.score,
      );

      if (frame) {
        previousCursorRef.current = frame.cursor;
        callbackRef.current(frame);
      }
    } else {
      callbackRef.current({
        time: Date.now(),
        handPresent: false,
        cursor: previousCursorRef.current,
        pinchDistance: 1,
        isPinching: false,
        rollAngle: 0,
        source: "camera",
      });
    }

    frameRef.current = window.requestAnimationFrame(runDetectionLoop);
  }, []);

  const start = useCallback(async () => {
    if (status === "loading" || status === "running") {
      return;
    }

    try {
      setStatus("loading");
      setError(null);

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element is not ready.");
      }

      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      let landmarker: HandLandmarker;

      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HAND_MODEL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
      } catch {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HAND_MODEL,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 960 },
          height: { ideal: 540 },
          facingMode: "user",
        },
      });

      video.srcObject = stream;
      await video.play();

      landmarkerRef.current = landmarker;
      streamRef.current = stream;
      setStatus("running");
      frameRef.current = window.requestAnimationFrame(runDetectionLoop);
    } catch (caught) {
      stop();
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "MediaPipe 無法啟動。");
    }
  }, [runDetectionLoop, status, stop]);

  useEffect(() => stop, [stop]);

  return {
    videoRef,
    status,
    error,
    start,
    stop,
  };
}
