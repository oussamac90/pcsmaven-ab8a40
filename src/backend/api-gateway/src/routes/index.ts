import express, { Router } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5
import expressPrometheusMiddleware from 'express-prometheus-middleware'; // ^1.2.0
import rateLimit from 'express-rate-limit'; // ^6.9.0

// Import route modules
import authRouter from './auth.routes';
import vesselRouter from './vessel.routes';
import cargoRouter from './cargo.routes';
import documentRouter from './document.routes';
import paymentRouter from './payment.routes';

// Import middleware
import errorHandler from '../middleware/error.middleware';
import { requestLogger, performanceLogger } from '../middleware/logging.middleware';

// Import configurations
import { corsOptions } from '../config/cors.config';
import { defaultRateLimiter } from '../config/rate-limit.config';

// Constants
const API_VERSION = 'v1';
const BASE_PATH = `/api/${API_VERSION}`;

// Rate limiting configuration
const RATE_LIMIT = {
    windowMs: 900000, // 15 minutes
    max: 1000, // 1000 requests per windowMs
    message: 'Too many requests from this IP'
};

/**
 * Configures and applies all middleware to the router
 * @param router Express Router instance
 * @returns Router with middleware configured
 */
const configureMiddleware = (router: Router): Router => {
    // Security middleware
    router.use(helmet({
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
    router.use(cors(corsOptions));

    // Body parsing and compression
    router.use(express.json({ limit: '10mb' }));
    router.use(express.urlencoded({ extended: true, limit: '10mb' }));
    router.use(compression());

    // Rate limiting
    router.use(defaultRateLimiter);

    // Request logging and performance monitoring
    router.use(requestLogger);
    router.use(performanceLogger);

    // Prometheus metrics
    router.use(expressPrometheusMiddleware({
        metricsPath: '/metrics',
        collectDefaultMetrics: true,
        requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5],
        requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
        responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400]
    }));

    return router;
};

/**
 * Configures and combines all route modules with proper middleware chains
 * @returns Fully configured Express router
 */
const configureRoutes = (): Router => {
    const router = express.Router();

    // Configure base middleware
    configureMiddleware(router);

    // Mount route modules
    router.use(`${BASE_PATH}/auth`, authRouter);
    router.use(`${BASE_PATH}/vessels`, vesselRouter);
    router.use(`${BASE_PATH}/cargo`, cargoRouter);
    router.use(`${BASE_PATH}/documents`, documentRouter);
    router.use(`${BASE_PATH}/payments`, paymentRouter);

    // Health check endpoint
    router.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            version: API_VERSION,
            timestamp: new Date().toISOString()
        });
    });

    // Metrics endpoint (protected)
    router.get('/metrics', (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.METRICS_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    });

    // Error handling middleware
    router.use(errorHandler);

    return router;
};

// Export configured router
const router = configureRoutes();
export default router;