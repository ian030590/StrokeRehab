import { useT } from '../../i18n';
import { TrainingUserSelector } from './TrainingUserSelector';

export function SpeechTraining() {
  const { t } = useT();

  return (
    <div className="page-content">
      <TrainingUserSelector />
      <h1 className="section-title fade-in-up">{t('home.module.speech.title')}</h1>
      <p className="section-subtitle fade-in-up">{t('training.speech.subtitle')}</p>
      <div className="empty-state">{t('training.speech.empty')}</div>
    </div>
  );
}
