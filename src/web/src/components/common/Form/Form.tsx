import React, { useEffect, useCallback } from 'react';
import { useForm, FormProvider, FieldValues } from 'react-hook-form'; // v7.43.0
import { zodResolver } from '@hookform/resolvers/zod'; // v3.0.0
import DOMPurify from 'dompurify'; // v3.0.0
import { useTranslation } from 'react-i18next'; // v12.0.0
import { z } from 'zod'; // v3.0.0

import { FormContainer, FormGroup } from './Form.styles';
import Input from '../Input/Input';
import { validateLoginCredentials } from '../../../utils/validation.utils';

// Security level enum for form data classification
export enum SecurityLevel {
  CRITICAL = 'CRITICAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  INTERNAL = 'INTERNAL',
  PUBLIC = 'PUBLIC'
}

// Direction type for RTL support
export type Direction = 'ltr' | 'rtl';

// Form component props interface
interface FormProps<T extends FieldValues> {
  children?: React.ReactNode;
  schema: z.ZodSchema;
  onSubmit: (data: T) => void | Promise<void>;
  defaultValues?: Partial<T>;
  securityLevel?: SecurityLevel;
  csrfToken?: string;
  direction?: Direction;
  locale?: string;
  className?: string;
  id?: string;
}

// Form field props interface
interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  securityRules?: {
    sanitize?: boolean;
    encrypt?: boolean;
    mask?: boolean;
  };
  aria?: React.AriaAttributes;
  direction?: Direction;
}

/**
 * Enhanced form component with comprehensive security, accessibility, and i18n support
 */
export const Form = <T extends FieldValues>({
  children,
  schema,
  onSubmit,
  defaultValues,
  securityLevel = SecurityLevel.INTERNAL,
  csrfToken,
  direction = 'ltr',
  locale,
  className,
  id
}: FormProps<T>): JSX.Element => {
  const { t } = useTranslation();
  
  // Initialize form with enhanced security validation
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur'
  });

  // Security audit logging
  useEffect(() => {
    if (securityLevel === SecurityLevel.CRITICAL || securityLevel === SecurityLevel.CONFIDENTIAL) {
      console.info(`Form initialized with ${securityLevel} security level`);
    }
  }, [securityLevel]);

  // Secure form submission handler
  const handleSubmit = useCallback(async (data: T) => {
    try {
      // Sanitize form data
      const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: typeof value === 'string' ? DOMPurify.sanitize(value) : value
      }), {} as T);

      // Add CSRF token if provided
      const secureData = csrfToken 
        ? { ...sanitizedData, _csrf: csrfToken }
        : sanitizedData;

      // Validate credentials if login form
      if ('email' in data && 'password' in data) {
        const isValid = validateLoginCredentials(data as any);
        if (!isValid) {
          throw new Error(t('form.error.invalidCredentials'));
        }
      }

      await onSubmit(secureData);
    } catch (error) {
      console.error('Form submission error:', error);
      methods.setError('root', {
        type: 'submit',
        message: t('form.error.submission')
      });
    }
  }, [onSubmit, csrfToken, t, methods]);

  return (
    <FormProvider {...methods}>
      <FormContainer
        onSubmit={methods.handleSubmit(handleSubmit)}
        className={className}
        id={id}
        dir={direction}
        lang={locale}
        data-security-level={securityLevel}
        role="form"
        aria-label={t('form.aria.label')}
      >
        {children}
      </FormContainer>
    </FormProvider>
  );
};

/**
 * Enhanced form field component with security and accessibility features
 */
export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  required = false,
  securityRules = {},
  aria = {},
  direction = 'ltr'
}) => {
  const { t } = useTranslation();
  const { register, formState: { errors } } = useForm();

  // Generate unique ID for accessibility
  const id = `field-${name}`;

  return (
    <FormGroup data-testid={`form-group-${name}`}>
      <Input
        {...register(name)}
        id={id}
        name={name}
        type={type}
        label={t(label)}
        required={required}
        error={errors[name]?.message as string}
        dir={direction}
        aria-required={required}
        aria-invalid={!!errors[name]}
        data-security-rules={JSON.stringify(securityRules)}
        {...aria}
      />
    </FormGroup>
  );
};

export default Form;