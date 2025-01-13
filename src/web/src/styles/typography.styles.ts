import { css, SerializedStyles } from '@emotion/react'; // v11.11.0
import { BREAKPOINT_VALUES } from './breakpoints.styles';

/**
 * Font family definitions with comprehensive fallbacks for cross-platform
 * and international text support
 */
export const fontFamily = {
  primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
  secondary: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
  monospace: "'JetBrains Mono', 'SF Mono', 'Courier New', Consolas, Monaco, monospace"
} as const;

/**
 * Base font sizes in rem units for consistent scaling
 * Following 8px grid system with a base size of 16px (1rem)
 */
export const fontSize = {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  md: '1rem',      // 16px
  lg: '1.25rem',   // 20px
  xl: '1.5rem'     // 24px
} as const;

/**
 * Font weight definitions following standard weight classifications
 */
export const fontWeight = {
  regular: 400,
  medium: 500,
  bold: 700
} as const;

/**
 * Line height scale for optimal readability
 * Using unitless values for better inheritance
 */
export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75
} as const;

/**
 * Letter spacing adjustments for different text sizes
 */
export const letterSpacing = {
  tight: '-0.01em',
  normal: '0',
  wide: '0.01em'
} as const;

type StyleObject = { [key: string]: any };

/**
 * Creates responsive typography styles with proper media query handling
 * and performance optimization
 * 
 * @param baseStyles - Base typography styles (mobile-first)
 * @param breakpointStyles - Styles for specific breakpoints
 * @returns Responsive typography styles with proper media queries
 */
export const createResponsiveTypography = (
  baseStyles: StyleObject,
  breakpointStyles: Record<string, StyleObject> = {}
): SerializedStyles => {
  const styles = {
    ...baseStyles,
    fontDisplay: 'swap', // Optimize font loading performance
    WebkitFontSmoothing: 'antialiased', // Improve text rendering
    MozOsxFontSmoothing: 'grayscale',
    
    // Tablet styles
    [`@media (min-width: ${BREAKPOINT_VALUES.tablet}px)`]: {
      ...breakpointStyles.tablet
    },
    
    // Desktop styles
    [`@media (min-width: ${BREAKPOINT_VALUES.desktop}px)`]: {
      ...breakpointStyles.desktop
    }
  };

  return css(styles);
};

/**
 * Predefined typography styles for common text elements
 */
export const typographyPresets = {
  h1: createResponsiveTypography(
    {
      fontFamily: fontFamily.primary,
      fontSize: '2rem',
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.tight,
      letterSpacing: letterSpacing.tight
    },
    {
      tablet: { fontSize: '2.5rem' },
      desktop: { fontSize: '3rem' }
    }
  ),

  h2: createResponsiveTypography(
    {
      fontFamily: fontFamily.primary,
      fontSize: '1.75rem',
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.tight,
      letterSpacing: letterSpacing.tight
    },
    {
      tablet: { fontSize: '2rem' },
      desktop: { fontSize: '2.5rem' }
    }
  ),

  body: createResponsiveTypography(
    {
      fontFamily: fontFamily.secondary,
      fontSize: fontSize.md,
      fontWeight: fontWeight.regular,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal
    },
    {
      tablet: { fontSize: fontSize.md },
      desktop: { fontSize: fontSize.md }
    }
  ),

  code: createResponsiveTypography(
    {
      fontFamily: fontFamily.monospace,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.regular,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal
    },
    {
      tablet: { fontSize: fontSize.sm },
      desktop: { fontSize: fontSize.sm }
    }
  )
};

/**
 * RTL (Right-to-Left) typography support
 * Apply these styles when rendering content in RTL languages
 */
export const rtlTypography = {
  direction: 'rtl',
  textAlign: 'right',
  // Adjust letter spacing for RTL scripts
  letterSpacing: '0'
} as const;