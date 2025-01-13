import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { createResponsiveStyles } from '../../../styles/breakpoints.styles';

// Container for the entire cargo manifest component
export const Container = styled.div`
  ${createResponsiveStyles(
    {
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      boxShadow: theme.shadows.sm,
      margin: `${theme.spacing.md} 0`,
      transition: theme.transitions.normal,
      
      // RTL Support
      '[dir="rtl"] &': {
        textAlign: 'right'
      }
    },
    {
      tablet: {
        padding: theme.spacing.xl,
        marginBottom: theme.spacing.lg
      },
      desktop: {
        padding: theme.spacing.xxl,
        maxWidth: theme.layout.contentWidth
      }
    }
  )}
`;

// Header section with title and actions
export const Header = styled.div`
  ${createResponsiveStyles(
    {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      
      // Typography
      fontFamily: theme.typography.fontFamily.primary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
      
      // RTL Support
      '[dir="rtl"] &': {
        flexDirection: 'row-reverse'
      }
    },
    {
      mobile: {
        flexDirection: 'column',
        gap: theme.spacing.md
      },
      tablet: {
        flexDirection: 'row'
      }
    }
  )}
`;

// Container for the manifest data table
export const TableContainer = styled.div`
  ${createResponsiveStyles(
    {
      width: '100%',
      overflowX: 'auto',
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.sm,
      border: `1px solid ${theme.colors.border}`,
      
      // Scrollbar styling
      '&::-webkit-scrollbar': {
        height: '8px'
      },
      '&::-webkit-scrollbar-track': {
        background: theme.colors.surface
      },
      '&::-webkit-scrollbar-thumb': {
        background: theme.colors.secondary,
        borderRadius: '4px'
      },
      
      // RTL Support
      '[dir="rtl"] &': {
        direction: 'rtl'
      }
    },
    {
      mobile: {
        margin: `${theme.spacing.md} 0`
      },
      tablet: {
        margin: `${theme.spacing.lg} 0`
      }
    }
  )}
`;

// Status indicator styles
export const StatusIndicator = styled.span<{ status: 'pending' | 'approved' | 'rejected' }>`
  ${({ status }) => css`
    display: inline-flex;
    align-items: center;
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    borderRadius: ${theme.borderRadius.sm};
    fontSize: ${theme.typography.fontSize.sm};
    fontWeight: ${theme.typography.fontWeight.medium};
    
    ${status === 'pending' && css`
      backgroundColor: ${theme.colors.warning}20;
      color: ${theme.colors.warning};
    `}
    
    ${status === 'approved' && css`
      backgroundColor: ${theme.colors.success}20;
      color: ${theme.colors.success};
    `}
    
    ${status === 'rejected' && css`
      backgroundColor: ${theme.colors.error}20;
      color: ${theme.colors.error};
    `}
  `}
`;

// Action buttons container
export const Actions = styled.div`
  ${createResponsiveStyles(
    {
      display: 'flex',
      gap: theme.spacing.sm,
      alignItems: 'center',
      
      // RTL Support
      '[dir="rtl"] &': {
        flexDirection: 'row-reverse'
      }
    },
    {
      mobile: {
        width: '100%',
        justifyContent: 'flex-start'
      },
      tablet: {
        width: 'auto'
      }
    }
  )}
`;

// Empty state container
export const EmptyState = styled.div`
  ${createResponsiveStyles(
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      
      '& svg': {
        marginBottom: theme.spacing.md,
        color: theme.colors.secondary
      }
    },
    {
      mobile: {
        padding: theme.spacing.lg
      },
      tablet: {
        padding: theme.spacing.xl
      }
    }
  )}
`;

// Loading state overlay
export const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  alignItems: center;
  justifyContent: center;
  backgroundColor: ${theme.colors.overlay};
  borderRadius: ${theme.borderRadius.md};
  zIndex: ${theme.zIndex.overlay};
`;