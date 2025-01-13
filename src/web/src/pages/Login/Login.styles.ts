import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../styles/breakpoints.styles';
import { fontFamily } from '../../styles/typography.styles';

// Background image for login page
const LOGIN_BACKGROUND = "url('/assets/images/login-bg.jpg')";

// Container for the entire login page
export const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  padding: ${theme.spacing.lg};
  background: linear-gradient(
    rgba(0, 51, 102, 0.8), 
    rgba(0, 51, 102, 0.9)
  ),
  ${LOGIN_BACKGROUND};
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  @media print {
    background: white;
  }
`;

// Main login form container
export const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90%;
  max-width: 450px;
  padding: ${theme.spacing.xl};
  background: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.lg};
  transition: transform ${theme.transitions.normal};

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    width: 400px;
    padding: ${theme.spacing.xxl};
  }

  &:hover {
    transform: translateY(-2px);
  }
`;

// Logo component for the login page
export const LoginLogo = styled.img`
  width: 120px;
  height: auto;
  margin-bottom: ${theme.spacing.xl};
  
  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    width: 160px;
  }
`;

// Login page title
export const LoginTitle = styled.h1`
  font-family: ${fontFamily.primary};
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary};
  margin-bottom: ${theme.spacing.lg};
  text-align: center;

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    font-size: 2rem;
  }
`;

// Styled input fields
export const LoginInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.sm};
  font-family: ${fontFamily.primary};
  font-size: ${theme.typography.fontSize.md};
  transition: border-color ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 2px ${theme.colors.accent}20;
  }

  &::placeholder {
    color: ${theme.colors.textSecondary};
  }

  &:disabled {
    background-color: ${theme.colors.surface};
    cursor: not-allowed;
  }
`;

// Submit button styles
export const LoginButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};
  background-color: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  font-family: ${fontFamily.primary};
  font-size: ${theme.typography.fontSize.md};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background-color ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background-color: ${theme.colors.secondary};
  }

  &:disabled {
    background-color: ${theme.colors.disabled};
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.accent}40;
  }
`;

// Error message styles
export const LoginError = styled.div`
  width: 100%;
  padding: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.error};
  font-size: ${theme.typography.fontSize.sm};
  text-align: center;
  background-color: ${theme.colors.error}10;
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${theme.colors.error}20;
`;

// Forgot password link
export const ForgotPassword = styled.a`
  color: ${theme.colors.secondary};
  font-size: ${theme.typography.fontSize.sm};
  text-decoration: none;
  margin-top: ${theme.spacing.md};
  transition: color ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.accent};
    text-decoration: underline;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.accent}40;
  }
`;

// Loading spinner animation
export const loadingAnimation = css`
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Loading spinner component
export const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${theme.colors.background};
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
  ${loadingAnimation}
`;