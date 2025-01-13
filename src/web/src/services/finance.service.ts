/**
 * @fileoverview Enhanced finance service for managing financial operations in the Port Community System
 * @version 1.0.0
 * @security Critical - Contains payment processing and financial operations
 */

import { ApiService } from './api.service';
import { 
  Invoice, 
  Payment, 
  CreatePaymentRequest,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod 
} from '../types/finance.types';
import dayjs from 'dayjs'; // v1.11.7
import { SHA256, HmacSHA256 } from 'crypto-js'; // v4.1.1

/**
 * Interface for invoice filtering options
 */
interface InvoiceFilters {
  status?: InvoiceStatus[];
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for paginated response
 */
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Enhanced service class for managing financial operations with security and validation
 */
export class FinanceService {
  private readonly baseUrl: string = '/api/v1/finance';
  private readonly securityKey: string;
  private readonly paymentLimits = {
    minAmount: 0.01,
    maxAmount: 1000000.00,
    maxDailyTotal: 5000000.00
  };

  constructor(
    private readonly apiService: ApiService,
    securityKey: string
  ) {
    this.securityKey = securityKey;
  }

  /**
   * Retrieves a paginated list of invoices with filtering
   * @param filters Invoice filtering criteria
   * @param pagination Pagination options
   * @returns Promise with paginated invoice list
   */
  public async getInvoices(
    filters: InvoiceFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<Invoice>> {
    try {
      // Validate date filters
      if (filters.dateFrom && filters.dateTo) {
        const isValidDateRange = dayjs(filters.dateTo).isAfter(filters.dateFrom);
        if (!isValidDateRange) {
          throw new Error('Invalid date range specified');
        }
      }

      // Construct query parameters
      const queryParams = {
        ...filters,
        ...pagination,
        signature: this.generateRequestSignature(filters)
      };

      const response = await this.apiService.get<PaginatedResponse<Invoice>>(
        `${this.baseUrl}/invoices`,
        { params: queryParams }
      );

      return response;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  /**
   * Creates a new payment with enhanced security validation
   * @param request Payment creation request
   * @returns Promise with created payment details
   */
  public async createPayment(request: CreatePaymentRequest): Promise<Payment> {
    try {
      // Validate payment amount
      await this.validatePaymentAmount(request.invoiceId, Number(request.amountPaid));

      // Validate payment method availability
      if (!this.isPaymentMethodAvailable(request.paymentMethod)) {
        throw new Error('Selected payment method is not available');
      }

      // Add security signature and timestamp
      const secureRequest = {
        ...request,
        timestamp: new Date().toISOString(),
        signature: this.generatePaymentSignature(request)
      };

      const response = await this.apiService.post<Payment>(
        `${this.baseUrl}/payments`,
        secureRequest,
        {
          headers: {
            'X-Transaction-ID': this.generateTransactionId(),
            'X-Security-Timestamp': secureRequest.timestamp
          }
        }
      );

      return response;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Validates payment amount against invoice and system limits
   * @param invoiceId Invoice identifier
   * @param amount Payment amount
   * @returns Promise with validation result
   */
  public async validatePaymentAmount(
    invoiceId: number,
    amount: number
  ): Promise<boolean> {
    try {
      // Check system limits
      if (amount < this.paymentLimits.minAmount || amount > this.paymentLimits.maxAmount) {
        throw new Error('Payment amount outside allowed limits');
      }

      // Fetch invoice details
      const invoice = await this.apiService.get<Invoice>(
        `${this.baseUrl}/invoices/${invoiceId}`
      );

      // Validate against invoice amount
      if (Number(amount) > Number(invoice.amount)) {
        throw new Error('Payment amount exceeds invoice amount');
      }

      // Check invoice status
      if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.VOID) {
        throw new Error('Invoice is not eligible for payment');
      }

      return true;
    } catch (error) {
      console.error('Error validating payment amount:', error);
      throw error;
    }
  }

  /**
   * Generates a secure signature for payment requests
   * @param request Payment request data
   * @returns Cryptographic signature
   */
  private generatePaymentSignature(request: CreatePaymentRequest): string {
    const payload = `${request.invoiceId}:${request.amountPaid}:${request.paymentMethod}:${new Date().toISOString()}`;
    return HmacSHA256(payload, this.securityKey).toString();
  }

  /**
   * Generates a secure signature for invoice requests
   * @param filters Filter parameters
   * @returns Cryptographic signature
   */
  private generateRequestSignature(filters: InvoiceFilters): string {
    return SHA256(JSON.stringify(filters) + new Date().toISOString()).toString();
  }

  /**
   * Generates a unique transaction identifier
   * @returns Transaction ID string
   */
  private generateTransactionId(): string {
    return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Checks if payment method is currently available
   * @param method Payment method to validate
   * @returns Availability status
   */
  private isPaymentMethodAvailable(method: PaymentMethod): boolean {
    const availableMethods = [
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.WIRE_TRANSFER
    ];
    return availableMethods.includes(method);
  }
}