// External imports with versions
import { useSelector } from 'react-redux'; // ^8.1.0
import { useDispatch } from 'react-redux'; // ^8.1.0
import { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import useWebSocket from 'react-use-websocket'; // ^4.3.1

// Internal imports
import cargoService from '../../services/cargo.service';
import { CargoManifest, CargoStatus, CargoTracking, CargoType } from '../types/cargo.types';

// Types for the hook
interface CargoError {
    code: string;
    message: string;
    details?: Record<string, any>;
}

interface CargoUpdate {
    id: number;
    status: CargoStatus;
    location?: string;
}

type CargoOperation = 'fetch' | 'create' | 'update' | 'track';

interface UseCargoDataOptions {
    enableWebSocket?: boolean;
    cacheTimeout?: number;
    retryAttempts?: number;
}

interface CargoCache {
    data: CargoManifest;
    timestamp: number;
}

/**
 * Custom hook for managing cargo data operations with real-time updates
 * Implements caching, WebSocket updates, and optimized performance
 * @param cargoId Optional cargo ID for specific cargo operations
 * @param options Configuration options for the hook
 */
export const useCargoData = (cargoId?: number, options: UseCargoDataOptions = {}) => {
    // Default options
    const defaultOptions = {
        enableWebSocket: true,
        cacheTimeout: 60000, // 1 minute
        retryAttempts: 3
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // State management
    const [cargo, setCargo] = useState<CargoManifest | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<CargoError | null>(null);
    const [trackingData, setTrackingData] = useState<CargoTracking | null>(null);
    const [cache, setCache] = useState<Map<number, CargoCache>>(new Map());

    // WebSocket setup
    const wsUrl = process.env.REACT_APP_CARGO_WS_URL || 'ws://localhost:8080/ws/cargo';
    const { sendMessage, lastMessage, readyState } = useWebSocket(
        mergedOptions.enableWebSocket ? wsUrl : null,
        {
            shouldReconnect: () => mergedOptions.enableWebSocket,
            reconnectAttempts: 5,
            reconnectInterval: 3000
        }
    );

    // Memoized retry handler
    const retryOperation = useCallback(async (
        operation: CargoOperation,
        attempt: number = 0
    ): Promise<void> => {
        if (attempt >= mergedOptions.retryAttempts) {
            throw new Error(`Maximum retry attempts reached for ${operation}`);
        }

        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));

        switch (operation) {
            case 'fetch':
                return fetchCargo(cargoId!, attempt + 1);
            case 'track':
                return trackCargo(cargoId!, attempt + 1);
            default:
                throw new Error(`Unsupported retry operation: ${operation}`);
        }
    }, [mergedOptions.retryAttempts, cargoId]);

    // Fetch cargo data
    const fetchCargo = useCallback(async (
        id: number,
        attempt: number = 0
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            // Check cache first
            const cached = cache.get(id);
            if (cached && (Date.now() - cached.timestamp) < mergedOptions.cacheTimeout) {
                setCargo(cached.data);
                setLoading(false);
                return;
            }

            const manifest = await cargoService.getCargoManifest(id);
            setCargo(manifest);
            
            // Update cache
            setCache(prev => new Map(prev).set(id, {
                data: manifest,
                timestamp: Date.now()
            }));

        } catch (err: any) {
            setError({
                code: err.code || 'FETCH_ERROR',
                message: err.message || 'Failed to fetch cargo data',
                details: err.details
            });
            if (attempt < mergedOptions.retryAttempts) {
                await retryOperation('fetch', attempt);
            }
        } finally {
            setLoading(false);
        }
    }, [cache, mergedOptions.cacheTimeout, mergedOptions.retryAttempts, retryOperation]);

    // Create new cargo manifest
    const createCargo = useCallback(async (manifest: Partial<CargoManifest>): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const created = await cargoService.createCargoManifest(manifest);
            setCargo(created);
            
            // Update cache
            setCache(prev => new Map(prev).set(created.id, {
                data: created,
                timestamp: Date.now()
            }));

        } catch (err: any) {
            setError({
                code: err.code || 'CREATE_ERROR',
                message: err.message || 'Failed to create cargo manifest',
                details: err.details
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Update cargo status
    const updateStatus = useCallback(async (
        id: number,
        status: CargoStatus
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            // Optimistic update
            if (cargo && cargo.id === id) {
                setCargo(prev => prev ? { ...prev, status } : null);
            }

            const updated = await cargoService.updateCargoStatus(id, status);
            setCargo(updated);

            // Update cache
            setCache(prev => new Map(prev).set(id, {
                data: updated,
                timestamp: Date.now()
            }));

        } catch (err: any) {
            // Revert optimistic update
            if (cargo && cargo.id === id) {
                setCargo(cargo);
            }
            setError({
                code: err.code || 'UPDATE_ERROR',
                message: err.message || 'Failed to update cargo status',
                details: err.details
            });
        } finally {
            setLoading(false);
        }
    }, [cargo]);

    // Track cargo
    const trackCargo = useCallback(async (
        id: number,
        attempt: number = 0
    ): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const tracking = await cargoService.getCargoTracking(id);
            setTrackingData(tracking[0] || null);
        } catch (err: any) {
            setError({
                code: err.code || 'TRACKING_ERROR',
                message: err.message || 'Failed to track cargo',
                details: err.details
            });
            if (attempt < mergedOptions.retryAttempts) {
                await retryOperation('track', attempt);
            }
        } finally {
            setLoading(false);
        }
    }, [mergedOptions.retryAttempts, retryOperation]);

    // Handle WebSocket messages
    useEffect(() => {
        if (lastMessage && cargo) {
            try {
                const update = JSON.parse(lastMessage.data);
                if (update.type === 'CARGO_UPDATE' && update.manifestId === cargo.id) {
                    setCargo(prev => prev ? { ...prev, ...update.data } : null);
                    
                    // Update cache
                    setCache(prev => new Map(prev).set(cargo.id, {
                        data: { ...cargo, ...update.data },
                        timestamp: Date.now()
                    }));
                }
            } catch (err) {
                console.error('Failed to parse WebSocket message:', err);
            }
        }
    }, [lastMessage, cargo]);

    // Initial fetch if cargoId is provided
    useEffect(() => {
        if (cargoId) {
            fetchCargo(cargoId);
        }
    }, [cargoId, fetchCargo]);

    // Cache cleanup
    useEffect(() => {
        const cleanup = setInterval(() => {
            setCache(prev => {
                const now = Date.now();
                const newCache = new Map(prev);
                for (const [id, entry] of newCache.entries()) {
                    if (now - entry.timestamp > mergedOptions.cacheTimeout) {
                        newCache.delete(id);
                    }
                }
                return newCache;
            });
        }, mergedOptions.cacheTimeout);

        return () => clearInterval(cleanup);
    }, [mergedOptions.cacheTimeout]);

    // Clear cache utility
    const clearCache = useCallback(() => {
        setCache(new Map());
    }, []);

    return {
        cargo,
        loading,
        error,
        trackingData,
        fetchCargo,
        createCargo,
        updateStatus,
        trackCargo,
        clearCache,
        retryOperation
    };
};

export default useCargoData;