/**
 * @fileoverview Email notification handler for the Port Community System
 * Implements high-performance, secure email delivery with comprehensive monitoring
 * @version 1.0.0
 */

import mail from '@sendgrid/mail';
import { Channel } from 'amqplib';
import { CircuitBreaker } from 'opossum';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Counter, Histogram } from 'prom-client';
import { INotification, NotificationStatus } from '../models/notification.model';
import { generateEmailTemplate } from '../utils/templates';
import { rabbitmqConfig } from '../config/rabbitmq.config';

// Constants for email handling configuration
const EMAIL_QUEUE = 'notifications.email.queue';
const DEFAULT_FROM_EMAIL = 'noreply@portcommunitysystem.com';
const MAX_RETRY_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 emails per minute
const CIRCUIT_BREAKER_TIMEOUT = 5000; // 5 seconds

/**
 * Handles email notification processing and delivery with resilience patterns
 */
export class EmailHandler {
    private readonly channel: Channel;
    private readonly circuitBreaker: CircuitBreaker;
    private readonly metrics: {
        emailsSent: Counter;
        emailLatency: Histogram;
        emailErrors: Counter;
    };
    private readonly templateCache: Map<string, string>;
    private readonly rateLimiter: RateLimiterMemory;

    /**
     * Initializes the email handler with dependencies and configurations
     */
    constructor(channel: Channel, apiKey: string, metrics: any) {
        this.channel = channel;
        this.templateCache = new Map();
        
        // Initialize SendGrid
        mail.setApiKey(apiKey);
        
        // Configure rate limiter
        this.rateLimiter = new RateLimiterMemory({
            points: RATE_LIMIT_MAX,
            duration: RATE_LIMIT_WINDOW
        });

        // Set up circuit breaker
        this.circuitBreaker = new CircuitBreaker(this.sendEmail.bind(this), {
            timeout: CIRCUIT_BREAKER_TIMEOUT,
            errorThresholdPercentage: 50,
            resetTimeout: 30000
        });

        // Initialize metrics
        this.metrics = {
            emailsSent: new Counter({
                name: 'notification_emails_sent_total',
                help: 'Total number of emails sent'
            }),
            emailLatency: new Histogram({
                name: 'notification_email_latency_seconds',
                help: 'Email sending latency in seconds'
            }),
            emailErrors: new Counter({
                name: 'notification_email_errors_total',
                help: 'Total number of email sending errors'
            })
        };

        // Set up queue consumer
        this.setupConsumer();
    }

    /**
     * Sets up the email queue consumer with dead letter queue support
     */
    private async setupConsumer(): Promise<void> {
        await this.channel.assertQueue(EMAIL_QUEUE, {
            durable: true,
            deadLetterExchange: rabbitmqConfig.deadLetterExchange
        });

        await this.channel.consume(EMAIL_QUEUE, async (msg) => {
            if (!msg) return;

            try {
                const notification = JSON.parse(msg.content.toString()) as INotification;
                await this.handleEmailNotification(notification);
                this.channel.ack(msg);
            } catch (error) {
                console.error('Error processing email notification:', error);
                
                // Handle retries with dead letter queue
                if (msg.properties.headers['x-death']?.length >= MAX_RETRY_ATTEMPTS) {
                    this.channel.ack(msg);
                    this.metrics.emailErrors.inc();
                } else {
                    this.channel.nack(msg, false, false);
                }
            }
        });
    }

    /**
     * Processes email notifications with resilience patterns
     */
    public async handleEmailNotification(notification: INotification): Promise<void> {
        const timer = this.metrics.emailLatency.startTimer();

        try {
            // Check rate limits
            await this.rateLimiter.consume('email_sending', 1);

            // Generate email content
            const htmlContent = await generateEmailTemplate(notification);

            // Send email through circuit breaker
            await this.circuitBreaker.fire(
                notification.recipients,
                notification.title,
                htmlContent
            );

            // Update metrics
            this.metrics.emailsSent.inc();
            timer();

            // Update notification status
            notification.status = NotificationStatus.DELIVERED;
        } catch (error) {
            notification.status = NotificationStatus.FAILED;
            notification.retryCount = (notification.retryCount || 0) + 1;
            throw error;
        }
    }

    /**
     * Sends an email using SendGrid with security headers
     */
    private async sendEmail(
        recipients: string[],
        subject: string,
        htmlContent: string
    ): Promise<void> {
        const msg = {
            to: recipients,
            from: DEFAULT_FROM_EMAIL,
            subject,
            html: htmlContent,
            headers: {
                'X-Priority': 'Normal',
                'X-MSMail-Priority': 'Normal',
                'X-Mailer': 'Port Community System',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Content-Security-Policy': "default-src 'self'"
            },
            trackingSettings: {
                clickTracking: { enable: false },
                openTracking: { enable: false }
            }
        };

        await mail.send(msg);
    }
}