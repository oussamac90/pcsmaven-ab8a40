import { css, Theme } from '@emotion/react'; // v11.11.0
import { BREAKPOINT_VALUES } from './breakpoints.styles';
import { fontFamily, fontSize } from './typography.styles';

// Maritime-themed color palette as per design system specifications
const COLORS = {
  primary: '#003366', // Deep navy blue
  secondary: '#0066CC', // Maritime blue
  accent: '#00A3E0', // Ocean blue
  warning: '#FFA500', // Alert orange
  error: '#DC3545', // Error red
  background: '#FFFFFF',
  surface: '#F5F7F9',
  text: '#1A1A1A',
  textSecondary: '#4A4A4A',
  border: '#E5E5E5',
  overlay: 'rgba(0, 0, 0, 0.5)'
} as const;

// Spacing scale based on 8px grid system
const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px'
} as const;

// Elevation system using box shadows
const SHADOWS = {
  sm: '0 1px 3px rgba(0,0,0,0.12)',
  md: '0 4px 6px rgba(0,0,0,0.1)',
  lg: '0 10px 15px rgba(0,0,0,0.1)'
} as const;

// Animation and transition tokens
const TRANSITIONS = {
  fast: '150ms ease-in-out',
  normal: '300ms ease-in-out',
  slow: '500ms ease-in-out'
} as const;

// Z-index management system
const Z_INDEX = {
  modal: 1000,
  overlay: 900,
  dropdown: 800,
  header: 700,
  footer: 600
} as const;

// Border radius tokens
const BORDER_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  round: '50%'
} as const;

/**
 * Creates the application theme object with all design tokens and styling configurations
 */
export const createTheme = (): Theme => ({
  colors: {
    ...COLORS,
    // Semantic color variants
    success: '#28A745',
    info: COLORS.accent,
    disabled: '#9E9E9E'
  },
  typography: {
    fontFamily,
    fontSize,
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  spacing: SPACING,
  breakpoints: {
    values: BREAKPOINT_VALUES,
    up: (breakpoint: keyof typeof BREAKPOINT_VALUES) => 
      `@media (min-width: ${BREAKPOINT_VALUES[breakpoint]}px)`,
    down: (breakpoint: keyof typeof BREAKPOINT_VALUES) => 
      `@media (max-width: ${BREAKPOINT_VALUES[breakpoint] - 1}px)`
  },
  shadows: SHADOWS,
  transitions: TRANSITIONS,
  zIndex: Z_INDEX,
  borderRadius: BORDER_RADIUS,
  // Layout constraints
  layout: {
    maxWidth: '1440px',
    contentWidth: '1200px',
    sidebarWidth: '280px',
    headerHeight: '64px'
  }
});

// Create and export theme instance
export const theme = createTheme();

/**
 * Global styles for base application styling
 */
export const createGlobalStyles = () => css`
  /* CSS Reset */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Base styles */
  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: ${fontFamily.primary};
    color: ${COLORS.text};
    background-color: ${COLORS.background};
    line-height: 1.5;
  }

  /* Responsive typography */
  ${theme.breakpoints.up('tablet')} {
    html {
      font-size: 16px;
    }
  }

  ${theme.breakpoints.up('desktop')} {
    html {
      font-size: 16px;
    }
  }

  /* Focus management */
  :focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  }

  /* Accessibility */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  /* RTL Support */
  [dir='rtl'] {
    text-align: right;
  }

  /* Print styles */
  @media print {
    body {
      background: white;
    }
    
    @page {
      margin: 2cm;
    }
  }
`;

// Export global styles component
export const GlobalStyles = () => css`
  ${createGlobalStyles()}
`;

// Type definitions for theme
declare module '@emotion/react' {
  export interface Theme {
    colors: typeof COLORS & {
      success: string;
      info: string;
      disabled: string;
    };
    typography: {
      fontFamily: typeof fontFamily;
      fontSize: typeof fontSize;
      fontWeight: {
        regular: number;
        medium: number;
        bold: number;
      };
      lineHeight: {
        tight: number;
        normal: number;
        relaxed: number;
      };
    };
    spacing: typeof SPACING;
    breakpoints: {
      values: typeof BREAKPOINT_VALUES;
      up: (breakpoint: keyof typeof BREAKPOINT_VALUES) => string;
      down: (breakpoint: keyof typeof BREAKPOINT_VALUES) => string;
    };
    shadows: typeof SHADOWS;
    transitions: typeof TRANSITIONS;
    zIndex: typeof Z_INDEX;
    borderRadius: typeof BORDER_RADIUS;
    layout: {
      maxWidth: string;
      contentWidth: string;
      sidebarWidth: string;
      headerHeight: string;
    };
  }
}