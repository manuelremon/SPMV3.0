import { createTheme } from '@mui/material/styles';

/**
 * SPM Custom Theme - MUI Integration
 *
 * Breakpoints personalizados para diseño responsive:
 * - xs: 0px      - Móvil pequeño (iPhone SE)
 * - sm: 375px    - Móvil estándar (iPhone 12/13/14)
 * - md: 768px    - Tablet (iPad)
 * - lg: 1024px   - Desktop
 * - xl: 1440px   - Desktop grande
 */

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 375,
      md: 768,
      lg: 1024,
      xl: 1440,
    },
  },
  palette: {
    mode: 'light',
    // MUI Official Palette - https://mui.com/material-ui/customization/palette/
    primary: {
      main: '#1976d2',      // MUI Blue 700
      light: '#42a5f5',     // MUI Blue 400
      dark: '#1565c0',      // MUI Blue 800
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',      // MUI Purple 500
      light: '#ba68c8',     // MUI Purple 300
      dark: '#7b1fa2',      // MUI Purple 700
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f',      // MUI Red 700
      light: '#ef5350',     // MUI Red 400
      dark: '#c62828',      // MUI Red 800
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ed6c02',      // MUI Orange 800
      light: '#ff9800',     // MUI Orange 500
      dark: '#e65100',      // MUI Orange 900
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',      // MUI Green 800
      light: '#4caf50',     // MUI Green 500
      dark: '#1b5e20',      // MUI Green 900
      contrastText: '#ffffff',
    },
    info: {
      main: '#0288d1',      // MUI Light Blue 700
      light: '#03a9f4',     // MUI Light Blue 500
      dark: '#01579b',      // MUI Light Blue 900
      contrastText: '#ffffff',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: '0.5rem',
        },
        sizeMedium: {
          padding: '0.5rem 1rem',
        },
        sizeSmall: {
          padding: '0.375rem 0.75rem',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '0.625rem 1.25rem',
          fontSize: '0.9375rem',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: '1rem 1rem 0 0',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '0.75rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: '0.75rem',
        },
      },
    },
  },
});

export default theme;

// Helper hook para detectar breakpoints
export const BREAKPOINTS = {
  xs: 0,
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1440,
};

// CSS media queries para usar con styled-components o emotion
export const mediaQueries = {
  xs: `@media (min-width: ${BREAKPOINTS.xs}px)`,
  sm: `@media (min-width: ${BREAKPOINTS.sm}px)`,
  md: `@media (min-width: ${BREAKPOINTS.md}px)`,
  lg: `@media (min-width: ${BREAKPOINTS.lg}px)`,
  xl: `@media (min-width: ${BREAKPOINTS.xl}px)`,
  // Down queries (max-width)
  xsDown: `@media (max-width: ${BREAKPOINTS.sm - 1}px)`,
  smDown: `@media (max-width: ${BREAKPOINTS.md - 1}px)`,
  mdDown: `@media (max-width: ${BREAKPOINTS.lg - 1}px)`,
  lgDown: `@media (max-width: ${BREAKPOINTS.xl - 1}px)`,
};
