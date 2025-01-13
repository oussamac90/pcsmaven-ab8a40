import React, { memo, useId } from 'react';
import { useBreakpoint } from '@maritime/hooks'; // v1.0.0
import { CardContainer, CardHeader, CardContent, CardFooter } from './Card.styles';

interface CardProps {
  /** Title text displayed in the card header */
  title?: string;
  /** Primary content of the card */
  children: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Loading state indicator */
  loading?: boolean;
  /** Optional click handler for interactive cards */
  onAction?: (event: React.MouseEvent) => void;
  /** Optional elevation style */
  elevation?: 'default' | 'raised';
  /** Optional padding size for content */
  contentPadding?: 'none' | 'default' | 'large';
  /** Optional footer alignment */
  footerAlignment?: 'left' | 'center' | 'right';
  /** Optional header emphasis */
  headerEmphasis?: 'default' | 'emphasized';
  /** Optional test ID for testing */
  'data-testid'?: string;
}

/**
 * Card component implementing the maritime design system's card pattern.
 * Provides a container with header, content, and footer sections for displaying
 * grouped information with enhanced accessibility and responsive behavior.
 */
export const Card = memo<CardProps>(({
  title,
  children,
  footer,
  className,
  loading = false,
  onAction,
  elevation = 'default',
  contentPadding = 'default',
  footerAlignment = 'left',
  headerEmphasis = 'default',
  'data-testid': testId
}) => {
  // Generate unique ID for ARIA labelling
  const headerId = useId();
  
  // Get current breakpoint for responsive behavior
  const breakpoint = useBreakpoint();
  
  // Handle keyboard interaction for interactive cards
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onAction && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onAction(event as unknown as React.MouseEvent);
    }
  };

  return (
    <CardContainer
      className={className}
      elevation={elevation}
      interactive={!!onAction}
      onClick={onAction}
      onKeyDown={handleKeyDown}
      role={onAction ? 'button' : 'article'}
      tabIndex={onAction ? 0 : undefined}
      aria-labelledby={title ? headerId : undefined}
      data-testid={testId}
    >
      {loading ? (
        // Loading state skeleton
        <div aria-busy="true" aria-live="polite">
          <div className="skeleton-header" />
          <div className="skeleton-content" />
          {footer && <div className="skeleton-footer" />}
        </div>
      ) : (
        <>
          {title && (
            <CardHeader
              id={headerId}
              variant={headerEmphasis}
              role="heading"
              aria-level={2}
            >
              {title}
            </CardHeader>
          )}
          
          <CardContent
            padding={contentPadding}
            className={breakpoint === 'mobile' ? 'mobile-content' : ''}
          >
            {children}
          </CardContent>

          {footer && (
            <CardFooter
              alignment={footerAlignment}
              role="contentinfo"
            >
              {footer}
            </CardFooter>
          )}
        </>
      )}
    </CardContainer>
  );
});

// Display name for debugging
Card.displayName = 'Card';

// Default props
Card.defaultProps = {
  elevation: 'default',
  contentPadding: 'default',
  footerAlignment: 'left',
  headerEmphasis: 'default',
  loading: false
};