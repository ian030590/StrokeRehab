import { useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n';
import { DrawingTowerDefenseGame } from './DrawingTowerDefenseGame';
import { TrainingUserSelector } from './TrainingUserSelector';
import { useGameModuleGuard } from './useGameModuleGuard';

type MotorModuleId = 'drawing-defense';

export function MotorTraining() {
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const requestedGameId = searchParams.get('game');
  const requestedModule = requestedGameId === 'drawing-defense' ? 'drawing-defense' : null;
  const { activeModule, openModule, closeModule } = useGameModuleGuard<MotorModuleId>({
    requestedGameId,
    requestedModule,
    basePath: '/motor-training',
    t,
  });

  if (activeModule === 'drawing-defense') {
    return <DrawingTowerDefenseGame onExit={closeModule} />;
  }

  return (
    <div className="page-content">
      <TrainingUserSelector />

      <h1 className="section-title fade-in-up">{t('home.module.motor.title')}</h1>
      <p className="section-subtitle fade-in-up">{t('training.motor.subtitle')}</p>

      <div className="training-grid">
        <button className="card fade-in-up training-module-button" onClick={() => openModule('drawing-defense')}>
          <div className="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </div>
          <h2 className="card-title">{t('training.drawing.title')}</h2>
          <p className="card-desc">{t('training.drawing.desc')}</p>
          <div className="card-expand-hint">{t('training.startGame')}</div>
        </button>


      </div>
    </div>
  );
}
