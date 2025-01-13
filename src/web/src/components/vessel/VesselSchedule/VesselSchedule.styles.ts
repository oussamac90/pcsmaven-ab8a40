import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../../styles/breakpoints.styles';

// Status color mapping for vessel states
const STATUS_COLORS = {
  APPROACHING: theme.colors.primary,
  BERTHED: theme.colors.accent,
  DELAYED: theme.colors.warning,
  DEPARTED: theme.colors.secondary,
  SCHEDULED: theme.colors.info
} as const;

export const ScheduleContainer = styled.div`
  padding: ${theme.spacing.lg};
  background-color: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  margin: ${theme.spacing.md} 0;
  overflow: hidden;
  contain: content;

  /* Responsive container adjustments */
  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    padding: ${theme.spacing.sm};
    margin: ${theme.spacing.sm} 0;
    border-radius: ${theme.borderRadius.sm};
  }

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    max-width: ${theme.layout.contentWidth};
    margin: ${theme.spacing.lg} auto;
  }

  /* RTL Support */
  [dir='rtl'] & {
    direction: rtl;
  }
`;

export const ScheduleTable = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: ${theme.spacing.md};
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-padding: ${theme.spacing.md};
  
  /* Mobile optimization */
  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    grid-template-columns: minmax(150px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr);
    gap: ${theme.spacing.sm};
  }

  /* Accessibility */
  &:focus-within {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${theme.colors.surface};
    border-radius: ${theme.borderRadius.sm};
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: ${theme.borderRadius.sm};
  }
`;

export const ScheduleHeader = styled.div`
  display: contents;
  position: sticky;
  top: 0;
  z-index: ${theme.zIndex.header};
  
  > div {
    background-color: ${theme.colors.surface};
    padding: ${theme.spacing.md};
    font-weight: ${theme.typography.fontWeight.bold};
    color: ${theme.colors.text};
    border-bottom: 2px solid ${theme.colors.border};
    white-space: nowrap;
    
    /* Sort indicator styles */
    &[aria-sort] {
      cursor: pointer;
      user-select: none;
      
      &:hover {
        background-color: ${theme.colors.border};
      }
      
      &::after {
        content: '';
        display: inline-block;
        width: 0;
        height: 0;
        margin-left: ${theme.spacing.sm};
        vertical-align: middle;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
      }
      
      &[aria-sort='ascending']::after {
        border-bottom: 4px solid ${theme.colors.text};
      }
      
      &[aria-sort='descending']::after {
        border-top: 4px solid ${theme.colors.text};
      }
    }
  }
`;

export const ScheduleRow = styled.div`
  display: contents;
  
  > div {
    padding: ${theme.spacing.md};
    background-color: ${theme.colors.background};
    border-bottom: 1px solid ${theme.colors.border};
    transition: background-color ${theme.transitions.fast};
    
    &:first-of-type {
      font-weight: ${theme.typography.fontWeight.medium};
    }
    
    @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
      padding: ${theme.spacing.sm};
      font-size: ${theme.typography.fontSize.sm};
    }
  }
  
  &:hover > div {
    background-color: ${theme.colors.surface};
  }

  &:focus-within > div {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: -2px;
  }
`;

interface StatusIndicatorProps {
  status: keyof typeof STATUS_COLORS;
}

export const StatusIndicator = styled.span<StatusIndicatorProps>`
  display: inline-flex;
  align-items: center;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.background};
  background-color: ${({ status }) => STATUS_COLORS[status]};
  transition: all ${theme.transitions.fast};
  
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: ${theme.spacing.xs};
    border-radius: ${theme.borderRadius.round};
    background-color: currentColor;
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid currentColor;
  }
`;