import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from 'react-error-boundary';
import useWebSocket from 'react-use-websocket';

// Internal imports
import { DashboardContainer, StatusSection, OperationsSection, DocumentsSection } from './Dashboard.styles';
import VesselCard from '../../components/vessel/VesselCard/VesselCard';
import useVesselData from '../../hooks/useVesselData';
import useAuth from '../../hooks/useAuth';
import { SOCKET_EVENTS } from '../../config/socket.config';
import { VesselCallStatus } from '../../types/vessel.types';

// Constants
const REFRESH_INTERVAL = 30000; // 30 seconds
const ERROR_BOUNDARY_MESSAGE = 'Dashboard component error';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, checkRole } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);

  // WebSocket setup for real-time updates
  const { sendMessage, lastMessage } = useWebSocket(process.env.REACT_APP_SOCKET_URL || 'ws://localhost:3001', {
    shouldReconnect: true,
    reconnectAttempts: 5,
    reconnectInterval: 3000
  });

  // Vessel data management with real-time updates
  const {
    vesselCalls,
    loading,
    error,
    isOffline,
    fetchVesselCalls,
    refreshCache
  } = useVesselData({
    autoConnect: true,
    cacheDuration: 300000, // 5 minutes
    retryAttempts: 3
  });

  // Access control check
  useEffect(() => {
    const verifyAccess = async () => {
      const hasViewAccess = await checkRole('PORT_AUTHORITY');
      setHasAccess(hasViewAccess);
    };
    verifyAccess();
  }, [checkRole]);

  // Initial data fetch and refresh setup
  useEffect(() => {
    fetchVesselCalls();
    const refreshInterval = setInterval(refreshCache, REFRESH_INTERVAL);
    return () => clearInterval(refreshInterval);
  }, [fetchVesselCalls, refreshCache]);

  // WebSocket message handler
  useEffect(() => {
    if (lastMessage) {
      try {
        const update = JSON.parse(lastMessage.data);
        if (update.type === SOCKET_EVENTS.VESSEL_UPDATE) {
          refreshCache();
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    }
  }, [lastMessage, refreshCache]);

  // Navigation handler
  const handleVesselClick = useCallback((vesselId: number) => {
    navigate(`/vessels/${vesselId}`);
  }, [navigate]);

  // Error fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <div role="alert" className="error-container">
      <h2>{t('dashboard.error.title')}</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>{t('common.retry')}</button>
    </div>
  );

  if (!hasAccess) {
    return (
      <div role="alert" className="access-denied">
        {t('common.accessDenied')}
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DashboardContainer>
        {/* Status Overview Section */}
        <StatusSection>
          <div className="status-card">
            <h3>{t('dashboard.vessels.title')}</h3>
            <p>{t('dashboard.vessels.total', { count: vesselCalls.length })}</p>
          </div>
          <div className="status-card">
            <h3>{t('dashboard.berths.title')}</h3>
            <p>{t('dashboard.berths.available', { 
              count: vesselCalls.filter(call => call.status === VesselCallStatus.BERTHED).length 
            })}</p>
          </div>
          <div className="status-card warning">
            <h3>{t('dashboard.alerts.title')}</h3>
            <p>{t('dashboard.alerts.count', { count: 3 })}</p>
          </div>
        </StatusSection>

        {/* Active Operations Section */}
        <OperationsSection>
          <h2>{t('dashboard.operations.title')}</h2>
          {loading ? (
            <div className="loading-indicator" aria-busy="true">
              {t('common.loading')}
            </div>
          ) : error ? (
            <div className="error-message" role="alert">
              {t('dashboard.error.loading')}
            </div>
          ) : (
            <div className="vessel-grid">
              {vesselCalls
                .filter(call => 
                  call.status === VesselCallStatus.APPROACHING || 
                  call.status === VesselCallStatus.BERTHED
                )
                .map(vesselCall => (
                  <VesselCard
                    key={vesselCall.id}
                    vesselCall={vesselCall}
                    onClick={handleVesselClick}
                  />
                ))}
            </div>
          )}
        </OperationsSection>

        {/* Recent Documents Section */}
        <DocumentsSection>
          <h2>{t('dashboard.documents.title')}</h2>
          <div className="document-list">
            {/* Document list items */}
            <ul>
              <li>
                <span className="document-type manifest">
                  {t('document.type.manifest')}
                </span>
                <p>Cargo Manifest #12345</p>
              </li>
              <li>
                <span className="document-type customs">
                  {t('document.type.customs')}
                </span>
                <p>Customs Declaration #789</p>
              </li>
            </ul>
          </div>
        </DocumentsSection>

        {/* Offline indicator */}
        {isOffline && (
          <div className="offline-banner" role="alert">
            {t('common.offlineMode')}
          </div>
        )}
      </DashboardContainer>
    </ErrorBoundary>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(Dashboard);