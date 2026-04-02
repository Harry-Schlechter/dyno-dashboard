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
