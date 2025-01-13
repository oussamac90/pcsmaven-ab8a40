/**
 * @fileoverview Type definitions for financial operations in the Port Community System
 * @version 1.0.0
 * @security Critical - Contains financial data type definitions
 */

/**
 * Enum defining all possible invoice statuses in the system
 * Used for tracking the lifecycle of an invoice from creation to completion
 */
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  VOID = 'VOID'
}

/**
 * Enum defining all supported payment methods in the system
 * Represents the various ways a payment can be processed
 */
export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  WIRE_TRANSFER = 'WIRE_TRANSFER',
  LETTER_OF_CREDIT = 'LETTER_OF_CREDIT'
}

/**
 * Enum defining possible payment transaction statuses
 * Used to track the state of payment processing
 */
export enum PaymentStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

/**
 * Comprehensive interface defining the structure of an invoice
 * Includes audit fields for tracking changes and versioning
 */
export interface Invoice {
  /** Unique identifier for the invoice */
  id: number;
  
  /** Reference to the company being billed */
  companyId: number;
  
  /** Invoice amount in decimal format */
  amount: string;
  
  /** ISO 4217 currency code */
  currencyCode: string;
  
  /** ISO 8601 formatted due date */
  dueDate: string;
  
  /** Current status of the invoice */
  status: InvoiceStatus;
  
  /** Detailed description of the invoice */
  description: string;
  
  /** ISO 8601 formatted creation timestamp */
  createdAt: string;
  
  /** User ID of invoice creator */
  createdBy: number;
  
  /** ISO 8601 formatted last update timestamp */
  updatedAt: string;
  
  /** User ID of last modifier */
  updatedBy: number;
  
  /** Optimistic locking version number */
  version: number;
}

/**
 * Interface defining the structure of a payment
 * Includes transaction tracking and audit information
 */
export interface Payment {
  /** Unique identifier for the payment */
  id: number;
  
  /** Reference to the associated invoice */
  invoiceId: number;
  
  /** Payment amount in decimal format */
  amountPaid: string;
  
  /** ISO 4217 currency code */
  currencyCode: string;
  
  /** Method used for payment */
  paymentMethod: PaymentMethod;
  
  /** External payment processor transaction ID */
  transactionId: string;
  
  /** ISO 8601 formatted payment timestamp */
  paidAt: string;
  
  /** User ID of payment processor */
  createdBy: number;
  
  /** Current status of the payment */
  status: PaymentStatus;
}

/**
 * Interface for invoice creation request data
 * Contains all required fields for creating a new invoice
 */
export interface CreateInvoiceRequest {
  /** Company being billed */
  companyId: number;
  
  /** Invoice amount in decimal format */
  amount: string;
  
  /** ISO 4217 currency code */
  currencyCode: string;
  
  /** ISO 8601 formatted due date */
  dueDate: string;
  
  /** Detailed description of the invoice */
  description: string;
}

/**
 * Interface for payment creation request data
 * Contains all required fields for processing a new payment
 */
export interface CreatePaymentRequest {
  /** Reference to the invoice being paid */
  invoiceId: number;
  
  /** Payment amount in decimal format */
  amountPaid: string;
  
  /** ISO 4217 currency code */
  currencyCode: string;
  
  /** Selected payment method */
  paymentMethod: PaymentMethod;
}