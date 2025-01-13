import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Button from './Button';
import { theme } from '../../../styles/theme.styles';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Test constants
const TEST_ID = 'maritime-button';
const BUTTON_TEXT = 'Click Me';
const MARITIME_COLORS = {
  PRIMARY: '#003366',
  SECONDARY: '#0066CC',
  ACCENT: '#00A3E0'
};

describe('Button Component', () => {
  // Basic Rendering Tests
  describe('Rendering', () => {
    test('renders with default props', () => {
      render(<Button>{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(BUTTON_TEXT);
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toBeDisabled();
    });

    test('renders with custom className', () => {
      const customClass = 'custom-button';
      render(<Button className={customClass}>{BUTTON_TEXT}</Button>);
      
      expect(screen.getByTestId(TEST_ID)).toHaveClass(customClass);
    });
  });

  // Variant Tests
  describe('Variants', () => {
    test('applies primary variant styles correctly', () => {
      render(<Button variant="primary">{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toHaveStyle({
        backgroundColor: MARITIME_COLORS.PRIMARY,
        color: '#FFFFFF'
      });
    });

    test('applies secondary variant styles correctly', () => {
      render(<Button variant="secondary">{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toHaveStyle({
        backgroundColor: MARITIME_COLORS.SECONDARY,
        color: '#FFFFFF'
      });
    });

    test('applies accent variant styles correctly', () => {
      render(<Button variant="accent">{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toHaveStyle({
        backgroundColor: MARITIME_COLORS.ACCENT,
        color: '#FFFFFF'
      });
    });

    test('applies outline variant styles correctly', () => {
      render(<Button variant="outline">{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toHaveStyle({
        backgroundColor: 'transparent',
        border: `2px solid ${MARITIME_COLORS.PRIMARY}`
      });
    });
  });

  // Size Tests
  describe('Sizes', () => {
    test('applies small size styles correctly', () => {
      render(<Button size="small">{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toHaveStyle({
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        fontSize: theme.typography.fontSize.sm
      });
    });

    test('applies medium size styles correctly', () => {
      render(<Button size="medium">{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toHaveStyle({
        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
        fontSize: theme.typography.fontSize.md
      });
    });

    test('applies large size styles correctly', () => {
      render(<Button size="large">{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toHaveStyle({
        padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
        fontSize: theme.typography.fontSize.lg
      });
    });
  });

  // State Tests
  describe('States', () => {
    test('handles disabled state correctly', () => {
      render(<Button disabled>{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveStyle({ opacity: '0.6' });
    });

    test('handles loading state correctly', () => {
      render(<Button loading>{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      const spinner = within(button).getByRole('progressbar');
      
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(spinner).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    test('handles fullWidth prop correctly', () => {
      render(<Button fullWidth>{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toHaveStyle({ width: '100%' });
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    test('calls onClick handler when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>{BUTTON_TEXT}</Button>);
      
      fireEvent.click(screen.getByTestId(TEST_ID));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>{BUTTON_TEXT}</Button>);
      
      fireEvent.click(screen.getByTestId(TEST_ID));
      expect(handleClick).not.toHaveBeenCalled();
    });

    test('does not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>{BUTTON_TEXT}</Button>);
      
      fireEvent.click(screen.getByTestId(TEST_ID));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    test('meets WCAG accessibility guidelines', async () => {
      const { container } = render(<Button>{BUTTON_TEXT}</Button>);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    test('supports custom aria-label', () => {
      const ariaLabel = 'Custom Button Label';
      render(<Button ariaLabel={ariaLabel}>{BUTTON_TEXT}</Button>);
      
      expect(screen.getByTestId(TEST_ID)).toHaveAttribute('aria-label', ariaLabel);
    });

    test('handles keyboard navigation correctly', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      button.focus();
      expect(button).toHaveFocus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    test('has correct tab index when disabled', () => {
      render(<Button disabled>{BUTTON_TEXT}</Button>);
      expect(screen.getByTestId(TEST_ID)).toHaveAttribute('tabIndex', '-1');
    });
  });

  // Responsive Tests
  describe('Responsive Behavior', () => {
    beforeEach(() => {
      // Reset viewport to mobile size
      window.innerWidth = 320;
      window.dispatchEvent(new Event('resize'));
    });

    test('adjusts styles for mobile viewport', () => {
      render(<Button size="large">{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      expect(button).toHaveStyle({
        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
        fontSize: theme.typography.fontSize.md
      });
    });

    test('maintains touch target size on mobile', () => {
      render(<Button size="small">{BUTTON_TEXT}</Button>);
      const button = screen.getByTestId(TEST_ID);
      
      const styles = window.getComputedStyle(button);
      const height = parseFloat(styles.height);
      
      // Ensure minimum touch target size of 44px
      expect(height).toBeGreaterThanOrEqual(44);
    });
  });
});