/**
 * @fileoverview Main application entry point for the Port Community System notification service
 * Implements high-performance real-time notifications with comprehensive security and monitoring
 * @version 1.0.0
 */

import express from 'express'; // v4.18.2
import { Server } from 'socket.io'; // v4.7.2
import { connect } from 'amqplib'; // v0.10.3
import { json } from 'body-parser'; // v1.20.2
import cors from 'cors'; // v2.8.5
import rateLimit from 'express-rate-limit'; // v6.9.0
import helmet from 'helmet'; // v7.0.0
import { CircuitBreaker } from 'opossum'; // v7.1.0
import * as prometheus from 'prom-client'; // v14.2.0
import http from 'http';

import { rabbitmqConfig } from './config/rabbitmq.config';
import { socketConfig } from './config/socket.config';
import { NotificationService } from './services/notification.service';
import { EmailHandler } from './handlers/email.handler';

// Environment variables with defaults
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || '0.0.0.0';
const METRICS_PORT = process.env.METRICS_PORT || 9090;

/**
 * Initializes Express server with enhanced security and monitoring
 */
async function initializeServer() {
    const app = express();

    // Security middleware
    app.use(helmet());
    app.use(cors(socketConfig.cors));
    app.use(json({ limit: '1mb' }));
    app.use(rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 100, // 100 requests per minute
        standardHeaders: true,
        legacyHeaders: false
    }));

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'healthy' });
    });

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO with enhanced configuration
    const io = new Server(server, socketConfig);

    return { app, server, io };
}

/**
 * Initializes RabbitMQ connection with resilience patterns
 */
async function initializeRabbitMQ() {
    const circuitBreaker = new CircuitBreaker(connect, {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
    });

    try {
        const connection = await circuitBreaker.fire(rabbitmqConfig.url, rabbitmqConfig.options);
        const channel = await connection.createChannel();

        // Configure channel settings
        await channel.prefetch(100); // Process 100 messages at a time

        // Handle connection events
        connection.on('error', (error) => {
            console.error('RabbitMQ connection error:', error);
            prometheus.register.getSingleMetric('rabbitmq_connection_errors_total')?.inc();
        });

        connection.on('close', () => {
            console.warn('RabbitMQ connection closed');
            prometheus.register.getSingleMetric('rabbitmq_connection_closed_total')?.inc();
        });

        return { connection, channel };
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        throw error;
    }
}

/**
 * Initializes Prometheus metrics collection
 */
function initializeMetrics() {
    prometheus.collectDefaultMetrics();

    new prometheus.Counter({
        name: 'notification_service_starts_total',
        help: 'Number of notification service starts'
    }).inc();

    return new prometheus.Registry();
}

/**
 * Starts the notification service with comprehensive initialization
 */
async function startServer() {
    try {
        // Initialize metrics
        const metricsRegistry = initializeMetrics();

        // Initialize Express and Socket.IO
        const { app, server, io } = await initializeServer();

        // Initialize RabbitMQ
        const { channel } = await initializeRabbitMQ();

        // Initialize email handler
        const emailHandler = new EmailHandler(
            channel,
            process.env.SENDGRID_API_KEY || '',
            metricsRegistry
        );

        // Initialize notification service
        const notificationService = new NotificationService(
            channel,
            io,
            emailHandler
        );
        await notificationService.initialize();

        // Start metrics server
        const metricsApp = express();
        metricsApp.get('/metrics', async (req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        // Start servers
        server.listen(PORT, HOST, () => {
            console.log(`Notification service listening on ${HOST}:${PORT}`);
        });

        metricsApp.listen(METRICS_PORT, HOST, () => {
            console.log(`Metrics server listening on ${HOST}:${METRICS_PORT}`);
        });

        // Graceful shutdown
        const shutdown = async () => {
            console.log('Shutting down notification service...');
            
            // Close Socket.IO connections
            io.close(() => {
                console.log('Socket.IO server closed');
            });

            // Close HTTP server
            server.close(() => {
                console.log('HTTP server closed');
            });

            // Exit process
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('Failed to start notification service:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Export app for testing
export { app };