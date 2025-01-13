import styled from '@emotion/styled'; // v11.11.0
import { css, keyframes } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';

// Notification types enum
const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info'
} as const;

// Animation constants
const ANIMATION_DURATION = '0.3s';

// Slide in animation
const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Fade out animation
const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

// Helper function to get notification color based on type
const getNotificationColor = (type: keyof typeof NOTIFICATION_TYPES) => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return theme.colors.accent; // #00A3E0
    case NOTIFICATION_TYPES.WARNING:
      return theme.colors.warning; // #FFA500
    case NOTIFICATION_TYPES.ERROR:
      return theme.colors.error; // #DC3545
    case NOTIFICATION_TYPES.INFO:
      return theme.colors.secondary; // #0066CC
    default:
      return theme.colors.primary; // #003366
  }
};

// Main notification container
export const NotificationContainer = styled.div<{ isClosing?: boolean }>`
  position: fixed;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  z-index: ${theme.zIndex.modal};
  max-width: 400px;
  min-width: 320px;
  animation: ${({ isClosing }) => css`
    ${isClosing ? fadeOut : slideIn} ${ANIMATION_DURATION} ease-in-out forwards
  `};
  
  ${theme.breakpoints.down('tablet')} {
    top: ${theme.spacing.md};
    right: ${theme.spacing.md};
    left: ${theme.spacing.md};
    max-width: none;
    min-width: 0;
  }

  @media print {
    display: none;
  }
`;

// Notification content wrapper
export const NotificationContent = styled.div<{ type: keyof typeof NOTIFICATION_TYPES }>`
  display: flex;
  align-items: flex-start;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  border-left: 4px solid ${({ type }) => getNotificationColor(type)};
  box-shadow: ${theme.shadows.md};
  gap: ${theme.spacing.sm};

  &:focus-within {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  ${theme.breakpoints.up('tablet')} {
    padding: ${theme.spacing.lg};
  }
`;

// Notification icon
export const NotificationIcon = styled.div<{ type: keyof typeof NOTIFICATION_TYPES }>`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: ${({ type }) => getNotificationColor(type)};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
  }
`;

// Notification message
export const NotificationMessage = styled.p`
  flex-grow: 1;
  margin: 0;
  font-family: ${theme.typography.fontFamily.primary};
  font-size: ${theme.typography.fontSize.md};
  line-height: ${theme.typography.lineHeight.normal};
  color: ${theme.colors.text};
  
  [dir='rtl'] & {
    text-align: right;
  }
`;

// Close button
export const CloseButton = styled.button`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  background: none;
  border: none;
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  transition: color ${theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover, &:focus {
    color: ${theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;