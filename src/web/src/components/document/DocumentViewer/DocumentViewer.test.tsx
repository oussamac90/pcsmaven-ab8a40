import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import DocumentViewer from './DocumentViewer';
import documentService from '../../../services/document.service';
import { DocumentType, DocumentStatus, ValidationSeverity } from '../../../types/document.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock document service
vi.mock('../../../services/document.service', () => ({
  default: {
    getDocumentById: vi.fn(),
    validateEdifactMessage: vi.fn(),
    downloadDocument: vi.fn(),
    getValidationStatus: vi.fn()
  }
}));

// Test data
const mockDocument = {
  id: 'doc-1',
  documentType: DocumentType.IFTSTA,
  title: 'Test Document',
  content: "UNH+1+IFTSTA:D:01B:UN:EAN003'",
  status: DocumentStatus.SUBMITTED,
  createdAt: new Date(),
  updatedAt: new Date(),
  submittedBy: 'test-user',
  metadata: {
    version: '1.0',
    format: 'EDIFACT',
    sender: 'SENDER',
    receiver: 'RECEIVER',
    references: []
  },
  validationResult: null
};

const mockValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
  validatedAt: new Date(),
  validatedBy: 'system'
};

const mockValidationError = {
  isValid: false,
  errors: [{
    code: 'ERR_001',
    message: 'Invalid segment structure',
    location: 'UNH',
    severity: ValidationSeverity.ERROR,
    context: {}
  }],
  warnings: [],
  validatedAt: new Date(),
  validatedBy: 'system'
};

describe('DocumentViewer', () => {
  const onClose = vi.fn();
  const onValidated = vi.fn();
  const onError = vi.fn();
  const onZoomChange = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock implementations
    documentService.getDocumentById.mockResolvedValue(mockDocument);
    documentService.validateEdifactMessage.mockResolvedValue(mockValidationResult);
    documentService.downloadDocument.mockResolvedValue(new Blob(['test content']));
    documentService.getValidationStatus.mockResolvedValue(DocumentStatus.VALIDATED);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Document Rendering', () => {
    it('should show loading state initially', () => {
      render(
        <DocumentViewer
          documentId="doc-1"
          onClose={onClose}
          onValidated={onValidated}
          onError={onError}
        />
      );

      expect(screen.getByRole('status')).toHaveTextContent('Loading document...');
    });

    it('should render document content when loaded', async () => {
      render(
        <DocumentViewer
          documentId="doc-1"
          onClose={onClose}
          onValidated={onValidated}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(mockDocument.content)).toBeInTheDocument();
      });
    });

    it('should handle document loading error', async () => {
      const error = new Error('Failed to load document');
      documentService.getDocumentById.mockRejectedValue(error);

      render(
        <DocumentViewer
          documentId="doc-1"
          onClose={onClose}
          onValidated={onValidated}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Error Loading Document');
        expect(onError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('Zoom Operations', () => {
    it('should handle zoom in correctly', async () => {
      render(
        <DocumentViewer
          documentId="doc-1"
          onZoomChange={onZoomChange}
          initialZoom={1}
        />
      );

      await waitFor(() => {
        const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
        fireEvent.click(zoomInButton);
      });

      expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it('should handle zoom out correctly', async () => {
      render(
        <DocumentViewer
          documentId="doc-1"
          onZoomChange={onZoomChange}
          initialZoom={1}
        />
      );

      await waitFor(() => {
        const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
        fireEvent.click(zoomOutButton);
      });

      expect(onZoomChange).toHaveBeenCalledWith(0.75);
    });

    it('should respect zoom limits', async () => {
      render(
        <DocumentViewer
          documentId="doc-1"
          onZoomChange={onZoomChange}
          initialZoom={4.0}
        />
      );

      await waitFor(() => {
        const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
        expect(zoomInButton).toBeDisabled();
      });
    });
  });

  describe('EDIFACT Validation', () => {
    it('should validate EDIFACT document successfully', async () => {
      render(
        <DocumentViewer
          documentId="doc-1"
          onValidated={onValidated}
        />
      );

      await waitFor(() => {
        const validateButton = screen.getByRole('button', { name: /validate/i });
        fireEvent.click(validateButton);
      });

      await waitFor(() => {
        expect(documentService.validateEdifactMessage).toHaveBeenCalledWith(mockDocument.id);
        expect(onValidated).toHaveBeenCalledWith(mockValidationResult);
      });
    });

    it('should display validation errors', async () => {
      documentService.validateEdifactMessage.mockResolvedValue(mockValidationError);

      render(
        <DocumentViewer
          documentId="doc-1"
          onValidated={onValidated}
        />
      );

      await waitFor(() => {
        const validateButton = screen.getByRole('button', { name: /validate/i });
        fireEvent.click(validateButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid segment structure')).toBeInTheDocument();
      });
    });
  });

  describe('Document Download', () => {
    it('should handle document download', async () => {
      render(
        <DocumentViewer
          documentId="doc-1"
        />
      );

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /download/i });
        fireEvent.click(downloadButton);
      });

      expect(documentService.downloadDocument).toHaveBeenCalledWith(mockDocument.id);
    });

    it('should handle download errors', async () => {
      const error = new Error('Download failed');
      documentService.downloadDocument.mockRejectedValue(error);

      render(
        <DocumentViewer
          documentId="doc-1"
          onError={onError}
        />
      );

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /download/i });
        fireEvent.click(downloadButton);
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <DocumentViewer
          documentId="doc-1"
          accessibility={{
            ariaLabel: 'Document Viewer',
            keyboardShortcuts: true,
            highContrast: true
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(mockDocument.content)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(
        <DocumentViewer
          documentId="doc-1"
          accessibility={{ keyboardShortcuts: true }}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        fireEvent.keyDown(window, { key: '+' });
        expect(onZoomChange).toHaveBeenCalled();

        fireEvent.keyDown(window, { key: '-' });
        expect(onZoomChange).toHaveBeenCalled();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
      });
    });
  });
});