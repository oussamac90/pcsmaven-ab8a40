import { Server, Socket } from 'socket.io'; // v4.7.2
import Redis from 'ioredis'; // v5.3.2
import { EVENTS } from '../config/socket.config';
import { 
    INotification, 
    NotificationStatus, 
    NotificationType 
} from '../models/notification.model';
import { promisify } from 'util';

// Connection monitoring interface
interface ConnectionMetrics {
    connectedAt: Date;
    lastHeartbeat: Date;
    messagesSent: number;
    messagesReceived: number;
    failedDeliveries: number;
    rooms: Set<string>;
}

// Broadcast result interface
interface BroadcastResult {
    success: boolean;
    deliveredTo: number;
    failedDeliveries: number;
    retryAttempts: number;
    timestamp: Date;
}

// Enhanced socket payload with tracking
interface ISocketPayload {
    type: string;
    message: string;
    data: any;
    timestamp: Date;
    trackingId: string;
    metadata: {
        attempts: number;
        priority: string;
        origin: string;
    };
}

/**
 * Handles WebSocket connections and real-time event broadcasting
 * Implements secure connection management, monitoring, and scalable message delivery
 */
export class SocketHandler {
    private readonly io: Server;
    private readonly redisClient: Redis;
    private readonly userRooms: Map<string, Set<string>>;
    private readonly metrics: Map<string, ConnectionMetrics>;
    private readonly retryQueue: Map<string, INotification>;
    private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
    private readonly DISCONNECT_TIMEOUT = 60000; // 60 seconds
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000; // 1 second

    /**
     * Initializes the socket handler with required dependencies
     * @param io Socket.IO server instance
     * @param redisClient Redis client for distributed socket management
     */
    constructor(io: Server, redisClient: Redis) {
        this.io = io;
        this.redisClient = redisClient;
        this.userRooms = new Map();
        this.metrics = new Map();
        this.retryQueue = new Map();
        
        // Initialize Redis pub/sub for distributed events
        this.initializeRedisPubSub();
    }

    /**
     * Initializes Redis pub/sub for distributed event handling
     * @private
     */
    private initializeRedisPubSub(): void {
        const subscriber = this.redisClient.duplicate();
        subscriber.subscribe('notifications');
        
        subscriber.on('message', async (channel, message) => {
            if (channel === 'notifications') {
                const notification = JSON.parse(message) as INotification;
                await this.handleDistributedNotification(notification);
            }
        });
    }

    /**
     * Initializes socket connection handlers and monitoring
     */
    public initialize(): void {
        this.io.use(async (socket: Socket, next) => {
            try {
                // Validate authentication token
                const token = socket.handshake.auth.token;
                if (!token) {
                    throw new Error('Authentication required');
                }

                // Verify token and extract user info
                const userData = await this.verifyToken(token);
                socket.data.user = userData;
                
                // Initialize connection metrics
                this.initializeMetrics(socket.id);
                
                next();
            } catch (error) {
                next(new Error('Authentication failed'));
            }
        });

        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });

        // Start heartbeat monitoring
        setInterval(() => this.checkHeartbeats(), this.HEARTBEAT_INTERVAL);
    }

    /**
     * Handles new socket connections and sets up event listeners
     * @param socket Connected socket instance
     * @private
     */
    private handleConnection(socket: Socket): void {
        const { user } = socket.data;

        // Join user-specific rooms based on roles
        this.setupUserRooms(socket, user.roles);

        // Setup heartbeat monitoring
        socket.on('heartbeat', () => this.updateHeartbeat(socket.id));

        // Handle disconnection
        socket.on('disconnect', () => this.handleDisconnect(socket));

        // Handle acknowledgments
        socket.on('ack', (messageId: string) => this.handleAcknowledgment(socket, messageId));

        // Update connection metrics
        this.updateMetrics(socket.id, 'connection');
    }

    /**
     * Broadcasts a notification to relevant recipients with delivery tracking
     * @param notification Notification to broadcast
     * @returns Promise<BroadcastResult> Delivery status and metrics
     */
    public async broadcast(notification: INotification): Promise<BroadcastResult> {
        const result: BroadcastResult = {
            success: false,
            deliveredTo: 0,
            failedDeliveries: 0,
            retryAttempts: 0,
            timestamp: new Date()
        };

        try {
            // Validate notification
            if (!this.validateNotification(notification)) {
                throw new Error('Invalid notification format');
            }

            // Prepare payload
            const payload: ISocketPayload = {
                type: notification.type,
                message: notification.message,
                data: notification.metadata,
                timestamp: new Date(),
                trackingId: notification.id,
                metadata: {
                    attempts: 0,
                    priority: notification.priority,
                    origin: 'notification-service'
                }
            };

            // Determine target rooms
            const targetRooms = this.getTargetRooms(notification);

            // Attempt broadcast with retry mechanism
            result.success = await this.attemptBroadcast(payload, targetRooms, result);

            // Update metrics
            this.updateBroadcastMetrics(result);

            return result;
        } catch (error) {
            console.error('Broadcast error:', error);
            this.handleBroadcastFailure(notification, error);
            return result;
        }
    }

    /**
     * Retrieves current connection and delivery metrics
     * @returns Object containing system metrics
     */
    public getMetrics(): Record<string, any> {
        return {
            activeConnections: this.metrics.size,
            totalRooms: this.calculateTotalRooms(),
            messageStats: this.calculateMessageStats(),
            failureRate: this.calculateFailureRate(),
            timestamp: new Date()
        };
    }

    /**
     * Validates authentication token
     * @param token JWT token to verify
     * @private
     */
    private async verifyToken(token: string): Promise<any> {
        // Token verification implementation
        // Would typically verify JWT and return decoded user data
        return Promise.resolve({ id: 'user-id', roles: ['user'] });
    }

    /**
     * Attempts to broadcast message with retry mechanism
     * @private
     */
    private async attemptBroadcast(
        payload: ISocketPayload,
        rooms: string[],
        result: BroadcastResult
    ): Promise<boolean> {
        let attempts = 0;
        let success = false;

        while (attempts < this.MAX_RETRIES && !success) {
            try {
                for (const room of rooms) {
                    const delivered = await this.deliverToRoom(room, payload);
                    result.deliveredTo += delivered;
                }
                success = true;
            } catch (error) {
                attempts++;
                result.retryAttempts = attempts;
                await this.delay(this.RETRY_DELAY * attempts);
            }
        }

        return success;
    }

    /**
     * Delivers message to a specific room
     * @private
     */
    private async deliverToRoom(room: string, payload: ISocketPayload): Promise<number> {
        return new Promise((resolve) => {
            this.io.to(room).emit(this.getEventType(payload.type), payload);
            const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
            resolve(roomSize);
        });
    }

    /**
     * Maps notification types to socket events
     * @private
     */
    private getEventType(type: string): string {
        switch (type) {
            case NotificationType.VESSEL_UPDATE:
                return EVENTS.VESSEL_UPDATE;
            case NotificationType.CARGO_STATUS:
                return EVENTS.CARGO_STATUS;
            case NotificationType.BERTH_ALLOCATED:
                return EVENTS.BERTH_ALLOCATED;
            case NotificationType.DOCUMENT_PROCESSED:
                return EVENTS.DOCUMENT_PROCESSED;
            default:
                return 'notification';
        }
    }

    /**
     * Utility method to introduce delay
     * @private
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleans up resources for disconnected socket
     * @private
     */
    private handleDisconnect(socket: Socket): void {
        this.metrics.delete(socket.id);
        this.userRooms.delete(socket.id);
    }

    /**
     * Updates heartbeat timestamp for connection
     * @private
     */
    private updateHeartbeat(socketId: string): void {
        const metrics = this.metrics.get(socketId);
        if (metrics) {
            metrics.lastHeartbeat = new Date();
        }
    }

    /**
     * Checks for stale connections and removes them
     * @private
     */
    private checkHeartbeats(): void {
        const now = new Date().getTime();
        for (const [socketId, metrics] of this.metrics.entries()) {
            const lastHeartbeat = metrics.lastHeartbeat.getTime();
            if (now - lastHeartbeat > this.DISCONNECT_TIMEOUT) {
                this.io.sockets.sockets.get(socketId)?.disconnect(true);
            }
        }
    }

    /**
     * Initializes metrics for new connection
     * @private
     */
    private initializeMetrics(socketId: string): void {
        this.metrics.set(socketId, {
            connectedAt: new Date(),
            lastHeartbeat: new Date(),
            messagesSent: 0,
            messagesReceived: 0,
            failedDeliveries: 0,
            rooms: new Set()
        });
    }

    /**
     * Updates metrics for various events
     * @private
     */
    private updateMetrics(socketId: string, event: string): void {
        const metrics = this.metrics.get(socketId);
        if (metrics) {
            switch (event) {
                case 'messageSent':
                    metrics.messagesSent++;
                    break;
                case 'messageReceived':
                    metrics.messagesReceived++;
                    break;
                case 'deliveryFailed':
                    metrics.failedDeliveries++;
                    break;
            }
        }
    }
}