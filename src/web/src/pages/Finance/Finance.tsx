import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary'; // v3.1.4
import { SecurityContext } from '@auth/security-context'; // v1.0.0
import { toast } from 'react-toastify';

// Internal imports
import { InvoiceList } from '../../components/finance/InvoiceList/InvoiceList';
import { PaymentForm } from '../../components/finance/PaymentForm/PaymentForm';
import financeService from '../../services/finance.service';
import { Invoice, InvoiceStatus, Payment } from '../../types/finance.types';
import { theme } from '../../styles/theme.styles';

// Constants
const AUDIT_EVENTS = {
  PAGE_VIEW: 'FINANCE_PAGE_VIEW',
  INVOICE_SELECT: 'INVOICE_SELECT',
  PAYMENT_INITIATE: 'PAYMENT_INITIATE',
  PAYMENT_COMPLETE: 'PAYMENT_COMPLETE',
  PAYMENT_ERROR: 'PAYMENT_ERROR'
};

const ERROR_MESSAGES = {
  GENERAL: 'An unexpected error occurred. Please try again.',
  PAYMENT_FAILED: 'Payment processing failed. Please try again.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  SECURITY_ERROR: 'Security validation failed. Please contact support.'
};

/**
 * Enhanced Finance page component with comprehensive security measures
 * and financial operation management
 */
const Finance: React.FC = () => {
  // State management
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filters, setFilters] = useState({
    status: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID],
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dateTo: new Date().toISOString()
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Security context
  const securityContext = React.useContext(SecurityContext);
  const auditLogRef = useRef<number>(Date.now());

  // Component mount audit logging
  useEffect(() => {
    const logPageView = async () => {
      try {
        await financeService.logAuditEvent({
          eventType: AUDIT_EVENTS.PAGE_VIEW,
          timestamp: new Date().toISOString(),
          userId: securityContext.userId,
          sessionId: securityContext.sessionId
        });
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
    };

    logPageView();
  }, [securityContext.userId, securityContext.sessionId]);

  /**
   * Handles secure invoice selection with validation
   */
  const handleInvoiceSelect = useCallback(async (invoice: Invoice) => {
    try {
      // Validate user permissions
      if (!securityContext.hasPermission('FINANCE_PAYMENT_CREATE')) {
        throw new Error('Insufficient permissions');
      }

      // Validate invoice status
      if (![InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID].includes(invoice.status)) {
        throw new Error('Invalid invoice status for payment');
      }

      // Log selection event
      await financeService.logAuditEvent({
        eventType: AUDIT_EVENTS.INVOICE_SELECT,
        timestamp: new Date().toISOString(),
        userId: securityContext.userId,
        sessionId: securityContext.sessionId,
        data: { invoiceId: invoice.id }
      });

      setSelectedInvoice(invoice);
    } catch (error) {
      console.error('Invoice selection error:', error);
      setError(error as Error);
      toast.error(ERROR_MESSAGES.GENERAL);
    }
  }, [securityContext]);

  /**
   * Handles payment completion with enhanced security
   */
  const handlePaymentComplete = useCallback(async (payment: Payment) => {
    try {
      setIsProcessing(true);

      // Validate transaction
      const isValid = await financeService.validateTransaction(payment);
      if (!isValid) {
        throw new Error('Transaction validation failed');
      }

      // Log payment completion
      await financeService.logAuditEvent({
        eventType: AUDIT_EVENTS.PAYMENT_COMPLETE,
        timestamp: new Date().toISOString(),
        userId: securityContext.userId,
        sessionId: securityContext.sessionId,
        data: {
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          amount: payment.amountPaid
        }
      });

      setSelectedInvoice(null);
      toast.success('Payment processed successfully');
    } catch (error) {
      console.error('Payment processing error:', error);
      await financeService.logAuditEvent({
        eventType: AUDIT_EVENTS.PAYMENT_ERROR,
        timestamp: new Date().toISOString(),
        userId: securityContext.userId,
        sessionId: securityContext.sessionId,
        data: { error: (error as Error).message }
      });
      toast.error(ERROR_MESSAGES.PAYMENT_FAILED);
    } finally {
      setIsProcessing(false);
    }
  }, [securityContext]);

  /**
   * Handles filter changes for invoice list
   */
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  }, []);

  /**
   * Error boundary fallback component
   */
  const ErrorFallback = ({ error }: { error: Error }) => (
    <div
      role="alert"
      style={{
        padding: theme.spacing.lg,
        margin: theme.spacing.lg,
        border: `1px solid ${theme.colors.error}`,
        borderRadius: theme.borderRadius.md,
        backgroundColor: `${theme.colors.error}10`
      }}
    >
      <h3 style={{ color: theme.colors.error, marginBottom: theme.spacing.md }}>
        Something went wrong:
      </h3>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.primary,
          color: theme.colors.background,
          border: 'none',
          borderRadius: theme.borderRadius.sm,
          cursor: 'pointer'
        }}
      >
        Reload Page
      </button>
    </div>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div style={{ padding: theme.spacing.lg }}>
        <h1 style={{
          fontSize: theme.typography.fontSize.xl,
          marginBottom: theme.spacing.xl,
          color: theme.colors.primary
        }}>
          Financial Management
        </h1>

        <InvoiceList
          filters={filters}
          onInvoiceSelect={handleInvoiceSelect}
          onFilterChange={handleFilterChange}
        />

        {selectedInvoice && (
          <div style={{
            marginTop: theme.spacing.xl,
            padding: theme.spacing.lg,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.surface
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize.lg,
              marginBottom: theme.spacing.lg
            }}>
              Process Payment
            </h2>
            
            <PaymentForm
              invoiceId={selectedInvoice.id}
              amount={Number(selectedInvoice.amount)}
              currencyCode={selectedInvoice.currencyCode}
              onPaymentComplete={handlePaymentComplete}
              onError={(error) => {
                setError(error);
                toast.error(ERROR_MESSAGES.PAYMENT_FAILED);
              }}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Finance;