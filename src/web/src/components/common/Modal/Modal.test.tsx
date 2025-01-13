import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@emotion/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Modal from './Modal';
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../../styles/breakpoints.styles';

// Mock functions and default props
const mockOnClose = vi.fn();
const defaultProps = {
  isOpen: true,
  title: 'Test Modal',
  onClose: mockOnClose,
  size: 'medium' as const,
  closeOnOverlayClick: true,
  children: <div>Modal Content</div>
};

// Helper to render modal with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Modal Component', () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    // Create modal root element
    const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);
  });

  describe('Rendering and Maritime Theme Compliance', () => {
    it('renders with maritime theme styling', () => {
      renderWithTheme(<Modal {...defaultProps} />);
      
      const modalContainer = screen.getByTestId('modal-container');
      const styles = window.getComputedStyle(modalContainer);
      
      // Verify maritime theme colors
      expect(styles.backgroundColor).toBe(theme.colors.background);
      expect(within(modalContainer).getByRole('heading').style.color).toBe(theme.colors.primary);
      
      // Verify typography
      expect(styles.fontFamily).toContain('Inter');
      
      // Verify spacing
      expect(styles.margin).toBe(theme.spacing.md);
    });

    it('applies correct size variant styles', () => {
      renderWithTheme(<Modal {...defaultProps} size="large" />);
      const modalContainer = screen.getByTestId('modal-container');
      
      expect(modalContainer).toHaveAttribute('data-size', 'large');
    });

    it('renders modal header with maritime styling', () => {
      renderWithTheme(<Modal {...defaultProps} />);
      const header = screen.getByRole('heading', { name: defaultProps.title });
      
      expect(header).toHaveStyle({
        color: theme.colors.primary,
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold
      });
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      // Reset viewport
      window.innerWidth = BREAKPOINT_VALUES.desktop;
      window.dispatchEvent(new Event('resize'));
    });

    it('adapts to mobile viewport', () => {
      window.innerWidth = BREAKPOINT_VALUES.mobile;
      window.dispatchEvent(new Event('resize'));
      
      renderWithTheme(<Modal {...defaultProps} />);
      const modalContainer = screen.getByTestId('modal-container');
      
      expect(modalContainer).toHaveStyle({
        width: '100%',
        margin: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm
      });
    });

    it('adjusts layout for tablet viewport', () => {
      window.innerWidth = BREAKPOINT_VALUES.tablet;
      window.dispatchEvent(new Event('resize'));
      
      renderWithTheme(<Modal {...defaultProps} />);
      const modalContainer = screen.getByTestId('modal-container');
      
      expect(modalContainer).toHaveStyle({
        maxWidth: '90vw',
        margin: theme.spacing.md
      });
    });
  });

  describe('Accessibility Features', () => {
    it('manages focus correctly', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Modal {...defaultProps} />);
      
      const modalContainer = screen.getByTestId('modal-container');
      const closeButton = screen.getByTestId('modal-close-button');
      
      // Initial focus should be on modal
      expect(modalContainer).toHaveFocus();
      
      // Tab should move to close button
      await user.tab();
      expect(closeButton).toHaveFocus();
      
      // Tab should cycle within modal
      await user.tab();
      expect(modalContainer).toHaveFocus();
    });

    it('provides proper ARIA attributes', () => {
      renderWithTheme(<Modal {...defaultProps} ariaLabel="Test Modal" ariaDescribedBy="modal-desc" />);
      
      const modalContainer = screen.getByTestId('modal-container');
      
      expect(modalContainer).toHaveAttribute('role', 'dialog');
      expect(modalContainer).toHaveAttribute('aria-modal', 'true');
      expect(modalContainer).toHaveAttribute('aria-label', 'Test Modal');
      expect(modalContainer).toHaveAttribute('aria-describedby', 'modal-desc');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Modal {...defaultProps} />);
      
      // Escape should close modal
      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Interaction Handling', () => {
    it('closes on overlay click when enabled', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Modal {...defaultProps} />);
      
      const overlay = screen.getByTestId('modal-overlay');
      await user.click(overlay);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents overlay click when disabled', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Modal {...defaultProps} closeOnOverlayClick={false} />);
      
      const overlay = screen.getByTestId('modal-overlay');
      await user.click(overlay);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('handles close button click', async () => {
      const user = userEvent.setup();
      renderWithTheme(<Modal {...defaultProps} />);
      
      const closeButton = screen.getByTestId('modal-close-button');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Animation and Performance', () => {
    it('triggers animation complete callback', () => {
      const onAnimationComplete = vi.fn();
      renderWithTheme(
        <Modal {...defaultProps} animationDuration={300} onAnimationComplete={onAnimationComplete} />
      );
      
      // Wait for animation
      setTimeout(() => {
        expect(onAnimationComplete).toHaveBeenCalled();
      }, 300);
    });

    it('cleans up on unmount', () => {
      const { unmount } = renderWithTheme(<Modal {...defaultProps} />);
      
      unmount();
      
      // Verify body scroll is restored
      expect(document.body.style.overflow).toBe('');
    });
  });
});