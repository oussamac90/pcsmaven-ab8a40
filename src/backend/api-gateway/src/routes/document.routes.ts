import express, { Router, Request, Response, NextFunction } from 'express'; // ^4.18.2
import multer from 'multer'; // ^1.4.5-lts.1
import Joi from 'joi'; // ^17.9.2
import { authenticateJWT } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { ProxyService } from '../services/proxy.service';
import { logger } from '../middleware/logging.middleware';
import { createRateLimiter } from '../config/rate-limit.config';

// Constants for document service configuration
const DOCUMENT_SERVICE_CONFIG = {
    name: 'document-service',
    url: 'http://document-service:3000',
    routes: ['/api/v1/documents', '/api/v1/edifact'],
    requiresAuth: true,
    rateLimit: {
        windowMs: 60000,
        max: 100
    },
    circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000
    },
    monitoring: {
        enabled: true,
        metrics: ['latency', 'errors', 'requests']
    }
};

// Upload configuration with security constraints
const UPLOAD_LIMITS = {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
    allowedTypes: ['application/pdf', 'application/xml', 'text/plain'],
    scanEnabled: true,
    validateContent: true
};

// Configure multer for secure file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: UPLOAD_LIMITS.fileSize,
        files: UPLOAD_LIMITS.files
    },
    fileFilter: (req, file, cb) => {
        if (UPLOAD_LIMITS.allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Validation schemas
const documentUploadSchema = Joi.object({
    type: Joi.string().required().valid('manifest', 'declaration', 'certificate'),
    metadata: Joi.object({
        owner: Joi.string().required(),
        confidential: Joi.boolean(),
        expiry: Joi.date()
    }),
    files: Joi.array().min(1).max(UPLOAD_LIMITS.files).required(),
    contentType: Joi.string().valid(...UPLOAD_LIMITS.allowedTypes)
});

const edifactMessageSchema = Joi.object({
    messageType: Joi.string().required().valid('IFTSTA', 'IFTMBC', 'COARRI'),
    content: Joi.string().required().min(1).max(1000000),
    sender: Joi.string().required().pattern(/^[A-Z0-9]{3,35}$/),
    receiver: Joi.string().required().pattern(/^[A-Z0-9]{3,35}$/),
    version: Joi.string().required(),
    encoding: Joi.string().default('UTF-8')
});

// Initialize proxy service
const proxyService = new ProxyService([DOCUMENT_SERVICE_CONFIG]);

// Configure document routes
const configureDocumentRoutes = (): Router => {
    const router = express.Router();
    const documentServiceProxy = proxyService.createServiceProxy(DOCUMENT_SERVICE_CONFIG.name);
    const rateLimiter = createRateLimiter(DOCUMENT_SERVICE_CONFIG.rateLimit);

    // Document upload endpoint
    router.post('/api/v1/documents',
        authenticateJWT,
        rateLimiter,
        upload.array('files', UPLOAD_LIMITS.files),
        validateRequest({ body: documentUploadSchema }),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (UPLOAD_LIMITS.scanEnabled) {
                    await scanFiles(req.files);
                }
                documentServiceProxy(req, res, next);
            } catch (error) {
                logger.error('Document upload failed', { error });
                next(error);
            }
        }
    );

    // Document retrieval endpoint
    router.get('/api/v1/documents/:id',
        authenticateJWT,
        rateLimiter,
        (req: Request, res: Response, next: NextFunction) => {
            res.setHeader('Cache-Control', 'private, max-age=300');
            documentServiceProxy(req, res, next);
        }
    );

    // Document deletion endpoint
    router.delete('/api/v1/documents/:id',
        authenticateJWT,
        rateLimiter,
        (req: Request, res: Response, next: NextFunction) => {
            logger.info('Document deletion requested', {
                documentId: req.params.id,
                userId: req.user?.id
            });
            documentServiceProxy(req, res, next);
        }
    );

    // EDIFACT message processing endpoint
    router.post('/api/v1/edifact/messages',
        authenticateJWT,
        rateLimiter,
        validateRequest({ body: edifactMessageSchema }),
        (req: Request, res: Response, next: NextFunction) => {
            logger.info('EDIFACT message processing', {
                messageType: req.body.messageType,
                sender: req.body.sender
            });
            documentServiceProxy(req, res, next);
        }
    );

    // EDIFACT message retrieval endpoint
    router.get('/api/v1/edifact/messages/:id',
        authenticateJWT,
        rateLimiter,
        documentServiceProxy
    );

    return router;
};

// Helper function for virus scanning
const scanFiles = async (files: Express.Multer.File[]): Promise<void> => {
    // Implementation would integrate with antivirus service
    // This is a placeholder for actual implementation
    return Promise.resolve();
};

// Export configured router
export const documentRouter = configureDocumentRoutes();
export default documentRouter;