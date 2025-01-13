import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { mediaQueries } from '../../../styles/breakpoints.styles';

// Spacing constants for consistent layout
const FORM_SPACING = {
  gap: theme.spacing.md,
  padding: theme.spacing.lg,
  marginBottom: theme.spacing.xl,
  sectionGap: theme.spacing.lg
} as const;

// Create responsive container styles
const createResponsiveContainer = () => css`
  width: 100%;
  padding: ${FORM_SPACING.padding};
  background-color: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  border: 1px solid ${theme.colors.border};
  transition: box-shadow ${theme.transitions.normal};

  ${mediaQueries.mobile} {
    padding: ${theme.spacing.md};
  }

  ${mediaQueries.tablet} {
    width: 80%;
    max-width: 600px;
    margin: 0 auto;
    padding: ${theme.spacing.lg};
  }

  ${mediaQueries.desktop} {
    max-width: 800px;
    padding: ${theme.spacing.xl};
  }

  &:hover {
    box-shadow: ${theme.shadows.lg};
  }

  &:focus-within {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  [dir='rtl'] & {
    text-align: right;
  }
`;

export const PaymentFormContainer = styled.div`
  ${createResponsiveContainer()}
  display: flex;
  flex-direction: column;
  gap: ${FORM_SPACING.gap};
`;

export const FormSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${FORM_SPACING.sectionGap};
  padding: ${theme.spacing.lg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.surface};

  ${mediaQueries.mobile} {
    padding: ${theme.spacing.md};
  }

  &:not(:last-child) {
    margin-bottom: ${FORM_SPACING.marginBottom};
  }
`;

export const PaymentMethodSelector = styled.div`
  display: grid;
  gap: ${theme.spacing.md};
  
  ${mediaQueries.tablet} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${mediaQueries.desktop} {
    grid-template-columns: repeat(3, 1fr);
  }

  label {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.md};
    border: 1px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.sm};
    cursor: pointer;
    transition: all ${theme.transitions.normal};

    &:hover {
      background-color: ${theme.colors.surface};
      border-color: ${theme.colors.secondary};
    }

    &:has(input:checked) {
      background-color: ${theme.colors.surface};
      border-color: ${theme.colors.primary};
      box-shadow: ${theme.shadows.sm};
    }

    &:has(input:focus-visible) {
      outline: 2px solid ${theme.colors.primary};
      outline-offset: 2px;
    }
  }

  input[type="radio"] {
    width: 20px;
    height: 20px;
    margin: 0;
  }
`;

export const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};

  ${mediaQueries.mobile} {
    flex-direction: column;
    
    button {
      width: 100%;
    }
  }

  [dir='rtl'] & {
    justify-content: flex-start;
  }
`;

export const ErrorMessage = styled.span`
  color: ${theme.colors.error};
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.xs};
`;

export const PaymentAmount = styled.div`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary};
  text-align: center;
  margin: ${theme.spacing.lg} 0;
`;

export const PaymentDetails = styled.div`
  display: grid;
  gap: ${theme.spacing.md};
  
  ${mediaQueries.tablet} {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const CardNumberInput = styled.input`
  font-family: ${theme.typography.fontFamily.monospace};
  letter-spacing: 0.2em;
`;

export const SecurityCodeInput = styled.input`
  width: 80px;
  text-align: center;
  font-family: ${theme.typography.fontFamily.monospace};
`;