// External imports - axios v1.3.4
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Interfaces
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  validateStatus: (status: number) => boolean;
  responseType: 'json' | 'blob' | 'text';
  retryConfig: {
    attempts: number;
    backoffFactor: number;
    statusCodesToRetry: number[];
  };
  monitoring: {
    enabled: boolean;
    sampleRate: number;
  };
}

export interface ApiEndpoints {
  vessel: {
    base: string;
    getAll: string;
    getById: string;
    create: string;
    update: string;
    delete: string;
    schedule: string;
    status: string;
  };
  berth: {
    base: string;
    getAvailable: string;
    allocate: string;
    release: string;
    schedule: string;
    status: string;
  };
  cargo: {
    base: string;
    track: string;
    manifest: string;
    status: string;
    update: string;
    history: string;
  };
  document: {
    base: string;
    upload: string;
    process: string;
    validate: string;
    status: string;
    download: string;
  };
  payment: {
    base: string;
    create: string;
    verify: string;
    history: string;
    status: string;
    refund: string;
  };
}

// Constants
export const API_VERSION = 'v1';
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_BACKOFF_FACTOR = 1.5;
export const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-API-Version': API_VERSION,
  'X-Request-ID': '', // Will be populated per request
  'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0'
};

// API Configuration
export const apiConfig: ApiConfig = {
  baseURL: process.env.API_URL || 'http://localhost:8080/api/v1',
  timeout: Number(process.env.API_TIMEOUT) || DEFAULT_TIMEOUT,
  headers: DEFAULT_HEADERS,
  validateStatus: (status: number) => status >= 200 && status < 500,
  responseType: 'json',
  retryConfig: {
    attempts: Number(process.env.API_RETRY_ATTEMPTS) || MAX_RETRY_ATTEMPTS,
    backoffFactor: RETRY_BACKOFF_FACTOR,
    statusCodesToRetry: RETRY_STATUS_CODES
  },
  monitoring: {
    enabled: process.env.API_MONITORING_ENABLED === 'true',
    sampleRate: Number(process.env.API_MONITORING_SAMPLE_RATE) || 0.1 // 10% sample rate default
  }
};

// API Endpoints
export const endpoints: ApiEndpoints = {
  vessel: {
    base: '/vessels',
    getAll: '/vessels',
    getById: '/vessels/:id',
    create: '/vessels',
    update: '/vessels/:id',
    delete: '/vessels/:id',
    schedule: '/vessels/:id/schedule',
    status: '/vessels/:id/status'
  },
  berth: {
    base: '/berths',
    getAvailable: '/berths/available',
    allocate: '/berths/:id/allocate',
    release: '/berths/:id/release',
    schedule: '/berths/schedule',
    status: '/berths/:id/status'
  },
  cargo: {
    base: '/cargo',
    track: '/cargo/:id/track',
    manifest: '/cargo/:id/manifest',
    status: '/cargo/:id/status',
    update: '/cargo/:id/update',
    history: '/cargo/:id/history'
  },
  document: {
    base: '/documents',
    upload: '/documents/upload',
    process: '/documents/:id/process',
    validate: '/documents/:id/validate',
    status: '/documents/:id/status',
    download: '/documents/:id/download'
  },
  payment: {
    base: '/payments',
    create: '/payments',
    verify: '/payments/:id/verify',
    history: '/payments/history',
    status: '/payments/:id/status',
    refund: '/payments/:id/refund'
  }
};

// Helper function to replace URL parameters
export const replaceUrlParams = (url: string, params: Record<string, string | number>): string => {
  let processedUrl = url;
  Object.entries(params).forEach(([key, value]) => {
    processedUrl = processedUrl.replace(`:${key}`, String(value));
  });
  return processedUrl;
};

// Helper function to build full URL with query parameters
export const buildUrl = (
  endpoint: string,
  params?: Record<string, string | number>,
  query?: Record<string, string | number | boolean>
): string => {
  let url = params ? replaceUrlParams(endpoint, params) : endpoint;
  
  if (query) {
    const queryString = Object.entries(query)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    url += `?${queryString}`;
  }
  
  return url;
};

// Export configuration object for use in API service
export default {
  config: apiConfig,
  endpoints,
  buildUrl,
  replaceUrlParams
};