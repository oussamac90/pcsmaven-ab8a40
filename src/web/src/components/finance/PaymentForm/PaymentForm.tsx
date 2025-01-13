import React, { memo, useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Form, FormField } from '../../common/Form/Form';
import { financeService } from '../../../services/finance.service';
import { PaymentMethod, CreatePaymentRequest } from '../../../types/finance.types';
import { theme } from '../../../styles/theme.styles';

// Payment form props interface
interface PaymentFormProps {
  invoiceId: number;
  amount: number;
  currencyCode?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onValidationError?: (error: z.ZodError) => void;
}

// Enhanced validation schema for payment form
const PAYMENT_SCHEMA = z.object({
  invoiceId: z.number().int().positive('Invalid invoice ID'),
  amountPaid: z.number()
    .min(0.01, 'Payment amount must be greater than 0')
    .max(1000000, 'Payment amount exceeds maximum limit')
    .refine((amount) => !isNaN(amount), 'Invalid amount format'),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Please select a valid payment method' })
  }),
  currencyCode: z.string().length(3, 'Invalid currency code').optional()
});

// Validation messages
const VALIDATION_MESSAGES = {
  INVALID_AMOUNT: 'Payment amount must be greater than 0 and match invoice amount',
  INVALID_METHOD: 'Selected payment method is not currently available',
  SYSTEM_ERROR: 'Unable to process payment. Please try again',
  PROCESSING: 'Processing payment...',
  SUCCESS: 'Payment processed successfully',
};

/**
 * Enhanced payment form component with comprehensive validation and security features
 */
export const PaymentForm: React.FC<PaymentFormProps> = memo(({
  invoiceId,
  amount,
  currencyCode = 'USD',
  onSuccess,
  onError,
  onValidationError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize form with enhanced security validation
  const defaultValues: Partial<CreatePaymentRequest> = {
    invoiceId,
    amountPaid: amount.toString(),
    currencyCode,
    paymentMethod: PaymentMethod.BANK_TRANSFER
  };

  /**
   * Handles secure payment submission with comprehensive validation
   */
  const handleSubmit = useCallback(async (formData: CreatePaymentRequest) => {
    try {
      setIsProcessing(true);
      toast.info(VALIDATION_MESSAGES.PROCESSING);

      // Validate payment amount against invoice
      await financeService.validatePaymentAmount(formData.invoiceId, Number(formData.amountPaid));

      // Process payment with enhanced security
      const payment = await financeService.createPayment({
        ...formData,
        amountPaid: formData.amountPaid.toString()
      });

      // Handle successful payment
      toast.success(VALIDATION_MESSAGES.SUCCESS);
      onSuccess?.();

      return payment;
    } catch (error) {
      // Handle specific error types
      if (error instanceof z.ZodError) {
        onValidationError?.(error);
        toast.error(error.errors[0].message);
      } else {
        onError?.(error as Error);
        toast.error(VALIDATION_MESSAGES.SYSTEM_ERROR);
      }
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [invoiceId, onSuccess, onError, onValidationError]);

  return (
    <Form
      schema={PAYMENT_SCHEMA}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      securityLevel="CRITICAL"
      id="payment-form"
      aria-label="Payment form"
    >
      <FormField
        name="paymentMethod"
        label="Payment Method"
        type="select"
        required
        aria={{
          'aria-label': 'Select payment method',
          'aria-required': 'true'
        }}
        securityRules={{ sanitize: true }}
      >
        {Object.values(PaymentMethod).map((method) => (
          <option key={method} value={method}>
            {method.replace('_', ' ')}
          </option>
        ))}
      </FormField>

      <FormField
        name="amountPaid"
        label="Payment Amount"
        type="number"
        required
        aria={{
          'aria-label': 'Enter payment amount',
          'aria-required': 'true'
        }}
        securityRules={{
          sanitize: true,
          mask: true
        }}
      />

      <button
        type="submit"
        disabled={isProcessing}
        style={{
          backgroundColor: theme.colors.primary,
          color: theme.colors.background,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.sm,
          border: 'none',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          width: '100%',
          marginTop: theme.spacing.lg
        }}
        aria-busy={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Submit Payment'}
      </button>
    </Form>
  );
});

PaymentForm.displayName = 'PaymentForm';

export default PaymentForm;