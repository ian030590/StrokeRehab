import type { TFunction, TrialData } from '../types';

interface DefaultTrainingResultsProps {
  results: TrialData[];
  userName: string;
  t: TFunction;
}

export function DefaultTrainingResults({ results, userName, t }: DefaultTrainingResultsProps) {
  const averageRt = results.length > 0
    ? Math.round(results.reduce((sum, result) => sum + result.rt, 0) / results.length)
    : 0;
  const correctCount = results.filter((result) => result.correct).length;
  const sortedRts = [...results].map((result) => result.rt).sort((a, b) => a - b);
  const medianRt = sortedRts.length > 0
    ? (sortedRts.length % 2
      ? sortedRts[Math.floor(sortedRts.length / 2)]
      : Math.round((sortedRts[Math.floor(sortedRts.length / 2) - 1] + sortedRts[Math.floor(sortedRts.length / 2)]) / 2))
    : 0;

  return (
    <>
      <div className="results-score">{correctCount}/{results.length}</div>
      <div style={{
        display: 'flex',
        gap: 32,
        marginBottom: 16,
        fontSize: 14,
        color: 'var(--text-secondary)',
      }}>
        <span>{t('exp.res.avgRt')} <b style={{ color: 'var(--accent)' }}>{averageRt} ms</b></span>
        <span>{t('exp.res.medRt')} <b style={{ color: 'var(--accent)' }}>{medianRt} ms</b></span>
        <span>{t('exp.res.user')} <b>{userName}</b></span>
      </div>

      <table className="results-table">
        <thead>
          <tr>
            <th>{t('exp.res.thRound')}</th>
            <th>{t('exp.res.thTarget')}</th>
            <th>{t('exp.res.thResp')}</th>
            <th>{t('exp.res.thCorrect')}</th>
            <th>{t('exp.res.thRt')}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{result.target}</td>
              <td>{result.response}</td>
              <td style={{ color: result.correct ? 'var(--success)' : 'var(--error)' }}>
                {result.correct ? '✓' : '✗'}
              </td>
              <td className={result.rt < averageRt ? 'rt-fast' : result.rt > averageRt * 1.5 ? 'rt-slow' : ''}>
                {result.rt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
