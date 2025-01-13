import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material';
import VesselCard from './VesselCard';
import { IVesselCall, VesselCallStatus } from '../../../types/vessel.types';
import { theme } from '../../../styles/theme.styles';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock vessel call data factory
const mockVesselCall = (overrides?: Partial<IVesselCall>): IVesselCall => ({
  id: 1,
  portId: 1,
  vesselId: 1,
  vesselName: 'Test Vessel',
  imoNumber: 'IMO1234567',
  callSign: 'TEST123',
  status: VesselCallStatus.SCHEDULED,
  eta: new Date('2024-01-01T10:00:00Z'),
  etd: new Date('2024-01-02T15:00:00Z'),
  ata: null,
  atd: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Mock matchMedia for responsive testing
const createMatchMedia = (width: number) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: width >= parseInt(query.match(/\d+/)?.[0] ?? '0'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('VesselCard Component', () => {
  const onClickMock = vi.fn();

  beforeEach(() => {
    onClickMock.mockClear();
  });

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    );
  };

  describe('Rendering Tests', () => {
    it('renders vessel name correctly', () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      expect(screen.getByText(vesselCall.vesselName)).toBeInTheDocument();
    });

    it('displays correct status indicator for each status type', () => {
      const statuses = Object.values(VesselCallStatus);
      
      statuses.forEach(status => {
        const vesselCall = mockVesselCall({ status });
        renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
        
        const statusElement = screen.getByText(status.toLowerCase());
        expect(statusElement).toBeInTheDocument();
        expect(statusElement).toHaveStyle({
          color: expect.any(String)
        });
      });
    });

    it('formats and displays schedule information correctly', () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      expect(screen.getByText('01 Jan 2024 10:00')).toBeInTheDocument();
      expect(screen.getByText('02 Jan 2024 15:00')).toBeInTheDocument();
    });

    it('handles loading state correctly', () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} loading={true} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('vessel.loading')).toBeInTheDocument();
    });

    it('displays error state with retry button when error occurs', () => {
      const vesselCall = mockVesselCall();
      const onRetry = vi.fn();
      
      renderWithTheme(
        <VesselCard 
          vesselCall={vesselCall} 
          onClick={onClickMock} 
          error={new Error('Test error')} 
          onRetry={onRetry}
        />
      );
      
      expect(screen.getByText('vessel.error')).toBeInTheDocument();
      const retryButton = screen.getByText('common.retry');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interaction Tests', () => {
    it('handles click events with correct vessel ID', async () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const card = screen.getByRole('article');
      await userEvent.click(card);
      
      expect(onClickMock).toHaveBeenCalledWith(vesselCall.id);
    });

    it('supports keyboard navigation', async () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const card = screen.getByRole('article');
      card.focus();
      
      await userEvent.keyboard('{Enter}');
      expect(onClickMock).toHaveBeenCalledWith(vesselCall.id);
      
      await userEvent.keyboard(' ');
      expect(onClickMock).toHaveBeenCalledTimes(2);
    });

    it('maintains focus states for accessibility', async () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const card = screen.getByRole('article');
      card.focus();
      
      expect(document.activeElement).toBe(card);
      expect(card).toHaveStyle({
        outline: expect.stringContaining('2px solid')
      });
    });
  });

  describe('Responsive Tests', () => {
    it('adapts layout for mobile viewport', () => {
      createMatchMedia(320);
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const container = screen.getByRole('article');
      expect(container).toHaveStyle({
        width: '100%'
      });
    });

    it('adjusts for tablet viewport', () => {
      createMatchMedia(768);
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const container = screen.getByRole('article');
      expect(container).toHaveStyle({
        width: '340px'
      });
    });

    it('displays full layout on desktop', () => {
      createMatchMedia(1024);
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const container = screen.getByRole('article');
      expect(container).toHaveStyle({
        width: '380px'
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('meets WCAG 2.1 requirements', async () => {
      const vesselCall = mockVesselCall();
      const { container } = renderWithTheme(
        <VesselCard vesselCall={vesselCall} onClick={onClickMock} />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA attributes', () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining(vesselCall.vesselName));
      
      const status = screen.getByLabelText(expect.stringContaining('vessel.status'));
      expect(status).toBeInTheDocument();
    });
  });

  describe('Theme Tests', () => {
    it('applies maritime theme colors correctly', () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const container = screen.getByRole('article');
      expect(container).toHaveStyle({
        backgroundColor: theme.colors.background
      });
    });

    it('uses correct typography scale', () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const vesselName = screen.getByText(vesselCall.vesselName);
      expect(vesselName).toHaveStyle({
        fontSize: theme.typography.fontSize.lg
      });
    });

    it('maintains proper spacing units', () => {
      const vesselCall = mockVesselCall();
      renderWithTheme(<VesselCard vesselCall={vesselCall} onClick={onClickMock} />);
      
      const container = screen.getByRole('article');
      expect(container).toHaveStyle({
        padding: theme.spacing.md
      });
    });
  });
});