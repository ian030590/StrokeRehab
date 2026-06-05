import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ACTIVE_USER_CHANGED_EVENT, getActiveUser } from '../utils/settings';
import { downloadAllTrainingRecordsCsv } from '../utils/trainingRecords';
import { useT } from '../i18n';

const navLinkClass = ({ isActive }: { isActive: boolean }) => `navbar-link ${isActive ? 'active' : ''}`;
const logoStyle = { width: 'auto', objectFit: 'contain' } as const;

export function Navbar() {
  const { t } = useT();
  const location = useLocation();
  const [activeUserName, setActiveUserName] = useState(getActiveUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const activeTrainingModule =
    location.pathname === '/' || location.pathname === '/motor-training'
      ? 'motor-training'
      : location.pathname === '/cognitive-training'
        ? 'cognitive-training'
        : location.pathname === '/speech-training'
          ? 'speech-training'
          : location.pathname === '/training'
            ? (new URLSearchParams(location.search).get('module') || 'motor-training')
            : null;

  useEffect(() => {
    const syncUser = () => setActiveUserName(getActiveUser());
    window.addEventListener('storage', syncUser);
    window.addEventListener(ACTIVE_USER_CHANGED_EVENT, syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener(ACTIVE_USER_CHANGED_EVENT, syncUser);
    };
  }, []);

  const toggleMenu = () => setIsMenuOpen((open) => !open);
  const closeMenu = () => setIsMenuOpen(false);
  const trainingLinkClass = (moduleId: string) => `navbar-link ${activeTrainingModule === moduleId ? 'active' : ''}`;
  const handleDownloadScores = () => {
    const downloaded = downloadAllTrainingRecordsCsv(t);
    if (!downloaded) {
      window.alert(t('nav.noScores'));
    }
    closeMenu();
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand" onClick={closeMenu}>
          <img src={`${import.meta.env.BASE_URL}assets/logo2.png`} alt="Stroke Trainer Logo" height="22" style={logoStyle} />
          {t('nav.brand')}
        </NavLink>

        <button className="navbar-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <div className={`navbar-menu ${isMenuOpen ? 'is-open' : ''}`}>
          <div className="navbar-links">
            <NavLink
              to="/motor-training"
              className={() => trainingLinkClass('motor-training')}
              onClick={closeMenu}
            >
              {t('home.module.motor.title')}
            </NavLink>
            <NavLink
              to="/cognitive-training"
              className={() => trainingLinkClass('cognitive-training')}
              onClick={closeMenu}
            >
              {t('home.module.cognitive.title')}
            </NavLink>
            <NavLink
              to="/speech-training"
              className={() => trainingLinkClass('speech-training')}
              onClick={closeMenu}
            >
              {t('home.module.speech.title')}
            </NavLink>
            <NavLink
              to="/settings"
              className={navLinkClass}
              onClick={closeMenu}
            >
              {t('nav.settings')}
            </NavLink>
            <NavLink
              to="/credits"
              className={navLinkClass}
              onClick={closeMenu}
            >
              {t('nav.credits')}
            </NavLink>
            <NavLink
              to="/links"
              className={navLinkClass}
              onClick={closeMenu}
            >
              {t('nav.links')}
            </NavLink>
          </div>

          <div className="navbar-tools">
            <div className="navbar-records">
              <button type="button" className="btn btn-primary btn-sm navbar-download-btn" onClick={handleDownloadScores}>
                {t('nav.downloadScores')}
              </button>
              <span className="navbar-backup-reminder">{t('nav.scoresBackupReminder')}</span>
            </div>

            <div className="navbar-user">
              {activeUserName ? (
                <>
                  <span className="navbar-user-dot" />
                  <span>{activeUserName}</span>
                </>
              ) : (
                <span style={{ color: 'var(--warning)' }}>{t('nav.noUser')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {isMenuOpen && <div className="navbar-overlay" onClick={closeMenu} />}
    </nav>
  );
}
