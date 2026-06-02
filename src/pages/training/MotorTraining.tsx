import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n';
import { DrawingTowerDefenseGame } from './DrawingTowerDefenseGame';
import { TrainingUserSelector } from './TrainingUserSelector';

type MotorModuleId = 'drawing-defense';

export function MotorTraining() {
  const { t } = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedGameId = searchParams.get('game');
  const [activeModule, setActiveModule] = useState<MotorModuleId | null>(
    requestedGameId === 'drawing-defense' ? 'drawing-defense' : null,
  );

  useEffect(() => {
    setActiveModule(requestedGameId === 'drawing-defense' ? 'drawing-defense' : null);
  }, [requestedGameId]);

  const openDrawingDefense = () => {
    setActiveModule('drawing-defense');
    navigate('/motor-training?game=drawing-defense');
  };

  const closeModule = () => {
    setActiveModule(null);
    navigate('/motor-training');
  };

  if (activeModule === 'drawing-defense') {
    return <DrawingTowerDefenseGame onExit={closeModule} />;
  }

  return (
    <div className="page-content">
      <TrainingUserSelector />

      <h1 className="section-title fade-in-up">{t('home.module.motor.title')}</h1>
      <p className="section-subtitle fade-in-up">選擇動作訓練模組</p>

      <div className="training-grid">
        <button className="card fade-in-up training-module-button" onClick={openDrawingDefense}>
          <div className="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </div>
          <h2 className="card-title">畫畫塔防</h2>
          <p className="card-desc">以滑鼠或觸控繪製圓形、叉叉、方形、三角形與直橫線，訓練上肢精細動作與手眼協調。</p>
          <div className="card-expand-hint">開始訓練</div>
        </button>
      </div>
    </div>
  );
}
