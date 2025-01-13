import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ThemeProvider } from '@emotion/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Notification, NotificationType } from './Notification';
import { theme } from '../../../styles/theme.styles';

expect.extend(toHaveNoViolations);

// Test constants
const TEST_MESSAGE = 'Test notification message';
const TEST_DURATION = 3000;
const ANIMATION_DURATION = 300;
const NOTIFICATION_TYPES: NotificationType[] = ['success', 'warning', 'error', 'info'];

// Helper function to render component with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Notification Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllTimers();
  });

  it('renders successfully with required props', () => {
    renderWithTheme(
      <Notification
        type="info"
        message={TEST_MESSAGE}
        isVisible={true}
        onClose={() => {}}
      />
    );

    const notification = screen.getByTestId('notification');
    expect(notification).toBeInTheDocument();
    expect(notification).toHaveAttribute('role', 'alert');
    expect(notification).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText(TEST_MESSAGE)).toBeInTheDocument();
  });

  it('handles close action correctly', async () => {
    const onCloseMock = vi.fn();
    renderWithTheme(
      <Notification
        type="info"
        message={TEST_MESSAGE}
        isVisible={true}
        onClose={onCloseMock}
      />
    );

    const closeButton = screen.getByTestId('notification-close-button');
    await userEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after specified duration', async () => {
    const onCloseMock = vi.fn();
    renderWithTheme(
      <Notification
        type="info"
        message={TEST_MESSAGE}
        isVisible={true}
        duration={TEST_DURATION}
        onClose={onCloseMock}
      />
    );

    vi.advanceTimersByTime(TEST_DURATION);
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('handles keyboard interactions', async () => {
    const onCloseMock = vi.fn();
    renderWithTheme(
      <Notification
        type="info"
        message={TEST_MESSAGE}
        isVisible={true}
        onClose={onCloseMock}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it.each(NOTIFICATION_TYPES)('renders %s notification type correctly', (type) => {
    renderWithTheme(
      <Notification
        type={type}
        message={TEST_MESSAGE}
        isVisible={true}
        onClose={() => {}}
      />
    );

    const notification = screen.getByTestId('notification');
    const icon = within(notification).getByLabelText(`${type} notification icon`);
    expect(icon).toBeInTheDocument();
    expect(notification).toHaveStyle({
      borderLeftColor: theme.colors[type === 'info' ? 'secondary' : type]
    });
  });

  it('animates on mount and unmount', async () => {
    const { rerender } = renderWithTheme(
      <Notification
        type="info"
        message={TEST_MESSAGE}
        isVisible={true}
        onClose={() => {}}
      />
    );

    const notification = screen.getByTestId('notification');
    expect(notification).toHaveStyle({ opacity: 1 });

    rerender(
      <Notification
        type="info"
        message={TEST_MESSAGE}
        isVisible={false}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(notification).not.toBeInTheDocument();
    }, { timeout: ANIMATION_DURATION });
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithTheme(
      <Notification
        type="info"
        message={TEST_MESSAGE}
        isVisible={true}
        onClose={() => {}}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports different positions', () => {
    const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const;
    
    positions.forEach(position => {
      const { rerender } = renderWithTheme(
        <Notification
          type="info"
          message={TEST_MESSAGE}
          isVisible={true}
          position={position}
          onClose={() => {}}
        />
      );

      const notification = screen.getByTestId('notification');
      const style = window.getComputedStyle(notification);

      if (position.includes('right')) {
        expect(style.right).toBe('24px');
      } else {
        expect(style.left).toBe('24px');
      }

      if (position.includes('top')) {
        expect(style.top).toBe('24px');
      } else {
        expect(style.bottom).toBe('24px');
      }

      rerender(<></>);
    });
  });

  it('cleans up timers on unmount', () => {
    const onCloseMock = vi.fn();
    const { unmount } = renderWithTheme(
      <Notification
        type="info"
        message={TEST_MESSAGE}
        isVisible={true}
        duration={TEST_DURATION}
        onClose={onCloseMock}
      />
    );

    unmount();
    vi.advanceTimersByTime(TEST_DURATION);
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('handles long messages appropriately', () => {
    const longMessage = 'A'.repeat(200);
    renderWithTheme(
      <Notification
        type="info"
        message={longMessage}
        isVisible={true}
        onClose={() => {}}
      />
    );

    const messageElement = screen.getByText(longMessage);
    expect(messageElement).toBeInTheDocument();
    expect(window.getComputedStyle(messageElement).overflow).toBe('hidden');
  });
});