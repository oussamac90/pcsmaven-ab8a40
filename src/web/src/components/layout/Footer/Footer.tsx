import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAnalytics } from '@analytics/react';
import { FooterContainer, FooterContent, FooterLinks, FooterCopyright } from './Footer.styles';
import routes from '../../../config/routes.config';

// Props interface for the Footer component
interface FooterProps {
  className?: string;
  testId?: string;
}

// Helper function to filter and process footer links
const getFooterLinks = (routes: any[], userRoles: string[]) => {
  return routes
    .filter(route => {
      // Filter routes that should be shown in footer and match user roles
      const hasPermission = !route.roles || 
        route.roles.includes('public') || 
        route.roles.includes('all') ||
        route.roles.some(role => userRoles.includes(role));
      
      return hasPermission && route.path && route.path !== '*' && route.path !== 'login';
    })
    .map(route => ({
      path: route.path,
      title: route.meta?.title.split(' - ')[0] || route.path,
      analytics: route.analytics
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

// Memoized Footer component with maritime theme
export const Footer = React.memo<FooterProps>(({ className, testId = 'footer' }) => {
  // Initialize analytics tracking
  const analytics = useAnalytics();

  // Get current year for copyright
  const currentYear = new Date().getFullYear();

  // Mock user roles for demo - in production, get from auth context
  const userRoles = ['Port Authority', 'Terminal Operator'];

  // Memoize footer links to prevent unnecessary recalculation
  const footerLinks = useMemo(() => 
    getFooterLinks(routes, userRoles), [userRoles]
  );

  // Memoized analytics event handler
  const handleLinkClick = useCallback((path: string, analytics: any) => {
    if (analytics?.events) {
      analytics.events.forEach((event: string) => {
        analytics.track(event, {
          path,
          location: 'footer'
        });
      });
    }
  }, [analytics]);

  return (
    <FooterContainer 
      className={className} 
      data-testid={testId}
      role="contentinfo"
      aria-label="Site footer"
    >
      <FooterContent>
        <FooterLinks aria-label="Footer navigation">
          {footerLinks.map(({ path, title, analytics: linkAnalytics }) => (
            <Link
              key={path}
              to={path}
              onClick={() => handleLinkClick(path, linkAnalytics)}
              data-testid={`footer-link-${path}`}
            >
              {title}
            </Link>
          ))}
        </FooterLinks>
        
        <FooterCopyright>
          <span data-testid="footer-copyright">
            © {currentYear} Port Community System. All rights reserved.
          </span>
        </FooterCopyright>
      </FooterContent>
    </FooterContainer>
  );
});

// Display name for debugging
Footer.displayName = 'Footer';

export default Footer;