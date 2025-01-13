import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { BrowserRouter, createMemoryRouter } from 'react-router-dom'; // v6.0.0
import { vi } from 'vitest'; // v0.34.0
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7.0
import { ThemeProvider } from '@emotion/react';

import Header from './Header';
import { theme } from '../../../styles/theme.styles';

// Mock hooks and services
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User' },
    logout: vi.fn().mockResolvedValue(undefined)
  })
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Helper function to render component with router and theme
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Helper function to simulate viewport sizes
const setViewportSize = (width: number, height: number = 800) => {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
  window.dispatchEvent(new Event('resize'));
};

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout and Structure', () => {
    it('should render logo in correct position', () => {
      renderWithRouter(<Header />);
      const logo = screen.getByAltText('Port Community System');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('width', '160');
      expect(logo).toHaveAttribute('height', '40');
    });

    it('should render search bar with correct placeholder', () => {
      renderWithRouter(<Header />);
      const searchInput = screen.getByPlaceholderText('Search vessels, cargo, or documents...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'search');
    });

    it('should display user section with name and menu', () => {
      renderWithRouter(<Header />);
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
    });

    it('should show notification badge when notifications exist', () => {
      renderWithRouter(<Header notificationCount={5} />);
      const notificationButton = screen.getByLabelText(/Notifications/);
      expect(notificationButton).toHaveClass('notification-badge');
    });
  });

  describe('User Interactions', () => {
    it('should handle search input and submission', async () => {
      const onSearch = vi.fn();
      renderWithRouter(<Header onSearch={onSearch} />);
      
      const searchInput = screen.getByPlaceholderText('Search vessels, cargo, or documents...');
      await userEvent.type(searchInput, 'test query');
      await userEvent.click(screen.getByLabelText('Submit search'));
      
      expect(onSearch).toHaveBeenCalledWith('test query');
    });

    it('should toggle user menu on click', async () => {
      renderWithRouter(<Header />);
      
      const menuButton = screen.getByLabelText('User menu');
      await userEvent.click(menuButton);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should handle logout action', async () => {
      const { useAuth } = await import('../../../hooks/useAuth');
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      (useAuth as jest.Mock).mockReturnValue({ user: { name: 'Test User' }, logout: mockLogout });

      renderWithRouter(<Header />);
      
      await userEvent.click(screen.getByLabelText('User menu'));
      await userEvent.click(screen.getByText('Logout'));
      
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should navigate on logo click', async () => {
      renderWithRouter(<Header />);
      
      await userEvent.click(screen.getByAltText('Port Community System'));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to mobile layout', () => {
      setViewportSize(767);
      renderWithRouter(<Header />);
      
      const searchSection = screen.getByRole('search');
      expect(searchSection).toHaveStyle({ display: 'none' });
    });

    it('should show search bar in tablet view', () => {
      setViewportSize(768);
      renderWithRouter(<Header />);
      
      const searchSection = screen.getByRole('search');
      expect(searchSection).toHaveStyle({ display: 'flex' });
    });

    it('should maintain full layout in desktop view', () => {
      setViewportSize(1024);
      renderWithRouter(<Header />);
      
      expect(screen.getByRole('search')).toBeVisible();
      expect(screen.getByLabelText('User menu')).toBeVisible();
      expect(screen.getByAltText('Port Community System')).toBeVisible();
    });
  });

  describe('Theme Compliance', () => {
    it('should use maritime theme colors', () => {
      renderWithRouter(<Header />);
      const header = screen.getByRole('banner');
      
      expect(header).toHaveStyle({
        backgroundColor: theme.colors.primary,
        color: theme.colors.background
      });
    });

    it('should follow typography specifications', () => {
      renderWithRouter(<Header />);
      const userMenu = screen.getByLabelText('User menu');
      
      expect(userMenu).toHaveStyle({
        fontFamily: theme.typography.fontFamily.primary
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithRouter(<Header />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      renderWithRouter(<Header />);
      
      const searchInput = screen.getByRole('searchbox');
      const userMenu = screen.getByLabelText('User menu');
      
      await userEvent.tab();
      expect(searchInput).toHaveFocus();
      
      await userEvent.tab();
      expect(userMenu).toHaveFocus();
    });

    it('should handle screen reader announcements', () => {
      renderWithRouter(<Header notificationCount={3} />);
      
      const notificationButton = screen.getByLabelText('Notifications (3 unread)');
      expect(notificationButton).toHaveAttribute('aria-label', 'Notifications (3 unread)');
    });
  });
});