import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n';
import { getActiveUser } from '../../utils/settings';

export function TrainingPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get('module') || 'motor-training';
  const userName = getActiveUser() || t('exp.unknownUser');

  let titleKey: any = 'home.module.motor.title';
  if (moduleId === 'cognitive-training') {
    titleKey = 'home.module.cognitive.title';
  } else if (moduleId === 'speech-training') {
    titleKey = 'home.module.speech.title';
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <h1 className="section-title fade-in-up">{t(titleKey)}</h1>
      <p className="section-subtitle fade-in-up">User: {userName}</p>
      
      <div className="card fade-in-up" style={{ padding: 48, marginTop: 32, textAlign: 'center', maxWidth: 600 }}>
        <h2>Training Framework Placeholder</h2>
        <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>
          This is where the actual training logic and components for {t(titleKey)} would be mounted.
        </p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 32 }} onClick={() => navigate('/')}>
          {t('common.back')}
        </button>
      </div>
    </div>
  );
}
