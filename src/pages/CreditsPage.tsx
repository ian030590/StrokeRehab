import { useT } from "../i18n";

export default function CreditsPage() {
  const { t } = useT();

  return (
    <main className="page-content blank-page" aria-labelledby="credits-page-title">
      <h1 id="credits-page-title">{t("credits.title")}</h1>
      <section className="blank-surface" aria-label={t("credits.contentLabel")} />
    </main>
  );
}
