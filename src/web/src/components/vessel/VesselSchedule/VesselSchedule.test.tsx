import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { act } from 'react-dom/test-utils';

// Component under test
import VesselSchedule from './VesselSchedule';

// Mock data and types
import { mockVesselCalls } from '../../../tests/mocks/data';
import { VesselCallStatus } from '../../../types/vessel.types';

// Mock socket connection
vi.mock('react-use-websocket', () => ({
  default: () => ({
    lastMessage: null,
    readyState: 1
  })
}));

// Mock vessel data hook
vi.mock('../../../hooks/useVesselData', () => ({
  default: () => ({
    vesselCalls: mockVesselCalls,
    loading: false,
    error: null,
    fetchVesselCalls: vi.fn(),
    updateVesselCall: vi.fn()
  })
}));

describe('VesselSchedule Component', () => {
  const defaultProps = {
    onVesselSelect: vi.fn(),
    filters: {
      status: [],
      dateRange: undefined,
      searchTerm: ''
    },
    enableRealtime: true,
    refreshInterval: 30000
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Basic Functionality', () => {
    it('should render vessel schedule table correctly', () => {
      render(<VesselSchedule {...defaultProps} />);

      // Verify table headers
      expect(screen.getByRole('columnheader', { name: /vessel/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /eta/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /berth/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();

      // Verify vessel data rows
      mockVesselCalls.forEach(vessel => {
        expect(screen.getByText(vessel.vesselName)).toBeInTheDocument();
        expect(screen.getByText(vessel.status)).toBeInTheDocument();
      });
    });

    it('should display loading state correctly', () => {
      vi.mocked(useVesselData).mockReturnValue({
        ...vi.mocked(useVesselData)(),
        loading: true
      });

      render(<VesselSchedule {...defaultProps} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should display error state correctly', () => {
      vi.mocked(useVesselData).mockReturnValue({
        ...vi.mocked(useVesselData)(),
        error: 'Failed to load vessel data'
      });

      render(<VesselSchedule {...defaultProps} />);
      expect(screen.getByText(/error loading vessel schedule/i)).toBeInTheDocument();
    });
  });

  describe('Sorting Functionality', () => {
    it('should sort vessels by name when clicking vessel header', async () => {
      render(<VesselSchedule {...defaultProps} />);
      
      const vesselHeader = screen.getByRole('columnheader', { name: /vessel/i });
      
      // Click for ascending sort
      await userEvent.click(vesselHeader);
      let rows = screen.getAllByRole('row').slice(1); // Skip header row
      expect(rows[0]).toHaveTextContent(mockVesselCalls[0].vesselName);
      
      // Click again for descending sort
      await userEvent.click(vesselHeader);
      rows = screen.getAllByRole('row').slice(1);
      expect(rows[0]).toHaveTextContent(mockVesselCalls[1].vesselName);
    });

    it('should sort vessels by ETA when clicking ETA header', async () => {
      render(<VesselSchedule {...defaultProps} />);
      
      const etaHeader = screen.getByRole('columnheader', { name: /eta/i });
      await userEvent.click(etaHeader);
      
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows[0]).toHaveTextContent(new Date(mockVesselCalls[0].eta).toLocaleString());
    });
  });

  describe('Filtering Functionality', () => {
    it('should filter vessels by status', async () => {
      const filters = {
        status: [VesselCallStatus.BERTHED],
        dateRange: undefined,
        searchTerm: ''
      };

      render(<VesselSchedule {...defaultProps} filters={filters} />);
      
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent(VesselCallStatus.BERTHED);
    });

    it('should filter vessels by search term', async () => {
      const filters = {
        status: [],
        dateRange: undefined,
        searchTerm: 'MSC'
      };

      render(<VesselSchedule {...defaultProps} filters={filters} />);
      
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent('MSC OSCAR');
    });
  });

  describe('Real-time Updates', () => {
    it('should handle vessel status updates via WebSocket', async () => {
      const { rerender } = render(<VesselSchedule {...defaultProps} />);

      // Simulate WebSocket message
      const mockMessage = {
        data: JSON.stringify({
          type: 'vessel.update',
          data: {
            ...mockVesselCalls[0],
            status: VesselCallStatus.BERTHED
          }
        })
      };

      vi.mocked(useVesselData).mockReturnValue({
        ...vi.mocked(useVesselData)(),
        vesselCalls: [
          { ...mockVesselCalls[0], status: VesselCallStatus.BERTHED },
          ...mockVesselCalls.slice(1)
        ]
      });

      rerender(<VesselSchedule {...defaultProps} />);

      await waitFor(() => {
        const updatedRow = screen.getAllByRole('row')[1];
        expect(within(updatedRow).getByText(VesselCallStatus.BERTHED)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', async () => {
      global.innerWidth = 320;
      global.dispatchEvent(new Event('resize'));
      
      render(<VesselSchedule {...defaultProps} />);
      
      const table = screen.getByRole('grid');
      expect(table).toHaveStyle({ 'grid-template-columns': 'minmax(150px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr)' });
    });

    it('should adapt to tablet viewport', async () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
      
      render(<VesselSchedule {...defaultProps} />);
      
      const table = screen.getByRole('grid');
      expect(table).toHaveStyle({ 'max-width': '100%' });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<VesselSchedule {...defaultProps} />);
      
      expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Vessel Schedule');
      expect(screen.getByRole('columnheader', { name: /vessel/i })).toHaveAttribute('aria-sort');
    });

    it('should support keyboard navigation', async () => {
      render(<VesselSchedule {...defaultProps} />);
      
      const firstVesselButton = screen.getByRole('button', { name: new RegExp(mockVesselCalls[0].vesselName) });
      firstVesselButton.focus();
      
      await userEvent.keyboard('{Enter}');
      expect(defaultProps.onVesselSelect).toHaveBeenCalledWith(mockVesselCalls[0]);
    });
  });
});