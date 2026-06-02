import { useT } from '../../i18n';
import { TrainingUserSelector } from './TrainingUserSelector';

export function CognitiveTraining() {
  const { t } = useT();

  return (
    <div className="page-content">
      <TrainingUserSelector />
      <h1 className="section-title fade-in-up">{t('home.module.cognitive.title')}</h1>
      <p className="section-subtitle fade-in-up">選擇認知訓練模組</p>
      <div className="empty-state">尚未新增認知訓練模組</div>
    </div>
  );
}
