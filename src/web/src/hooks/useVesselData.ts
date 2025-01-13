// External imports with versions
import { useState, useEffect } from 'react'; // ^18.0.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.0
import { useCache } from 'react-cache-manager'; // ^2.0.0

// Internal imports
import { actions, selectors } from '../store/slices/vesselSlice';
import useSocket from '../hooks/useSocket';
import { IVessel, IVesselCall, VesselCallStatus } from '../types/vessel.types';
import { SOCKET_EVENTS } from '../config/socket.config';

// Interface definitions
interface IVesselDataOptions {
  autoConnect?: boolean;
  cacheDuration?: number;
  retryAttempts?: number;
}

interface IVesselError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

interface IVesselDataResult {
  // Data states
  vesselCalls: IVesselCall[];
  selectedVesselCall: IVesselCall | null;
  loading: boolean;
  error: IVesselError | null;
  isOffline: boolean;

  // Data operations
  fetchVesselCalls: (filters?: any) => Promise<void>;
  updateVesselCall: (id: number, status: VesselCallStatus) => Promise<void>;
  createVesselCall: (vesselCall: Partial<IVesselCall>) => Promise<void>;
  deleteVesselCall: (id: number) => Promise<void>;
  selectVesselCall: (id: number | null) => void;

  // Cache operations
  refreshCache: () => void;
  clearCache: () => void;

  // Connection management
  reconnectWebSocket: () => Promise<void>;
}

/**
 * Custom hook for managing vessel-related data with real-time updates
 * Implements caching, offline support, and optimistic updates
 */
export const useVesselData = (options: IVesselDataOptions = {}): IVesselDataResult => {
  // Default options
  const {
    autoConnect = true,
    cacheDuration = 300000, // 5 minutes
    retryAttempts = 3
  } = options;

  // State management
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<IVesselError | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Redux selectors
  const vesselCalls = useSelector(selectors.selectVesselCalls);
  const selectedVesselCall = useSelector(selectors.selectSelectedVesselCall);

  // Socket connection
  const {
    socket,
    isConnected,
    connectionError,
    connect,
    subscribe,
    unsubscribe,
    reconnect
  } = useSocket();

  // Cache management
  const { cache, invalidate, clear } = useCache({
    namespace: 'vessel-data',
    ttl: cacheDuration
  });

  /**
   * Initialize WebSocket connection and subscribe to vessel updates
   */
  useEffect(() => {
    if (autoConnect && !isConnected && !connectionError) {
      connect();
    }

    if (isConnected) {
      subscribe(SOCKET_EVENTS.VESSEL_UPDATE, handleVesselUpdate);
    }

    return () => {
      if (isConnected) {
        unsubscribe(SOCKET_EVENTS.VESSEL_UPDATE);
      }
    };
  }, [isConnected, connectionError, autoConnect]);

  /**
   * Handle real-time vessel updates
   */
  const handleVesselUpdate = (vesselCall: IVesselCall) => {
    dispatch(actions.handleWebSocketUpdate(vesselCall));
  };

  /**
   * Fetch vessel calls with caching and error handling
   */
  const fetchVesselCalls = async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);

      const cachedData = await cache.get('vesselCalls');
      if (cachedData) {
        dispatch(actions.setVesselCalls(cachedData));
        setLoading(false);
        return;
      }

      const result = await dispatch(actions.fetchVesselCalls({ filters })).unwrap();
      await cache.set('vesselCalls', result);
      setLoading(false);
    } catch (err) {
      setError({
        code: 'FETCH_ERROR',
        message: 'Failed to fetch vessel calls',
        details: err as Record<string, any>
      });
      setLoading(false);
    }
  };

  /**
   * Update vessel call with optimistic updates
   */
  const updateVesselCall = async (id: number, status: VesselCallStatus) => {
    try {
      setError(null);
      
      // Optimistic update
      dispatch(actions.addPendingUpdate({ id, status }));
      
      await dispatch(actions.updateVesselCallStatus({ id, status })).unwrap();
      await invalidate('vesselCalls');
    } catch (err) {
      setError({
        code: 'UPDATE_ERROR',
        message: 'Failed to update vessel call',
        details: err as Record<string, any>
      });
      
      // Revert optimistic update
      dispatch(actions.removePendingUpdate(id));
    }
  };

  /**
   * Create new vessel call
   */
  const createVesselCall = async (vesselCall: Partial<IVesselCall>) => {
    try {
      setError(null);
      const result = await dispatch(actions.createVesselCall(vesselCall)).unwrap();
      await invalidate('vesselCalls');
      return result;
    } catch (err) {
      setError({
        code: 'CREATE_ERROR',
        message: 'Failed to create vessel call',
        details: err as Record<string, any>
      });
    }
  };

  /**
   * Delete vessel call
   */
  const deleteVesselCall = async (id: number) => {
    try {
      setError(null);
      await dispatch(actions.deleteVesselCall(id)).unwrap();
      await invalidate('vesselCalls');
    } catch (err) {
      setError({
        code: 'DELETE_ERROR',
        message: 'Failed to delete vessel call',
        details: err as Record<string, any>
      });
    }
  };

  /**
   * Select vessel call for detailed view
   */
  const selectVesselCall = (id: number | null) => {
    const selected = id ? vesselCalls.find(call => call.id === id) || null : null;
    dispatch(actions.setSelectedVesselCall(selected));
  };

  /**
   * Refresh cached data
   */
  const refreshCache = async () => {
    await invalidate('vesselCalls');
    await fetchVesselCalls();
  };

  /**
   * Clear all cached data
   */
  const clearCache = () => {
    clear();
  };

  /**
   * Reconnect WebSocket with retry logic
   */
  const reconnectWebSocket = async () => {
    let attempts = 0;
    while (attempts < retryAttempts) {
      try {
        await reconnect();
        setIsOffline(false);
        break;
      } catch (err) {
        attempts++;
        if (attempts === retryAttempts) {
          setIsOffline(true);
          setError({
            code: 'SOCKET_ERROR',
            message: 'Failed to reconnect to real-time updates',
            details: err as Record<string, any>
          });
        }
      }
    }
  };

  return {
    // Data states
    vesselCalls,
    selectedVesselCall,
    loading,
    error,
    isOffline,

    // Data operations
    fetchVesselCalls,
    updateVesselCall,
    createVesselCall,
    deleteVesselCall,
    selectVesselCall,

    // Cache operations
    refreshCache,
    clearCache,

    // Connection management
    reconnectWebSocket
  };
};

export default useVesselData;