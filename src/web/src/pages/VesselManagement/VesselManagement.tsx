import React, { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import { useNavigate, useLocation } from 'react-router-dom'; // ^6.0.0
import useWebSocket from 'react-use-websocket'; // ^4.3.1
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0

// Internal imports
import { VesselManagementContainer, SearchSection, FilterSection } from './VesselManagement.styles';
import { VesselSchedule } from '../../components/vessel/VesselSchedule/VesselSchedule';
import useVesselData from '../../hooks/useVesselData';
import { IVesselCall, VesselCallStatus } from '../../types/vessel.types';
import { socketConfig, SOCKET_EVENTS } from '../../config/socket.config';

// Constants
const REFRESH_INTERVAL = 30000; // 30 seconds
const DEFAULT_FILTERS = {
  status: [] as VesselCallStatus[],
  dateRange: {
    start: new Date(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days ahead
  }
};

const VesselManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Custom hooks
  const {
    vesselCalls,
    loading,
    error,
    fetchVesselCalls,
    updateVesselCall,
    reconnectWebSocket
  } = useVesselData({
    autoConnect: true,
    cacheDuration: 300000 // 5 minutes
  });

  // WebSocket setup
  const { lastMessage, readyState } = useWebSocket(socketConfig.url, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
    reconnectAttempts: 5,
    options: socketConfig.options
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const update = JSON.parse(lastMessage.data);
        if (update.type === SOCKET_EVENTS.VESSEL_UPDATE) {
          updateVesselCall(update.data.id, update.data.status);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    }
  }, [lastMessage, updateVesselCall]);

  // Initial data fetch and refresh interval
  useEffect(() => {
    fetchVesselCalls();
    
    const interval = setInterval(() => {
      fetchVesselCalls();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchVesselCalls]);

  // Handle vessel selection
  const handleVesselSelect = useCallback((vesselCall: IVesselCall) => {
    navigate(`/vessels/${vesselCall.id}`);
  }, [navigate]);

  // Handle search
  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  // Error fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <div role="alert" className="error-container">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );

  // Memoized filter configuration
  const filterConfig = useMemo(() => ({
    status: {
      options: Object.values(VesselCallStatus).map(status => ({
        label: status,
        value: status
      }))
    },
    dateRange: {
      start: filters.dateRange.start,
      end: filters.dateRange.end
    }
  }), [filters.dateRange]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        fetchVesselCalls();
        reconnectWebSocket();
      }}
    >
      <VesselManagementContainer>
        <SearchSection>
          <input
            type="search"
            placeholder="Search vessels..."
            value={searchTerm}
            onChange={handleSearch}
            aria-label="Search vessels"
          />
        </SearchSection>

        <FilterSection>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange({
              ...filters,
              status: Array.from(e.target.selectedOptions, option => option.value as VesselCallStatus)
            })}
            multiple
            aria-label="Filter by status"
          >
            {filterConfig.status.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="date-range">
            <input
              type="date"
              value={filters.dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => handleFilterChange({
                ...filters,
                dateRange: {
                  ...filters.dateRange,
                  start: new Date(e.target.value)
                }
              })}
              aria-label="Start date"
            />
            <input
              type="date"
              value={filters.dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => handleFilterChange({
                ...filters,
                dateRange: {
                  ...filters.dateRange,
                  end: new Date(e.target.value)
                }
              })}
              aria-label="End date"
            />
          </div>
        </FilterSection>

        <VesselSchedule
          vessels={vesselCalls}
          loading={loading}
          error={error}
          onVesselSelect={handleVesselSelect}
          filters={{
            searchTerm,
            ...filters
          }}
          enableRealtime={true}
          accessibilityLabels={{
            tableLabel: "Vessel Schedule",
            searchLabel: "Search vessels",
            statusLabel: "Vessel status"
          }}
        />
      </VesselManagementContainer>
    </ErrorBoundary>
  );
};

export default VesselManagement;