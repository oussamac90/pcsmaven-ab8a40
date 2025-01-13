import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../../styles/breakpoints.styles';

// Card dimensions for different breakpoints
const CARD_DIMENSIONS = {
  mobile: {
    width: '100%',
    minHeight: '200px',
    padding: theme.spacing.md
  },
  tablet: {
    width: '340px',
    minHeight: '240px',
    padding: theme.spacing.lg
  },
  desktop: {
    width: '380px',
    minHeight: '260px',
    padding: theme.spacing.xl
  }
} as const;

// Status color mapping
const STATUS_COLORS = {
  approaching: theme.colors.info,
  berthed: theme.colors.success,
  departed: theme.colors.neutral,
  delayed: theme.colors.warning,
  emergency: theme.colors.error
} as const;

// Generate responsive styles for the card container
const getResponsiveCardStyles = () => css`
  width: ${CARD_DIMENSIONS.mobile.width};
  min-height: ${CARD_DIMENSIONS.mobile.minHeight};
  padding: ${CARD_DIMENSIONS.mobile.padding};
  background: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  transition: transform ${theme.transitions.normal}, box-shadow ${theme.transitions.normal};
  
  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    width: ${CARD_DIMENSIONS.tablet.width};
    min-height: ${CARD_DIMENSIONS.tablet.minHeight};
    padding: ${CARD_DIMENSIONS.tablet.padding};
  }
  
  @media (min-width: ${BREAKPOINT_VALUES.desktop}px) {
    width: ${CARD_DIMENSIONS.desktop.width};
    min-height: ${CARD_DIMENSIONS.desktop.minHeight};
    padding: ${CARD_DIMENSIONS.desktop.padding};
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  [dir='rtl'] & {
    text-align: right;
  }
`;

// Generate status-specific styles
const getStatusStyles = (status: keyof typeof STATUS_COLORS) => css`
  color: ${STATUS_COLORS[status]};
  background-color: ${theme.colors.background};
  border-left: 4px solid ${STATUS_COLORS[status]};
  
  [dir='rtl'] & {
    border-left: none;
    border-right: 4px solid ${STATUS_COLORS[status]};
  }
`;

export const VesselCardContainer = styled.div`
  ${getResponsiveCardStyles()}
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

export const VesselCardHeader = styled.div<{ status: keyof typeof STATUS_COLORS }>`
  ${({ status }) => getStatusStyles(status)}
  padding: ${theme.spacing.md};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${theme.colors.border};
  
  h3 {
    ${theme.typography.fontSize.lg};
    font-weight: ${theme.typography.fontWeight.bold};
    margin: 0;
    color: ${theme.colors.text};
  }
`;

export const VesselCardContent = styled.div`
  flex: 1;
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};

  p {
    ${theme.typography.fontSize.md};
    color: ${theme.colors.textSecondary};
    margin: 0;
  }

  .vessel-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${theme.spacing.sm};
  }

  .detail-label {
    ${theme.typography.fontSize.sm};
    color: ${theme.colors.textSecondary};
    font-weight: ${theme.typography.fontWeight.medium};
  }

  .detail-value {
    ${theme.typography.fontSize.md};
    color: ${theme.colors.text};
  }
`;

export const VesselCardFooter = styled.div`
  padding: ${theme.spacing.md};
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  border-top: 1px solid ${theme.colors.border};
  
  button {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.sm};
    font-weight: ${theme.typography.fontWeight.medium};
    transition: background-color ${theme.transitions.fast};

    &:focus-visible {
      outline: 2px solid ${theme.colors.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }
`;