import express, { Request, Response, NextFunction, RequestHandler } from 'express'; // ^4.18.2
import { createProxyMiddleware, Options as ProxyOptions } from 'http-proxy-middleware'; // ^2.0.6
import winston from 'winston'; // ^3.8.2
import CircuitBreaker from 'circuit-breaker-js'; // ^0.0.1
import { jwt } from '../config/auth.config';
import { corsOptions } from '../config/cors.config';
import { createRateLimiter } from '../config/rate-limit.config';

// Interfaces
interface ServiceConfig {
    name: string;
    url: string;
    routes: string[];
    requiresAuth: boolean;
    rateLimit?: {
        windowMs: number;
        max: number;
    };
    circuitBreaker?: {
        timeout: number;
        errorThreshold: number;
        resetTimeout: number;
    };
    caching?: {
        enabled: boolean;
        duration: number;
    };
    security?: {
        validatePayload: boolean;
        maxBodySize: string;
        allowedMethods: string[];
    };
}

// Constants
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_COUNT = 3;
const CIRCUIT_BREAKER_OPTIONS = {
    timeout: 10000,
    errorThreshold: 50,
    resetTimeout: 30000,
    monitorInterval: 5000
};
const RATE_LIMIT_OPTIONS = {
    windowMs: 60000,
    max: 100,
    standardHeaders: true
};

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'proxy-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'proxy-combined.log' })
    ]
});

@Injectable()
@Monitored
export class ProxyService {
    private circuitBreakers: Map<string, CircuitBreaker>;
    private serviceConfigs: Map<string, ServiceConfig>;
    private metrics: MetricsCollector;

    constructor(services: ServiceConfig[]) {
        this.circuitBreakers = new Map();
        this.serviceConfigs = new Map();
        this.metrics = new MetricsCollector();
        
        services.forEach(service => {
            this.serviceConfigs.set(service.name, service);
            this.initializeCircuitBreaker(service);
        });
    }

    private initializeCircuitBreaker(service: ServiceConfig): void {
        const options = {
            ...CIRCUIT_BREAKER_OPTIONS,
            ...service.circuitBreaker
        };

        const breaker = new CircuitBreaker({
            windowDuration: options.timeout,
            errorThreshold: options.errorThreshold,
            resetTimeout: options.resetTimeout
        });

        breaker.onStateChange((state: string) => {
            logger.info(`Circuit breaker state changed for ${service.name}: ${state}`);
            this.metrics.recordCircuitBreakerState(service.name, state);
        });

        this.circuitBreakers.set(service.name, breaker);
    }

    @LogMetrics
    @MonitorPerformance
    public createServiceProxy(serviceName: string): RequestHandler {
        const config = this.serviceConfigs.get(serviceName);
        if (!config) {
            throw new Error(`Service configuration not found for: ${serviceName}`);
        }

        const rateLimiter = createRateLimiter({
            ...RATE_LIMIT_OPTIONS,
            ...config.rateLimit
        });

        const proxyOptions: ProxyOptions = {
            target: config.url,
            changeOrigin: true,
            secure: true,
            xfwd: true,
            timeout: DEFAULT_TIMEOUT,
            proxyTimeout: DEFAULT_TIMEOUT,
            pathRewrite: this.createPathRewrite(config),
            onProxyReq: this.handleProxyRequest.bind(this),
            onProxyRes: this.handleProxyResponse.bind(this),
            onError: this.handleProxyError.bind(this)
        };

        const middlewareChain = [
            this.validateRequest.bind(this),
            rateLimiter,
            this.authenticateRequest.bind(this, config),
            this.securityMiddleware.bind(this, config),
            this.metricsMiddleware.bind(this),
            this.circuitBreakerMiddleware.bind(this, config)
        ];

        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                for (const middleware of middlewareChain) {
                    await new Promise((resolve, reject) => {
                        middleware(req, res, (error?: any) => {
                            if (error) reject(error);
                            else resolve(true);
                        });
                    });
                }
                
                createProxyMiddleware(proxyOptions)(req, res, next);
            } catch (error) {
                this.handleProxyError(error, req, res);
            }
        };
    }

    private validateRequest(req: Request, res: Response, next: NextFunction): void {
        const config = this.serviceConfigs.get(req.baseUrl.split('/')[1]);
        if (!config) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }

        if (config.security?.validatePayload && req.method !== 'GET') {
            const contentLength = parseInt(req.headers['content-length'] || '0');
            const maxSize = parseInt(config.security.maxBodySize || '10mb');
            
            if (contentLength > maxSize) {
                res.status(413).json({ error: 'Payload too large' });
                return;
            }
        }

        next();
    }

    private authenticateRequest(config: ServiceConfig, req: Request, res: Response, next: NextFunction): void {
        if (!config.requiresAuth) {
            next();
            return;
        }

        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        try {
            // Verify JWT token
            const decoded = jwt.verify(token, jwt.secret);
            req.user = decoded;
            next();
        } catch (error) {
            logger.error('Authentication error:', error);
            res.status(401).json({ error: 'Invalid authentication token' });
        }
    }

    private securityMiddleware(config: ServiceConfig, req: Request, res: Response, next: NextFunction): void {
        // Apply CORS
        corsOptions.origin(req.headers.origin, (error, allowed) => {
            if (!allowed) {
                res.status(403).json({ error: 'CORS not allowed' });
                return;
            }
            
            // Validate HTTP method
            if (config.security?.allowedMethods && 
                !config.security.allowedMethods.includes(req.method)) {
                res.status(405).json({ error: 'Method not allowed' });
                return;
            }

            next();
        });
    }

    @LogMetrics
    private metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
        const startTime = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            this.metrics.recordRequestMetrics({
                service: req.baseUrl.split('/')[1],
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration
            });
        });

        next();
    }

    private circuitBreakerMiddleware(config: ServiceConfig, req: Request, res: Response, next: NextFunction): void {
        const breaker = this.circuitBreakers.get(config.name);
        if (!breaker) {
            next();
            return;
        }

        breaker.run(
            () => next(),
            () => res.status(503).json({ error: 'Service temporarily unavailable' })
        );
    }

    @LogError
    @AlertOperations
    private handleProxyError(error: Error, req: Request, res: Response): void {
        logger.error('Proxy error:', {
            error: error.message,
            service: req.baseUrl.split('/')[1],
            path: req.path,
            method: req.method
        });

        const serviceName = req.baseUrl.split('/')[1];
        const breaker = this.circuitBreakers.get(serviceName);
        if (breaker) {
            breaker.recordFailure();
        }

        this.metrics.recordError(serviceName, error);

        res.status(502).json({
            error: 'Gateway Error',
            message: 'Unable to process request',
            correlationId: req.headers['x-correlation-id']
        });
    }

    private createPathRewrite(config: ServiceConfig): { [key: string]: string } {
        const pathRewrite: { [key: string]: string } = {};
        config.routes.forEach(route => {
            pathRewrite[`^/${config.name}${route}`] = route;
        });
        return pathRewrite;
    }

    private handleProxyRequest(proxyReq: any, req: Request, res: Response): void {
        proxyReq.setHeader('x-correlation-id', req.headers['x-correlation-id'] || 
            `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }

    private handleProxyResponse(proxyRes: any, req: Request, res: Response): void {
        proxyRes.headers['x-proxy-service'] = req.baseUrl.split('/')[1];
    }
}

export interface MetricsCollector {
    recordRequestMetrics(metrics: {
        service: string;
        method: string;
        path: string;
        statusCode: number;
        duration: number;
    }): void;
    recordError(service: string, error: Error): void;
    recordCircuitBreakerState(service: string, state: string): void;
}