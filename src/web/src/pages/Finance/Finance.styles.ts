import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../styles/breakpoints.styles';

// Common container styles with accessibility and RTL support
const containerStyles = css`
  padding: ${theme.spacing.lg};
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  transition: all ${theme.transitions.normal};
  
  &:focus-within {
    box-shadow: ${theme.shadows.md};
    outline: 2px solid ${theme.colors.primary};
  }

  @media print {
    box-shadow: none;
    break-inside: avoid;
  }
`;

// Main container for the finance page
export const FinanceContainer = styled.div`
  display: grid;
  gap: ${theme.spacing.lg};
  max-width: ${theme.layout.contentWidth};
  margin: 0 auto;
  padding: ${theme.spacing.md};

  @media (min-width: ${BREAKPOINT_VALUES.mobile}px) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.md};
  }

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${theme.spacing.lg};
  }

  @media (min-width: ${BREAKPOINT_VALUES.desktop}px) {
    grid-template-columns: repeat(3, 1fr);
    gap: ${theme.spacing.xl};
  }

  [dir='rtl'] & {
    direction: rtl;
  }
`;

// Quick actions section with enhanced touch targets
export const QuickActionsSection = styled.div`
  ${containerStyles}
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    grid-column: 1 / -1;
  }

  button {
    min-height: 48px; // Enhanced touch target
    padding: ${theme.spacing.md};
    transition: transform ${theme.transitions.fast};

    &:hover {
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0);
    }
  }
`;

// Invoice section with accessibility features
export const InvoiceSection = styled.div`
  ${containerStyles}
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    grid-column: span 2;
  }

  .amount {
    color: ${theme.colors.primary};
    font-family: ${theme.typography.fontFamily.monospace};
    font-weight: ${theme.typography.fontWeight.medium};
  }

  .overdue {
    color: ${theme.colors.error};
  }

  .status-indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: ${theme.borderRadius.round};
    margin-inline-end: ${theme.spacing.sm};
  }
`;

// Transaction section with responsive table
export const TransactionSection = styled.div`
  ${containerStyles}
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    grid-column: 1 / -1;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    
    th {
      position: sticky;
      top: 0;
      background-color: ${theme.colors.surface};
      padding: ${theme.spacing.md};
      text-align: start;
      font-weight: ${theme.typography.fontWeight.medium};
      color: ${theme.colors.textSecondary};
      border-bottom: 2px solid ${theme.colors.border};
    }

    td {
      padding: ${theme.spacing.md};
      border-bottom: 1px solid ${theme.colors.border};
      vertical-align: middle;
    }

    tr {
      &:hover {
        background-color: ${theme.colors.background};
      }

      &:focus-within {
        outline: 2px solid ${theme.colors.primary};
        outline-offset: -2px;
      }
    }
  }

  @media print {
    overflow-x: visible;
    
    table {
      font-size: 10pt;
      
      th {
        background-color: white;
        color: black;
      }
    }
  }
`;

// Report generation section
export const ReportSection = styled.div`
  ${containerStyles}
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    grid-column: span 2;
  }

  .report-controls {
    display: flex;
    gap: ${theme.spacing.md};
    flex-wrap: wrap;

    @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
      flex-direction: column;
    }
  }

  select, input {
    min-height: 44px;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border: 1px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.sm};
    background-color: ${theme.colors.background};
    
    &:focus {
      outline: 2px solid ${theme.colors.primary};
      outline-offset: -1px;
    }
  }
`;