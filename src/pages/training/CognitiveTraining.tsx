import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n';
import { MinesweeperGame } from './MinesweeperGame';
import {
  ReferenceCognitiveGame,
  REFERENCE_COGNITIVE_MODULES,
  type ReferenceGameId,
  isReferenceGameId,
} from './ReferenceCognitiveGame';
import { TrainingUserSelector } from './TrainingUserSelector';

type CognitiveModuleId = 'minesweeper' | ReferenceGameId;

export function CognitiveTraining() {
  const { t } = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedGameId = searchParams.get('game');
  const [activeModule, setActiveModule] = useState<CognitiveModuleId | null>(
    getRequestedModule(requestedGameId),
  );

  useEffect(() => {
    setActiveModule(getRequestedModule(requestedGameId));
  }, [requestedGameId]);

  const openModule = (moduleId: CognitiveModuleId) => {
    setActiveModule(moduleId);
    navigate(`/cognitive-training?game=${moduleId}`);
  };

  const closeModule = () => {
    setActiveModule(null);
    navigate('/cognitive-training');
  };

  if (activeModule === 'minesweeper') {
    return <MinesweeperGame onExit={closeModule} />;
  }

  if (activeModule && isReferenceGameId(activeModule)) {
    return <ReferenceCognitiveGame gameId={activeModule} onExit={closeModule} />;
  }

  return (
    <div className="page-content">
      <TrainingUserSelector />
      <h1 className="section-title fade-in-up">{t('home.module.cognitive.title')}</h1>
      <p className="section-subtitle fade-in-up">選擇認知訓練模組</p>
      <div className="training-grid">
        <button className="card fade-in-up training-module-button" onClick={() => openModule('minesweeper')}>
          <div className="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
              <circle cx="12" cy="12" r="2.2" />
            </svg>
          </div>
          <h2 className="card-title">踩地雷</h2>
          <p className="card-desc">透過開格、推理與標記地雷位置訓練注意力、視覺掃描與策略判斷。</p>
          <div className="card-expand-hint">開始設定</div>
        </button>
        {REFERENCE_COGNITIVE_MODULES.map((module) => (
          <button
            key={module.id}
            className="card fade-in-up training-module-button"
            onClick={() => openModule(module.id)}
          >
            <div className="card-icon cognitive-module-focus">{module.focus}</div>
            <h2 className="card-title">{module.title}</h2>
            <p className="card-desc">{module.description}</p>
            <div className="card-expand-hint">開始設定</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getRequestedModule(requestedGameId: string | null): CognitiveModuleId | null {
  if (requestedGameId === 'minesweeper') return 'minesweeper';
  if (isReferenceGameId(requestedGameId)) return requestedGameId;
  return null;
}
