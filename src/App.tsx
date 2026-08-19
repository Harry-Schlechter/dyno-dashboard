import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import Layout from './components/layout/Layout';
import AuthGate from './components/AuthGate';
import { AuthProvider } from './lib/auth';
import { ChatProvider } from './components/chat/ChatContext';
import { Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import HomePage from './pages/HomePage';
import NutritionPage from './pages/NutritionPage';
import WorkoutsPage from './pages/WorkoutsPage';
import SleepPage from './pages/SleepPage';
import FinancesPage from './pages/FinancesPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import JournalPage from './pages/JournalPage';
import NotesPage from './pages/NotesPage';
import SettingsPage from './pages/SettingsPage';
import PatternsPage from './pages/PatternsPage';
import SpacesPage from './pages/SpacesPage';
import VoicePage from './pages/VoicePage';
import LoginPage from './pages/LoginPage';
import DemoLandingPage from './pages/DemoLandingPage';
import DemoExtensionPage from './pages/DemoExtensionPage';
import DemoTelegramPage from './pages/DemoTelegramPage';
import { IS_DEMO, ROUTER_BASENAME } from './lib/demoMode';

// Demo mode is decided at runtime from the URL path (/sample), not at build
// time — the demo and the real dashboard ship in one bundle and one deploy.
// See lib/demoMode.ts.

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ChatProvider>
        <BrowserRouter basename={ROUTER_BASENAME}>
          <Routes>
            {/* Login page (hidden in demo) */}
            {!IS_DEMO && <Route path="/login" element={<LoginPage />} />}

            {/* Portfolio explainer — the demo's front door. */}
            {IS_DEMO && <Route path="/about" element={<DemoLandingPage />} />}

            {/* Voice page — fullscreen. Owner-gated for real; open in demo,
                where it answers from a local scripted brain. */}
            <Route path="/voice" element={
              IS_DEMO ? <VoicePage /> : (
                <AuthGate roles={['owner']}>
                  <VoicePage />
                </AuthGate>
              )
            } />

            {/* Everything else — gated unless demo */}
            <Route path="/*" element={
              IS_DEMO ? (
                <Layout>
                  <DashboardRoutes />
                </Layout>
              ) : (
                <AuthGate>
                  <Layout>
                    <DashboardRoutes />
                  </Layout>
                </AuthGate>
              )
            } />
          </Routes>
        </BrowserRouter>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

const DashboardRoutes: React.FC = () => {
  const { user } = useAuth();
  const isGuest = user?.role === 'guest';

  // Guests only see Spaces.
  const ownerOnly = (el: React.ReactNode) => isGuest ? <Navigate to="/spaces" replace /> : <>{el}</>;

  return (
    <Routes>
      <Route path="/" element={isGuest ? <Navigate to="/spaces" replace /> : <HomePage />} />
      <Route path="/nutrition"     element={ownerOnly(<NutritionPage />)} />
      <Route path="/fitness"       element={ownerOnly(<WorkoutsPage />)} />
      <Route path="/workouts"      element={<Navigate to="/fitness" replace />} />
      <Route path="/sleep"         element={ownerOnly(<SleepPage />)} />
      <Route path="/finances"      element={ownerOnly(<FinancesPage />)} />
      <Route path="/tasks"         element={ownerOnly(<TasksPage />)} />
      <Route path="/calendar"      element={ownerOnly(<CalendarPage />)} />
      <Route path="/journal"       element={ownerOnly(<JournalPage />)} />
      <Route path="/notes"         element={ownerOnly(<NotesPage />)} />
      <Route path="/settings"      element={<SettingsPage />} />
      <Route path="/patterns"      element={ownerOnly(<PatternsPage />)} />
      <Route path="/correlations"  element={<Navigate to="/patterns" replace />} />
      <Route path="/spaces"        element={<SpacesPage index />} />
      <Route path="/spaces/:slug"  element={<SpacesPage />} />
      {IS_DEMO && <Route path="/telegram" element={<DemoTelegramPage />} />}
      {IS_DEMO && <Route path="/extension" element={<DemoExtensionPage />} />}
    </Routes>
  );
};

export default App;
