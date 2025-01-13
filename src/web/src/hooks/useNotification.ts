import { useState, useEffect, useCallback, useRef } from 'react'; // v18.0.0
import { useTranslation } from 'react-i18next'; // v12.0.0
import { useSocket } from './useSocket';
import { SOCKET_EVENTS } from '../config/socket.config';

// Constants
const DEFAULT_NOTIFICATION_DURATION = 5000;
const MAX_QUEUE_SIZE = 10;

export enum NotificationType {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info'
}

export enum NotificationPriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3
}

// Interfaces
export interface NotificationState {
  type: NotificationType;
  message: string;
  isVisible: boolean;
  duration?: number;
  id: string;
  priority: NotificationPriority;
  ariaLive: 'polite' | 'assertive';
  dismissible: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

export interface NotificationOptions {
  duration?: number;
  priority?: NotificationPriority;
  dismissible?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface UseNotificationReturn {
  notification: NotificationState | null;
  showNotification: (type: NotificationType, message: string, options?: NotificationOptions) => void;
  hideNotification: () => void;
  clearAll: () => void;
  isPending: boolean;
}

/**
 * Custom hook for managing notification state and real-time updates
 * Implements accessibility features and WebSocket integration
 */
export const useNotification = (): UseNotificationReturn => {
  const { t } = useTranslation();
  const { subscribe, unsubscribe, isConnected } = useSocket();
  
  // State management
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const notificationQueue = useRef<NotificationState[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Process the notification queue based on priority
   */
  const processQueue = useCallback(() => {
    if (notificationQueue.current.length === 0) {
      setIsPending(false);
      return;
    }

    // Sort by priority and show highest priority notification
    notificationQueue.current.sort((a, b) => a.priority - b.priority);
    const nextNotification = notificationQueue.current.shift();
    
    if (nextNotification) {
      setNotification(nextNotification);
      setIsPending(notificationQueue.current.length > 0);

      if (nextNotification.duration !== undefined) {
        timeoutRef.current = setTimeout(() => {
          hideNotification();
        }, nextNotification.duration);
      }
    }
  }, []);

  /**
   * Show a new notification with specified options
   */
  const showNotification = useCallback((
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ) => {
    const {
      duration = DEFAULT_NOTIFICATION_DURATION,
      priority = NotificationPriority.MEDIUM,
      dismissible = true,
      action
    } = options;

    const newNotification: NotificationState = {
      id: `notification-${Date.now()}`,
      type,
      message: t(message),
      isVisible: true,
      duration,
      priority,
      ariaLive: type === NotificationType.ERROR ? 'assertive' : 'polite',
      dismissible,
      action
    };

    // Manage queue size
    if (notificationQueue.current.length >= MAX_QUEUE_SIZE) {
      notificationQueue.current = notificationQueue.current
        .sort((a, b) => a.priority - b.priority)
        .slice(0, MAX_QUEUE_SIZE - 1);
    }

    notificationQueue.current.push(newNotification);
    setIsPending(true);

    if (!notification) {
      processQueue();
    }
  }, [notification, t, processQueue]);

  /**
   * Hide the current notification and process next in queue
   */
  const hideNotification = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setNotification(prev => prev ? { ...prev, isVisible: false } : null);
    
    // Process next notification after animation
    setTimeout(() => {
      setNotification(null);
      processQueue();
    }, 300);
  }, [processQueue]);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    notificationQueue.current = [];
    hideNotification();
    setIsPending(false);
  }, [hideNotification]);

  /**
   * WebSocket event handlers for real-time notifications
   */
  useEffect(() => {
    if (!isConnected) return;

    const handleVesselUpdate = (data: any) => {
      showNotification(
        NotificationType.INFO,
        `vessel.update.${data.status}`,
        { priority: NotificationPriority.MEDIUM }
      );
    };

    const handleCargoStatus = (data: any) => {
      showNotification(
        NotificationType.INFO,
        `cargo.status.${data.status}`,
        { priority: NotificationPriority.MEDIUM }
      );
    };

    const handleBerthAllocated = (data: any) => {
      showNotification(
        NotificationType.SUCCESS,
        'berth.allocated.success',
        { 
          priority: NotificationPriority.HIGH,
          action: {
            label: t('view.details'),
            handler: () => window.location.href = `/berths/${data.berthId}`
          }
        }
      );
    };

    const handleDocumentProcessed = (data: any) => {
      showNotification(
        data.status === 'success' ? NotificationType.SUCCESS : NotificationType.ERROR,
        `document.processed.${data.status}`,
        { priority: NotificationPriority.HIGH }
      );
    };

    // Subscribe to WebSocket events
    subscribe(SOCKET_EVENTS.VESSEL_UPDATE, handleVesselUpdate);
    subscribe(SOCKET_EVENTS.CARGO_STATUS, handleCargoStatus);
    subscribe(SOCKET_EVENTS.BERTH_ALLOCATED, handleBerthAllocated);
    subscribe(SOCKET_EVENTS.DOCUMENT_PROCESSED, handleDocumentProcessed);

    // Cleanup subscriptions
    return () => {
      unsubscribe(SOCKET_EVENTS.VESSEL_UPDATE);
      unsubscribe(SOCKET_EVENTS.CARGO_STATUS);
      unsubscribe(SOCKET_EVENTS.BERTH_ALLOCATED);
      unsubscribe(SOCKET_EVENTS.DOCUMENT_PROCESSED);
    };
  }, [isConnected, subscribe, unsubscribe, showNotification, t]);

  // Keyboard event handler for accessibility
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && notification?.dismissible) {
        hideNotification();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [notification, hideNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    notification,
    showNotification,
    hideNotification,
    clearAll,
    isPending
  };
};

export default useNotification;