/**
 * @fileoverview Comprehensive validation utilities for the Port Community System
 * Implements enhanced security and data integrity requirements
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.20.0
import { isEmail } from 'validator'; // v13.7.0
import { LoginCredentials } from '../types/auth.types';

// Constants for validation rules
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;
const MAX_LOGIN_ATTEMPTS = 5;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,64}$/;
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// Blacklisted disposable email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwawaymail.com',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org'
];

/**
 * Enhanced Zod schema for login form validation
 * Implements comprehensive security requirements
 */
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .refine((email) => !DISPOSABLE_EMAIL_DOMAINS.some(domain => email.toLowerCase().endsWith(domain)), {
      message: 'Disposable email addresses are not allowed'
    }),
  password: z.string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`)
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number and special character')
});

/**
 * Validates user login credentials with enhanced security checks
 * @param credentials - Login credentials to validate
 * @returns boolean indicating if credentials are valid
 */
export const validateLoginCredentials = (credentials: LoginCredentials): boolean => {
  try {
    // Sanitize inputs to prevent injection attacks
    const sanitizedEmail = credentials.email.trim().toLowerCase();
    const sanitizedPassword = credentials.password;

    // Validate email and password
    const isValidEmail = validateEmail(sanitizedEmail);
    const isValidPassword = validatePassword(sanitizedPassword);

    return isValidEmail && isValidPassword;
  } catch (error) {
    console.error('Login validation error:', error);
    return false;
  }
};

/**
 * Enhanced email validation with additional security checks
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid
 */
export const validateEmail = (email: string): boolean => {
  try {
    // Basic validation
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();

    // Check email format
    if (!isEmail(sanitizedEmail)) {
      return false;
    }

    // Check against disposable email domains
    const domain = sanitizedEmail.split('@')[1];
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      return false;
    }

    // Additional security checks
    if (sanitizedEmail.length > 254) { // RFC 5321
      return false;
    }

    if (!EMAIL_REGEX.test(sanitizedEmail)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email validation error:', error);
    return false;
  }
};

/**
 * Enhanced password validation with comprehensive security requirements
 * @param password - Password to validate
 * @returns boolean indicating if password meets security requirements
 */
export const validatePassword = (password: string): boolean => {
  try {
    // Basic validation
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Length requirements
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      return false;
    }

    // Regex pattern validation
    if (!PASSWORD_REGEX.test(password)) {
      return false;
    }

    // Check password entropy
    let entropy = 0;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[@$!%*#?&]/.test(password);

    entropy += hasUppercase ? 26 : 0;
    entropy += hasLowercase ? 26 : 0;
    entropy += hasNumbers ? 10 : 0;
    entropy += hasSpecialChars ? 32 : 0;

    // Minimum entropy requirement
    const minEntropy = 70;
    if (entropy < minEntropy) {
      return false;
    }

    // Check for common patterns
    const commonPatterns = [
      /^123/, /password/i, /qwerty/i, /admin/i,
      /letmein/i, /welcome/i, /monkey/i
    ];
    
    if (commonPatterns.some(pattern => pattern.test(password))) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Password validation error:', error);
    return false;
  }
};

/**
 * Validates input against potential XSS attacks
 * @param input - String to validate
 * @returns Sanitized string
 */
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validates rate limiting for login attempts
 * @param email - Email address to check
 * @returns boolean indicating if rate limit is exceeded
 */
const validateRateLimit = (email: string): boolean => {
  // Implementation would typically check against a rate limiting service
  // This is a placeholder returning true to indicate rate limit not exceeded
  return true;
};

// Export additional validation utilities
export const ValidationUtils = {
  sanitizeInput,
  validateRateLimit,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  MAX_LOGIN_ATTEMPTS
};