import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const navLinkClass = ({ isActive }: { isActive: boolean }) => `navbar-link ${isActive ? 'active' : ''}`;
const logoStyle = { width: 'auto', objectFit: 'contain' } as const;

const navItems = [
  { to: '/motor', label: '動作訓練', end: false },
  { to: '/cognitive', label: '認知訓練', end: false },
  { to: '/language', label: '語言訓練', end: false },
  { to: '/settings', label: '設定', end: false },
  { to: '/credits', label: '致謝', end: false },
  { to: '/links', label: '相關網站', end: false },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((open) => !open);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="navbar stroke-navbar">
      <div className="navbar-inner">
        <NavLink to="/motor" className="navbar-brand" onClick={closeMenu}>
          <img src={`${import.meta.env.BASE_URL}assets/logo.svg`} alt="Stroke Trainer Logo" height="22" style={logoStyle} />
          Stroke Trainer
        </NavLink>

        <button className="navbar-toggle" onClick={toggleMenu} aria-label="切換導覽選單" aria-expanded={isOpen}>
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
          <div className="navbar-links" aria-label="主要導覽">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navLinkClass}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
      {isOpen && <div className="navbar-overlay" onClick={closeMenu} />}
    </nav>
  );
}
