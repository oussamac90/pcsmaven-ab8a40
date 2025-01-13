import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { createResponsiveStyles } from '../../../styles/breakpoints.styles';
import { fontSize } from '../../../styles/typography.styles';

// Form spacing constants
const FORM_SPACING = {
  groupMargin: theme.spacing.md,
  labelMargin: theme.spacing.sm,
  errorMargin: theme.spacing.xs,
  inputPadding: theme.spacing.sm,
  containerPadding: theme.spacing.lg,
} as const;

// Base form container styles with maritime theme
export const FormContainer = styled.form`
  ${createResponsiveStyles(
    {
      padding: FORM_SPACING.containerPadding,
      backgroundColor: theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.md,
      boxShadow: theme.shadows.sm,
      width: '100%',
      maxWidth: '100%',
      margin: '0 auto',
      transition: theme.transitions.normal,

      '&:focus-within': {
        boxShadow: theme.shadows.md,
        borderColor: theme.colors.primary,
      }
    },
    {
      tablet: {
        maxWidth: '600px',
        padding: theme.spacing.xl,
      },
      desktop: {
        maxWidth: '800px',
      }
    }
  )}
`;

// Form group wrapper for label-input combinations
export const FormGroup = styled.div`
  ${css`
    display: flex;
    flex-direction: column;
    margin-bottom: ${FORM_SPACING.groupMargin};
    width: 100%;

    &:last-child {
      margin-bottom: 0;
    }

    &[data-layout="horizontal"] {
      ${createResponsiveStyles(
        {},
        {
          tablet: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,

            '> label': {
              flex: '0 0 200px',
              marginBottom: 0,
            }
          }
        }
      )}
    }
  `}
`;

// Form label with maritime typography
export const FormLabel = styled.label`
  ${css`
    color: ${theme.colors.text};
    font-size: ${fontSize.sm};
    font-weight: ${theme.typography.fontWeight.medium};
    margin-bottom: ${FORM_SPACING.labelMargin};
    transition: color ${theme.transitions.fast};

    &[data-required="true"]::after {
      content: "*";
      color: ${theme.colors.error};
      margin-left: ${theme.spacing.xs};
    }

    &[data-disabled="true"] {
      color: ${theme.colors.disabled};
    }
  `}
`;

// Form error message with animation
export const FormError = styled.span`
  ${css`
    color: ${theme.colors.error};
    font-size: ${fontSize.sm};
    margin-top: ${FORM_SPACING.errorMargin};
    opacity: 0;
    transform: translateY(-4px);
    transition: all ${theme.transitions.fast};

    &[data-visible="true"] {
      opacity: 1;
      transform: translateY(0);
    }

    &::before {
      content: "⚠";
      margin-right: ${theme.spacing.xs};
    }
  `}
`;

// Form input base styles for composition
export const formInputStyles = css`
  width: 100%;
  padding: ${FORM_SPACING.inputPadding};
  font-size: ${fontSize.md};
  color: ${theme.colors.text};
  background-color: ${theme.colors.background};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.sm};
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    border-color: ${theme.colors.secondary};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 2px ${theme.colors.primary}20;
  }

  &:disabled {
    background-color: ${theme.colors.surface};
    color: ${theme.colors.disabled};
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${theme.colors.textSecondary};
  }

  &[aria-invalid="true"] {
    border-color: ${theme.colors.error};
    
    &:focus {
      box-shadow: 0 0 0 2px ${theme.colors.error}20;
    }
  }
`;