/**
 * @fileoverview RabbitMQ configuration for the notification service
 * Implements high-performance event-driven communication with comprehensive error handling
 * @version 1.0.0
 */

import { connect, Options, Connection, Channel } from 'amqplib'; // v0.10.3
import { NotificationType } from '../models/notification.model';

// Global constants for RabbitMQ configuration
export const DEFAULT_EXCHANGE = 'notifications.topic';
export const DEFAULT_QUEUE = 'notifications.queue';
export const DEAD_LETTER_EXCHANGE = 'notifications.dlx';
export const DEAD_LETTER_QUEUE = 'notifications.dlq';
export const RETRY_EXCHANGE = 'notifications.retry';
export const RETRY_QUEUE = 'notifications.retry.queue';
export const MAX_RETRIES = 3;
export const CHANNEL_POOL_SIZE = 10;
export const PREFETCH_COUNT = 100;

/**
 * Enhanced connection options interface with high availability and security
 */
export interface ConnectionOptions extends Options.Connect {
    maxRetries: number;
    retryDelay: number;
    sslOptions?: {
        cert: Buffer;
        key: Buffer;
        ca: Buffer[];
        rejectUnauthorized: boolean;
    };
}

/**
 * Channel pool configuration for optimized performance
 */
export interface ChannelPoolConfig {
    min: number;
    max: number;
    acquireTimeout: number;
    idleTimeoutMillis: number;
    evictionRunIntervalMillis: number;
}

/**
 * Exchange configuration with dead letter and retry support
 */
export interface ExchangeConfig {
    name: string;
    type: 'topic' | 'direct' | 'fanout';
    durable: boolean;
    autoDelete: boolean;
    internal: boolean;
    arguments: any;
    deadLetterExchange?: string;
    retryExchange?: string;
}

/**
 * Queue configuration with performance optimizations
 */
export interface QueueConfig {
    name: string;
    durable: boolean;
    exclusive: boolean;
    autoDelete: boolean;
    messageTtl: number;
    maxLength: number;
    maxPriority: number;
    deadLetterConfig?: {
        exchange: string;
        routingKey: string;
    };
    arguments: any;
}

/**
 * Main RabbitMQ configuration object
 */
export const rabbitmqConfig = {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    
    // Connection options with high availability settings
    options: {
        hostname: process.env.RABBITMQ_HOST || 'localhost',
        port: parseInt(process.env.RABBITMQ_PORT || '5672'),
        username: process.env.RABBITMQ_USER || 'guest',
        password: process.env.RABBITMQ_PASS || 'guest',
        vhost: process.env.RABBITMQ_VHOST || '/',
        heartbeat: 60,
        connectionTimeout: 30000,
        keepAlive: true,
        ssl: process.env.RABBITMQ_SSL === 'true',
        maxRetries: MAX_RETRIES,
        retryDelay: 5000
    } as ConnectionOptions,

    // Channel pool configuration for performance
    channelPool: {
        min: 5,
        max: CHANNEL_POOL_SIZE,
        acquireTimeout: 30000,
        idleTimeoutMillis: 30000,
        evictionRunIntervalMillis: 60000
    } as ChannelPoolConfig,

    // Exchange configurations
    exchanges: [
        {
            name: DEFAULT_EXCHANGE,
            type: 'topic',
            durable: true,
            autoDelete: false,
            internal: false,
            arguments: {},
            deadLetterExchange: DEAD_LETTER_EXCHANGE
        },
        {
            name: DEAD_LETTER_EXCHANGE,
            type: 'topic',
            durable: true,
            autoDelete: false,
            internal: false,
            arguments: {}
        },
        {
            name: RETRY_EXCHANGE,
            type: 'topic',
            durable: true,
            autoDelete: false,
            internal: false,
            arguments: {}
        }
    ] as ExchangeConfig[],

    // Queue configurations with type-specific settings
    queues: [
        {
            name: `${DEFAULT_QUEUE}.${NotificationType.VESSEL}`,
            durable: true,
            exclusive: false,
            autoDelete: false,
            messageTtl: 86400000, // 24 hours
            maxLength: 1000000,
            maxPriority: 10,
            deadLetterConfig: {
                exchange: DEAD_LETTER_EXCHANGE,
                routingKey: 'vessel.dead'
            },
            arguments: {
                'x-queue-type': 'classic',
                'x-max-priority': 10
            }
        },
        {
            name: `${DEFAULT_QUEUE}.${NotificationType.CARGO}`,
            durable: true,
            exclusive: false,
            autoDelete: false,
            messageTtl: 86400000,
            maxLength: 1000000,
            maxPriority: 10,
            deadLetterConfig: {
                exchange: DEAD_LETTER_EXCHANGE,
                routingKey: 'cargo.dead'
            },
            arguments: {
                'x-queue-type': 'classic',
                'x-max-priority': 10
            }
        },
        {
            name: DEAD_LETTER_QUEUE,
            durable: true,
            exclusive: false,
            autoDelete: false,
            messageTtl: 604800000, // 7 days
            maxLength: 1000000,
            maxPriority: 0,
            arguments: {
                'x-queue-type': 'classic'
            }
        },
        {
            name: RETRY_QUEUE,
            durable: true,
            exclusive: false,
            autoDelete: false,
            messageTtl: 300000, // 5 minutes
            maxLength: 100000,
            maxPriority: 0,
            arguments: {
                'x-queue-type': 'classic',
                'x-dead-letter-exchange': DEFAULT_EXCHANGE
            }
        }
    ] as QueueConfig[]
};

/**
 * Creates a robust RabbitMQ connection with retry mechanism
 */
export async function createConnection(options: ConnectionOptions): Promise<Connection> {
    let retries = 0;
    while (retries < options.maxRetries) {
        try {
            const connection = await connect({
                hostname: options.hostname,
                port: options.port,
                username: options.username,
                password: options.password,
                vhost: options.vhost,
                heartbeat: options.heartbeat,
                ssl: options.ssl ? options.sslOptions : undefined
            });

            connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err);
            });

            connection.on('close', () => {
                console.warn('RabbitMQ connection closed');
            });

            return connection;
        } catch (error) {
            retries++;
            if (retries === options.maxRetries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, options.retryDelay));
        }
    }
    throw new Error('Failed to connect to RabbitMQ');
}

/**
 * Sets up channel pool for better performance
 */
export async function setupChannelPool(
    connection: Connection,
    config: ChannelPoolConfig
): Promise<void> {
    const channels: Channel[] = [];
    
    for (let i = 0; i < config.min; i++) {
        const channel = await connection.createChannel();
        await channel.prefetch(PREFETCH_COUNT);
        channels.push(channel);
    }
}

/**
 * Sets up exchanges, queues, and bindings with error handling
 */
export async function setupTopology(
    channel: Channel,
    exchanges: ExchangeConfig[],
    queues: QueueConfig[]
): Promise<void> {
    // Assert exchanges
    for (const exchange of exchanges) {
        await channel.assertExchange(
            exchange.name,
            exchange.type,
            {
                durable: exchange.durable,
                autoDelete: exchange.autoDelete,
                internal: exchange.internal,
                arguments: exchange.arguments
            }
        );
    }

    // Assert queues
    for (const queue of queues) {
        await channel.assertQueue(queue.name, {
            durable: queue.durable,
            exclusive: queue.exclusive,
            autoDelete: queue.autoDelete,
            messageTtl: queue.messageTtl,
            maxLength: queue.maxLength,
            arguments: {
                ...queue.arguments,
                ...(queue.deadLetterConfig && {
                    'x-dead-letter-exchange': queue.deadLetterConfig.exchange,
                    'x-dead-letter-routing-key': queue.deadLetterConfig.routingKey
                })
            }
        });
    }
}