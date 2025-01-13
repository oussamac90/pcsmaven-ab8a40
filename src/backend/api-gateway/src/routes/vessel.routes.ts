import express, { Router, Request, Response, NextFunction } from 'express'; // ^4.18.2
import Joi from 'joi'; // ^17.9.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^7.0.0
import { Counter, Histogram } from 'prom-client'; // ^14.2.0
import { authenticateJWT } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { ProxyService } from '../services/proxy.service';

// Prometheus metrics
const vesselRequestDuration = new Histogram({
    name: 'vessel_request_duration_seconds',
    help: 'Duration of vessel API requests',
    labelNames: ['endpoint', 'method']
});

const vesselRequestTotal = new Counter({
    name: 'vessel_request_total',
    help: 'Total number of vessel API requests',
    labelNames: ['endpoint', 'status']
});

// Interfaces
interface VesselCallRequest {
    imo_number: string;
    call_sign: string;
    eta: string;
    etd: string;
    port_id: string;
    cargo_details: {
        type: string;
        weight: number;
        units: string;
        description: string;
    };
    service_requests: Array<{
        type: string;
        requested_time: string;
        details: Record<string, unknown>;
    }>;
    vessel_details: {
        name: string;
        flag: string;
        length: number;
        width: number;
        max_draft: number;
    };
}

interface BerthRequest {
    vessel_call_id: string;
    berth_id: string;
    start_time: string;
    end_time: string;
    special_requirements: {
        power_supply?: boolean;
        water_supply?: boolean;
        waste_collection?: boolean;
    };
    service_requirements: Array<{
        service_type: string;
        quantity: number;
        timing: string;
    }>;
}

// Validation Schemas
const vesselCallSchema = Joi.object({
    imo_number: Joi.string().pattern(/^IMO\d{7}$/).required(),
    call_sign: Joi.string().max(10).required(),
    eta: Joi.date().iso().required(),
    etd: Joi.date().iso().min(Joi.ref('eta')).required(),
    port_id: Joi.string().required(),
    cargo_details: Joi.object({
        type: Joi.string().required(),
        weight: Joi.number().positive().required(),
        units: Joi.string().valid('MT', 'KG', 'TON').required(),
        description: Joi.string().max(500)
    }).required(),
    service_requests: Joi.array().items(
        Joi.object({
            type: Joi.string().required(),
            requested_time: Joi.date().iso().required(),
            details: Joi.object().unknown(true)
        })
    ),
    vessel_details: Joi.object({
        name: Joi.string().required(),
        flag: Joi.string().required(),
        length: Joi.number().positive().required(),
        width: Joi.number().positive().required(),
        max_draft: Joi.number().positive().required()
    }).required()
});

const berthRequestSchema = Joi.object({
    vessel_call_id: Joi.string().required(),
    berth_id: Joi.string().required(),
    start_time: Joi.date().iso().required(),
    end_time: Joi.date().iso().min(Joi.ref('start_time')).required(),
    special_requirements: Joi.object({
        power_supply: Joi.boolean(),
        water_supply: Joi.boolean(),
        waste_collection: Joi.boolean()
    }),
    service_requirements: Joi.array().items(
        Joi.object({
            service_type: Joi.string().required(),
            quantity: Joi.number().min(1).required(),
            timing: Joi.string().required()
        })
    )
});

// Service Configuration
const VESSEL_SERVICE_CONFIG = {
    name: 'vessel-service',
    url: 'http://core-service:8080/api/v1/vessels',
    requiresAuth: true,
    rateLimit: {
        windowMs: 60000, // 1 minute
        max: 100 // limit each IP to 100 requests per windowMs
    },
    circuit: {
        failureThreshold: 5,
        resetTimeout: 30000
    },
    cache: {
        ttl: 300000, // 5 minutes
        maxSize: 1000
    }
};

export function setupVesselRoutes(router: Router, proxyService: ProxyService): Router {
    // Security middleware
    router.use(helmet());
    
    // Rate limiting for vessel endpoints
    const vesselRateLimiter = rateLimit({
        windowMs: VESSEL_SERVICE_CONFIG.rateLimit.windowMs,
        max: VESSEL_SERVICE_CONFIG.rateLimit.max,
        standardHeaders: true,
        legacyHeaders: false
    });

    // Create proxy middleware
    const vesselProxy = proxyService.createServiceProxy(VESSEL_SERVICE_CONFIG.name);

    // Performance monitoring middleware
    const monitorPerformance = (req: Request, res: Response, next: NextFunction) => {
        const startTime = process.hrtime();
        res.on('finish', () => {
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const duration = seconds + nanoseconds / 1e9;
            vesselRequestDuration.labels(req.path, req.method).observe(duration);
            vesselRequestTotal.labels(req.path, res.statusCode.toString()).inc();
        });
        next();
    };

    // Vessel Call Management Routes
    router.post('/calls',
        authenticateJWT,
        vesselRateLimiter,
        validateRequest({ body: vesselCallSchema }),
        monitorPerformance,
        vesselProxy
    );

    router.get('/calls/:id',
        authenticateJWT,
        vesselRateLimiter,
        validateRequest({
            params: Joi.object({
                id: Joi.string().required()
            })
        }),
        monitorPerformance,
        vesselProxy
    );

    router.get('/calls',
        authenticateJWT,
        vesselRateLimiter,
        validateRequest({
            query: Joi.object({
                port_id: Joi.string(),
                start_date: Joi.date().iso(),
                end_date: Joi.date().iso().min(Joi.ref('start_date')),
                status: Joi.string().valid('SCHEDULED', 'IN_PORT', 'COMPLETED', 'CANCELLED'),
                page: Joi.number().min(1),
                limit: Joi.number().min(1).max(100)
            })
        }),
        monitorPerformance,
        vesselProxy
    );

    router.put('/calls/:id',
        authenticateJWT,
        vesselRateLimiter,
        validateRequest({
            params: Joi.object({
                id: Joi.string().required()
            }),
            body: vesselCallSchema
        }),
        monitorPerformance,
        vesselProxy
    );

    // Berth Management Routes
    router.post('/berths/allocations',
        authenticateJWT,
        vesselRateLimiter,
        validateRequest({ body: berthRequestSchema }),
        monitorPerformance,
        vesselProxy
    );

    router.get('/berths/availability',
        authenticateJWT,
        vesselRateLimiter,
        validateRequest({
            query: Joi.object({
                start_time: Joi.date().iso().required(),
                end_time: Joi.date().iso().min(Joi.ref('start_time')).required(),
                vessel_length: Joi.number().positive(),
                vessel_draft: Joi.number().positive(),
                port_id: Joi.string()
            })
        }),
        monitorPerformance,
        vesselProxy
    );

    // Vessel Tracking Routes
    router.get('/tracking/:imo',
        authenticateJWT,
        vesselRateLimiter,
        validateRequest({
            params: Joi.object({
                imo: Joi.string().pattern(/^IMO\d{7}$/).required()
            })
        }),
        monitorPerformance,
        vesselProxy
    );

    return router;
}

// Export configured router
const vesselRouter = express.Router();
export default setupVesselRoutes(vesselRouter, new ProxyService([VESSEL_SERVICE_CONFIG]));