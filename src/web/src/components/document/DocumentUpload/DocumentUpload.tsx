import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone'; // v14.2.3
import { toast } from 'react-toastify'; // v9.1.1
import { SecurityService } from '@security/core'; // v2.1.0

import { Form, FormField } from '../../common/Form/Form';
import documentService from '../../../services/document.service';
import { DocumentType, DocumentStatus, ValidationSeverity } from '../../../types/document.types';
import { theme } from '../../../styles/theme.styles';

// Constants for file upload configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPES = ['.txt', '.edifact', '.edi', '.pdf', '.xml', '.json'];
const UPLOAD_CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_RETRY_ATTEMPTS = 3;
const SECURITY_SCAN_TIMEOUT = 30000;
const PROGRESS_UPDATE_INTERVAL = 100;

// Props interface with enhanced security and accessibility features
interface DocumentUploadProps {
  className?: string;
  onUploadComplete?: (document: Document) => void;
  allowedTypes?: DocumentType[];
  enableSecurity?: boolean;
  onProgressUpdate?: (progress: number) => void;
  locale?: string;
}

// Upload state interface for tracking progress
interface UploadState {
  progress: number;
  isUploading: boolean;
  currentFile: string | null;
  uploadSpeed: number;
  timeRemaining: number;
}

/**
 * Enhanced document upload component with security, accessibility, and EDIFACT validation
 */
const DocumentUpload: React.FC<DocumentUploadProps> = React.memo(({
  className,
  onUploadComplete,
  allowedTypes = Object.values(DocumentType),
  enableSecurity = true,
  onProgressUpdate,
  locale = 'en'
}) => {
  // State management
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    isUploading: false,
    currentFile: null,
    uploadSpeed: 0,
    timeRemaining: 0
  });

  const uploadStartTime = useRef<number>(0);
  const uploadedSize = useRef<number>(0);
  const retryCount = useRef<number>(0);

  // Security service initialization
  const securityService = useRef(new SecurityService({
    scanTimeout: SECURITY_SCAN_TIMEOUT,
    allowedFileTypes: ACCEPTED_FILE_TYPES,
    maxFileSize: MAX_FILE_SIZE
  }));

  // Progress tracking interval
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    if (uploadState.isUploading) {
      progressInterval = setInterval(() => {
        const elapsedTime = Date.now() - uploadStartTime.current;
        const uploadSpeed = uploadedSize.current / (elapsedTime / 1000);
        const remainingSize = MAX_FILE_SIZE - uploadedSize.current;
        const timeRemaining = remainingSize / uploadSpeed;

        setUploadState(prev => ({
          ...prev,
          uploadSpeed,
          timeRemaining
        }));
      }, PROGRESS_UPDATE_INTERVAL);
    }

    return () => clearInterval(progressInterval);
  }, [uploadState.isUploading]);

  // File drop handler with security validation
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        currentFile: file.name
      }));

      // Security scan
      if (enableSecurity) {
        const scanResult = await securityService.current.scanFile(file);
        if (!scanResult.isValid) {
          throw new Error(`Security scan failed: ${scanResult.reason}`);
        }
      }

      // Start upload tracking
      uploadStartTime.current = Date.now();
      uploadedSize.current = 0;
      retryCount.current = 0;

      // Upload with progress tracking
      const response = await documentService.uploadDocument(file, DocumentType.IFTSTA, {
        onUploadProgress: (progressEvent: ProgressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadState(prev => ({ ...prev, progress }));
          onProgressUpdate?.(progress);
          uploadedSize.current = progressEvent.loaded;
        }
      });

      // Validate EDIFACT message if applicable
      if (file.name.endsWith('.edifact') || file.name.endsWith('.edi')) {
        const validationResult = await documentService.validateDocument(response.documentId);
        if (validationResult.errors.some(error => error.severity === ValidationSeverity.ERROR)) {
          throw new Error('EDIFACT validation failed');
        }
      }

      onUploadComplete?.(response);
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      if (retryCount.current < MAX_RETRY_ATTEMPTS) {
        retryCount.current++;
        toast.warning('Retrying upload...');
        onDrop([file]);
      } else {
        toast.error('Upload failed after multiple attempts');
      }
    } finally {
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        currentFile: null,
        progress: 0
      }));
    }
  }, [enableSecurity, onUploadComplete, onProgressUpdate]);

  // Dropzone configuration with accessibility
  const { getRootProps, getInputProps, isDragActive, isFocused } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES.join(','),
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    noClick: uploadState.isUploading,
    noKeyboard: uploadState.isUploading,
    aria: {
      role: 'button',
      label: 'Upload document dropzone'
    }
  });

  return (
    <div
      className={className}
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? theme.colors.primary : theme.colors.border}`,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        backgroundColor: isDragActive ? theme.colors.surface : theme.colors.background,
        transition: theme.transitions.normal
      }}
    >
      <input {...getInputProps()} />
      <div role="status" aria-live="polite">
        {uploadState.isUploading ? (
          <>
            <p>Uploading {uploadState.currentFile}</p>
            <progress 
              value={uploadState.progress} 
              max="100"
              aria-label="Upload progress"
            />
            <p>
              Speed: {Math.round(uploadState.uploadSpeed / 1024)} KB/s
              Time remaining: {Math.round(uploadState.timeRemaining)}s
            </p>
          </>
        ) : (
          <p>
            {isDragActive
              ? 'Drop the document here'
              : 'Drag and drop a document, or click to select'}
          </p>
        )}
      </div>
    </div>
  );
});

DocumentUpload.displayName = 'DocumentUpload';

export default DocumentUpload;