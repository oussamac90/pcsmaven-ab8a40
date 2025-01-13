import dotenv from 'dotenv'; // ^16.0.3

// Load environment variables
dotenv.config();

// Constants for configuration validation and defaults
const DEFAULT_JWT_EXPIRY = '1h';
const DEFAULT_API_KEY_HEADER = 'X-API-Key';
const DEFAULT_HASH_ALGORITHM = 'SHA-256';
const MIN_SECRET_LENGTH = 32;
const ALLOWED_JWT_ALGORITHMS = ['RS256', 'ES256'] as const;
const MAX_TOKEN_LIFETIME_SECONDS = 3600;
const MAX_KEYS_PER_CLIENT = 5;

// Interface definitions with strict validation
interface JWTConfig {
    readonly secret: string;
    readonly expiresIn: string;
    readonly algorithm: string;
    readonly issuer: string;
    readonly audience: string;
    readonly enabled: boolean;
    readonly minSecretLength: number;
    readonly allowedAlgorithms: string[];
}

interface Auth0Config {
    readonly domain: string;
    readonly audience: string;
    readonly clientId: string;
    readonly clientSecret: string;
    readonly callbackUrl: string;
    readonly enabled: boolean;
    readonly allowedCallbackDomains: string[];
    readonly tokenLifetimeSeconds: number;
}

interface APIKeyConfig {
    readonly headerName: string;
    readonly expirationDays: number;
    readonly hashAlgorithm: string;
    readonly enabled: boolean;
    readonly maxKeysPerClient: number;
    readonly allowedHashAlgorithms: string[];
    readonly requireHttps: boolean;
}

// Utility function to validate secret security requirements
const isSecureSecret = (secret: string, minLength: number): boolean => {
    if (!secret || secret.length < minLength) return false;
    
    // Check for complexity requirements
    const hasUpperCase = /[A-Z]/.test(secret);
    const hasLowerCase = /[a-z]/.test(secret);
    const hasNumbers = /\d/.test(secret);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(secret);
    
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars;
};

// Configuration validation function
const validateConfig = (): void => {
    // JWT Configuration Validation
    if (jwt.enabled) {
        if (!isSecureSecret(jwt.secret, MIN_SECRET_LENGTH)) {
            throw new Error('JWT secret does not meet security requirements');
        }
        if (!ALLOWED_JWT_ALGORITHMS.includes(jwt.algorithm as any)) {
            throw new Error('Invalid JWT algorithm specified');
        }
    }

    // Auth0 Configuration Validation
    if (auth0.enabled) {
        if (!auth0.domain || !auth0.clientId || !auth0.clientSecret) {
            throw new Error('Missing required Auth0 configuration');
        }
        if (auth0.tokenLifetimeSeconds > MAX_TOKEN_LIFETIME_SECONDS) {
            throw new Error('Auth0 token lifetime exceeds maximum allowed');
        }
        if (!auth0.callbackUrl.startsWith('https://')) {
            throw new Error('Auth0 callback URL must use HTTPS');
        }
    }

    // API Key Configuration Validation
    if (apiKey.enabled) {
        if (!apiKey.headerName || apiKey.expirationDays <= 0) {
            throw new Error('Invalid API key configuration');
        }
        if (apiKey.maxKeysPerClient > MAX_KEYS_PER_CLIENT) {
            throw new Error('Maximum keys per client exceeds allowed limit');
        }
        if (!apiKey.requireHttps) {
            throw new Error('HTTPS is required for API key authentication');
        }
    }
};

// Immutable configuration exports
export const jwt: Readonly<JWTConfig> = {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRY,
    algorithm: process.env.JWT_ALGORITHM || ALLOWED_JWT_ALGORITHMS[0],
    issuer: process.env.JWT_ISSUER || 'port-community-system',
    audience: process.env.JWT_AUDIENCE || 'pcs-api',
    enabled: process.env.JWT_ENABLED === 'true',
    minSecretLength: MIN_SECRET_LENGTH,
    allowedAlgorithms: [...ALLOWED_JWT_ALGORITHMS]
};

export const auth0: Readonly<Auth0Config> = {
    domain: process.env.AUTH0_DOMAIN || '',
    audience: process.env.AUTH0_AUDIENCE || '',
    clientId: process.env.AUTH0_CLIENT_ID || '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
    callbackUrl: process.env.AUTH0_CALLBACK_URL || '',
    enabled: process.env.AUTH0_ENABLED === 'true',
    allowedCallbackDomains: (process.env.AUTH0_ALLOWED_CALLBACK_DOMAINS || '').split(','),
    tokenLifetimeSeconds: parseInt(process.env.AUTH0_TOKEN_LIFETIME || '3600', 10)
};

export const apiKey: Readonly<APIKeyConfig> = {
    headerName: process.env.API_KEY_HEADER || DEFAULT_API_KEY_HEADER,
    expirationDays: parseInt(process.env.API_KEY_EXPIRATION_DAYS || '90', 10),
    hashAlgorithm: process.env.API_KEY_HASH_ALGORITHM || DEFAULT_HASH_ALGORITHM,
    enabled: process.env.API_KEY_ENABLED === 'true',
    maxKeysPerClient: MAX_KEYS_PER_CLIENT,
    allowedHashAlgorithms: [DEFAULT_HASH_ALGORITHM, 'SHA-384', 'SHA-512'],
    requireHttps: true
};

// Validate configuration on module load
validateConfig();