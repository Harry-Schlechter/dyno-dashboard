import { createTheme } from '@mui/material/styles';

// Mirrors dyno-dashboard/src/theme/theme.ts. Side panel is narrow (~360-400px),
// so we trim padding/font sizes a touch but keep the dark glassmorphism identity.

const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#5B8DEF', light: '#90CAF9', dark: '#1976D2' },
    secondary: { main: '#764ba2' },
    success: { light: '#81C784', main: '#4CAF50', dark: '#388E3C' },
    warning: { light: '#FFB74D', main: '#FF9800', dark: '#F57C00' },
    error: { light: '#E57373', main: '#F44336', dark: '#D32F2F' },
    info: { light: '#64B5F6', main: '#2196F3', dark: '#1976D2' },
    background: { default: '#05070b', paper: '#121821' },
    text: { primary: '#e6edf3', secondary: '#7d8590' },
  },
  shape: { borderRadius: 14 },
  spacing: 8,
  shadows: [
    'none',
    shadows.sm,
    shadows.md,
    shadows.md,
    shadows.lg,
    shadows.lg,
    shadows.lg,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
  ] as any,
  typography: {
    fontFamily: [
      '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif',
    ].join(','),
    fontSize: 14,
    h1: { fontSize: '1.5rem', lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.25rem', lineHeight: 1.3, fontWeight: 600 },
    h3: { fontSize: '1.125rem', lineHeight: 1.4, fontWeight: 600 },
    h4: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 500 },
    h5: { fontSize: '0.95rem', lineHeight: 1.5, fontWeight: 500 },
    h6: { fontSize: '0.85rem', lineHeight: 1.5, fontWeight: 600 },
    body1: { fontSize: '0.875rem', lineHeight: 1.55, fontWeight: 400 },
    body2: { fontSize: '0.8rem', lineHeight: 1.5, fontWeight: 400 },
    caption: { fontSize: '0.7rem', lineHeight: 1.4, fontWeight: 400, letterSpacing: '0.02em' },
    overline: { fontSize: '0.7rem', lineHeight: 1.4, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
    button: { fontSize: '0.8rem', lineHeight: 1.5, fontWeight: 500, letterSpacing: '0.02em', textTransform: 'none' as const },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          backgroundColor: 'rgba(18, 24, 33, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          borderRadius: 14,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 24px ${theme.palette.primary.main}33`,
          },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(18, 24, 33, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 14,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none' as const,
          fontWeight: 600,
          borderRadius: 999,
          padding: '8px 16px',
          minHeight: '36px',
          fontSize: '0.8rem',
          '&:focus-visible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: '2px' },
        }),
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7c8ff5 0%, #8a5db8 100%)',
            boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            fontSize: '0.875rem',
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1.5 },
            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${theme.palette.primary.main}20` },
          },
        }),
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, fontSize: '0.7rem', borderRadius: 6 } } },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          fontSize: '0.85rem',
          color: '#7d8590',
          minHeight: '40px',
          '&.Mui-selected': { color: '#5B8DEF', fontWeight: 600 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: '40px',
          '& .MuiTabs-indicator': {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            height: 2,
            borderRadius: '2px 2px 0 0',
          },
        },
      },
    },
  },
});
