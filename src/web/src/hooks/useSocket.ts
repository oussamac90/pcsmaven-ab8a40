import { useState, useEffect, useCallback, useRef } from 'react'; // v18.0.0
import { io, Socket } from 'socket.io-client'; // v4.7.2
import { socketConfig, SOCKET_EVENTS } from '../config/socket.config';

// Constants for connection management
const RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000;
const CONNECTION_TIMEOUT = 10000;
const EVENT_BATCH_SIZE = 10;
const EVENT_BATCH_INTERVAL = 100;

// Connection status enum
enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// Type definitions
type SocketHandler = (data: any, acknowledgement?: (response: any) => void) => void | Promise<void>;

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (event: string, handler: SocketHandler) => void;
  unsubscribe: (event: string) => void;
  emit: (event: string, data: any, callback?: (response: any) => void) => void;
  reconnect: () => Promise<void>;
  getConnectionStatus: () => ConnectionStatus;
}

/**
 * Custom hook for managing WebSocket connections and real-time communication
 * Implements comprehensive connection lifecycle management and event handling
 */
export const useSocket = (): UseSocketReturn => {
  // State management
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);

  // Refs for cleanup and event handling
  const eventHandlers = useRef<Map<string, Set<SocketHandler>>>(new Map());
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const connectionTimeout = useRef<NodeJS.Timeout>();
  const eventBuffer = useRef<Map<string, any[]>>(new Map());
  const eventBatchTimeout = useRef<NodeJS.Timeout>();

  /**
   * Memoized event handler registration
   */
  const subscribe = useCallback((event: string, handler: SocketHandler) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)?.add(handler);
  }, []);

  /**
   * Memoized event handler removal
   */
  const unsubscribe = useCallback((event: string) => {
    eventHandlers.current.delete(event);
  }, []);

  /**
   * Batched event emission with throttling
   */
  const emit = useCallback((event: string, data: any, callback?: (response: any) => void) => {
    if (!socket || !isConnected) {
      console.warn('Socket not connected, buffering event:', event);
      const buffer = eventBuffer.current.get(event) || [];
      buffer.push({ data, callback });
      eventBuffer.current.set(event, buffer);
      return;
    }

    socket.emit(event, data, callback);
  }, [socket, isConnected]);

  /**
   * Connection establishment with retry mechanism
   */
  const connect = useCallback(async (): Promise<void> => {
    if (socket || connectionStatus === ConnectionStatus.CONNECTING) {
      return;
    }

    setConnectionStatus(ConnectionStatus.CONNECTING);
    setConnectionError(null);

    // Set connection timeout
    connectionTimeout.current = setTimeout(() => {
      setConnectionError(new Error('Connection timeout'));
      setConnectionStatus(ConnectionStatus.ERROR);
    }, CONNECTION_TIMEOUT);

    try {
      const newSocket = io(socketConfig.url, socketConfig.options);

      // Setup event listeners
      newSocket.on('connect', () => {
        clearTimeout(connectionTimeout.current);
        setIsConnected(true);
        setConnectionStatus(ConnectionStatus.CONNECTED);
        reconnectAttempts.current = 0;

        // Process buffered events
        eventBuffer.current.forEach((buffer, event) => {
          buffer.forEach(({ data, callback }) => {
            newSocket.emit(event, data, callback);
          });
        });
        eventBuffer.current.clear();
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
      });

      newSocket.on('error', (error: Error) => {
        setConnectionError(error);
        setConnectionStatus(ConnectionStatus.ERROR);
      });

      // Setup system event handlers
      Object.values(SOCKET_EVENTS).forEach(event => {
        newSocket.on(event, (data: any) => {
          const handlers = eventHandlers.current.get(event);
          handlers?.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in ${event} handler:`, error);
            }
          });
        });
      });

      setSocket(newSocket);
    } catch (error) {
      setConnectionError(error as Error);
      setConnectionStatus(ConnectionStatus.ERROR);
    }
  }, []);

  /**
   * Graceful connection termination
   */
  const disconnect = useCallback(() => {
    if (!socket) return;

    clearTimeout(reconnectTimeout.current);
    clearTimeout(connectionTimeout.current);
    clearTimeout(eventBatchTimeout.current);

    socket.removeAllListeners();
    socket.close();

    setSocket(null);
    setIsConnected(false);
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
    setConnectionError(null);
    eventBuffer.current.clear();
  }, [socket]);

  /**
   * Reconnection with exponential backoff
   */
  const reconnect = useCallback(async (): Promise<void> => {
    if (reconnectAttempts.current >= RECONNECTION_ATTEMPTS) {
      setConnectionError(new Error('Maximum reconnection attempts reached'));
      setConnectionStatus(ConnectionStatus.ERROR);
      return;
    }

    disconnect();
    reconnectAttempts.current++;

    const delay = RECONNECTION_DELAY * Math.pow(2, reconnectAttempts.current - 1);
    reconnectTimeout.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, disconnect]);

  /**
   * Connection status getter
   */
  const getConnectionStatus = useCallback(() => connectionStatus, [connectionStatus]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
      eventHandlers.current.clear();
    };
  }, [disconnect]);

  return {
    socket,
    isConnected,
    connectionError,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    emit,
    reconnect,
    getConnectionStatus
  };
};

export default useSocket;