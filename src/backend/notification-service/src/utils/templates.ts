/**
 * @fileoverview High-performance notification template generation utilities
 * Provides cached template generation for emails and notifications with i18n support
 * @version 1.0.0
 */

import { format } from 'date-fns'; // v2.30.0
import handlebars from 'handlebars'; // v4.7.8
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import { NotificationType, INotification } from '../models/notification.model';
import LRU from 'lru-cache'; // v7.14.1

// Template file paths by notification type
const EMAIL_TEMPLATES: Record<NotificationType, string> = {
    [NotificationType.VESSEL_UPDATE]: 'templates/email/vessel-update.hbs',
    [NotificationType.CARGO_STATUS]: 'templates/email/cargo-status.hbs',
    [NotificationType.DOCUMENT_PROCESSED]: 'templates/email/document-processed.hbs',
    [NotificationType.BERTH_ALLOCATED]: 'templates/email/berth-allocated.hbs'
};

const NOTIFICATION_TEMPLATES: Record<NotificationType, string> = {
    [NotificationType.VESSEL_UPDATE]: 'templates/notification/vessel-update.hbs',
    [NotificationType.CARGO_STATUS]: 'templates/notification/cargo-status.hbs',
    [NotificationType.DOCUMENT_PROCESSED]: 'templates/notification/document-processed.hbs',
    [NotificationType.BERTH_ALLOCATED]: 'templates/notification/berth-allocated.hbs'
};

// LRU cache configuration for template storage
const TEMPLATE_CACHE = new LRU({
    max: 500, // Maximum number of templates to cache
    ttl: 1000 * 60 * 60, // Cache for 1 hour
    updateAgeOnGet: true
});

// HTML sanitization options
const SANITIZE_OPTIONS = {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'div', 'span', 'a', 'ul', 'li'],
    allowedAttributes: {
        'a': ['href', 'target'],
        'div': ['class'],
        'span': ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto']
};

// Register Handlebars helpers
handlebars.registerHelper('formatDate', function(date: Date, dateFormat: string) {
    return format(date, dateFormat);
});

handlebars.registerHelper('sanitize', function(text: string) {
    return sanitizeHtml(text, SANITIZE_OPTIONS);
});

/**
 * Performance monitoring decorator
 */
function performanceMonitor(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
        const start = performance.now();
        try {
            const result = await originalMethod.apply(this, args);
            const duration = performance.now() - start;
            if (duration > 2000) { // Log if exceeds 2 second SLA
                console.warn(`Template generation exceeded SLA: ${duration}ms`);
            }
            return result;
        } catch (error) {
            console.error(`Template generation failed: ${error}`);
            throw error;
        }
    };
    return descriptor;
}

/**
 * Error boundary decorator
 */
function errorBoundary(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
        try {
            return await originalMethod.apply(this, args);
        } catch (error) {
            console.error(`Template error: ${error}`);
            throw new Error(`Failed to generate template: ${error.message}`);
        }
    };
    return descriptor;
}

/**
 * Generates a cached HTML email template with internationalization support
 * @param notification Notification object containing type and data
 * @param locale Locale string for i18n
 * @returns Sanitized HTML email template string
 */
@performanceMonitor
@errorBoundary
export async function generateEmailTemplate(
    notification: INotification,
    locale: string = 'en'
): Promise<string> {
    const cacheKey = `email:${notification.type}:${locale}`;
    let template = TEMPLATE_CACHE.get(cacheKey) as HandlebarsTemplateDelegate;

    if (!template) {
        const templatePath = EMAIL_TEMPLATES[notification.type];
        if (!templatePath) {
            throw new Error(`No email template found for type: ${notification.type}`);
        }

        // Load and compile template
        const templateSource = await import(templatePath);
        template = handlebars.compile(templateSource.default);
        TEMPLATE_CACHE.set(cacheKey, template);
    }

    // Prepare template data with sanitization
    const templateData = {
        ...notification,
        metadata: {
            ...notification.metadata,
            timestamp: notification.metadata.timestamp ? 
                format(notification.metadata.timestamp, 'PPpp', { locale }) : undefined
        }
    };

    // Render and sanitize template
    const renderedTemplate = template(templateData);
    return sanitizeHtml(renderedTemplate, SANITIZE_OPTIONS);
}

/**
 * Generates an optimized in-app notification template with caching
 * @param notification Notification object containing type and data
 * @param locale Locale string for i18n
 * @returns Formatted notification message
 */
@performanceMonitor
@errorBoundary
export async function generateNotificationTemplate(
    notification: INotification,
    locale: string = 'en'
): Promise<string> {
    const cacheKey = `notification:${notification.type}:${locale}`;
    let template = TEMPLATE_CACHE.get(cacheKey) as HandlebarsTemplateDelegate;

    if (!template) {
        const templatePath = NOTIFICATION_TEMPLATES[notification.type];
        if (!templatePath) {
            throw new Error(`No notification template found for type: ${notification.type}`);
        }

        // Load and compile template
        const templateSource = await import(templatePath);
        template = handlebars.compile(templateSource.default);
        TEMPLATE_CACHE.set(cacheKey, template);
    }

    // Prepare template data
    const templateData = {
        ...notification,
        metadata: {
            ...notification.metadata,
            timestamp: notification.metadata.timestamp ? 
                format(notification.metadata.timestamp, 'PPpp', { locale }) : undefined
        }
    };

    // Render template
    return template(templateData);
}

/**
 * Clears the template cache
 * Useful for development and testing
 */
export function clearTemplateCache(): void {
    TEMPLATE_CACHE.clear();
}

/**
 * Gets the current template cache size
 * Useful for monitoring
 */
export function getTemplateCacheSize(): number {
    return TEMPLATE_CACHE.size;
}