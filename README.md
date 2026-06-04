[StrokeTrainerLogo](./public/assets/logo2.png)
# StrokeTrainer

StrokeTrainer 是一個基於 **React + PixiJS + jsPsych** 建構的復健訓練 Web 應用程式。本系統旨在提供多樣化的訓練模組，包含動作、認知與語言訓練，以協助中風患者進行自我復健練習。透過遊戲化的介面設計與精準的資料收集，提升訓練動機與成效。

## 技術棧

- **React 19** + **TypeScript** — 元件化 UI 與強型別開發
- **PixiJS v8** — 高效能 2D Canvas 渲染（視覺刺激與遊戲畫面呈現）
- **jsPsych 8** — 實驗框架（眼動校正與數據記錄）
- **WebGazer.js** — 瀏覽器端眼動追蹤校正
- **React Router v7** — 客戶端路由
- **Vite** — 快速開發與建置工具

## 功能總覽

本系統目前包含三大復健訓練模組：

### 🏋️ 動作訓練模組 (Motor Training)

- **畫畫塔防 (Drawing Tower Defense)**：以滑鼠或觸控繪製圓形、叉叉、方形、三角形與直橫線，訓練上肢精細動作與手眼協調。

### 🧠 認知訓練模組 (Cognitive Training)

- **踩地雷 (Minesweeper)**：透過開格、推理與標記地雷位置訓練注意力、視覺掃描與策略判斷。
- **記憶配對 (Memory Match)**：翻開卡片尋找成對圖樣，訓練工作記憶、視覺搜尋與錯誤抑制。
- **關燈 (Lights Out)**：切換目標與相鄰格，將盤面全部關閉，訓練邏輯推理與步驟規劃。
- **反應時間 (Reaction Time)**：等待目標變色後快速反應，訓練持續注意力與反應抑制。
- **打地鼠 (Whack-a-Mole)**：快速點擊隨機出現的目標，訓練視覺掃描、手眼協調與速度控制。
- **滑塊拼圖 (Sliding Puzzle)**：移動數字滑塊完成排序，訓練空間規劃、序列推理與問題解決。

### 🗣️ 言語/語言訓練模組 (Speech Training)

- **建置中**：目前尚未新增言語訓練模組。

## 系統架構

本系統採用 **React + PixiJS 混合架構**：

- **React** 負責 UI 框架、路由導航、設定管理以及遊戲選單。
- **PixiJS** 負責高精度 2D 視覺渲染與互動遊戲邏輯。
- **jsPsych** 用於收集訓練結果數據以及進行 WebGazer 校正。

### 目錄結構

```text
src/
├── main.tsx                          # 應用程式入口
├── App.tsx                           # React Router 路由定義
├── index.css                         # 全域樣式
├── theme.ts                          # 設計 token
├── components/                       # 共用元件 (如 Navbar)
├── i18n/                             # 國際化多語系設定
├── pages/
│   ├── HomePage.tsx                  # 首頁/模組選單
│   ├── training/                     # 訓練頁面與遊戲模組
│   │   ├── MotorTraining.tsx         # 動作訓練清單
│   │   ├── CognitiveTraining.tsx     # 認知訓練清單
│   │   ├── SpeechTraining.tsx        # 言語訓練清單
│   │   ├── DrawingTowerDefenseGame.tsx # 畫畫塔防遊戲
│   │   ├── MinesweeperGame.tsx       # 踩地雷遊戲
│   │   └── ReferenceCognitiveGame.tsx# 參考認知遊戲集合
│   ├── settings/                     # 設定與校正頁面
│   ├── credits/                      # 致謝頁面
│   └── links/                        # 相關連結頁面
└── utils/
    ├── settings.ts                   # 設定持久化
    └── pixiPool.ts                   # PixiJS Application 管理
```

## 開發

```bash
npm install       # 安裝依賴
npm run dev       # 啟動開發伺服器
npm run build     # 建置生產版本（tsc + vite build）
npm run preview   # 預覽生產版本
```

## Discord 圖像上傳

畫畫塔防會在每次完成辨識後，把使用者筆畫輸出成 256×256 透明 PNG，並以 `multipart/form-data` 送到 `/api/drawing-samples`。前端不保存 Discord webhook；實際 webhook 需由後端環境變數提供。

Cloudflare Pages 部署設定：

```bash
npm run build
```

在 Cloudflare Pages 環境變數設定：

```text
DISCORD_DRAWING_WEBHOOK_URL=你的 Discord webhook URL
```

若前端與 API 不同網域，另設定：

```text
VITE_DRAWING_SAMPLE_UPLOAD_URL=https://your-api.example.com/api/drawing-samples
DRAWING_UPLOAD_ALLOWED_ORIGINS=https://your-frontend.example.com
```

GitHub Pages 只支援靜態檔案，不能執行 `functions/api/drawing-samples.js`。若部署到 GitHub Pages，需要將 `VITE_DRAWING_SAMPLE_UPLOAD_URL` 指向另一個可執行此 API 的服務。

> ⚠️ **免責聲明：** 本應用程式為程式練習與實驗用途，不作為醫療診斷、治療或復健建議。若有醫療需求，請尋求專業醫療協助。
