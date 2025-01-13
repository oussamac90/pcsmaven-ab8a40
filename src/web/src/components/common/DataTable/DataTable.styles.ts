import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../../styles/breakpoints.styles';

// Create responsive styles for table container
const createResponsiveTableStyles = () => css`
  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    overflow: visible;
  }

  @media (min-width: ${BREAKPOINT_VALUES.desktop}px) {
    max-width: 100%;
  }
`;

export const TableContainer = styled.div`
  width: 100%;
  border: 1px solid ${theme.colors.secondary}33;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background};
  box-shadow: ${theme.shadows.sm};
  ${createResponsiveTableStyles};
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: ${theme.typography.fontFamily.primary};
  font-size: ${theme.typography.fontSize.sm};

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    font-size: ${theme.typography.fontSize.md};
  }
`;

export const TableHeader = styled.thead`
  position: sticky;
  top: 0;
  z-index: ${theme.zIndex.header};
  background: ${theme.colors.surface};
  border-bottom: 2px solid ${theme.colors.secondary}33;
`;

export const TableBody = styled.tbody`
  tr:nth-of-type(even) {
    background: ${theme.colors.surface}33;
  }

  tr:hover {
    background: ${theme.colors.accent}11;
  }
`;

export const TableRow = styled.tr`
  transition: background-color ${theme.transitions.fast};

  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid ${theme.colors.border};
    padding: ${theme.spacing.sm} 0;
  }
`;

export const TableCell = styled.td`
  padding: ${theme.spacing.md};
  color: ${theme.colors.text};
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid ${theme.colors.border};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;

  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    display: flex;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border: none;
    
    &:before {
      content: attr(data-label);
      font-weight: ${theme.typography.fontWeight.bold};
      margin-right: ${theme.spacing.md};
      min-width: 100px;
    }
  }

  @media (min-width: ${BREAKPOINT_VALUES.desktop}px) {
    max-width: 300px;
  }
`;

export const TableHeaderCell = styled.th`
  padding: ${theme.spacing.md};
  color: ${theme.colors.primary};
  font-weight: ${theme.typography.fontWeight.bold};
  text-align: left;
  white-space: nowrap;
  user-select: none;
  cursor: pointer;
  transition: color ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.accent};
  }

  &.sorted-asc::after {
    content: ' ↑';
    color: ${theme.colors.accent};
  }

  &.sorted-desc::after {
    content: ' ↓';
    color: ${theme.colors.accent};
  }

  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    display: none;
  }
`;

export const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
  background: ${theme.colors.surface};
  border-radius: 0 0 ${theme.borderRadius.md} ${theme.borderRadius.md};

  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    flex-direction: column;
    align-items: stretch;
    gap: ${theme.spacing.sm};
  }
`;