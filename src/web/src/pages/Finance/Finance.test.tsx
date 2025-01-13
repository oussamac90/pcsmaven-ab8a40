import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe } from '@axe-core/react';
import { MockProvider } from '@testing-library/react-hooks';

// Internal imports
import Finance from './Finance';
import financeService from '../../services/finance.service';
import { InvoiceStatus, PaymentMethod } from '../../types/finance.types';
import { SecurityContext } from '@auth/security-context';
import { UserRole } from '../../types/auth.types';

// Mock data
const mockInvoices = [
  {
    id: 1,
    companyId: 100,
    amount: '5000.00',
    currencyCode: 'USD',
    dueDate: '2024-02-01',
    status: InvoiceStatus.PENDING,
    description: 'Port Services - January 2024',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 1,
    updatedAt: '2024-01-01T00:00:00Z',
    updatedBy: 1,
    version: 1
  }
];

const mockPayment = {
  id: 1,
  invoiceId: 1,
  amountPaid: '5000.00',
  currencyCode: 'USD',
  paymentMethod: PaymentMethod.BANK_TRANSFER,
  transactionId: 'TXN-123',
  paidAt: '2024-01-15T00:00:00Z',
  createdBy: 1,
  status: 'COMPLETED'
};

const mockSecurityContext = {
  userId: '1',
  sessionId: 'test-session',
  hasPermission: (permission: string) => true,
  role: UserRole.FINANCE
};

// Mock service functions
vi.mock('../../services/finance.service', () => ({
  default: {
    getInvoices: vi.fn(),
    createPayment: vi.fn(),
    validatePaymentAmount: vi.fn(),
    logAuditEvent: vi.fn()
  }
}));

describe('Finance Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    financeService.getInvoices.mockResolvedValue({ 
      data: mockInvoices,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    });
    financeService.createPayment.mockResolvedValue(mockPayment);
    financeService.validatePaymentAmount.mockResolvedValue(true);
    financeService.logAuditEvent.mockResolvedValue(undefined);
  });

  const renderFinance = () => {
    return render(
      <SecurityContext.Provider value={mockSecurityContext}>
        <Finance />
      </SecurityContext.Provider>
    );
  };

  it('should render without accessibility violations', async () => {
    const { container } = renderFinance();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should enforce access control for financial operations', async () => {
    mockSecurityContext.hasPermission = vi.fn().mockReturnValue(false);
    renderFinance();

    await waitFor(() => {
      expect(screen.queryByText('Process Payment')).not.toBeInTheDocument();
    });

    const invoiceRow = await screen.findByText(mockInvoices[0].description);
    fireEvent.click(invoiceRow);

    expect(financeService.logAuditEvent).toHaveBeenCalledWith({
      eventType: 'INVOICE_SELECT',
      timestamp: expect.any(String),
      userId: mockSecurityContext.userId,
      sessionId: mockSecurityContext.sessionId,
      data: { invoiceId: mockInvoices[0].id }
    });
  });

  it('should handle secure payment processing with validation', async () => {
    renderFinance();
    
    // Select invoice
    const invoiceRow = await screen.findByText(mockInvoices[0].description);
    fireEvent.click(invoiceRow);

    // Fill payment form
    const paymentMethodSelect = screen.getByLabelText(/payment method/i);
    const amountInput = screen.getByLabelText(/payment amount/i);
    
    await userEvent.selectOptions(paymentMethodSelect, PaymentMethod.BANK_TRANSFER);
    await userEvent.type(amountInput, '5000.00');

    // Submit payment
    const submitButton = screen.getByText(/submit payment/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(financeService.validatePaymentAmount).toHaveBeenCalledWith(
        mockInvoices[0].id,
        5000.00
      );
      expect(financeService.createPayment).toHaveBeenCalledWith({
        invoiceId: mockInvoices[0].id,
        amountPaid: '5000.00',
        currencyCode: 'USD',
        paymentMethod: PaymentMethod.BANK_TRANSFER
      });
      expect(financeService.logAuditEvent).toHaveBeenCalledWith({
        eventType: 'PAYMENT_COMPLETE',
        timestamp: expect.any(String),
        userId: mockSecurityContext.userId,
        sessionId: mockSecurityContext.sessionId,
        data: expect.any(Object)
      });
    });
  });

  it('should validate financial data and handle errors securely', async () => {
    financeService.validatePaymentAmount.mockRejectedValue(
      new Error('Payment amount exceeds invoice amount')
    );
    
    renderFinance();
    
    const invoiceRow = await screen.findByText(mockInvoices[0].description);
    fireEvent.click(invoiceRow);

    const amountInput = screen.getByLabelText(/payment amount/i);
    await userEvent.type(amountInput, '10000.00');

    const submitButton = screen.getByText(/submit payment/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/payment processing failed/i)).toBeInTheDocument();
      expect(financeService.logAuditEvent).toHaveBeenCalledWith({
        eventType: 'PAYMENT_ERROR',
        timestamp: expect.any(String),
        userId: mockSecurityContext.userId,
        sessionId: mockSecurityContext.sessionId,
        data: { error: 'Payment amount exceeds invoice amount' }
      });
    });
  });

  it('should maintain audit trail for all financial operations', async () => {
    renderFinance();

    await waitFor(() => {
      expect(financeService.logAuditEvent).toHaveBeenCalledWith({
        eventType: 'FINANCE_PAGE_VIEW',
        timestamp: expect.any(String),
        userId: mockSecurityContext.userId,
        sessionId: mockSecurityContext.sessionId
      });
    });

    const invoiceRow = await screen.findByText(mockInvoices[0].description);
    fireEvent.click(invoiceRow);

    expect(financeService.logAuditEvent).toHaveBeenCalledTimes(2);
  });

  it('should handle session timeout and authentication errors', async () => {
    financeService.getInvoices.mockRejectedValue({
      status: 401,
      message: 'Session expired'
    });

    renderFinance();

    await waitFor(() => {
      expect(screen.getByText(/session expired/i)).toBeInTheDocument();
    });
  });
});