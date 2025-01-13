import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.8.0
import { useErrorBoundary } from 'react-error-boundary'; // v4.0.0
import * as yup from 'yup'; // v1.0.0

// Internal imports
import { LoginContainer, LoginForm, LoginLogo, LoginTitle } from './Login.styles';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import { validateLoginCredentials, ValidationUtils } from '../../utils/validation.utils';
import type { LoginCredentials } from '../../types/auth.types';

// Constants
const LOGO_PATH = '/assets/images/logo.svg';
const DASHBOARD_ROUTE = '/dashboard';
const MFA_CODE_LENGTH = 6;

// Validation schema
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email'),
  password: yup
    .string()
    .required('Password is required')
    .min(ValidationUtils.PASSWORD_MIN_LENGTH, `Password must be at least ${ValidationUtils.PASSWORD_MIN_LENGTH} characters`)
    .matches(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,64}$/,
      'Password must contain uppercase, lowercase, number and special character'
    )
});

/**
 * Login page component implementing secure authentication with MFA support
 * and maritime-themed design system
 */
const Login: React.FC = () => {
  // Hooks
  const navigate = useNavigate();
  const { showBoundary } = useErrorBoundary();
  const { login, verifyMfa, loading, error } = useAuth();

  // State management
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [mfaCode, setMfaCode] = useState<string>('');
  const [showMfa, setShowMfa] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [attemptCount, setAttemptCount] = useState<number>(0);

  // Reset error state when inputs change
  useEffect(() => {
    if (error) {
      setValidationErrors({});
    }
  }, [credentials, error]);

  /**
   * Handles form input changes with validation
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error when user types
    setValidationErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  }, []);

  /**
   * Validates form inputs before submission
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    try {
      await loginSchema.validate(credentials, { abortEarly: false });
      return true;
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const errors: Record<string, string> = {};
        err.inner.forEach(e => {
          if (e.path) {
            errors[e.path] = e.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  }, [credentials]);

  /**
   * Handles login form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limiting
    if (attemptCount >= ValidationUtils.MAX_LOGIN_ATTEMPTS) {
      setValidationErrors({
        form: 'Too many login attempts. Please try again later.'
      });
      return;
    }

    // Validate form
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      // Validate credentials format
      if (!validateLoginCredentials(credentials)) {
        throw new Error('Invalid credentials format');
      }

      const response = await login(credentials);
      
      if (response?.mfaRequired) {
        setShowMfa(true);
      } else {
        navigate(DASHBOARD_ROUTE);
      }
    } catch (err) {
      setAttemptCount(prev => prev + 1);
      showBoundary(err);
    }
  }, [credentials, attemptCount, validateForm, login, navigate, showBoundary]);

  /**
   * Handles MFA code verification
   */
  const handleMfaSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (mfaCode.length !== MFA_CODE_LENGTH) {
      setValidationErrors({
        mfaCode: `MFA code must be ${MFA_CODE_LENGTH} digits`
      });
      return;
    }

    try {
      await verifyMfa(mfaCode);
      navigate(DASHBOARD_ROUTE);
    } catch (err) {
      showBoundary(err);
    }
  }, [mfaCode, verifyMfa, navigate, showBoundary]);

  return (
    <LoginContainer>
      <LoginLogo src={LOGO_PATH} alt="Port Community System" />
      <LoginTitle>
        {showMfa ? 'Enter Authentication Code' : 'Welcome to Port Community System'}
      </LoginTitle>

      {!showMfa ? (
        <LoginForm onSubmit={handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            value={credentials.email}
            onChange={handleInputChange}
            error={validationErrors.email}
            disabled={loading}
            required
            autoComplete="email"
            data-testid="email-input"
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            value={credentials.password}
            onChange={handleInputChange}
            error={validationErrors.password}
            disabled={loading}
            required
            autoComplete="current-password"
            data-testid="password-input"
          />

          {validationErrors.form && (
            <div role="alert" className="error-message">
              {validationErrors.form}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="large"
            loading={loading}
            disabled={loading || attemptCount >= ValidationUtils.MAX_LOGIN_ATTEMPTS}
            fullWidth
            data-testid="login-button"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </LoginForm>
      ) : (
        <LoginForm onSubmit={handleMfaSubmit}>
          <Input
            id="mfaCode"
            name="mfaCode"
            type="text"
            label="Authentication Code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            error={validationErrors.mfaCode}
            disabled={loading}
            required
            maxLength={MFA_CODE_LENGTH}
            pattern="[0-9]*"
            inputMode="numeric"
            autoComplete="one-time-code"
            data-testid="mfa-input"
          />

          <Button
            type="submit"
            variant="primary"
            size="large"
            loading={loading}
            disabled={loading || mfaCode.length !== MFA_CODE_LENGTH}
            fullWidth
            data-testid="verify-mfa-button"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </LoginForm>
      )}
    </LoginContainer>
  );
};

export default Login;