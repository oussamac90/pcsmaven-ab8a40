import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { expressjwt, GetVerificationKey } from 'express-jwt'; // ^8.4.1
import { auth } from 'express-oauth2-jwt-bearer'; // ^1.5.0
import { createLogger, format, transports } from 'winston'; // ^3.8.2
import { RateLimiterMemory } from 'rate-limiter-flexible'; // ^2.4.1
import { jwt } from '../config/auth.config';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.utils';

// Configure secure logging
const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.File({ filename: 'auth-audit.log' })
    ]
});

// Constants for authentication configuration
const AUTH_ERROR_MESSAGES = {
    TOKEN_MISSING: 'Authentication token is missing',
    TOKEN_INVALID: 'Invalid authentication token',
    TOKEN_EXPIRED: 'Authentication token has expired',
    TOKEN_BLACKLISTED: 'Token has been revoked',
    API_KEY_MISSING: 'API key is missing',
    API_KEY_INVALID: 'Invalid API key',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    UNAUTHORIZED: 'Unauthorized access'
} as const;

const HTTP_STATUS = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    TOO_MANY_REQUESTS: 429
} as const;

const RATE_LIMIT_CONFIG = {
    WINDOW_MS: 900000, // 15 minutes
    MAX_REQUESTS: 100,
    BLOCK_DURATION: 3600000 // 1 hour
} as const;

// Configure rate limiter
const rateLimiter = new RateLimiterMemory({
    points: RATE_LIMIT_CONFIG.MAX_REQUESTS,
    duration: RATE_LIMIT_CONFIG.WINDOW_MS / 1000,
    blockDuration: RATE_LIMIT_CONFIG.BLOCK_DURATION / 1000
});

// Extended Request interface with auth data
interface AuthenticatedRequest extends Request {
    userId?: string;
    email?: string;
    roles?: string[];
    companyId?: string;
    rateLimitRemaining?: number;
    rateLimitReset?: number;
}

// JWT Authentication Middleware
export const authenticateJWT = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Check rate limit
        const ip = req.ip;
        const rateLimitResult = await rateLimiter.consume(ip);

        // Attach rate limit info to request
        req.rateLimitRemaining = rateLimitResult.remainingPoints;
        req.rateLimitReset = rateLimitResult.msBeforeNext;

        // Extract token
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
            throw new Error(AUTH_ERROR_MESSAGES.TOKEN_MISSING);
        }

        // Verify token
        const decoded = await verifyToken(token);

        // Attach user data to request
        req.userId = decoded.userId;
        req.email = decoded.email;
        req.roles = decoded.roles;
        req.companyId = decoded.companyId;

        // Log successful authentication
        logger.info('JWT authentication successful', {
            userId: decoded.userId,
            ip
        });

        next();
    } catch (error) {
        handleAuthError(error, req, res, next);
    }
};

// Auth0 Authentication Middleware
export const authenticateAuth0 = auth({
    audience: jwt.audience,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
    tokenSigningAlg: 'RS256'
});

// API Key Authentication Middleware
export const authenticateAPIKey = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Check rate limit
        const ip = req.ip;
        const apiKey = req.headers['x-api-key'] as string;
        const rateLimitKey = `${ip}:${apiKey}`;
        const rateLimitResult = await rateLimiter.consume(rateLimitKey);

        // Attach rate limit info
        req.rateLimitRemaining = rateLimitResult.remainingPoints;
        req.rateLimitReset = rateLimitResult.msBeforeNext;

        if (!apiKey) {
            throw new Error(AUTH_ERROR_MESSAGES.API_KEY_MISSING);
        }

        // Validate API key format
        const API_KEY_REGEX = /^[A-Za-z0-9-_]{32,64}$/;
        if (!API_KEY_REGEX.test(apiKey)) {
            throw new Error(AUTH_ERROR_MESSAGES.API_KEY_INVALID);
        }

        // TODO: Implement API key validation against database
        // This is a placeholder for actual API key validation logic
        const apiKeyData = {
            clientId: 'placeholder',
            permissions: ['read']
        };

        // Attach API client data to request
        req.userId = apiKeyData.clientId;
        req.roles = apiKeyData.permissions;

        // Log successful authentication
        logger.info('API key authentication successful', {
            clientId: apiKeyData.clientId,
            ip
        });

        next();
    } catch (error) {
        handleAuthError(error, req, res, next);
    }
};

// Enhanced error handler for authentication failures
export const handleAuthError = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    let statusCode = HTTP_STATUS.UNAUTHORIZED;
    let message = AUTH_ERROR_MESSAGES.UNAUTHORIZED;

    // Determine specific error type
    if (error.message === AUTH_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED) {
        statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
        message = error.message;
    } else if (error.message === AUTH_ERROR_MESSAGES.TOKEN_BLACKLISTED) {
        message = error.message;
    }

    // Log authentication failure
    logger.error('Authentication failed', {
        error: error.message,
        ip: req.ip,
        path: req.path
    });

    // Send error response
    res.status(statusCode).json({
        error: {
            message,
            code: statusCode,
            timestamp: new Date().toISOString()
        }
    });
};