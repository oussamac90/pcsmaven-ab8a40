import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import DataTable from './DataTable';

// Mock maritime data for testing
const mockVesselData = [
  {
    id: 1,
    vesselName: 'MSC EVA',
    imoNumber: 'IMO9458078',
    eta: '2023-12-01T08:00:00Z',
    berth: 'B12',
    status: 'Approaching'
  },
  {
    id: 2,
    vesselName: 'COSCO SHIPPING',
    imoNumber: 'IMO9783526',
    eta: '2023-12-01T09:30:00Z',
    berth: 'B14',
    status: 'Scheduled'
  }
];

const mockMaritimeColumns = [
  { key: 'vesselName', label: 'Vessel Name', sortable: true },
  { key: 'imoNumber', label: 'IMO Number', sortable: true },
  { key: 'eta', label: 'ETA', sortable: true },
  { key: 'berth', label: 'Berth', sortable: true },
  { key: 'status', label: 'Status', sortable: true }
];

// Helper function to setup viewport size
const setupViewport = (width: number, height: number = 800) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
};

// Helper function to render DataTable with common props
const renderDataTable = (props = {}) => {
  return render(
    <DataTable
      data={mockVesselData}
      columns={mockMaritimeColumns}
      {...props}
    />
  );
};

describe('DataTable Component - Maritime Operations', () => {
  const mockSortHandler = jest.fn();
  const mockPageChangeHandler = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    // Set default viewport
    setupViewport(1024);
  });

  afterEach(() => {
    // Cleanup
    jest.resetAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders empty table with maritime-specific message', () => {
      render(
        <DataTable
          data={[]}
          columns={mockMaritimeColumns}
          emptyStateMessage="No vessel data available"
        />
      );
      
      expect(screen.getByText('No vessel data available')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'table.empty');
    });

    it('renders vessel schedule data correctly', () => {
      renderDataTable();
      
      expect(screen.getByText('MSC EVA')).toBeInTheDocument();
      expect(screen.getByText('IMO9458078')).toBeInTheDocument();
      expect(screen.getByText('B12')).toBeInTheDocument();
      
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(mockMaritimeColumns.length);
      expect(headers[0]).toHaveTextContent('Vessel Name');
    });
  });

  describe('Maritime Data Sorting', () => {
    it('handles vessel name sorting', async () => {
      renderDataTable({ onSort: mockSortHandler });
      
      const vesselNameHeader = screen.getByText('Vessel Name');
      await userEvent.click(vesselNameHeader);
      
      expect(mockSortHandler).toHaveBeenCalledWith('vesselName', 'asc');
      expect(vesselNameHeader).toHaveAttribute('aria-sort', 'asc');
    });

    it('handles IMO number sorting', async () => {
      renderDataTable({ onSort: mockSortHandler });
      
      const imoHeader = screen.getByText('IMO Number');
      await userEvent.click(imoHeader);
      
      expect(mockSortHandler).toHaveBeenCalledWith('imoNumber', 'asc');
    });
  });

  describe('Pagination for Maritime Data', () => {
    const mockLargeVesselData = Array(25).fill(null).map((_, index) => ({
      id: index + 1,
      vesselName: `Vessel ${index + 1}`,
      imoNumber: `IMO${900000 + index}`,
      eta: new Date().toISOString(),
      berth: `B${index + 1}`,
      status: index % 2 === 0 ? 'Scheduled' : 'Approaching'
    }));

    it('displays correct number of vessels per page', () => {
      renderDataTable({
        data: mockLargeVesselData,
        pageSize: 10,
        onPageChange: mockPageChangeHandler
      });
      
      const rows = screen.getAllByRole('row');
      // Add 1 for header row
      expect(rows).toHaveLength(11);
    });

    it('handles page navigation correctly', async () => {
      renderDataTable({
        data: mockLargeVesselData,
        pageSize: 10,
        onPageChange: mockPageChangeHandler
      });
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextButton);
      
      expect(mockPageChangeHandler).toHaveBeenCalledWith(2);
    });
  });

  describe('Responsive Layout Tests', () => {
    it('adapts to mobile viewport', async () => {
      setupViewport(320);
      renderDataTable();
      
      // Check for mobile-specific layout
      const container = screen.getByRole('grid').parentElement;
      expect(container).toHaveStyle({ 'overflow-x': 'auto' });
      
      // Verify data labels are shown in mobile view
      const cells = screen.getAllByRole('gridcell');
      cells.forEach(cell => {
        expect(cell).toHaveAttribute('data-label');
      });
    });

    it('adapts to tablet viewport', async () => {
      setupViewport(768);
      renderDataTable();
      
      const container = screen.getByRole('grid').parentElement;
      expect(container).toHaveStyle({ overflow: 'visible' });
    });

    it('shows full layout on desktop viewport', async () => {
      setupViewport(1024);
      renderDataTable();
      
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(mockMaritimeColumns.length);
      headers.forEach(header => {
        expect(header).toBeVisible();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('provides proper ARIA labels and roles', () => {
      renderDataTable();
      
      expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'table.aria.label');
      expect(screen.getAllByRole('columnheader')).toBeTruthy();
      expect(screen.getAllByRole('row')).toBeTruthy();
      expect(screen.getAllByRole('gridcell')).toBeTruthy();
    });

    it('supports keyboard navigation', async () => {
      renderDataTable();
      
      const firstHeader = screen.getAllByRole('columnheader')[0];
      firstHeader.focus();
      expect(document.activeElement).toBe(firstHeader);
      
      // Test keyboard sort trigger
      fireEvent.keyDown(firstHeader, { key: 'Enter' });
      expect(firstHeader).toHaveAttribute('aria-sort', 'asc');
    });
  });
});