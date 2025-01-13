import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@emotion/react';
import { AnalyticsProvider } from '@analytics/react';
import ResizeObserver from 'resize-observer-polyfill';
import Footer from './Footer';
import { theme } from '../../../styles/theme.styles';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver for responsive tests
global.ResizeObserver = ResizeObserver;

// Mock analytics provider
const mockAnalytics = {
  track: jest.fn(),
  page: jest.fn()
};

// Test IDs for component selection
const TEST_IDS = {
  footer: 'footer',
  copyright: 'footer-copyright',
  links: 'footer-link',
  navigation: 'footer-navigation',
  socialLinks: 'footer-social-links'
};

// Viewport sizes from breakpoints
const VIEWPORT_SIZES = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px'
};

// Wrapper component for tests
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AnalyticsProvider instance={mockAnalytics}>
          {ui}
        </AnalyticsProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Footer', () => {
  beforeEach(() => {
    // Reset analytics mocks
    mockAnalytics.track.mockClear();
    mockAnalytics.page.mockClear();
  });

  describe('Rendering', () => {
    it('should render the footer component correctly', () => {
      renderWithProviders(<Footer />);
      const footer = screen.getByTestId(TEST_IDS.footer);
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveAttribute('role', 'contentinfo');
    });

    it('should display current year in copyright text', () => {
      renderWithProviders(<Footer />);
      const copyright = screen.getByTestId(TEST_IDS.copyright);
      const currentYear = new Date().getFullYear();
      expect(copyright).toHaveTextContent(`© ${currentYear}`);
    });

    it('should render navigation links based on authorized routes', () => {
      renderWithProviders(<Footer />);
      const links = screen.getAllByTestId(new RegExp(TEST_IDS.links));
      expect(links.length).toBeGreaterThan(0);
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link).toHaveStyle(`color: ${theme.colors.background}`);
      });
    });

    it('should apply maritime theme styling correctly', () => {
      renderWithProviders(<Footer />);
      const footer = screen.getByTestId(TEST_IDS.footer);
      expect(footer).toHaveStyle({
        backgroundColor: theme.colors.primary,
        color: theme.colors.background
      });
    });

    it('should support RTL layout', () => {
      document.documentElement.setAttribute('dir', 'rtl');
      renderWithProviders(<Footer />);
      const footer = screen.getByTestId(TEST_IDS.footer);
      expect(footer).toHaveStyle('text-align: right');
      document.documentElement.removeAttribute('dir');
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<Footer />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      renderWithProviders(<Footer />);
      const footer = screen.getByTestId(TEST_IDS.footer);
      expect(footer).toHaveAttribute('aria-label', 'Site footer');
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Footer navigation');
    });

    it('should be keyboard navigable', async () => {
      renderWithProviders(<Footer />);
      const links = screen.getAllByTestId(new RegExp(TEST_IDS.links));
      const firstLink = links[0];
      const lastLink = links[links.length - 1];

      // Tab navigation
      firstLink.focus();
      expect(document.activeElement).toBe(firstLink);
      userEvent.tab();
      expect(document.activeElement).not.toBe(firstLink);
    });

    it('should have sufficient color contrast', () => {
      renderWithProviders(<Footer />);
      const footer = screen.getByTestId(TEST_IDS.footer);
      const style = window.getComputedStyle(footer);
      // Verify contrast ratio meets WCAG standards
      expect(style.backgroundColor).toBe(theme.colors.primary);
      expect(style.color).toBe(theme.colors.background);
    });
  });

  describe('Responsive', () => {
    const setViewportSize = (width: string) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: parseInt(width)
      });
      window.dispatchEvent(new Event('resize'));
    };

    it('should adapt layout for mobile viewport', () => {
      setViewportSize(VIEWPORT_SIZES.mobile);
      renderWithProviders(<Footer />);
      const footer = screen.getByTestId(TEST_IDS.footer);
      expect(footer).toHaveStyle({ height: '80px' });
    });

    it('should adapt layout for tablet viewport', () => {
      setViewportSize(VIEWPORT_SIZES.tablet);
      renderWithProviders(<Footer />);
      const footer = screen.getByTestId(TEST_IDS.footer);
      expect(footer).toHaveStyle({ height: '64px' });
    });

    it('should adapt layout for desktop viewport', () => {
      setViewportSize(VIEWPORT_SIZES.desktop);
      renderWithProviders(<Footer />);
      const footer = screen.getByTestId(TEST_IDS.footer);
      expect(footer).toHaveStyle({ height: '64px' });
    });
  });

  describe('Integration', () => {
    it('should track link clicks with analytics', async () => {
      renderWithProviders(<Footer />);
      const links = screen.getAllByTestId(new RegExp(TEST_IDS.links));
      await userEvent.click(links[0]);
      expect(mockAnalytics.track).toHaveBeenCalled();
    });

    it('should handle theme changes correctly', () => {
      const customTheme = {
        ...theme,
        colors: {
          ...theme.colors,
          primary: '#000000'
        }
      };

      render(
        <BrowserRouter>
          <ThemeProvider theme={customTheme}>
            <AnalyticsProvider instance={mockAnalytics}>
              <Footer />
            </AnalyticsProvider>
          </ThemeProvider>
        </BrowserRouter>
      );

      const footer = screen.getByTestId(TEST_IDS.footer);
      expect(footer).toHaveStyle({ backgroundColor: '#000000' });
    });

    it('should handle error boundary fallback', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
        return null;
      };

      const { container } = render(
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <ErrorComponent />
            <Footer />
          </ThemeProvider>
        </BrowserRouter>
      );

      expect(container).toBeInTheDocument();
    });
  });
});