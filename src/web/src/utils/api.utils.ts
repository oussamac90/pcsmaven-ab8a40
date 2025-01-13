// External imports
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'; // v1.3.4
import { memoize, isNil, isEmpty } from 'lodash'; // v4.17.21

// Internal imports
import { DEFAULT_TIMEOUT, RETRY_ATTEMPTS, ERROR_MESSAGES } from '../config/api.config';

// Enums
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  BUSINESS_ERROR = 'BUSINESS_ERROR'
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TIMEOUT = 408,
  SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}

export enum QueryParamEncoding {
  DEFAULT = 'default',
  RFC3986 = 'RFC3986',
  RFC1738 = 'RFC1738'
}

export enum ArrayFormat {
  COMMA = 'comma',
  REPEAT = 'repeat',
  BRACKETS = 'brackets'
}

// Interfaces
export interface ApiError {
  status: number;
  message: string;
  code: ErrorCode;
  details: Record<string, any>;
  timestamp: Date;
  requestId: string;
  path: string;
  retryable: boolean;
}

export interface QueryParams {
  key: string;
  value: string | number | boolean | Array<string | number>;
  encoding?: QueryParamEncoding;
  arrayFormat?: ArrayFormat;
}

export interface QueryStringOptions {
  arrayFormat?: ArrayFormat;
  skipNull?: boolean;
  skipEmptyString?: boolean;
  encode?: boolean;
  sort?: boolean;
}

// Constants
const DEFAULT_QUERY_OPTIONS: QueryStringOptions = {
  arrayFormat: ArrayFormat.REPEAT,
  skipNull: true,
  skipEmptyString: true,
  encode: true,
  sort: true
};

const RETRYABLE_STATUS_CODES = [
  HttpStatus.TIMEOUT,
  HttpStatus.BAD_GATEWAY,
  HttpStatus.SERVICE_UNAVAILABLE
];

// Helper Functions
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const isAxiosError = (error: any): error is AxiosError => {
  return axios.isAxiosError(error);
};

const isRetryableError = (status: number): boolean => {
  return RETRYABLE_STATUS_CODES.includes(status);
};

const getErrorCode = (status: number): ErrorCode => {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION_ERROR;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.TIMEOUT:
      return ErrorCode.TIMEOUT_ERROR;
    case HttpStatus.SERVER_ERROR:
      return ErrorCode.SERVER_ERROR;
    default:
      return ErrorCode.INTEGRATION_ERROR;
  }
};

// Main Functions
export const handleApiError = (error: Error | AxiosError, requestConfig?: AxiosRequestConfig): ApiError => {
  const timestamp = new Date();
  const requestId = generateRequestId();
  
  if (isAxiosError(error)) {
    const status = error.response?.status || HttpStatus.SERVER_ERROR;
    const path = error.config?.url || 'unknown';
    const code = getErrorCode(status);
    const retryable = isRetryableError(status);
    
    const apiError: ApiError = {
      status,
      message: error.response?.data?.message || error.message,
      code,
      details: {
        originalError: error.response?.data,
        config: {
          method: error.config?.method,
          headers: error.config?.headers,
          timeout: error.config?.timeout || DEFAULT_TIMEOUT
        }
      },
      timestamp,
      requestId,
      path,
      retryable
    };

    // Log error for monitoring
    console.error(`API Error [${requestId}]:`, {
      status,
      code,
      path,
      message: apiError.message
    });

    return apiError;
  }

  // Handle non-Axios errors
  return {
    status: HttpStatus.SERVER_ERROR,
    message: error.message,
    code: ErrorCode.NETWORK_ERROR,
    details: { originalError: error },
    timestamp,
    requestId,
    path: requestConfig?.url || 'unknown',
    retryable: true
  };
};

export const buildQueryString = memoize((params: Record<string, any>, options: QueryStringOptions = DEFAULT_QUERY_OPTIONS): string => {
  const { arrayFormat, skipNull, skipEmptyString, encode, sort } = { ...DEFAULT_QUERY_OPTIONS, ...options };
  
  const queryParams = Object.entries(params)
    .filter(([_, value]) => {
      if (skipNull && isNil(value)) return false;
      if (skipEmptyString && value === '') return false;
      return true;
    })
    .map(([key, value]) => {
      // Handle array values
      if (Array.isArray(value)) {
        switch (arrayFormat) {
          case ArrayFormat.COMMA:
            return { key, value: value.join(',') };
          case ArrayFormat.BRACKETS:
            return value.map(v => ({ key: `${key}[]`, value: v }));
          case ArrayFormat.REPEAT:
          default:
            return value.map(v => ({ key, value: v }));
        }
      }
      return { key, value };
    })
    .flat()
    .map(({ key, value }) => ({
      key: encode ? encodeURIComponent(key) : key,
      value: encode ? encodeURIComponent(String(value)) : String(value)
    }));

  if (sort) {
    queryParams.sort((a, b) => a.key.localeCompare(b.key));
  }

  return queryParams
    .map(({ key, value }) => `${key}=${value}`)
    .join('&');
}, (params, options) => {
  // Memoization key generator
  return JSON.stringify({ params, options });
});

// Export utility functions and types
export {
  isAxiosError,
  isRetryableError,
  generateRequestId
};