import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import Layout from './components/layout/Layout';
import AuthGate from './components/AuthGate';
import { AuthProvider } from './lib/auth';
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
import CorrelationsPage from './pages/CorrelationsPage';
import SpacesPage from './pages/SpacesPage';
import VoicePage from './pages/VoicePage';
import LoginPage from './pages/LoginPage';

const IS_DEMO = process.env.REACT_APP_DEMO === '1';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Login page (hidden in demo) */}
            {!IS_DEMO && <Route path="/login" element={<LoginPage />} />}

            {/* Voice page — owner only, fullscreen, hidden in demo */}
            {!IS_DEMO && (
              <Route path="/voice" element={
                <AuthGate roles={['owner']}>
                  <VoicePage />
                </AuthGate>
              } />
            )}

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
      <Route path="/workouts"      element={ownerOnly(<WorkoutsPage />)} />
      <Route path="/sleep"         element={ownerOnly(<SleepPage />)} />
      <Route path="/finances"      element={ownerOnly(<FinancesPage />)} />
      <Route path="/tasks"         element={ownerOnly(<TasksPage />)} />
      <Route path="/calendar"      element={ownerOnly(<CalendarPage />)} />
      <Route path="/journal"       element={ownerOnly(<JournalPage />)} />
      <Route path="/notes"         element={ownerOnly(<NotesPage />)} />
      <Route path="/settings"      element={<SettingsPage />} />
      <Route path="/correlations"  element={ownerOnly(<CorrelationsPage />)} />
      <Route path="/spaces"        element={<SpacesPage index />} />
      <Route path="/spaces/:slug"  element={<SpacesPage />} />
    </Routes>
  );
};

export default App;
