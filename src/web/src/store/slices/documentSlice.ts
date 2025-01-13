// External imports with versions
import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5

// Internal imports
import { Document, DocumentType, DocumentStatus, ValidationSeverity } from '../../types/document.types';
import { DocumentService } from '../../services/document.service';

// Enhanced interfaces for document state management
interface DocumentState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  currentDocument: Document | null;
  validationResults: {
    results: Record<string, any> | null;
    severity: ValidationSeverity | null;
    timestamp: Date | null;
  };
  processingProgress: {
    status: DocumentStatus | null;
    percentage: number;
    message: string | null;
  };
  cache: {
    validations: Record<string, { result: any; timestamp: number }>;
    uploads: Record<string, { document: Document; timestamp: number }>;
  };
}

// Initial state with enhanced caching and progress tracking
const initialState: DocumentState = {
  documents: [],
  loading: false,
  error: null,
  currentDocument: null,
  validationResults: {
    results: null,
    severity: null,
    timestamp: null
  },
  processingProgress: {
    status: null,
    percentage: 0,
    message: null
  },
  cache: {
    validations: {},
    uploads: {}
  }
};

// Enhanced async thunks with optimistic updates and error handling
export const uploadDocument = createAsyncThunk(
  'document/upload',
  async ({ file, documentType, options }: {
    file: File;
    documentType: DocumentType;
    options?: { autoValidate?: boolean; priority?: string }
  }, { rejectWithValue }) => {
    try {
      const documentService = new DocumentService();
      const response = await documentService.uploadDocument(file, documentType, options);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const validateDocument = createAsyncThunk(
  'document/validate',
  async ({ documentId, options }: {
    documentId: string;
    options?: { validateStructure?: boolean; validateContent?: boolean }
  }, { rejectWithValue, getState }) => {
    try {
      const documentService = new DocumentService();
      const response = await documentService.validateDocument(documentId, options);
      return { documentId, result: response };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const getDocumentStatus = createAsyncThunk(
  'document/status',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const documentService = new DocumentService();
      const status = await documentService.watchDocumentStatus(documentId, {
        debounceMs: 1000,
        includeDetails: true
      });
      return { documentId, status };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Enhanced document slice with optimistic updates and caching
const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setCurrentDocument: (state, action: PayloadAction<Document>) => {
      state.currentDocument = action.payload;
    },
    clearValidationResults: (state) => {
      state.validationResults = initialState.validationResults;
    },
    updateProcessingProgress: (state, action: PayloadAction<{
      status: DocumentStatus;
      percentage: number;
      message: string;
    }>) => {
      state.processingProgress = action.payload;
    },
    clearCache: (state) => {
      state.cache = initialState.cache;
    }
  },
  extraReducers: (builder) => {
    // Upload document reducers
    builder.addCase(uploadDocument.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(uploadDocument.fulfilled, (state, action) => {
      state.loading = false;
      state.documents.push(action.payload);
      state.cache.uploads[action.payload.id] = {
        document: action.payload,
        timestamp: Date.now()
      };
    });
    builder.addCase(uploadDocument.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Validate document reducers
    builder.addCase(validateDocument.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(validateDocument.fulfilled, (state, action) => {
      state.loading = false;
      state.validationResults = {
        results: action.payload.result,
        severity: action.payload.result.severity,
        timestamp: new Date()
      };
      state.cache.validations[action.payload.documentId] = {
        result: action.payload.result,
        timestamp: Date.now()
      };
    });
    builder.addCase(validateDocument.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Document status reducers
    builder.addCase(getDocumentStatus.fulfilled, (state, action) => {
      const documentIndex = state.documents.findIndex(
        doc => doc.id === action.payload.documentId
      );
      if (documentIndex !== -1) {
        state.documents[documentIndex].status = action.payload.status;
      }
    });
  }
});

// Enhanced selectors with memoization
export const selectDocuments = createSelector(
  [(state: { document: DocumentState }) => state.document.documents],
  (documents) => documents
);

export const selectDocumentsByType = createSelector(
  [(state: { document: DocumentState }) => state.document.documents,
   (_: any, documentType: DocumentType) => documentType],
  (documents, documentType) => documents.filter(doc => doc.documentType === documentType)
);

export const selectDocumentValidation = createSelector(
  [(state: { document: DocumentState }) => state.document.validationResults],
  (validationResults) => validationResults
);

export const { setCurrentDocument, clearValidationResults, updateProcessingProgress, clearCache } = documentSlice.actions;

export default documentSlice.reducer;