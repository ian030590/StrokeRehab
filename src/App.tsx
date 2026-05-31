import { Canvas } from "@react-three/fiber";
import {
  Camera,
  CircleStop,
  Download,
  Hand,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BaristaScene from "./components/BaristaScene";
import { useHandTracking } from "./hooks/useHandTracking";
import { useGameStore } from "./store/useGameStore";
import type { AssistLevel, AffectedSide, GamePhase, Vector3 } from "./types";

const phaseLabels: Record<GamePhase, string> = {
  setup: "準備",
  targeting: "定位",
  transporting: "移動",
  pouring: "倒水",
  success: "成功",
  completed: "完成",
};

const formatSeconds = (milliseconds: number) =>
  `${(milliseconds / 1000).toFixed(1)} 秒`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function MetricTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className={`barista-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function downloadSessionJson(createExport: () => unknown) {
  const payload = JSON.stringify(createExport(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cafe-barista-session-${new Date().toISOString().slice(0, 19)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const phase = useGameStore((state) => state.phase);
  const message = useGameStore((state) => state.message);
  const settings = useGameStore((state) => state.settings);
  const metrics = useGameStore((state) => state.metrics);
  const handPresent = useGameStore((state) => state.handPresent);
  const trackingSource = useGameStore((state) => state.trackingSource);
  const pinchDistance = useGameStore((state) => state.pinchDistance);
  const rollAngle = useGameStore((state) => state.rollAngle);
  const pourProgress = useGameStore((state) => state.pourProgress);
  const activePourAngleThreshold = useGameStore(
    (state) => state.activePourAngleThreshold,
  );
  const startSession = useGameStore((state) => state.startSession);
  const resetSession = useGameStore((state) => state.resetSession);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const updateHandFrame = useGameStore((state) => state.updateHandFrame);
  const tick = useGameStore((state) => state.tick);
  const createExport = useGameStore((state) => state.createExport);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [demoActive, setDemoActive] = useState(false);
  const [demoPinch, setDemoPinch] = useState(false);
  const [demoRoll, setDemoRoll] = useState(0);
  const demoCursorRef = useRef<Vector3>([-2.65, -0.45, 0]);
  const demoPinchRef = useRef(false);
  const demoRollRef = useRef(0);

  const { videoRef, status, error, start, stop } = useHandTracking({
    settings,
    onFrame: updateHandFrame,
  });

  useEffect(() => {
    demoPinchRef.current = demoPinch;
  }, [demoPinch]);

  useEffect(() => {
    demoRollRef.current = demoRoll;
  }, [demoRoll]);

  useEffect(() => {
    let frameId = window.requestAnimationFrame(function loop() {
      tick();
      frameId = window.requestAnimationFrame(loop);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [tick]);

  useEffect(() => {
    if (!demoActive) {
      return undefined;
    }

    let frameId = window.requestAnimationFrame(function loop() {
      const isPinching = demoPinchRef.current;
      updateHandFrame({
        time: Date.now(),
        handPresent: true,
        cursor: demoCursorRef.current,
        pinchDistance: isPinching
          ? settings.graspThreshold * 0.45
          : settings.graspThreshold * 1.8,
        isPinching,
        rollAngle: demoRollRef.current,
        source: "demo",
        handedness: settings.affectedSide === "left" ? "Left" : "Right",
        confidence: 1,
      });
      frameId = window.requestAnimationFrame(loop);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [demoActive, settings.affectedSide, settings.graspThreshold, updateHandFrame]);

  const handleScenePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!demoActive) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const normalizedX = (event.clientX - rect.left) / rect.width;
      const normalizedY = (event.clientY - rect.top) / rect.height;

      demoCursorRef.current = [
        clamp((normalizedX - 0.5) * 7.1, -3.35, 3.35),
        clamp((0.55 - normalizedY) * 4.25, -1.55, 1.95),
        0,
      ];
    },
    [demoActive],
  );

  const toggleDemo = useCallback(() => {
    if (!demoActive) {
      stop();
    }
    setDemoActive((current) => !current);
  }, [demoActive, stop]);

  const handleStartCamera = useCallback(() => {
    setDemoActive(false);
    void start();
  }, [start]);

  const sessionJson = useMemo(
    () => JSON.stringify(createExport(), null, 2),
    [
      createExport,
      metrics,
      phase,
      settings,
      pourProgress,
      pinchDistance,
      rollAngle,
      activePourAngleThreshold,
    ],
  );

  const completionPercent = Math.round(
    (metrics.completedCups / settings.cupsPerSession) * 100,
  );
  const showTrackingOverlay =
    phase !== "setup" && phase !== "completed" && !handPresent && !demoActive;

  return (
    <div className="app-layout barista-app">
      <header className="barista-header">
        <div>
          <p className="barista-kicker">StrokeRehab 上肢動作訓練</p>
          <h1>Café Barista</h1>
        </div>
        <div className="barista-header-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={phase === "setup" || phase === "completed" ? startSession : resetSession}
          >
            {phase === "setup" || phase === "completed" ? <Play size={20} /> : <RotateCcw size={20} />}
            {phase === "setup" || phase === "completed" ? "開始訓練" : "重新開始"}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-pressed={settingsOpen}
          >
            <SlidersHorizontal size={20} />
            參數
          </button>
        </div>
      </header>

      <main className={`barista-workspace ${settingsOpen ? "with-panel" : ""}`}>
        <section
          className="barista-stage"
          onPointerMove={handleScenePointerMove}
          onPointerDown={handleScenePointerMove}
        >
          <div className="barista-stage-hud">
            <div>
              <span className="status-pill">{phaseLabels[phase]}</span>
              <strong>{message}</strong>
            </div>
            <div className="pour-meter" aria-label="倒水進度">
              <span>{metrics.completedCups}/{settings.cupsPerSession} 杯</span>
              <div className="progress-shell">
                <div
                  className="progress-bar"
                  style={{ "--progress": `${completionPercent}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          <Canvas
            orthographic
            camera={{ position: [0, 0, 7], zoom: 110, near: 0.1, far: 100 }}
            dpr={[1, 1.6]}
          >
            <BaristaScene />
          </Canvas>

          {showTrackingOverlay && (
            <div className="tracking-lost-overlay" role="status">
              <Hand size={36} />
              <strong>請將手移回鏡頭範圍內</strong>
            </div>
          )}

          {demoActive && (
            <div className="demo-controls" aria-label="示範模式控制">
              <button
                className={`btn btn-sm ${demoPinch ? "btn-secondary" : "btn-ghost"}`}
                type="button"
                aria-pressed={demoPinch}
                onClick={() => setDemoPinch((current) => !current)}
              >
                <Hand size={18} />
                {demoPinch ? "已抓握" : "示範抓握"}
              </button>
              <label className="inline-range">
                <span>模擬旋轉</span>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={demoRoll}
                  onChange={(event) => setDemoRoll(Number(event.target.value))}
                />
                <strong>{Math.abs(demoRoll)}°</strong>
              </label>
            </div>
          )}
        </section>

        {settingsOpen && (
          <aside className="clinical-sidebar">
            <section className="sidebar-section">
              <div className="sidebar-title-row">
                <h2>追蹤</h2>
                <span className={`source-badge ${trackingSource}`}>{trackingSource}</span>
              </div>
              <video ref={videoRef} className="camera-preview" playsInline muted />
              <div className="control-row">
                <button
                  className="btn btn-sm btn-primary"
                  type="button"
                  onClick={handleStartCamera}
                  disabled={status === "loading" || status === "running"}
                >
                  <Camera size={18} />
                  啟動鏡頭
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  type="button"
                  onClick={status === "running" ? stop : toggleDemo}
                  aria-pressed={demoActive}
                >
                  {status === "running" ? <CircleStop size={18} /> : <Video size={18} />}
                  {status === "running" ? "停止" : demoActive ? "停止示範" : "示範模式"}
                </button>
              </div>
              <div className="readout-grid">
                <MetricTile
                  label="手部"
                  value={handPresent ? "追蹤中" : "未偵測"}
                  tone={handPresent ? "success" : "warning"}
                />
                <MetricTile label="捏合距離" value={pinchDistance.toFixed(3)} />
                <MetricTile label="旋轉角度" value={`${Math.round(Math.abs(rollAngle))}°`} />
                <MetricTile label="倒水門檻" value={`${Math.round(activePourAngleThreshold)}°`} />
              </div>
              {error && <p className="sidebar-alert">{error}</p>}
            </section>

            <section className="sidebar-section">
              <h2>治療師參數</h2>
              <label className="setting-control">
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
              <label className="setting-control">
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
              <label className="setting-control">
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
              <label className="setting-control">
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
              <div className="compact-fields">
                <label className="field">
                  <span className="label">杯數</span>
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
                  <span className="label">患側</span>
                  <select
                    className="select"
                    value={settings.affectedSide}
                    onChange={(event) =>
                      updateSettings({
                        affectedSide: event.target.value as AffectedSide,
                      })
                    }
                  >
                    <option value="right">右側</option>
                    <option value="left">左側</option>
                    <option value="bilateral">雙側</option>
                  </select>
                </label>
                <label className="field">
                  <span className="label">輔助</span>
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

            <section className="sidebar-section">
              <div className="sidebar-title-row">
                <h2>紀錄</h2>
                <button
                  className="btn btn-sm btn-ghost"
                  type="button"
                  onClick={() => downloadSessionJson(createExport)}
                >
                  <Download size={18} />
                  JSON
                </button>
              </div>
              <div className="readout-grid">
                <MetricTile label="成功抓握" value={`${metrics.successfulGrasps}`} />
                <MetricTile label="掉落" value={`${metrics.drops}`} tone="warning" />
                <MetricTile label="平均時間" value={formatSeconds(metrics.averageCompletionMs)} />
                <MetricTile label="平滑度" value={`${metrics.trajectorySmoothness}`} />
              </div>
              <details className="json-details">
                <summary>Session JSON</summary>
                <pre>{sessionJson}</pre>
              </details>
            </section>
          </aside>
        )}
      </main>
    </div>
  );
}
