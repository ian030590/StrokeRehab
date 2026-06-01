import { useT } from "../i18n";

export default function SettingsPage() {
  const { t, lang, setLang } = useT();

  return (
    <main className="page-content blank-page" aria-labelledby="settings-page-title">
      <h1 id="settings-page-title">{t("settings.page.title")}</h1>
      <p className="section-subtitle">{t("settings.page.subtitle")}</p>

      <section className="blank-surface settings-surface" aria-label={t("settings.contentLabel")}>
        <div className="setting-row language-setting-row">
          <div className="setting-info">
            <h2 className="setting-title">{t("settings.language.title")}</h2>
            <p className="setting-desc">{t("settings.language.desc")}</p>
          </div>

          <div className="language-setting-controls" role="group" aria-label={t("settings.language.title")}>
            <span className="setting-value">
              {t("settings.language.current")}: {lang === "zh" ? t("settings.language.zh") : t("settings.language.en")}
            </span>
            <div className="segmented-control">
              <button
                className={`segment ${lang === "zh" ? "is-active" : ""}`}
                type="button"
                aria-pressed={lang === "zh"}
                onClick={() => setLang("zh")}
              >
                {t("settings.language.zh")}
              </button>
              <button
                className={`segment ${lang === "en" ? "is-active" : ""}`}
                type="button"
                aria-pressed={lang === "en"}
                onClick={() => setLang("en")}
              >
                {t("settings.language.en")}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
