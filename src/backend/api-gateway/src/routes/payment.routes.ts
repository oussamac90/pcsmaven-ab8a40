import express, { Router, Request, Response, NextFunction } from 'express'; // ^4.18.2
import Joi from 'joi'; // ^17.9.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^7.0.0
import winston from 'winston'; // ^3.8.2
import { authenticateJWT } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { ProxyService } from '../services/proxy.service';

// Configure secure logging for PCI compliance
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: 'payment-audit.log',
            level: 'info'
        })
    ]
});

// PCI DSS compliant payment service configuration
const PAYMENT_SERVICE_CONFIG = {
    name: 'payment-service',
    url: process.env.PAYMENT_SERVICE_URL,
    routes: ['/api/v1/payments', '/api/v1/invoices'],
    requiresAuth: true,
    rateLimit: {
        windowMs: 60000, // 1 minute
        max: 100,
        standardHeaders: true,
        legacyHeaders: false
    },
    security: {
        encryption: 'TLS_1.3',
        dataHandling: 'PCI_DSS',
        auditLevel: 'FULL'
    }
};

// Payment validation schemas
const paymentSchema = Joi.object({
    amount: Joi.number().positive().required().max(999999999),
    currency: Joi.string().required().length(3), // ISO 4217
    paymentMethod: Joi.string().required().valid('CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET'),
    invoiceId: Joi.string().uuid().required(),
    metadata: Joi.object().optional()
}).options({ stripUnknown: true });

const invoiceSchema = Joi.object({
    amount: Joi.number().positive().required().max(999999999),
    companyId: Joi.string().uuid().required(),
    dueDate: Joi.date().iso().min('now').required(),
    status: Joi.string().valid('PENDING', 'PAID', 'OVERDUE', 'CANCELLED'),
    items: Joi.array().items(
        Joi.object({
            description: Joi.string().required(),
            amount: Joi.number().positive().required(),
            quantity: Joi.number().integer().min(1).required()
        })
    ).min(1).required()
}).options({ stripUnknown: true });

// Initialize router with security middleware
const router: Router = express.Router();

// Apply PCI DSS security headers
router.use(helmet({
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
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
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Initialize proxy service
const proxyService = new ProxyService([PAYMENT_SERVICE_CONFIG]);

// Payment endpoints with PCI DSS compliance
router.post('/payments',
    authenticateJWT,
    validateRequest({ body: paymentSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info('Payment request initiated', {
                userId: req.user?.id,
                invoiceId: req.body.invoiceId,
                amount: req.body.amount,
                currency: req.body.currency,
                timestamp: new Date().toISOString()
            });

            const proxy = proxyService.createServiceProxy('payment-service');
            proxy(req, res, next);
        } catch (error) {
            logger.error('Payment processing error', {
                error: error.message,
                userId: req.user?.id,
                invoiceId: req.body.invoiceId
            });
            next(error);
        }
    }
);

router.get('/payments/:id',
    authenticateJWT,
    validateRequest({
        params: Joi.object({
            id: Joi.string().uuid().required()
        })
    }),
    proxyService.createServiceProxy('payment-service')
);

router.get('/payments',
    authenticateJWT,
    validateRequest({
        query: Joi.object({
            startDate: Joi.date().iso(),
            endDate: Joi.date().iso().min(Joi.ref('startDate')),
            status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED'),
            limit: Joi.number().integer().min(1).max(100).default(20),
            offset: Joi.number().integer().min(0).default(0)
        })
    }),
    proxyService.createServiceProxy('payment-service')
);

// Invoice endpoints
router.post('/invoices',
    authenticateJWT,
    validateRequest({ body: invoiceSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info('Invoice creation initiated', {
                userId: req.user?.id,
                companyId: req.body.companyId,
                amount: req.body.amount,
                timestamp: new Date().toISOString()
            });

            const proxy = proxyService.createServiceProxy('payment-service');
            proxy(req, res, next);
        } catch (error) {
            logger.error('Invoice creation error', {
                error: error.message,
                userId: req.user?.id,
                companyId: req.body.companyId
            });
            next(error);
        }
    }
);

router.get('/invoices/:id',
    authenticateJWT,
    validateRequest({
        params: Joi.object({
            id: Joi.string().uuid().required()
        })
    }),
    proxyService.createServiceProxy('payment-service')
);

router.get('/invoices',
    authenticateJWT,
    validateRequest({
        query: Joi.object({
            startDate: Joi.date().iso(),
            endDate: Joi.date().iso().min(Joi.ref('startDate')),
            status: Joi.string().valid('PENDING', 'PAID', 'OVERDUE', 'CANCELLED'),
            companyId: Joi.string().uuid(),
            limit: Joi.number().integer().min(1).max(100).default(20),
            offset: Joi.number().integer().min(0).default(0)
        })
    }),
    proxyService.createServiceProxy('payment-service')
);

router.put('/invoices/:id/status',
    authenticateJWT,
    validateRequest({
        params: Joi.object({
            id: Joi.string().uuid().required()
        }),
        body: Joi.object({
            status: Joi.string().valid('PAID', 'CANCELLED').required(),
            reason: Joi.string().when('status', {
                is: 'CANCELLED',
                then: Joi.string().required(),
                otherwise: Joi.string().optional()
            })
        })
    }),
    proxyService.createServiceProxy('payment-service')
);

export default router;