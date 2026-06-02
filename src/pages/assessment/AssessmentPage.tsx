import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../i18n';
import { getActiveUser, getSetting, setSetting } from '../../utils/settings';
import type { TestType } from './logic/optotypeRenderer';

interface TestCard {
  id: TestType;
  title: string;
  desc: string;
  icon: ReactNode;
  nAlt: number;
  defaultTrials: number;
}

const getTestCards = (t: any): TestCard[] => [
    {
      id: 'landolt',
      title: t('assess.landolt.title'),
      desc: t('assess.landolt.desc'),
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.65 17.65A8 8 0 1 1 17.65 6.35" />
        </svg>
      ),
      nAlt: 8,
      defaultTrials: 18,
    },
    {
      id: 'tumblingE',
      title: t('assess.tumblingE.title'),
      desc: t('assess.tumblingE.desc'),
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 5h9 M8 12h7 M8 19h9 M8 5v14" />
        </svg>
      ),
      nAlt: 4,
      defaultTrials: 24,
    },
    {
      id: 'letters',
      title: t('assess.sloan.title'),
      desc: t('assess.sloan.desc'),
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" x2="15" y1="20" y2="20" />
          <line x1="12" x2="12" y1="4" y2="20" />
        </svg>
      ),
      nAlt: 10,
      defaultTrials: 18,
    },
    {
      id: 'pictures',
      title: t('assess.shapes.title'),
      desc: t('assess.shapes.desc'),
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      nAlt: 4,
      defaultTrials: 24,
    },
    {
      id: 'gratings',
      title: t('assess.pl.title'),
      desc: t('assess.pl.desc'),
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="8" y1="4.5" x2="8" y2="19.5" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="16" y1="4.5" x2="16" y2="19.5" />
        </svg>
      ),
      nAlt: 2,
      defaultTrials: 36,
    },
    {
      id: 'contrast',
      title: t('assess.contrast.title') || 'Contrast Sensitivity',
      desc: t('assess.contrast.desc') || 'Measure your contrast sensitivity function.',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18A9 9 0 0 0 12 3z" fill="currentColor" />
        </svg>
      ),
      nAlt: 8,
      defaultTrials: 18,
    },
];

export function AssessmentPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const activeUser = getActiveUser();
  const distanceCM = getSetting('distanceInCM');

  const [expandedTest, setExpandedTest] = useState<TestType | null>(null);
  const [localTrials, setLocalTrials] = useState<number>(18);
  const [customTrialsInput, setCustomTrialsInput] = useState('');
  const [plInputMode, setPlInputMode] = useState<'keyboard' | 'webgazer'>(
    () => getSetting('preferentialLookingInputMode'),
  );

  const handleCardClick = (testId: TestType) => {
    if (!activeUser) {
      alert(t('home.pleaseSelectUser'));
      return;
    }
    if (expandedTest === testId) {
      setExpandedTest(null);
    } else {
      setExpandedTest(testId);
      const card = TEST_CARDS.find((c) => c.id === testId)!;
      setLocalTrials(card.defaultTrials);
      setCustomTrialsInput('');
    }
  };

  const TEST_CARDS = getTestCards(t);

  const handleStartTest = () => {
    if (!expandedTest || !activeUser) return;
    const params = new URLSearchParams({
      test: expandedTest,
      trials: localTrials.toString(),
    });
    if (expandedTest === 'gratings') {
      params.set('mode', plInputMode);
    }
    
    if (expandedTest === 'contrast') {
      navigate(`/contrast-test?${params.toString()}`);
    } else {
      navigate(`/acuity-test?${params.toString()}`);
    }
  };

  const handlePLInputMode = (mode: 'keyboard' | 'webgazer') => {
    setPlInputMode(mode);
    setSetting('preferentialLookingInputMode', mode);
  };

  const handleTrialsPreset = (n: number) => {
    setLocalTrials(n);
    setCustomTrialsInput('');
  };

  const handleCustomTrials = (val: string) => {
    setCustomTrialsInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 100) {
      setLocalTrials(num);
    }
  };

  const expandedCard = TEST_CARDS.find((c) => c.id === expandedTest);
  const trialsPresets = [12, 18, 24, 36];

  return (
    <div className="page-content">
      {/* Disclaimer */}
      <div className="assessment-disclaimer fade-in">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{t('assess.disclaimer')}</span>
      </div>

      <h1 className="section-title fade-in-up">{t('nav.assessment')}</h1>
      <p className="section-subtitle fade-in-up">
        {t('assess.subtitle')}
      </p>

      {/* Test Cards Grid */}
      <div className="assessment-grid">
        {TEST_CARDS.map((card) => (
          <div
            key={card.id}
            className={`card fade-in-up ${expandedTest === card.id ? 'card-active' : ''}`}
            onClick={() => handleCardClick(card.id)}
          >
            <div className="card-icon" style={{ fontSize: 36 }}>{card.icon}</div>
            <div className="card-title">{card.title}</div>
            <div className="card-desc">{card.desc}</div>
            <div className="card-meta">
              <span>{card.nAlt} {t('assess.options')}</span>
              <span>•</span>
              <span>{t('assess.defaultTrials').replace('{n}', card.defaultTrials.toString())}</span>
            </div>
            <div className="card-expand-hint">
              {expandedTest === card.id ? t('btn.collapseSettings') : t('btn.selectTest')}
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{
                  transform: expandedTest === card.id ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Config Panel */}
      {expandedTest && expandedCard && (
        <div className="config-modal-overlay fade-in" onClick={() => setExpandedTest(null)}>
          <div className="module-config-panel config-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="config-section">
              <div className="config-label">{t('assess.trialsLabel')}</div>
              <div className="rounds-selector">
                {trialsPresets.map((r) => (
                  <button
                    key={r}
                    className={`rounds-btn ${localTrials === r && !customTrialsInput ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleTrialsPreset(r); }}
                  >
                    {r}
                  </button>
                ))}
                <input
                  className="rounds-custom-input"
                  type="number"
                  min="1"
                  max="100"
                  placeholder={t('home.config.custom')}
                  value={customTrialsInput}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleCustomTrials(e.target.value)}
                />
              </div>
            </div>

            {expandedTest === 'gratings' && (
              <div className="config-section">
                <div className="config-label">{t('assess.plMethodTitle')}</div>
                <div className="difficulty-selector">
                  <button
                    className={`diff-btn ${plInputMode === 'keyboard' ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePLInputMode('keyboard');
                    }}
                  >
                    <span className="diff-btn-label">{t('assess.kbMode')}</span>
                    <span className="diff-btn-desc">{t('assess.kbModeDesc')}</span>
                  </button>
                  <button
                    className={`diff-btn ${plInputMode === 'webgazer' ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePLInputMode('webgazer');
                    }}
                  >
                    <span className="diff-btn-label">{t('assess.wgMode')}</span>
                    <span className="diff-btn-desc">{t('assess.wgModeDesc')}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="config-actions">
              <button
                className="btn btn-primary btn-lg config-start-btn"
                onClick={(e) => { e.stopPropagation(); handleStartTest(); }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                {t('btn.startTest')}
              </button>
              <button
                className="btn btn-ghost btn-lg"
                onClick={(e) => { e.stopPropagation(); setExpandedTest(null); }}
              >
                {t('btn.cancel')}
              </button>
            </div>

            <div className="config-summary">
              {t('assess.config.user')} <strong>{activeUser}</strong> ·{' '}
              {t('assess.config.test')} <strong>{expandedCard.title}</strong> ·{' '}
              {t('assess.config.trials')} <strong>{localTrials}</strong> ·{' '}
              {t('assess.config.dist')} <strong>{distanceCM} cm</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
