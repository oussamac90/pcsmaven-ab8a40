import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../styles/theme.styles';
import { mediaQueries } from '../../styles/breakpoints.styles';

// Container for the entire cargo tracking page
export const Container = styled.main`
  padding: ${theme.spacing.lg};
  max-width: ${theme.layout.contentWidth};
  margin: 0 auto;
  min-height: calc(100vh - ${theme.layout.headerHeight});
  background: ${theme.colors.background};
  
  ${mediaQueries.tablet} {
    padding: ${theme.spacing.xl};
  }

  ${mediaQueries.desktop} {
    padding: ${theme.spacing.xxl};
  }

  @media print {
    padding: ${theme.spacing.md};
    background: white;
  }
`;

// Header section with maritime styling
export const Header = styled.header`
  margin-bottom: ${theme.spacing.xl};
  border-bottom: 2px solid ${theme.colors.primary};
  padding-bottom: ${theme.spacing.md};

  h1 {
    font-family: ${theme.typography.fontFamily.primary};
    font-size: ${theme.typography.fontSize.xl};
    font-weight: ${theme.typography.fontWeight.bold};
    color: ${theme.colors.primary};
    margin-bottom: ${theme.spacing.sm};
  }

  .subtitle {
    color: ${theme.colors.textSecondary};
    font-size: ${theme.typography.fontSize.md};
  }

  ${mediaQueries.tablet} {
    h1 {
      font-size: calc(${theme.typography.fontSize.xl} * 1.2);
    }
  }

  @media print {
    border-bottom: 1px solid #000;
  }
`;

// Section containing the cargo tracker
export const TrackerSection = styled.section`
  background: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
  
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.lg};
  
  ${mediaQueries.tablet} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${mediaQueries.desktop} {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media print {
    box-shadow: none;
    border: 1px solid ${theme.colors.border};
    break-inside: avoid;
  }
`;

// Section containing tracking history
export const HistorySection = styled.section`
  background: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  overflow: hidden;
  
  .history-header {
    padding: ${theme.spacing.md} ${theme.spacing.lg};
    background: ${theme.colors.primary};
    color: white;
    font-weight: ${theme.typography.fontWeight.medium};
  }

  .history-content {
    padding: ${theme.spacing.lg};
    
    @media (max-width: ${theme.breakpoints.values.tablet}px) {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;

    th {
      text-align: left;
      padding: ${theme.spacing.md};
      border-bottom: 2px solid ${theme.colors.border};
      color: ${theme.colors.textSecondary};
      font-weight: ${theme.typography.fontWeight.medium};
    }

    td {
      padding: ${theme.spacing.md};
      border-bottom: 1px solid ${theme.colors.border};
    }

    tr:last-child td {
      border-bottom: none;
    }
  }

  @media print {
    box-shadow: none;
    border: 1px solid ${theme.colors.border};
    break-inside: avoid;
    
    .history-header {
      background: white;
      color: black;
      border-bottom: 1px solid ${theme.colors.border};
    }
  }
`;

// Status indicator component
export const StatusIndicator = styled.div<{ status: 'success' | 'warning' | 'error' | 'info' }>`
  display: inline-flex;
  align-items: center;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  
  ${({ status }) => {
    const statusColors = {
      success: theme.colors.success,
      warning: theme.colors.warning,
      error: theme.colors.error,
      info: theme.colors.info
    };
    
    return css`
      background: ${statusColors[status]}15;
      color: ${statusColors[status]};
      
      &::before {
        content: '';
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${statusColors[status]};
        margin-right: ${theme.spacing.xs};
      }
    `;
  }}
`;

// Search container component
export const SearchContainer = styled.div`
  margin-bottom: ${theme.spacing.xl};
  
  .search-input {
    width: 100%;
    max-width: 500px;
    padding: ${theme.spacing.md};
    border: 2px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.md};
    font-family: ${theme.typography.fontFamily.primary};
    font-size: ${theme.typography.fontSize.md};
    transition: border-color ${theme.transitions.fast};
    
    &:focus {
      outline: none;
      border-color: ${theme.colors.primary};
    }
    
    &::placeholder {
      color: ${theme.colors.textSecondary};
    }
  }

  @media print {
    display: none;
  }
`;