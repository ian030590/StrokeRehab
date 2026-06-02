import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Mic, Activity, ArrowRight, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="animate-fade-in">
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', background: 'linear-gradient(to right, var(--primary-hover), var(--secondary-hover))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          歡迎來到 NeuroWebRehab
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          完全基於瀏覽器、保障隱私的神經數位復健平台。選擇下方模組開始您的專屬復健旅程。
        </p>
      </header>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <TrendingUp size={24} color="var(--accent-color)" />
          <h2>本週復健進度</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>您本週已完成 0 次訓練，繼續保持！</p>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', marginTop: '1rem' }}>
          <div style={{ width: '5%', background: 'var(--accent-color)', height: '100%', borderRadius: '4px' }}></div>
        </div>
      </div>

      <div className="grid-cards">
        <Link to="/speech" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card glass-panel">
            <div className="card-icon">
              <Mic size={24} />
            </div>
            <h3 className="card-title">語音與語言復健</h3>
            <p className="card-text">
              透過語音辨識與合成技術，訓練看圖命名、聽覺理解與構音清晰度，適合失語症與構音障礙患者。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontWeight: 600 }}>
              開始訓練 <ArrowRight size={16} />
            </div>
          </div>
        </Link>

        <Link to="/cognitive" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card glass-panel">
            <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary-hover)' }}>
              <Brain size={24} />
            </div>
            <h3 className="card-title">認知神經功能</h3>
            <p className="card-text">
              透過 2D 視覺化遊戲進行注意力掃描、工作記憶配對與邏輯分類訓練，活化大腦皮層認知區域。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary-color)', fontWeight: 600 }}>
              開始訓練 <ArrowRight size={16} />
            </div>
          </div>
        </Link>

        <Link to="/motor" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card glass-panel">
            <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-color)' }}>
              <Activity size={24} />
            </div>
            <h3 className="card-title">動作協調與本體感覺</h3>
            <p className="card-text">
              無需穿戴設備，利用攝影機即時動作捕捉，訓練肩肘關節活動度、精細軌跡跟隨與步態律動。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontWeight: 600 }}>
              開始訓練 <ArrowRight size={16} />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
