import React, { useState } from 'react';
import { useT } from '../../i18n';
import {
  getSetting,
  setSetting,
  isCalibrated,
  markDisplayCalibrated,
  clearDisplayCalibration,
  getMMPerPixel,
  CAL_BAR_LENGTH_PX,
  CARD_WIDTH_MM,
  CARD_HEIGHT_MM,
} from '../../utils/settings';
import { pixelFromMillimeter } from '../../utils/spatialUtils';

/* ── Calibration Tab ── */
export function CalibrationTab({ refresh }: { refresh: () => void }) {
  const { t } = useT();
  const [calMode, setCalMode] = useState<'ruler' | 'card'>('ruler');
  const calibrated = isCalibrated();
  const mmPerPx = getMMPerPixel();

  return (
    <div className="fade-in">
      {/* Mode Switch */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          className={`btn btn-sm ${calMode === 'ruler' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setCalMode('ruler')}
        >
          {t('settings.cal.rulerMode')}
        </button>
        <button
          className={`btn btn-sm ${calMode === 'card' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setCalMode('card')}
        >
          {t('settings.cal.cardMode')}
        </button>
      </div>

      {calMode === 'ruler' ? (
        <RulerCalibration refresh={refresh} />
      ) : (
        <CardCalibration refresh={refresh} />
      )}

      {/* Info */}
      <div className="cal-info" style={{ color: calibrated ? 'var(--success)' : 'var(--warning)' }}>
        <p>{t('settings.cal.resolution')} {mmPerPx.toFixed(3)} mm/px ({(1 / mmPerPx).toFixed(2)} px/mm)</p>
        <p style={{ fontWeight: 600, marginTop: 4 }}>
          {calibrated ? t('settings.cal.done') : t('settings.cal.notDone')}
        </p>
      </div>
    </div>
  );
}

export function RulerCalibration({ refresh }: { refresh: () => void }) {
  const { t } = useT();
  const [inputVal, setInputVal] = useState('');
  const rulerBarPx = 500;

  const handleApply = () => {
    const val = parseFloat(inputVal);
    if (!isNaN(val) && val > 0 && val <= 10000) {
      setSetting('rulerLengthInMM', val);
      const pxPerMM = rulerBarPx / val;
      const newCalBarMM = CAL_BAR_LENGTH_PX / pxPerMM;
      setSetting('calBarLengthInMM', newCalBarMM);
      markDisplayCalibrated();
      refresh();
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.8 }}>
        {t('settings.cal.rulerInst1')}<br />
        {t('settings.cal.rulerInst2')}
      </p>
      <div className="cal-ruler-bar" style={{ width: rulerBarPx }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
        <input
          className="input"
          style={{ width: 160 }}
          type="number"
          placeholder={t('settings.cal.rulerPlaceholder')}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        />
        <button className="btn btn-primary btn-sm" onClick={handleApply}>{t('btn.confirm')}</button>
      </div>
    </div>
  );
}

export function CardCalibration({ refresh }: { refresh: () => void }) {
  const { t } = useT();
  const wPx = pixelFromMillimeter(CARD_WIDTH_MM);
  const hPx = pixelFromMillimeter(CARD_HEIGHT_MM);
  const factors = [1.1, 1.01, 1.0 / 1.01, 1.0 / 1.1];
  const labels = ['− −', '−', '+', '+ +'];

  const handleAdjust = (factor: number) => {
    const current = getSetting('calBarLengthInMM');
    setSetting('calBarLengthInMM', current * factor);
    markDisplayCalibrated();
    refresh();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.8 }}>
        {t('settings.cal.cardInst1')}<br />
        {t('settings.cal.cardInst2')}
      </p>
      <div
        className="cal-card-outline"
        style={{ width: wPx, height: hPx }}
      >
        <span style={{
          position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)',
          fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap',
        }}>
          {CARD_WIDTH_MM}mm × {CARD_HEIGHT_MM}mm
        </span>
      </div>
      <div className="cal-controls" style={{ marginTop: 36 }}>
        {labels.map((label, i) => (
          <button
            key={label}
            className="btn btn-secondary btn-sm"
            onClick={() => handleAdjust(factors[i])}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        className="btn btn-danger btn-sm"
        style={{ marginTop: 16 }}
        onClick={() => { setSetting('calBarLengthInMM', 149); clearDisplayCalibration(); refresh(); }}
      >
        {t('settings.cal.resetBtn')}
      </button>
    </div>
  );
}
