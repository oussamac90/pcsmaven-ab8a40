import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../../styles/breakpoints.styles';

// Constants for transitions and measurements
const ZOOM_TRANSITION = 'transform 0.2s ease-in-out';
const TOOLBAR_HEIGHT = '64px';

// Helper function to create responsive container styles
const createResponsiveContainer = () => css`
  // Mobile-first base styles
  width: 100%;
  height: calc(100vh - ${theme.layout.headerHeight});
  background-color: ${theme.colors.surface};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  // Tablet styles
  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    height: calc(100vh - ${theme.layout.headerHeight} - ${theme.spacing.xl});
    border-radius: ${theme.borderRadius.md};
    box-shadow: ${theme.shadows.md};
  }

  // Desktop styles
  @media (min-width: ${BREAKPOINT_VALUES.desktop}px) {
    max-width: ${theme.layout.contentWidth};
    margin: 0 auto;
  }
`;

// Main container for the document viewer
export const ViewerContainer = styled.div`
  ${createResponsiveContainer()}
`;

// Container for the document content
export const DocumentContent = styled.div`
  flex: 1;
  overflow: auto;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background};
  position: relative;

  // Zoom and pan styles
  .document-page {
    transition: ${ZOOM_TRANSITION};
    transform-origin: center center;
    margin: 0 auto;
    max-width: 100%;
    box-shadow: ${theme.shadows.sm};
  }

  // Multiple page layout
  .document-pages {
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.md};
    align-items: center;

    @media (min-width: ${BREAKPOINT_VALUES.desktop}px) {
      gap: ${theme.spacing.lg};
    }
  }

  // Loading state
  &.loading {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  // Error state
  &.error {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: ${theme.colors.error};
    text-align: center;
    padding: ${theme.spacing.xl};
  }
`;

// Container for the viewer toolbar
export const ToolbarContainer = styled.div`
  height: ${TOOLBAR_HEIGHT};
  min-height: ${TOOLBAR_HEIGHT};
  display: flex;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${theme.colors.background};
  border-bottom: 1px solid ${theme.colors.border};
  gap: ${theme.spacing.sm};

  // Responsive layout for controls
  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    gap: ${theme.spacing.md};
  }

  // Control groups
  .control-group {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};

    &:not(:last-child) {
      margin-right: ${theme.spacing.md};
    }

    @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
      gap: ${theme.spacing.md};
    }
  }

  // Toolbar buttons
  button {
    color: ${theme.colors.textSecondary};
    transition: ${theme.transitions.fast};

    &:hover {
      color: ${theme.colors.primary};
    }

    &:disabled {
      color: ${theme.colors.disabled};
    }

    &.active {
      color: ${theme.colors.primary};
      background-color: ${theme.colors.surface};
    }
  }

  // Page navigation
  .page-navigation {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    font-family: ${theme.typography.fontFamily.secondary};
    font-size: ${theme.typography.fontSize.sm};
    color: ${theme.colors.textSecondary};
  }
`;