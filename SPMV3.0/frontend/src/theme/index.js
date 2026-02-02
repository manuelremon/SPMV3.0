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
    // Corporate Blue Palette - Navy/Blue Steel
    // .color1 { #1f1f20 } - Negro oscuro
    // .color2 { #2b4c7e } - Azul navy
    // .color3 { #567ebb } - Azul medio
    // .color4 { #606d80 } - Gris azulado
    // .color5 { #dce0e6 } - Gris claro
    primary: {
      main: '#2196f3',      // Azul MUI
      light: '#64b5f6',     // Más claro
      dark: '#1976d2',      // Más oscuro
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#606d80',      // Color4 - Gris azulado
      light: '#8a95a5',     // Más claro
      dark: '#4a5463',      // Más oscuro
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
      50: '#f5f7fa',        // Fondo principal
      100: '#eef1f4',       // Muy claro
      200: '#dce0e6',       // Color5
      300: '#c8ced8',       // Gris medio
      400: '#8a95a5',       // Gris azulado claro
      500: '#606d80',       // Color4
      600: '#4a5463',       // Más oscuro
      700: '#2b4c7e',       // Color2 - Navy
      800: '#1f3a5f',       // Navy oscuro
      900: '#1f1f20',       // Color1 - Negro
    },
    background: {
      default: '#f5f7fa',   // Fondo principal claro
      paper: '#ffffff',     // Blanco para cards
    },
    text: {
      primary: '#1f1f20',   // Color1 - Negro
      secondary: '#606d80', // Color4 - Gris azulado
      disabled: '#8a95a5',  // Gris claro
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
    borderRadius: 0,  // Bordes rectos en todo el sistema
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 0,  // Bordes rectos
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
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,  // Bordes rectos
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,  // Bordes rectos
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos
        },
        rounded: {
          borderRadius: 0,  // Bordes rectos
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 0,  // Bordes rectos en menús desplegables
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 0,  // Bordes rectos en popovers
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos en inputs
        },
        notchedOutline: {
          borderRadius: 0,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos en chips
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos en alertas
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          borderRadius: 0,  // Bordes rectos en snackbars
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',     // Fondo blanco
          borderBottom: '2px solid #dce0e6',
        },
        indicator: {
          backgroundColor: '#2196f3',     // Azul MUI
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          color: '#606d80',               // Gris para tabs inactivas
          '&.Mui-selected': {
            color: '#2196f3',             // Azul MUI
          },
          '&:hover': {
            color: '#2196f3',
            backgroundColor: '#f0f2f5',
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          borderRadius: 0,  // Bordes rectos en badges (si se desea)
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 0,  // Bordes rectos en tooltips
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: 0,  // Bordes rectos en autocomplete dropdown
        },
        listbox: {
          borderRadius: 0,
        },
      },
    },
    // DataGrid - Estilos globales (Fondo blanco, texto oscuro)
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid #dce0e6',   // Color5
          borderRadius: 0,
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#ffffff !important',
          },
          '& .MuiDataGrid-columnHeader': {
            backgroundColor: '#ffffff !important',
          },
        },
        columnHeaders: {
          backgroundColor: '#ffffff !important',    // Fondo blanco
          color: '#1a1a1a !important',              // Texto negro
          borderBottom: '2px solid #dce0e6',
        },
        columnHeader: {
          backgroundColor: '#ffffff !important',    // Fondo blanco
          color: '#1a1a1a !important',
          '&:focus': {
            outline: 'none',
          },
          '&:focus-within': {
            outline: 'none',
          },
        },
        columnHeaderTitle: {
          fontWeight: 600,
          color: '#1a1a1a !important',
        },
        sortIcon: {
          color: '#606d80 !important',
          fill: '#606d80 !important',
          opacity: '1 !important',
          '& path': {
            fill: '#606d80 !important',
          },
        },
        menuIcon: {
          color: '#606d80 !important',
          fill: '#606d80 !important',
          '& path': {
            fill: '#606d80 !important',
          },
        },
        menuIconButton: {
          color: '#606d80 !important',
          '& svg': {
            color: '#606d80 !important',
            fill: '#606d80 !important',
          },
          '& svg path': {
            fill: '#606d80 !important',
          },
        },
        iconButtonContainer: {
          visibility: 'visible !important',
          '& .MuiIconButton-root': {
            color: '#606d80 !important',
          },
          '& svg': {
            color: '#606d80 !important',
            fill: '#606d80 !important',
          },
          '& svg path': {
            fill: '#606d80 !important',
          },
          '& .MuiSvgIcon-root': {
            color: '#606d80 !important',
            fill: '#606d80 !important',
          },
        },
        columnSeparator: {
          color: '#dce0e6',              // Gris claro
        },
        cell: {
          borderBottom: '1px solid #dce0e6', // Color5
        },
        row: {
          '&:hover': {
            backgroundColor: '#f0f2f5',  // Gris muy claro
          },
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
