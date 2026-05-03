import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import NutritionPage from './pages/NutritionPage';
import WorkoutsPage from './pages/WorkoutsPage';
import SleepPage from './pages/SleepPage';
import FinancesPage from './pages/FinancesPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import JournalPage from './pages/JournalPage';
import CorrelationsPage from './pages/CorrelationsPage';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/nutrition" element={<NutritionPage />} />
            <Route path="/workouts" element={<WorkoutsPage />} />
            <Route path="/sleep" element={<SleepPage />} />
            <Route path="/finances" element={<FinancesPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/correlations" element={<CorrelationsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
