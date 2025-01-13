// External dependencies
import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^6.0.1
import cors from 'cors'; // ^2.8.5
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import winston from 'winston'; // ^3.8.2
import { Registry, collectDefaultMetrics } from 'prom-client'; // ^14.0.1

// Internal imports
import { corsOptions } from './config/cors.config';
import router from './routes';
import { authenticateJWT } from './middleware/auth.middleware';
import errorHandler from './middleware/error.middleware';
import { requestLogger, performanceLogger, logger } from './middleware/logging.middleware';
import { defaultRateLimiter } from './config/rate-limit.config';

// Constants
const DEFAULT_PORT = 3000;
const API_VERSION = process.env.API_VERSION || 'v1';
const BASE_PATH = `/api/${API_VERSION}`;
const BODY_PARSER_LIMIT = '10mb';

// Initialize Express application
const app: Express = express();

// Initialize Prometheus metrics
const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

/**
 * Configures comprehensive Express application middleware stack
 * with security, performance, and monitoring features
 */
const configureMiddleware = (app: Express): void => {
    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'"],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }));

    // CORS configuration
    app.use(cors(corsOptions));

    // Body parsing and compression
    app.use(express.json({ limit: BODY_PARSER_LIMIT }));
    app.use(express.urlencoded({ extended: true, limit: BODY_PARSER_LIMIT }));
    app.use(compression());

    // Request logging
    app.use(morgan('combined', {
        stream: { write: message => logger.info(message.trim()) }
    }));

    // Performance monitoring
    app.use(performanceLogger);

    // Request tracking and logging
    app.use(requestLogger);

    // Rate limiting protection
    app.use(defaultRateLimiter);

    // JWT Authentication for protected routes
    app.use(`${BASE_PATH}/*`, authenticateJWT);
};

/**
 * Configures API routes and error handling
 */
const configureRoutes = (app: Express): void => {
    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({
            status: 'healthy',
            version: API_VERSION,
            timestamp: new Date().toISOString()
        });
    });

    // Metrics endpoint for Prometheus
    app.get('/metrics', async (req: Request, res: Response) => {
        try {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        } catch (error) {
            res.status(500).end(error);
        }
    });

    // Mount API routes
    app.use(BASE_PATH, router);

    // 404 handler
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            error: 'Not Found',
            message: 'The requested resource does not exist',
            path: req.path
        });
    });

    // Error handling middleware
    app.use(errorHandler);
};

/**
 * Initializes and starts the Express server
 */
const startServer = async (app: Express): Promise<void> => {
    try {
        const port = process.env.PORT || DEFAULT_PORT;

        // Configure middleware and routes
        configureMiddleware(app);
        configureRoutes(app);

        // Start server
        const server = app.listen(port, () => {
            logger.info(`API Gateway started on port ${port}`, {
                version: API_VERSION,
                environment: process.env.NODE_ENV
            });
        });

        // Graceful shutdown handler
        const shutdown = async () => {
            logger.info('Shutting down API Gateway...');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });

            // Force close after 10s
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        logger.error('Failed to start API Gateway', { error });
        process.exit(1);
    }
};

// Initialize server
startServer(app);

export default app;