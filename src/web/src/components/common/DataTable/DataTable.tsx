import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

import {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  PaginationContainer
} from './DataTable.styles';

// Constants
const DEFAULT_PAGE_SIZE = 10;
const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc'
} as const;

// Interfaces
interface IColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
  filterConfig?: {
    type: 'text' | 'select' | 'date';
    options?: Array<{ label: string; value: any }>;
  };
}

interface IDataTableProps {
  data: Array<any>;
  columns: Array<IColumn>;
  pageSize?: number;
  loading?: boolean;
  error?: boolean;
  emptyStateMessage?: string;
  onSort?: (key: string, direction: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onPageChange?: (page: number) => void;
  enablePrint?: boolean;
  enableExport?: boolean;
  analyticsConfig?: {
    tableId: string;
    trackSort?: boolean;
    trackFilter?: boolean;
    trackPagination?: boolean;
  };
}

const DataTable: React.FC<IDataTableProps> = ({
  data,
  columns,
  pageSize = DEFAULT_PAGE_SIZE,
  loading = false,
  error = false,
  emptyStateMessage,
  onSort,
  onFilter,
  onPageChange,
  enablePrint = false,
  enableExport = false,
  analyticsConfig
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: string } | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedRows, setSelectedRows] = useState<Array<any>>([]);

  // Memoized calculations
  const totalPages = useMemo(() => Math.ceil(data.length / pageSize), [data.length, pageSize]);
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  // Sort handler
  const handleSort = useCallback((key: string) => {
    const direction = sortConfig?.key === key && sortConfig.direction === SORT_DIRECTIONS.ASC
      ? SORT_DIRECTIONS.DESC
      : SORT_DIRECTIONS.ASC;
    
    setSortConfig({ key, direction });
    onSort?.(key, direction);

    if (analyticsConfig?.trackSort) {
      // Analytics tracking for sort events
      console.log(`Sort tracked: ${key} ${direction}`);
    }
  }, [sortConfig, onSort, analyticsConfig]);

  // Filter handler
  const handleFilter = useCallback((key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);

    if (analyticsConfig?.trackFilter) {
      // Analytics tracking for filter events
      console.log(`Filter tracked: ${key} ${value}`);
    }
  }, [filters, onFilter, analyticsConfig]);

  // Page change handler
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);

    if (analyticsConfig?.trackPagination) {
      // Analytics tracking for pagination events
      console.log(`Page change tracked: ${page}`);
    }
  }, [onPageChange, analyticsConfig]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        handlePageChange(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, handlePageChange]);

  // Print handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Export handler
  const handleExport = useCallback(() => {
    const csv = columns
      .map(col => col.label)
      .join(',') + '\n' +
      data.map(row => 
        columns.map(col => row[col.key]).join(',')
      ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table-export.csv';
    a.click();
  }, [columns, data]);

  if (error) {
    return (
      <TableContainer role="alert" aria-label={t('table.error')}>
        {t('table.errorMessage')}
      </TableContainer>
    );
  }

  if (loading) {
    return (
      <TableContainer role="status" aria-label={t('table.loading')}>
        {t('table.loadingMessage')}
      </TableContainer>
    );
  }

  if (!data.length) {
    return (
      <TableContainer role="status" aria-label={t('table.empty')}>
        {emptyStateMessage || t('table.emptyMessage')}
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <Table role="grid" aria-label={t('table.aria.label')}>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableHeaderCell
                key={column.key}
                onClick={() => column.sortable && handleSort(column.key)}
                style={{ width: column.width }}
                align={column.align}
                role="columnheader"
                aria-sort={sortConfig?.key === column.key ? sortConfig.direction : undefined}
                tabIndex={0}
              >
                {column.label}
                {sortConfig?.key === column.key && (
                  sortConfig.direction === SORT_DIRECTIONS.ASC ? <ArrowUpward /> : <ArrowDownward />
                )}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((row, rowIndex) => (
            <TableRow 
              key={rowIndex}
              role="row"
              aria-rowindex={rowIndex + 1}
            >
              {columns.map(column => (
                <TableCell
                  key={column.key}
                  align={column.align}
                  data-label={column.label}
                  role="gridcell"
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <PaginationContainer>
        <div>
          {t('table.pagination.showing')} {((currentPage - 1) * pageSize) + 1}-
          {Math.min(currentPage * pageSize, data.length)} {t('table.pagination.of')} {data.length}
        </div>
        <div>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={t('table.pagination.previous')}
          >
            {t('table.pagination.prev')}
          </button>
          <span>{currentPage} / {totalPages}</span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label={t('table.pagination.next')}
          >
            {t('table.pagination.next')}
          </button>
        </div>
        {enablePrint && (
          <button onClick={handlePrint} aria-label={t('table.actions.print')}>
            {t('table.actions.print')}
          </button>
        )}
        {enableExport && (
          <button onClick={handleExport} aria-label={t('table.actions.export')}>
            {t('table.actions.export')}
          </button>
        )}
      </PaginationContainer>
    </TableContainer>
  );
};

export default DataTable;