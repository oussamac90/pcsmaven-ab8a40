/**
 * @fileoverview Core notification service for the Port Community System
 * Implements high-performance, reliable notification delivery with comprehensive monitoring
 * @version 1.0.0
 */

import { Channel, Connection } from 'amqplib'; // v0.10.3
import { Server } from 'socket.io'; // v4.7.2
import { CircuitBreaker } from 'opossum'; // v6.4.0
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v4.1.0
import { Counter, Histogram } from 'prom-client'; // v14.2.0

import { 
    INotification, 
    NotificationType, 
    NotificationPriority, 
    NotificationStatus 
} from '../models/notification.model';
import { rabbitmqConfig } from '../config/rabbitmq.config';
import { SocketHandler } from '../handlers/socket.handler';
import { EmailHandler } from '../handlers/email.handler';
import { generateEmailTemplate, generateNotificationTemplate } from '../utils/templates';

/**
 * Enhanced notification options interface
 */
interface INotificationOptions {
    realtime: boolean;
    email: boolean;
    priority: NotificationPriority;
    retryAttempts: number;
    requireAcknowledgment: boolean;
    timeoutMs: number;
}

// Default configuration values
const DEFAULT_OPTIONS: INotificationOptions = {
    realtime: true,
    email: false,
    priority: NotificationPriority.MEDIUM,
    retryAttempts: 3,
    requireAcknowledgment: true,
    timeoutMs: 5000
};

// Service constants
const NOTIFICATION_EXCHANGE = 'notifications.exchange';
const NOTIFICATION_QUEUE = 'notifications.queue';
const DEAD_LETTER_EXCHANGE = 'notifications.dlx';
const RETRY_DELAY_MS = 1000;
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Core notification service implementing high-reliability message delivery
 */
export class NotificationService {
    private readonly channel: Channel;
    private readonly socketHandler: SocketHandler;
    private readonly emailHandler: EmailHandler;
    private readonly circuitBreaker: CircuitBreaker;
    private readonly rateLimiter: RateLimiterMemory;
    private readonly metrics: {
        notificationsSent: Counter;
        notificationLatency: Histogram;
        notificationErrors: Counter;
        activeConnections: Counter;
    };

    /**
     * Initializes the notification service with required dependencies
     */
    constructor(
        channel: Channel,
        io: Server,
        emailHandler: EmailHandler
    ) {
        this.channel = channel;
        this.socketHandler = new SocketHandler(io, null);
        this.emailHandler = emailHandler;

        // Initialize rate limiter
        this.rateLimiter = new RateLimiterMemory({
            points: 1000, // Max 1000 notifications per minute
            duration: 60
        });

        // Configure circuit breaker
        this.circuitBreaker = new CircuitBreaker(this.processNotification.bind(this), {
            timeout: 5000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000
        });

        // Initialize metrics
        this.metrics = {
            notificationsSent: new Counter({
                name: 'notifications_sent_total',
                help: 'Total number of notifications sent'
            }),
            notificationLatency: new Histogram({
                name: 'notification_latency_seconds',
                help: 'Notification processing latency in seconds'
            }),
            notificationErrors: new Counter({
                name: 'notification_errors_total',
                help: 'Total number of notification errors'
            }),
            activeConnections: new Counter({
                name: 'active_connections_total',
                help: 'Total number of active WebSocket connections'
            })
        };
    }

    /**
     * Initializes the notification service infrastructure
     */
    public async initialize(): Promise<void> {
        try {
            // Set up exchanges
            await this.channel.assertExchange(NOTIFICATION_EXCHANGE, 'topic', { durable: true });
            await this.channel.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', { durable: true });

            // Set up queues with dead letter configuration
            await this.channel.assertQueue(NOTIFICATION_QUEUE, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
                    'x-message-ttl': 86400000, // 24 hours
                    'x-max-priority': 10
                }
            });

            // Initialize socket handler
            this.socketHandler.initialize();

            // Set up dead letter queue consumer
            this.setupDeadLetterConsumer();

            console.log('Notification service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize notification service:', error);
            throw error;
        }
    }

    /**
     * Sends a notification with enhanced reliability features
     */
    public async sendNotification(
        notification: INotification,
        options: Partial<INotificationOptions> = {}
    ): Promise<void> {
        const timer = this.metrics.notificationLatency.startTimer();
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

        try {
            // Apply rate limiting
            await this.rateLimiter.consume('notifications');

            // Validate notification
            this.validateNotification(notification);

            // Process through circuit breaker
            await this.circuitBreaker.fire(notification, mergedOptions);

            // Update metrics
            this.metrics.notificationsSent.inc();
            timer();
        } catch (error) {
            this.metrics.notificationErrors.inc();
            console.error('Failed to send notification:', error);
            throw error;
        }
    }

    /**
     * Processes a notification with comprehensive error handling
     */
    private async processNotification(
        notification: INotification,
        options: INotificationOptions
    ): Promise<void> {
        let retryCount = 0;

        while (retryCount < options.retryAttempts) {
            try {
                // Handle real-time delivery if enabled
                if (options.realtime) {
                    const template = await generateNotificationTemplate(notification);
                    await this.socketHandler.broadcast({
                        ...notification,
                        message: template
                    });
                }

                // Handle email delivery if enabled
                if (options.email) {
                    const emailTemplate = await generateEmailTemplate(notification);
                    await this.emailHandler.handleEmailNotification({
                        ...notification,
                        message: emailTemplate
                    });
                }

                // Publish to message queue for persistence
                await this.channel.publish(
                    NOTIFICATION_EXCHANGE,
                    this.getRoutingKey(notification),
                    Buffer.from(JSON.stringify(notification)),
                    {
                        persistent: true,
                        priority: this.getPriorityValue(options.priority)
                    }
                );

                // Update notification status
                notification.status = NotificationStatus.DELIVERED;
                return;
            } catch (error) {
                retryCount++;
                if (retryCount === options.retryAttempts) {
                    notification.status = NotificationStatus.FAILED;
                    throw error;
                }
                await this.delay(RETRY_DELAY_MS * retryCount);
            }
        }
    }

    /**
     * Sets up consumer for dead letter queue processing
     */
    private async setupDeadLetterConsumer(): Promise<void> {
        const deadLetterQueue = `${NOTIFICATION_QUEUE}.dead`;
        
        await this.channel.assertQueue(deadLetterQueue, {
            durable: true
        });

        await this.channel.bindQueue(
            deadLetterQueue,
            DEAD_LETTER_EXCHANGE,
            '#'
        );

        await this.channel.consume(deadLetterQueue, async (msg) => {
            if (!msg) return;

            try {
                const notification = JSON.parse(msg.content.toString()) as INotification;
                if (notification.retryCount < MAX_RETRY_ATTEMPTS) {
                    notification.retryCount++;
                    await this.sendNotification(notification);
                } else {
                    console.error('Max retries exceeded for notification:', notification);
                }
                this.channel.ack(msg);
            } catch (error) {
                console.error('Error processing dead letter:', error);
                this.channel.nack(msg, false, false);
            }
        });
    }

    /**
     * Validates notification structure and content
     */
    private validateNotification(notification: INotification): void {
        if (!notification.type || !notification.recipients || !notification.message) {
            throw new Error('Invalid notification format');
        }
    }

    /**
     * Gets routing key based on notification type
     */
    private getRoutingKey(notification: INotification): string {
        return `notifications.${notification.type.toLowerCase()}`;
    }

    /**
     * Converts priority enum to numeric value
     */
    private getPriorityValue(priority: NotificationPriority): number {
        switch (priority) {
            case NotificationPriority.HIGH:
                return 9;
            case NotificationPriority.MEDIUM:
                return 5;
            case NotificationPriority.LOW:
                return 1;
            default:
                return 5;
        }
    }

    /**
     * Utility method to introduce delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}