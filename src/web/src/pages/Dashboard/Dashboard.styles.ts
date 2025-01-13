import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../styles/theme.styles';
import { createResponsiveStyles } from '../../styles/breakpoints.styles';

// Constants for layout measurements
const GRID_GAP = '24px';
const SECTION_PADDING = '16px';

// Base styles for dashboard sections
const sectionBaseStyles = css`
  background: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  padding: ${SECTION_PADDING};
  box-shadow: ${theme.shadows.sm};
  transition: box-shadow ${theme.transitions.normal};
  
  &:hover {
    box-shadow: ${theme.shadows.md};
  }

  &:focus-within {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

// Main dashboard container with responsive grid layout
export const DashboardContainer = styled.div`
  display: grid;
  gap: ${GRID_GAP};
  padding: ${theme.spacing.md};
  max-width: ${theme.layout.maxWidth};
  margin: 0 auto;
  min-height: calc(100vh - ${theme.layout.headerHeight});

  ${createResponsiveStyles(
    {
      // Mobile-first (single column)
      gridTemplateColumns: '1fr',
      gridAutoRows: 'minmax(min-content, max-content)',
    },
    {
      // Tablet (2 columns)
      tablet: {
        gridTemplateColumns: 'repeat(2, 1fr)',
      },
      // Desktop (3 columns)
      desktop: {
        gridTemplateColumns: 'repeat(3, 1fr)',
      }
    }
  )}

  // RTL Support
  [dir='rtl'] & {
    direction: rtl;
  }
`;

// Status overview section with maritime theme
export const StatusSection = styled.section`
  ${sectionBaseStyles}
  
  ${createResponsiveStyles(
    {
      display: 'grid',
      gap: theme.spacing.md,
      gridTemplateColumns: '1fr',
      backgroundColor: theme.colors.background,
      borderLeft: `4px solid ${theme.colors.primary}`,
    },
    {
      tablet: {
        gridTemplateColumns: 'repeat(2, 1fr)',
      },
      desktop: {
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridColumn: 'span 3',
      }
    }
  )}

  // Status card styling
  .status-card {
    padding: ${theme.spacing.md};
    border-radius: ${theme.borderRadius.sm};
    background: ${theme.colors.surface};
    
    &.warning {
      border-left: 4px solid ${theme.colors.warning};
    }
    
    &.error {
      border-left: 4px solid ${theme.colors.error};
    }
  }
`;

// Active operations section with enhanced visualization
export const OperationsSection = styled.section`
  ${sectionBaseStyles}
  
  ${createResponsiveStyles(
    {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.md,
    },
    {
      tablet: {
        gridColumn: 'span 2',
      },
      desktop: {
        gridColumn: 'span 2',
      }
    }
  )}

  // Progress bar styling
  .progress-bar {
    height: 8px;
    background: ${theme.colors.border};
    border-radius: ${theme.borderRadius.round};
    overflow: hidden;

    .progress {
      height: 100%;
      background: ${theme.colors.accent};
      transition: width ${theme.transitions.normal};
    }
  }
`;

// Recent documents section with accessibility features
export const DocumentsSection = styled.section`
  ${sectionBaseStyles}
  
  ${createResponsiveStyles(
    {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
    },
    {
      desktop: {
        gridColumn: '3',
        gridRow: 'span 2',
      }
    }
  )}

  // Document list styling
  .document-list {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      padding: ${theme.spacing.sm};
      border-bottom: 1px solid ${theme.colors.border};
      transition: background-color ${theme.transitions.fast};

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: ${theme.colors.surface};
      }

      // Keyboard focus styles
      &:focus-within {
        outline: 2px solid ${theme.colors.primary};
        outline-offset: -2px;
      }
    }
  }

  // Document type indicators
  .document-type {
    display: inline-block;
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    border-radius: ${theme.borderRadius.sm};
    font-size: ${theme.typography.fontSize.sm};
    font-weight: ${theme.typography.fontWeight.medium};
    
    &.manifest {
      background-color: ${theme.colors.primary};
      color: ${theme.colors.background};
    }
    
    &.customs {
      background-color: ${theme.colors.secondary};
      color: ${theme.colors.background};
    }
  }
`;