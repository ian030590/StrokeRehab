import { Activity } from "lucide-react";
import type { ReactNode } from "react";
import { navItems, type AppPage, type MainPage } from "../navigation";

export default function AppShell({
  activePage,
  onNavigate,
  children,
}: {
  activePage: AppPage;
  onNavigate: (page: MainPage) => void;
  children: ReactNode;
}) {
  return (
    <div className="app-layout stroke-app">
      <header className="site-header">
        <a className="site-brand" href="#/motor" aria-label="StrokeRehab 首頁">
          <span className="site-brand-mark">
            <Activity size={24} />
          </span>
          <span>
            <strong>StrokeRehab</strong>
            <small>神經復健訓練平台</small>
          </span>
        </a>
        <nav className="site-nav" aria-label="主要導覽">
          {navItems.map(({ page, label, icon: Icon }) => (
            <button
              key={page}
              className="site-nav-link"
              type="button"
              aria-current={activePage === page ? "page" : undefined}
              onClick={() => onNavigate(page)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
