import { Brain, Eye, ListChecks } from "lucide-react";

export default function CognitiveTrainingPage() {
  return (
    <main className="page-content page-stack">
      <section className="section-header">
        <p className="page-kicker">訓練模組</p>
        <h1 className="section-title">認知訓練</h1>
        <p className="section-subtitle">
          認知訓練頁保留模組化入口，後續可放入注意力、視覺掃描、工作記憶與執行功能訓練。
        </p>
      </section>

      <section className="module-grid" aria-label="認知訓練模組">
        <article className="module-card is-disabled">
          <div className="module-icon muted">
            <Eye size={28} />
          </div>
          <div className="module-card-body">
            <p className="module-category">視覺注意</p>
            <h2>Visual Search</h2>
            <p>規劃中：在干擾項中尋找目標，紀錄反應時間與漏答率。</p>
          </div>
          <span className="module-status">即將加入</span>
        </article>
        <article className="module-card is-disabled">
          <div className="module-icon muted">
            <Brain size={28} />
          </div>
          <div className="module-card-body">
            <p className="module-category">工作記憶</p>
            <h2>Sequence Recall</h2>
            <p>規劃中：記憶並重現符號或位置序列，追蹤正確率與跨度。</p>
          </div>
          <span className="module-status">即將加入</span>
        </article>
        <article className="module-card is-disabled">
          <div className="module-icon muted">
            <ListChecks size={28} />
          </div>
          <div className="module-card-body">
            <p className="module-category">執行功能</p>
            <h2>Task Switch</h2>
            <p>規劃中：依規則切換反應方式，紀錄切換成本與錯誤類型。</p>
          </div>
          <span className="module-status">即將加入</span>
        </article>
      </section>
    </main>
  );
}
