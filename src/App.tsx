import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';

const MotorTrainingPage = lazy(() => import('./pages/MotorTrainingPage'));
const CognitiveTrainingPage = lazy(() => import('./pages/CognitiveTrainingPage'));
const LanguageTrainingPage = lazy(() => import('./pages/LanguageTrainingPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const RelatedLinksPage = lazy(() => import('./pages/RelatedLinksPage'));
const WritingDefenseGame = lazy(() => import('./pages/training/WritingDefenseGame'));
const ConnectDotsGame = lazy(() => import('./pages/training/ConnectDotsGame'));
const ChineseCrosswordGame = lazy(() => import('./pages/training/ChineseCrosswordGame'));

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
          <Route path="/training/writing-defense" element={<WritingDefenseGame />} />
          <Route path="/training/connect-dots" element={<ConnectDotsGame />} />
          <Route path="/training/chinese-crossword" element={<ChineseCrosswordGame />} />
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
