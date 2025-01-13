import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { act } from 'react-dom/test-utils';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import WS from 'jest-websocket-mock';

import CargoTracker from './CargoTracker';
import cargoService from '../../../services/cargo.service';
import { CargoStatus, CargoTracking } from '../../../types/cargo.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock WebSocket URL
const WS_URL = 'ws://localhost:8080/ws/cargo';

// Mock cargo service
jest.mock('../../../services/cargo.service');

// Mock data
const mockCargoManifest = {
  id: 123,
  vesselCallId: 456,
  cargoType: 'CONTAINER',
  weight: 1000,
  volume: 100,
  consigneeId: 789,
  status: CargoStatus.IN_TRANSIT,
  location: 'Port Terminal A',
  documentReference: 'DOC-123',
  customsStatus: 'CLEARED',
  customsDeclarationNumber: 'CUS-456',
  dangerousGoodsClass: null,
  storageLocation: 'YARD-A1',
  transportDetails: {
    mode: 'TRUCK',
    carrier: 'ABC Logistics',
    vehicleId: 'TRK-789',
    status: 'SCHEDULED'
  },
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T01:00:00Z')
};

const mockTrackingHistory: CargoTracking[] = [
  {
    id: 1,
    cargoManifestId: 123,
    status: CargoStatus.REGISTERED,
    location: 'Port Entry',
    timestamp: new Date('2023-01-01T00:00:00Z'),
    updatedBy: 'System',
    notes: null,
    eventType: 'REGISTRATION'
  },
  {
    id: 2,
    cargoManifestId: 123,
    status: CargoStatus.IN_TRANSIT,
    location: 'Port Terminal A',
    timestamp: new Date('2023-01-01T01:00:00Z'),
    updatedBy: 'Terminal Operator',
    notes: 'Cargo received at terminal',
    eventType: 'STATUS_UPDATE'
  }
];

describe('CargoTracker Component', () => {
  let ws: WS;
  let store: any;

  beforeEach(() => {
    // Initialize WebSocket mock
    ws = new WS(WS_URL);
    
    // Initialize mock store
    store = configureStore({
      reducer: {
        cargo: (state = {}, action) => state
      }
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    WS.clean();
  });

  it('should render initial cargo status correctly', async () => {
    // Mock service responses
    (cargoService.getCargoManifest as jest.Mock).mockResolvedValue(mockCargoManifest);
    (cargoService.getCargoTracking as jest.Mock).mockResolvedValue([mockTrackingHistory[0]]);

    const { container } = render(
      <Provider store={store}>
        <CargoTracker
          cargoManifestId={123}
          showHistory={true}
          refreshInterval={30000}
        />
      </Provider>
    );

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText(/IN_TRANSIT/i)).toBeInTheDocument();
    });

    // Verify status indicator
    const statusIndicator = screen.getByLabelText(/cargo status/i);
    expect(statusIndicator).toHaveAttribute('status', 'IN_TRANSIT');

    // Verify location display
    expect(screen.getByText('Port Terminal A')).toBeInTheDocument();

    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should handle WebSocket updates correctly', async () => {
    // Mock initial data
    (cargoService.getCargoManifest as jest.Mock).mockResolvedValue(mockCargoManifest);
    (cargoService.getCargoTracking as jest.Mock).mockResolvedValue([mockTrackingHistory[0]]);

    render(
      <Provider store={store}>
        <CargoTracker
          cargoManifestId={123}
          showHistory={true}
          refreshInterval={30000}
        />
      </Provider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText(/IN_TRANSIT/i)).toBeInTheDocument();
    });

    // Simulate WebSocket update
    await act(async () => {
      ws.send(JSON.stringify({
        type: 'STATUS_UPDATE',
        manifestId: 123,
        status: CargoStatus.CUSTOMS_CLEARED,
        location: 'Customs Zone'
      }));
    });

    // Verify status update
    await waitFor(() => {
      expect(screen.getByText(/CUSTOMS_CLEARED/i)).toBeInTheDocument();
      expect(screen.getByText('Customs Zone')).toBeInTheDocument();
    });
  });

  it('should display tracking history correctly', async () => {
    // Mock service responses
    (cargoService.getCargoManifest as jest.Mock).mockResolvedValue(mockCargoManifest);
    (cargoService.getCargoTracking as jest.Mock).mockResolvedValue(mockTrackingHistory);

    render(
      <Provider store={store}>
        <CargoTracker
          cargoManifestId={123}
          showHistory={true}
          refreshInterval={30000}
        />
      </Provider>
    );

    // Wait for history to load
    await waitFor(() => {
      expect(screen.getByText('REGISTRATION')).toBeInTheDocument();
      expect(screen.getByText('STATUS_UPDATE')).toBeInTheDocument();
    });

    // Verify history entries
    const historySection = screen.getByRole('region', { name: /tracking history/i });
    expect(within(historySection).getAllByRole('listitem')).toHaveLength(2);
  });

  it('should handle errors gracefully', async () => {
    // Mock service error
    const error = new Error('Failed to fetch cargo data');
    (cargoService.getCargoManifest as jest.Mock).mockRejectedValue(error);

    render(
      <Provider store={store}>
        <CargoTracker
          cargoManifestId={123}
          showHistory={true}
          refreshInterval={30000}
        />
      </Provider>
    );

    // Verify error display
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch cargo data/i)).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    expect(cargoService.getCargoManifest).toHaveBeenCalledTimes(2);
  });

  it('should be responsive on mobile devices', async () => {
    // Mock viewport for mobile
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    // Mock service responses
    (cargoService.getCargoManifest as jest.Mock).mockResolvedValue(mockCargoManifest);
    (cargoService.getCargoTracking as jest.Mock).mockResolvedValue([mockTrackingHistory[0]]);

    const { container } = render(
      <Provider store={store}>
        <CargoTracker
          cargoManifestId={123}
          showHistory={true}
          refreshInterval={30000}
        />
      </Provider>
    );

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/IN_TRANSIT/i)).toBeInTheDocument();
    });

    // Verify mobile layout
    expect(container.firstChild).toHaveStyle({
      padding: '8px' // Matches mobile padding from styles
    });

    // Check touch target sizes
    const interactiveElements = screen.getAllByRole('button');
    interactiveElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44); // Minimum touch target size
    });
  });

  it('should handle status change callbacks', async () => {
    const onStatusChange = jest.fn();

    // Mock service responses
    (cargoService.getCargoManifest as jest.Mock).mockResolvedValue(mockCargoManifest);
    (cargoService.getCargoTracking as jest.Mock).mockResolvedValue([mockTrackingHistory[0]]);

    render(
      <Provider store={store}>
        <CargoTracker
          cargoManifestId={123}
          showHistory={true}
          refreshInterval={30000}
          onStatusChange={onStatusChange}
        />
      </Provider>
    );

    // Verify initial status callback
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith(CargoStatus.IN_TRANSIT);
    });

    // Simulate WebSocket status update
    await act(async () => {
      ws.send(JSON.stringify({
        type: 'STATUS_UPDATE',
        manifestId: 123,
        status: CargoStatus.CUSTOMS_CLEARED
      }));
    });

    // Verify status change callback
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith(CargoStatus.CUSTOMS_CLEARED);
    });
  });
});