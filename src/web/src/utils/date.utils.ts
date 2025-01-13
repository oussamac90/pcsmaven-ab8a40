import { 
  format, 
  parse, 
  isValid, 
  differenceInHours, 
  differenceInDays,
  addDays,
  subDays
} from 'date-fns'; // v2.30.0

import {
  zonedTimeToUtc,
  utcToZonedTime
} from 'date-fns-tz'; // v2.0.0

// Global constants for date formatting
export const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
export const DEFAULT_TIME_FORMAT = 'HH:mm:ss';
export const DEFAULT_DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DEFAULT_TIMEZONE = 'UTC';

// Types for function parameters
interface DateConstraints {
  minDate?: Date;
  maxDate?: Date;
  businessDaysOnly?: boolean;
}

type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks';

/**
 * Formats a date/time value into a localized string with timezone support
 * @param date Date object or string to format
 * @param formatPattern Pattern to use for formatting (defaults to DEFAULT_DATETIME_FORMAT)
 * @param timezone Target timezone (defaults to DEFAULT_TIMEZONE)
 * @param locale Locale string for formatting (defaults to 'en-US')
 * @returns Formatted date string in specified timezone and locale
 * @throws Error if date is invalid
 */
export function formatDateTime(
  date: Date | string,
  formatPattern: string = DEFAULT_DATETIME_FORMAT,
  timezone: string = DEFAULT_TIMEZONE,
  locale: string = 'en-US'
): string {
  if (!date) {
    throw new Error('Date parameter is required');
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }

    const zonedDate = utcToZonedTime(dateObj, timezone);
    return format(zonedDate, formatPattern, { locale });
  } catch (error) {
    throw new Error(`Error formatting date: ${error.message}`);
  }
}

/**
 * Parses a date string into a Date object with timezone support
 * @param dateStr Date string to parse
 * @param timezone Source timezone of the date string
 * @param format Expected format of the date string
 * @param strict Whether to use strict parsing
 * @returns Parsed Date object in UTC
 * @throws Error if parsing fails
 */
export function parseDateTime(
  dateStr: string,
  timezone: string = DEFAULT_TIMEZONE,
  format: string = DEFAULT_DATETIME_FORMAT,
  strict: boolean = true
): Date {
  if (!dateStr) {
    throw new Error('Date string is required');
  }

  try {
    let parsedDate: Date;
    
    if (strict) {
      parsedDate = parse(dateStr, format, new Date());
    } else {
      parsedDate = new Date(dateStr);
    }

    if (!isValid(parsedDate)) {
      throw new Error('Invalid date format');
    }

    return zonedTimeToUtc(parsedDate, timezone);
  } catch (error) {
    throw new Error(`Error parsing date: ${error.message}`);
  }
}

/**
 * Validates a date value against specified constraints
 * @param date Date to validate
 * @param format Expected format if date is a string
 * @param constraints Optional validation constraints
 * @returns Boolean indicating if date is valid and meets constraints
 */
export function isValidDate(
  date: Date | string,
  format: string = DEFAULT_DATETIME_FORMAT,
  constraints: DateConstraints = {}
): boolean {
  try {
    const dateObj = typeof date === 'string' ? 
      parseDateTime(date, DEFAULT_TIMEZONE, format) : 
      date;

    if (!isValid(dateObj)) {
      return false;
    }

    const { minDate, maxDate, businessDaysOnly } = constraints;

    if (minDate && dateObj < minDate) {
      return false;
    }

    if (maxDate && dateObj > maxDate) {
      return false;
    }

    if (businessDaysOnly) {
      const day = dateObj.getDay();
      if (day === 0 || day === 6) { // Weekend check
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Calculates the difference between two dates in specified units
 * @param date1 First date for comparison
 * @param date2 Second date for comparison
 * @param unit Unit for the difference calculation
 * @param businessDays Whether to count only business days
 * @returns Numeric difference in specified units
 */
export function getDateDifference(
  date1: Date | string,
  date2: Date | string,
  unit: TimeUnit = 'days',
  businessDays: boolean = false
): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  if (!isValid(d1) || !isValid(d2)) {
    throw new Error('Invalid date provided for difference calculation');
  }

  switch (unit) {
    case 'hours':
      return differenceInHours(d2, d1);
    case 'days':
      if (businessDays) {
        let days = 0;
        let currentDate = new Date(d1);
        
        while (currentDate < d2) {
          const day = currentDate.getDay();
          if (day !== 0 && day !== 6) {
            days++;
          }
          currentDate = addDays(currentDate, 1);
        }
        return days;
      }
      return differenceInDays(d2, d1);
    case 'weeks':
      return differenceInDays(d2, d1) / 7;
    case 'minutes':
      return differenceInHours(d2, d1) * 60;
    default:
      throw new Error('Unsupported time unit');
  }
}

/**
 * Adds a specified time duration to a date
 * @param date Base date for calculation
 * @param amount Amount of time to add
 * @param unit Unit of time to add
 * @param businessDays Whether to count only business days
 * @returns New date with added duration
 */
export function addTimeToDate(
  date: Date | string,
  amount: number,
  unit: TimeUnit = 'days',
  businessDays: boolean = false
): Date {
  const baseDate = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(baseDate)) {
    throw new Error('Invalid base date provided');
  }

  if (amount < 0) {
    throw new Error('Amount must be positive');
  }

  if (businessDays && unit === 'days') {
    let remainingDays = amount;
    let currentDate = new Date(baseDate);
    
    while (remainingDays > 0) {
      currentDate = addDays(currentDate, 1);
      const day = currentDate.getDay();
      if (day !== 0 && day !== 6) {
        remainingDays--;
      }
    }
    return currentDate;
  }

  switch (unit) {
    case 'minutes':
      return new Date(baseDate.getTime() + amount * 60000);
    case 'hours':
      return new Date(baseDate.getTime() + amount * 3600000);
    case 'days':
      return addDays(baseDate, amount);
    case 'weeks':
      return addDays(baseDate, amount * 7);
    default:
      throw new Error('Unsupported time unit');
  }
}