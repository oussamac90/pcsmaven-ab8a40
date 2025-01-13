import { createTheme, ThemeOptions } from '@mui/material';

// Breakpoint values for responsive design
export const BREAKPOINT_VALUES = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

// Maritime-themed color palette
const COLORS = {
  primary: '#003366',
  secondary: '#0066CC',
  accent: '#00A3E0',
  warning: '#FFA500',
  error: '#DC3545',
  background: '#FFFFFF',
  surface: '#F5F7F9',
  text: {
    primary: '#1A1A1A',
    secondary: '#4A4A4A',
    disabled: '#9E9E9E',
  },
} as const;

// Typography configuration
const TYPOGRAPHY = {
  fontFamily: {
    primary: 'Inter, system-ui, sans-serif',
    secondary: 'Roboto, system-ui, sans-serif',
    monospace: 'JetBrains Mono, monospace',
  },
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  sizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    '2xl': '2rem',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Spacing scale configuration
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  container: {
    padding: 24,
    maxWidth: 1440,
  },
} as const;

// Shadow definitions
const SHADOWS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
} as const;

// Create theme configuration
const createThemeConfig = (): ThemeOptions => ({
  palette: {
    primary: {
      main: COLORS.primary,
      light: COLORS.secondary,
      dark: '#002244',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: COLORS.secondary,
      light: COLORS.accent,
      dark: '#004C99',
      contrastText: '#FFFFFF',
    },
    error: {
      main: COLORS.error,
      light: '#E57373',
      dark: '#D32F2F',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: COLORS.warning,
      light: '#FFB74D',
      dark: '#F57C00',
      contrastText: '#000000',
    },
    background: {
      default: COLORS.background,
      paper: COLORS.surface,
    },
    text: {
      primary: COLORS.text.primary,
      secondary: COLORS.text.secondary,
      disabled: COLORS.text.disabled,
    },
  },
  typography: {
    fontFamily: TYPOGRAPHY.fontFamily.primary,
    h1: {
      fontFamily: TYPOGRAPHY.fontFamily.primary,
      fontSize: TYPOGRAPHY.sizes['2xl'],
      fontWeight: TYPOGRAPHY.fontWeights.bold,
      lineHeight: TYPOGRAPHY.lineHeights.tight,
    },
    h2: {
      fontFamily: TYPOGRAPHY.fontFamily.primary,
      fontSize: TYPOGRAPHY.sizes.xl,
      fontWeight: TYPOGRAPHY.fontWeights.bold,
      lineHeight: TYPOGRAPHY.lineHeights.tight,
    },
    h3: {
      fontFamily: TYPOGRAPHY.fontFamily.primary,
      fontSize: TYPOGRAPHY.sizes.lg,
      fontWeight: TYPOGRAPHY.fontWeights.semibold,
      lineHeight: TYPOGRAPHY.lineHeights.tight,
    },
    body1: {
      fontFamily: TYPOGRAPHY.fontFamily.secondary,
      fontSize: TYPOGRAPHY.sizes.md,
      fontWeight: TYPOGRAPHY.fontWeights.regular,
      lineHeight: TYPOGRAPHY.lineHeights.normal,
    },
    body2: {
      fontFamily: TYPOGRAPHY.fontFamily.secondary,
      fontSize: TYPOGRAPHY.sizes.sm,
      fontWeight: TYPOGRAPHY.fontWeights.regular,
      lineHeight: TYPOGRAPHY.lineHeights.normal,
    },
    button: {
      fontFamily: TYPOGRAPHY.fontFamily.primary,
      fontSize: TYPOGRAPHY.sizes.sm,
      fontWeight: TYPOGRAPHY.fontWeights.medium,
      textTransform: 'none',
    },
    caption: {
      fontFamily: TYPOGRAPHY.fontFamily.secondary,
      fontSize: TYPOGRAPHY.sizes.xs,
      fontWeight: TYPOGRAPHY.fontWeights.regular,
      lineHeight: TYPOGRAPHY.lineHeights.normal,
    },
    code: {
      fontFamily: TYPOGRAPHY.fontFamily.monospace,
      fontSize: TYPOGRAPHY.sizes.sm,
    },
  },
  spacing: (factor: number) => `${SPACING.sm * factor}px`,
  breakpoints: {
    values: BREAKPOINT_VALUES,
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: SPACING.container.padding,
          paddingRight: SPACING.container.padding,
          maxWidth: SPACING.container.maxWidth,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: SHADOWS.md,
          borderRadius: SPACING.sm,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: SPACING.xs,
          padding: `${SPACING.sm}px ${SPACING.md}px`,
        },
      },
    },
  },
});

// Create and export the theme
const theme = createTheme(createThemeConfig());

export default theme;