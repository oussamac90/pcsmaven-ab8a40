import express, { Request, Response, NextFunction } from 'express';
import winston, { Logger, format } from 'winston';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

// Interfaces
interface LoggerOptions {
  level: string;
  format: string;
  enableConsole: boolean;
  enableFile: boolean;
  filename?: string;
  elkConfig?: {
    host: string;
    port: number;
    index: string;
  };
  securityConfig?: {
    alertThreshold: number;
    patterns: string[];
  };
  performanceConfig?: {
    responseTimeThreshold: number;
    memoryThreshold: number;
  };
}

interface RequestLog {
  requestId: string;
  correlationId: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
  performanceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    responseTimePercentile: number;
  };
  securityFlags: {
    suspicious: boolean;
    patternMatches: string[];
    alertGenerated: boolean;
  };
  metadata: Record<string, unknown>;
}

// Constants
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;

const DEFAULT_LOG_FORMAT = 'combined';
const PERFORMANCE_THRESHOLD_MS = 2000;
const SECURITY_ALERT_THRESHOLD = 10;
const ELK_INDEX_PREFIX = 'api-gateway-logs';

// Create Winston logger instance
const createLogger = (options: LoggerOptions): Logger => {
  const loggerConfig: winston.LoggerOptions = {
    level: options.level || process.env.LOG_LEVEL || LOG_LEVELS.INFO,
    format: format.combine(
      format.timestamp(),
      format.json(),
      format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
    ),
    transports: []
  };

  // Console transport
  if (options.enableConsole) {
    loggerConfig.transports.push(
      new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        )
      })
    );
  }

  // File transport
  if (options.enableFile && options.filename) {
    loggerConfig.transports.push(
      new winston.transports.File({
        filename: options.filename,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    );
  }

  // ELK Stack transport
  if (options.elkConfig) {
    const { host, port, index } = options.elkConfig;
    // Note: Actual ELK transport would be configured here
    // This is a placeholder for the actual implementation
  }

  return winston.createLogger(loggerConfig);
};

// Initialize logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || LOG_LEVELS.INFO,
  format: DEFAULT_LOG_FORMAT,
  enableConsole: true,
  enableFile: true,
  filename: process.env.LOG_FILE || 'api-gateway.log',
  elkConfig: {
    host: process.env.ELK_HOST || 'localhost',
    port: parseInt(process.env.ELK_PORT || '9200', 10),
    index: process.env.ELK_INDEX || ELK_INDEX_PREFIX
  }
});

// Performance monitoring middleware
const performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime();
  const startMemory = process.memoryUsage().heapUsed;

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const responseTime = seconds * 1000 + nanoseconds / 1000000;
    const memoryUsed = process.memoryUsage().heapUsed - startMemory;

    if (responseTime > PERFORMANCE_THRESHOLD_MS) {
      logger.warn('Performance threshold exceeded', {
        responseTime,
        memoryUsed,
        url: req.url,
        method: req.method
      });
    }

    logger.debug('Performance metrics', {
      responseTime,
      memoryUsed,
      url: req.url,
      method: req.method
    });
  });

  next();
};

// Main request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = uuidv4();
  const correlationId = req.headers['x-correlation-id'] as string || requestId;

  // Add tracking headers
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', correlationId);

  const startTime = Date.now();

  // Create base log entry
  const logEntry: RequestLog = {
    requestId,
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip,
    responseTime: 0,
    statusCode: 0,
    timestamp: new Date().toISOString(),
    performanceMetrics: {
      memoryUsage: 0,
      cpuUsage: 0,
      responseTimePercentile: 0
    },
    securityFlags: {
      suspicious: false,
      patternMatches: [],
      alertGenerated: false
    },
    metadata: {}
  };

  // Log request
  logger.info('Incoming request', {
    ...logEntry,
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  // Response logging
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logEntry.responseTime = responseTime;
    logEntry.statusCode = res.statusCode;
    logEntry.performanceMetrics = {
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user,
      responseTimePercentile: responseTime
    };

    // Security pattern analysis
    const suspiciousPatterns = [
      /sql\s*injection/i,
      /script\s*tag/i,
      /(union|select|insert|update|delete)\s+/i
    ];

    logEntry.securityFlags.patternMatches = suspiciousPatterns
      .filter(pattern => pattern.test(req.url) || pattern.test(JSON.stringify(req.body)))
      .map(pattern => pattern.source);

    logEntry.securityFlags.suspicious = logEntry.securityFlags.patternMatches.length > 0;

    if (logEntry.securityFlags.suspicious) {
      logger.warn('Suspicious request pattern detected', logEntry);
      logEntry.securityFlags.alertGenerated = true;
    }

    // Log response
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    logger[logLevel]('Request completed', logEntry);
  });

  next();
};

export {
  requestLogger,
  performanceLogger,
  logger,
  LOG_LEVELS,
  type LoggerOptions,
  type RequestLog
};