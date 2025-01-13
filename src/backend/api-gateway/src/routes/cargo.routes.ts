import express, { Router } from 'express'; // ^4.18.2
import Joi from 'joi'; // ^17.9.2
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { authenticateJWT } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { ProxyService } from '../services/proxy.service';
import { corsOptions } from '../config/cors.config';
import { createRateLimiter } from '../config/rate-limit.config';

// Constants for cargo service configuration
const CARGO_SERVICE_CONFIG = {
    name: 'cargo-service',
    url: 'http://core-service:8080',
    routes: ['/api/v1/cargo/*'],
    requiresAuth: true,
    rateLimit: {
        windowMs: 60000, // 1 minute
        max: 100,
        standardHeaders: true,
        legacyHeaders: false
    },
    circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000
    },
    caching: {
        ttl: 300, // 5 minutes
        excludedRoutes: ['/api/v1/cargo/status']
    }
};

// Validation schemas for cargo endpoints
const cargoValidationSchemas = {
    tracking: {
        params: Joi.object({
            id: Joi.string().required().pattern(/^[A-Z0-9]{11}$/)
                .message('Invalid cargo tracking ID format')
        })
    },
    manifest: {
        body: Joi.object({
            vesselCallId: Joi.string().required().pattern(/^VC\d{8}$/)
                .message('Invalid vessel call ID format'),
            cargoTypeId: Joi.string().required().pattern(/^CT\d{6}$/)
                .message('Invalid cargo type ID format'),
            weight: Joi.number().required().min(0).max(999999.99)
                .message('Weight must be between 0 and 999999.99'),
            volume: Joi.number().required().min(0).max(999999.99)
                .message('Volume must be between 0 and 999999.99'),
            consigneeId: Joi.string().required().pattern(/^CN\d{6}$/)
                .message('Invalid consignee ID format'),
            edifactMessage: Joi.string().required()
                .message('EDIFACT message is required')
        })
    },
    manifestUpdate: {
        params: Joi.object({
            id: Joi.string().required().pattern(/^CM\d{8}$/)
                .message('Invalid cargo manifest ID format')
        }),
        body: Joi.object({
            status: Joi.string().required().valid('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')
                .message('Invalid manifest status'),
            location: Joi.string().required().pattern(/^[A-Z]{5}$/)
                .message('Invalid location code format'),
            edifactUpdate: Joi.string().required()
                .message('EDIFACT update message is required')
        })
    },
    statusUpdate: {
        params: Joi.object({
            id: Joi.string().required().pattern(/^[A-Z0-9]{11}$/)
                .message('Invalid cargo ID format')
        }),
        body: Joi.object({
            status: Joi.string().required()
                .valid('RECEIVED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION')
                .message('Invalid cargo status'),
            location: Joi.string().required().pattern(/^[A-Z]{5}$/)
                .message('Invalid location code format'),
            timestamp: Joi.date().iso().required()
                .message('Invalid timestamp format'),
            notes: Joi.string().max(500)
                .message('Notes cannot exceed 500 characters')
        })
    }
};

// Initialize router and proxy service
const cargoRouter: Router = express.Router();
const proxyService = new ProxyService([CARGO_SERVICE_CONFIG]);

// Configure middleware
cargoRouter.use(compression());
cargoRouter.use(cors(corsOptions));
cargoRouter.use(express.json({ limit: '10mb' }));
cargoRouter.use(createRateLimiter(CARGO_SERVICE_CONFIG.rateLimit));

// Cargo tracking endpoint
cargoRouter.get('/api/v1/cargo/track/:id',
    authenticateJWT,
    validateRequest(cargoValidationSchemas.tracking),
    proxyService.createServiceProxy(CARGO_SERVICE_CONFIG.name)
);

// Cargo manifest creation endpoint
cargoRouter.post('/api/v1/cargo/manifest',
    authenticateJWT,
    validateRequest(cargoValidationSchemas.manifest),
    proxyService.createServiceProxy(CARGO_SERVICE_CONFIG.name)
);

// Cargo manifest update endpoint
cargoRouter.put('/api/v1/cargo/manifest/:id',
    authenticateJWT,
    validateRequest(cargoValidationSchemas.manifestUpdate),
    proxyService.createServiceProxy(CARGO_SERVICE_CONFIG.name)
);

// Cargo status update endpoint
cargoRouter.put('/api/v1/cargo/status/:id',
    authenticateJWT,
    validateRequest(cargoValidationSchemas.statusUpdate),
    proxyService.createServiceProxy(CARGO_SERVICE_CONFIG.name)
);

// Error handling middleware
cargoRouter.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Cargo route error:', err);
    res.status(err.status || 500).json({
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: err.message || 'An unexpected error occurred',
            details: err.details,
            requestId: req.headers['x-request-id']
        }
    });
});

export default cargoRouter;