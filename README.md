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

> **Disclaimer:** This application is for programming practice and experimental purposes, and is not intended as medical diagnosis, treatment, or rehabilitation advice. If you have medical needs, please seek professional medical assistance.
