import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

import DocumentUpload from './DocumentUpload';
import { DocumentType } from '../../../types/document.types';
import { mockDocuments } from '../../../../tests/mocks/data';
import { documentService } from '../../../services/document.service';

// Extend expect with accessibility matchers
expect.extend(toHaveNoViolations);

// Mock document service methods
vi.mock('../../../services/document.service', () => ({
  documentService: {
    uploadDocument: vi.fn(),
    validateDocument: vi.fn()
  }
}));

// Test constants
const TEST_FILE_CONTENT = new File(['test content'], 'test.edifact', { type: 'text/plain' });
const MOCK_ALLOWED_TYPES = [DocumentType.IFTSTA, DocumentType.IFTMBC, DocumentType.COARRI];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_EDIFACT_CONTENT = `UNA:+.? 'UNB+UNOC:3+SENDER+RECEIVER+200428:1159+1234567890+++++EDIGAS`;

describe('DocumentUpload Component', () => {
  // Common props and setup
  const defaultProps = {
    onUploadComplete: vi.fn(),
    allowedTypes: MOCK_ALLOWED_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    className: 'test-upload'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Basic Rendering Tests
  describe('Rendering', () => {
    it('should render upload area with proper accessibility attributes', async () => {
      const { container } = render(<DocumentUpload {...defaultProps} />);
      
      // Check basic rendering
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
      
      // Verify accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should display file type restrictions', () => {
      render(<DocumentUpload {...defaultProps} />);
      const allowedTypesText = MOCK_ALLOWED_TYPES.join(', ').toLowerCase();
      expect(screen.getByText(new RegExp(allowedTypesText, 'i'))).toBeInTheDocument();
    });
  });

  // File Upload Tests
  describe('File Upload Functionality', () => {
    it('should handle single file upload correctly', async () => {
      documentService.uploadDocument.mockResolvedValueOnce({ documentId: '123', status: 'PROCESSING' });
      
      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, TEST_FILE_CONTENT);

      expect(documentService.uploadDocument).toHaveBeenCalledWith(
        TEST_FILE_CONTENT,
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should show progress during upload', async () => {
      documentService.uploadDocument.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, TEST_FILE_CONTENT);

      expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle upload errors gracefully', async () => {
      documentService.uploadDocument.mockRejectedValueOnce(new Error('Upload failed'));
      
      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, TEST_FILE_CONTENT);

      expect(await screen.findByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  // EDIFACT Validation Tests
  describe('EDIFACT Validation', () => {
    it('should validate EDIFACT message structure', async () => {
      const edifactFile = new File([VALID_EDIFACT_CONTENT], 'test.edifact', { type: 'text/plain' });
      documentService.validateDocument.mockResolvedValueOnce({ isValid: true, errors: [] });

      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, edifactFile);

      expect(documentService.validateDocument).toHaveBeenCalled();
    });

    it('should show validation errors for invalid EDIFACT', async () => {
      const invalidEdifact = new File(['invalid content'], 'test.edifact', { type: 'text/plain' });
      documentService.validateDocument.mockResolvedValueOnce({
        isValid: false,
        errors: [{ message: 'Invalid EDIFACT structure' }]
      });

      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, invalidEdifact);

      expect(await screen.findByText(/invalid edifact structure/i)).toBeInTheDocument();
    });
  });

  // Security Tests
  describe('Security Measures', () => {
    it('should enforce file size limits', async () => {
      const largeFile = new File(['x'.repeat(MAX_FILE_SIZE + 1)], 'large.edifact', { type: 'text/plain' });
      
      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, largeFile);

      expect(await screen.findByText(/file size exceeds/i)).toBeInTheDocument();
    });

    it('should validate file types', async () => {
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      
      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, invalidFile);

      expect(await screen.findByText(/file type not allowed/i)).toBeInTheDocument();
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      dropzone.focus();
      expect(document.activeElement).toBe(dropzone);
      
      fireEvent.keyDown(dropzone, { key: 'Enter' });
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should announce upload status', async () => {
      documentService.uploadDocument.mockResolvedValueOnce({ documentId: '123', status: 'PROCESSING' });
      
      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, TEST_FILE_CONTENT);

      expect(screen.getByRole('status')).toHaveTextContent(/uploading/i);
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should retry failed uploads', async () => {
      documentService.uploadDocument
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ documentId: '123', status: 'PROCESSING' });

      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, TEST_FILE_CONTENT);

      expect(documentService.uploadDocument).toHaveBeenCalledTimes(2);
    });

    it('should handle validation timeout', async () => {
      documentService.validateDocument.mockImplementationOnce(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Validation timeout')), 5000))
      );

      render(<DocumentUpload {...defaultProps} />);
      
      const dropzone = screen.getByRole('button');
      await userEvent.upload(dropzone, TEST_FILE_CONTENT);

      expect(await screen.findByText(/validation timeout/i)).toBeInTheDocument();
    });
  });
});