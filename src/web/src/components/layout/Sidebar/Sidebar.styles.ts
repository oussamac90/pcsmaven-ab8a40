import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { BREAKPOINT_VALUES } from '../../../styles/breakpoints.styles';

// Interface for styled components props with RTL support
export interface SidebarStyleProps {
  isCollapsed: boolean;
  isActive?: boolean;
  isRTL?: boolean;
}

// Constants for sidebar dimensions and transitions
const SIDEBAR_WIDTH = {
  expanded: '240px',
  collapsed: '64px',
  mobile: '100%'
} as const;

const TRANSITION_DURATION = '0.3s';

const Z_INDEX = {
  sidebar: 1000,
  overlay: 999
} as const;

// Helper function for generating collapsed state styles
const getCollapsedStyles = (isCollapsed: boolean, isRTL?: boolean) => css`
  width: ${isCollapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded};
  transform: translateX(
    ${isCollapsed
      ? isRTL
        ? '100%'
        : '-100%'
      : '0'
    }
  );

  @media (max-width: ${BREAKPOINT_VALUES.mobile}px) {
    width: ${SIDEBAR_WIDTH.mobile};
    transform: translateX(
      ${isCollapsed
        ? isRTL
          ? '100%'
          : '-100%'
        : '0'
      }
    );
  }
`;

// Styled components
export const SidebarContainer = styled.aside<SidebarStyleProps>`
  position: fixed;
  top: 0;
  ${({ isRTL }) => isRTL ? 'right: 0' : 'left: 0'};
  height: 100vh;
  background-color: ${theme.colors.primary};
  color: ${theme.colors.background};
  padding: ${theme.spacing.md};
  overflow-y: auto;
  z-index: ${Z_INDEX.sidebar};
  transition: all ${TRANSITION_DURATION} ease-in-out;
  box-shadow: ${theme.shadows.md};
  
  ${({ isCollapsed, isRTL }) => getCollapsedStyles(isCollapsed, isRTL)}

  @media (max-width: ${BREAKPOINT_VALUES.tablet}px) {
    padding: ${theme.spacing.sm};
  }
`;

export const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${theme.spacing.lg} 0;
`;

export const NavItem = styled.li<SidebarStyleProps>`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin: ${theme.spacing.xs} 0;
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  transition: background-color ${TRANSITION_DURATION} ease-in-out;
  
  ${({ isActive }) => isActive && css`
    background-color: ${theme.colors.secondary};
  `}

  &:hover {
    background-color: ${theme.colors.accent};
  }

  @media (max-width: ${BREAKPOINT_VALUES.tablet}px) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
  }
`;

export const NavIcon = styled.span<SidebarStyleProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-${({ isRTL }) => isRTL ? 'left' : 'right'}: ${theme.spacing.sm};
  color: ${theme.colors.background};
`;

export const NavText = styled.span<SidebarStyleProps>`
  font-family: ${theme.typography.fontFamily.primary};
  font-size: ${theme.typography.fontSize.md};
  font-weight: ${theme.typography.fontWeight.medium};
  white-space: nowrap;
  opacity: ${({ isCollapsed }) => isCollapsed ? 0 : 1};
  visibility: ${({ isCollapsed }) => isCollapsed ? 'hidden' : 'visible'};
  transition: opacity ${TRANSITION_DURATION} ease-in-out,
              visibility ${TRANSITION_DURATION} ease-in-out;
`;

export const SidebarOverlay = styled.div<SidebarStyleProps>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: ${theme.colors.overlay};
  z-index: ${Z_INDEX.overlay};
  opacity: ${({ isCollapsed }) => isCollapsed ? 0 : 1};
  visibility: ${({ isCollapsed }) => isCollapsed ? 'hidden' : 'visible'};
  transition: opacity ${TRANSITION_DURATION} ease-in-out,
              visibility ${TRANSITION_DURATION} ease-in-out;
  
  @media (min-width: ${BREAKPOINT_VALUES.desktop}px) {
    display: none;
  }
`;