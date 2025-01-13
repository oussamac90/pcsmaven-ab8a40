import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, afterEach } from 'vitest';
import { axe } from 'jest-axe';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import ResizeObserver from 'resize-observer-polyfill';

// Component imports
import VesselManagement from './VesselManagement';
import { theme } from '../../../styles/theme.styles';
import { VesselCallStatus } from '../../../types/vessel.types';

// Mock data
const mockVesselCalls = [
  {
    id: 1,
    vesselName: 'MSC EVA',
    imoNumber: 'IMO9123456',
    eta: '2024-02-10T08:00:00Z',
    berth: 'B12',
    status: VesselCallStatus.APPROACHING
  },
  {
    id: 2,
    vesselName: 'COSCO SHIPPING',
    imoNumber: 'IMO9234567',
    eta: '2024-02-10T09:30:00Z',
    berth: 'B14',
    status: VesselCallStatus.SCHEDULED
  }
];

// Mock hooks
vi.mock('../../../hooks/useVesselData', () => ({
  default: vi.fn(() => ({
    vesselCalls: mockVesselCalls,
    loading: false,
    error: null,
    fetchVesselCalls: vi.fn(),
    updateVesselCall: vi.fn(),
    reconnectWebSocket: vi.fn()
  }))
}));

vi.mock('../../../hooks/useSocket', () => ({
  default: vi.fn(() => ({
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  }))
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Test wrapper component
const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('VesselManagement', () => {
  beforeEach(() => {
    // Setup ResizeObserver mock
    global.ResizeObserver = ResizeObserver;
    
    // Reset navigation mock
    mockNavigate.mockReset();
    
    // Reset viewport size
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render vessel management page correctly', async () => {
    renderWithProviders(<VesselManagement />);

    // Verify page title and controls
    expect(screen.getByRole('heading', { name: /vessel management/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter by status/i })).toBeInTheDocument();

    // Verify vessel schedule table
    const table = screen.getByRole('grid', { name: /vessel schedule/i });
    expect(table).toBeInTheDocument();

    // Verify vessel data rendering
    mockVesselCalls.forEach(vessel => {
      expect(screen.getByText(vessel.vesselName)).toBeInTheDocument();
      expect(screen.getByText(vessel.berth)).toBeInTheDocument();
    });

    // Check maritime theme compliance
    const container = screen.getByTestId('vessel-management-container');
    const styles = window.getComputedStyle(container);
    expect(styles.backgroundColor).toBe(theme.colors.background);
    expect(styles.color).toBe(theme.colors.text);

    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should handle vessel search functionality', async () => {
    renderWithProviders(<VesselManagement />);

    const searchInput = screen.getByRole('searchbox');
    await userEvent.type(searchInput, 'MSC');

    // Verify filtered results
    expect(screen.getByText('MSC EVA')).toBeInTheDocument();
    expect(screen.queryByText('COSCO SHIPPING')).not.toBeInTheDocument();
  });

  it('should handle status filtering', async () => {
    renderWithProviders(<VesselManagement />);

    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await userEvent.selectOptions(statusFilter, VesselCallStatus.APPROACHING);

    // Verify filtered results
    expect(screen.getByText('MSC EVA')).toBeInTheDocument();
    expect(screen.queryByText('COSCO SHIPPING')).not.toBeInTheDocument();
  });

  it('should handle real-time updates', async () => {
    const { rerender } = renderWithProviders(<VesselManagement />);

    // Simulate WebSocket update
    const updatedVesselCalls = [...mockVesselCalls];
    updatedVesselCalls[0].status = VesselCallStatus.BERTHED;

    vi.mocked(useVesselData).mockImplementation(() => ({
      vesselCalls: updatedVesselCalls,
      loading: false,
      error: null,
      fetchVesselCalls: vi.fn(),
      updateVesselCall: vi.fn(),
      reconnectWebSocket: vi.fn()
    }));

    rerender(<VesselManagement />);

    // Verify updated status
    const statusCell = screen.getByText(VesselCallStatus.BERTHED);
    expect(statusCell).toBeInTheDocument();
  });

  it('should handle responsive layouts', async () => {
    const { rerender } = renderWithProviders(<VesselManagement />);

    // Test mobile layout
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    window.dispatchEvent(new Event('resize'));
    rerender(<VesselManagement />);

    const mobileContainer = screen.getByTestId('vessel-management-container');
    expect(window.getComputedStyle(mobileContainer).flexDirection).toBe('column');

    // Test tablet layout
    Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
    window.dispatchEvent(new Event('resize'));
    rerender(<VesselManagement />);

    const tabletContainer = screen.getByTestId('vessel-management-container');
    expect(window.getComputedStyle(tabletContainer).maxWidth).toBe(theme.layout.contentWidth);
  });

  it('should handle error states', async () => {
    vi.mocked(useVesselData).mockImplementation(() => ({
      vesselCalls: [],
      loading: false,
      error: new Error('Failed to fetch vessel data'),
      fetchVesselCalls: vi.fn(),
      updateVesselCall: vi.fn(),
      reconnectWebSocket: vi.fn()
    }));

    renderWithProviders(<VesselManagement />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch vessel data');
  });

  it('should handle loading states', async () => {
    vi.mocked(useVesselData).mockImplementation(() => ({
      vesselCalls: [],
      loading: true,
      error: null,
      fetchVesselCalls: vi.fn(),
      updateVesselCall: vi.fn(),
      reconnectWebSocket: vi.fn()
    }));

    renderWithProviders(<VesselManagement />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should navigate to vessel details on selection', async () => {
    renderWithProviders(<VesselManagement />);

    const vesselRow = screen.getByText('MSC EVA').closest('tr');
    await userEvent.click(vesselRow!);

    expect(mockNavigate).toHaveBeenCalledWith('/vessels/1');
  });

  it('should maintain maritime theme compliance across all states', async () => {
    const { rerender } = renderWithProviders(<VesselManagement />);

    // Check status indicator colors
    const approachingStatus = screen.getByText(VesselCallStatus.APPROACHING);
    expect(window.getComputedStyle(approachingStatus).backgroundColor).toBe(theme.colors.primary);

    // Check hover states
    const row = screen.getByText('MSC EVA').closest('tr');
    fireEvent.mouseEnter(row!);
    expect(window.getComputedStyle(row!).backgroundColor).toBe(`${theme.colors.surface}80`);
  });
});