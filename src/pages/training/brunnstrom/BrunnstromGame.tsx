import { useState } from 'react';
import { CalibrationPhase } from './CalibrationPhase';
import { GamePhase } from './GamePhase';
import type { BrunnstromSettings } from './types';
import { useT } from '../../../i18n';

interface BrunnstromGameProps {
  onExit: () => void;
}

export function BrunnstromGame({ onExit }: BrunnstromGameProps) {
  const { t } = useT();
  const [phase, setPhase] = useState<'CALIBRATION' | 'GAME'>('CALIBRATION');
  const [settings, setSettings] = useState<BrunnstromSettings | null>(null);

  const handleCalibrationComplete = (calibratedSettings: BrunnstromSettings) => {
    setSettings(calibratedSettings);
    setPhase('GAME');
  };

  const handleExit = () => {
    if (window.confirm(t('training.brunnstrom.exitConfirm'))) {
      onExit();
    }
  };

  return (
    <div className="drawing-defense" style={{ backgroundColor: '#f3f4f6' }}>
      <div className="drawing-defense-hud" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
          {t('training.brunnstrom.title')}
        </h1>
        <button 
          onClick={handleExit}
          className="btn btn-sm btn-secondary"
        >
          {t('common.back')}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        {phase === 'CALIBRATION' && (
          <CalibrationPhase onComplete={handleCalibrationComplete} />
        )}
        {phase === 'GAME' && settings && (
          <GamePhase settings={settings} onExit={onExit} />
        )}
      </div>
    </div>
  );
}
