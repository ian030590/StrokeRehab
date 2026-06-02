import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useT } from '../i18n';

const navLinkClass = ({ isActive }: { isActive: boolean }) => `navbar-link ${isActive ? 'active' : ''}`;
const logoStyle = { width: 'auto', objectFit: 'contain' } as const;

const navItems = [
  { to: '/motor', labelKey: 'nav.trainingList', end: false },
  { to: '/cognitive', labelKey: 'nav.cognitiveTraining', end: false },
  { to: '/language', labelKey: 'nav.languageTraining', end: false },
  { to: '/settings', labelKey: 'nav.settings', end: false },
  { to: '/credits', labelKey: 'nav.credits', end: false },
  { to: '/links', labelKey: 'nav.links', end: false },
] as const;

export function Navbar() {
  const { t } = useT();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((open) => !open);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/motor" className="navbar-brand" onClick={closeMenu}>
          <img src={`${import.meta.env.BASE_URL}assets/logo.png`} alt="Stroke Trainer Logo" height="22" style={logoStyle} />
          {t('nav.brand')}
        </NavLink>

        <button className="navbar-toggle" onClick={toggleMenu} aria-label={t('nav.toggleMenu')} aria-expanded={isOpen}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isOpen ? (
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

        <div className={`navbar-menu ${isOpen ? 'is-open' : ''}`}>
          <div className="navbar-links" aria-label={t('nav.primary')}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navLinkClass}
                onClick={closeMenu}
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
      {isOpen && <div className="navbar-overlay" onClick={closeMenu} />}
    </nav>
  );
}
