import { Coffee, Dumbbell, Hand, Play } from "lucide-react";
import { useGameStore } from "../store/useGameStore";
import { formatSeconds } from "../utils/format";

export default function MotorTrainingPage({
  onStartCafe,
}: {
  onStartCafe: () => void;
}) {
  const metrics = useGameStore((state) => state.metrics);

  return (
    <main className="page-content page-stack">
      <section className="section-header">
        <p className="page-kicker">訓練模組</p>
        <h1 className="section-title">動作訓練</h1>
        <p className="section-subtitle">
          上肢動作控制訓練以可重複、可調整、可紀錄為核心。治療師可依患者狀態選擇模組與強度。
        </p>
      </section>

      <section className="module-grid" aria-label="動作訓練模組">
        <article className="module-card primary-module">
          <div className="module-icon">
            <Coffee size={28} />
          </div>
          <div className="module-card-body">
            <p className="module-category">精細抓握 / 前臂旋轉</p>
            <h2>Café Barista</h2>
            <p>
              使用捏合、平面移動與手腕旋轉完成倒水任務，適合練習抓握穩定度、伸手控制與旋前旋後。
            </p>
            <div className="module-tags">
              <span className="tag tag-motor">MediaPipe 手部追蹤</span>
              <span className="tag">CSV 成績</span>
              <span className="tag">可調難度</span>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" type="button" onClick={onStartCafe}>
            <Play size={20} />
            開始模組
          </button>
        </article>

        <article className="module-card is-disabled">
          <div className="module-icon muted">
            <Hand size={28} />
          </div>
          <div className="module-card-body">
            <p className="module-category">手指分離控制</p>
            <h2>Finger Sequencer</h2>
            <p>規劃中：依序觸發不同手指動作，訓練手指選擇性控制。</p>
          </div>
          <span className="module-status">即將加入</span>
        </article>

        <article className="module-card is-disabled">
          <div className="module-icon muted">
            <Dumbbell size={28} />
          </div>
          <div className="module-card-body">
            <p className="module-category">肩肘協調</p>
            <h2>Reach Targets</h2>
            <p>規劃中：多方向目標觸碰，追蹤上肢伸手路徑與反應時間。</p>
          </div>
          <span className="module-status">即將加入</span>
        </article>
      </section>

      <section className="summary-band" aria-label="最近訓練摘要">
        <div>
          <span>最近完成</span>
          <strong>{metrics.completedCups} 杯</strong>
        </div>
        <div>
          <span>成功抓握</span>
          <strong>{metrics.successfulGrasps}</strong>
        </div>
        <div>
          <span>掉落次數</span>
          <strong>{metrics.drops}</strong>
        </div>
        <div>
          <span>平均完成時間</span>
          <strong>{formatSeconds(metrics.averageCompletionMs)}</strong>
        </div>
      </section>
    </main>
  );
}
