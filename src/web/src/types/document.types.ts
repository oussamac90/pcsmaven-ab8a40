/**
 * Core document interface representing all document types in the Port Community System
 * Includes support for EDIFACT messages, cargo manifests, and customs declarations
 */
export interface Document {
    id: string;
    documentType: DocumentType;
    title: string;
    content: string;
    status: DocumentStatus;
    createdAt: Date;
    updatedAt: Date;
    submittedBy: string;
    metadata: DocumentMetadata;
    validationResult: DocumentValidationResult;
}

/**
 * Document metadata interface containing tracking and processing information
 */
export interface DocumentMetadata {
    version: string;
    format: DocumentFormat;
    sender: string;
    receiver: string;
    references: DocumentReference[];
}

/**
 * Reference information for linking related documents
 */
export interface DocumentReference {
    type: string;
    id: string;
    description?: string;
}

/**
 * Enumeration of supported document types including EDIFACT messages
 */
export enum DocumentType {
    IFTSTA = 'IFTSTA',           // Status message
    IFTMBC = 'IFTMBC',          // Booking confirmation
    COARRI = 'COARRI',          // Container discharge/loading report
    CARGO_MANIFEST = 'CARGO_MANIFEST',
    CUSTOMS_DECLARATION = 'CUSTOMS_DECLARATION',
    DANGEROUS_GOODS = 'DANGEROUS_GOODS'
}

/**
 * Supported document format types
 */
export enum DocumentFormat {
    EDIFACT = 'EDIFACT',
    XML = 'XML',
    JSON = 'JSON',
    PDF = 'PDF'
}

/**
 * Document processing status states
 */
export enum DocumentStatus {
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    PROCESSING = 'PROCESSING',
    VALIDATED = 'VALIDATED',
    REJECTED = 'REJECTED',
    ARCHIVED = 'ARCHIVED'
}

/**
 * Comprehensive validation result interface
 */
export interface DocumentValidationResult {
    isValid: boolean;
    errors: DocumentValidationError[];
    warnings: DocumentValidationWarning[];
    validatedAt: Date;
    validatedBy: string;
}

/**
 * Detailed validation error information
 */
export interface DocumentValidationError {
    code: string;
    message: string;
    location: string;
    severity: ValidationSeverity;
    context: Record<string, unknown>;
}

/**
 * Warning messages from document validation
 */
export interface DocumentValidationWarning {
    code: string;
    message: string;
    location: string;
    context: Record<string, unknown>;
}

/**
 * Validation message severity levels
 */
export enum ValidationSeverity {
    ERROR = 'ERROR',
    WARNING = 'WARNING',
    INFO = 'INFO'
}

/**
 * EDIFACT message segment structure
 */
export interface EdifactSegment {
    tag: string;
    elements: string[];
    subElements?: string[];
}

/**
 * EDIFACT message validation rules
 */
export interface EdifactValidationRule {
    segmentTag: string;
    mandatory: boolean;
    format?: string;
    validValues?: string[];
    dependencies?: string[];
}

/**
 * Document processing configuration
 */
export interface DocumentProcessingConfig {
    validationRules: EdifactValidationRule[];
    autoValidate: boolean;
    notifyOnCompletion: boolean;
    archiveAfterDays?: number;
}