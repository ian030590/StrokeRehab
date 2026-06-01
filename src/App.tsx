import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';

const MotorTrainingPage = lazy(() => import('./pages/MotorTrainingPage'));
const CognitiveTrainingPage = lazy(() => import('./pages/CognitiveTrainingPage'));
const LanguageTrainingPage = lazy(() => import('./pages/LanguageTrainingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const RelatedLinksPage = lazy(() => import('./pages/RelatedLinksPage'));

export function App() {
  return (
    <Suspense fallback={<div className="app-loading" />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/motor" replace />} />
          <Route path="/motor" element={<MotorTrainingPage />} />
          <Route path="/cognitive" element={<CognitiveTrainingPage />} />
          <Route path="/language" element={<LanguageTrainingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route path="/links" element={<RelatedLinksPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/motor" replace />} />
      </Routes>
    </Suspense>
  );
}

function AppLayout() {
  return (
    <div className="app-layout stroke-app">
      <Navbar />
      <Outlet />
    </div>
  );
}
