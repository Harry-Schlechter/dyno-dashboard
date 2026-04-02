# Theme Reference — Copy These Exactly

## theme.ts
```typescript
import { createTheme } from '@mui/material/styles';
import { colorSystem, shadows } from './designSystem';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5B8DEF',
      light: '#90CAF9',
      dark: '#1976D2',
    },
    secondary: {
      main: '#764ba2',
    },
    success: colorSystem.success,
    warning: colorSystem.warning,
    error: colorSystem.error,
    info: colorSystem.info,
    background: {
      default: '#05070b',
      paper: '#121821',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#7d8590',
    },
  },
  shape: {
    borderRadius: 18,
  },
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
    fontSize: 16,
    h1: { fontSize: 'clamp(2rem, 5vw, 2.5rem)', lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.01em' },
    h2: { fontSize: 'clamp(1.75rem, 4.5vw, 2rem)', lineHeight: 1.3, fontWeight: 600 },
    h3: { fontSize: 'clamp(1.5rem, 4vw, 1.5rem)', lineHeight: 1.4, fontWeight: 600 },
    h4: { fontSize: 'clamp(1.25rem, 3.5vw, 1.25rem)', lineHeight: 1.4, fontWeight: 500 },
    h5: { fontSize: 'clamp(1.125rem, 3vw, 1.125rem)', lineHeight: 1.5, fontWeight: 500 },
    h6: { fontSize: 'clamp(1rem, 2.5vw, 1rem)', lineHeight: 1.5, fontWeight: 600 },
    subtitle1: { fontSize: '1.125rem', lineHeight: 1.6, fontWeight: 400 },
    subtitle2: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: 500 },
    body1: { fontSize: '1rem', lineHeight: 1.6, fontWeight: 400 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: 400 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4, fontWeight: 400, letterSpacing: '0.02em' },
    overline: { fontSize: '0.75rem', lineHeight: 1.4, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
    button: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: 500, letterSpacing: '0.02em', textTransform: 'none' as const },
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
          borderRadius: 18,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 24px ${theme.palette.primary.main}33`,
          },
          [theme.breakpoints.down('sm')]: { borderRadius: 14 },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          backgroundColor: 'rgba(18, 24, 33, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          borderRadius: 18,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 24px ${theme.palette.primary.main}33`,
          },
          [theme.breakpoints.down('sm')]: { borderRadius: 14 },
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: false },
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 999,
          padding: '12px 24px',
          minHeight: '44px',
          fontSize: '0.875rem',
          letterSpacing: '0.02em',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&:focus-visible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: '2px' },
        }),
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7c8ff5 0%, #8a5db8 100%)',
            boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 2 },
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.25)', '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' } },
            '&.Mui-focused': { backgroundColor: 'rgba(0, 0, 0, 0.3)', boxShadow: `0 0 0 4px ${theme.palette.primary.main}20` },
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.75rem', borderRadius: 8 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:hover': { background: 'rgba(255, 255, 255, 0.05)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(91, 141, 239, 0.18)',
            color: '#5B8DEF',
            borderRadius: 12,
            '&:hover': { backgroundColor: 'rgba(91, 141, 239, 0.22)' },
          },
        }),
      },
    },
  },
});
```

## designSystem.ts
```typescript
export const colorSystem = {
  primary: { 50: '#E3F2FD', 100: '#BBDEFB', 200: '#90CAF9', 300: '#64B5F6', 400: '#42A5F5', 500: '#2196F3', 600: '#1E88E5', 700: '#1976D2', 800: '#1565C0', 900: '#0D47A1' },
  success: { light: '#81C784', main: '#4CAF50', dark: '#388E3C' },
  warning: { light: '#FFB74D', main: '#FF9800', dark: '#F57C00' },
  error: { light: '#E57373', main: '#F44336', dark: '#D32F2F' },
  info: { light: '#64B5F6', main: '#2196F3', dark: '#1976D2' },
  neutral: { 0: '#FFFFFF', 50: '#FAFAFA', 100: '#F5F5F5', 200: '#EEEEEE', 300: '#E0E0E0', 400: '#BDBDBD', 500: '#9E9E9E', 600: '#757575', 700: '#616161', 800: '#424242', 900: '#212121', 1000: '#000000' },
  priority: { low: '#64B5F6', medium: '#FFB74D', high: '#EF5350', critical: '#D32F2F' },
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  primary: '0 10px 20px -5px rgba(33, 150, 243, 0.3)',
  success: '0 10px 20px -5px rgba(76, 175, 80, 0.3)',
  warning: '0 10px 20px -5px rgba(255, 152, 0, 0.3)',
  error: '0 10px 20px -5px rgba(244, 67, 54, 0.3)',
};

export const glassmorphism = {
  dark: {
    background: 'rgba(30, 30, 30, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
  },
};
```
