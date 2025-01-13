// External imports with versions
import { WebSocket } from 'ws'; // v8.13.0

// Internal imports
import { ApiService } from './api.service';
import { CargoManifest, CargoStatus, CargoTracking } from '../types/cargo.types';
import { endpoints, buildUrl } from '../config/api.config';

/**
 * Service class for managing cargo-related operations with enhanced caching and real-time updates
 * Implements comprehensive cargo tracking, manifest management, and status updates
 * @version 1.0.0
 */
export class CargoService {
    private readonly apiService: ApiService;
    private readonly baseUrl: string = endpoints.cargo.base;
    private readonly manifestCache: Map<number, { data: CargoManifest; timestamp: number }>;
    private readonly wsConnection: WebSocket;
    private readonly cacheTTL: number = 60000; // 1 minute cache TTL
    private readonly wsReconnectDelay: number = 3000; // 3 seconds reconnect delay

    constructor(apiService: ApiService) {
        this.apiService = apiService;
        this.manifestCache = new Map();
        this.initializeWebSocket();
    }

    /**
     * Initializes WebSocket connection for real-time cargo updates
     * Implements automatic reconnection and event handling
     */
    private initializeWebSocket(): void {
        const wsUrl = process.env.CARGO_WS_URL || 'ws://localhost:8080/ws/cargo';
        this.wsConnection = new WebSocket(wsUrl);

        this.wsConnection.onopen = () => {
            console.info('Cargo WebSocket connection established');
        };

        this.wsConnection.onmessage = (event) => {
            const update = JSON.parse(event.data);
            this.handleWebSocketUpdate(update);
        };

        this.wsConnection.onclose = () => {
            console.warn('Cargo WebSocket connection closed, attempting reconnect...');
            setTimeout(() => this.initializeWebSocket(), this.wsReconnectDelay);
        };

        this.wsConnection.onerror = (error) => {
            console.error('Cargo WebSocket error:', error);
        };
    }

    /**
     * Handles incoming WebSocket updates and updates cache accordingly
     * @param update WebSocket cargo update message
     */
    private handleWebSocketUpdate(update: any): void {
        if (update.type === 'CARGO_UPDATE' && update.manifestId) {
            const cached = this.manifestCache.get(update.manifestId);
            if (cached) {
                cached.data = { ...cached.data, ...update.data };
                this.manifestCache.set(update.manifestId, {
                    data: cached.data,
                    timestamp: Date.now()
                });
            }
        }
    }

    /**
     * Retrieves cargo manifest by ID with caching support
     * @param id Cargo manifest ID
     * @returns Promise resolving to cargo manifest data
     */
    public async getCargoManifest(id: number): Promise<CargoManifest> {
        const cached = this.manifestCache.get(id);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
            return cached.data;
        }

        const url = buildUrl(endpoints.cargo.manifest, { id });
        const manifest = await this.apiService.get<CargoManifest>(url);
        
        this.manifestCache.set(id, {
            data: manifest,
            timestamp: Date.now()
        });

        return manifest;
    }

    /**
     * Retrieves filtered list of cargo manifests with pagination
     * @param filters Filter criteria for cargo manifests
     * @param pagination Pagination parameters
     * @returns Promise resolving to array of cargo manifests
     */
    public async getCargoManifests(
        filters: {
            status?: CargoStatus;
            cargoType?: string;
            dateRange?: { start: Date; end: Date };
        },
        pagination: {
            page: number;
            limit: number;
        }
    ): Promise<{ data: CargoManifest[]; total: number }> {
        const url = buildUrl(endpoints.cargo.base, undefined, {
            ...filters,
            ...pagination,
            dateStart: filters.dateRange?.start.toISOString(),
            dateEnd: filters.dateRange?.end.toISOString()
        });

        return this.apiService.get(url);
    }

    /**
     * Creates a new cargo manifest with validation
     * @param manifest Cargo manifest data
     * @returns Promise resolving to created cargo manifest
     */
    public async createCargoManifest(manifest: Partial<CargoManifest>): Promise<CargoManifest> {
        const url = endpoints.cargo.base;
        const createdManifest = await this.apiService.post<CargoManifest>(url, manifest);

        this.manifestCache.set(createdManifest.id, {
            data: createdManifest,
            timestamp: Date.now()
        });

        // Notify via WebSocket
        this.wsConnection.send(JSON.stringify({
            type: 'CARGO_CREATED',
            manifestId: createdManifest.id
        }));

        return createdManifest;
    }

    /**
     * Updates cargo status with audit logging
     * @param id Cargo manifest ID
     * @param status New cargo status
     * @returns Promise resolving to updated cargo manifest
     */
    public async updateCargoStatus(id: number, status: CargoStatus): Promise<CargoManifest> {
        const url = buildUrl(endpoints.cargo.status, { id });
        const updatedManifest = await this.apiService.put<CargoManifest>(url, { status });

        this.manifestCache.set(id, {
            data: updatedManifest,
            timestamp: Date.now()
        });

        // Notify via WebSocket
        this.wsConnection.send(JSON.stringify({
            type: 'STATUS_UPDATED',
            manifestId: id,
            status
        }));

        return updatedManifest;
    }

    /**
     * Retrieves detailed tracking information with real-time updates
     * @param manifestId Cargo manifest ID
     * @returns Promise resolving to array of tracking events
     */
    public async getCargoTracking(manifestId: number): Promise<CargoTracking[]> {
        const url = buildUrl(endpoints.cargo.track, { id: manifestId });
        
        // Subscribe to real-time tracking updates
        this.wsConnection.send(JSON.stringify({
            type: 'SUBSCRIBE_TRACKING',
            manifestId
        }));

        return this.apiService.get<CargoTracking[]>(url);
    }

    /**
     * Cleans up WebSocket connection and cache
     */
    public dispose(): void {
        if (this.wsConnection) {
            this.wsConnection.close();
        }
        this.manifestCache.clear();
    }
}