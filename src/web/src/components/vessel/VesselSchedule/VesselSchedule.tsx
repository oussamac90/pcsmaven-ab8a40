import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { format, parseISO } from 'date-fns'; // v2.30.0
import { debounce } from 'lodash'; // v4.17.21
import useWebSocket from 'react-use-websocket'; // v4.3.1

// Internal imports
import {
  ScheduleContainer,
  ScheduleTable,
  ScheduleHeader,
  ScheduleRow,
  StatusIndicator
} from './VesselSchedule.styles';
import { DataTable } from '../../common/DataTable/DataTable';
import useVesselData from '../../../hooks/useVesselData';
import { IVesselCall, VesselCallStatus } from '../../../types/vessel.types';

// Constants
const REFRESH_INTERVAL = 30000; // 30 seconds
const SEARCH_DEBOUNCE = 300; // 300ms debounce for search
const PAGE_SIZE = 10;

interface IVesselScheduleProps {
  className?: string;
  onVesselSelect?: (vesselCall: IVesselCall) => void;
  filters?: {
    status?: VesselCallStatus[];
    dateRange?: { start: Date; end: Date };
    searchTerm?: string;
  };
  enableRealtime?: boolean;
  refreshInterval?: number;
  accessibilityLabels?: {
    tableLabel?: string;
    searchLabel?: string;
    statusLabel?: string;
  };
}

export const VesselSchedule: React.FC<IVesselScheduleProps> = ({
  className,
  onVesselSelect,
  filters: initialFilters,
  enableRealtime = true,
  refreshInterval = REFRESH_INTERVAL,
  accessibilityLabels = {
    tableLabel: 'Vessel Schedule',
    searchLabel: 'Search vessels',
    statusLabel: 'Vessel status'
  }
}) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'eta',
    direction: 'asc'
  });

  // Custom hooks
  const {
    vesselCalls,
    loading,
    error,
    fetchVesselCalls,
    updateVesselCall
  } = useVesselData({
    autoConnect: enableRealtime
  });

  // WebSocket setup for real-time updates
  const { lastMessage } = useWebSocket(process.env.REACT_APP_SOCKET_URL || 'ws://localhost:3001', {
    shouldReconnect: () => enableRealtime,
    reconnectInterval: 3000,
    reconnectAttempts: 5
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage && enableRealtime) {
      const update = JSON.parse(lastMessage.data);
      if (update.type === 'vessel.update') {
        updateVesselCall(update.data.id, update.data.status);
      }
    }
  }, [lastMessage, enableRealtime, updateVesselCall]);

  // Auto-refresh data
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchVesselCalls();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchVesselCalls]);

  // Debounced search handler
  const handleSearch = useCallback(
    debounce((term: string) => {
      setActiveFilters(prev => ({ ...prev, searchTerm: term }));
    }, SEARCH_DEBOUNCE),
    []
  );

  // Column definitions with sorting and formatting
  const columns = useMemo(() => [
    {
      key: 'vesselName',
      label: 'Vessel',
      sortable: true,
      width: '25%',
      render: (value: string, row: IVesselCall) => (
        <button
          onClick={() => onVesselSelect?.(row)}
          className="vessel-name-button"
          aria-label={`View details for vessel ${value}`}
        >
          {value}
        </button>
      )
    },
    {
      key: 'eta',
      label: 'ETA',
      sortable: true,
      width: '20%',
      render: (value: string) => format(parseISO(value), 'dd MMM yyyy HH:mm')
    },
    {
      key: 'berth',
      label: 'Berth',
      sortable: true,
      width: '15%'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '20%',
      render: (value: VesselCallStatus) => (
        <StatusIndicator 
          status={value}
          aria-label={`${accessibilityLabels.statusLabel}: ${value}`}
        >
          {value}
        </StatusIndicator>
      )
    }
  ], [onVesselSelect, accessibilityLabels.statusLabel]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = [...vesselCalls];

    // Apply search filter
    if (activeFilters?.searchTerm) {
      const term = activeFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(vessel =>
        vessel.vesselName.toLowerCase().includes(term) ||
        vessel.imoNumber.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (activeFilters?.status?.length) {
      filtered = filtered.filter(vessel =>
        activeFilters.status!.includes(vessel.status)
      );
    }

    // Apply date range filter
    if (activeFilters?.dateRange) {
      const { start, end } = activeFilters.dateRange;
      filtered = filtered.filter(vessel => {
        const eta = new Date(vessel.eta);
        return eta >= start && eta <= end;
      });
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof IVesselCall];
        const bValue = b[sortConfig.key as keyof IVesselCall];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [vesselCalls, activeFilters, sortConfig]);

  // Handle sort change
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  if (error) {
    return (
      <ScheduleContainer className={className} role="alert">
        Error loading vessel schedule. Please try again later.
      </ScheduleContainer>
    );
  }

  return (
    <ScheduleContainer className={className}>
      <DataTable
        data={filteredData}
        columns={columns}
        loading={loading}
        pageSize={PAGE_SIZE}
        onSort={handleSort}
        onFilter={setActiveFilters}
        enablePrint
        enableExport
        analyticsConfig={{
          tableId: 'vessel-schedule',
          trackSort: true,
          trackFilter: true,
          trackPagination: true
        }}
        aria-label={accessibilityLabels.tableLabel}
      />
    </ScheduleContainer>
  );
};

export default VesselSchedule;