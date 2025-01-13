import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';

// Interface for button styling props
interface ButtonStyleProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  ariaLabel?: string;
  ariaExpanded?: boolean;
}

// Button size configurations
const BUTTON_SIZES = {
  small: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.fontSize.sm,
    minWidth: '80px'
  },
  medium: {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    fontSize: theme.typography.fontSize.md,
    minWidth: '120px'
  },
  large: {
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    fontSize: theme.typography.fontSize.lg,
    minWidth: '160px'
  }
} as const;

// Button variant style configurations
const BUTTON_VARIANTS = {
  primary: {
    background: theme.colors.primary,
    color: '#FFFFFF',
    hoverBackground: '#004080', // 10% darker
    activeBackground: '#002B59' // 20% darker
  },
  secondary: {
    background: theme.colors.secondary,
    color: '#FFFFFF',
    hoverBackground: '#0052A3', // 10% darker
    activeBackground: '#003D7A' // 20% darker
  },
  accent: {
    background: theme.colors.accent,
    color: '#FFFFFF',
    hoverBackground: '#0082B3', // 10% darker
    activeBackground: '#006186' // 20% darker
  },
  outline: {
    background: 'transparent',
    color: theme.colors.primary,
    border: `2px solid ${theme.colors.primary}`,
    hoverBackground: 'rgba(0, 51, 102, 0.1)',
    activeBackground: 'rgba(0, 51, 102, 0.2)'
  }
} as const;

// Generate variant-specific styles
const getButtonVariantStyles = (props: ButtonStyleProps) => {
  const variant = props.variant || 'primary';
  const variantStyles = BUTTON_VARIANTS[variant];

  return css`
    background: ${variantStyles.background};
    color: ${variantStyles.color};
    border: ${variant === 'outline' ? variantStyles.border : 'none'};

    &:hover:not(:disabled) {
      background: ${variantStyles.hoverBackground};
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      background: ${variantStyles.activeBackground};
      transform: translateY(0);
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.primary};
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
};

// Generate size-specific styles
const getButtonSizeStyles = (props: ButtonStyleProps) => {
  const size = props.size || 'medium';
  const sizeStyles = BUTTON_SIZES[size];

  return css`
    padding: ${sizeStyles.padding};
    font-size: ${sizeStyles.fontSize};
    min-width: ${sizeStyles.minWidth};

    ${theme.breakpoints.down('tablet')} {
      padding: ${size === 'large' 
        ? `${theme.spacing.md} ${theme.spacing.lg}`
        : sizeStyles.padding};
      font-size: ${size === 'large' 
        ? theme.typography.fontSize.md 
        : sizeStyles.fontSize};
    }

    width: ${props.fullWidth ? '100%' : 'auto'};
  `;
};

// Styled button component
export const ButtonContainer = styled.button<ButtonStyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.md};
  font-family: ${theme.typography.fontFamily.primary};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  white-space: nowrap;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  user-select: none;
  -webkit-tap-highlight-color: transparent;

  /* Apply variant and size styles */
  ${props => getButtonVariantStyles(props)}
  ${props => getButtonSizeStyles(props)}

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 2px solid ButtonText;
  }

  /* Print styles */
  @media print {
    background: none !important;
    color: ${theme.colors.text} !important;
    border: 1px solid ${theme.colors.text} !important;
  }
`;