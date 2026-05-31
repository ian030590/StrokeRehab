import { useCallback, useEffect, useState } from "react";
import AppShell from "./layout/AppShell";
import { parseHashPage, setHashPage, type AppPage } from "./navigation";
import CognitiveTrainingPage from "./pages/CognitiveTrainingPage";
import CreditsPage from "./pages/CreditsPage";
import MotorTrainingPage from "./pages/MotorTrainingPage";
import RelatedLinksPage from "./pages/RelatedLinksPage";
import SettingsPage from "./pages/SettingsPage";

function useHashRoute() {
  const [page, setPage] = useState<AppPage>(() => parseHashPage(window.location.hash));

  useEffect(() => {
    if (!window.location.hash) {
      setHashPage("motor");
    }

    const onHashChange = () => {
      setPage(parseHashPage(window.location.hash));
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((nextPage: AppPage) => {
    setHashPage(nextPage);
    setPage(nextPage);
  }, []);

  return { page, navigate };
}

export default function App() {
  const { page, navigate } = useHashRoute();

  return (
    <AppShell activePage={page} onNavigate={navigate}>
      {page === "motor" && <MotorTrainingPage />}
      {page === "cognitive" && <CognitiveTrainingPage />}
      {page === "settings" && <SettingsPage />}
      {page === "credits" && <CreditsPage />}
      {page === "links" && <RelatedLinksPage />}
    </AppShell>
  );
}
