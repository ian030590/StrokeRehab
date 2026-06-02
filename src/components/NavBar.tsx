import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Activity, Mic, Home } from 'lucide-react';

const NavBar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <Activity size={28} />
        NeuroWebRehab
      </Link>
      <div className="nav-links">
        <Link to="/" className={`nav-link ${isActive('/')}`}>
          <Home size={20} />
          <span>首頁</span>
        </Link>
        <Link to="/speech" className={`nav-link ${isActive('/speech')}`}>
          <Mic size={20} />
          <span>語音復健</span>
        </Link>
        <Link to="/cognitive" className={`nav-link ${isActive('/cognitive')}`}>
          <Brain size={20} />
          <span>認知復健</span>
        </Link>
        <Link to="/motor" className={`nav-link ${isActive('/motor')}`}>
          <Activity size={20} />
          <span>動作復健</span>
        </Link>
      </div>
    </nav>
  );
};

export default NavBar;
