import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ACTIVE_USER_CHANGED_EVENT, SETTINGS_CHANGED_EVENT, getActiveUser } from '../utils/settings';
import { downloadAllTrainingRecordsCsv } from '../utils/trainingRecords';
import { useT } from '../i18n';

const navLinkClass = ({ isActive }: { isActive: boolean }) => `navbar-link ${isActive ? 'active' : ''}`;
const logoStyle = { width: 'auto', objectFit: 'contain' } as const;

export function Navbar() {
  const { t } = useT();
  const location = useLocation();
  const navbarInnerRef = useRef<HTMLDivElement | null>(null);
  const navbarMeasureRef = useRef<HTMLDivElement | null>(null);
  const [activeUserName, setActiveUserName] = useState(getActiveUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDownloadingScores, setIsDownloadingScores] = useState(false);
  const [useSidebarLayout, setUseSidebarLayout] = useState(false);
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
  const trainingLinkClass = (moduleId: string) => `navbar-link ${activeTrainingModule === moduleId ? 'active' : ''}`;
  const navItems = [
    { to: '/motor-training', className: () => trainingLinkClass('motor-training'), label: t('home.module.motor.title') },
    { to: '/cognitive-training', className: () => trainingLinkClass('cognitive-training'), label: t('home.module.cognitive.title') },
    { to: '/speech-training', className: () => trainingLinkClass('speech-training'), label: t('home.module.speech.title') },
    { to: '/settings', className: navLinkClass, label: t('nav.settings') },
    { to: '/credits', className: navLinkClass, label: t('nav.credits') },
    { to: '/links', className: navLinkClass, label: t('nav.links') },
  ];

  useEffect(() => {
    const syncUser = () => setActiveUserName(getActiveUser());
    window.addEventListener('storage', syncUser);
    window.addEventListener(ACTIVE_USER_CHANGED_EVENT, syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener(ACTIVE_USER_CHANGED_EVENT, syncUser);
    };
  }, []);

  const recalculateSidebarLayout = useCallback(() => {
    const inner = navbarInnerRef.current;
    const measure = navbarMeasureRef.current;
    if (!inner || !measure) return;
    const isNarrowViewport = window.matchMedia('(max-width: 1120px)').matches;
    const availableWidth = inner.clientWidth;
    const requiredWidth = measure.scrollWidth;
    setUseSidebarLayout(isNarrowViewport || requiredWidth + 12 > availableWidth);
  }, []);

  useLayoutEffect(() => {
    let animationFrame = 0;
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(recalculateSidebarLayout);
    };
    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    if (navbarInnerRef.current) resizeObserver.observe(navbarInnerRef.current);
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener(SETTINGS_CHANGED_EVENT, scheduleMeasure);
    document.fonts?.ready.then(scheduleMeasure).catch(() => undefined);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, scheduleMeasure);
    };
  }, [activeUserName, recalculateSidebarLayout, t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(recalculateSidebarLayout, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeUserName, recalculateSidebarLayout, t]);

  useEffect(() => {
    if (!useSidebarLayout) setIsMenuOpen(false);
  }, [useSidebarLayout]);

  const toggleMenu = () => setIsMenuOpen((open) => !open);
  const closeMenu = () => setIsMenuOpen(false);
  const handleDownloadScores = async () => {
    if (isDownloadingScores) return;
    setIsDownloadingScores(true);
    try {
      const downloaded = await downloadAllTrainingRecordsCsv(t);
      if (!downloaded) {
        window.alert(t('nav.noScores'));
      }
      closeMenu();
    } finally {
      setIsDownloadingScores(false);
    }
  };

  return (
    <nav className={`navbar ${useSidebarLayout ? 'navbar-sidebar' : ''}`}>
      <div className="navbar-inner" ref={navbarInnerRef}>
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
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={item.className}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="navbar-tools">
            <div className="navbar-records">
              <button
                type="button"
                className="btn btn-primary btn-sm navbar-download-btn"
                disabled={isDownloadingScores}
                onClick={() => void handleDownloadScores()}
              >
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
      <div className="navbar-measure" ref={navbarMeasureRef} aria-hidden="true">
        <span className="navbar-brand">
          <img src={`${import.meta.env.BASE_URL}assets/logo2.png`} alt="" height="22" style={logoStyle} />
          {t('nav.brand')}
        </span>
        <div className="navbar-measure-menu">
          <div className="navbar-links">
            {navItems.map((item) => (
              <span key={item.to} className="navbar-link">
                {item.label}
              </span>
            ))}
          </div>
          <div className="navbar-tools">
            <div className="navbar-records">
              <span className="btn btn-primary btn-sm navbar-download-btn">
                {t('nav.downloadScores')}
              </span>
              <span className="navbar-backup-reminder">{t('nav.scoresBackupReminder')}</span>
            </div>
            <div className="navbar-user">
              <span className="navbar-user-dot" />
              <span>{activeUserName || t('nav.noUser')}</span>
            </div>
          </div>
        </div>
      </div>
      {isMenuOpen && <div className="navbar-overlay" onClick={closeMenu} />}
    </nav>
  );
}
