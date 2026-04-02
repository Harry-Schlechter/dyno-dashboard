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
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
          [theme.breakpoints.down('sm')]: { borderRadius: 14 },
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: false },
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none' as const,
          fontWeight: 600,
          borderRadius: 999,
          padding: '12px 24px',
          minHeight: '44px',
          fontSize: '0.875rem',
          letterSpacing: '0.02em',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative' as const,
          overflow: 'hidden' as const,
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
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#7d8590',
          fontSize: '0.8rem',
          padding: '4px 14px',
          textTransform: 'none' as const,
          '&.Mui-selected': {
            backgroundColor: 'rgba(91, 141, 239, 0.2)',
            color: '#5B8DEF',
            borderColor: 'rgba(91, 141, 239, 0.4)',
            '&:hover': {
              backgroundColor: 'rgba(91, 141, 239, 0.3)',
            },
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          gap: 4,
          '& .MuiToggleButtonGroup-grouped': {
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px !important',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          fontSize: '0.9rem',
          color: '#7d8590',
          '&.Mui-selected': {
            color: '#5B8DEF',
            fontWeight: 600,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          color: '#e6edf3',
          fontSize: '0.85rem',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: '#7d8590',
            fontSize: '0.75rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        root: {
          '& .MuiDialog-paper': {
            borderRadius: 18,
            backgroundColor: 'rgba(18, 24, 33, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.3)',
          '&.Mui-checked': {
            color: '#5B8DEF',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
        },
      },
    },
  },
});
