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

## Deploy

### GitHub Pages

GitHub Pages project sites need assets to be built under the repository path, such as `/StrokeRehab/`.

This repo includes `.github/workflows/deploy-github-pages.yml`. In GitHub:

1. Push to `main` or `master`.
2. Open repository Settings > Pages.
3. Set Source to `GitHub Actions`.

The workflow runs:

```bash
npm ci
npm run build:github
```

If your GitHub Pages site is a user or organization site repository ending in `.github.io`, the build script automatically uses `/` instead.

### Cloudflare Pages

Use these Cloudflare Pages settings:

- Framework preset: `Vite`
- Build command: `npm run build:cloudflare`
- Build output directory: `dist`
- Node version: `20`

Cloudflare deploys from the root path, so `build:cloudflare` uses `/` as the Vite base path.

### Custom Base Path

Override the base path for any host with:

```bash
VITE_BASE_PATH=/custom-path/ npm run build
```
