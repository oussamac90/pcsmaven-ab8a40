/**
 * @fileoverview Notification model definitions for the Port Community System
 * Defines core data structures for real-time notifications across vessel operations,
 * cargo tracking, document processing, and berth allocations.
 * @version 1.0.0
 */

import { Document } from 'mongodb'; // v5.0.0

/**
 * Enumeration of all supported notification types in the system
 */
export enum NotificationType {
    VESSEL_UPDATE = 'VESSEL_UPDATE',
    CARGO_STATUS = 'CARGO_STATUS',
    DOCUMENT_PROCESSED = 'DOCUMENT_PROCESSED',
    BERTH_ALLOCATED = 'BERTH_ALLOCATED',
    SYSTEM_ALERT = 'SYSTEM_ALERT',
    MAINTENANCE_NOTICE = 'MAINTENANCE_NOTICE'
}

/**
 * Enumeration of notification priority levels for processing
 */
export enum NotificationPriority {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

/**
 * Enumeration of notification delivery statuses
 */
export enum NotificationStatus {
    PENDING = 'PENDING',
    DELIVERED = 'DELIVERED',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED'
}

/**
 * Interface defining structured metadata for different notification types
 */
export interface INotificationMetadata {
    vesselId?: string;
    cargoId?: string;
    documentId?: string;
    berthId?: string;
    status?: string;
    location?: string;
    timestamp?: Date;
    severity?: string;
    systemComponent?: string;
    maintenanceSchedule?: Date;
    estimatedDuration?: number;
}

/**
 * Core notification interface extending MongoDB Document
 * Defines the complete structure of a notification with tracking capabilities
 */
export interface INotification extends Document {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    recipients: string[];
    status: NotificationStatus;
    metadata: INotificationMetadata;
    retryCount: number;
    expiresAt: Date;
    acknowledgmentRequired: boolean;
    acknowledgmentStatus: Record<string, Date>;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Default system configuration values for notifications
 */
export const DEFAULT_NOTIFICATION_PRIORITY = NotificationPriority.MEDIUM;
export const DEFAULT_NOTIFICATION_STATUS = NotificationStatus.PENDING;
export const MAX_RETRY_COUNT = 3;
export const NOTIFICATION_EXPIRY_HOURS = 24;
export const NOTIFICATION_BATCH_SIZE = 100;

/**
 * Type guard to check if a notification type requires acknowledgment
 * @param type NotificationType to check
 * @returns boolean indicating if acknowledgment is required
 */
export const requiresAcknowledgment = (type: NotificationType): boolean => {
    return [
        NotificationType.SYSTEM_ALERT,
        NotificationType.MAINTENANCE_NOTICE
    ].includes(type);
};

/**
 * Type guard to validate notification metadata based on type
 * @param type NotificationType to validate against
 * @param metadata Metadata object to validate
 * @returns boolean indicating if metadata is valid for the type
 */
export const isValidMetadata = (
    type: NotificationType,
    metadata: INotificationMetadata
): boolean => {
    switch (type) {
        case NotificationType.VESSEL_UPDATE:
            return !!metadata.vesselId;
        case NotificationType.CARGO_STATUS:
            return !!metadata.cargoId;
        case NotificationType.DOCUMENT_PROCESSED:
            return !!metadata.documentId;
        case NotificationType.BERTH_ALLOCATED:
            return !!metadata.berthId;
        case NotificationType.SYSTEM_ALERT:
            return !!metadata.severity && !!metadata.systemComponent;
        case NotificationType.MAINTENANCE_NOTICE:
            return !!metadata.maintenanceSchedule && !!metadata.estimatedDuration;
        default:
            return false;
    }
};

/**
 * Helper function to calculate notification expiry date
 * @param hours Number of hours until expiry
 * @returns Date object representing expiry time
 */
export const calculateExpiryDate = (hours: number = NOTIFICATION_EXPIRY_HOURS): Date => {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + hours);
    return expiryDate;
};

/**
 * Factory function to create a new notification object with defaults
 * @param params Partial notification object
 * @returns Complete INotification object with defaults applied
 */
export const createNotification = (params: Partial<INotification>): INotification => {
    const now = new Date();
    return {
        priority: DEFAULT_NOTIFICATION_PRIORITY,
        status: DEFAULT_NOTIFICATION_STATUS,
        retryCount: 0,
        expiresAt: calculateExpiryDate(),
        acknowledgmentRequired: requiresAcknowledgment(params.type!),
        acknowledgmentStatus: {},
        createdAt: now,
        updatedAt: now,
        ...params
    } as INotification;
};