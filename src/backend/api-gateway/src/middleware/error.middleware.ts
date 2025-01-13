import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { requestLogger } from './logging.middleware';
import { performance } from 'perf_hooks';

// Interface for standardized API error response
export interface ApiError {
  code: string;
  message: string;
  status: number;
  stack?: string;
  details?: Record<string, unknown>;
  requestId: string;
  timestamp: string;
}

// Error codes mapping
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTH_ERROR',
  AUTHORIZATION_ERROR: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR'
} as const;

// HTTP status codes
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;

// Error monitoring thresholds
const ERROR_THRESHOLDS = {
  AUTH_FAILURES_PER_MINUTE: 5,
  ERRORS_PER_MINUTE: 100,
  MAX_ERROR_DETAILS_SIZE: 10240 // 10KB
} as const;

// Error counters for monitoring
const errorCounters = new Map<string, number>();
let lastResetTime = Date.now();

/**
 * Formats error into standardized API error response
 */
const formatError = (error: Error, status: number, requestId: string): ApiError => {
  let errorCode = ERROR_CODES.INTERNAL_ERROR;
  let details: Record<string, unknown> = {};

  // Map error types to appropriate codes
  if (error.name === 'ValidationError') {
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    details = { validationErrors: (error as any).errors };
  } else if (error.name === 'UnauthorizedError') {
    errorCode = ERROR_CODES.AUTHENTICATION_ERROR;
  } else if (error.name === 'ForbiddenError') {
    errorCode = ERROR_CODES.AUTHORIZATION_ERROR;
  } else if (error.name === 'NotFoundError') {
    errorCode = ERROR_CODES.NOT_FOUND;
  } else if (error.name === 'IntegrationError') {
    errorCode = ERROR_CODES.INTEGRATION_ERROR;
    details = { service: (error as any).service };
  }

  // Sanitize error details for production
  if (process.env.NODE_ENV === 'production') {
    delete details.stack;
    // Limit error details size
    if (JSON.stringify(details).length > ERROR_THRESHOLDS.MAX_ERROR_DETAILS_SIZE) {
      details = { message: 'Error details truncated for security' };
    }
  }

  return {
    code: errorCode,
    message: error.message,
    status,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    details,
    requestId,
    timestamp: new Date().toISOString()
  };
};

/**
 * Main error handling middleware
 */
const errorHandler = async (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = performance.now();
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  try {
    // Reset error counters if minute has passed
    if (Date.now() - lastResetTime > 60000) {
      errorCounters.clear();
      lastResetTime = Date.now();
    }

    // Increment error counter
    const errorType = err.name || 'UnknownError';
    errorCounters.set(errorType, (errorCounters.get(errorType) || 0) + 1);

    // Check security thresholds
    if (
      err.name === 'UnauthorizedError' &&
      (errorCounters.get('UnauthorizedError') || 0) >= ERROR_THRESHOLDS.AUTH_FAILURES_PER_MINUTE
    ) {
      requestLogger.warn('Authentication failure threshold exceeded', {
        requestId,
        threshold: ERROR_THRESHOLDS.AUTH_FAILURES_PER_MINUTE,
        timeWindow: '1 minute'
      });
    }

    // Determine HTTP status code
    let status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    if (err.name === 'ValidationError') status = HTTP_STATUS.BAD_REQUEST;
    else if (err.name === 'UnauthorizedError') status = HTTP_STATUS.UNAUTHORIZED;
    else if (err.name === 'ForbiddenError') status = HTTP_STATUS.FORBIDDEN;
    else if (err.name === 'NotFoundError') status = HTTP_STATUS.NOT_FOUND;
    else if (err.name === 'RateLimitError') status = HTTP_STATUS.TOO_MANY_REQUESTS;
    else if (err.name === 'IntegrationError') status = HTTP_STATUS.BAD_GATEWAY;

    // Format error response
    const formattedError = formatError(err, status, requestId);

    // Log error with appropriate level
    const logLevel = status >= 500 ? 'error' : 'warn';
    requestLogger[logLevel]('Request error', {
      error: formattedError,
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
      }
    });

    // Track error handling performance
    const duration = performance.now() - startTime;
    if (duration > 2000) { // 2 second SLA threshold
      requestLogger.warn('Error handling exceeded SLA', {
        requestId,
        duration,
        errorType
      });
    }

    // Send error response
    res.status(status).json(formattedError);
  } catch (formatError) {
    // Fallback error handling if formatting fails
    requestLogger.error('Error handler failed', {
      originalError: err,
      formatError,
      requestId
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
};

export default errorHandler;