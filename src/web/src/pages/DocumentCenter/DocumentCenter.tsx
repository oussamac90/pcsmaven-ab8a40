import React, { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@mui/x-data-grid'; // v6.0.0
import DocumentUpload from '../../components/document/DocumentUpload/DocumentUpload';
import DocumentViewer from '../../components/document/DocumentViewer/DocumentViewer';
import documentService from '../../services/document.service';
import { Document, DocumentType, DocumentStatus } from '../../types/document.types';
import { theme } from '../../styles/theme.styles';

// Document center state interface
interface DocumentCenterState {
  documents: Document[];
  selectedDocument: Document | null;
  isUploading: boolean;
  uploadProgress: number;
  filters: DocumentFilters;
  processingStatus: Record<string, DocumentStatus>;
  error: Error | null;
  isLoading: boolean;
  pagination: PaginationState;
}

// Document filtering interface
interface DocumentFilters {
  documentType: DocumentType[];
  dateRange: DateRange;
  status: DocumentStatus[];
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// Table column configuration
const DOCUMENT_COLUMNS = [
  { field: 'id', headerName: 'Document ID', width: 150 },
  { 
    field: 'documentType', 
    headerName: 'Type', 
    width: 150,
    renderCell: (params: any) => (
      <span style={{ color: theme.colors.primary }}>
        {params.value}
      </span>
    )
  },
  { 
    field: 'status', 
    headerName: 'Status', 
    width: 130,
    renderCell: (params: any) => (
      <div style={{
        padding: '4px 8px',
        borderRadius: theme.borderRadius.sm,
        backgroundColor: getStatusColor(params.value),
        color: theme.colors.background
      }}>
        {params.value}
      </div>
    )
  },
  { 
    field: 'createdAt', 
    headerName: 'Date', 
    width: 180,
    valueFormatter: (params: any) => 
      new Date(params.value).toLocaleString()
  },
  {
    field: 'submittedBy',
    headerName: 'Submitted By',
    width: 200
  }
];

const DocumentCenter: React.FC = () => {
  // Initialize state
  const [state, setState] = useState<DocumentCenterState>({
    documents: [],
    selectedDocument: null,
    isUploading: false,
    uploadProgress: 0,
    filters: {
      documentType: [],
      dateRange: { start: null, end: null },
      status: [],
      searchTerm: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    },
    processingStatus: {},
    error: null,
    isLoading: true,
    pagination: {
      page: 0,
      pageSize: 10,
      total: 0
    }
  });

  // Load documents on mount and when filters change
  useEffect(() => {
    loadDocuments(state.filters, state.pagination);
  }, [state.filters, state.pagination.page, state.pagination.pageSize]);

  // Set up document status polling
  useEffect(() => {
    const pollingInterval = setInterval(() => {
      updateDocumentStatuses();
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [state.documents]);

  // Load documents with filtering and pagination
  const loadDocuments = async (filters: DocumentFilters, pagination: PaginationState) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await documentService.getDocuments({
        ...filters,
        skip: pagination.page * pagination.pageSize,
        take: pagination.pageSize
      });

      setState(prev => ({
        ...prev,
        documents: response.documents,
        pagination: {
          ...prev.pagination,
          total: response.total
        },
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false
      }));
    }
  };

  // Update document processing statuses
  const updateDocumentStatuses = async () => {
    const processingDocs = state.documents.filter(
      doc => doc.status === DocumentStatus.PROCESSING
    );

    if (processingDocs.length === 0) return;

    try {
      const statuses = await Promise.all(
        processingDocs.map(doc => 
          documentService.getDocumentStatus(doc.id)
        )
      );

      setState(prev => ({
        ...prev,
        processingStatus: {
          ...prev.processingStatus,
          ...Object.fromEntries(
            processingDocs.map((doc, i) => [doc.id, statuses[i]])
          )
        }
      }));
    } catch (error) {
      console.error('Failed to update document statuses:', error);
    }
  };

  // Handle document selection
  const handleDocumentSelect = useCallback((documentId: string) => {
    const selectedDoc = state.documents.find(doc => doc.id === documentId);
    if (selectedDoc) {
      setState(prev => ({ ...prev, selectedDocument: selectedDoc }));
    }
  }, [state.documents]);

  // Handle document upload
  const handleUploadComplete = useCallback((document: Document) => {
    setState(prev => ({
      ...prev,
      documents: [document, ...prev.documents],
      isUploading: false,
      uploadProgress: 0
    }));
  }, []);

  // Handle upload progress
  const handleUploadProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      uploadProgress: progress
    }));
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<DocumentFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, page: 0 }
    }));
  }, []);

  // Get status color based on document status
  const getStatusColor = (status: DocumentStatus): string => {
    switch (status) {
      case DocumentStatus.VALIDATED:
        return theme.colors.success;
      case DocumentStatus.REJECTED:
        return theme.colors.error;
      case DocumentStatus.PROCESSING:
        return theme.colors.warning;
      default:
        return theme.colors.secondary;
    }
  };

  return (
    <div className="document-center" style={{ padding: theme.spacing.lg }}>
      <h1 style={{ 
        color: theme.colors.text,
        marginBottom: theme.spacing.lg 
      }}>
        Document Center
      </h1>

      {/* Document Upload Section */}
      <DocumentUpload
        onUploadComplete={handleUploadComplete}
        onProgress={handleUploadProgress}
        allowedTypes={Object.values(DocumentType)}
        maxFileSize={10 * 1024 * 1024} // 10MB
      />

      {/* Filters Section */}
      <div style={{ 
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        display: 'flex',
        gap: theme.spacing.md 
      }}>
        {/* Filter components would go here */}
      </div>

      {/* Documents Table */}
      <DataTable
        rows={state.documents}
        columns={DOCUMENT_COLUMNS}
        loading={state.isLoading}
        pagination
        paginationMode="server"
        rowCount={state.pagination.total}
        page={state.pagination.page}
        pageSize={state.pagination.pageSize}
        onPageChange={(page) => 
          setState(prev => ({
            ...prev,
            pagination: { ...prev.pagination, page }
          }))
        }
        onPageSizeChange={(pageSize) =>
          setState(prev => ({
            ...prev,
            pagination: { ...prev.pagination, pageSize }
          }))
        }
        onRowClick={(params) => handleDocumentSelect(params.id as string)}
        style={{ height: 'calc(100vh - 300px)' }}
      />

      {/* Document Viewer */}
      {state.selectedDocument && (
        <DocumentViewer
          documentId={state.selectedDocument.id}
          onClose={() => setState(prev => ({ ...prev, selectedDocument: null }))}
          onValidated={(result) => {
            // Handle validation result
          }}
        />
      )}

      {/* Error Display */}
      {state.error && (
        <div role="alert" style={{
          color: theme.colors.error,
          padding: theme.spacing.md,
          marginTop: theme.spacing.md
        }}>
          {state.error.message}
        </div>
      )}
    </div>
  );
};

export default DocumentCenter;