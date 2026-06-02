import type { TFunction, TrialData } from '../types';

interface DrivingResultsProps {
  results: TrialData[];
  userName: string;
  t: TFunction;
}

export function DrivingResults({ results, userName, t }: DrivingResultsProps) {
  const result = results[0];
  const events = result?.driving_events ?? [];

  return (
    <>
      <div className="results-score" style={{ color: 'var(--accent)' }}>
        {result?.average_rt ?? 0} ms
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
        <span>{t('exp.res.validEvents')} <b style={{ color: 'var(--accent)' }}>{result?.valid_event_count ?? 0}</b></span>
        <span>{t('exp.res.collisions')} <b style={{ color: 'var(--accent)' }}>{result?.collisions ?? 0}</b></span>
        <span>{t('exp.res.laneDeviations')} <b style={{ color: 'var(--accent)' }}>{result?.lane_deviations ?? 0}</b></span>
        <span>{t('exp.res.fps')} <b style={{ color: 'var(--accent)' }}>{result?.average_fps ?? '-'}</b></span>
        <span>{t('exp.res.user')} <b>{userName}</b></span>
      </div>

      <table className="results-table" style={{ maxWidth: 920 }}>
        <thead>
          <tr>
            <th>{t('exp.res.thEvent')}</th>
            <th>{t('exp.res.thRt')}</th>
            <th>{t('exp.res.thValid')}</th>
            <th>{t('exp.res.thCollision')}</th>
            <th>{t('exp.res.thResp')}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, i) => (
            <tr key={`${event.event_id}-${i}`}>
              <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{event.label}</td>
              <td>{event.rt_ms ?? '-'}</td>
              <td style={{ color: event.valid ? 'var(--success)' : 'var(--warning)' }}>
                {event.valid ? '✓' : '✗'}
              </td>
              <td style={{ color: event.collision ? 'var(--error)' : 'var(--success)' }}>
                {event.collision ? '✓' : '✗'}
              </td>
              <td>{event.response}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
