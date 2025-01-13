/**
 * @fileoverview Socket.IO client configuration for real-time communication in the Port Community System.
 * Implements WebSocket connection settings and event types for vessel updates, cargo status,
 * berth allocations and document processing with optimized performance parameters.
 * @version 1.0.0
 */

import { SocketOptions } from 'socket.io-client'; // v4.7.2

/**
 * Interface defining the complete Socket.IO client configuration structure
 */
export interface SocketConfig {
  url: string;
  options: SocketOptions;
}

/**
 * Constant defining all available WebSocket event types for real-time updates
 * Based on the system's event-driven architecture for port operations
 */
export const SOCKET_EVENTS = {
  /** Real-time vessel position and status updates */
  VESSEL_UPDATE: 'vessel.update',
  /** Cargo tracking and status change notifications */
  CARGO_STATUS: 'cargo.status',
  /** Berth allocation and scheduling notifications */
  BERTH_ALLOCATED: 'berth.allocated',
  /** Document processing status updates */
  DOCUMENT_PROCESSED: 'document.processed'
} as const;

/**
 * Default Socket.IO client configuration with optimized settings for performance and reliability
 * Implements reconnection strategy and timeout parameters to meet system performance requirements
 */
export const socketConfig: SocketConfig = {
  // Socket server URL with fallback to localhost for development
  url: process.env.REACT_APP_SOCKET_URL || 'ws://localhost:3001',
  
  // Comprehensive Socket.IO client options
  options: {
    // Disable auto-connection to allow manual connection management
    autoConnect: false,
    
    // Enable reconnection with exponential backoff strategy
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    
    // Set connection timeout to ensure responsive behavior
    timeout: 10000,
    
    // Force WebSocket transport for optimal performance
    transports: ['websocket']
  }
};

// Type assertion to ensure event type safety
type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

/**
 * Type guard to validate socket event types at runtime
 * @param event - The event string to validate
 * @returns boolean indicating if the event is a valid socket event
 */
export const isValidSocketEvent = (event: string): event is SocketEventType => {
  return Object.values(SOCKET_EVENTS).includes(event as SocketEventType);
};

/**
 * Helper function to create a typed event handler
 * @param event - The socket event type
 * @param handler - The event handler function
 * @returns A typed event handler object
 */
export const createSocketEventHandler = <T>(
  event: SocketEventType,
  handler: (data: T) => void
) => ({
  event,
  handler
});

export default socketConfig;