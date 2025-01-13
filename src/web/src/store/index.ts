// External imports with versions
import { configureStore, combineReducers, Middleware } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist'; // ^6.0.0
import storage from 'redux-persist/lib/storage';
import { io, Socket } from 'socket.io-client'; // ^4.7.0

// Internal imports
import authReducer from './slices/authSlice';
import cargoReducer from './slices/cargoSlice';
import vesselReducer from './slices/vesselSlice';
import documentReducer from './slices/documentSlice';

// Persistence configuration
const persistConfig = {
  key: 'pcs-root',
  version: 1,
  storage,
  whitelist: ['auth'], // Only persist auth state
  blacklist: ['_persist', 'socket'], // Never persist these
  throttle: 1000, // Throttle saving to storage
  serialize: true,
  debug: process.env.NODE_ENV !== 'production'
};

// Root reducer with all slices
const rootReducer = combineReducers({
  auth: authReducer,
  cargo: cargoReducer,
  vessel: vesselReducer,
  document: documentReducer
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Socket middleware for real-time updates
const createSocketMiddleware = (): Middleware => {
  let socket: Socket;

  return store => next => action => {
    if (action.type === 'socket/connect') {
      // Initialize socket connection
      socket = io(process.env.REACT_APP_SOCKET_URL || 'ws://localhost:8080', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      // Handle real-time updates
      socket.on('cargo:update', (payload) => {
        store.dispatch({ type: 'cargo/handleWebSocketUpdate', payload });
      });

      socket.on('vessel:update', (payload) => {
        store.dispatch({ type: 'vessel/handleWebSocketUpdate', payload });
      });

      socket.on('document:update', (payload) => {
        store.dispatch({ type: 'document/handleWebSocketUpdate', payload });
      });

      // Handle connection events
      socket.on('connect', () => {
        store.dispatch({ type: 'socket/connected' });
      });

      socket.on('disconnect', () => {
        store.dispatch({ type: 'socket/disconnected' });
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        store.dispatch({ type: 'socket/error', payload: error });
      });
    }

    return next(action);
  };
};

// Performance monitoring middleware
const performanceMiddleware: Middleware = () => next => action => {
  const start = performance.now();
  const result = next(action);
  const duration = performance.now() - start;

  // Log slow actions in development
  if (process.env.NODE_ENV !== 'production' && duration > 100) {
    console.warn(`Slow action: ${action.type} took ${duration.toFixed(2)}ms`);
  }

  return result;
};

// Configure store with all middleware and optimizations
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      ignoredPaths: ['socket']
    },
    thunk: {
      extraArgument: { socket: null }
    }
  }).concat([
    createSocketMiddleware(),
    performanceMiddleware
  ]),
  devTools: process.env.NODE_ENV !== 'production',
  preloadedState: undefined,
  enhancers: []
});

// Create persistor for state rehydration
export const persistor = persistStore(store, {
  manualPersist: false,
  transforms: []
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store subscription helpers
export const subscribeToStore = (
  selector: (state: RootState) => any,
  callback: (selectedData: any) => void
) => {
  let currentState: any;

  return store.subscribe(() => {
    const nextState = selector(store.getState());
    if (nextState !== currentState) {
      currentState = nextState;
      callback(currentState);
    }
  });
};

// Initialize socket connection
store.dispatch({ type: 'socket/connect' });