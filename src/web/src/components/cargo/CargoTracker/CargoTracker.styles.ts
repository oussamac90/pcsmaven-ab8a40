import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { mediaQueries } from '../../../styles/breakpoints.styles';

// Constants for consistent styling
const CONTAINER_PADDING = theme.spacing.md;
const STATUS_INDICATOR_SIZE = '12px';
const TOUCH_TARGET_SIZE = '44px';
const TRANSITION_DURATION = '200ms';

// Helper function to determine status color with WCAG compliance
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'loading':
      return theme.colors.warning;
    case 'in_transit':
      return theme.colors.accent;
    case 'delivered':
      return theme.colors.success;
    case 'delayed':
      return theme.colors.error;
    default:
      return theme.colors.secondary;
  }
};

// Helper function for elevation states
const getElevation = (state: 'rest' | 'hover' | 'active'): string => {
  switch (state) {
    case 'hover':
      return theme.shadows.md;
    case 'active':
      return theme.shadows.sm;
    default:
      return theme.shadows.sm;
  }
};

// Main container for the cargo tracker
export const TrackerContainer = styled.div`
  padding: ${CONTAINER_PADDING};
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${getElevation('rest')};
  transition: box-shadow ${TRANSITION_DURATION} ease;
  direction: inherit; // Support RTL
  min-height: ${TOUCH_TARGET_SIZE}; // Ensure touch target size

  ${mediaQueries.mobile} {
    padding: ${theme.spacing.sm};
  }

  ${mediaQueries.tablet} {
    padding: ${theme.spacing.md};
  }

  ${mediaQueries.desktop} {
    padding: ${theme.spacing.lg};
  }

  &:hover {
    box-shadow: ${getElevation('hover')};
  }

  &:active {
    box-shadow: ${getElevation('active')};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media print {
    box-shadow: none;
    border: 1px solid ${theme.colors.border};
  }
`;

// Status indicator component with accessibility features
export const StatusIndicator = styled.div<{ status: string }>`
  width: ${STATUS_INDICATOR_SIZE};
  height: ${STATUS_INDICATOR_SIZE};
  border-radius: 50%;
  background-color: ${({ status }) => getStatusColor(status)};
  margin-inline-end: ${theme.spacing.sm};
  transition: background-color ${TRANSITION_DURATION} ease;
  position: relative;
  
  // Accessibility enhancement
  &::before {
    content: '';
    position: absolute;
    top: -${theme.spacing.xs};
    right: -${theme.spacing.xs};
    bottom: -${theme.spacing.xs};
    left: -${theme.spacing.xs};
    border-radius: 50%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Location display with responsive layout
export const LocationDisplay = styled.div`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.sm};
  background-color: ${theme.colors.background};
  border-radius: ${theme.borderRadius.sm};
  margin-block-start: ${theme.spacing.sm};
  transition: box-shadow ${TRANSITION_DURATION} ease;
  min-height: ${TOUCH_TARGET_SIZE};

  ${mediaQueries.mobile} {
    flex-direction: column;
    align-items: flex-start;
    gap: ${theme.spacing.sm};
  }

  ${mediaQueries.tablet} {
    flex-direction: row;
    align-items: center;
    gap: ${theme.spacing.md};
  }

  &:hover {
    box-shadow: ${theme.shadows.sm};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;

// Timeline marker for tracking history
export const TimelineMarker = styled.div`
  width: 2px;
  background-color: ${theme.colors.border};
  height: 100%;
  margin-inline: ${theme.spacing.md};
  position: relative;

  ${mediaQueries.mobile} {
    height: ${theme.spacing.xl};
    margin-block: ${theme.spacing.sm};
  }
`;

// Container for tracking details
export const TrackingDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  flex: 1;
  min-width: 0; // Prevent flex items from overflowing

  ${mediaQueries.tablet} {
    gap: ${theme.spacing.md};
  }
`;

// Timestamp display
export const Timestamp = styled.time`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.sm};
  white-space: nowrap;
`;

// Container for action buttons
export const ActionContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  justify-content: flex-end;

  ${mediaQueries.mobile} {
    flex-direction: column;
    width: 100%;
  }

  @media print {
    display: none;
  }
`;