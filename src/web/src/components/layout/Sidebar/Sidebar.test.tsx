import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@emotion/react';
import MatchMediaMock from 'jest-matchmedia-mock';

import Sidebar from './Sidebar';
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../../styles/breakpoints.styles';
import { useAuth } from '../../../hooks/useAuth';

// Mock dependencies
jest.mock('../../../hooks/useAuth');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));

// Helper function to render component with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    </MemoryRouter>,
    options
  );
};

describe('Sidebar Component', () => {
  let matchMedia: MatchMediaMock;
  const mockNavigate = jest.fn();
  
  beforeEach(() => {
    matchMedia = new MatchMediaMock();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    // Reset mocks between tests
    jest.clearAllMocks();
  });

  afterEach(() => {
    matchMedia.clear();
  });

  describe('Navigation and Role-based Access', () => {
    it('renders navigation items based on user role - Port Authority', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { role: 'PORT_AUTHORITY' },
        isAuthenticated: true,
        validateAccess: () => true
      });

      renderWithProviders(
        <Sidebar 
          isCollapsed={false} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      // Verify Port Authority specific navigation items
      expect(screen.getByText('Vessel Management')).toBeInTheDocument();
      expect(screen.getByText('Document Center')).toBeInTheDocument();
      expect(screen.getByText('Financial Portal')).toBeInTheDocument();
      expect(screen.getByText('Operations')).toBeInTheDocument();
    });

    it('renders navigation items based on user role - Terminal Operator', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { role: 'TERMINAL_OPERATOR' },
        isAuthenticated: true,
        validateAccess: () => true
      });

      renderWithProviders(
        <Sidebar 
          isCollapsed={false} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      // Verify Terminal Operator specific navigation items
      expect(screen.getByText('Vessel Management')).toBeInTheDocument();
      expect(screen.getByText('Operations')).toBeInTheDocument();
      expect(screen.queryByText('Financial Portal')).not.toBeInTheDocument();
    });

    it('handles navigation correctly', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { role: 'PORT_AUTHORITY' },
        isAuthenticated: true,
        validateAccess: () => true
      });

      renderWithProviders(
        <Sidebar 
          isCollapsed={false} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      // Test navigation click
      const vesselManagementLink = screen.getByText('Vessel Management');
      await userEvent.click(vesselManagementLink);
      expect(mockNavigate).toHaveBeenCalledWith('/vessel-management');

      // Test keyboard navigation
      const documentCenterLink = screen.getByText('Document Center');
      fireEvent.keyDown(documentCenterLink, { key: 'Enter' });
      expect(mockNavigate).toHaveBeenCalledWith('/document-center');
    });
  });

  describe('Responsive Behavior', () => {
    it('applies mobile styles when viewport is below tablet breakpoint', async () => {
      matchMedia.useMediaQuery(`(max-width: ${BREAKPOINT_VALUES.mobile}px)`);

      renderWithProviders(
        <Sidebar 
          isCollapsed={false} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveStyle({
        width: '100%'
      });
    });

    it('applies tablet styles when viewport is at tablet breakpoint', async () => {
      matchMedia.useMediaQuery(`(min-width: ${BREAKPOINT_VALUES.tablet}px)`);

      renderWithProviders(
        <Sidebar 
          isCollapsed={false} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveStyle({
        width: '240px'
      });
    });

    it('shows overlay on mobile when sidebar is expanded', async () => {
      matchMedia.useMediaQuery(`(max-width: ${BREAKPOINT_VALUES.mobile}px)`);

      renderWithProviders(
        <Sidebar 
          isCollapsed={false} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      const overlay = screen.getByTestId('sidebar-overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveStyle({
        opacity: '1',
        visibility: 'visible'
      });
    });
  });

  describe('Collapsible State', () => {
    it('handles collapsible state correctly', async () => {
      const onToggle = jest.fn();

      renderWithProviders(
        <Sidebar 
          isCollapsed={true} 
          onToggle={onToggle} 
          testId="sidebar"
        />
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveStyle({
        width: '64px'
      });

      // Test touch gestures
      fireEvent.touchStart(sidebar, { touches: [{ clientX: 0 }] });
      fireEvent.touchMove(sidebar, { touches: [{ clientX: 100 }] });
      fireEvent.touchEnd(sidebar);

      expect(onToggle).toHaveBeenCalled();
    });

    it('animates transition between states', async () => {
      const { rerender } = renderWithProviders(
        <Sidebar 
          isCollapsed={false} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveStyle({
        transition: 'all 0.3s ease-in-out'
      });

      rerender(
        <Sidebar 
          isCollapsed={true} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      await waitFor(() => {
        expect(sidebar).toHaveStyle({
          width: '64px'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('maintains accessibility compliance', async () => {
      renderWithProviders(
        <Sidebar 
          isCollapsed={false} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      const sidebar = screen.getByTestId('sidebar');
      
      // Test ARIA attributes
      expect(sidebar).toHaveAttribute('role', 'navigation');
      expect(sidebar).toHaveAttribute('aria-label', 'Main navigation');
      expect(sidebar).toHaveAttribute('aria-expanded', 'true');

      // Test navigation items accessibility
      const navItems = screen.getAllByRole('menuitem');
      navItems.forEach(item => {
        expect(item).toHaveAttribute('tabIndex', '0');
        expect(item).toHaveAttribute('aria-label');
      });
    });

    it('handles keyboard focus management', async () => {
      renderWithProviders(
        <Sidebar 
          isCollapsed={false} 
          onToggle={jest.fn()} 
          testId="sidebar"
        />
      );

      const navItems = screen.getAllByRole('menuitem');
      
      // Test keyboard navigation
      navItems[0].focus();
      expect(document.activeElement).toBe(navItems[0]);
      
      fireEvent.keyDown(navItems[0], { key: 'Tab' });
      expect(document.activeElement).toBe(navItems[1]);
    });
  });
});