# 產品需求文件 (PRD)：書寫保衛戰 (Writing Defender)

## 1. 產品概述 (Product Overview)
本模組為一款結合「圖形/文字辨識」與「塔防生存」機制的 Web App 互動遊戲。玩家需透過設備的觸控輸入裝置（如筆電軌跡板或平板觸控螢幕）畫出對應的圖形或文字，藉此擊退由螢幕上方不斷逼近的敵人。遊戲核心目標是在玩家自訂的遊戲時間內，成功防守並阻止敵人抵達螢幕底部。

## 2. 硬體與環境需求 (Hardware & Environment Requirements)
為確保最佳的遊戲體驗與繪圖輸入精準度，本模組針對以下硬體條件進行最佳化：
* **支援裝置**：
    * 具備可用**觸控軌跡板 (Trackpad)** 的筆記型電腦。
    * 具備**觸控螢幕 (Touch Screen)** 的平板電腦或行動裝置。
* **軟體環境**：支援 HTML5 Canvas 與現代 Web API 的主流瀏覽器（如 Chrome, Safari, Edge）。

## 3. 核心遊戲機制 (Core Gameplay Mechanics)
### 3.1 敵人生成與行為模式
* **生成 (Spawn)**：敵人將於螢幕最頂部（Top）隨機位置生成，並持續往螢幕底部（Bottom）直線移動。
* **任務卡片 (Task Cards)**：每名敵人身上會攜帶/顯示一張「任務卡」，卡片上標示玩家需要繪製的指定圖形或文字。
* **判定機制**：
    * **辨識成功 (Matched)**：若玩家在畫布上繪製的軌跡與敵人任務卡上的圖形相符，該名敵人將被立即判定擊敗並從畫面上移除。
    * **辨識失敗或未繪製 (Unmatched/Missed)**：若未能在敵人抵達螢幕底部前畫出正確圖形，敵人將繼續移動（視為防守失敗，並可能觸發扣血或防線破壞機制）。

### 3.2 遊戲目標與時間設定
* **自訂遊戲時長 (Customizable Game Time)**：玩家可於遊戲開始前，自由設定該局遊戲的總時間。
* **勝利條件 (Win Condition)**：在倒數計時器歸零前，成功阻止敵人抵達螢幕底部，即算通關。

## 4. 遊戲難度設定 (Difficulty Levels)
遊戲分為三個難度層級，主要透過**敵人的移動速度 (Movement Speed)** 與**圖形複雜度 (Shape Complexity)** 來做出區隔：

| 難度層級 | 敵人移動速度 | 任務圖形複雜度 | 包含圖形 / 文字清單 |
| :--- | :--- | :--- | :--- |
| **初階 (Beginner)** | 最慢 (Slowest) | 低 (基礎幾何與線條) | 圓形 (Circle)、三角形 (Triangle)、正方形 (Square)、垂直線 (Vertical line)、水平線 (Horizontal line) |
| **中階 (Intermediate)** | 中等 (Faster) | 中 (進階多邊形與符號) | 愛心 (Heart)、星星 (Stars)、橢圓形 (Oval)、六邊形 (Hexagon) |
| **高階 (Hard)** | 最快 (Fastest) | 高 (中文字元) | 天、古、元、右、左、夫、吉 |

## 5. 關鍵技術與功能需求 (Technical & Functional Requirements)
為了實作上述設計，開發團隊需著重以下技術模組：
1.  **繪圖與畫布系統 (Canvas System)**：
    * 實作全螢幕或指定區域的 HTML5 Canvas，以精確捕捉觸控點 (Touch Events) 或游標軌跡 (Pointer Events)。
    * 支援軌跡視覺化（讓玩家看到自己畫了什麼），並在每次辨識後自動清除軌跡。
2.  **圖形/手寫辨識引擎 (Shape/Handwriting Recognition Engine)**：
    * 需整合前端辨識演算法或機器學習模型（如 `$1 Unistroke Recognizer` 處理簡單圖形，或中文字跡辨識 API 處理高階模式字元）。
    * 辨識容錯率需可調控，以平衡不同難度下的玩家挫折感。
3.  **遊戲物理與動畫迴圈 (Game Loop & Animation)**：
    * 使用 `requestAnimationFrame` 處理敵人移動與畫面更新。
    * 建立定時器 (Timer) 系統管理玩家自訂的遊戲時長。

## 6. 待確認與優化事項 (Open Issues / Future Enhancements)
*(此部分供團隊後續討論與定義)*
* **防守失敗懲罰**：當敵人碰到螢幕底部時，是直接 Game Over 還是有「生命值 (HP)」的設定？
* **多重判定處理**：若畫面上同時存在兩個相同圖形的敵人，畫出該圖形時是同時擊殺兩者，還是依照距離底部的遠近優先擊殺？
* **辨識寬容度設定**：針對「高階」的中文字，是否強制要求「筆畫順序 (Stroke Order)」，還是僅判定最終形狀？