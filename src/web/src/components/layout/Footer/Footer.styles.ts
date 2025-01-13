import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../../styles/breakpoints.styles';
import { fontFamily } from '../../../styles/typography.styles';

// Footer height constants for different breakpoints
const FOOTER_HEIGHT = {
  mobile: '80px',
  tablet: '64px',
  desktop: '64px'
} as const;

// Helper function to create responsive footer styles
const createResponsiveFooterStyles = (
  baseStyles: any,
  breakpointStyles: Record<string, any> = {}
) => css`
  ${baseStyles}

  @media (min-width: ${BREAKPOINT_VALUES.tablet}px) {
    ${breakpointStyles.tablet}
  }

  @media (min-width: ${BREAKPOINT_VALUES.desktop}px) {
    ${breakpointStyles.desktop}
  }
`;

// Main footer container with responsive height and maritime theme
export const FooterContainer = styled.footer`
  ${createResponsiveFooterStyles(
    {
      width: '100%',
      height: FOOTER_HEIGHT.mobile,
      backgroundColor: theme.colors.primary,
      color: theme.colors.background,
      position: 'relative',
      zIndex: theme.zIndex.footer,
      boxShadow: theme.shadows.sm,
      transition: theme.transitions.normal
    },
    {
      tablet: {
        height: FOOTER_HEIGHT.tablet
      },
      desktop: {
        height: FOOTER_HEIGHT.desktop
      }
    }
  )}
`;

// Footer content wrapper with proper spacing and RTL support
export const FooterContent = styled.div`
  ${createResponsiveFooterStyles(
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      maxWidth: theme.layout.maxWidth,
      margin: '0 auto',
      padding: `0 ${theme.spacing.md}`,

      '[dir="rtl"] &': {
        flexDirection: 'column-reverse'
      }
    },
    {
      tablet: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: `0 ${theme.spacing.lg}`
      }
    }
  )}
`;

// Footer navigation with accessibility features and focus states
export const FooterLinks = styled.nav`
  ${createResponsiveFooterStyles(
    {
      display: 'flex',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      fontFamily: fontFamily.primary,
      fontSize: theme.typography.fontSize.sm,

      'a': {
        color: theme.colors.background,
        textDecoration: 'none',
        transition: theme.transitions.fast,
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        borderRadius: theme.borderRadius.sm,

        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)'
        },

        '&:focus-visible': {
          outline: `2px solid ${theme.colors.accent}`,
          outlineOffset: '2px'
        }
      },

      '[dir="rtl"] &': {
        flexDirection: 'row-reverse'
      }
    },
    {
      tablet: {
        marginBottom: 0
      }
    }
  )}
`;

// Footer copyright section with proper contrast and typography
export const FooterCopyright = styled.div`
  ${createResponsiveFooterStyles(
    {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: theme.typography.fontSize.xs,
      fontFamily: fontFamily.primary,
      textAlign: 'center',

      '[dir="rtl"] &': {
        textAlign: 'right'
      }
    },
    {
      tablet: {
        textAlign: 'right'
      }
    }
  )}
`;