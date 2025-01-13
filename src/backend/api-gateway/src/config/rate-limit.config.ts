// External dependencies
// express-rate-limit@6.7.0
import rateLimit from 'express-rate-limit';
// rate-limit-redis@3.0.0
import RedisStore from 'rate-limit-redis';
// ioredis@5.3.0
import Redis from 'ioredis';
import { Request } from 'express';

// Interface for rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipFailedRequests: boolean;
  keyGenerator: (req: Request) => string;
  redisConfig: Redis.RedisOptions;
}

// Constants for rate limiting configuration
const DEFAULT_WINDOW_MS = 60000; // 1 minute window
const DEFAULT_MAX_REQUESTS = 1000; // Maximum requests per window per IP
const REDIS_PREFIX = 'pcs:ratelimit:';

/**
 * Generates a unique key for rate limiting based on IP and normalized route path
 * @param req Express request object
 * @returns Unique rate limit key with prefix
 */
export const generateKey = (req: Request): string => {
  // Get client IP, checking X-Forwarded-For for proxy support
  const clientIp = (req.headers['x-forwarded-for'] as string) || 
                   req.socket.remoteAddress || 
                   'unknown';

  // Normalize the request path by removing query parameters and trailing slashes
  const normalizedPath = req.path
    .split('?')[0]
    .replace(/\/+$/, '');

  // Combine IP and path with prefix
  return `${REDIS_PREFIX}${clientIp}:${normalizedPath}`;
};

/**
 * Creates a rate limiter middleware instance with Redis store and specified options
 * @param options Partial rate limit configuration options
 * @returns Configured rate limiter middleware with Redis store
 */
export const createRateLimiter = (options: Partial<RateLimitConfig>) => {
  // Initialize Redis client with clustering support
  const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      return Math.min(times * 50, 2000);
    },
    ...options.redisConfig
  });

  // Handle Redis connection errors
  redisClient.on('error', (err) => {
    console.error('Redis rate limit store error:', err);
  });

  // Configure Redis store with prefix
  const redisStore = new RedisStore({
    prefix: REDIS_PREFIX,
    // Send ping command every 60s
    sendCommand: (...args: any[]) => redisClient.call(...args),
    // Disconnect client on reset
    onReset: () => redisClient.disconnect()
  });

  // Merge provided options with defaults
  const config: RateLimitConfig = {
    windowMs: DEFAULT_WINDOW_MS,
    max: DEFAULT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable legacy X-RateLimit headers
    skipFailedRequests: false, // Count failed requests against limit
    keyGenerator: generateKey,
    redisConfig: {},
    ...options
  };

  // Create and return rate limiter middleware
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: config.standardHeaders,
    legacyHeaders: config.legacyHeaders,
    skipFailedRequests: config.skipFailedRequests,
    keyGenerator: config.keyGenerator,
    store: redisStore,
    handler: (req, res) => {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        message: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    }
  });
};

// Export default rate limiter with standard configuration
export const defaultRateLimiter = createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  max: DEFAULT_MAX_REQUESTS,
  message: 'Rate limit exceeded. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

export default defaultRateLimiter;