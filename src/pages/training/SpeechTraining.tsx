import { useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n';
import { TrainingUserSelector } from './TrainingUserSelector';
import { useGameModuleGuard } from './useGameModuleGuard';
import { VoiceDefenderGame } from './VoiceDefenderGame';

type SpeechModuleId = 'voice-defender';

export function SpeechTraining() {
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const requestedGameId = searchParams.get('game');
  const requestedModule = requestedGameId === 'voice-defender' ? 'voice-defender' : null;
  const { activeModule, openModule, closeModule } = useGameModuleGuard<SpeechModuleId>({
    requestedGameId,
    requestedModule,
    basePath: '/speech-training',
    t,
  });

  if (activeModule === 'voice-defender') {
    return <VoiceDefenderGame onExit={closeModule} />;
  }

  return (
    <div className="page-content">
      <TrainingUserSelector />
      <h1 className="section-title fade-in-up">{t('home.module.speech.title')}</h1>
      <p className="section-subtitle fade-in-up">{t('training.speech.subtitle')}</p>
      <div className="training-grid">
        <button className="card fade-in-up training-module-button" onClick={() => openModule('voice-defender')}>
          <div className="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <path d="M12 19v3" />
              <path d="M8 22h8" />
              <path d="M18 4h3v5" />
              <path d="m21 4-4 4" />
            </svg>
          </div>
          <h2 className="card-title">{t('voice.title')}</h2>
          <p className="card-desc">{t('voice.desc')}</p>
          <div className="card-expand-hint">{t('training.startGame')}</div>
        </button>
      </div>
    </div>
  );
}
