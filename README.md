# Vision Trainer
![logo image](./public/assets/logo2.png)

Vision Trainer 是一個基於 **React + jsPsych + PixiJS + Three.js** 建構的視覺能力訓練與評估 Web 應用程式。UI/UX 設計參考了 [FrACT10](https://michaelbach.de/fract/) 的科學化測試介面，使用 PixiJS 進行 2D 精確視覺刺激渲染，並結合 Three.js 建構 3D 沉浸式訓練環境，透過 jsPsych 實驗框架驅動標準化的試驗流程。

## 技術棧

- **React 19** + **TypeScript** — 元件化 UI 與強型別開發
- **PixiJS v8** — 高效能 2D Canvas 渲染（視覺刺激呈現）
- **Three.js** — 3D 場景渲染與物理模擬（駕駛復健模組）
- **jsPsych 8** — 心理學實驗框架（試驗流程控制、資料收集）
- **WebGazer.js** — 瀏覽器端眼動追蹤（可選）
- **React Router v7** — 客戶端路由（HashRouter）
- **Recharts** — 結果資料視覺化
- **Vite** — 快速開發與建置工具
- **GitHub Pages** — 自動化部署（GitHub Actions）

## 功能總覽

本系統包含兩大模組：**訓練** 與 **評估**。

### 🏋️ 訓練模組

| 模組 | 說明 |
|------|------|
| **移動卡片訓練** (Moving Card) | 動態字母配對遊戲，訓練注視中心點時快速辨識周邊文字的能力 |
| **眼動訓練** (Oculomotor Training) | 連續式眼動訓練，支援多種訓練模式與移動路徑 |
| **Gabor Patch 訓練** | 對比敏感度訓練，透過辨識 Gabor 光斑位置強化視覺感知 |
| **閱讀訓練** (Reading Training) | RSVP 快速序列視覺呈現閱讀訓練，附隨機理解測驗 |
| **駕駛復健訓練** (Driving Rehab) | 3D 沉浸式駕駛模擬器，訓練視覺反應、路況觀察與危險感知能力 |

### 📊 評估模組

| 模組 | 說明 |
|------|------|
| **視力評估** (Visual Acuity) | 類 FrACT10 視力測驗，使用 BestPEST 自適應閾值算法 |

---

## 訓練模組詳細

### 移動卡片訓練 (Moving Card Training)

動態字母配對遊戲，訓練注視中心點時快速辨識周邊文字的能力。

- **校正機制**：文字大小根據螢幕校正值（塑膠卡片法）動態計算
- **可調參數**：選項數量、移動間隔、目標/選項物理尺寸、難度
- **參考資料**：FrACT10 CardController、styts/eye-training

### 眼動訓練 (Oculomotor Training)

以 PixiJS 重製 FoveaFlow 風格的連續式眼動訓練，在全螢幕 Canvas 中呈現可調整速度、目標大小、訓練時間與干擾數量的視覺刺激。

**訓練模式：**

| 模式 | 訓練重點 |
|------|----------|
| 追視 (Smooth Pursuit) | 跟隨連續移動目標，練習平滑眼球追蹤 |
| 跳視 (Reaction Jumps) | 目標在不同位置間跳轉，練習快速定位與重新聚焦 |
| 多目標追蹤 (Multi-object Tracking) | 在干擾目標中維持對主要目標的注意 |
| 周邊固視 (Lilac Chaser) | 固視中心點，同時察覺周邊刺激變化 |

**可選移動路徑（28 種）：** 隨機路徑、圓形、橢圓形、8 字形、水平/垂直掃視、反彈、斜向、螺旋、折線、三角形、正方形、長方形、平行四邊形、菱形、梯形、鳶形、五邊形～十邊形、六芒星、十芒星、超橢圓、三角星、平滑隨機、躲貓貓等。

**可調參數：** 速度、目標大小、目標形狀（圓形/星形/方形/十字/三角形/自訂圖片）、目標顏色、背景顏色/圖片、透明度、干擾數量、反彈抖動量、音效、WebGazer 眼動追蹤（可選）。

### Gabor Patch 訓練

對比敏感度訓練，透過辨識隨機出現的 Gabor 光斑位置強化視覺感知能力。

- **可調參數**：訓練時長、最大光斑數、難度等級

### 閱讀訓練 (Reading Training)

RSVP（Rapid Serial Visual Presentation）快速序列視覺呈現閱讀訓練。

- **雙語故事庫**：支援中文與英文故事
- **可調參數**：顯示速度 (WPS)、文字擁擠度、對比度
- **理解測驗**：閱讀後隨機抽選理解問題進行測驗

### 駕駛復健訓練 (Driving Rehab Training)

基於 Three.js 建構的 3D 沉浸式駕駛模擬器，旨在訓練患者的視覺反應、路況觀察與危險感知能力。

- **物理與模擬**：包含完整的車輛動力學與碰撞檢測
- **危險事件系統**：動態生成的突發路況（如行人穿越、車輛切入）以測試反應時間
- **輔助系統**：內建 HUD 介面與 Mini-map 即時導航
- **輸入支援**：支援鍵盤與遊戲手把 (Gamepad) 控制

## 評估模組詳細

### 視力評估 (Visual Acuity Assessment)

類似 FrACT10 的視力測驗模組，使用 BestPEST 自適應閾值算法自動調整視標大小以測定視力閾值。

**支援的測驗類型：**

| 測驗 | 選項數 | 預設試驗數 | 說明 |
|------|--------|-----------|------|
| 蘭氏環 (Landolt C) | 8 | 18 | 辨別環形缺口方向，國際標準視力檢測法 |
| 翻轉 E (Tumbling E) | 4 | 24 | 辨別 E 字母開口方向 |
| Sloan 字母 | 10 | 18 | 辨別 CDHKNORSVZ 字母 |
| 圖形視標 | 4 | 24 | 辨別簡易圖形（房子、圓形、正方形、星星） |
| 條紋視力 (PL) | 2 | 36 | Preferential Looking 條紋方向判斷 |

**結果格式：** LogMAR、十進制視力 (decVA)、Snellen fraction、ETDRS Letter Score

**核心演算法：** BestPEST (Maximum-Likelihood Adaptive Threshold Estimation)，移植自 FrACT10 的 `ThresholderPest.j`。

## 國際化 (i18n)

支援雙語介面切換：

- 🇹🇼 繁體中文（預設）
- 🇺🇸 English

語言偏好透過 `localStorage` 持久化保存。

## 系統架構

本系統採用 **React + jsPsych + PixiJS / Three.js 混合架構**：

- **React** 負責 UI 框架、路由導航、設定管理
- **jsPsych** 負責實驗試驗流程控制與資料收集
- **PixiJS / Three.js** 負責高精度 2D 視覺刺激與 3D 沉浸式場景渲染（內嵌於 jsPsych 自訂 Plugin）

### 目錄結構

```
src/
├── main.tsx                          # 應用程式入口
├── App.tsx                           # React Router 路由定義
├── index.css                         # 全域樣式
├── theme.ts                          # 設計 token（暗色主題）
├── components/
│   └── Navbar.tsx                    # 導航列元件
├── experiment/
│   ├── timeline.ts                   # jsPsych 時間軸建構器
│   └── plugins/                      # jsPsych 實驗用 PixiJS / Three.js Plugins
│       └── driving/                  # 3D 駕駛復健模組核心元件
├── i18n/
│   ├── i18n.tsx                      # LanguageProvider & useT hook
│   ├── zh.ts                         # 繁體中文翻譯
│   └── en.ts                         # 英文翻譯
├── pages/
│   ├── HomePage.tsx                  # 首頁
│   ├── home/                         # 首頁相關子元件 (如訓練模組卡片)
│   ├── training/                     # 訓練頁面模組
│   │   ├── TrainingPage.tsx          # 訓練主頁面
│   │   ├── oculomotor/               # 眼動訓練邏輯與預設值
│   │   ├── reading/                  # 閱讀訓練邏輯
│   │   ├── results/                  # 訓練結果顯示元件
│   │   ├── eyegame/                  # 其他眼動遊戲模組
│   │   └── data/                     # 訓練資料庫 (如中英文故事 JSON)
│   ├── assessment/                   # 評估頁面模組
│   │   ├── AssessmentPage.tsx        # 評估選擇頁
│   │   ├── AcuityTestPage.tsx        # 視力測驗頁
│   │   ├── ContrastTestPage.tsx      # 對比敏感度測驗頁
│   │   └── logic/                    # 評估核心邏輯 (BestPEST, 視標渲染器等)
│   ├── settings/                     # 設定頁面
│   │   └── SettingsPage.tsx
│   └── credits/                      # 致謝頁面
│       └── CreditsPage.tsx
└── utils/
    ├── settings.ts                   # 設定持久化（localStorage）
    ├── usePersistedSetting.ts        # 設定持久化 Custom Hook
    ├── spatialUtils.ts               # 空間轉換（px ↔ mm ↔ degree）
    ├── mathUtils.ts                  # 數學/動畫工具函式
    ├── soundManager.ts               # 音效回饋管理
    ├── downloadFile.ts               # 共用 CSV 下載工具
    └── pixiPool.ts                   # PixiJS Application 物件池
```

> ⚠️ **免責聲明：** 本應用參考 FrACT 測驗模式以及演算法，為程式練習所用。此模組屬於視覺訓練與互動實驗用途，不作為醫療診斷、治療或視力矯正建議。若要了解自己視力，請尋求專業醫療協助。

## Credits

- **[FrACT10](https://github.com/michaelbach/FrACT10)**：視力評估與移動卡片訓練的介面/演算法參考來源。
- **[styts/eye-training](https://github.com/styts/eye-training)**：移動卡片訓練概念參考來源。
- **[Jesper-N/foveaflow](https://github.com/Jesper-N/foveaflow)**：眼動訓練模組參考訓練模式與互動概念。FoveaFlow 由 Jesper Nielsen 開發，採 MIT License。
- **[Fordi/gabor-patching](https://github.com/Fordi/gabor-patching)**：Gabor Patching 訓練概念參考來源。

## 開發

```bash
npm install       # 安裝依賴
npm run dev       # 啟動開發伺服器
npm run build     # 建置生產版本（tsc + vite build）
npm run preview   # 預覽生產版本
```

## 部署

推送到 `main` 分支會自動觸發 GitHub Actions 部署至 GitHub Pages。
