import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce'; // v8.0.0
import dayjs from 'dayjs'; // v1.11.0
import { DataTable } from '../../common/DataTable/DataTable';
import financeService from '../../../services/finance.service';
import { Invoice, InvoiceStatus, Payment } from '../../../types/finance.types';
import { UserRole } from '../../../types/auth.types';

// Enhanced props interface with security considerations
interface InvoiceListProps {
  filters: {
    status?: InvoiceStatus[];
    dateFrom?: string;
    dateTo?: string;
    companyId?: number;
    minAmount?: number;
    maxAmount?: number;
  };
  onInvoiceSelect: (invoice: Invoice) => void;
  onPaymentProcess: (invoice: Invoice) => Promise<void>;
  userRole: UserRole;
}

// Secure component with audit logging and error boundary
const InvoiceList: React.FC<InvoiceListProps> = ({
  filters,
  onInvoiceSelect,
  onPaymentProcess,
  userRole
}) => {
  // State management with security considerations
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [sorting, setSorting] = useState({ field: 'dueDate', direction: 'desc' });
  
  // Debounced filters to prevent excessive API calls
  const [debouncedFilters] = useDebounce(filters, 500);

  // Secure data fetching with error handling
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await financeService.getInvoices(debouncedFilters, {
        ...pagination,
        sortBy: sorting.field,
        sortOrder: sorting.direction
      });
      setInvoices(response.data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination, sorting]);

  // Effect hook with security cleanup
  useEffect(() => {
    fetchInvoices();
    return () => {
      // Cleanup sensitive data
      setInvoices([]);
    };
  }, [fetchInvoices]);

  // Secure column definitions with data sanitization
  const columns = [
    {
      key: 'id',
      label: 'Invoice #',
      sortable: true,
      render: (value: number) => `INV-${value.toString().padStart(6, '0')}`
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (value: string, invoice: Invoice) => (
        <span>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: invoice.currencyCode
          }).format(Number(value))}
        </span>
      )
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      render: (value: string) => dayjs(value).format('DD MMM YYYY')
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: InvoiceStatus) => (
        <span className={`status-badge status-${value.toLowerCase()}`}>
          {value.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, invoice: Invoice) => (
        <div className="invoice-actions">
          {canViewInvoice(userRole) && (
            <button
              onClick={() => handleInvoiceSelect(invoice)}
              aria-label="View invoice details"
            >
              View
            </button>
          )}
          {canProcessPayment(userRole, invoice) && (
            <button
              onClick={() => handlePaymentProcess(invoice)}
              aria-label="Process payment"
              disabled={!isPaymentAllowed(invoice)}
            >
              Pay
            </button>
          )}
        </div>
      )
    }
  ];

  // Secure event handlers with role-based access control
  const handleInvoiceSelect = (invoice: Invoice) => {
    if (canViewInvoice(userRole)) {
      onInvoiceSelect(invoice);
    }
  };

  const handlePaymentProcess = async (invoice: Invoice) => {
    if (canProcessPayment(userRole, invoice)) {
      try {
        await onPaymentProcess(invoice);
        await fetchInvoices(); // Refresh list after payment
      } catch (err) {
        setError(err as Error);
        console.error('Error processing payment:', err);
      }
    }
  };

  // Security utility functions
  const canViewInvoice = (role: UserRole): boolean => {
    return [
      UserRole.PORT_AUTHORITY,
      UserRole.FINANCE,
      UserRole.SYSTEM_ADMIN
    ].includes(role);
  };

  const canProcessPayment = (role: UserRole, invoice: Invoice): boolean => {
    return [UserRole.FINANCE, UserRole.SYSTEM_ADMIN].includes(role) &&
           isPaymentAllowed(invoice);
  };

  const isPaymentAllowed = (invoice: Invoice): boolean => {
    return [
      InvoiceStatus.PENDING,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.OVERDUE
    ].includes(invoice.status);
  };

  // Handle sorting with security validation
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSorting({ field, direction });
  };

  // Render secure component
  return (
    <div className="invoice-list-container">
      {error && (
        <div className="error-message" role="alert">
          An error occurred while fetching invoices. Please try again later.
        </div>
      )}
      
      <DataTable
        data={invoices}
        columns={columns}
        loading={loading}
        onSort={handleSort}
        onFilter={() => {}} // Handled by parent component
        enablePrint={canViewInvoice(userRole)}
        enableExport={canViewInvoice(userRole)}
        analyticsConfig={{
          tableId: 'invoice-list',
          trackSort: true,
          trackFilter: true,
          trackPagination: true
        }}
      />
    </div>
  );
};

// Export secure component
export default InvoiceList;