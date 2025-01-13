import { css, Global } from '@emotion/react'; // v11.11.0
import { theme } from './theme.styles';
import { BREAKPOINT_VALUES } from './breakpoints.styles';
import { fontFamily } from './typography.styles';

// CSS Reset styles with maritime-specific optimizations
const RESET_STYLES = css`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }

  img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
  }

  input, button, textarea, select {
    font: inherit;
  }

  p, h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
  }

  #root {
    isolation: isolate;
  }
`;

// Global base styles with maritime theme
const GLOBAL_STYLES = css`
  html {
    font-size: 16px;
    font-family: ${fontFamily.primary};
    background-color: ${theme.colors.background};
    color: ${theme.colors.text};
  }

  body {
    line-height: ${theme.typography.lineHeight.normal};
    min-width: ${BREAKPOINT_VALUES.mobile}px;
  }

  // Enhanced touch targets for maritime displays
  @media (max-width: ${BREAKPOINT_VALUES.tablet}px) {
    button, 
    [role="button"],
    input,
    select {
      min-height: 44px;
      min-width: 44px;
    }
  }

  // Scrollbar styling for better visibility
  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.surface};
  }

  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.secondary};
    border-radius: ${theme.borderRadius.sm};
    border: 3px solid ${theme.colors.surface};
  }

  // Focus management for accessibility
  :focus-visible {
    outline: 3px solid ${theme.colors.accent};
    outline-offset: 2px;
  }

  // Enhanced keyboard navigation
  :focus:not(:focus-visible) {
    outline: none;
  }

  // Reduced motion preferences
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  // Maritime-specific link styling
  a {
    color: ${theme.colors.secondary};
    text-decoration: none;
    transition: color ${theme.transitions.fast};

    &:hover {
      color: ${theme.colors.accent};
    }

    &:active {
      color: ${theme.colors.primary};
    }
  }

  // Typography responsive scaling
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
`;

// Print styles optimized for maritime documentation
const PRINT_STYLES = css`
  @media print {
    @page {
      margin: 2cm;
      size: A4 portrait;
    }

    body {
      min-height: 0;
      color: black;
      background: white;
    }

    .no-print {
      display: none !important;
    }

    a {
      text-decoration: underline;
      color: black;
    }

    table {
      page-break-inside: avoid;
    }

    pre, blockquote {
      page-break-inside: avoid;
    }

    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
      page-break-inside: avoid;
    }

    img {
      page-break-inside: avoid;
      page-break-after: avoid;
    }
  }
`;

// High contrast mode for outdoor visibility
const HIGH_CONTRAST_STYLES = css`
  @media (prefers-contrast: high) {
    body {
      background: white;
      color: black;
    }

    a {
      color: ${theme.colors.primary};
      text-decoration: underline;
    }

    input, 
    select, 
    textarea {
      border: 2px solid black;
    }

    :focus {
      outline: 4px solid ${theme.colors.accent};
    }
  }
`;

// Create combined global styles
const createGlobalStyles = () => css`
  ${RESET_STYLES}
  ${GLOBAL_STYLES}
  ${PRINT_STYLES}
  ${HIGH_CONTRAST_STYLES}
`;

// Export GlobalStyles component
export const GlobalStyles: React.FC = () => (
  <Global styles={createGlobalStyles()} />
);

export default GlobalStyles;