import React from 'react'; // v18.0.0
import { format } from 'date-fns'; // v2.30.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import {
  VesselCardContainer,
  VesselCardHeader,
  VesselCardContent,
  VesselCardFooter
} from './VesselCard.styles';
import Button from '../../common/Button/Button';
import { IVesselCall, VesselCallStatus } from '../../../types/vessel.types';

interface VesselCardProps {
  vesselCall: IVesselCall;
  onClick: (vesselId: number) => void;
  className?: string;
  loading?: boolean;
  error?: Error;
  onRetry?: () => void;
}

interface StatusStyle {
  color: string;
  animation?: string;
}

const getStatusColor = (status: VesselCallStatus): StatusStyle => {
  switch (status) {
    case VesselCallStatus.APPROACHING:
      return { color: '#00A3E0', animation: 'pulse 2s infinite' };
    case VesselCallStatus.BERTHED:
      return { color: '#28A745' };
    case VesselCallStatus.SCHEDULED:
      return { color: '#0066CC' };
    case VesselCallStatus.DEPARTED:
      return { color: '#4A4A4A' };
    case VesselCallStatus.CANCELLED:
      return { color: '#DC3545' };
    default:
      return { color: '#4A4A4A' };
  }
};

export const VesselCard = React.memo<VesselCardProps>(({
  vesselCall,
  onClick,
  className,
  loading = false,
  error,
  onRetry
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <VesselCardContainer className={className} aria-busy="true">
        <div className="skeleton-loader" aria-hidden="true">
          <div className="skeleton-header" />
          <div className="skeleton-content" />
          <div className="skeleton-footer" />
        </div>
        <span className="visually-hidden">{t('vessel.loading')}</span>
      </VesselCardContainer>
    );
  }

  if (error) {
    return (
      <VesselCardContainer className={className} role="alert">
        <VesselCardContent>
          <p className="error-message">{t('vessel.error')}</p>
          {onRetry && (
            <Button
              variant="secondary"
              size="small"
              onClick={onRetry}
              ariaLabel={t('common.retry')}
            >
              {t('common.retry')}
            </Button>
          )}
        </VesselCardContent>
      </VesselCardContainer>
    );
  }

  const handleClick = () => {
    onClick(vesselCall.id);
  };

  const formatDateTime = (date: Date) => {
    return format(new Date(date), 'dd MMM yyyy HH:mm');
  };

  return (
    <VesselCardContainer 
      className={className}
      onClick={handleClick}
      role="article"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && handleClick()}
      aria-label={t('vessel.cardLabel', { vessel: vesselCall.vesselName })}
    >
      <VesselCardHeader status={vesselCall.status}>
        <h3>{vesselCall.vesselName}</h3>
        <span className="status-indicator" aria-label={t(`vessel.status.${vesselCall.status.toLowerCase()}`)}>
          {t(`vessel.status.${vesselCall.status.toLowerCase()}`)}
        </span>
      </VesselCardHeader>

      <VesselCardContent>
        <div className="vessel-details">
          <div>
            <span className="detail-label">{t('vessel.imo')}</span>
            <p className="detail-value">{vesselCall.imoNumber}</p>
          </div>
          <div>
            <span className="detail-label">{t('vessel.callSign')}</span>
            <p className="detail-value">{vesselCall.callSign}</p>
          </div>
          <div>
            <span className="detail-label">{t('vessel.eta')}</span>
            <p className="detail-value">{formatDateTime(vesselCall.eta)}</p>
          </div>
          <div>
            <span className="detail-label">{t('vessel.etd')}</span>
            <p className="detail-value">{formatDateTime(vesselCall.etd)}</p>
          </div>
        </div>
      </VesselCardContent>

      <VesselCardFooter>
        <Button
          variant="outline"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            // Additional action handler
          }}
          ariaLabel={t('vessel.viewDetails')}
        >
          {t('vessel.viewDetails')}
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={handleClick}
          ariaLabel={t('vessel.manage')}
        >
          {t('vessel.manage')}
        </Button>
      </VesselCardFooter>
    </VesselCardContainer>
  );
});

VesselCard.displayName = 'VesselCard';

export default VesselCard;