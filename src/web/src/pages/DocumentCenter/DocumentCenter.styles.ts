import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../styles/theme.styles';

// Constants for layout and animations
const GRID_GAP = theme.spacing.md;
const PANEL_WIDTH = {
  mobile: '100%',
  tablet: '250px',
  desktop: '300px'
};
const STATUS_BAR_HEIGHT = '80px';
const TRANSITION_DURATION = '0.3s';

// Main container with responsive grid layout
export const DocumentCenterContainer = styled.div`
  display: grid;
  gap: ${GRID_GAP};
  padding: ${theme.spacing.md};
  max-width: ${theme.layout.contentWidth};
  margin: 0 auto;
  min-height: calc(100vh - ${theme.layout.headerHeight});

  ${theme.breakpoints.down('tablet')} {
    grid-template-rows: auto 1fr auto;
  }

  ${theme.breakpoints.up('tablet')} {
    grid-template-columns: ${PANEL_WIDTH.tablet} 1fr;
    grid-template-rows: 1fr auto;
  }

  ${theme.breakpoints.up('desktop')} {
    grid-template-columns: ${PANEL_WIDTH.desktop} 1fr;
    padding: ${theme.spacing.lg};
  }

  @media print {
    display: block;
    padding: 0;
  }
`;

// Document types panel with collapsible mobile view
export const DocumentTypesPanel = styled.div`
  background: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  
  ${theme.breakpoints.down('tablet')} {
    grid-row: 1;
    max-height: 300px;
    overflow-y: auto;
    transition: max-height ${TRANSITION_DURATION} cubic-bezier(0.4, 0, 0.2, 1);

    &.collapsed {
      max-height: 60px;
    }
  }

  ${theme.breakpoints.up('tablet')} {
    grid-column: 1;
    grid-row: 1 / span 2;
    height: 100%;
    position: sticky;
    top: ${theme.layout.headerHeight};
  }

  @media print {
    display: none;
  }
`;

// Document list section with responsive table
export const DocumentListSection = styled.div`
  background: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
  overflow: hidden;

  ${theme.breakpoints.down('tablet')} {
    grid-row: 2;
  }

  ${theme.breakpoints.up('tablet')} {
    grid-column: 2;
    grid-row: 1;
  }

  .document-table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: ${theme.spacing.md};
      border-bottom: 1px solid ${theme.colors.border};
      text-align: left;

      [dir='rtl'] & {
        text-align: right;
      }
    }

    th {
      background: ${theme.colors.surface};
      font-weight: ${theme.typography.fontWeight.medium};
      color: ${theme.colors.textSecondary};
    }
  }
`;

// Status bar showing document processing progress
export const ProcessingStatusBar = styled.div`
  background: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
  padding: ${theme.spacing.md};
  height: ${STATUS_BAR_HEIGHT};
  display: flex;
  align-items: center;
  justify-content: space-between;

  ${theme.breakpoints.down('tablet')} {
    grid-row: 3;
  }

  ${theme.breakpoints.up('tablet')} {
    grid-column: 2;
    grid-row: 2;
  }

  @media print {
    display: none;
  }
`;

// Styled checkbox for document type filters
export const DocumentTypeCheckbox = styled.label`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.sm} 0;
  cursor: pointer;
  user-select: none;
  color: ${theme.colors.text};
  transition: color ${TRANSITION_DURATION} ease;

  &:hover {
    color: ${theme.colors.primary};
  }

  input[type="checkbox"] {
    margin-right: ${theme.spacing.sm};
    accent-color: ${theme.colors.primary};

    [dir='rtl'] & {
      margin-right: 0;
      margin-left: ${theme.spacing.sm};
    }
  }
`;

// Progress bar for document processing status
export const ProgressIndicator = styled.div<{ progress: number }>`
  width: 100%;
  height: 8px;
  background: ${theme.colors.border};
  border-radius: ${theme.borderRadius.sm};
  overflow: hidden;
  margin: ${theme.spacing.sm} 0;

  &::after {
    content: '';
    display: block;
    width: ${props => props.progress}%;
    height: 100%;
    background: ${theme.colors.primary};
    transition: width ${TRANSITION_DURATION} ease;
  }
`;