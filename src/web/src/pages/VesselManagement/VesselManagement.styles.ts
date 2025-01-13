import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../styles/breakpoints.styles';

// Grid system constants
const GRID_COLUMNS = 12;
const GRID_GAP = theme.spacing.md;
const SECTION_PADDING = theme.spacing.sm;
const MIN_CONTENT_WIDTH = '320px';
const MAX_CONTENT_WIDTH = '1440px';

// Base container styles with RTL support
const containerBaseStyles = css`
  display: grid;
  grid-template-columns: repeat(${GRID_COLUMNS}, 1fr);
  gap: ${GRID_GAP};
  min-width: ${MIN_CONTENT_WIDTH};
  max-width: ${MAX_CONTENT_WIDTH};
  margin: 0 auto;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background};
  
  @media (max-width: ${BREAKPOINT_VALUES.tablet}px) {
    grid-template-columns: 1fr;
    padding: ${theme.spacing.sm};
  }
`;

// Main container for vessel management page
export const VesselManagementContainer = styled.div`
  ${containerBaseStyles}
  min-height: 100vh;
  
  [dir='rtl'] & {
    direction: rtl;
  }
`;

// Search section with responsive layout
export const SearchSection = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${SECTION_PADDING};
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  
  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  input[type="search"] {
    flex: 1;
    min-width: 0;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    font-family: ${theme.typography.fontFamily.primary};
    font-size: ${theme.typography.fontSize.md};
    border: 1px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.sm};
    transition: border-color ${theme.transitions.fast};

    &:focus {
      outline: none;
      border-color: ${theme.colors.primary};
      box-shadow: 0 0 0 2px ${theme.colors.primary}20;
    }
  }
`;

// Schedule section with responsive table layout
export const ScheduleSection = styled.div`
  grid-column: 1 / -1;
  overflow-x: auto;
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  
  table {
    width: 100%;
    border-collapse: collapse;
    font-family: ${theme.typography.fontFamily.primary};
    
    th, td {
      padding: ${theme.spacing.md};
      text-align: left;
      border-bottom: 1px solid ${theme.colors.border};
      
      [dir='rtl'] & {
        text-align: right;
      }
    }
    
    th {
      font-weight: ${theme.typography.fontWeight.medium};
      color: ${theme.colors.textSecondary};
      background-color: ${theme.colors.surface};
      white-space: nowrap;
    }
    
    tr:hover {
      background-color: ${theme.colors.surface}80;
    }
  }

  @media (max-width: ${BREAKPOINT_VALUES.tablet}px) {
    th, td {
      padding: ${theme.spacing.sm};
      font-size: ${theme.typography.fontSize.sm};
    }
  }
`;

// Filter section with responsive controls
export const FilterSection = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  padding: ${SECTION_PADDING};
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  
  select, input[type="date"] {
    width: 100%;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    font-family: ${theme.typography.fontFamily.primary};
    font-size: ${theme.typography.fontSize.md};
    border: 1px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.sm};
    background-color: ${theme.colors.background};
    transition: border-color ${theme.transitions.fast};
    
    &:focus {
      outline: none;
      border-color: ${theme.colors.primary};
      box-shadow: 0 0 0 2px ${theme.colors.primary}20;
    }
  }

  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    grid-template-columns: 1fr;
    
    select, input[type="date"] {
      font-size: ${theme.typography.fontSize.sm};
    }
  }

  [dir='rtl'] & {
    direction: rtl;
    
    select {
      background-position: left ${theme.spacing.sm} center;
      padding-left: ${theme.spacing.xl};
      padding-right: ${theme.spacing.md};
    }
  }
`;