/**
 * @fileoverview Redux slice for managing financial state in the Port Community System
 * @version 1.0.0
 * @security Critical - Contains financial data management
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { Invoice, Payment, InvoiceStatus, PaymentMethod } from '../../types/finance.types';
import { FinanceService } from '../../services/finance.service';

// State interfaces
interface FinanceState {
  invoices: Record<string, Invoice>;
  selectedInvoice: Invoice | null;
  payments: Record<string, Payment>;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status?: InvoiceStatus[];
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
  };
  transactionStatus: Record<string, {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    timestamp: string;
    error?: string;
  }>;
}

// Initial state
const initialState: FinanceState = {
  invoices: {},
  selectedInvoice: null,
  payments: {},
  loading: {
    fetchInvoices: false,
    fetchInvoiceById: false,
    createPayment: false
  },
  error: {
    fetchInvoices: null,
    fetchInvoiceById: null,
    createPayment: null
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  },
  filters: {},
  transactionStatus: {}
};

// Async thunks
export const fetchInvoices = createAsyncThunk(
  'finance/fetchInvoices',
  async (filters: FinanceState['filters'], { rejectWithValue }) => {
    try {
      const response = await FinanceService.getInvoices(filters, {
        page: 1,
        limit: 10
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchInvoiceById = createAsyncThunk(
  'finance/fetchInvoiceById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await FinanceService.getInvoiceById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createPayment = createAsyncThunk(
  'finance/createPayment',
  async (paymentData: {
    invoiceId: number;
    amountPaid: string;
    paymentMethod: PaymentMethod;
  }, { rejectWithValue, dispatch }) => {
    try {
      // Pre-validate payment
      await FinanceService.validatePayment(paymentData.invoiceId, Number(paymentData.amountPaid));
      
      const response = await FinanceService.createPayment({
        ...paymentData,
        currencyCode: 'USD' // Default currency, should be from configuration
      });
      
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice definition
const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<FinanceState['filters']>) => {
      state.filters = action.payload;
    },
    clearErrors: (state) => {
      Object.keys(state.error).forEach(key => {
        state.error[key] = null;
      });
    },
    resetTransactionStatus: (state, action: PayloadAction<string>) => {
      delete state.transactionStatus[action.payload];
    }
  },
  extraReducers: (builder) => {
    // fetchInvoices reducers
    builder.addCase(fetchInvoices.pending, (state) => {
      state.loading.fetchInvoices = true;
      state.error.fetchInvoices = null;
    });
    builder.addCase(fetchInvoices.fulfilled, (state, action) => {
      state.loading.fetchInvoices = false;
      state.invoices = action.payload.data.reduce((acc, invoice) => ({
        ...acc,
        [invoice.id]: invoice
      }), {});
      state.pagination = {
        page: action.payload.page,
        limit: action.payload.limit,
        total: action.payload.total,
        totalPages: action.payload.totalPages
      };
    });
    builder.addCase(fetchInvoices.rejected, (state, action) => {
      state.loading.fetchInvoices = false;
      state.error.fetchInvoices = action.payload as string;
    });

    // fetchInvoiceById reducers
    builder.addCase(fetchInvoiceById.pending, (state) => {
      state.loading.fetchInvoiceById = true;
      state.error.fetchInvoiceById = null;
    });
    builder.addCase(fetchInvoiceById.fulfilled, (state, action) => {
      state.loading.fetchInvoiceById = false;
      state.selectedInvoice = action.payload;
      state.invoices[action.payload.id] = action.payload;
    });
    builder.addCase(fetchInvoiceById.rejected, (state, action) => {
      state.loading.fetchInvoiceById = false;
      state.error.fetchInvoiceById = action.payload as string;
    });

    // createPayment reducers
    builder.addCase(createPayment.pending, (state, action) => {
      state.loading.createPayment = true;
      state.error.createPayment = null;
      state.transactionStatus[action.meta.requestId] = {
        status: 'processing',
        timestamp: new Date().toISOString()
      };
    });
    builder.addCase(createPayment.fulfilled, (state, action) => {
      state.loading.createPayment = false;
      state.payments[action.payload.id] = action.payload;
      state.transactionStatus[action.meta.requestId] = {
        status: 'completed',
        timestamp: new Date().toISOString()
      };
      
      // Update invoice status if payment completes it
      if (state.invoices[action.payload.invoiceId]) {
        state.invoices[action.payload.invoiceId].status = 
          Number(action.payload.amountPaid) >= Number(state.invoices[action.payload.invoiceId].amount)
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIALLY_PAID;
      }
    });
    builder.addCase(createPayment.rejected, (state, action) => {
      state.loading.createPayment = false;
      state.error.createPayment = action.payload as string;
      state.transactionStatus[action.meta.requestId] = {
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: action.payload as string
      };
    });
  }
});

// Selectors
export const selectInvoices = (state: { finance: FinanceState }) => 
  Object.values(state.finance.invoices);

export const selectInvoiceById = (id: number) => 
  createSelector(
    (state: { finance: FinanceState }) => state.finance.invoices,
    (invoices) => invoices[id]
  );

export const selectPayments = (state: { finance: FinanceState }) => 
  Object.values(state.finance.payments);

export const selectPaymentsByInvoiceId = (invoiceId: number) =>
  createSelector(
    (state: { finance: FinanceState }) => state.finance.payments,
    (payments) => Object.values(payments).filter(p => p.invoiceId === invoiceId)
  );

export const selectTransactionStatus = (transactionId: string) =>
  (state: { finance: FinanceState }) => 
    state.finance.transactionStatus[transactionId];

export const { setFilters, clearErrors, resetTransactionStatus } = financeSlice.actions;

export default financeSlice.reducer;