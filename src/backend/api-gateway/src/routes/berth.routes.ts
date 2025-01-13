import express, { Router, Request, Response, NextFunction } from 'express'; // ^4.18.2
import Joi from 'joi'; // ^17.9.2
import cors from 'cors'; // ^2.8.5
import { RateLimiterMemory } from 'rate-limiter-flexible'; // ^2.4.1
import { authenticateJWT } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { ProxyService } from '../services/proxy.service';

// Constants for berth service configuration
const BERTH_SERVICE_CONFIG = {
    name: 'berth-service',
    url: 'http://core-service:8080',
    routes: ['/api/v1/berths'],
    requiresAuth: true,
    timeout: 5000,
    circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000
    },
    rateLimit: {
        windowMs: 60000,
        max: 100
    },
    cache: {
        ttl: 300,
        methods: ['GET']
    }
};

// Validation schemas for berth operations
const berthRequestSchema = Joi.object({
    vessel_id: Joi.string().uuid().required(),
    berth_id: Joi.string().uuid().required(),
    start_time: Joi.date().iso().greater('now').required(),
    end_time: Joi.date().iso().greater(Joi.ref('start_time')).required(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').required()
});

const berthUpdateSchema = Joi.object({
    status: Joi.string().valid('available', 'occupied', 'maintenance').required(),
    last_inspection_date: Joi.date().iso().less('now').optional(),
    max_vessel_size: Joi.number().positive().optional(),
    restrictions: Joi.array().items(Joi.string()).optional()
});

// Role-based access control configuration
const RBAC_CONFIG = {
    'GET /berths': ['PORT_AUTHORITY', 'TERMINAL_OPERATOR'],
    'GET /berths/:id': ['PORT_AUTHORITY', 'TERMINAL_OPERATOR'],
    'POST /berths': ['PORT_AUTHORITY'],
    'PUT /berths/:id': ['PORT_AUTHORITY'],
    'DELETE /berths/:id': ['PORT_AUTHORITY']
};

// Initialize router and proxy service
const router: Router = express.Router();
const proxyService = new ProxyService([BERTH_SERVICE_CONFIG]);

// Configure rate limiter
const rateLimiter = new RateLimiterMemory({
    points: BERTH_SERVICE_CONFIG.rateLimit.max,
    duration: BERTH_SERVICE_CONFIG.rateLimit.windowMs / 1000
});

// Middleware to check role-based access
const checkRoleAccess = (endpoint: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const roles = RBAC_CONFIG[`${req.method} ${endpoint}`];
        if (!roles || !req.user?.roles?.some(role => roles.includes(role))) {
            return res.status(403).json({
                error: 'forbidden',
                message: 'Insufficient permissions to access this resource'
            });
        }
        next();
    };
};

// GET /berths - List all berths
router.get('/berths',
    cors(),
    authenticateJWT,
    checkRoleAccess('/berths'),
    validateRequest({
        query: Joi.object({
            status: Joi.string().valid('available', 'occupied', 'maintenance'),
            terminal_id: Joi.string().uuid(),
            page: Joi.number().integer().min(1),
            limit: Joi.number().integer().min(1).max(100)
        })
    }),
    proxyService.createServiceProxy(BERTH_SERVICE_CONFIG.name)
);

// GET /berths/:id - Get berth details
router.get('/berths/:id',
    cors(),
    authenticateJWT,
    checkRoleAccess('/berths/:id'),
    validateRequest({
        params: Joi.object({
            id: Joi.string().uuid().required()
        })
    }),
    proxyService.createServiceProxy(BERTH_SERVICE_CONFIG.name)
);

// POST /berths - Create new berth allocation
router.post('/berths',
    cors(),
    authenticateJWT,
    checkRoleAccess('/berths'),
    validateRequest({
        body: berthRequestSchema
    }),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await rateLimiter.consume(req.ip);
            proxyService.createServiceProxy(BERTH_SERVICE_CONFIG.name)(req, res, next);
        } catch {
            res.status(429).json({
                error: 'rate_limit_exceeded',
                message: 'Too many requests, please try again later'
            });
        }
    }
);

// PUT /berths/:id - Update berth status
router.put('/berths/:id',
    cors(),
    authenticateJWT,
    checkRoleAccess('/berths/:id'),
    validateRequest({
        params: Joi.object({
            id: Joi.string().uuid().required()
        }),
        body: berthUpdateSchema
    }),
    proxyService.createServiceProxy(BERTH_SERVICE_CONFIG.name)
);

// DELETE /berths/:id - Delete berth allocation
router.delete('/berths/:id',
    cors(),
    authenticateJWT,
    checkRoleAccess('/berths/:id'),
    validateRequest({
        params: Joi.object({
            id: Joi.string().uuid().required()
        })
    }),
    proxyService.createServiceProxy(BERTH_SERVICE_CONFIG.name)
);

// Error handling middleware
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Berth route error:', err);
    res.status(500).json({
        error: 'internal_server_error',
        message: 'An unexpected error occurred',
        requestId: req.headers['x-request-id']
    });
});

export default router;