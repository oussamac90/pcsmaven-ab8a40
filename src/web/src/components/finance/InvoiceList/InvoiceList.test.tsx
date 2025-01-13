import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import InvoiceList from './InvoiceList';
import financeService from '../../../services/finance.service';
import { Invoice, InvoiceStatus, PaymentMethod } from '../../../types/finance.types';
import { UserRole } from '../../../types/auth.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock finance service
vi.mock('../../../services/finance.service');

// Mock invoice data
const mockInvoices: Invoice[] = [
  {
    id: 1,
    companyId: 1,
    amount: '5000.00',
    currencyCode: 'USD',
    dueDate: '2024-02-01',
    status: InvoiceStatus.PENDING,
    description: 'Port services - January 2024',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 1,
    updatedAt: '2024-01-01T00:00:00Z',
    updatedBy: 1,
    version: 1
  },
  {
    id: 2,
    companyId: 1,
    amount: '7500.00',
    currencyCode: 'USD',
    dueDate: '2024-02-15',
    status: InvoiceStatus.PARTIALLY_PAID,
    description: 'Berthing fees - January 2024',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 1,
    updatedAt: '2024-01-01T00:00:00Z',
    updatedBy: 1,
    version: 1
  }
];

// Default props
const defaultProps = {
  filters: {},
  onInvoiceSelect: vi.fn(),
  onPaymentProcess: vi.fn(),
  userRole: UserRole.FINANCE
};

describe('InvoiceList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks
    (financeService.getInvoices as jest.Mock).mockResolvedValue({ 
      data: mockInvoices,
      total: mockInvoices.length
    });
  });

  describe('Security Tests', () => {
    it('should only show payment buttons for authorized roles', async () => {
      const { rerender } = render(<InvoiceList {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /pay/i })).toHaveLength(2);
      });

      // Test with unauthorized role
      rerender(<InvoiceList {...defaultProps} userRole={UserRole.SHIPPING_LINE} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument();
      });
    });

    it('should validate invoice access before displaying sensitive data', async () => {
      render(<InvoiceList {...defaultProps} />);

      await waitFor(() => {
        const invoiceAmounts = screen.getAllByText(/\$[0-9,]+\.[0-9]{2}/);
        expect(invoiceAmounts).toHaveLength(2);
        // Verify amounts are properly formatted and masked if needed
        expect(invoiceAmounts[0]).toHaveAttribute('data-testid', 'secure-amount');
      });
    });

    it('should handle unauthorized access attempts gracefully', async () => {
      (financeService.getInvoices as jest.Mock).mockRejectedValue({
        status: 403,
        message: 'Unauthorized access'
      });

      render(<InvoiceList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/unauthorized/i);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array(1000).fill(null).map((_, index) => ({
        ...mockInvoices[0],
        id: index + 1
      }));

      (financeService.getInvoices as jest.Mock).mockResolvedValue({
        data: largeDataset,
        total: largeDataset.length
      });

      const startTime = performance.now();
      render(<InvoiceList {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByRole('row')).toHaveLength(21); // 20 items + header
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second
    });

    it('should implement efficient filtering and sorting', async () => {
      render(<InvoiceList {...defaultProps} />);

      // Test sorting
      const sortButton = screen.getByRole('columnheader', { name: /amount/i });
      fireEvent.click(sortButton);

      await waitFor(() => {
        const amounts = screen.getAllByText(/\$[0-9,]+\.[0-9]{2}/);
        expect(amounts[0]).toHaveTextContent('$5,000.00');
        expect(amounts[1]).toHaveTextContent('$7,500.00');
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should meet WCAG accessibility standards', async () => {
      const { container } = render(<InvoiceList {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByRole('row')).toHaveLength(3); // 2 items + header
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(<InvoiceList {...defaultProps} />);

      const firstRow = await screen.findByRole('row', { name: /port services/i });
      const viewButton = within(firstRow).getByRole('button', { name: /view/i });
      
      // Tab navigation
      viewButton.focus();
      expect(document.activeElement).toBe(viewButton);
      
      // Keyboard interaction
      fireEvent.keyDown(viewButton, { key: 'Enter' });
      expect(defaultProps.onInvoiceSelect).toHaveBeenCalled();
    });

    it('should provide proper ARIA labels and roles', async () => {
      render(<InvoiceList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toHaveAttribute('aria-label');
        expect(screen.getAllByRole('columnheader')).toHaveLength(5);
        expect(screen.getAllByRole('row')).toHaveLength(3);
      });
    });
  });

  describe('Internationalization Tests', () => {
    it('should format currency according to locale', async () => {
      render(<InvoiceList {...defaultProps} />);

      await waitFor(() => {
        const amounts = screen.getAllByText(/\$[0-9,]+\.[0-9]{2}/);
        expect(amounts[0]).toHaveTextContent('$5,000.00');
        expect(amounts[1]).toHaveTextContent('$7,500.00');
      });
    });

    it('should format dates according to locale', async () => {
      render(<InvoiceList {...defaultProps} />);

      await waitFor(() => {
        const dates = screen.getAllByText(/feb/i);
        expect(dates[0]).toHaveTextContent('01 Feb 2024');
        expect(dates[1]).toHaveTextContent('15 Feb 2024');
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should display error messages appropriately', async () => {
      (financeService.getInvoices as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      render(<InvoiceList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/error occurred/i);
      });
    });

    it('should handle network failures gracefully', async () => {
      (financeService.getInvoices as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<InvoiceList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Functional Tests', () => {
    it('should handle invoice selection correctly', async () => {
      render(<InvoiceList {...defaultProps} />);

      await waitFor(() => {
        const viewButton = screen.getAllByRole('button', { name: /view/i })[0];
        fireEvent.click(viewButton);
      });

      expect(defaultProps.onInvoiceSelect).toHaveBeenCalledWith(mockInvoices[0]);
    });

    it('should handle payment processing correctly', async () => {
      render(<InvoiceList {...defaultProps} />);

      await waitFor(() => {
        const payButton = screen.getAllByRole('button', { name: /pay/i })[0];
        fireEvent.click(payButton);
      });

      expect(defaultProps.onPaymentProcess).toHaveBeenCalledWith(mockInvoices[0]);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        status: [InvoiceStatus.PENDING],
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01'
      };

      render(<InvoiceList {...defaultProps} filters={filters} />);

      await waitFor(() => {
        expect(financeService.getInvoices).toHaveBeenCalledWith(
          filters,
          expect.any(Object)
        );
      });
    });
  });
});