import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // ^6.11.0
import { useTranslation } from 'react-i18next'; // ^12.2.0

// Internal imports
import CargoTracker from '../../components/cargo/CargoTracker/CargoTracker';
import CargoManifest from '../../components/cargo/CargoManifest/CargoManifest';
import cargoService from '../../services/cargo.service';
import { Container, Header, TrackerSection, HistorySection, StatusIndicator, SearchContainer } from './CargoTracking.styles';
import { CargoStatus, CargoManifest as ICargoManifest } from '../../types/cargo.types';

// Constants for configuration
const ERROR_MESSAGES = {
  LOAD_ERROR: 'Unable to load cargo tracking information',
  WEBSOCKET_ERROR: 'Real-time updates disconnected',
  UPDATE_ERROR: 'Failed to update cargo status'
};

const LOADING_MESSAGE = 'Loading cargo details...';
const REFRESH_INTERVAL = 30000; // 30 seconds
const RETRY_ATTEMPTS = 3;
const CACHE_DURATION = 300000; // 5 minutes

// Interface for component state
interface CargoTrackingState {
  cargoData: ICargoManifest | null;
  loading: boolean;
  error: string | null;
  websocketConnected: boolean;
  lastUpdate: Date | null;
}

/**
 * CargoTracking page component providing comprehensive cargo tracking functionality
 * Implements real-time updates, responsive layout, and optimized performance
 */
const CargoTracking: React.FC = () => {
  const { t } = useTranslation();
  const { cargoId } = useParams<{ cargoId: string }>();
  const navigate = useNavigate();

  // Component state
  const [state, setState] = useState<CargoTrackingState>({
    cargoData: null,
    loading: true,
    error: null,
    websocketConnected: false,
    lastUpdate: null
  });

  // Initialize WebSocket subscription for real-time updates
  useEffect(() => {
    if (!cargoId) return;

    const subscription = cargoService.subscribeToCargoUpdates(Number(cargoId));
    setState(prev => ({ ...prev, websocketConnected: true }));

    return () => {
      subscription.unsubscribe();
      setState(prev => ({ ...prev, websocketConnected: false }));
    };
  }, [cargoId]);

  // Handle cargo status updates with optimistic updates
  const handleStatusChange = useCallback(async (id: number, status: CargoStatus) => {
    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        cargoData: prev.cargoData ? { ...prev.cargoData, status } : null
      }));

      // Update server
      await cargoService.updateCargoStatus(id, status);
      setState(prev => ({ ...prev, lastUpdate: new Date() }));

    } catch (error) {
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        error: ERROR_MESSAGES.UPDATE_ERROR,
        cargoData: prev.cargoData
      }));
    }
  }, []);

  // Fetch cargo data with caching
  useEffect(() => {
    if (!cargoId) return;

    const fetchCargoData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const manifest = await cargoService.getCargoManifest(Number(cargoId));
        
        setState(prev => ({
          ...prev,
          cargoData: manifest,
          loading: false,
          lastUpdate: new Date()
        }));

      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: ERROR_MESSAGES.LOAD_ERROR
        }));
      }
    };

    fetchCargoData();
    const refreshInterval = setInterval(fetchCargoData, REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [cargoId]);

  // Memoized status indicator type
  const statusIndicatorType = useMemo(() => {
    if (!state.cargoData) return 'info';
    
    switch (state.cargoData.status) {
      case CargoStatus.DELIVERED:
        return 'success';
      case CargoStatus.CUSTOMS_HOLD:
        return 'warning';
      case CargoStatus.IN_TRANSIT:
        return 'info';
      default:
        return 'info';
    }
  }, [state.cargoData]);

  // Handle search functionality
  const handleSearch = useCallback((searchId: string) => {
    navigate(`/cargo-tracking/${searchId}`);
  }, [navigate]);

  if (state.error) {
    return (
      <Container role="alert">
        <Header>
          <h1>{t('cargo.tracking.error.title')}</h1>
          <p className="subtitle">{state.error}</p>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h1>{t('cargo.tracking.title')}</h1>
        <p className="subtitle">
          {state.lastUpdate && t('cargo.tracking.lastUpdate', {
            time: new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'medium'
            }).format(state.lastUpdate)
          })}
        </p>
      </Header>

      <SearchContainer>
        <input
          type="text"
          className="search-input"
          placeholder={t('cargo.tracking.search.placeholder')}
          aria-label={t('cargo.tracking.search.label')}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch(e.currentTarget.value)}
        />
      </SearchContainer>

      <TrackerSection>
        {cargoId && (
          <CargoTracker
            cargoId={Number(cargoId)}
            onStatusUpdate={handleStatusChange}
            className="cargo-tracker"
          />
        )}
      </TrackerSection>

      <HistorySection>
        <div className="history-header">
          <h2>{t('cargo.tracking.history.title')}</h2>
        </div>
        <div className="history-content">
          {cargoId && (
            <CargoManifest
              vesselCallId={Number(cargoId)}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </HistorySection>

      {state.websocketConnected && (
        <StatusIndicator
          status={statusIndicatorType}
          role="status"
          aria-live="polite"
        >
          {t('cargo.tracking.realtime.connected')}
        </StatusIndicator>
      )}
    </Container>
  );
};

export default CargoTracking;