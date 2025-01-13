import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider } from '@emotion/react';
import { theme } from '../../../styles/theme.styles';
import Card from './Card';

// Test IDs for component querying
const TEST_IDS = {
  CARD: 'card-component',
  HEADER: 'card-header',
  CONTENT: 'card-content',
  FOOTER: 'card-footer',
  LOADING: 'card-loading',
  ERROR: 'card-error'
} as const;

// Mock breakpoint values from theme
const BREAKPOINTS = {
  MOBILE: 320,
  TABLET: 768,
  DESKTOP: 1024,
  WIDE: 1440
} as const;

// Test wrapper with theme provider
const renderWithTheme = (ui: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render with basic props', () => {
      renderWithTheme(
        <Card data-testid={TEST_IDS.CARD}>
          Test Content
        </Card>
      );
      
      expect(screen.getByTestId(TEST_IDS.CARD)).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      renderWithTheme(
        <Card title="Test Title" data-testid={TEST_IDS.CARD}>
          Content
        </Card>
      );
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      renderWithTheme(
        <Card 
          footer={<button>Action</button>}
          data-testid={TEST_IDS.CARD}
        >
          Content
        </Card>
      );
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      renderWithTheme(
        <Card loading data-testid={TEST_IDS.CARD}>
          Content
        </Card>
      );
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      renderWithTheme(
        <Card 
          title="Test Title"
          data-testid={TEST_IDS.CARD}
        >
          Content
        </Card>
      );
      
      const card = screen.getByTestId(TEST_IDS.CARD);
      expect(card).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('heading')).toHaveAttribute('aria-level', '2');
    });

    it('should be keyboard navigable when interactive', async () => {
      const onAction = vi.fn();
      renderWithTheme(
        <Card 
          onAction={onAction}
          data-testid={TEST_IDS.CARD}
        >
          Content
        </Card>
      );
      
      const card = screen.getByTestId(TEST_IDS.CARD);
      expect(card).toHaveAttribute('tabIndex', '0');
      
      await userEvent.tab();
      expect(card).toHaveFocus();
      
      await userEvent.keyboard('{Enter}');
      expect(onAction).toHaveBeenCalled();
    });
  });

  describe('Responsiveness', () => {
    beforeEach(() => {
      // Reset viewport size before each test
      global.innerWidth = BREAKPOINTS.DESKTOP;
      global.dispatchEvent(new Event('resize'));
    });

    it('should adapt content padding on mobile', () => {
      global.innerWidth = BREAKPOINTS.MOBILE;
      global.dispatchEvent(new Event('resize'));

      renderWithTheme(
        <Card data-testid={TEST_IDS.CARD}>
          Content
        </Card>
      );
      
      const content = screen.getByText('Content').parentElement;
      expect(content).toHaveClass('mobile-content');
    });

    it('should handle different elevation styles', () => {
      renderWithTheme(
        <Card 
          elevation="raised"
          data-testid={TEST_IDS.CARD}
        >
          Content
        </Card>
      );
      
      const card = screen.getByTestId(TEST_IDS.CARD);
      expect(card).toHaveStyle({
        boxShadow: theme.shadows.md
      });
    });
  });

  describe('Maritime Theme Integration', () => {
    it('should use maritime color palette', () => {
      renderWithTheme(
        <Card data-testid={TEST_IDS.CARD}>
          Content
        </Card>
      );
      
      const card = screen.getByTestId(TEST_IDS.CARD);
      expect(card).toHaveStyle({
        backgroundColor: theme.colors.background,
        color: theme.colors.text
      });
    });

    it('should support RTL layout', () => {
      document.dir = 'rtl';
      
      renderWithTheme(
        <Card data-testid={TEST_IDS.CARD}>
          Content
        </Card>
      );
      
      const card = screen.getByTestId(TEST_IDS.CARD);
      expect(card).toHaveStyle({
        textAlign: 'right'
      });
      
      // Reset direction
      document.dir = 'ltr';
    });
  });

  describe('Footer Alignment', () => {
    it('should align footer content correctly', () => {
      renderWithTheme(
        <Card 
          footer={<button>Action</button>}
          footerAlignment="right"
          data-testid={TEST_IDS.CARD}
        >
          Content
        </Card>
      );
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveStyle({
        justifyContent: 'flex-end'
      });
    });
  });

  describe('Header Emphasis', () => {
    it('should apply correct header emphasis styles', () => {
      renderWithTheme(
        <Card 
          title="Test Title"
          headerEmphasis="emphasized"
          data-testid={TEST_IDS.CARD}
        >
          Content
        </Card>
      );
      
      const header = screen.getByRole('heading');
      expect(header).toHaveStyle({
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold
      });
    });
  });
});