import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import WS from 'jest-websocket-mock';
import { ErrorBoundary } from 'react-error-boundary';

// Internal imports
import Dashboard from './Dashboard';
import { mockVessels, mockVesselCalls, mockDocuments } from '../../../tests/mocks/data';
import { VesselCallStatus } from '../../types/vessel.types';

// Mock socket server URL
const MOCK_SOCKET_URL = 'ws://localhost:3001';

// Mock window resize observer
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Test suite setup
describe('Dashboard Component', () => {
  let wsServer: WS;

  beforeEach(() => {
    // Setup WebSocket mock server
    wsServer = new WS(MOCK_SOCKET_URL);
    
    // Mock window resize observer
    window.ResizeObserver = mockResizeObserver;
    
    // Mock window matchMedia for responsive testing
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    // Mock authentication state
    vi.mock('../../hooks/useAuth', () => ({
      useAuth: () => ({
        user: { role: 'PORT_AUTHORITY' },
        checkRole: async () => true,
        isAuthenticated: true
      })
    }));

    // Mock vessel data hook
    vi.mock('../../hooks/useVesselData', () => ({
      useVesselData: () => ({
        vesselCalls: mockVesselCalls,
        loading: false,
        error: null,
        isOffline: false,
        fetchVesselCalls: vi.fn(),
        refreshCache: vi.fn()
      })
    }));
  });

  afterEach(() => {
    wsServer.close();
    vi.clearAllMocks();
  });

  it('renders dashboard layout correctly', async () => {
    render(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Dashboard />
        </ErrorBoundary>
      </MemoryRouter>
    );

    // Verify status section
    expect(screen.getByText(/vessels/i)).toBeInTheDocument();
    expect(screen.getByText(/berths/i)).toBeInTheDocument();
    expect(screen.getByText(/alerts/i)).toBeInTheDocument();

    // Verify active operations section
    const operationsSection = screen.getByRole('region', { name: /active operations/i });
    expect(operationsSection).toBeInTheDocument();
    expect(within(operationsSection).getAllByRole('article')).toHaveLength(
      mockVesselCalls.filter(call => 
        call.status === VesselCallStatus.APPROACHING || 
        call.status === VesselCallStatus.BERTHED
      ).length
    );

    // Verify documents section
    const documentsSection = screen.getByRole('region', { name: /recent documents/i });
    expect(documentsSection).toBeInTheDocument();
    expect(within(documentsSection).getByText(/cargo manifest/i)).toBeInTheDocument();
  });

  it('handles real-time updates through WebSocket', async () => {
    render(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Dashboard />
        </ErrorBoundary>
      </MemoryRouter>
    );

    // Wait for WebSocket connection
    await wsServer.connected;

    // Simulate vessel update
    const updatedVesselCall = {
      ...mockVesselCalls[0],
      status: VesselCallStatus.BERTHED
    };

    wsServer.send(JSON.stringify({
      type: 'vessel.update',
      data: updatedVesselCall
    }));

    // Verify UI updates
    await waitFor(() => {
      const vesselCard = screen.getByText(updatedVesselCall.vesselName);
      expect(within(vesselCard.closest('article')!).getByText(/berthed/i)).toBeInTheDocument();
    });
  });

  it('adapts to different screen sizes', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Dashboard />
        </ErrorBoundary>
      </MemoryRouter>
    );

    // Test mobile layout
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    
    rerender(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Dashboard />
        </ErrorBoundary>
      </MemoryRouter>
    );

    // Verify mobile layout adjustments
    expect(document.querySelector('.dashboard-container')).toHaveStyle({
      gridTemplateColumns: '1fr'
    });

    // Test tablet layout
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(min-width: 768px) and (max-width: 1023px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    rerender(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Dashboard />
        </ErrorBoundary>
      </MemoryRouter>
    );

    // Verify tablet layout adjustments
    expect(document.querySelector('.dashboard-container')).toHaveStyle({
      gridTemplateColumns: 'repeat(2, 1fr)'
    });
  });

  it('handles loading state correctly', () => {
    vi.mock('../../hooks/useVesselData', () => ({
      useVesselData: () => ({
        vesselCalls: [],
        loading: true,
        error: null,
        isOffline: false,
        fetchVesselCalls: vi.fn(),
        refreshCache: vi.fn()
      })
    }));

    render(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Dashboard />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('handles error state correctly', () => {
    const testError = new Error('Failed to fetch vessel data');
    
    vi.mock('../../hooks/useVesselData', () => ({
      useVesselData: () => ({
        vesselCalls: [],
        loading: false,
        error: testError,
        isOffline: false,
        fetchVesselCalls: vi.fn(),
        refreshCache: vi.fn()
      })
    }));

    render(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Dashboard />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/failed to fetch vessel data/i);
  });

  it('handles offline mode correctly', () => {
    vi.mock('../../hooks/useVesselData', () => ({
      useVesselData: () => ({
        vesselCalls: mockVesselCalls,
        loading: false,
        error: null,
        isOffline: true,
        fetchVesselCalls: vi.fn(),
        refreshCache: vi.fn()
      })
    }));

    render(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Dashboard />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/offline mode/i);
  });

  it('navigates to vessel details on click', async () => {
    const navigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => navigate
      };
    });

    render(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Error</div>}>
          <Dashboard />
        </ErrorBoundary>
      </MemoryRouter>
    );

    const vesselCard = screen.getByText(mockVesselCalls[0].vesselName).closest('article');
    await userEvent.click(vesselCard!);

    expect(navigate).toHaveBeenCalledWith(`/vessels/${mockVesselCalls[0].id}`);
  });
});