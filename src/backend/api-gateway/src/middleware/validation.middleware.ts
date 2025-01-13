import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import NodeCache from 'node-cache';
import winston from 'winston';
import { Counter, Histogram } from 'prom-client';
import { ApiError } from '../middleware/error.middleware';
import { performance } from 'perf_hooks';

// Interfaces
export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
  code: string;
  context?: Record<string, unknown>;
}

export interface ValidationContext {
  endpoint: string;
  method: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

// Constants
const VALIDATION_ERROR_MESSAGES = {
  INVALID_REQUEST: 'Invalid request data',
  MISSING_REQUIRED: 'Required field is missing',
  INVALID_FORMAT: 'Invalid data format',
  VALIDATION_FAILED: 'Request validation failed',
  SCHEMA_ERROR: 'Schema validation error',
  PERFORMANCE_TIMEOUT: 'Validation timeout exceeded'
} as const;

const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_ERROR: 500
} as const;

const VALIDATION_CONFIG = {
  CACHE_TTL: 3600, // 1 hour cache TTL
  MAX_VALIDATION_TIME: Number(process.env.VALIDATION_TIMEOUT) || 1000, // 1 second timeout
  ERROR_THRESHOLD: 100,
  CACHE_CHECK_PERIOD: 300
} as const;

// Initialize schema cache
const schemaCache = new NodeCache({
  stdTTL: VALIDATION_CONFIG.CACHE_TTL,
  checkperiod: VALIDATION_CONFIG.CACHE_CHECK_PERIOD,
  useClones: false
});

// Prometheus metrics
const validationDuration = new Histogram({
  name: 'api_request_validation_duration_seconds',
  help: 'Duration of request validation in seconds',
  labelNames: ['endpoint', 'method']
});

const validationErrors = new Counter({
  name: 'api_request_validation_errors_total',
  help: 'Total number of validation errors',
  labelNames: ['endpoint', 'type']
});

/**
 * Formats validation error with detailed context
 */
const formatValidationError = (
  error: Joi.ValidationError,
  context: ValidationContext
): ApiError => {
  const validationErrors: ValidationError[] = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
    code: detail.type,
    context: {
      limit: detail.context?.limit,
      pattern: detail.context?.pattern,
      valids: detail.context?.valids
    }
  }));

  // Track validation error metrics
  validationErrors.increment({
    endpoint: context.endpoint,
    type: error.details[0]?.type || 'unknown'
  });

  // Log validation error with context
  winston.warn('Request validation failed', {
    errors: validationErrors,
    context,
    timestamp: new Date().toISOString()
  });

  return {
    code: 'VALIDATION_ERROR',
    message: VALIDATION_ERROR_MESSAGES.VALIDATION_FAILED,
    status: HTTP_STATUS.BAD_REQUEST,
    details: {
      errors: validationErrors,
      context: {
        endpoint: context.endpoint,
        method: context.method,
        timestamp: context.timestamp
      }
    },
    requestId: context.metadata.requestId as string,
    timestamp: new Date().toISOString()
  };
};

/**
 * Request validation middleware factory
 */
export const validateRequest = (
  schema: ValidationSchema,
  options: Joi.ValidationOptions = {}
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = performance.now();
    
    // Initialize validation context
    const context: ValidationContext = {
      endpoint: req.path,
      method: req.method,
      timestamp: Date.now(),
      metadata: {
        requestId: req.headers['x-request-id'],
        userAgent: req.headers['user-agent'],
        clientIp: req.ip
      }
    };

    try {
      // Validate with timeout
      const validateWithTimeout = async () => {
        const validations: Promise<any>[] = [];

        // Validate body if schema exists
        if (schema.body && Object.keys(req.body).length) {
          const cacheKey = `body:${req.path}`;
          let bodySchema = schemaCache.get(cacheKey);
          if (!bodySchema) {
            bodySchema = schema.body.compile();
            schemaCache.set(cacheKey, bodySchema);
          }
          validations.push(bodySchema.validateAsync(req.body, options));
        }

        // Validate query parameters
        if (schema.query && Object.keys(req.query).length) {
          const cacheKey = `query:${req.path}`;
          let querySchema = schemaCache.get(cacheKey);
          if (!querySchema) {
            querySchema = schema.query.compile();
            schemaCache.set(cacheKey, querySchema);
          }
          validations.push(querySchema.validateAsync(req.query, options));
        }

        // Validate URL parameters
        if (schema.params && Object.keys(req.params).length) {
          const cacheKey = `params:${req.path}`;
          let paramsSchema = schemaCache.get(cacheKey);
          if (!paramsSchema) {
            paramsSchema = schema.params.compile();
            schemaCache.set(cacheKey, paramsSchema);
          }
          validations.push(paramsSchema.validateAsync(req.params, options));
        }

        // Validate headers if required
        if (schema.headers) {
          const cacheKey = `headers:${req.path}`;
          let headersSchema = schemaCache.get(cacheKey);
          if (!headersSchema) {
            headersSchema = schema.headers.compile();
            schemaCache.set(cacheKey, headersSchema);
          }
          validations.push(headersSchema.validateAsync(req.headers, options));
        }

        // Execute all validations
        await Promise.all(validations);
      };

      // Execute validation with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(VALIDATION_ERROR_MESSAGES.PERFORMANCE_TIMEOUT));
        }, VALIDATION_CONFIG.MAX_VALIDATION_TIME);
      });

      await Promise.race([validateWithTimeout(), timeoutPromise]);

      // Track validation duration
      const duration = (performance.now() - startTime) / 1000;
      validationDuration.observe(
        { endpoint: context.endpoint, method: context.method },
        duration
      );

      next();
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const apiError = formatValidationError(error, context);
        res.status(apiError.status).json(apiError);
      } else {
        // Handle timeout or other errors
        const apiError: ApiError = {
          code: 'VALIDATION_ERROR',
          message: error.message || VALIDATION_ERROR_MESSAGES.SCHEMA_ERROR,
          status: HTTP_STATUS.INTERNAL_ERROR,
          details: {
            context: {
              endpoint: context.endpoint,
              method: context.method,
              duration: (performance.now() - startTime) / 1000
            }
          },
          requestId: context.metadata.requestId as string,
          timestamp: new Date().toISOString()
        };
        res.status(apiError.status).json(apiError);
      }
    }
  };
};

export default validateRequest;