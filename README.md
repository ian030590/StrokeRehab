![StrokeTrainerLogo](./public/assets/logo2.png)
# StrokeTrainer

StrokeTrainer is a rehabilitation training web application built on **React + PixiJS + jsPsych**. This system aims to provide diverse training modules, including motor, cognitive, and speech training, to assist stroke patients with self-rehabilitation exercises. Through gamified interface design and precise data collection, it enhances training motivation and effectiveness.

## Tech Stack

- **React 19** + **TypeScript** — Component-based UI and strongly-typed development
- **PixiJS v8** — High-performance 2D Canvas rendering (visual stimuli and game screen presentation)
- **jsPsych 8** — Experimental framework (eye-tracking calibration and data recording)
- **WebGazer.js** — Browser-based eye-tracking calibration
- **React Router v7** — Client-side routing
- **Vite** — Fast development and build tool

## Feature Overview

This system currently includes three major rehabilitation training modules:

### Motor Training Module (Motor Training)

- **Drawing Tower Defense**: Draw circles, crosses, squares, triangles, and straight lines using a mouse or touch to train upper limb fine motor skills and hand-eye coordination.

### Cognitive Training Module (Cognitive Training)

- **Minesweeper**: Train attention, visual scanning, and strategic judgment through revealing tiles, reasoning, and marking mine locations.
- **Memory Match**: Flip cards to find matching patterns, training working memory, visual search, and error inhibition.
- **Lights Out**: Toggle targets and adjacent tiles to turn off the entire board, training logical reasoning and step planning.
- **Reaction Time**: React quickly after the target changes color, training sustained attention and response inhibition.
- **Whack-a-Mole**: Quickly click on targets that appear randomly, training visual scanning, hand-eye coordination, and speed control.
- **Sliding Puzzle**: Move numbered tiles to complete the sequence, training spatial planning, sequential reasoning, and problem-solving.

### Speech/Language Training Module (Speech Training)

- **Under Construction**: Currently, no speech training modules have been added.

## System Architecture

This system uses a **React + PixiJS hybrid architecture**:

- **React** is responsible for the UI framework, routing navigation, settings management, and the game menu.
- **PixiJS** is responsible for high-precision 2D visual rendering and interactive game logic.
- **jsPsych** is used to collect training result data and perform WebGazer calibration.

### Directory Structure

```text
src/
├── main.tsx                          # Application entry point
├── App.tsx                           # React Router routing definition
├── index.css                         # Global styles
├── theme.ts                          # Design tokens
├── components/                       # Shared components (e.g., Navbar)
├── i18n/                             # i18n multilingual settings
├── pages/
│   ├── HomePage.tsx                  # Home page / Module menu
│   ├── training/                     # Training pages and game modules
│   │   ├── MotorTraining.tsx         # Motor training list
│   │   ├── CognitiveTraining.tsx     # Cognitive training list
│   │   ├── SpeechTraining.tsx        # Speech training list
│   │   ├── DrawingTowerDefenseGame.tsx # Drawing Tower Defense game
│   │   ├── MinesweeperGame.tsx       # Minesweeper game
│   │   └── ReferenceCognitiveGame.tsx# Reference cognitive game collection
│   ├── settings/                     # Settings and calibration pages
│   ├── credits/                      # Credits page
│   └── links/                        # Related links page
└── utils/
    ├── settings.ts                   # Settings persistence
    └── pixiPool.ts                   # PixiJS Application management
```

## Development 

```bash
npm install       # Install dependencies
npm run dev       # Start development server
npm run build     # Build production version (tsc + vite build)
npm run preview   # Preview production version
```

## Discord Image Upload

Drawing Tower Defense will output the user's strokes as a 256x256 transparent PNG after each recognition is completed, and send it to `/api/drawing-samples` as `multipart/form-data`. The frontend does not store the Discord webhook; the actual webhook needs to be provided by backend environment variables.

Cloudflare Pages Deployment Settings:

```bash
npm run build
```

Cloudflare Pages has a 25 MiB limit per uploaded asset. The default build detects Cloudflare Pages through `CF_PAGES=1` and removes the bundled Chinese Vosk archive from `dist`; Voice Defender will use Web Speech fallback unless an external model URL is configured.

To keep offline Chinese recognition on Cloudflare Pages and GitHub Pages, upload the local Vosk files to a public Cloudflare R2 bucket and set the model URLs at build time. The helper script uploads:

- `public/models/vosk-model-small-zh-tw-0.3.tar.gz`
- `public/models/vosk-model-small-zh-tw-0.3-vocabulary.txt`
- `public/models/vosk-model-small-en-us-0.15-vocabulary.txt`
- `public/models/vosk-model-small-en-us-0.15.tar.gz`, if you add it locally later

First authenticate Wrangler with `npx wrangler login`, or set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Then expose the bucket through a custom R2 domain, or enable the `r2.dev` public development URL for testing.

PowerShell example:

```text
$env:R2_BUCKET='stroke-trainer-vosk-models'
$env:R2_PREFIX='models'
$env:R2_PUBLIC_BASE_URL='https://vosk-models.example.com'
npm run r2:upload-vosk
```

The script also applies `config/r2-cors.json`. Update that file if your Cloudflare Pages or GitHub Pages origin is different.

Set the printed frontend variables in Cloudflare Pages environment variables and GitHub repository variables:

```text
VITE_VOSK_MODEL_ZH_URL=https://vosk-models.example.com/models/vosk-model-small-zh-tw-0.3.tar.gz
VITE_VOSK_MODEL_ZH_VOCAB_URL=https://vosk-models.example.com/models/vosk-model-small-zh-tw-0.3-vocabulary.txt
VITE_VOSK_MODEL_EN_VOCAB_URL=https://vosk-models.example.com/models/vosk-model-small-en-us-0.15-vocabulary.txt
```

Set in Cloudflare Pages environment variables:

```text
DISCORD_DRAWING_WEBHOOK_URL=your Discord webhook URL
```

If the frontend and API are on different domains, also set:

```text
VITE_DRAWING_SAMPLE_UPLOAD_URL=https://your-api.example.com/api/drawing-samples
DRAWING_UPLOAD_ALLOWED_ORIGINS=https://your-frontend.example.com
```

GitHub Pages only supports static files and cannot execute `functions/api/drawing-samples.js`. If deploying to GitHub Pages, you need to point `VITE_DRAWING_SAMPLE_UPLOAD_URL` to another service capable of executing this API.

## Voice Defender Models

Voice Defender first checks the browser Cache API for the selected Vosk model. If it is missing, the app downloads and caches the archive. The default Chinese and English models and download timeout can be configured with:

```text
VITE_VOSK_MODEL_ZH_URL=https://your-cdn.example.com/vosk-model-small-zh-tw.tar.gz
VITE_VOSK_MODEL_EN_URL=https://your-cdn.example.com/vosk-model-small-en-us.tar.gz
VITE_VOSK_MODEL_ZH_VOCAB_URL=https://your-cdn.example.com/vosk-model-small-zh-tw-vocabulary.txt
VITE_VOSK_MODEL_EN_VOCAB_URL=https://your-cdn.example.com/vosk-model-small-en-us-vocabulary.txt
VITE_VOSK_MODEL_TIMEOUT_MS=90000
VITE_VOSK_MODEL_RETRY_MS=10000
VITE_VOSK_MODEL_MIN_BYTES=1048576
```

When `VITE_VOSK_MODEL_ZH_URL` is set during `npm run build`, `scripts/prune-cloudflare-pages-assets.mjs` removes the bundled Chinese model from `dist` so GitHub Pages and Cloudflare Pages both use the external R2 copy. The GitHub Pages workflow reads these values from repository variables with the same names.

The model host must allow cross-origin requests. Downloads begin only after Voice Defender is opened. If a download fails, the page keeps retrying in the background until a complete model is cached or the browser tab closes, including while Web Speech gameplay continues or the user navigates elsewhere in the app. Cached archives must include completion metadata, match their recorded byte length, meet the configured minimum size, and have a gzip signature; incomplete or legacy cache entries are deleted and downloaded again. The default Chinese and English archives are also checked against their exact published byte sizes.

The bundled Chinese model uses a Traditional Chinese output vocabulary, so the frontend does not perform Simplified/Traditional conversion. Its compact vocabulary index is loaded only after Voice Defender is opened. Custom words are added only when they exist in the model vocabulary; unsupported words produce a visible warning.

If the model download or initialization fails, Voice Defender automatically falls back to the browser Web Speech API and compares transcripts with visible word cards using Levenshtein similarity. Vosk audio is processed locally; Web Speech processing depends on the browser and may use its online speech service.

> **Disclaimer:** This application is for programming practice and experimental purposes, and is not intended as medical diagnosis, treatment, or rehabilitation advice. If you have medical needs, please seek professional medical assistance.
