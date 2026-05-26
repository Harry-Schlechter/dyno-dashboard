import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '../theme';
import { OptionsApp } from './OptionsApp';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <OptionsApp />
    </ThemeProvider>
  </React.StrictMode>
);
