import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import ResizeObserver from 'resize-observer-polyfill';
import Form, { SecurityLevel } from './Form';
import Button from '../Button/Button';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver
global.ResizeObserver = ResizeObserver;

// Mock encryption service
const mockEncryptionService = vi.fn();

// Mock form submission handler
const mockOnSubmit = vi.fn();

// Default test props
const defaultProps = {
  id: 'test-form',
  schema: {
    email: {
      type: 'string',
      required: true,
      format: 'email'
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8
    }
  },
  onSubmit: mockOnSubmit,
  securityLevel: SecurityLevel.CONFIDENTIAL,
  csrfToken: 'test-csrf-token'
};

describe('Form Component', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockEncryptionService.mockClear();
  });

  it('renders form elements correctly', () => {
    render(
      <Form {...defaultProps}>
        <input data-testid="email-input" type="email" name="email" />
        <input data-testid="password-input" type="password" name="password" />
        <Button type="submit">Submit</Button>
      </Form>
    );

    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByRole('form')).toHaveAttribute('data-security-level', SecurityLevel.CONFIDENTIAL);
  });

  it('handles form submission with validation', async () => {
    render(
      <Form {...defaultProps}>
        <input data-testid="email-input" type="email" name="email" />
        <input data-testid="password-input" type="password" name="password" />
        <Button type="submit">Submit</Button>
      </Form>
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'Password123!');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        _csrf: 'test-csrf-token'
      });
    });
  });

  it('validates form inputs according to schema', async () => {
    render(
      <Form {...defaultProps}>
        <input data-testid="email-input" type="email" name="email" />
        <input data-testid="password-input" type="password" name="password" />
        <Button type="submit">Submit</Button>
      </Form>
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('handles different security levels correctly', () => {
    const { rerender } = render(
      <Form {...defaultProps} securityLevel={SecurityLevel.CRITICAL}>
        <input data-testid="sensitive-input" type="text" name="sensitive" />
      </Form>
    );

    expect(screen.getByRole('form')).toHaveAttribute('data-security-level', SecurityLevel.CRITICAL);

    rerender(
      <Form {...defaultProps} securityLevel={SecurityLevel.PUBLIC}>
        <input data-testid="public-input" type="text" name="public" />
      </Form>
    );

    expect(screen.getByRole('form')).toHaveAttribute('data-security-level', SecurityLevel.PUBLIC);
  });

  it('meets accessibility standards', async () => {
    const { container } = render(
      <Form {...defaultProps}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" name="email" required />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" name="password" required />
        <Button type="submit">Submit</Button>
      </Form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('adapts to different screen sizes', async () => {
    const { container } = render(
      <Form {...defaultProps}>
        <div data-testid="form-content">
          <input type="email" name="email" />
          <input type="password" name="password" />
        </div>
      </Form>
    );

    // Test mobile layout
    window.innerWidth = 375;
    fireEvent(window, new Event('resize'));
    
    await waitFor(() => {
      expect(container.firstChild).toHaveStyle({
        maxWidth: '100%'
      });
    });

    // Test desktop layout
    window.innerWidth = 1024;
    fireEvent(window, new Event('resize'));
    
    await waitFor(() => {
      expect(container.firstChild).toHaveStyle({
        maxWidth: '800px'
      });
    });
  });

  it('handles form data encryption for sensitive fields', async () => {
    render(
      <Form {...defaultProps}>
        <input 
          data-testid="sensitive-input"
          type="text"
          name="sensitive"
          data-security-rules='{"encrypt":true}'
        />
        <Button type="submit">Submit</Button>
      </Form>
    );

    const sensitiveInput = screen.getByTestId('sensitive-input');
    await userEvent.type(sensitiveInput, 'sensitive data');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      const submitData = mockOnSubmit.mock.calls[0][0];
      expect(submitData).toHaveProperty('_csrf');
      expect(submitData.sensitive).toBeDefined();
    });
  });

  it('prevents XSS attacks in form inputs', async () => {
    render(
      <Form {...defaultProps}>
        <input 
          data-testid="text-input"
          type="text"
          name="text"
        />
        <Button type="submit">Submit</Button>
      </Form>
    );

    const textInput = screen.getByTestId('text-input');
    await userEvent.type(textInput, '<script>alert("xss")</script>');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      const submitData = mockOnSubmit.mock.calls[0][0];
      expect(submitData.text).not.toContain('<script>');
    });
  });
});