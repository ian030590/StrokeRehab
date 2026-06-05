import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';

const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const TrainingPage = lazy(() => import('./pages/training/TrainingPage').then((module) => ({ default: module.TrainingPage })));
const MotorTraining = lazy(() => import('./pages/training/MotorTraining').then((module) => ({ default: module.MotorTraining })));
const CognitiveTraining = lazy(() => import('./pages/training/CognitiveTraining').then((module) => ({ default: module.CognitiveTraining })));
const SpeechTraining = lazy(() => import('./pages/training/SpeechTraining').then((module) => ({ default: module.SpeechTraining })));
const CreditsPage = lazy(() => import('./pages/credits/CreditsPage').then((module) => ({ default: module.CreditsPage })));
const LinksPage = lazy(() => import('./pages/links/LinksPage').then((module) => ({ default: module.LinksPage })));

export function App() {
  return (
    <Suspense fallback={<div className="app-loading" />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/motor-training" replace />} />
          <Route path="/motor-training" element={<MotorTraining />} />
          <Route path="/cognitive-training" element={<CognitiveTraining />} />
          <Route path="/speech-training" element={<SpeechTraining />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route path="/links" element={<LinksPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <Outlet />
      <footer className="app-footer">
        <span>&copy; 2026</span>
        <a href="https://github.com/ian030590/StrokeTrainer" target="_blank" rel="noopener noreferrer">
          ian030590
        </a>
        <span>All rights reserved.</span>
      </footer>
    </div>
  );
}
