import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useI18n } from 'react-i18next';
import Login from './Login';

// Mock dependencies
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    loading: false,
    error: null,
    verifyMfa: vi.fn()
  })
}));

vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockTranslate,
    i18n: { language: 'en' }
  })
}));

// Mock functions
const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockTranslate = vi.fn((key) => key);

// Test constants
const VALID_CREDENTIALS = {
  email: 'test@portauthority.com',
  password: 'Test@123456'
};

const DASHBOARD_ROUTE = '/dashboard';

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderLogin = () => {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  };

  it('renders login form correctly', () => {
    renderLogin();

    // Check logo
    const logo = screen.getByAltText('Port Community System');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/assets/images/logo.svg');

    // Check title
    expect(screen.getByText('Welcome to Port Community System')).toBeInTheDocument();

    // Check form elements
    const emailInput = screen.getByTestId('email-input');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');

    const passwordInput = screen.getByTestId('password-input');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

    const submitButton = screen.getByTestId('login-button');
    expect(submitButton).toHaveAttribute('type', 'submit');
    expect(submitButton).toBeEnabled();
  });

  it('handles form validation', async () => {
    renderLogin();
    const submitButton = screen.getByTestId('login-button');

    // Test empty form submission
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    // Test invalid email format
    const emailInput = screen.getByTestId('email-input');
    await userEvent.type(emailInput, 'invalid-email');
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });

    // Test password validation
    const passwordInput = screen.getByTestId('password-input');
    await userEvent.type(passwordInput, 'weak');
    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters/)).toBeInTheDocument();
      expect(screen.getByText(/Password must contain uppercase, lowercase, number and special character/)).toBeInTheDocument();
    });
  });

  it('handles successful login', async () => {
    mockLogin.mockResolvedValueOnce({ mfaRequired: false });
    renderLogin();

    // Fill form with valid credentials
    await userEvent.type(screen.getByTestId('email-input'), VALID_CREDENTIALS.email);
    await userEvent.type(screen.getByTestId('password-input'), VALID_CREDENTIALS.password);

    // Submit form
    const submitButton = screen.getByTestId('login-button');
    await userEvent.click(submitButton);

    await waitFor(() => {
      // Verify login function called with correct credentials
      expect(mockLogin).toHaveBeenCalledWith({
        email: VALID_CREDENTIALS.email,
        password: VALID_CREDENTIALS.password
      });

      // Verify navigation to dashboard
      expect(mockNavigate).toHaveBeenCalledWith(DASHBOARD_ROUTE);
    });
  });

  it('handles login failure', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));
    renderLogin();

    // Fill and submit form
    await userEvent.type(screen.getByTestId('email-input'), VALID_CREDENTIALS.email);
    await userEvent.type(screen.getByTestId('password-input'), VALID_CREDENTIALS.password);
    await userEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('handles MFA flow', async () => {
    mockLogin.mockResolvedValueOnce({ mfaRequired: true });
    renderLogin();

    // Login with valid credentials
    await userEvent.type(screen.getByTestId('email-input'), VALID_CREDENTIALS.email);
    await userEvent.type(screen.getByTestId('password-input'), VALID_CREDENTIALS.password);
    await userEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      // Verify MFA screen is shown
      expect(screen.getByText('Enter Authentication Code')).toBeInTheDocument();
      expect(screen.getByTestId('mfa-input')).toBeInTheDocument();
      expect(screen.getByTestId('verify-mfa-button')).toBeInTheDocument();
    });

    // Test MFA validation
    const mfaInput = screen.getByTestId('mfa-input');
    await userEvent.type(mfaInput, '12345'); // Invalid length
    await userEvent.click(screen.getByTestId('verify-mfa-button'));

    await waitFor(() => {
      expect(screen.getByText('MFA code must be 6 digits')).toBeInTheDocument();
    });
  });

  it('is responsive on mobile devices', async () => {
    // Mock viewport for mobile testing
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    renderLogin();

    // Verify mobile-specific styles
    const loginForm = screen.getByRole('form');
    expect(loginForm).toHaveStyle({
      width: '90%',
      maxWidth: '450px'
    });

    // Verify touch-friendly input sizes
    const emailInput = screen.getByTestId('email-input');
    expect(emailInput).toHaveStyle({
      height: '40px',
      padding: '8px 16px'
    });

    // Verify mobile keyboard behavior
    const passwordInput = screen.getByTestId('password-input');
    expect(passwordInput).toHaveAttribute('inputmode', 'text');
  });

  it('implements security features', async () => {
    renderLogin();

    // Verify CSRF token is included
    await userEvent.click(screen.getByTestId('login-button'));
    expect(mockLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        _csrf: expect.any(String)
      })
    );

    // Verify rate limiting
    for (let i = 0; i < 6; i++) {
      await userEvent.click(screen.getByTestId('login-button'));
    }

    await waitFor(() => {
      expect(screen.getByText('Too many login attempts. Please try again later.')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeDisabled();
    });
  });

  it('maintains accessibility standards', async () => {
    renderLogin();

    // Verify ARIA labels
    expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Login Form');
    
    // Verify focus management
    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('login-button');

    expect(document.activeElement).toBe(emailInput); // Auto-focus on email
    await userEvent.tab();
    expect(document.activeElement).toBe(passwordInput);
    await userEvent.tab();
    expect(document.activeElement).toBe(submitButton);

    // Verify error announcements
    await userEvent.click(submitButton);
    await waitFor(() => {
      const errors = screen.getAllByRole('alert');
      expect(errors).toHaveLength(2); // Email and password errors
      errors.forEach(error => {
        expect(error).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});