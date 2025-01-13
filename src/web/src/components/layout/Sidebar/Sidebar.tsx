import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';
import { useIntersectionObserver } from 'react-intersection-observer';

// Internal imports
import {
  SidebarContainer,
  NavList,
  NavItem,
  NavIcon,
  NavText,
  SidebarOverlay
} from './Sidebar.styles';
import routes from '../../../config/routes.config';
import { useAuth } from '../../../hooks/useAuth';

// Interfaces
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isRTL?: boolean;
  className?: string;
  testId?: string;
}

interface NavItemProps {
  path: string;
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
  prefetch?: boolean;
  ariaLabel?: string;
  role?: string;
}

// Constants
const MOBILE_BREAKPOINT = 768;
const TOUCH_THRESHOLD = 50;
const ANIMATION_DURATION = 300;

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  isRTL = false,
  className,
  testId = 'sidebar'
}) => {
  // Hooks
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, validateAccess } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

  // State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Intersection observer for performance optimization
  const { ref: observerRef, inView } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: false
  });

  // Memoized navigation items based on user roles
  const navigationItems = useMemo(() => {
    if (!user || !isAuthenticated) return [];

    return routes
      .filter(route => {
        if (!route.roles) return true;
        return route.roles.some(role => validateAccess(role));
      })
      .map(route => ({
        path: route.path,
        icon: route.icon,
        text: route.meta?.title || '',
        prefetch: route.prefetch,
        ariaLabel: `Navigate to ${route.meta?.title}`,
        role: 'menuitem'
      }));
  }, [user, isAuthenticated, validateAccess]);

  // Touch gesture handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartX.current) return;

    const touchEndX = e.touches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;

    if (Math.abs(deltaX) > TOUCH_THRESHOLD) {
      if ((isRTL && deltaX > 0) || (!isRTL && deltaX < 0)) {
        onToggle();
      }
    }
  }, [isRTL, onToggle]);

  const handleTouchEnd = useCallback(() => {
    touchStartX.current = 0;
  }, []);

  // Handle transition animation
  useEffect(() => {
    if (isCollapsed !== undefined) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, ANIMATION_DURATION);

      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  // Handle mobile overlay
  useEffect(() => {
    setShowOverlay(!isCollapsed && isMobile);
  }, [isCollapsed, isMobile]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  }, [navigate]);

  // Render navigation items
  const renderNavItems = useCallback(() => {
    return navigationItems.map((item, index) => {
      const isActive = location.pathname.startsWith(item.path);

      return (
        <NavItem
          key={`nav-item-${index}`}
          as={Link}
          to={item.path}
          isActive={isActive}
          isCollapsed={isCollapsed}
          role={item.role}
          aria-label={item.ariaLabel}
          tabIndex={0}
          onKeyDown={(e) => handleKeyDown(e, item.path)}
          data-testid={`nav-item-${index}`}
        >
          <NavIcon isCollapsed={isCollapsed} isRTL={isRTL}>
            {item.icon}
          </NavIcon>
          <NavText isCollapsed={isCollapsed}>
            {item.text}
          </NavText>
        </NavItem>
      );
    });
  }, [navigationItems, location.pathname, isCollapsed, isRTL, handleKeyDown]);

  return (
    <>
      <SidebarContainer
        ref={sidebarRef}
        isCollapsed={isCollapsed}
        isRTL={isRTL}
        className={className}
        data-testid={testId}
        aria-expanded={!isCollapsed}
        role="navigation"
        aria-label="Main navigation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div ref={observerRef}>
          <NavList role="menu">
            {inView && renderNavItems()}
          </NavList>
        </div>
      </SidebarContainer>

      {showOverlay && (
        <SidebarOverlay
          isCollapsed={isCollapsed}
          onClick={onToggle}
          data-testid="sidebar-overlay"
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;