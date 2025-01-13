import React, { forwardRef, useState, useCallback, useEffect } from 'react';
import { InputContainer, StyledInput, InputLabel, ErrorText } from './Input.styles';
import { validateEmail } from '../../../utils/validation.utils';
import debounce from 'lodash/debounce'; // v4.17.21

/**
 * Interface defining comprehensive props for the Input component
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  name: string;
  label?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  isLoading?: boolean;
  dir?: 'ltr' | 'rtl';
  lang?: string;
  showCharCount?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  validate?: (value: string) => string | undefined;
}

/**
 * A reusable form input component that implements the maritime-themed design system
 * with comprehensive validation, accessibility, and internationalization support.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  id,
  name,
  label,
  type = 'text',
  value,
  placeholder,
  disabled = false,
  required = false,
  error,
  pattern,
  maxLength,
  minLength,
  isLoading = false,
  dir = 'ltr',
  lang,
  showCharCount = false,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  validate,
  ...props
}, ref) => {
  // State management
  const [localValue, setLocalValue] = useState(value || '');
  const [localError, setLocalError] = useState(error);
  const [charCount, setCharCount] = useState(0);
  const [isTouched, setIsTouched] = useState(false);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value || '');
    setCharCount(value?.length || 0);
  }, [value]);

  // Update error state when prop changes
  useEffect(() => {
    setLocalError(error);
  }, [error]);

  /**
   * Validates input value based on type and custom validation rules
   */
  const validateInput = useCallback((inputValue: string): string | undefined => {
    if (!inputValue && required) {
      return 'This field is required';
    }

    if (minLength && inputValue.length < minLength) {
      return `Minimum length is ${minLength} characters`;
    }

    if (maxLength && inputValue.length > maxLength) {
      return `Maximum length is ${maxLength} characters`;
    }

    if (pattern && !new RegExp(pattern).test(inputValue)) {
      return 'Invalid format';
    }

    if (type === 'email' && inputValue && !validateEmail(inputValue)) {
      return 'Invalid email address';
    }

    return validate?.(inputValue);
  }, [required, minLength, maxLength, pattern, type, validate]);

  /**
   * Debounced validation to prevent excessive validation calls
   */
  const debouncedValidation = useCallback(
    debounce((value: string) => {
      const validationError = validateInput(value);
      setLocalError(validationError);
    }, 300),
    [validateInput]
  );

  /**
   * Handles input value changes with validation
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
    setCharCount(newValue.length);
    
    if (isTouched) {
      debouncedValidation(newValue);
    }

    onChange?.(event);
  }, [onChange, debouncedValidation, isTouched]);

  /**
   * Handles input blur events with validation
   */
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsTouched(true);
    const validationError = validateInput(event.target.value);
    setLocalError(validationError);
    onBlur?.(event);
  }, [onBlur, validateInput]);

  /**
   * Handles input focus events
   */
  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
  }, [onFocus]);

  /**
   * Generates ARIA attributes for accessibility
   */
  const ariaAttributes = {
    'aria-invalid': !!localError,
    'aria-required': required,
    'aria-disabled': disabled,
    'aria-describedby': localError ? `${id}-error` : undefined,
  };

  return (
    <InputContainer>
      {label && (
        <InputLabel htmlFor={id}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </InputLabel>
      )}
      
      <StyledInput
        ref={ref}
        id={id}
        name={name}
        type={type}
        value={localValue}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        required={required}
        maxLength={maxLength}
        minLength={minLength}
        pattern={pattern}
        dir={dir}
        lang={lang}
        hasError={!!localError}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={onKeyDown}
        {...ariaAttributes}
        {...props}
      />

      {showCharCount && maxLength && (
        <span className="char-count" aria-live="polite">
          {charCount}/{maxLength}
        </span>
      )}

      {localError && (
        <ErrorText id={`${id}-error`} role="alert">
          {localError}
        </ErrorText>
      )}
    </InputContainer>
  );
});

Input.displayName = 'Input';

export default Input;