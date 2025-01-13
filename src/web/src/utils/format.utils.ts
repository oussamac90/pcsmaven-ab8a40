import { formatDateTime } from './date.utils';
import format from 'currency.js'; // v2.0.4
import formatNumber from 'numeral'; // v2.0.6
import { ValidationError } from 'validation-error'; // v1.0.0

// Global constants
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'] as const;
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_DECIMAL_PLACES = 2;
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

// Validation patterns
const VESSEL_ID_PATTERNS = {
  IMO: /^IMO\d{7}$/,
  MMSI: /^\d{9}$/
};
const CARGO_REFERENCE_PATTERN = /^[A-Z]{2}\d{6}[A-Z]\d{2}$/;

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥'
};

/**
 * Formats a number as a currency string with proper symbol and formatting
 * @param amount Numeric amount to format
 * @param currencyCode ISO currency code (defaults to DEFAULT_CURRENCY)
 * @param decimalPlaces Number of decimal places (defaults to DEFAULT_DECIMAL_PLACES)
 * @returns Formatted currency string
 * @throws ValidationError if amount is invalid or currency not supported
 */
export function formatCurrency(
  amount: number,
  currencyCode: typeof SUPPORTED_CURRENCIES[number] = DEFAULT_CURRENCY,
  decimalPlaces: number = DEFAULT_DECIMAL_PLACES
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new ValidationError('Invalid amount provided for currency formatting');
  }

  if (!SUPPORTED_CURRENCIES.includes(currencyCode)) {
    throw new ValidationError(`Unsupported currency code: ${currencyCode}`);
  }

  try {
    const symbol = CURRENCY_SYMBOLS[currencyCode];
    const formatted = format(amount, {
      symbol,
      precision: decimalPlaces,
      pattern: '! #',
      negativePattern: '-! #'
    });

    return formatted.format();
  } catch (error) {
    throw new ValidationError(`Currency formatting failed: ${error.message}`);
  }
}

/**
 * Formats vessel identification numbers according to maritime standards
 * @param id Vessel identifier (IMO or MMSI number)
 * @param type Type of identifier ('IMO' or 'MMSI')
 * @returns Formatted vessel identifier
 * @throws ValidationError if identifier format is invalid
 */
export function formatVesselId(
  id: string,
  type: 'IMO' | 'MMSI'
): string {
  if (!id) {
    throw new ValidationError('Vessel identifier is required');
  }

  const pattern = VESSEL_ID_PATTERNS[type];
  if (!pattern.test(id)) {
    throw new ValidationError(`Invalid ${type} number format`);
  }

  if (type === 'IMO') {
    // Validate IMO checksum
    const digits = id.slice(3).split('').map(Number);
    const checksum = digits.slice(0, 6).reduce((sum, digit, index) => 
      sum + digit * (7 - index), 0) % 10;
    
    if (checksum !== digits[6]) {
      throw new ValidationError('Invalid IMO number checksum');
    }
    
    return `IMO ${digits.slice(0, 3).join('')}-${digits.slice(3).join('')}`;
  }

  // Format MMSI with proper grouping
  const mmsiDigits = id.split('');
  return `MMSI ${mmsiDigits.slice(0, 3).join('')}-${mmsiDigits.slice(3, 6).join('')}-${mmsiDigits.slice(6).join('')}`;
}

/**
 * Formats cargo reference numbers with validation and proper formatting
 * @param reference Cargo reference number
 * @returns Formatted cargo reference
 * @throws ValidationError if reference format is invalid
 */
export function formatCargoReference(reference: string): string {
  if (!reference) {
    throw new ValidationError('Cargo reference is required');
  }

  if (!CARGO_REFERENCE_PATTERN.test(reference)) {
    throw new ValidationError('Invalid cargo reference format');
  }

  // Extract parts and format
  const prefix = reference.slice(0, 2);
  const number = reference.slice(2, 8);
  const type = reference.slice(8, 9);
  const checksum = reference.slice(9);

  // Validate checksum (simple implementation - can be enhanced based on specific requirements)
  const calculatedChecksum = number.split('')
    .reduce((sum, digit) => sum + parseInt(digit), 0) % 100;
  
  if (calculatedChecksum !== parseInt(checksum)) {
    throw new ValidationError('Invalid cargo reference checksum');
  }

  return `${prefix}-${number}-${type}${checksum}`;
}

/**
 * Formats file sizes in human-readable format
 * @param bytes File size in bytes
 * @returns Human-readable file size with appropriate unit
 * @throws ValidationError if bytes is invalid
 */
export function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
    throw new ValidationError('Invalid file size value');
  }

  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  const unit = FILE_SIZE_UNITS[i];

  return `${formatNumber(size).format('0.[00]')} ${unit}`;
}