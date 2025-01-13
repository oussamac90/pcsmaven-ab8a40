import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns'; // v2.30.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import { useQueryClient } from 'react-query'; // v4.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0

// Internal imports
import { CargoManifest, CargoStatus, CargoType } from '../../../types/cargo.types';
import cargoService from '../../../services/cargo.service';
import DataTable from '../../common/DataTable/DataTable';

// Constants
const PAGE_SIZE = 10;
const CACHE_TIMEOUT = 300000; // 5 minutes
const WS_RECONNECT_INTERVAL = 5000; // 5 seconds

interface ICargoManifestProps {
  vesselCallId: number;
  onStatusChange?: (id: number, status: CargoStatus) => void;
  enableRealTimeUpdates?: boolean;
  cacheTimeout?: number;
  onError?: (error: Error) => void;
}

interface ICargoManifestState {
  data: CargoManifest[];
  loading: boolean;
  error: Error | null;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  filters: Record<string, any>;
}

const TABLE_COLUMNS = [
  {
    key: 'id',
    label: 'ID',
    sortable: true,
    width: '80px'
  },
  {
    key: 'cargoType',
    label: 'Type',
    sortable: true,
    filterable: true,
    render: (value: CargoType) => value.replace('_', ' '),
    filterConfig: {
      type: 'select',
      options: Object.values(CargoType).map(type => ({
        label: type.replace('_', ' '),
        value: type
      }))
    }
  },
  {
    key: 'weight',
    label: 'Weight (MT)',
    sortable: true,
    align: 'right',
    render: (value: number) => value.toFixed(2)
  },
  {
    key: 'volume',
    label: 'Volume (m³)',
    sortable: true,
    align: 'right',
    render: (value: number) => value.toFixed(2)
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value: CargoStatus) => value.replace('_', ' '),
    filterConfig: {
      type: 'select',
      options: Object.values(CargoStatus).map(status => ({
        label: status.replace('_', ' '),
        value: status
      }))
    }
  },
  {
    key: 'location',
    label: 'Location',
    sortable: true,
    filterable: true
  },
  {
    key: 'customsStatus',
    label: 'Customs',
    sortable: true,
    filterable: true
  },
  {
    key: 'updatedAt',
    label: 'Last Updated',
    sortable: true,
    render: (value: Date) => format(new Date(value), 'dd/MM/yyyy HH:mm')
  }
];

const CargoManifest: React.FC<ICargoManifestProps> = ({
  vesselCallId,
  onStatusChange,
  enableRealTimeUpdates = true,
  cacheTimeout = CACHE_TIMEOUT,
  onError
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  const [state, setState] = useState<ICargoManifestState>({
    data: [],
    loading: true,
    error: null,
    sortField: 'updatedAt',
    sortDirection: 'desc',
    filters: {}
  });

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    if (enableRealTimeUpdates) {
      const connectWebSocket = () => {
        wsRef.current = cargoService.subscribeToCargoUpdates(vesselCallId);
        
        wsRef.current.onmessage = (event) => {
          const update = JSON.parse(event.data);
          handleCargoUpdate(update);
        };

        wsRef.current.onclose = () => {
          setTimeout(connectWebSocket, WS_RECONNECT_INTERVAL);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          onError?.(new Error('WebSocket connection failed'));
        };
      };

      connectWebSocket();
      return () => wsRef.current?.close();
    }
  }, [vesselCallId, enableRealTimeUpdates]);

  // Fetch initial cargo manifest data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true }));
        const data = await cargoService.getCargoManifest(vesselCallId);
        setState(prev => ({ ...prev, data, loading: false }));
        
        // Cache the data
        queryClient.setQueryData(['cargoManifest', vesselCallId], data, {
          cacheTime: cacheTimeout
        });
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error as Error 
        }));
        onError?.(error as Error);
      }
    };

    fetchData();
  }, [vesselCallId, cacheTimeout]);

  // Handle real-time cargo updates
  const handleCargoUpdate = useCallback((update: any) => {
    setState(prev => ({
      ...prev,
      data: prev.data.map(item => 
        item.id === update.id ? { ...item, ...update } : item
      )
    }));
  }, []);

  // Handle status changes with optimistic updates
  const handleStatusChange = useCallback(async (id: number, status: CargoStatus) => {
    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        data: prev.data.map(item =>
          item.id === id ? { ...item, status } : item
        )
      }));

      // Update server
      await cargoService.updateCargoStatus(id, status);
      onStatusChange?.(id, status);

      // Update cache
      queryClient.setQueryData(['cargoManifest', vesselCallId], state.data);
    } catch (error) {
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        data: prev.data.map(item =>
          item.id === id ? { ...item, status: item.status } : item
        )
      }));
      onError?.(error as Error);
    }
  }, [vesselCallId, onStatusChange, state.data]);

  // Handle sorting
  const handleSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    setState(prev => ({
      ...prev,
      sortField: field,
      sortDirection: direction,
      data: [...prev.data].sort((a, b) => {
        const aVal = a[field as keyof CargoManifest];
        const bVal = b[field as keyof CargoManifest];
        return direction === 'asc' ? 
          (aVal > bVal ? 1 : -1) : 
          (aVal < bVal ? 1 : -1);
      })
    }));
  }, []);

  // Handle filtering
  const handleFilter = useCallback((filters: Record<string, any>) => {
    setState(prev => ({ ...prev, filters }));
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      await cargoService.exportCargoManifest(vesselCallId);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [vesselCallId]);

  if (state.error) {
    return (
      <div role="alert" className="error-container">
        {t('cargo.manifest.error')}
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={<div>{t('cargo.manifest.error')}</div>}
      onError={onError}
    >
      <div className="cargo-manifest-container">
        <DataTable
          data={state.data}
          columns={TABLE_COLUMNS}
          pageSize={PAGE_SIZE}
          loading={state.loading}
          onSort={handleSort}
          onFilter={handleFilter}
          enableExport={true}
          onExport={handleExport}
          analyticsConfig={{
            tableId: 'cargo-manifest',
            trackSort: true,
            trackFilter: true,
            trackPagination: true
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default CargoManifest;