import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DocumentCenter from './DocumentCenter';
import documentService from '../../services/document.service';
import { Document, DocumentType, DocumentStatus } from '../../types/document.types';

// Mock document service
vi.mock('../../services/document.service', () => ({
  default: {
    getDocuments: vi.fn(),
    getDocumentStatus: vi.fn(),
    uploadDocument: vi.fn(),
    viewDocument: vi.fn()
  }
}));

// Mock test data
const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    title: 'Vessel Status Report',
    documentType: DocumentType.IFTSTA,
    status: DocumentStatus.PROCESSING,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    submittedBy: 'John Doe',
    content: '',
    metadata: {
      version: '1.0',
      format: 'EDIFACT',
      sender: 'MAERSK',
      receiver: 'PORT',
      references: []
    },
    validationResult: {
      isValid: true,
      errors: [],
      warnings: [],
      validatedAt: new Date(),
      validatedBy: 'system'
    }
  },
  {
    id: 'doc-2',
    title: 'Container Discharge Report',
    documentType: DocumentType.COARRI,
    status: DocumentStatus.COMPLETED,
    createdAt: new Date('2023-01-02T00:00:00Z'),
    updatedAt: new Date('2023-01-02T00:00:00Z'),
    submittedBy: 'Jane Smith',
    content: '',
    metadata: {
      version: '1.0',
      format: 'EDIFACT',
      sender: 'TERMINAL',
      receiver: 'PORT',
      references: []
    },
    validationResult: {
      isValid: true,
      errors: [],
      warnings: [],
      validatedAt: new Date(),
      validatedBy: 'system'
    }
  }
];

describe('DocumentCenter', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.resetAllMocks();
    
    // Setup default mock responses
    vi.mocked(documentService.getDocuments).mockResolvedValue({
      documents: mockDocuments,
      total: mockDocuments.length
    });
    
    vi.mocked(documentService.getDocumentStatus).mockResolvedValue(DocumentStatus.COMPLETED);
  });

  it('renders document list correctly', async () => {
    render(<DocumentCenter />);

    // Verify loading state
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    // Wait for documents to load
    await waitFor(() => {
      expect(screen.getByText('Vessel Status Report')).toBeInTheDocument();
    });

    // Verify document list elements
    expect(screen.getByText('Container Discharge Report')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();

    // Verify document type filters
    const filterSection = screen.getByRole('region', { name: /filters/i });
    expect(within(filterSection).getByText('IFTSTA')).toBeInTheDocument();
    expect(within(filterSection).getByText('COARRI')).toBeInTheDocument();
  });

  it('handles document filtering', async () => {
    render(<DocumentCenter />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Vessel Status Report')).toBeInTheDocument();
    });

    // Mock filtered response
    vi.mocked(documentService.getDocuments).mockResolvedValueOnce({
      documents: [mockDocuments[0]],
      total: 1
    });

    // Select IFTSTA filter
    const iftstaFilter = screen.getByRole('checkbox', { name: /IFTSTA/i });
    await user.click(iftstaFilter);

    // Verify filtered results
    await waitFor(() => {
      expect(screen.getByText('Vessel Status Report')).toBeInTheDocument();
      expect(screen.queryByText('Container Discharge Report')).not.toBeInTheDocument();
    });
  });

  it('handles document upload', async () => {
    render(<DocumentCenter />);

    const file = new File(['test content'], 'test.edi', { type: 'application/edifact' });
    const uploadResponse = { ...mockDocuments[0], id: 'new-doc' };

    vi.mocked(documentService.uploadDocument).mockResolvedValueOnce(uploadResponse);

    // Trigger file upload
    const fileInput = screen.getByLabelText(/upload document/i);
    await user.upload(fileInput, file);

    // Verify upload progress
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Verify upload completion
    await waitFor(() => {
      expect(documentService.uploadDocument).toHaveBeenCalledWith(
        file,
        DocumentType.IFTSTA,
        expect.any(Object)
      );
    });

    // Verify success notification
    expect(screen.getByText(/uploaded successfully/i)).toBeInTheDocument();
  });

  it('displays document viewer', async () => {
    render(<DocumentCenter />);

    await waitFor(() => {
      expect(screen.getByText('Vessel Status Report')).toBeInTheDocument();
    });

    // Click on document
    const documentRow = screen.getByText('Vessel Status Report').closest('tr');
    await user.click(documentRow!);

    // Verify viewer opens
    expect(screen.getByRole('region', { name: /document viewer/i })).toBeInTheDocument();

    // Verify document content
    await waitFor(() => {
      expect(screen.getByText(/EDIFACT/i)).toBeInTheDocument();
    });
  });

  it('tracks document status', async () => {
    render(<DocumentCenter />);

    // Setup status updates
    const statusUpdates = [
      DocumentStatus.PROCESSING,
      DocumentStatus.VALIDATED,
      DocumentStatus.COMPLETED
    ];

    let updateCount = 0;
    vi.mocked(documentService.getDocumentStatus).mockImplementation(async () => {
      return statusUpdates[updateCount++];
    });

    await waitFor(() => {
      expect(screen.getByText('Vessel Status Report')).toBeInTheDocument();
    });

    // Verify status updates
    await waitFor(() => {
      expect(screen.getByText(DocumentStatus.PROCESSING)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(DocumentStatus.VALIDATED)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(DocumentStatus.COMPLETED)).toBeInTheDocument();
    });
  });

  it('handles responsive behavior', async () => {
    // Mock window resize
    const originalInnerWidth = window.innerWidth;
    
    // Test mobile layout
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    
    render(<DocumentCenter />);
    
    await waitFor(() => {
      expect(screen.getByText('Vessel Status Report')).toBeInTheDocument();
    });
    
    // Verify mobile-specific elements
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    
    // Test desktop layout
    window.innerWidth = 1200;
    window.dispatchEvent(new Event('resize'));
    
    // Verify desktop-specific elements
    expect(screen.getByRole('complementary', { name: /filters/i })).toBeInTheDocument();
    
    // Cleanup
    window.innerWidth = originalInnerWidth;
    window.dispatchEvent(new Event('resize'));
  });
});