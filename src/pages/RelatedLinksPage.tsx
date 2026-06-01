import { useT } from "../i18n";

export default function RelatedLinksPage() {
  const { t } = useT();

  return (
    <main className="page-content blank-page" aria-labelledby="links-page-title">
      <h1 id="links-page-title">{t("links.title")}</h1>
      <p className="section-subtitle">{t("links.subtitle")}</p>

      <section className="training-grid related-links-grid" aria-label={t("links.contentLabel")}>
        <a
          className="card fade-in-up related-link-card"
          href="https://visiontrainer.pages.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="card-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="card-title">{t("links.visionTrainer.title")}</div>
          <div className="card-desc">{t("links.visionTrainer.desc")}</div>
          <div className="related-link-url">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            visiontrainer.pages.dev
          </div>
        </a>
      </section>
    </main>
  );
}
