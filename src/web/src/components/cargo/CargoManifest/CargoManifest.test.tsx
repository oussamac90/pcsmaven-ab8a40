import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import CargoManifest from './CargoManifest';
import { CargoStatus, CargoType } from '../../../types/cargo.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock data
const mockManifests = [
  {
    id: 1,
    vesselCallId: 101,
    cargoType: CargoType.CONTAINER,
    weight: 1000.50,
    volume: 500.25,
    consigneeId: 201,
    status: CargoStatus.REGISTERED,
    location: 'TERMINAL-A',
    documentReference: 'DOC-001',
    customsStatus: 'PENDING',
    customsDeclarationNumber: 'CUS-001',
    dangerousGoodsClass: null,
    storageLocation: 'YARD-01',
    transportDetails: {
      mode: 'TRUCK',
      carrier: 'CARRIER-A',
      estimatedDeparture: new Date('2023-01-01T10:00:00Z'),
      status: 'SCHEDULED'
    },
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z')
  },
  {
    id: 2,
    vesselCallId: 102,
    cargoType: CargoType.BULK_DRY,
    weight: 2000.75,
    volume: 1000.50,
    consigneeId: 202,
    status: CargoStatus.IN_TRANSIT,
    location: 'TERMINAL-B',
    documentReference: 'DOC-002',
    customsStatus: 'CLEARED',
    customsDeclarationNumber: 'CUS-002',
    dangerousGoodsClass: null,
    storageLocation: 'YARD-02',
    transportDetails: {
      mode: 'RAIL',
      carrier: 'CARRIER-B',
      estimatedDeparture: new Date('2023-01-02T10:00:00Z'),
      status: 'IN_PROGRESS'
    },
    createdAt: new Date('2023-01-02T00:00:00Z'),
    updatedAt: new Date('2023-01-02T00:00:00Z')
  }
];

// Mock functions
const mockOnStatusChange = vi.fn();
const mockOnError = vi.fn();

// Test setup
const renderComponent = (props = {}) => {
  return render(
    <CargoManifest
      vesselCallId={101}
      onStatusChange={mockOnStatusChange}
      onError={mockOnError}
      enableRealTimeUpdates={false}
      {...props}
    />
  );
};

describe('CargoManifest Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window dimensions for responsive tests
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  it('renders without crashing', async () => {
    renderComponent({ manifests: mockManifests });
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByText('Cargo Type')).toBeInTheDocument();
    expect(screen.getByText('Weight (MT)')).toBeInTheDocument();
    expect(screen.getByText('Volume (m³)')).toBeInTheDocument();
  });

  it('displays cargo manifest data correctly', () => {
    renderComponent({ manifests: mockManifests });
    
    // Check first row data
    const firstRow = screen.getByRole('row', { name: /CONTAINER/i });
    expect(within(firstRow).getByText('1000.50')).toBeInTheDocument();
    expect(within(firstRow).getByText('500.25')).toBeInTheDocument();
    expect(within(firstRow).getByText('REGISTERED')).toBeInTheDocument();
    
    // Check second row data
    const secondRow = screen.getByRole('row', { name: /BULK_DRY/i });
    expect(within(secondRow).getByText('2000.75')).toBeInTheDocument();
    expect(within(secondRow).getByText('1000.50')).toBeInTheDocument();
    expect(within(secondRow).getByText('IN_TRANSIT')).toBeInTheDocument();
  });

  it('handles responsive layouts correctly', async () => {
    // Test mobile layout
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    renderComponent({ manifests: mockManifests });
    
    await waitFor(() => {
      expect(screen.getByRole('grid')).toHaveStyle({
        'overflow-x': 'auto'
      });
    });

    // Test desktop layout
    window.innerWidth = 1440;
    window.dispatchEvent(new Event('resize'));
    
    await waitFor(() => {
      expect(screen.getByRole('grid')).toHaveStyle({
        'overflow-x': 'visible'
      });
    });
  });

  it('implements sorting functionality', async () => {
    renderComponent({ manifests: mockManifests });
    
    // Sort by weight
    const weightHeader = screen.getByRole('columnheader', { name: /Weight/i });
    await userEvent.click(weightHeader);
    
    // Check sort direction indicator
    expect(weightHeader).toHaveAttribute('aria-sort', 'ascending');
    
    // Check sorted order
    const rows = screen.getAllByRole('row').slice(1); // Skip header row
    expect(within(rows[0]).getByText('1000.50')).toBeInTheDocument();
    expect(within(rows[1]).getByText('2000.75')).toBeInTheDocument();
  });

  it('implements filtering functionality', async () => {
    renderComponent({ manifests: mockManifests });
    
    // Filter by status
    const statusFilter = screen.getByRole('combobox', { name: /Status/i });
    await userEvent.selectOptions(statusFilter, CargoStatus.REGISTERED);
    
    // Check filtered results
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('REGISTERED')).toBeInTheDocument();
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderComponent({ manifests: mockManifests });
    
    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    
    // Check keyboard navigation
    const table = screen.getByRole('grid');
    await userEvent.tab();
    expect(table).toHaveFocus();
    
    // Check ARIA labels
    expect(table).toHaveAttribute('aria-label');
    expect(screen.getByRole('columnheader', { name: /Cargo Type/i }))
      .toHaveAttribute('aria-sort');
  });

  it('handles real-time updates correctly', async () => {
    renderComponent({ 
      manifests: mockManifests,
      enableRealTimeUpdates: true 
    });

    // Simulate WebSocket message
    const updateData = {
      id: 1,
      status: CargoStatus.IN_TRANSIT,
      location: 'TERMINAL-C'
    };

    const wsMessage = new MessageEvent('message', {
      data: JSON.stringify(updateData)
    });
    window.dispatchEvent(wsMessage);

    await waitFor(() => {
      const updatedRow = screen.getByRole('row', { name: /IN_TRANSIT/i });
      expect(within(updatedRow).getByText('TERMINAL-C')).toBeInTheDocument();
    });
  });

  it('handles error states appropriately', async () => {
    renderComponent({ 
      manifests: [],
      error: new Error('Failed to load cargo manifests') 
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/error/i);
    expect(mockOnError).toHaveBeenCalled();
  });
});