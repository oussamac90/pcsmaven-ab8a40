// External imports
import cors, { CorsOptions } from 'cors'; // v2.8.5
import dotenv from 'dotenv'; // v16.0.3

// Initialize environment variables
dotenv.config();

// Constants for CORS configuration
const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const DEFAULT_ALLOWED_HEADERS = [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-Client-Version',
    'Accept',
    'Origin'
];
const DEFAULT_EXPOSED_HEADERS = [
    'X-Total-Count',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
];
const DEFAULT_MAX_AGE = 86400; // 24 hours
const CORS_CACHE_DURATION = 3600; // 1 hour

// Cache for origin validation
const originValidationCache = new Map<string, { isValid: boolean; timestamp: number }>();
let allowedOriginsCache: { origins: string[]; timestamp: number } | null = null;

/**
 * Retrieves and validates allowed origins from environment variables
 * @returns Array of validated origin domains
 */
const getAllowedOrigins = (): string[] => {
    const now = Date.now();

    // Return cached origins if still valid
    if (allowedOriginsCache && (now - allowedOriginsCache.timestamp < CORS_CACHE_DURATION * 1000)) {
        return allowedOriginsCache.origins;
    }

    const originsString = process.env.ALLOWED_ORIGINS || '';
    const origins = originsString
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => {
            // Validate origin format
            try {
                if (origin === '*') return true;
                new URL(origin);
                return true;
            } catch {
                console.warn(`Invalid origin format: ${origin}`);
                return false;
            }
        });

    // Cache the validated origins
    allowedOriginsCache = {
        origins,
        timestamp: now
    };

    return origins;
};

/**
 * Validates request origin against allowed list with caching
 * @param origin Origin to validate
 * @returns Boolean indicating if origin is allowed
 */
const validateOrigin = (origin: string): boolean => {
    const now = Date.now();
    const cacheKey = origin;

    // Check cache
    const cached = originValidationCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CORS_CACHE_DURATION * 1000)) {
        return cached.isValid;
    }

    const allowedOrigins = getAllowedOrigins();
    let isValid = false;

    if (allowedOrigins.includes('*')) {
        isValid = true;
    } else {
        isValid = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin.includes('*')) {
                // Convert wildcard pattern to regex
                const pattern = new RegExp('^' + allowedOrigin.replace(/\*/g, '.*') + '$');
                return pattern.test(origin);
            }
            return allowedOrigin === origin;
        });
    }

    // Cache the validation result
    originValidationCache.set(cacheKey, { isValid, timestamp: now });

    return isValid;
};

/**
 * Production-ready CORS configuration with security and performance optimizations
 */
export const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            callback(null, true);
            return;
        }

        if (validateOrigin(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation: Origin not allowed'), false);
        }
    },
    methods: DEFAULT_ALLOWED_METHODS,
    allowedHeaders: DEFAULT_ALLOWED_HEADERS,
    exposedHeaders: DEFAULT_EXPOSED_HEADERS,
    credentials: true,
    maxAge: DEFAULT_MAX_AGE,
    preflightContinue: false,
    optionsSuccessStatus: 204,
};

// Additional security measures for production environment
if (process.env.NODE_ENV === 'production' && process.env.CORS_STRICT_MODE === 'true') {
    corsOptions.allowedHeaders = DEFAULT_ALLOWED_HEADERS.filter(header => 
        !['X-Client-Version'].includes(header)
    );
    corsOptions.maxAge = DEFAULT_MAX_AGE / 2; // Reduce cache duration in strict mode
}

export default corsOptions;