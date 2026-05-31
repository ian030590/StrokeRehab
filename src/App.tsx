import { useCallback, useEffect, useState } from "react";
import AppShell from "./layout/AppShell";
import CafeBaristaModule from "./modules/cafeBarista/CafeBaristaModule";
import {
  parseHashPage,
  setHashPage,
  type AppPage,
  type MainPage,
} from "./navigation";
import CognitiveTrainingPage from "./pages/CognitiveTrainingPage";
import CreditsPage from "./pages/CreditsPage";
import MotorTrainingPage from "./pages/MotorTrainingPage";
import RelatedLinksPage from "./pages/RelatedLinksPage";
import ResultsPage from "./pages/ResultsPage";
import SettingsPage from "./pages/SettingsPage";
import { useGameStore } from "./store/useGameStore";

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
  const phase = useGameStore((state) => state.phase);
  const resetSession = useGameStore((state) => state.resetSession);
  const activeMainPage: MainPage =
    page === "training" || page === "results" ? "motor" : page;

  useEffect(() => {
    if (phase === "completed" && page === "training") {
      navigate("results");
    }
  }, [navigate, page, phase]);

  const startCafeModule = useCallback(() => {
    resetSession();
    navigate("training");
  }, [navigate, resetSession]);

  return (
    <AppShell activePage={activeMainPage} onNavigate={navigate}>
      {page === "motor" && <MotorTrainingPage onStartCafe={startCafeModule} />}
      {page === "cognitive" && <CognitiveTrainingPage />}
      {page === "settings" && <SettingsPage />}
      {page === "credits" && <CreditsPage />}
      {page === "links" && <RelatedLinksPage />}
      {page === "training" && (
        <CafeBaristaModule onBackToModules={() => navigate("motor")} />
      )}
      {page === "results" && <ResultsPage onNewTraining={() => navigate("motor")} />}
    </AppShell>
  );
}
