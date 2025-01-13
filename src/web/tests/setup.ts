import { setupServer } from 'msw/node'; // v1.3.0
import '@testing-library/jest-dom'; // v6.1.0
import { vi } from 'vitest'; // v0.34.0
import { handlers } from './mocks/handlers';
import { cleanup } from '@testing-library/react';

// Configure MSW server instance with mock handlers
export const server = setupServer(...handlers);

// Global test configuration
beforeAll(() => {
  // Start MSW server to intercept network requests
  server.listen({
    onUnhandledRequest: 'error' // Strict mode - error on unhandled requests
  });

  // Configure global fetch mock
  global.fetch = fetch;

  // Configure timezone for consistent date handling
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

  // Configure custom DOM environment
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Configure location mock
  Object.defineProperty(window, 'location', {
    writable: true,
    value: new URL('http://localhost:3000')
  });
});

// Cleanup after each test
afterEach(() => {
  // Reset MSW handlers to initial state
  server.resetHandlers();
  
  // Clean up any mounted React components
  cleanup();
  
  // Reset all mocks
  vi.clearAllMocks();
  
  // Clear any localStorage/sessionStorage data
  window.localStorage.clear();
  window.sessionStorage.clear();
  
  // Reset any modified timers
  vi.clearAllTimers();
});

// Cleanup after all tests
afterAll(() => {
  // Stop MSW server
  server.close();
  
  // Restore real timers
  vi.useRealTimers();
  
  // Clear any remaining mocks
  vi.resetModules();
  
  // Remove any global property mocks
  delete (window as any).matchMedia;
});

// Configure test environment
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null
    })
  };
});

// Configure global test timeout
vi.setConfig({
  testTimeout: 10000
});

// Configure custom matchers
expect.extend({
  toHaveBeenCalledWithMatch(received: any, expected: any) {
    const pass = this.equals(received.mock.calls[0][0], expected);
    return {
      pass,
      message: () => 
        pass
          ? `expected ${received} not to have been called with match ${expected}`
          : `expected ${received} to have been called with match ${expected}`,
    };
  }
});

// Export test utilities
export * from '@testing-library/react';
export { server };