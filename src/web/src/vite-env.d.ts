/// <reference types="vite/client" /> // v4.3.9

/**
 * Type definitions for Vite environment variables used in the Port Community System
 * Extends the base ImportMetaEnv interface to include custom environment variables
 */
interface ImportMetaEnv {
  /** Base URL for the backend API endpoints */
  readonly VITE_API_URL: string;

  /** WebSocket server URL for real-time updates */
  readonly VITE_SOCKET_URL: string;

  /** Auth0 domain for authentication */
  readonly VITE_AUTH_DOMAIN: string;

  /** Auth0 client ID for authentication */
  readonly VITE_AUTH_CLIENT_ID: string;

  /** Current application mode */
  readonly MODE: 'development' | 'production' | 'staging';

  /** Base URL for the application */
  readonly BASE_URL: string;

  /** Flag indicating production mode */
  readonly PROD: boolean;

  /** Flag indicating development mode */
  readonly DEV: boolean;
}

/**
 * Augments the ImportMeta interface to include environment variables
 * This provides type safety when accessing import.meta.env
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Export environment interface for use in other files
export { ImportMetaEnv };