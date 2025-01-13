import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { mediaQueries } from '../../../styles/breakpoints.styles';

// Constants for reusable styles
const SHADOW_STYLES = '0px 4px 12px rgba(0, 0, 0, 0.1)';
const BORDER_RADIUS = '8px';
const TRANSITION_DURATION = '0.2s';
const Z_INDEX_TABLE = 1;

// Helper function to get status-specific colors with WCAG compliance
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid':
      return theme.colors.success;
    case 'pending':
      return theme.colors.warning;
    case 'overdue':
      return theme.colors.error;
    case 'processing':
      return theme.colors.info;
    default:
      return theme.colors.textSecondary;
  }
};

export const InvoiceListContainer = styled.div`
  width: 100%;
  max-width: ${theme.layout.contentWidth};
  margin: 0 auto;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background};

  ${mediaQueries.mobile} {
    padding: ${theme.spacing.sm};
  }

  ${mediaQueries.tablet} {
    padding: ${theme.spacing.lg};
  }

  ${mediaQueries.desktop} {
    padding: ${theme.spacing.xl};
  }

  @media print {
    padding: 0;
    box-shadow: none;
  }
`;

export const InvoiceTable = styled.div`
  width: 100%;
  background-color: ${theme.colors.surface};
  border-radius: ${BORDER_RADIUS};
  box-shadow: ${SHADOW_STYLES};
  overflow: hidden;
  position: relative;
  z-index: ${Z_INDEX_TABLE};

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-family: ${theme.typography.fontFamily.primary};

    th {
      background-color: ${theme.colors.surface};
      color: ${theme.colors.textSecondary};
      font-weight: ${theme.typography.fontWeight.medium};
      text-align: start;
      padding: ${theme.spacing.md};
      border-bottom: 1px solid ${theme.colors.border};
      white-space: nowrap;

      &:first-of-type {
        padding-inline-start: ${theme.spacing.lg};
      }

      &:last-of-type {
        padding-inline-end: ${theme.spacing.lg};
      }
    }

    td {
      padding: ${theme.spacing.md};
      border-bottom: 1px solid ${theme.colors.border};
      color: ${theme.colors.text};
      transition: background-color ${TRANSITION_DURATION} ease;

      &:first-of-type {
        padding-inline-start: ${theme.spacing.lg};
      }

      &:last-of-type {
        padding-inline-end: ${theme.spacing.lg};
      }
    }

    tr {
      &:hover td {
        background-color: rgba(0, 0, 0, 0.02);
      }

      &:last-of-type td {
        border-bottom: none;
      }
    }
  }

  ${mediaQueries.mobile} {
    border-radius: 0;
    box-shadow: none;

    table {
      display: block;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;

      td, th {
        padding: ${theme.spacing.sm};
        min-width: 120px;

        &:first-of-type {
          padding-inline-start: ${theme.spacing.sm};
        }

        &:last-of-type {
          padding-inline-end: ${theme.spacing.sm};
        }
      }
    }
  }

  @media print {
    box-shadow: none;
    border: 1px solid ${theme.colors.border};
  }
`;

export const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  line-height: 1;
  color: ${theme.colors.background};
  background-color: ${({ status }) => getStatusColor(status)};
  transition: opacity ${TRANSITION_DURATION} ease;

  &:hover {
    opacity: 0.9;
  }

  ${mediaQueries.mobile} {
    padding: ${theme.spacing.xs} ${theme.spacing.xs};
    font-size: ${theme.typography.fontSize.xs};
  }

  @media print {
    background-color: transparent;
    color: ${({ status }) => getStatusColor(status)};
    border: 1px solid currentColor;
  }
`;