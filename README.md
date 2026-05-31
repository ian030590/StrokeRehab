# StrokeRehab

A web-based rehabilitation program skeleton for stroke, brain injury, or neurodegenerative cognitive diseases.

## Site Structure

- `動作訓練`
- `認知訓練`
- `設定`
- `致謝`
- `相關網頁`

The current implementation is an empty modular website skeleton. `相關網頁` includes a link to [VisionTrainer](https://visiontrainer.pages.dev).

## Run

```bash
npm install
npm run dev
```

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
