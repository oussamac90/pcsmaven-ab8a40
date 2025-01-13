import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';

// Internal imports
import {
  HeaderContainer,
  LogoSection,
  SearchSection,
  UserSection,
  NotificationSection
} from './Header.styles';
import { Button, IconButton } from '../../common/Button/Button';
import { useAuth } from '../../../hooks/useAuth';

// Interface definitions
interface HeaderProps {
  className?: string;
  onSearch?: (query: string) => Promise<void>;
  onNotificationClick?: (id: string) => void;
  dir?: 'ltr' | 'rtl';
  isOffline?: boolean;
}

// Constants
const SEARCH_PLACEHOLDER = 'Search vessels, cargo, or documents...';
const DEBOUNCE_DELAY = 300;
const NOTIFICATION_POLL_INTERVAL = 30000;
const USER_MENU_ITEMS = [
  { label: 'Profile', path: '/profile', icon: 'user' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
  { label: 'Logout', action: 'handleLogout', icon: 'logout' }
];

/**
 * Enhanced header component with accessibility, RTL support, and performance optimizations
 */
export const Header = React.memo<HeaderProps>(({
  className,
  onSearch,
  onNotificationClick,
  dir = 'ltr',
  isOffline = false
}) => {
  // Hooks
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  const [debouncedQuery] = useDebounce(searchQuery, DEBOUNCE_DELAY);

  // Handle search input changes
  const handleSearchChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
  }, []);

  // Handle search submission
  const handleSearch = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onSearch || !debouncedQuery.trim()) return;

    try {
      setIsSearching(true);
      await onSearch(debouncedQuery);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, onSearch]);

  // Handle user menu toggle
  const handleUserMenuToggle = useCallback(() => {
    setShowUserMenu(prev => !prev);
  }, []);

  // Handle user logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, navigate]);

  // Handle notification click
  const handleNotificationClick = useCallback((id: string) => {
    if (onNotificationClick) {
      onNotificationClick(id);
    }
  }, [onNotificationClick]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === '/' && event.ctrlKey) {
      event.preventDefault();
      searchInputRef.current?.focus();
    }
  }, []);

  // Setup keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll for notifications
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (!isOffline) {
      pollInterval = setInterval(async () => {
        // Implement notification polling logic here
      }, NOTIFICATION_POLL_INTERVAL);
    }

    return () => clearInterval(pollInterval);
  }, [isOffline]);

  return (
    <HeaderContainer 
      className={className}
      dir={dir}
      role="banner"
      aria-label="Main header"
    >
      <LogoSection>
        <Button
          variant="text"
          onClick={() => navigate('/')}
          aria-label="Go to homepage"
        >
          <img 
            src="/assets/logo.svg" 
            alt="Port Community System"
            width="160"
            height="40"
          />
        </Button>
      </LogoSection>

      <SearchSection>
        <form onSubmit={handleSearch} role="search">
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label="Search"
            disabled={isOffline}
            autoComplete="off"
            spellCheck="false"
          />
          <Button
            type="submit"
            variant="secondary"
            size="small"
            loading={isSearching}
            disabled={isOffline || !searchQuery.trim()}
            aria-label="Submit search"
          >
            Search
          </Button>
        </form>
      </SearchSection>

      <UserSection ref={userMenuRef}>
        <NotificationSection>
          <IconButton
            variant="text"
            onClick={() => handleNotificationClick('latest')}
            disabled={isOffline}
            aria-label={`Notifications ${notifications.length ? `(${notifications.length} unread)` : ''}`}
            className={notifications.length ? 'notification-badge' : ''}
          >
            <span className="visually-hidden">Notifications</span>
          </IconButton>
        </NotificationSection>

        <div className="user-menu-container">
          <Button
            variant="text"
            onClick={handleUserMenuToggle}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
            aria-label="User menu"
          >
            {user?.name || 'User'}
          </Button>

          {showUserMenu && (
            <div 
              className="user-menu"
              role="menu"
              aria-label="User menu"
            >
              {USER_MENU_ITEMS.map(item => (
                <Button
                  key={item.label}
                  variant="text"
                  onClick={() => {
                    if (item.action === 'handleLogout') {
                      handleLogout();
                    } else {
                      navigate(item.path);
                    }
                    setShowUserMenu(false);
                  }}
                  role="menuitem"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </UserSection>
    </HeaderContainer>
  );
});

Header.displayName = 'Header';

export default Header;