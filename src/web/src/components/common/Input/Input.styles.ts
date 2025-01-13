import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { fontSize, fontFamily } from '../../../styles/typography.styles';

// Constants for consistent input styling
const INPUT_HEIGHT = '40px';
const BORDER_RADIUS = '4px';
const TRANSITION_DURATION = '0.2s';

// Helper function to create base input styles
const createInputStyles = (hasError?: boolean, disabled?: boolean) => css`
  width: 100%;
  height: ${INPUT_HEIGHT};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${theme.colors.background};
  border: 1px solid ${hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${BORDER_RADIUS};
  color: ${disabled ? theme.colors.disabled : theme.colors.text};
  font-family: ${fontFamily.primary};
  font-size: ${fontSize.sm};
  transition: all ${TRANSITION_DURATION} ease-in-out;

  // Responsive font sizing
  ${theme.breakpoints.up('tablet')} {
    font-size: ${fontSize.md};
  }

  // Focus state
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 2px ${theme.colors.accent}20;
  }

  // Disabled state
  &:disabled {
    background-color: ${theme.colors.surface};
    cursor: not-allowed;
    opacity: 0.7;
  }

  // Error state
  ${hasError && css`
    &:focus {
      border-color: ${theme.colors.error};
      box-shadow: 0 0 0 2px ${theme.colors.error}20;
    }
  `}

  // Placeholder styling
  &::placeholder {
    color: ${theme.colors.textSecondary};
    opacity: 0.7;
  }

  // RTL support
  [dir='rtl'] & {
    text-align: right;
  }
`;

// Styled container for input and related elements
export const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  width: 100%;
  margin-bottom: ${theme.spacing.md};
`;

// Styled input element
export const StyledInput = styled.input<{
  hasError?: boolean;
  disabled?: boolean;
}>`
  ${({ hasError, disabled }) => createInputStyles(hasError, disabled)}
`;

// Styled label for input
export const InputLabel = styled.label`
  color: ${theme.colors.text};
  font-family: ${fontFamily.primary};
  font-size: ${fontSize.sm};
  font-weight: 500;
  margin-bottom: ${theme.spacing.xs};

  // RTL support
  [dir='rtl'] & {
    text-align: right;
  }

  // Disabled state
  ${StyledInput}:disabled + & {
    color: ${theme.colors.disabled};
  }
`;

// Error message styling
export const ErrorText = styled.span`
  color: ${theme.colors.error};
  font-family: ${fontFamily.primary};
  font-size: ${fontSize.sm};
  margin-top: ${theme.spacing.xs};
  
  // Animation for error appearance
  animation: errorShake 0.6s ease-in-out;

  @keyframes errorShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }

  // RTL support
  [dir='rtl'] & {
    text-align: right;
  }
`;