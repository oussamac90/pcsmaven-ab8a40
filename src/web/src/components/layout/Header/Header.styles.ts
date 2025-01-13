import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES, createResponsiveStyles } from '../../../styles/breakpoints.styles';

// Global header height constants for consistent sizing
const HEADER_HEIGHT = {
  mobile: theme.spacing.xl,
  tablet: theme.spacing.xxl,
  desktop: theme.spacing.xxl
} as const;

// Logo sizing constants
const LOGO_WIDTH = {
  mobile: '120px',
  tablet: '160px',
  desktop: '200px'
} as const;

// Helper function for creating responsive header styles
const createResponsiveHeaderStyles = (
  baseStyles: any,
  breakpointStyles: Record<string, any> = {}
) => {
  return createResponsiveStyles({
    ...baseStyles,
    transition: theme.transitions.normal,
    '@media print': {
      display: 'none'
    }
  }, breakpointStyles);
};

// Main header container
export const HeaderContainer = styled.header`
  ${createResponsiveHeaderStyles(
    {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: HEADER_HEIGHT.mobile,
      backgroundColor: theme.colors.primary,
      color: theme.colors.background,
      padding: `0 ${theme.spacing.md}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: theme.shadows.md,
      zIndex: theme.zIndex.header,
      
      '[dir="rtl"] &': {
        flexDirection: 'row-reverse'
      }
    },
    {
      tablet: {
        height: HEADER_HEIGHT.tablet,
        padding: `0 ${theme.spacing.lg}`
      },
      desktop: {
        height: HEADER_HEIGHT.desktop,
        padding: `0 ${theme.spacing.xl}`
      }
    }
  )}
`;

// Logo section styling
export const LogoSection = styled.div`
  ${createResponsiveHeaderStyles(
    {
      display: 'flex',
      alignItems: 'center',
      width: LOGO_WIDTH.mobile,
      
      img: {
        height: 'auto',
        maxWidth: '100%'
      }
    },
    {
      tablet: {
        width: LOGO_WIDTH.tablet
      },
      desktop: {
        width: LOGO_WIDTH.desktop
      }
    }
  )}
`;

// Search section styling
export const SearchSection = styled.div`
  ${createResponsiveHeaderStyles(
    {
      display: 'none', // Hidden on mobile
      alignItems: 'center',
      flex: '1 1 auto',
      margin: `0 ${theme.spacing.lg}`,
      maxWidth: '600px',
      
      input: {
        width: '100%',
        height: '40px',
        padding: `0 ${theme.spacing.md}`,
        borderRadius: theme.borderRadius.md,
        border: 'none',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: theme.colors.background,
        
        '&::placeholder': {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        
        '&:focus': {
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          outline: 'none'
        }
      }
    },
    {
      tablet: {
        display: 'flex'
      }
    }
  )}
`;

// User section styling
export const UserSection = styled.div`
  ${createResponsiveHeaderStyles(
    {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.md,
      
      button: {
        backgroundColor: 'transparent',
        border: 'none',
        color: theme.colors.background,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)'
        },
        
        '&:focus-visible': {
          outline: `2px solid ${theme.colors.accent}`,
          outlineOffset: '2px'
        }
      },
      
      '.notification-badge': {
        position: 'relative',
        
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '0',
          right: '0',
          width: '8px',
          height: '8px',
          backgroundColor: theme.colors.warning,
          borderRadius: '50%',
          transform: 'translate(25%, -25%)'
        }
      }
    },
    {
      tablet: {
        gap: theme.spacing.lg
      }
    }
  )}
`;