// External imports with versions
import { Observable, Subject, BehaviorSubject } from 'rxjs'; // v7.8.0
import { debounceTime, filter, map, takeUntil } from 'rxjs/operators'; // v7.8.0

// Internal imports
import { ApiService } from './api.service';
import { endpoints } from '../config/api.config';
import {
  Document,
  DocumentType,
  DocumentStatus,
  DocumentValidationResult,
  ValidationSeverity,
  DocumentValidationError,
  EdifactValidationRule,
  DocumentProcessingConfig
} from '../types/document.types';

// Enhanced interfaces for document service
interface DocumentUploadResponse {
  documentId: string;
  status: DocumentStatus;
  validationResult?: DocumentValidationResult;
}

interface DocumentStatusUpdate {
  documentId: string;
  status: DocumentStatus;
  timestamp: Date;
  details?: Record<string, unknown>;
}

interface ValidationOptions {
  validateStructure?: boolean;
  validateContent?: boolean;
  rules?: EdifactValidationRule[];
}

interface UploadOptions {
  autoValidate?: boolean;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  notifyOnCompletion?: boolean;
}

interface WatchOptions {
  debounceMs?: number;
  includeDetails?: boolean;
}

export class DocumentService {
  private readonly apiService: ApiService;
  private readonly documentStatusSubject: Subject<DocumentStatusUpdate>;
  private readonly validationCache: Map<string, DocumentValidationResult>;
  private readonly processingConfig: DocumentProcessingConfig;
  private readonly destroySubject = new Subject<void>();

  constructor(apiService: ApiService) {
    this.apiService = apiService;
    this.documentStatusSubject = new BehaviorSubject<DocumentStatusUpdate>({
      documentId: '',
      status: DocumentStatus.DRAFT,
      timestamp: new Date()
    });
    this.validationCache = new Map();
    this.processingConfig = {
      validationRules: [],
      autoValidate: true,
      notifyOnCompletion: true,
      archiveAfterDays: 30
    };

    this.initializeValidationRules();
  }

  /**
   * Uploads a new document with enhanced validation and real-time status tracking
   */
  public async uploadDocument(
    file: File,
    documentType: DocumentType,
    options: UploadOptions = {}
  ): Promise<DocumentUploadResponse> {
    try {
      // Validate file before upload
      this.validateFileRequirements(file, documentType);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('options', JSON.stringify(options));

      const response = await this.apiService.post<DocumentUploadResponse>(
        endpoints.document.upload,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Initialize status tracking
      this.documentStatusSubject.next({
        documentId: response.documentId,
        status: response.status,
        timestamp: new Date()
      });

      // Trigger validation if auto-validate is enabled
      if (options.autoValidate !== false) {
        this.validateDocument(response.documentId);
      }

      return response;
    } catch (error) {
      console.error('Document upload failed:', error);
      throw this.handleDocumentError(error);
    }
  }

  /**
   * Validates a document with enhanced error reporting and caching
   */
  public async validateDocument(
    documentId: string,
    options: ValidationOptions = {}
  ): Promise<DocumentValidationResult> {
    try {
      // Check cache first
      const cachedResult = this.validationCache.get(documentId);
      if (cachedResult && !options.validateContent) {
        return cachedResult;
      }

      const response = await this.apiService.post<DocumentValidationResult>(
        endpoints.document.validate.replace(':id', documentId),
        options
      );

      // Update cache and emit status
      this.validationCache.set(documentId, response);
      this.emitValidationStatus(documentId, response);

      return response;
    } catch (error) {
      console.error('Document validation failed:', error);
      throw this.handleDocumentError(error);
    }
  }

  /**
   * Provides real-time document status updates with debouncing
   */
  public watchDocumentStatus(
    documentId: string,
    options: WatchOptions = {}
  ): Observable<DocumentStatus> {
    return this.documentStatusSubject.pipe(
      filter(update => update.documentId === documentId),
      debounceTime(options.debounceMs || 1000),
      map(update => ({
        status: update.status,
        ...(options.includeDetails ? { details: update.details } : {})
      })),
      takeUntil(this.destroySubject)
    );
  }

  /**
   * Downloads a document with progress tracking
   */
  public async downloadDocument(documentId: string): Promise<Blob> {
    try {
      const response = await this.apiService.get<Blob>(
        endpoints.document.download.replace(':id', documentId),
        {
          responseType: 'blob'
        }
      );
      return response;
    } catch (error) {
      console.error('Document download failed:', error);
      throw this.handleDocumentError(error);
    }
  }

  /**
   * Deletes a document and cleans up associated resources
   */
  public async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.apiService.delete(
        endpoints.document.base.replace(':id', documentId)
      );
      this.validationCache.delete(documentId);
      this.emitDocumentDeleted(documentId);
    } catch (error) {
      console.error('Document deletion failed:', error);
      throw this.handleDocumentError(error);
    }
  }

  private validateFileRequirements(file: File, documentType: DocumentType): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds maximum limit of 10MB');
    }

    const allowedTypes = this.getAllowedFileTypes(documentType);
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  private getAllowedFileTypes(documentType: DocumentType): string[] {
    switch (documentType) {
      case DocumentType.IFTSTA:
      case DocumentType.IFTMBC:
      case DocumentType.COARRI:
        return ['text/plain', 'application/edifact'];
      case DocumentType.CARGO_MANIFEST:
        return ['application/pdf', 'application/json', 'text/xml'];
      default:
        return ['application/pdf', 'application/json'];
    }
  }

  private initializeValidationRules(): void {
    // Initialize EDIFACT validation rules based on message types
    this.processingConfig.validationRules = [
      {
        segmentTag: 'UNH',
        mandatory: true,
        format: '^UNH\\+[^\\+]*\\+IFTSTA',
        dependencies: ['BGM', 'DTM']
      },
      // Add more validation rules as needed
    ];
  }

  private emitValidationStatus(
    documentId: string,
    result: DocumentValidationResult
  ): void {
    this.documentStatusSubject.next({
      documentId,
      status: result.isValid ? DocumentStatus.VALIDATED : DocumentStatus.REJECTED,
      timestamp: new Date(),
      details: { validationResult: result }
    });
  }

  private emitDocumentDeleted(documentId: string): void {
    this.documentStatusSubject.next({
      documentId,
      status: DocumentStatus.ARCHIVED,
      timestamp: new Date()
    });
  }

  private handleDocumentError(error: any): Error {
    // Enhanced error handling with specific error types
    if (error.response?.status === 413) {
      return new Error('Document size exceeds server limits');
    }
    if (error.response?.status === 415) {
      return new Error('Unsupported document format');
    }
    return new Error(error.message || 'An error occurred while processing the document');
  }

  public destroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
  }
}