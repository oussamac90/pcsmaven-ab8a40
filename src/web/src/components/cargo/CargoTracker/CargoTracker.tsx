import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { TrackerContainer, StatusIndicator, LocationDisplay } from './CargoTracker.styles';
import { Card } from '../../common/Card/Card';
import { CargoManifest, CargoStatus } from '../../../types/cargo.types';
import useCargoData from '../../../hooks/useCargoData';

// Constants for error handling and configuration
const ERROR_MESSAGE = 'Unable to load cargo tracking information. Please try again.';
const LOADING_MESSAGE = 'Loading cargo details...';
const REFRESH_INTERVAL_DEFAULT = 30000; // 30 seconds

interface CargoTrackerProps {
  /** Unique identifier for the cargo being tracked */
  cargoId: number;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Optional callback for status changes */
  onStatusChange?: (status: CargoStatus) => void;
  /** Optional refresh interval in milliseconds */
  refreshInterval?: number;
}

/**
 * CargoTracker component for real-time cargo tracking with WebSocket updates
 * Implements responsive design and accessibility features
 */
export const CargoTracker = memo<CargoTrackerProps>(({
  cargoId,
  className,
  onStatusChange,
  refreshInterval = REFRESH_INTERVAL_DEFAULT
}) => {
  // Initialize cargo data hook with WebSocket support
  const {
    cargo,
    loading,
    error,
    trackingData,
    fetchCargo,
    trackCargo
  } = useCargoData(cargoId, {
    enableWebSocket: true,
    cacheTimeout: refreshInterval
  });

  // Handle status changes
  useEffect(() => {
    if (cargo?.status && onStatusChange) {
      onStatusChange(cargo.status);
    }
  }, [cargo?.status, onStatusChange]);

  // Retry handler for error cases
  const handleRetry = useCallback(() => {
    fetchCargo(cargoId);
    trackCargo(cargoId);
  }, [cargoId, fetchCargo, trackCargo]);

  // Format location display
  const formattedLocation = useMemo(() => {
    if (!cargo?.location) return 'Location unavailable';
    return cargo.location;
  }, [cargo?.location]);

  // Format last updated timestamp
  const lastUpdated = useMemo(() => {
    if (!cargo?.updatedAt) return '';
    return new Date(cargo.updatedAt).toLocaleString();
  }, [cargo?.updatedAt]);

  // Render loading state
  if (loading) {
    return (
      <Card
        title="Cargo Tracking"
        className={className}
        loading={true}
        data-testid="cargo-tracker-loading"
      >
        <div aria-live="polite" role="status">
          {LOADING_MESSAGE}
        </div>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card
        title="Cargo Tracking"
        className={className}
        data-testid="cargo-tracker-error"
      >
        <div role="alert" aria-live="assertive">
          <p>{ERROR_MESSAGE}</p>
          <button
            onClick={handleRetry}
            className="retry-button"
            aria-label="Retry loading cargo information"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  // Render main tracking interface
  return (
    <Card
      title="Cargo Tracking"
      className={className}
      data-testid="cargo-tracker"
    >
      <TrackerContainer>
        <div className="status-section" role="region" aria-label="Cargo Status">
          <StatusIndicator
            status={cargo?.status || 'unknown'}
            aria-label={`Cargo status: ${cargo?.status || 'unknown'}`}
          />
          <span className="status-text">
            {cargo?.status || 'Status unavailable'}
          </span>
        </div>

        <LocationDisplay role="region" aria-label="Cargo Location">
          <div className="location-icon" aria-hidden="true" />
          <div className="location-details">
            <span className="location-label">Current Location:</span>
            <span className="location-value">{formattedLocation}</span>
          </div>
        </LocationDisplay>

        {trackingData && (
          <div className="tracking-history" role="region" aria-label="Tracking History">
            <h3 className="visually-hidden">Tracking History</h3>
            <div className="history-entry">
              <span className="event-type">{trackingData.eventType}</span>
              <span className="event-location">{trackingData.location}</span>
              <time dateTime={trackingData.timestamp.toISOString()}>
                {new Date(trackingData.timestamp).toLocaleString()}
              </time>
            </div>
          </div>
        )}

        <div className="last-updated" aria-live="polite">
          <small>
            Last updated: <time dateTime={cargo?.updatedAt?.toISOString()}>{lastUpdated}</time>
          </small>
        </div>
      </TrackerContainer>
    </Card>
  );
});

// Display name for debugging
CargoTracker.displayName = 'CargoTracker';

export default CargoTracker;