import { Download, RotateCcw } from "lucide-react";
import MetricTile from "../components/MetricTile";
import { createSessionFilename, sessionExportToCsv } from "../rehab/exporters";
import { useGameStore } from "../store/useGameStore";
import { downloadTextFile } from "../utils/download";
import { formatDateTime, formatSeconds } from "../utils/format";

export default function ResultsPage({
  onNewTraining,
}: {
  onNewTraining: () => void;
}) {
  const createExport = useGameStore((state) => state.createExport);
  const resetSession = useGameStore((state) => state.resetSession);
  const session = createExport();
  const hasRounds = session.rounds.length > 0;

  const downloadCsv = () => {
    downloadTextFile({
      content: sessionExportToCsv(session),
      filename: createSessionFilename("csv"),
      mimeType: "text/csv;charset=utf-8",
    });
  };

  return (
    <main className="page-content page-stack results-page">
      <section className="section-header">
        <p className="page-kicker">訓練完成</p>
        <h1 className="section-title">成績結算</h1>
        <p className="section-subtitle">
          本頁彙整本次 Café Barista 訓練資料，可下載 CSV 供治療師後續分析。
        </p>
      </section>

      <section className="results-toolbar">
        <div>
          <span>開始時間</span>
          <strong>{formatDateTime(session.startedAt)}</strong>
        </div>
        <div>
          <span>結束時間</span>
          <strong>{formatDateTime(session.endedAt)}</strong>
        </div>
        <button className="btn btn-primary" type="button" onClick={downloadCsv} disabled={!hasRounds}>
          <Download size={20} />
          下載 CSV
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            resetSession();
            onNewTraining();
          }}
        >
          <RotateCcw size={20} />
          新訓練
        </button>
      </section>

      <section className="results-grid" aria-label="訓練成績摘要">
        <MetricTile label="完成杯數" value={`${session.summary.completedCups}`} tone="success" />
        <MetricTile label="成功抓握" value={`${session.summary.successfulGrasps}`} />
        <MetricTile label="掉落次數" value={`${session.summary.drops}`} tone="warning" />
        <MetricTile
          label="平均完成時間"
          value={formatSeconds(session.summary.averageCompletionMs)}
        />
        <MetricTile label="最大旋轉角度" value={`${session.summary.maxRomDeg}°`} />
        <MetricTile label="軌跡平滑度" value={`${session.summary.trajectorySmoothness}`} />
        <MetricTile label="抓握/掉落比" value={session.summary.graspToDropRatio} />
        <MetricTile label="計畫杯數" value={`${session.summary.plannedCups}`} />
      </section>

      <section className="results-table-card">
        <div className="sidebar-title-row">
          <h2>每回合紀錄</h2>
          <span className="module-status">{session.game}</span>
        </div>
        {hasRounds ? (
          <div className="table-scroll">
            <table className="results-table">
              <thead>
                <tr>
                  <th>回合</th>
                  <th>完成時間</th>
                  <th>掉落</th>
                  <th>最大 ROM</th>
                  <th>平滑度</th>
                  <th>動態輔助</th>
                  <th>軌跡點</th>
                </tr>
              </thead>
              <tbody>
                {session.rounds.map((round) => (
                  <tr key={round.round}>
                    <td>{round.round}</td>
                    <td>{formatSeconds(round.completionTimeMs ?? 0)}</td>
                    <td>{round.drops}</td>
                    <td>{Math.round(round.maxRomDeg)}°</td>
                    <td>{round.smoothnessScore ?? "-"}</td>
                    <td>{round.assistanceApplied ? "有" : "無"}</td>
                    <td>{round.trajectory.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">尚無完整訓練紀錄。</p>
        )}
      </section>
    </main>
  );
}
