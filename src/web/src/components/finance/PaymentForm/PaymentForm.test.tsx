import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import PaymentForm from './PaymentForm';
import { financeService } from '../../../services/finance.service';
import { PaymentMethod } from '../../../types/finance.types';
import { theme } from '../../../styles/theme.styles';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock finance service
vi.mock('../../../services/finance.service', () => ({
  financeService: {
    createPayment: vi.fn(),
    validatePaymentAmount: vi.fn()
  }
}));

// Mock props
const mockPaymentProps = {
  invoiceId: 1,
  amount: 1000,
  currencyCode: 'USD',
  onSuccess: vi.fn(),
  onError: vi.fn(),
  onValidationError: vi.fn()
};

describe('PaymentForm', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup successful validation and payment mocks
    vi.mocked(financeService.validatePaymentAmount).mockResolvedValue(true);
    vi.mocked(financeService.createPayment).mockResolvedValue({
      id: 1,
      invoiceId: 1,
      amountPaid: '1000',
      currencyCode: 'USD',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      transactionId: 'mock-tx-id',
      paidAt: new Date().toISOString(),
      createdBy: 1,
      status: 'COMPLETED'
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render without accessibility violations', async () => {
      const { container } = render(<PaymentForm {...mockPaymentProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should render all form elements correctly', () => {
      render(<PaymentForm {...mockPaymentProps} />);
      
      // Check for form elements
      expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment amount/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit payment/i })).toBeInTheDocument();
    });

    it('should display correct payment methods', () => {
      render(<PaymentForm {...mockPaymentProps} />);
      const select = screen.getByLabelText(/payment method/i);
      const options = within(select).getAllByRole('option');
      
      expect(options).toHaveLength(Object.values(PaymentMethod).length);
      expect(options[0]).toHaveValue(PaymentMethod.BANK_TRANSFER);
    });

    it('should pre-fill amount field with provided value', () => {
      render(<PaymentForm {...mockPaymentProps} />);
      const amountInput = screen.getByLabelText(/payment amount/i);
      expect(amountInput).toHaveValue(1000);
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields on submit', async () => {
      render(<PaymentForm {...mockPaymentProps} />);
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      
      // Clear amount field
      const amountInput = screen.getByLabelText(/payment amount/i);
      await userEvent.clear(amountInput);
      
      // Submit form
      await userEvent.click(submitButton);
      
      expect(await screen.findByText(/payment amount must be greater than 0/i)).toBeInTheDocument();
    });

    it('should validate amount against invoice amount', async () => {
      render(<PaymentForm {...mockPaymentProps} />);
      const amountInput = screen.getByLabelText(/payment amount/i);
      
      // Enter amount larger than invoice
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '2000');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      await userEvent.click(submitButton);
      
      expect(mockPaymentProps.onValidationError).toHaveBeenCalled();
    });

    it('should validate payment method selection', async () => {
      render(<PaymentForm {...mockPaymentProps} />);
      const methodSelect = screen.getByLabelText(/payment method/i);
      
      // Clear selection
      await userEvent.selectOptions(methodSelect, '');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      await userEvent.click(submitButton);
      
      expect(await screen.findByText(/please select a valid payment method/i)).toBeInTheDocument();
    });
  });

  describe('Payment Processing', () => {
    it('should handle successful payment submission', async () => {
      render(<PaymentForm {...mockPaymentProps} />);
      
      // Submit form with valid data
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(financeService.createPayment).toHaveBeenCalledWith({
          invoiceId: mockPaymentProps.invoiceId,
          amountPaid: mockPaymentProps.amount.toString(),
          currencyCode: mockPaymentProps.currencyCode,
          paymentMethod: PaymentMethod.BANK_TRANSFER
        });
        expect(mockPaymentProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('should handle payment processing errors', async () => {
      const error = new Error('Payment processing failed');
      vi.mocked(financeService.createPayment).mockRejectedValue(error);
      
      render(<PaymentForm {...mockPaymentProps} />);
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockPaymentProps.onError).toHaveBeenCalledWith(error);
      });
    });

    it('should disable submit button during processing', async () => {
      render(<PaymentForm {...mockPaymentProps} />);
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      
      // Submit form
      await userEvent.click(submitButton);
      
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/processing/i);
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent(/submit payment/i);
      });
    });
  });

  describe('Security', () => {
    it('should sanitize input values', async () => {
      render(<PaymentForm {...mockPaymentProps} />);
      const amountInput = screen.getByLabelText(/payment amount/i);
      
      // Attempt XSS injection
      await userEvent.type(amountInput, '<script>alert("xss")</script>');
      
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      await userEvent.click(submitButton);
      
      expect(financeService.createPayment).toHaveBeenCalledWith(
        expect.not.stringContaining('<script>')
      );
    });

    it('should handle sensitive data securely', async () => {
      render(<PaymentForm {...mockPaymentProps} />);
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit payment/i });
      await userEvent.click(submitButton);
      
      // Verify secure form submission
      expect(screen.getByRole('form')).toHaveAttribute('data-security-level', 'CRITICAL');
    });
  });
});