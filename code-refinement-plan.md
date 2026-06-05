# 🔬 StrokeTrainer — 程式碼品質精煉計畫

> 掃描日期：2025-06-05 ｜ 涵蓋範圍：全部原始碼（40+ 檔案）
> 分類：🔴 Critical ｜ 🟠 High ｜ 🟡 Medium ｜ 🟢 Low

---

## 目錄

- [一、總覽儀表板](#一總覽儀表板)
- [二、Dead Code — 完全未使用的檔案與匯出](#二dead-code--完全未使用的檔案與匯出)
- [三、冗餘 / 重複程式碼](#三冗餘--重複程式碼)
- [四、效能問題](#四效能問題)
- [五、命名問題](#五命名問題)
- [六、CSS 問題（index.css — 2,580 行）](#六css-問題indexcss--2580-行)
- [七、架構 / 可維護性建議](#七架構--可維護性建議)
- [八、潛在 Bug](#八潛在-bug)
- [九、建議行動優先序](#九建議行動優先序)

---

## 一、總覽儀表板

| 指標 | 數量 |
|------|------|
| 完全無用的檔案（Dead Files） | **4 個**（共 ~380 行） |
| 無用的匯出函式/常數 | **12 個** |
| 跨檔案重複的工具函式 | **5 組** |
| 效能風險點 | **14 處** |
| 命名不良的變數/函式 | **30+ 處** |
| CSS 可精簡行數 | **~150–200 行** |
| 🔴 Critical 等級問題 | **5 個** |
| 🟠 High 等級問題 | **9 個** |

---

## 二、Dead Code — 完全未使用的檔案與匯出

### 🔴 整個檔案無人引用（可直接刪除）

| 檔案 | 行數 | 說明 |
|------|------|------|
| [mathUtils.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/mathUtils.ts) | 90 行 | `shuffleArray`, `randomInt`, `clamp`, `lerp` 等 8 個函式，全部 **0 引用** |
| [pixiPool.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/pixiPool.ts) | 162 行 | `pixiAppManager`, `runPixiTrial` 等，全部 **0 引用** |
| [soundManager.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/soundManager.ts) | 104 行 | `SoundManager` 單例模式，全部 **0 引用** |
| [usePersistedSetting.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/usePersistedSetting.ts) | 14 行 | 自訂 Hook，全部 **0 引用** |

> [!CAUTION]
> 以上 4 個檔案總計 **370 行完全無作用的程式碼**，會增加 bundle 大小（若被 tree-shaking 遺漏）及維護負擔。建議直接移除。

### 🟠 仍在使用的檔案中，有部分匯出從未被引用

| 檔案 | Dead Export | 說明 |
|------|------------|------|
| [settings.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/settings.ts) | `APP_VERSION` | 0 引用 |
| [settings.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/settings.ts) | `isDrivingControlMode()` | 0 引用 |
| [settings.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/settings.ts) | `resetAllSettings()` | 0 引用 |
| [settings.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/settings.ts) | `markDisplayCalibrated()` | 0 引用 |
| [trainingRecords.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/trainingRecords.ts) | `getTrainingRecordCount()` | 0 引用，且實作低效 |
| [spatialUtils.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/spatialUtils.ts) | `pixelFromDegree`, `degreeFromPixel`, `millimeterFromPixel` | 僅 `pixelFromMillimeter` 被使用 |
| [downloadFile.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/downloadFile.ts) | `downloadFile`（base 版） | 僅 `downloadCsvFile` 被外部使用 |
| [theme.ts](file:///P:/3_WebSite/StrokeTrainer/src/theme.ts) | `cssColors`, `typography`, `spacing`, `radii`, `hexToCSS` | 僅 `pixiColors` 被引用 |
| [HomePage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/HomePage.tsx) | 整個元件 | 已匯出但從未被任何路由或頁面引用 — **孤兒元件** |

---

## 三、冗餘 / 重複程式碼

### 🔴 C-1：NavBar.tsx 與 Navbar.tsx 完全重複

| 項目 | 詳情 |
|------|------|
| 檔案 | [NavBar.tsx](file:///P:/3_WebSite/StrokeTrainer/src/components/NavBar.tsx) 與 [Navbar.tsx](file:///P:/3_WebSite/StrokeTrainer/src/components/Navbar.tsx) |
| 嚴重性 | 🔴 Critical |
| 問題 | 兩檔案 **byte-for-byte 完全一致**（5,145 bytes）。Windows 大小寫不敏感可正常運作，但 Linux CI/CD 或部署環境會產生衝突 |
| 建議 | 刪除其中一個，統一使用 `Navbar.tsx`（或 `NavBar.tsx`），並確保 import 路徑一致 |

### 🟠 C-2：三大遊戲檔案共享的重複工具函式

以下函式在 3 個遊戲檔案中**逐字重複**：

| 函式 | [DrawingTowerDefenseGame](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/DrawingTowerDefenseGame.tsx) | [MinesweeperGame](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/MinesweeperGame.tsx) | [ReferenceCognitiveGame](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/ReferenceCognitiveGame.tsx) |
|-------|:---:|:---:|:---:|
| `csvCell()` | ✅ L1824 | ✅ L726 | ✅ L623 |
| `formatTestDate()` | ✅ L1838 | ✅ L736 | ✅ L628 |
| `clamp()` | ✅ L1829 | ✅ L731 | ❌ |
| `toCsv()`（結構相同） | ✅ L1797 | ✅ L703 | ✅ L598 |
| `restartGame = startGame` 包裝 | ✅ L520 | ✅ L179 | ✅ L202 |
| jsPsych 初始化 + 寫入 | ✅ | ✅ | ✅ |

**建議**：抽出 `src/utils/gameUtils.ts` 統一管理 `csvCell`, `formatTestDate`, `clamp`, jsPsych 寫入等共用邏輯。

### 🟠 C-3：MotorTraining / CognitiveTraining 遊戲選擇守衛邏輯重複

- [MotorTraining.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/MotorTraining.tsx) L20-40
- [CognitiveTraining.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/CognitiveTraining.tsx) L21-40

兩者的 `blockedRequestRef` + `useEffect` + user guard + `navigate` 邏輯**近乎完全一致**。

**建議**：抽出 `useGameModuleGuard()` 自訂 Hook。

### 🟡 C-4：Navbar 中 training link className 三重重複

```tsx
// 三處幾乎一樣，只差 moduleId
() => `navbar-link ${activeTrainingModule === 'X' ? 'active' : ''}`
```

**建議**：抽出 `trainingLinkClass(moduleId: string)` 輔助函式。

### 🟡 C-5：lightsOut.ts 中「全滅判定」重複 3 次

- `createLightsState` L19、`handleLightsTap` L30、`isLightsAutoSuccess` L34

三處皆用 `.every(row => row.every(light => !light))`。

**建議**：抽出 `isAllLightsOff(lights)` 函式。

### 🟡 C-6：lightsOut.ts 中 lightsOn 計算重複

`state.lights.flat().filter(Boolean).length` 在 `summarizeLightsState` (L38) 和 `buildLightsResultStats` (L50) 重複出現。

### 🟡 C-7：targetClick.ts 清除+排程邏輯重複

L37 與 L48 都執行 `state.activeIndex = null; state.targetExpiresAt = null; state.nextTargetAt = ...`。

**建議**：抽出 `scheduleNextTarget(state, elapsed)` 函式。

### 🟡 C-8：CreditsPage / LinksPage 卡片渲染重複

[CreditsPage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/credits/CreditsPage.tsx) 與 [LinksPage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/links/LinksPage.tsx) 的卡片布局（icon → title → desc → footer）幾乎相同。

**建議**：抽出 `<LinkCard>` 共用元件。

### 🟡 C-9：SoundManager 內部 playPop/playRunEnd 重複 playTone 模式

`playPop()` 和 `playRunEnd()` 皆複製了 `playTone()` 的 guard + oscillator 建構模式。

### 🟡 C-10：drawing-samples.js 中 CORS 邏輯重複

[drawing-samples.js](file:///P:/3_WebSite/StrokeTrainer/functions/api/drawing-samples.js) 的 `corsHeaders()` 和 `isAllowedOrigin()` 各自獨立解析 `env.DRAWING_UPLOAD_ALLOWED_ORIGINS`（split + trim + filter），且各自建構 `new URL(request.url).origin`。

### 🟡 C-11：TFunction 型別定義重複

`TFunction` 在 [types.ts](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/types.ts) 匯出，又在 [selectedUserGuard.ts](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/selectedUserGuard.ts) 本地重新定義。

### 🟡 C-12：App.tsx 重複路由

```tsx
<Route path="/" element={<MotorTraining />} />        // L18
<Route path="/motor-training" element={<MotorTraining />} />  // L19
```

`/` 與 `/motor-training` 渲染同一元件，會各自建立獨立的 lazy-loaded 實例。建議 `/` 使用 `<Navigate to="/motor-training" replace />`。

---

## 四、效能問題

### 🔴 P-1：PixiJS 應用程式過度重建

| 檔案 | 影響 |
|------|------|
| [DrawingTowerDefenseGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/DrawingTowerDefenseGame.tsx) L638 | `useEffect` 依賴 `[drawLayout, finishGame, recordEnemyOutcome, spawnEnemy]`，任一 callback 變化就**銷毀並重建整個 PixiJS Application** |
| [ReferenceCognitiveGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/ReferenceCognitiveGame.tsx) L261 | `useEffect` 依賴 `[gameId, sessionLimitSec, syncHud, whackDurationSec]`，設定面板的任何變更都觸發 Pixi 重建 |

**建議**：將 callback 包裝在 `useRef` 中（部分已做），確保 PixiJS effect 的依賴陣列僅包含真正需要重建的值。

### 🟠 P-2：MinesweeperGame 的 `getBoardStats()` 在渲染路徑中做 O(n) 計算

- [MinesweeperGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/MinesweeperGame.tsx) L370
- 對 80×80 棋盤（6,400 cells）執行 `board.flat()` + `.filter()` × 每 250ms timer + 每次狀態變更
- `countFlags(board)` (L107) 也重複做 `board.flat().filter()`

**建議**：用 `useMemo` 快取，或改用 incremental counter。

### 🟠 P-3：MinesweeperGame BFS 使用 `queue.shift()`

- [MinesweeperGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/MinesweeperGame.tsx) L535
- `Array.shift()` 是 O(n)，在大型棋盤上會產生 O(n²) 的 BFS

**建議**：改用 index-based 佇列或 deque。

### 🟠 P-4：`getSetting()` 每次呼叫都同步讀取 localStorage

- [settings.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/settings.ts) — 所有遊戲的渲染路徑都呼叫 `getSetting()`
- [spatialUtils.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/spatialUtils.ts) — 轉換函式每次呼叫都讀 localStorage

**建議**：加入記憶體快取層，僅在 `setSetting()` 時 invalidate。

### 🟠 P-5：`trainingRecords.ts` 每次儲存都完整 JSON parse + serialize

- [trainingRecords.ts](file:///P:/3_WebSite/StrokeTrainer/src/utils/trainingRecords.ts) — `saveTrainingRecord()` 先 parse 全部記錄，push，再 stringify 全部
- 隨著記錄增長，這會越來越慢

**建議**：考慮 IndexedDB 或 append-only 策略。

### 🟠 P-6：MinesweeperGame `toggleFlagAt` 深拷貝整個棋盤

- [MinesweeperGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/MinesweeperGame.tsx) L204-210
- 80×80 棋盤 = 6,400 個物件的完整 `.map().map()` 深拷貝，只為翻轉一個 flag

**建議**：使用 Immer 或局部更新策略。

### 🟡 P-7：DrawingTowerDefenseGame 每幀呼叫 `setElapsedSeconds`

- [DrawingTowerDefenseGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/DrawingTowerDefenseGame.tsx) L582
- 即使有 bail-out 邏輯，函式呼叫本身仍在 60fps ticker 中執行

### 🟡 P-8：DrawingTowerDefenseGame 形狀辨識在主執行緒同步執行

- `recognizeShape` 遍歷所有模板 × 所有變體（cross 有 384 個變體）
- `createGestureTemplates` 在模組載入時一次性生成，但 `recognizeShape` 每次繪畫完成都在主執行緒同步匹配

### 🟡 P-9：i18n `t()` 函式每次呼叫都編譯 RegExp

- [i18n.tsx](file:///P:/3_WebSite/StrokeTrainer/src/i18n/i18n.tsx)
- 帶參數的翻譯呼叫會在 `forEach` 迴圈中 `new RegExp(...)`

**建議**：改用 `text.replaceAll(\`{${key}}\`, value)` 或預編譯模式。

### 🟡 P-10：SettingsPage `GammaCheckerboard` 每次渲染建立 625 個 SVG rect

- [SettingsPage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/settings/SettingsPage.tsx) L555-591
- 靜態棋盤格應用 `React.memo` 或 `useMemo` 快取

### 🟡 P-11：SettingsPage 渲染路徑多次呼叫 `getSetting()`

- [SettingsPage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/settings/SettingsPage.tsx) L99, 116, 118, 122, 130
- 每次都讀 localStorage

### 🟡 P-12：CSS `backdrop-filter: blur()` 使用 6 次

- GPU 密集操作，尤其與動畫結合時
- `.config-modal-overlay`, `.webgazer-cancel-btn`, `.direction-btn`, `.acuity-abort-btn`, `.drawing-defense-panel` 等

### 🟡 P-13：CSS 冗餘的 `width: 100vw; height: 100vh` + `inset: 0`

- `position: fixed; inset: 0` 已隱含 100% 寬高
- `.drawing-defense`, `.cognitive-reference-game`, `.minesweeper-game` 等處冗餘設定

### 🟢 P-14：Navbar / HomePage 缺少 `useCallback`

- 多個 handler（`handleSelectUser`, `handleRemoveUser`, `handleCardClick` 等）未包裝 `useCallback`
- 對小型元件影響有限，但不一致

---

## 五、命名問題

### 🟠 系統性命名問題

#### N-1：過短的變數名

| 變數 | 檔案 | 建議改名 |
|------|------|----------|
| `w` | DrawingTowerDefenseGame L304 | `rendererWidth` |
| `bg` | DrawingTowerDefenseGame L305 | `backgroundGraphics` |
| `g` | DrawingTowerDefenseGame L314 + 所有 cognitive draw 函式 | `cellGraphics` 或 `tileGfx` |
| `cx`, `cy` | DrawingTowerDefenseGame L314 | `centerX`, `centerY` |
| `dt` | DrawingTowerDefenseGame L575 | `deltaSeconds` |
| `cfg` | DrawingTowerDefenseGame L577, reactionTime L30 | `difficultyConfig` |
| `a`, `b`, `c` | DrawingTowerDefenseGame L1743 | `pointA`, `pointB`, `pointC` |
| `ab`, `cb` | DrawingTowerDefenseGame L1744-1745 | `vectorBA`, `vectorBC` |
| `u` | Navbar L70, HomePage L70 | `userName` |
| `c` | CreditsPage L40 | `credit` 或 `item` |
| `b` | SettingsPage L535 | `delta` |
| `nv` | SettingsPage L540 | `newValue` |
| `w`, `h` | reactionTime L95-96 | `canvasWidth`, `canvasHeight` |
| `node` | 所有 cognitive draw 函式 | `cellContainer` |
| `ctx` | soundManager | `audioContext` |
| `val` | SettingsPage（多處） | `inputValue` |

#### N-2：命名不一致

| 問題 | 檔案 | 說明 |
|------|------|------|
| `setUsersState` / `setActiveUserState` | HomePage, TrainingUserSelector | React 慣例不加 `State` 後綴 |
| `user` vs `activeUserName` | Navbar L13 | `user` 過於模糊 |
| `isOpen` vs `isMenuOpen` | Navbar L14 | 不夠具體 |
| `row` vs `line` | lightsOut.ts | 同一概念混用兩種名稱 |
| `dflt` | settings.ts SettingMeta | 應為 `defaultValue` |
| `SoundManagerImpl` | soundManager.ts | Java 風格 `Impl` 後綴在 TS 中不常見 |

#### N-3：命名具誤導性

| 問題 | 檔案 | 說明 |
|------|------|------|
| `pixiColors.accentDark` / `.accentHover` / `.success` | [theme.ts](file:///P:/3_WebSite/StrokeTrainer/src/theme.ts) | 四個 key **值完全相同**（`0x005EB8`），名稱暗示應有差異 |
| `radii.radiusS` / `radii.radiusM` | theme.ts | 都是 `8`，`S` 和 `M` 暗示不同大小 |
| `OculomotorPattern` / `OculomotorTargetShape` | settings.ts | 型別為 `string`，無提供型別安全 |
| `backgroundColor` | DrawingTowerDefenseGame L183 | 是 `const` 但名稱暗示可配置 |

#### N-4：`as any` 型別斷言掩蓋型別問題

| 檔案 | 位置 | 說明 |
|------|------|------|
| [CreditsPage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/credits/CreditsPage.tsx) | L52, 54 | `t(c.titleKey as any)` |
| [LinksPage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/links/LinksPage.tsx) | L40, 42 | 同上 |
| [SettingsPage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/settings/SettingsPage.tsx) | L280, 620 | `useRef<any>`, `as number` |

**建議**：將 `titleKey` / `descKey` 型別標記為 `TranslationKey`，而非 `string`。

---

## 六、CSS 問題（index.css — 2,580 行）

### 🟠 CSS-1：重複的規則區塊

| 重複項 | 行數 | 說明 |
|--------|------|------|
| `.key-hints-grid-8` vs `.key-hints-grid-4` | L1460-1472 | **完全一致**，可合併選擇器 |
| `.drawing-defense` / `.cognitive-reference-game` / `.minesweeper-game` | L1807, 2317, 2407 | 3 個全螢幕容器共享 7 個相同屬性 → 抽出 `.game-fullscreen` |
| `.cognitive-game-hud` vs `.minesweeper-hud` | L2349, 2423 | 屬性集合相同（僅 accent 色不同） |
| `.experiment-instructions` / `.acuity-intro` / `.acuity-results` | L870, 1390, 1645 | 共享 flexbox 置中 + fadeIn 動畫 |
| 3 處 `.results-table { max-width }` | L987, 2399, 2487 | 各遊戲對結果表格設相似 max-width |

**預估可精簡**：合併後減少 **~80–120 行**。

### 🟡 CSS-2：Magic Numbers（未 tokenize 的硬編碼值）

#### 顏色

- `rgba(0, 94, 184, 0.08)` 出現 **5 次** — accent 色 8% 透明度，應為 `--accent-subtle`
- `rgba(88, 166, 255, 0.1)` 出現 **3 次** — 與 accent 色不同的藍色，可能是舊版殘留
- 超過 **60 個** `rgba()` 值未做成 CSS 變數
- `#FFFFFF` (9 次) vs `#fff` (2 次) — 大小寫不一致，且多處可改用 `var(--bg-card)`

#### z-index（無統一尺度）

使用值：`4, 6, 7, 20, 100, 101, 102, 200, 900, 1000, 10001, 99999` — 散落的 magic numbers。

#### 間距 / 字型大小

- 使用 14 種不同的 `font-size`：`11px ~ 64px`，無 CSS 變數
- `padding`, `margin`, `gap` 值散落，無 spacing scale

### 🟡 CSS-3：冗餘的 `font-family` 宣告

`font-family: var(--font-family)` 在 `html, body, #root` 設定後，又在 **13 個額外位置**重複宣告。僅 `button`, `input`, `select`, `textarea` 需要覆寫（因瀏覽器預設值）。

### 🟡 CSS-4：命名慣例不一致

| 模式 | 範例 | 問題 |
|------|------|------|
| Bare modifier | `.active` | 與 `.is-open`、`.card-active` 混用 |
| 按鈕變體 | `.diff-btn`, `.direction-btn`, `.letter-btn` | 未統一為 `.btn--diff` 等 modifier 模式 |
| 超長名稱 | `.drawing-defense-config-header`, `.drawing-defense-option-grid-three` | 6+ 單字，過度冗長 |
| 過短名稱 | `.input`, `.label` | 與 HTML 元素衝突風險 |

### 🟡 CSS-5：`!important` 過度使用

超過 **50 個** `!important`，集中在 jsPsych/WebGazer 覆寫區段（L997-1227，約 38 個）。

**建議**：用包裝 class 提升特異性取代 `!important`。

### 🟡 CSS-6：組織問題

- Media query 混合使用 `min-width`（mobile-first）和 `max-width`（desktop-first）
- jsPsych 覆寫出現在兩個不同位置（L997-1016 和 L1155-1188）
- 相關樣式散落在不同區段（如 Acuity 樣式分散在 3 個區域）

---

## 七、架構 / 可維護性建議

### 🔴 A-1：DrawingTowerDefenseGame.tsx — 1,844 行的巨型檔案

[DrawingTowerDefenseGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/DrawingTowerDefenseGame.tsx) 是全專案最大的檔案，包含：

| 區塊 | 約行數 | 建議抽出位置 |
|------|--------|-------------|
| React 元件 + PixiJS 生命週期 | ~1,085 | 保留在主檔案 |
| 形狀辨識引擎（`recognizeShape`, gesture templates, RDP 等） | ~500 | `shapeRecognition.ts` |
| 幾何工具（`distance`, `pathLength`, `centroid`, `angle` 等） | ~150 | `geometryUtils.ts` |
| 繪圖範本上傳邏輯 | ~100 | `drawingSampleUpload.ts` |
| CSV / 通用工具 | ~30 | `gameUtils.ts`（與其他遊戲共用） |

### 🟠 A-2：SettingsPage.tsx — 713 行

[SettingsPage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/settings/SettingsPage.tsx) 包含 `GeneralTab`, `CalibrationTab`, `GammaTab`, `CrowdingTab`, `WebGazerCalibrationTab` 等子元件，應各自拆為獨立檔案。

### 🟠 A-3：MinesweeperGame.tsx — 742 行

[MinesweeperGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/MinesweeperGame.tsx) 的棋盤邏輯（create, clone, generate, reveal, BFS 等）應抽至 `minesweeperBoard.ts`。

### 🟠 A-4：ReferenceCognitiveGame.tsx — 634 行

[ReferenceCognitiveGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/ReferenceCognitiveGame.tsx) 的選單 UI（~150 行）和結果顯示（~50 行）應考慮拆分。

### 🟡 A-5：MinesweeperGame 使用 DrawingDefense 的 CSS class 名

MinesweeperGame 的 UI 使用 `drawing-defense-*` 的 CSS class 名稱（從 DrawingTowerDefenseGame 複製而來），造成 CSS 維護困難。

### 🟡 A-6：TrialData 成為「God Type」

[types.ts](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/types.ts) 的 `TrialData` 有大量 optional fields（`mode?`, `pattern?`, `score?`, `trial_type?` 等），失去型別安全性。建議用 discriminated union 分型。

### 🟡 A-7：localStorage 金鑰管理分裂

- `settings.ts` 使用 `STORAGE_PREFIX = 'vision_trainer_'`
- `i18n.tsx` 硬編碼 `'vision_trainer_language'` 且**未使用** `STORAGE_PREFIX`
- `resetAllSettings()` 不會清除語言設定

### 🟡 A-8：Cognitive 遊戲模組 draw 函式共用模板

所有 `drawLightsOut`, `drawMemory`, `drawSliding`, `drawWhack` 皆遵循相同模式：
1. `getGridLayout()` 計算佈局
2. 迭代項目 → `new Container()` → `new Graphics()` → `roundRect` → `app.stage.addChild()`

可抽出 `createGridCell(app, layout, index, onTap)` 共用函式，減少每個 draw 函式 ~15 行重複。

---

## 八、潛在 Bug

### 🔴 B-1：`%BASE_URL%` 在 index.html 中無效

```html
<link rel="icon" href="%BASE_URL%assets/logo2.png" />
```

[index.html](file:///P:/3_WebSite/StrokeTrainer/index.html) L8 — `%BASE_URL%` **不是有效的 Vite 替換語法**。Vite HTML 不支援此格式。Favicon 很可能**損壞**。

**修正**：改為 `href="./assets/logo2.png"`（配合 `vite.config.ts` 的 `base: './'`）。

### 🔴 B-2：SettingsPage 變數遮蔽（Variable Shadowing）

- [SettingsPage.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/settings/SettingsPage.tsx) L27：`const refresh = () => setTick((t) => t + 1)` — 參數 `t` 遮蔽了 L24 的翻譯函式 `t`
- L45：`tabs.map((t) => ...)` — `t` 同樣遮蔽翻譯函式

**風險**：在這些 scope 內呼叫 `t()` 會呼叫到 tab 物件或數字，而非翻譯函式。

### 🟠 B-3：reactionTime.ts 可能觸發雙重 `finishGame('Victory')`

- L50：`handleReactionStateTap` 在 attempts 達標時呼叫 `finishGame('Victory')`
- L60：`updateReactionTimedState` 在下一個 tick 也檢查 attempts 達標

若兩者在同一個 tick 觸發，`finishGame` 會被呼叫兩次。

### 🟠 B-4：Footer 在 React root 外部

[index.html](file:///P:/3_WebSite/StrokeTrainer/index.html) L15 — `<footer>` 在 `#root` div 外，不會參與 React 的 i18n 翻譯，版權文字永遠是英文。

### 🟡 B-5：多處使用 `window.alert()` / `window.confirm()`

- selectedUserGuard.ts、TrainingUserSelector.tsx、HomePage.tsx
- 阻塞 UI 主執行緒，UX 不佳

### 🟡 B-6：SpeechTraining / MotorTraining / CognitiveTraining 硬編碼中文

多處中文字串**未通過 `t()` 翻譯函式**，與 i18n 策略不一致：
- [SpeechTraining.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/SpeechTraining.tsx) L11-12
- [MotorTraining.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/MotorTraining.tsx) L57, 69-71
- [CognitiveTraining.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/CognitiveTraining.tsx) L66, 79-81, 94
- [ReferenceCognitiveGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/ReferenceCognitiveGame.tsx) L336-537
- [MinesweeperGame.tsx](file:///P:/3_WebSite/StrokeTrainer/src/pages/training/MinesweeperGame.tsx) L274-453

### 🟡 B-7：en.ts / zh.ts 翻譯字串內嵌 UI 符號

如 `'✎ Edit'`, `'✕ Cancel (ESC)'`, `'📥 Download CSV'` — 符號應在 JSX 元件中，而非翻譯字串，因不同語言可能需要不同的 icon 位置。

---

## 九、建議行動優先序

### 第一階段：🔴 Critical（立即處理）

| # | 行動 | 影響 |
|---|------|------|
| 1 | 刪除 `NavBar.tsx` 或 `Navbar.tsx` 其中一個 | 避免跨平台部署爆炸 |
| 2 | 修正 `index.html` 的 `%BASE_URL%` → `./` | 修復 favicon |
| 3 | 修正 SettingsPage 的變數遮蔽（`t` 被覆蓋） | 消除潛在 bug |
| 4 | 刪除 4 個 dead files（mathUtils, pixiPool, soundManager, usePersistedSetting） | 減少 370 行死碼 |
| 5 | 修正 reactionTime.ts 雙重 finishGame 風險 | 消除潛在 bug |

### 第二階段：🟠 High（一週內處理）

| # | 行動 | 影響 |
|---|------|------|
| 6 | 建立 `gameUtils.ts`，統一 `csvCell`, `formatTestDate`, `clamp`, jsPsych 寫入 | 消除 5 組跨檔案重複 |
| 7 | 拆分 DrawingTowerDefenseGame.tsx（形狀辨識 + 幾何工具） | 1,844 → ~1,000 行 |
| 8 | 修正 PixiJS effect 過度重建問題 | 效能大幅改善 |
| 9 | 清理 settings.ts / theme.ts 的 dead exports | 減少混淆 |
| 10 | 抽出 `useGameModuleGuard()` hook | 消除 Motor/Cognitive 重複 |
| 11 | 加入 `getSetting()` 快取層 | 減少 localStorage I/O |
| 12 | MinesweeperGame 的 `getBoardStats` + `toggleFlagAt` 效能修正 | 大型棋盤效能改善 |
| 13 | 拆分 SettingsPage.tsx 的 Tab 元件 | 713 → ~150 行 |
| 14 | 修正 Footer 移入 React root | i18n 一致性 |

### 第三階段：🟡 Medium（兩週內處理）

| # | 行動 | 影響 |
|---|------|------|
| 15 | CSS 合併重複規則區塊 | 減少 ~120 行 |
| 16 | CSS tokenize magic numbers（z-index, spacing, font-size） | 可維護性 |
| 17 | 統一 CSS 命名慣例（modifier pattern） | 一致性 |
| 18 | 移除冗餘 `font-family` 宣告（13 處） | 精簡 CSS |
| 19 | 硬編碼中文字串改用 `t()` | i18n 完整性 |
| 20 | `TrialData` 重構為 discriminated union | 型別安全 |
| 21 | `as any` 替換為正確型別標注 | 型別安全 |
| 22 | 統一 localStorage key 管理 | 一致性 |

### 第四階段：🟢 Low（持續改善）

| # | 行動 | 影響 |
|---|------|------|
| 23 | 重命名過短變數（`g`, `w`, `u`, `cfg` 等） | 可讀性 |
| 24 | 補充 `useCallback` / `useMemo` | 微效能 |
| 25 | 抽出 `<LinkCard>` 共用元件 | 減少重複 |
| 26 | 加入 ESLint + 測試腳本至 package.json | 工程品質 |
| 27 | Vite `manualChunks` 擴充至 pixi.js, recharts 等 | 快取效率 |
| 28 | 翻譯字串中的 UI 符號移至 JSX | i18n 品質 |
| 29 | `window.alert/confirm` 替換為 modal 元件 | UX 改善 |
| 30 | Cognitive draw 函式抽出共用 `createGridCell` | 減少 ~60 行 |
