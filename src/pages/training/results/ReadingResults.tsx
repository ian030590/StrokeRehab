import { getSetting } from '../../../utils/settings';
import type { TFunction, TrialData } from '../types';

interface ReadingResultsProps {
  results: TrialData[];
  userName: string;
  t: TFunction;
}

export function ReadingResults({ results, userName, t }: ReadingResultsProps) {
  const questions = results.filter((result) => result.trial_type === 'html-button-response');
  const correct = questions.filter((result) => result.correct).length;
  const readingTime = results.find((result) => result.trial_type === 'pixi-reading-training')?.reading_time || 0;

  return (
    <>
      <div className="results-score">{correct}/{questions.length}</div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 16,
        fontSize: 14,
        color: 'var(--text-secondary)',
      }}>
        <span>{t('exp.res.user')} <b>{userName}</b></span>
        <span>WPS: <b style={{ color: 'var(--accent)' }}>{getSetting('readingWPS')}</b></span>
        <span>Crowding: <b style={{ color: 'var(--accent)' }}>{getSetting('readingCrowding')}</b></span>
        <span>Total Time: <b style={{ color: 'var(--accent)' }}>{Math.round(readingTime / 100) / 10} s</b></span>
      </div>

      <table className="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('exp.res.thTarget')}</th>
            <th>{t('exp.res.thResp')}</th>
            <th>{t('exp.res.thCorrect')}</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((result: any, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{result.target}</td>
              <td>{result.response_text}</td>
              <td style={{ color: result.correct ? 'var(--success)' : 'var(--error)' }}>
                {result.correct ? '✓' : '✗'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
