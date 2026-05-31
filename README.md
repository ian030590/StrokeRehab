# StrokeRehab

A web-based rehabilitation program for stroke, brain injury, or neurodegenerative cognitive diseases.

## Café Barista

This repo currently implements the Café Barista upper-limb hand movement rehabilitation game:

- React + TypeScript + Vite UI
- Zustand session state and rehabilitation data logging
- React Three Fiber 2.5D barista scene
- MediaPipe Hand Landmarker camera tracking
- Demo mode for testing the full grasp, transport, and pouring loop without a camera
- Therapist-adjustable grasp threshold, pour angle, drop debounce, pour duration, side, assist level, and cup count
- Session JSON export with grasps, drops, completion time, ROM, trajectory samples, smoothness, and dynamic-assist flags

## Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. Camera tracking requires browser camera permission and loads the MediaPipe hand model at runtime.

## Build

```bash
npm run build
```
