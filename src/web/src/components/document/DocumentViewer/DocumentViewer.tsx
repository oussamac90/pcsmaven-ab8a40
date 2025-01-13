import React, { useState, useEffect, useCallback } from 'react';
import { ViewerContainer, DocumentContent, ToolbarContainer } from './DocumentViewer.styles';
import documentService from '../../../services/document.service';
import type { Document, DocumentValidationResult, ValidationSeverity } from '../../../types/document.types';

// Enhanced interface for component props
interface DocumentViewerProps {
  documentId: string;
  onClose?: () => void;
  onValidated?: (result: DocumentValidationResult) => void;
  onError?: (error: Error) => void;
  onZoomChange?: (level: number) => void;
  initialZoom?: number;
  accessibility?: {
    ariaLabel?: string;
    keyboardShortcuts?: boolean;
    highContrast?: boolean;
  };
}

// Constants for zoom limits and steps
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.25;

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  onClose,
  onValidated,
  onError,
  onZoomChange,
  initialZoom = 1,
  accessibility = {}
}) => {
  // State management
  const [document, setDocument] = useState<Document | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<DocumentValidationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Load document on mount or documentId change
  useEffect(() => {
    const loadDocument = async () => {
      try {
        const response = await documentService.getDocumentById(documentId);
        setDocument(response);
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    };

    loadDocument();
  }, [documentId, onError]);

  // Enhanced zoom handler with smooth transitions
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoomLevel(prevZoom => {
      const newZoom = direction === 'in' 
        ? Math.min(prevZoom + ZOOM_STEP, ZOOM_MAX)
        : Math.max(prevZoom - ZOOM_STEP, ZOOM_MIN);
      
      onZoomChange?.(newZoom);
      return newZoom;
    });
  }, [onZoomChange]);

  // Enhanced document validation with progress tracking
  const handleValidate = useCallback(async () => {
    if (!document) return;

    setIsValidating(true);
    try {
      const result = await documentService.validateEdifactMessage(document.id);
      setValidationResult(result);
      onValidated?.(result);

      // Update validation status
      const status = await documentService.getValidationStatus(document.id);
      setDocument(prev => prev ? { ...prev, status } : null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setIsValidating(false);
    }
  }, [document, onValidated, onError]);

  // Enhanced document download with progress tracking
  const handleDownload = useCallback(async () => {
    if (!document) return;

    try {
      const blob = await documentService.downloadDocument(document.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${document.id}.${getFileExtension(document)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
    }
  }, [document, onError]);

  // Helper function to determine file extension
  const getFileExtension = (doc: Document): string => {
    switch (doc.metadata.format) {
      case 'EDIFACT': return 'edi';
      case 'XML': return 'xml';
      case 'JSON': return 'json';
      case 'PDF': return 'pdf';
      default: return 'txt';
    }
  };

  // Keyboard event handler for accessibility
  useEffect(() => {
    if (!accessibility.keyboardShortcuts) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case '+':
          handleZoom('in');
          break;
        case '-':
          handleZoom('out');
          break;
        case 'Escape':
          onClose?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [accessibility.keyboardShortcuts, handleZoom, onClose]);

  if (error) {
    return (
      <ViewerContainer role="alert" aria-live="assertive">
        <div className="error-state">
          <h3>Error Loading Document</h3>
          <p>{error.message}</p>
        </div>
      </ViewerContainer>
    );
  }

  return (
    <ViewerContainer
      role="region"
      aria-label={accessibility.ariaLabel || 'Document Viewer'}
      data-high-contrast={accessibility.highContrast}
    >
      <ToolbarContainer>
        <div className="control-group">
          <button
            onClick={() => handleZoom('in')}
            disabled={zoomLevel >= ZOOM_MAX}
            aria-label="Zoom in"
          >
            +
          </button>
          <span aria-live="polite">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => handleZoom('out')}
            disabled={zoomLevel <= ZOOM_MIN}
            aria-label="Zoom out"
          >
            -
          </button>
        </div>

        <div className="control-group">
          <button
            onClick={handleValidate}
            disabled={isValidating || !document}
            aria-busy={isValidating}
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!document}
            aria-label="Download document"
          >
            Download
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Close viewer"
          >
            ×
          </button>
        )}
      </ToolbarContainer>

      <DocumentContent
        style={{ transform: `scale(${zoomLevel})` }}
        className={document ? '' : 'loading'}
      >
        {document ? (
          <div className="document-content">
            <pre>{document.content}</pre>
            {validationResult && (
              <div className="validation-results" role="status" aria-live="polite">
                {validationResult.errors.map((error, index) => (
                  <div
                    key={index}
                    className={`validation-message ${error.severity.toLowerCase()}`}
                  >
                    {error.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="loading-indicator" role="status">
            Loading document...
          </div>
        )}
      </DocumentContent>
    </ViewerContainer>
  );
};

export default DocumentViewer;