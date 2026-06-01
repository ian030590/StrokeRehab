import type { TFunction, TrialData } from '../types';

interface OculomotorResultsProps {
  results: TrialData[];
  userName: string;
  t: TFunction;
  oculomotorMode: string;
  oculomotorPattern: string;
}

export function OculomotorResults({
  results,
  userName,
  t,
  oculomotorMode,
  oculomotorPattern,
}: OculomotorResultsProps) {
  const result = results[0];

  return (
    <>
      <div className="results-score">
        {Math.round((result?.duration_ms ?? 0) / 1000)}s
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
        <span>{t('exp.res.mode')} <b style={{ color: 'var(--accent)' }}>{t(`preset.mode.${result?.mode || oculomotorMode}` as any)}</b></span>
        <span>{t('exp.res.path')} <b style={{ color: 'var(--accent)' }}>{t(`preset.path.${result?.pattern || oculomotorPattern}` as any)}</b></span>
        <span>{t('exp.res.acquired')} <b style={{ color: 'var(--accent)' }}>{result?.acquired_targets ?? 0}</b></span>
        <span>{t('exp.res.fps')} <b style={{ color: 'var(--accent)' }}>{result?.average_fps ?? '-'}</b></span>
        {(result as any)?.aoi_score !== undefined && (
          <span>{t('exp.res.aoi')} <b style={{ color: 'var(--accent)' }}>{(result as any).aoi_score}</b></span>
        )}
        <span>{t('exp.res.user')} <b>{userName}</b></span>
      </div>
    </>
  );
}
