import React from 'react'; // v18.2.0
import { ButtonContainer } from './Button.styles';

// Comprehensive props interface for the Button component
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  ariaLabel?: string;
  tabIndex?: number;
}

// Default props for the Button component
const defaultProps: Partial<ButtonProps> = {
  variant: 'primary',
  size: 'medium',
  type: 'button',
  disabled: false,
  loading: false,
  fullWidth: false,
  tabIndex: 0
};

/**
 * Maritime-themed Button component implementing the design system specifications.
 * Supports multiple variants, sizes, states, and responsive behavior.
 */
export const Button = React.memo<ButtonProps>(({
  children,
  variant = defaultProps.variant,
  size = defaultProps.size,
  disabled = defaultProps.disabled,
  loading = defaultProps.loading,
  fullWidth = defaultProps.fullWidth,
  onClick,
  type = defaultProps.type,
  className,
  ariaLabel,
  tabIndex = defaultProps.tabIndex
}) => {
  // Handle click events while respecting disabled and loading states
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading || !onClick) return;
    onClick(event);
  };

  // Loading indicator component
  const LoadingSpinner = () => (
    <span 
      className="loading-spinner"
      role="progressbar"
      aria-valuetext="Loading"
      style={{
        display: 'inline-block',
        width: '1em',
        height: '1em',
        marginRight: '0.5em',
        border: '2px solid currentColor',
        borderRightColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite'
      }}
    />
  );

  return (
    <ButtonContainer
      type={type}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onClick={handleClick}
      className={className}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      tabIndex={disabled ? -1 : tabIndex}
      data-testid="maritime-button"
      role="button"
    >
      {loading && <LoadingSpinner />}
      {children}
    </ButtonContainer>
  );
});

// Display name for debugging
Button.displayName = 'Button';

// Type declaration for component props
export type { ButtonProps };

// Default export
export default Button;