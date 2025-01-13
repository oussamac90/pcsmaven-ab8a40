import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ModalOverlay, ModalContainer, ModalHeader, ModalContent, ModalFooter, CloseButton } from './Modal.styles';
import Button from '../Button/Button';

// Modal component props interface
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  initialFocusRef?: React.RefObject<HTMLElement>;
  finalFocusRef?: React.RefObject<HTMLElement>;
  animationDuration?: number;
  onAnimationComplete?: () => void;
}

// Default props
const defaultProps: Partial<ModalProps> = {
  size: 'medium',
  closeOnOverlayClick: true,
  animationDuration: 300,
};

// Modal root element ID
const MODAL_ROOT_ID = 'modal-root';

export const Modal = React.memo<ModalProps>(({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = defaultProps.size,
  closeOnOverlayClick = defaultProps.closeOnOverlayClick,
  className,
  ariaLabel,
  ariaDescribedBy,
  initialFocusRef,
  finalFocusRef,
  animationDuration = defaultProps.animationDuration,
  onAnimationComplete,
}) => {
  // Refs for modal elements
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Create modal root if it doesn't exist
  useEffect(() => {
    let modalRoot = document.getElementById(MODAL_ROOT_ID);
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = MODAL_ROOT_ID;
      document.body.appendChild(modalRoot);
    }
    return () => {
      if (modalRoot && !modalRoot.childNodes.length) {
        document.body.removeChild(modalRoot);
      }
    };
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }

    // Trap focus within modal
    if (event.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    }
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === overlayRef.current) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Manage focus and body scroll
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Set initial focus
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }

      // Add keyboard event listener
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      
      // Restore focus
      if (finalFocusRef?.current) {
        finalFocusRef.current.focus();
      } else if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown, initialFocusRef, finalFocusRef]);

  // Animation completion handler
  useEffect(() => {
    if (isOpen && onAnimationComplete) {
      const timer = setTimeout(onAnimationComplete, animationDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, animationDuration, onAnimationComplete]);

  if (!isOpen) return null;

  const modalContent = (
    <ModalOverlay
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="presentation"
      data-testid="modal-overlay"
    >
      <ModalContainer
        ref={modalRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        data-size={size}
        data-testid="modal-container"
      >
        <ModalHeader>
          <h2 id="modal-title">{title}</h2>
          <CloseButton
            onClick={onClose}
            aria-label="Close modal"
            data-testid="modal-close-button"
          >
            ×
          </CloseButton>
        </ModalHeader>

        <ModalContent id={ariaDescribedBy}>
          {children}
        </ModalContent>

        {footer && (
          <ModalFooter>
            {footer}
          </ModalFooter>
        )}
      </ModalContainer>
    </ModalOverlay>
  );

  return createPortal(
    modalContent,
    document.getElementById(MODAL_ROOT_ID) || document.body
  );
});

Modal.displayName = 'Modal';

export default Modal;