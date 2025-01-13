// @types/cors v2.8.13
import { CorsOptions } from '@types/cors';
// socket.io v4.7.2
import { ServerOptions } from 'socket.io';

/**
 * Interface defining comprehensive Socket.IO server configuration options
 * for the notification service
 */
interface ISocketConfig {
  path: string;
  cors: CorsOptions;
  pingInterval: number;
  pingTimeout: number;
  maxConnections: number;
}

/**
 * WebSocket event type constants for real-time notifications
 * Used to ensure consistent event naming across the system
 */
export const EVENTS = {
  /** Real-time vessel position and status updates */
  VESSEL_UPDATE: 'vessel.update',
  /** Cargo tracking status changes */
  CARGO_STATUS: 'cargo.status',
  /** Berth allocation notifications */
  BERTH_ALLOCATED: 'berth.allocated',
  /** Document processing status updates */
  DOCUMENT_PROCESSED: 'document.processed'
} as const;

// Default configuration constants
const DEFAULT_PATH = '/socket.io';
const DEFAULT_PING_INTERVAL = 25000; // 25 seconds
const DEFAULT_PING_TIMEOUT = 10000;  // 10 seconds
const MAX_CONNECTIONS = 1000;

/**
 * Socket.IO server configuration optimized for high performance and scalability
 * Implements security measures and connection management for 1000+ concurrent users
 */
export const socketConfig: ISocketConfig = {
  // Socket.IO endpoint path
  path: DEFAULT_PATH,

  // CORS configuration for secure cross-origin communication
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },

  // Connection management settings optimized for performance
  pingInterval: DEFAULT_PING_INTERVAL,
  pingTimeout: DEFAULT_PING_TIMEOUT,
  maxConnections: MAX_CONNECTIONS
} as const;

// Type assertion to ensure configuration matches ServerOptions
export const serverOptions: ServerOptions = {
  ...socketConfig,
  // Additional Socket.IO specific settings
  connectTimeout: 45000, // 45 second connection timeout
  maxHttpBufferSize: 1e6, // 1 MB max payload
  transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
  allowUpgrades: true,
  serveClient: false, // Don't serve client files
  // Enable adapter for horizontal scaling
  adapter: process.env.REDIS_URL ? {
    name: 'redis',
    url: process.env.REDIS_URL
  } : undefined
} as const;