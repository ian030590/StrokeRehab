export default function CreditsPage() {
  return (
    <main className="page-content page-stack">
      <section className="section-header">
        <p className="page-kicker">專案資訊</p>
        <h1 className="section-title">致謝</h1>
        <p className="section-subtitle">
          StrokeRehab 是以臨床訓練流程為中心的網頁復健工具，感謝開源社群與復健專業需求提供設計基礎。
        </p>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>核心技術</h2>
          <p>React、TypeScript、Vite、Zustand、Three.js、React Three Fiber 與 MediaPipe。</p>
        </article>
        <article className="info-card">
          <h2>設計原則</h2>
          <p>介面以高可讀性、穩定尺寸、清楚回饋與治療師可調整參數為優先。</p>
        </article>
        <article className="info-card">
          <h2>使用提醒</h2>
          <p>本工具用於訓練與紀錄輔助，不取代專業醫療評估、診斷或治療建議。</p>
        </article>
      </section>
    </main>
  );
}
