import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // v6.8.0
import { Provider } from 'react-redux'; // v8.0.5
import { ThemeProvider } from 'styled-components'; // v5.3.6
import * as Sentry from '@sentry/react'; // v7.0.0

// Internal imports
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import { useAuth } from './hooks/useAuth';
import { theme } from './styles/theme.styles';

// Constants
const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  VESSEL_MANAGEMENT: '/vessels',
  CARGO_TRACKING: '/cargo',
  DOCUMENT_CENTER: '/documents',
  FINANCE: '/finance'
} as const;

// Error codes for monitoring
const ERROR_CODES = {
  AUTH_FAILED: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  PERMISSION_DENIED: 'AUTH_003',
  NETWORK_ERROR: 'SYS_001',
  API_ERROR: 'SYS_002'
} as const;

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [new Sentry.BrowserTracing()]
});

/**
 * Protected route component that handles authentication and role-based access
 */
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: string;
}> = ({ children, requiredRole }) => {
  const { isAuthenticated, checkRole, refreshToken } = useAuth();

  useEffect(() => {
    const validateAccess = async () => {
      if (isAuthenticated && requiredRole) {
        const hasAccess = await checkRole(requiredRole);
        if (!hasAccess) {
          throw new Error(ERROR_CODES.PERMISSION_DENIED);
        }
      }
    };

    validateAccess();
  }, [isAuthenticated, checkRole, requiredRole]);

  useEffect(() => {
    // Refresh token periodically
    const refreshInterval = setInterval(refreshToken, 15 * 60 * 1000); // 15 minutes
    return () => clearInterval(refreshInterval);
  }, [refreshToken]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};

/**
 * Root application component implementing the maritime-themed design system
 * and handling global routing, authentication, and error boundaries
 */
const App: React.FC = () => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error }) => (
        <div role="alert" className="error-boundary">
          <h2>Application Error</h2>
          <pre>{error.message}</pre>
        </div>
      )}
    >
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="loading-spinner" role="progressbar">
                  Loading...
                </div>
              }
            >
              <Routes>
                {/* Public routes */}
                <Route path={ROUTES.LOGIN} element={<Login />} />

                {/* Protected routes */}
                <Route
                  path={ROUTES.DASHBOARD}
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Vessel Management routes */}
                <Route
                  path={ROUTES.VESSEL_MANAGEMENT}
                  element={
                    <ProtectedRoute requiredRole="PORT_AUTHORITY">
                      <VesselManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Cargo Tracking routes */}
                <Route
                  path={ROUTES.CARGO_TRACKING}
                  element={
                    <ProtectedRoute>
                      <CargoTracking />
                    </ProtectedRoute>
                  }
                />

                {/* Document Center routes */}
                <Route
                  path={ROUTES.DOCUMENT_CENTER}
                  element={
                    <ProtectedRoute>
                      <DocumentCenter />
                    </ProtectedRoute>
                  }
                />

                {/* Finance routes */}
                <Route
                  path={ROUTES.FINANCE}
                  element={
                    <ProtectedRoute requiredRole="FINANCE">
                      <Finance />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route
                  path="/"
                  element={<Navigate to={ROUTES.DASHBOARD} replace />}
                />

                {/* 404 route */}
                <Route
                  path="*"
                  element={
                    <div role="alert" className="not-found">
                      Page not found
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </Sentry.ErrorBoundary>
  );
};

// Add performance monitoring
export default Sentry.withProfiler(App);