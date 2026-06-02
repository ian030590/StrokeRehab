import type { TFunction, TrialData } from '../types';

interface GaborResultsProps {
  results: TrialData[];
  userName: string;
  t: TFunction;
}

export function GaborResults({ results, userName, t }: GaborResultsProps) {
  const result = results[0];

  return (
    <>
      <div className="results-score" style={{ color: 'var(--accent)' }}>
        {t('exp.res.score')} {result?.score ?? 0}
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 16,
        fontSize: 14,
        color: 'var(--text-secondary)',
      }}>
        <span>{t('exp.res.acquired')} <b style={{ color: 'var(--accent)' }}>{result?.acquired_targets ?? 0}</b></span>
        <span>{t('home.config.durationLabel')} <b style={{ color: 'var(--accent)' }}>{Math.round((result?.duration_ms ?? 0) / 1000)}s</b></span>
        <span>{t('exp.res.user')} <b>{userName}</b></span>
      </div>
    </>
  );
}
