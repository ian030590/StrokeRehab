import { RotateCcw } from "lucide-react";
import { defaultSettings, useGameStore } from "../store/useGameStore";
import type { AffectedSide, AssistLevel } from "../types";
import { clamp, formatSeconds } from "../utils/format";

export default function SettingsPage() {
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const resetSession = useGameStore((state) => state.resetSession);

  return (
    <main className="page-content page-stack">
      <section className="section-header">
        <p className="page-kicker">平台設定</p>
        <h1 className="section-title">設定</h1>
        <p className="section-subtitle">
          這裡設定的是訓練模組的預設參數。進入模組後仍可依當次狀態微調。
        </p>
      </section>

      <section className="settings-panel">
        <div className="settings-panel-header">
          <h2>Café Barista 預設參數</h2>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              updateSettings(defaultSettings);
              resetSession();
            }}
          >
            <RotateCcw size={18} />
            還原預設
          </button>
        </div>

        <div className="settings-grid">
          <label className="setting-control wide">
            <span>抓握門檻</span>
            <input
              type="range"
              min="0.035"
              max="0.14"
              step="0.005"
              value={settings.graspThreshold}
              onChange={(event) =>
                updateSettings({ graspThreshold: Number(event.target.value) })
              }
            />
            <strong>{settings.graspThreshold.toFixed(3)}</strong>
          </label>
          <label className="setting-control wide">
            <span>倒水角度</span>
            <input
              type="range"
              min="20"
              max="80"
              step="1"
              value={settings.pourAngleThreshold}
              onChange={(event) =>
                updateSettings({ pourAngleThreshold: Number(event.target.value) })
              }
            />
            <strong>{settings.pourAngleThreshold}°</strong>
          </label>
          <label className="setting-control wide">
            <span>掉落延遲</span>
            <input
              type="range"
              min="100"
              max="900"
              step="50"
              value={settings.dropDebounceMs}
              onChange={(event) =>
                updateSettings({ dropDebounceMs: Number(event.target.value) })
              }
            />
            <strong>{settings.dropDebounceMs}ms</strong>
          </label>
          <label className="setting-control wide">
            <span>倒水維持</span>
            <input
              type="range"
              min="800"
              max="5000"
              step="100"
              value={settings.pourHoldMs}
              onChange={(event) =>
                updateSettings({ pourHoldMs: Number(event.target.value) })
              }
            />
            <strong>{formatSeconds(settings.pourHoldMs)}</strong>
          </label>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="label">每次訓練杯數</span>
            <input
              className="input"
              type="number"
              min="1"
              max="12"
              value={settings.cupsPerSession}
              onChange={(event) =>
                updateSettings({
                  cupsPerSession: clamp(Number(event.target.value), 1, 12),
                })
              }
            />
          </label>
          <label className="field">
            <span className="label">游標平滑</span>
            <input
              className="input"
              type="number"
              min="0"
              max="0.92"
              step="0.01"
              value={settings.cursorSmoothing}
              onChange={(event) =>
                updateSettings({
                  cursorSmoothing: clamp(Number(event.target.value), 0, 0.92),
                })
              }
            />
          </label>
          <label className="field">
            <span className="label">患側</span>
            <select
              className="select"
              value={settings.affectedSide}
              onChange={(event) =>
                updateSettings({ affectedSide: event.target.value as AffectedSide })
              }
            >
              <option value="right">右側</option>
              <option value="left">左側</option>
              <option value="bilateral">雙側</option>
            </select>
          </label>
          <label className="field">
            <span className="label">輔助等級</span>
            <select
              className="select"
              value={settings.assistLevel}
              onChange={(event) =>
                updateSettings({ assistLevel: event.target.value as AssistLevel })
              }
            >
              <option value="light">低</option>
              <option value="standard">標準</option>
              <option value="high">高</option>
            </select>
          </label>
        </div>
      </section>
    </main>
  );
}
