import { sign, verify, JwtPayload as BaseJwtPayload } from 'jsonwebtoken'; // ^9.0.0
import { createLogger, format, transports } from 'winston'; // ^3.8.2
import { jwt } from '../config/auth.config';
import { randomBytes } from 'crypto';

// Configure secure logging for audit trail
const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.File({ filename: 'jwt-audit.log' })
    ]
});

// Secure interface for JWT payload with strict typing
export interface JWTPayload extends BaseJwtPayload {
    userId: string;
    email: string;
    roles: string[];
    companyId: string;
    iat?: number;
    exp?: number;
    jti?: string;
    iss?: string;
    aud?: string;
}

// Interface for token generation options with security parameters
export interface TokenOptions {
    expiresIn?: string;
    algorithm?: string;
    issuer?: string;
    audience?: string;
    jwtid?: string;
    notBefore?: boolean;
}

// Security constants
const DEFAULT_TOKEN_EXPIRY = '1h';
const DEFAULT_ALGORITHM = 'HS256';
const TOKEN_PREFIX = 'Bearer';
const MIN_SECRET_LENGTH = 32;
const MAX_TOKEN_LENGTH = 4096;
const REFRESH_WINDOW = '24h';

// Secure token generation with comprehensive validation
export async function generateToken(
    payload: JWTPayload,
    options: TokenOptions = {}
): Promise<string> {
    try {
        // Validate secret length and complexity
        if (!jwt.secret || jwt.secret.length < MIN_SECRET_LENGTH) {
            throw new Error('Invalid JWT secret configuration');
        }

        // Validate required payload fields
        if (!payload.userId || !payload.email || !payload.roles || !payload.companyId) {
            throw new Error('Missing required payload fields');
        }

        // Sanitize payload data
        const sanitizedPayload = {
            userId: payload.userId.trim(),
            email: payload.email.toLowerCase().trim(),
            roles: payload.roles.map(role => role.trim()),
            companyId: payload.companyId.trim()
        };

        // Generate unique JWT ID for tracking
        const jwtid = options.jwtid || randomBytes(32).toString('hex');

        // Merge options with secure defaults
        const tokenOptions = {
            expiresIn: options.expiresIn || jwt.expiresIn || DEFAULT_TOKEN_EXPIRY,
            algorithm: options.algorithm || jwt.algorithm || DEFAULT_ALGORITHM,
            issuer: options.issuer || jwt.issuer,
            audience: options.audience || jwt.audience,
            jwtid,
            notBefore: options.notBefore || 0
        };

        // Generate token with security headers
        const token = sign(sanitizedPayload, jwt.secret, tokenOptions);

        // Log token generation for audit
        logger.info('JWT token generated', {
            userId: sanitizedPayload.userId,
            jwtid,
            issuer: tokenOptions.issuer
        });

        return token;
    } catch (error) {
        logger.error('Token generation failed', { error: error.message });
        throw new Error('Token generation failed');
    }
}

// Comprehensive token verification with security checks
export async function verifyToken(token: string): Promise<JWTPayload> {
    try {
        // Validate token length and format
        if (!token || token.length > MAX_TOKEN_LENGTH || !token.includes('.')) {
            throw new Error('Invalid token format');
        }

        // Verify token with all security checks enabled
        const decoded = verify(token, jwt.secret, {
            algorithms: [jwt.algorithm || DEFAULT_ALGORITHM],
            issuer: jwt.issuer,
            audience: jwt.audience,
            complete: true
        }) as JWTPayload;

        // Log verification for audit
        logger.info('JWT token verified', {
            userId: decoded.userId,
            jwtid: decoded.jti
        });

        return decoded;
    } catch (error) {
        logger.error('Token verification failed', { error: error.message });
        throw new Error('Token verification failed');
    }
}

// Secure token refresh with validation
export async function refreshToken(oldToken: string): Promise<string> {
    try {
        // Verify old token is valid
        const decoded = await verifyToken(oldToken);

        // Check refresh eligibility
        const tokenExp = decoded.exp || 0;
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (tokenExp - currentTime > parseInt(REFRESH_WINDOW)) {
            throw new Error('Token not eligible for refresh');
        }

        // Generate new token with same payload but new expiration
        const newToken = await generateToken({
            userId: decoded.userId,
            email: decoded.email,
            roles: decoded.roles,
            companyId: decoded.companyId
        });

        // Log refresh for audit
        logger.info('Token refreshed', {
            oldJwtId: decoded.jti,
            userId: decoded.userId
        });

        return newToken;
    } catch (error) {
        logger.error('Token refresh failed', { error: error.message });
        throw new Error('Token refresh failed');
    }
}

// Secure token extraction from Authorization header
export function extractTokenFromHeader(authHeader: string): string | null {
    try {
        if (!authHeader || !authHeader.startsWith(TOKEN_PREFIX)) {
            return null;
        }

        const token = authHeader.split(' ')[1];

        // Validate token format and length
        if (!token || token.length > MAX_TOKEN_LENGTH || !token.includes('.')) {
            return null;
        }

        // Log extraction attempt
        logger.debug('Token extracted from header');

        return token;
    } catch (error) {
        logger.error('Token extraction failed', { error: error.message });
        return null;
    }
}