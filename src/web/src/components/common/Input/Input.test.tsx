import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Input from './Input';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

describe('Input component', () => {
  // Common props for testing
  const defaultProps = {
    id: 'test-input',
    name: 'test',
    label: 'Test Input',
    'data-testid': 'test-input'
  };

  describe('Rendering', () => {
    it('should render input with required props', () => {
      render(<Input {...defaultProps} />);
      const input = screen.getByTestId('test-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'test-input');
      expect(input).toHaveAttribute('name', 'test');
    });

    it('should render label when provided', () => {
      render(<Input {...defaultProps} />);
      expect(screen.getByText('Test Input')).toBeInTheDocument();
    });

    it('should render required indicator when input is required', () => {
      render(<Input {...defaultProps} required />);
      const label = screen.getByText('Test Input');
      expect(label.parentElement).toHaveTextContent('*');
    });

    it('should render placeholder text', () => {
      render(<Input {...defaultProps} placeholder="Enter value" />);
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
    });

    it('should render character count when showCharCount is true', () => {
      render(
        <Input 
          {...defaultProps} 
          showCharCount 
          maxLength={100} 
          value="test"
        />
      );
      expect(screen.getByText('4/100')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should handle text input correctly', async () => {
      const handleChange = jest.fn();
      render(<Input {...defaultProps} onChange={handleChange} />);
      
      const input = screen.getByTestId('test-input');
      await userEvent.type(input, 'test value');
      
      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('test value');
    });

    it('should handle focus and blur events', () => {
      const handleFocus = jest.fn();
      const handleBlur = jest.fn();
      
      render(
        <Input 
          {...defaultProps} 
          onFocus={handleFocus} 
          onBlur={handleBlur} 
        />
      );
      
      const input = screen.getByTestId('test-input');
      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalled();
      
      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Input {...defaultProps} disabled />);
      expect(screen.getByTestId('test-input')).toBeDisabled();
    });

    it('should handle keyboard events', () => {
      const handleKeyDown = jest.fn();
      render(<Input {...defaultProps} onKeyDown={handleKeyDown} />);
      
      const input = screen.getByTestId('test-input');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('Validation and Errors', () => {
    it('should show error message when error prop is provided', () => {
      render(<Input {...defaultProps} error="Invalid input" />);
      expect(screen.getByText('Invalid input')).toBeInTheDocument();
    });

    it('should validate required field', async () => {
      render(<Input {...defaultProps} required />);
      
      const input = screen.getByTestId('test-input');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<Input {...defaultProps} type="email" />);
      
      const input = screen.getByTestId('test-input');
      await userEvent.type(input, 'invalid-email');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });

    it('should validate pattern matching', async () => {
      render(
        <Input 
          {...defaultProps} 
          pattern="[A-Za-z]{3}" 
          value="123"
        />
      );
      
      const input = screen.getByTestId('test-input');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid format')).toBeInTheDocument();
      });
    });
  });

  describe('Security', () => {
    it('should enforce maxLength restriction', async () => {
      render(
        <Input 
          {...defaultProps} 
          maxLength={5}
        />
      );
      
      const input = screen.getByTestId('test-input');
      await userEvent.type(input, 'too long input');
      
      expect(input).toHaveValue('too l');
    });

    it('should handle special characters safely', async () => {
      render(<Input {...defaultProps} />);
      
      const input = screen.getByTestId('test-input');
      await userEvent.type(input, '<script>alert("xss")</script>');
      
      expect(input).toHaveValue('<script>alert("xss")</script>');
      expect(input).not.toHaveAttribute('onload');
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Input {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <Input 
          {...defaultProps} 
          required 
          error="Error message"
        />
      );
      
      const input = screen.getByTestId('test-input');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    });

    it('should support keyboard navigation', () => {
      render(<Input {...defaultProps} />);
      
      const input = screen.getByTestId('test-input');
      expect(input).toHaveFocus();
      
      userEvent.tab();
      expect(input).not.toHaveFocus();
    });
  });

  describe('Internationalization', () => {
    it('should support RTL text direction', () => {
      render(<Input {...defaultProps} dir="rtl" />);
      const input = screen.getByTestId('test-input');
      expect(input).toHaveAttribute('dir', 'rtl');
    });

    it('should support language attribute', () => {
      render(<Input {...defaultProps} lang="ar" />);
      const input = screen.getByTestId('test-input');
      expect(input).toHaveAttribute('lang', 'ar');
    });
  });
});