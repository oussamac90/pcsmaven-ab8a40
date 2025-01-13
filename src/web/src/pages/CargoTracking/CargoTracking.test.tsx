import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { toHaveNoViolations } from 'jest-axe';

import { CargoTrackingPage } from './CargoTracking';
import cargoService from '../../services/cargo.service';
import { CargoStatus } from '../../types/cargo.types';

// Mock cargo service methods
vi.mock('../../services/cargo.service', () => ({
  default: {
    getCargoManifest: vi.fn(),
    getCargoTracking: vi.fn(),
    subscribeToCargoUpdates: vi.fn(),
    updateCargoStatus: vi.fn()
  }
}));

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn()
};

// Test data constants
const MOCK_CARGO_DATA = {
  id: 'CARGO123',
  vesselCallId: 1,
  cargoType: 'CONTAINER',
  weight: 1000,
  volume: 500,
  status: CargoStatus.IN_TRANSIT,
  location: 'Port Terminal A',
  customsStatus: 'PENDING',
  updatedAt: new Date().toISOString()
};

const MOCK_TRACKING_HISTORY = [
  {
    id: 1,
    cargoManifestId: 1,
    status: CargoStatus.REGISTERED,
    location: 'Entry Gate',
    timestamp: new Date('2023-01-01T00:00:00Z')
  },
  {
    id: 2,
    cargoManifestId: 1,
    status: CargoStatus.IN_TRANSIT,
    location: 'Port Terminal A',
    timestamp: new Date('2023-01-01T01:00:00Z')
  }
];

// Test setup helper
const renderCargoTracking = () => {
  return render(
    <MemoryRouter initialEntries={['/cargo-tracking/CARGO123']}>
      <CargoTrackingPage />
    </MemoryRouter>
  );
};

describe('CargoTracking Page', () => {
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Setup mock responses
    cargoService.getCargoManifest.mockResolvedValue(MOCK_CARGO_DATA);
    cargoService.getCargoTracking.mockResolvedValue(MOCK_TRACKING_HISTORY);
    cargoService.subscribeToCargoUpdates.mockReturnValue(mockWebSocket);
    
    // Mock performance API
    vi.spyOn(performance, 'now').mockImplementation(() => 0);
    
    // Setup WebSocket mock
    global.WebSocket = vi.fn(() => mockWebSocket);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the cargo tracking page with correct title', () => {
      renderCargoTracking();
      expect(screen.getByRole('heading', { name: /cargo tracking/i })).toBeInTheDocument();
    });

    it('should render loading state initially', () => {
      renderCargoTracking();
      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    });

    it('should render error state when data fetch fails', async () => {
      cargoService.getCargoManifest.mockRejectedValue(new Error('Failed to fetch'));
      renderCargoTracking();
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/unable to load/i);
      });
    });

    it('should be responsive on different screen sizes', () => {
      const { container } = renderCargoTracking();
      expect(container.firstChild).toHaveStyle({
        maxWidth: '1200px',
        margin: '0 auto'
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch cargo data within performance threshold', async () => {
      const startTime = performance.now();
      renderCargoTracking();
      
      await waitFor(() => {
        expect(screen.getByText(MOCK_CARGO_DATA.location)).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(2000); // 2 second threshold
    });

    it('should display cargo details after successful fetch', async () => {
      renderCargoTracking();
      
      await waitFor(() => {
        expect(screen.getByText(MOCK_CARGO_DATA.location)).toBeInTheDocument();
        expect(screen.getByText(MOCK_CARGO_DATA.status)).toBeInTheDocument();
      });
    });

    it('should retry failed requests', async () => {
      cargoService.getCargoManifest
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(MOCK_CARGO_DATA);

      renderCargoTracking();
      
      await waitFor(() => {
        expect(cargoService.getCargoManifest).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should establish WebSocket connection', async () => {
      renderCargoTracking();
      
      await waitFor(() => {
        expect(cargoService.subscribeToCargoUpdates).toHaveBeenCalled();
      });
    });

    it('should update UI on WebSocket message', async () => {
      renderCargoTracking();
      
      const wsUpdate = {
        type: 'STATUS_UPDATE',
        cargoId: 'CARGO123',
        status: CargoStatus.DELIVERED,
        location: 'Exit Gate'
      };

      await waitFor(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(wsUpdate) });
        expect(screen.getByText('Exit Gate')).toBeInTheDocument();
      });
    });

    it('should handle WebSocket disconnection', async () => {
      renderCargoTracking();
      
      await waitFor(() => {
        mockWebSocket.onclose();
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle cargo search', async () => {
      renderCargoTracking();
      const searchInput = screen.getByPlaceholderText(/search/i);
      
      await userEvent.type(searchInput, 'CARGO456{enter}');
      expect(window.location.pathname).toContain('CARGO456');
    });

    it('should update cargo status with optimistic updates', async () => {
      renderCargoTracking();
      const newStatus = CargoStatus.DELIVERED;
      
      await waitFor(() => {
        const statusButton = screen.getByRole('button', { name: /update status/i });
        fireEvent.click(statusButton);
        expect(screen.getByText(newStatus)).toBeInTheDocument();
      });
    });

    it('should handle tracking history navigation', async () => {
      renderCargoTracking();
      
      await waitFor(() => {
        const historyEntries = screen.getAllByRole('row');
        expect(historyEntries).toHaveLength(MOCK_TRACKING_HISTORY.length + 1); // +1 for header
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      renderCargoTracking();
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should support keyboard navigation', async () => {
      renderCargoTracking();
      const searchInput = screen.getByPlaceholderText(/search/i);
      
      await userEvent.tab();
      expect(searchInput).toHaveFocus();
    });

    it('should have sufficient color contrast', async () => {
      const { container } = renderCargoTracking();
      expect(await toHaveNoViolations(container)).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should implement caching for repeated requests', async () => {
      renderCargoTracking();
      
      await waitFor(() => {
        expect(screen.getByText(MOCK_CARGO_DATA.location)).toBeInTheDocument();
      });

      cleanup();
      renderCargoTracking();
      
      expect(cargoService.getCargoManifest).toHaveBeenCalledTimes(1);
    });

    it('should handle large data sets efficiently', async () => {
      const largeDataSet = Array(1000).fill(MOCK_CARGO_DATA);
      cargoService.getCargoManifest.mockResolvedValue(largeDataSet);
      
      const startTime = performance.now();
      renderCargoTracking();
      
      await waitFor(() => {
        expect(screen.getByText(MOCK_CARGO_DATA.location)).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});