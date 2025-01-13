import React from 'react'; // v18.2.0
import ReactDOM from 'react-dom/client'; // v18.2.0
import { Provider } from 'react-redux'; // v8.0.5
import { ThemeProvider } from 'styled-components'; // v5.3.6
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11
import { PerformanceMonitor } from '@performance-monitor/react'; // v1.0.0

// Internal imports
import App from './App';
import { store } from './store';
import { theme } from './styles/theme.styles';

// Constants
const ROOT_ELEMENT_ID = 'root';
const PERFORMANCE_THRESHOLD_MS = 2000; // 2 seconds as per system requirements

/**
 * Error fallback component for handling runtime errors
 */
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div role="alert" className="error-boundary">
    <h2>Application Error</h2>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try Again</button>
  </div>
);

/**
 * Performance monitoring configuration
 */
const performanceConfig = {
  threshold: PERFORMANCE_THRESHOLD_MS,
  sampleRate: 0.1, // 10% sampling for performance metrics
  reportCallback: (metrics: any) => {
    console.warn('Performance threshold exceeded:', metrics);
  }
};

/**
 * Initializes and renders the React application with all required providers,
 * error boundaries, and performance monitoring
 */
const renderApp = () => {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) {
    throw new Error(`Element with id '${ROOT_ELEMENT_ID}' not found`);
  }

  // Initialize performance monitoring
  if (process.env.NODE_ENV === 'production') {
    PerformanceMonitor.init(performanceConfig);
  }

  // Create React root
  const root = ReactDOM.createRoot(rootElement);

  // Render application with all providers
  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          // Reset application state on error recovery
          window.location.href = '/';
        }}
        onError={(error) => {
          // Log errors to monitoring service in production
          if (process.env.NODE_ENV === 'production') {
            console.error('Application Error:', error);
          }
        }}
      >
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <PerformanceMonitor config={performanceConfig}>
              <App />
            </PerformanceMonitor>
          </ThemeProvider>
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Log initialization completion
  console.info('Port Community System initialized successfully');
};

// Initialize application
renderApp();

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    renderApp();
  });
}

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// Export for testing purposes
export { renderApp };