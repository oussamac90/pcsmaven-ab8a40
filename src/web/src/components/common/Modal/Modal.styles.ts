import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../../styles/breakpoints.styles';

// Animation duration constant for consistent transitions
const ANIMATION_DURATION = '200ms';

// Z-index values for proper modal layering
const Z_INDEX = {
  modalOverlay: theme.zIndex.modal,
  modalContent: theme.zIndex.modal + 1
} as const;

// Create overlay styles with backdrop blur and animation
const createOverlayStyles = () => css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${theme.colors.overlay};
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: ${Z_INDEX.modalOverlay};
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  animation: fadeIn ${ANIMATION_DURATION} forwards;
  will-change: opacity;
  touch-action: none;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

export const ModalOverlay = styled.div`
  ${createOverlayStyles}
  /* Accessibility attributes */
  role: dialog;
  aria-modal: true;
  
  /* Prevent scroll on mobile devices */
  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    overscroll-behavior: contain;
  }
`;

export const ModalContainer = styled.div`
  background-color: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.lg};
  max-width: 90vw;
  width: 600px;
  max-height: 90vh;
  margin: ${theme.spacing.md};
  position: relative;
  z-index: ${Z_INDEX.modalContent};
  display: flex;
  flex-direction: column;
  opacity: 0;
  transform: translateY(20px);
  animation: slideIn ${ANIMATION_DURATION} forwards;
  will-change: transform, opacity;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive adjustments */
  @media (max-width: ${BREAKPOINT_VALUES.tablet}px) {
    width: 100%;
    max-width: 100%;
    margin: ${theme.spacing.sm};
    border-radius: ${theme.borderRadius.sm};
  }

  /* Focus management */
  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  /* RTL Support */
  [dir='rtl'] & {
    text-align: right;
  }
`;

export const ModalHeader = styled.div`
  padding: ${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    color: ${theme.colors.primary};
    font-size: ${theme.typography.fontSize.lg};
    font-weight: ${theme.typography.fontWeight.bold};
    line-height: ${theme.typography.lineHeight.tight};
  }

  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    padding: ${theme.spacing.md};
    
    h2 {
      font-size: ${theme.typography.fontSize.md};
    }
  }
`;

export const ModalContent = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
  
  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: ${theme.colors.border} transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${theme.colors.border};
    border-radius: 3px;
  }

  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    padding: ${theme.spacing.md};
  }
`;

export const ModalFooter = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.border};
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};

  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    padding: ${theme.spacing.md};
    flex-direction: column;
    
    button {
      width: 100%;
    }
  }

  /* RTL Support */
  [dir='rtl'] & {
    flex-direction: row-reverse;
  }
`;

export const CloseButton = styled.button`
  background: transparent;
  border: none;
  padding: ${theme.spacing.xs};
  cursor: pointer;
  color: ${theme.colors.textSecondary};
  transition: color ${theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${theme.borderRadius.round};

  &:hover {
    color: ${theme.colors.text};
    background-color: ${theme.colors.surface};
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  /* Accessibility */
  aria-label: "Close modal";
  
  /* Touch target size for mobile */
  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    width: 44px;
    height: 44px;
  }
`;