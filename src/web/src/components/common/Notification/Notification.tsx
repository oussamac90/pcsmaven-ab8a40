import React, { useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Warning, Error, Info, Close } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  NotificationContainer,
  NotificationContent,
  NotificationIcon,
  NotificationMessage,
  CloseButton
} from './Notification.styles';

// Animation constants
const ANIMATION_DURATION = 0.3;
const ANIMATION_VARIANTS = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// Notification types
export type NotificationType = 'success' | 'warning' | 'error' | 'info';

// Notification positions
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

// Component props interface
export interface NotificationProps {
  type: NotificationType;
  message: string;
  isVisible: boolean;
  duration?: number;
  onClose: () => void;
  position?: NotificationPosition;
  className?: string;
  testId?: string;
}

/**
 * Gets the appropriate icon component based on notification type
 */
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle aria-label="Success notification icon" />;
    case 'warning':
      return <Warning aria-label="Warning notification icon" />;
    case 'error':
      return <Error aria-label="Error notification icon" />;
    case 'info':
    default:
      return <Info aria-label="Information notification icon" />;
  }
};

/**
 * Notification Component
 * Displays system alerts, messages and real-time updates with maritime-themed styling
 */
export const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  isVisible,
  duration = 5000,
  onClose,
  position = 'top-right',
  className,
  testId = 'notification'
}) => {
  const timerRef = useRef<NodeJS.Timeout>();

  // Handle keyboard interactions
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle auto-dismiss
  const handleAutoClose = useCallback(() => {
    if (duration && duration > 0) {
      timerRef.current = setTimeout(() => {
        onClose();
      }, duration);
    }
  }, [duration, onClose]);

  // Setup event listeners and auto-dismiss
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      handleAutoClose();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isVisible, handleKeyDown, handleAutoClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={ANIMATION_VARIANTS}
          transition={{ duration: ANIMATION_DURATION }}
        >
          <NotificationContainer
            className={className}
            data-testid={testId}
            role="alert"
            aria-live="polite"
            style={{
              [position.includes('right') ? 'right' : 'left']: '24px',
              [position.includes('top') ? 'top' : 'bottom']: '24px'
            }}
          >
            <NotificationContent type={type}>
              <NotificationIcon type={type}>
                {getNotificationIcon(type)}
              </NotificationIcon>
              
              <NotificationMessage>
                {message}
              </NotificationMessage>

              <CloseButton
                onClick={onClose}
                aria-label="Close notification"
                data-testid={`${testId}-close-button`}
              >
                <Close />
              </CloseButton>
            </NotificationContent>
          </NotificationContainer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;