import { useState, type ReactNode } from "react";
import { navItems, type AppPage } from "../navigation";

function downloadTrainingTemplate() {
  const exportedAt = new Date().toISOString();
  const csv = [
    ["exported_at", "module", "intensity", "duration_min", "side", "assist_level", "notes"],
    [exportedAt, "", "", "", "", "", ""],
  ]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "stroke-rehab-training-records.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function AppShell({
  activePage,
  onNavigate,
  children,
}: {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    setIsOpen(false);
  };

  const handleDownload = () => {
    downloadTrainingTemplate();
    setIsOpen(false);
  };

  return (
    <div className="app-layout stroke-app">
      <nav className="navbar stroke-navbar">
        <div className="navbar-inner">
          <button
            className="navbar-brand"
            type="button"
            aria-label="StrokeRehab 首頁"
            onClick={() => handleNavigate("motor")}
          >
            <span className="navbar-brand-mark" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-4.6-7-11a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 6.4-7 11-7 11Z" />
                <path d="M8 13h3l1.5-3 2 5 1-2H19" />
              </svg>
            </span>
            StrokeRehab
          </button>

          <button
            className="navbar-toggle"
            type="button"
            aria-label="切換導覽選單"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

          <div className={`navbar-menu ${isOpen ? "is-open" : ""}`}>
            <div className="navbar-links" aria-label="主要導覽">
              {navItems.map(({ page, label }) => (
                <button
                  key={page}
                  className={`navbar-link ${activePage === page ? "active" : ""}`}
                  type="button"
                  aria-current={activePage === page ? "page" : undefined}
                  onClick={() => handleNavigate(page)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="navbar-tools">
              <div className="navbar-records">
                <button className="btn btn-primary btn-sm navbar-download-btn" type="button" onClick={handleDownload}>
                  下載紀錄
                </button>
                <span className="navbar-backup-reminder">建議定期備份訓練紀錄</span>
              </div>
            </div>
          </div>
        </div>
        {isOpen && <div className="navbar-overlay" role="presentation" onClick={() => setIsOpen(false)} />}
      </nav>
      {children}
    </div>
  );
}
