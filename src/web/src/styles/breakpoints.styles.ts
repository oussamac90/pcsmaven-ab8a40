import { css, SerializedStyles } from '@emotion/react';

/**
 * Breakpoint width values in pixels for responsive design implementation
 * Following mobile-first approach with standard industry breakpoints
 */
export const BREAKPOINT_VALUES = {
  mobile: 320, // Base mobile breakpoint
  tablet: 768, // Tablet/iPad breakpoint
  desktop: 1024, // Standard desktop breakpoint
  wide: 1440, // Wide desktop/large screen breakpoint
} as const;

/**
 * Media query strings for responsive styling
 * Includes both min-width and max-width queries for precise control
 */
export const mediaQueries = {
  // Min-width queries for mobile-first approach
  mobile: `@media (min-width: ${BREAKPOINT_VALUES.mobile}px)`,
  tablet: `@media (min-width: ${BREAKPOINT_VALUES.tablet}px)`,
  desktop: `@media (min-width: ${BREAKPOINT_VALUES.desktop}px)`,
  wide: `@media (min-width: ${BREAKPOINT_VALUES.wide}px)`,

  // Specific range queries for targeted styling
  mobileOnly: `@media (min-width: ${BREAKPOINT_VALUES.mobile}px) and (max-width: ${BREAKPOINT_VALUES.tablet - 1}px)`,
  tabletOnly: `@media (min-width: ${BREAKPOINT_VALUES.tablet}px) and (max-width: ${BREAKPOINT_VALUES.desktop - 1}px)`,
  desktopOnly: `@media (min-width: ${BREAKPOINT_VALUES.desktop}px) and (max-width: ${BREAKPOINT_VALUES.wide - 1}px)`,

  // Orientation queries for enhanced mobile experience
  portrait: '@media (orientation: portrait)',
  landscape: '@media (orientation: landscape)',
} as const;

type StyleObject = { [key: string]: any };
type BreakpointStyles = Record<string, StyleObject>;

/**
 * Creates responsive styles using provided style objects for different breakpoints
 * Supports nested objects and array syntax for complex style combinations
 * 
 * @param baseStyles - Base styles applied across all breakpoints (mobile-first)
 * @param breakpointStyles - Object containing styles for specific breakpoints
 * @returns Combined responsive styles with proper media query application
 */
export const createResponsiveStyles = (
  baseStyles: StyleObject,
  breakpointStyles: BreakpointStyles = {}
): SerializedStyles => {
  // Process base styles
  const processedStyles = { ...baseStyles };

  // Apply breakpoint-specific styles
  Object.entries(breakpointStyles).forEach(([breakpoint, styles]) => {
    if (mediaQueries[breakpoint as keyof typeof mediaQueries]) {
      processedStyles[mediaQueries[breakpoint as keyof typeof mediaQueries]] = {
        ...styles,
      };
    }
  });

  // Convert to Emotion css
  return css(processedStyles);
};

/**
 * Type guard to check if a style value is a nested object that needs recursive processing
 */
const isNestedStyle = (value: any): value is StyleObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Helper function to recursively process nested style objects
 */
const processNestedStyles = (styles: StyleObject): StyleObject => {
  const processed: StyleObject = {};

  Object.entries(styles).forEach(([key, value]) => {
    if (isNestedStyle(value)) {
      processed[key] = processNestedStyles(value);
    } else {
      processed[key] = value;
    }
  });

  return processed;
};