import { lazy, Suspense } from 'react'; // v18.0.0
import { RouteObject } from 'react-router-dom'; // v6.0.0
import { Analytics } from '@analytics/react'; // v0.1.0
import { AuthGuard } from '@auth0/auth0-react'; // v2.0.0
import { Layout } from '@components/layout'; // v1.0.0
import { ErrorBoundary } from '@components/error-boundary'; // v1.0.0
import { LoadingFallback } from '@components/loading-fallback'; // v1.0.0

// Lazy loaded components
const Login = lazy(() => import('@pages/login'));
const Dashboard = lazy(() => import('@pages/dashboard'));
const VesselManagement = lazy(() => import('@pages/vessel-management'));
const DocumentCenter = lazy(() => import('@pages/document-center'));
const FinancialPortal = lazy(() => import('@pages/financial-portal'));
const Operations = lazy(() => import('@pages/operations'));

// Enhanced route configuration interface
interface RouteConfig extends RouteObject {
  roles?: string[];
  meta?: {
    title: string;
    description: string;
  };
  analytics?: {
    pageView: boolean;
    events: string[];
  };
  errorBoundary?: boolean;
  breadcrumb?: {
    title: string;
    parent?: string;
  };
  children?: RouteConfig[];
}

// Wrap lazy loaded components with Suspense and error handling
const wrapWithSuspense = (
  Component: React.LazyExoticComponent<any>,
  config: RouteConfig
): React.ReactNode => {
  return (
    <ErrorBoundary enabled={config.errorBoundary ?? false}>
      <Suspense fallback={<LoadingFallback />}>
        <Analytics pageView={config.analytics?.pageView} events={config.analytics?.events}>
          <AuthGuard roles={config.roles}>
            <Component />
          </AuthGuard>
        </Analytics>
      </Suspense>
    </ErrorBoundary>
  );
};

// Main route configuration
export const routes: RouteConfig[] = [
  {
    path: '/',
    element: <Layout />,
    errorBoundary: true,
    children: [
      {
        path: 'login',
        element: wrapWithSuspense(Login, {
          roles: ['public'],
          meta: {
            title: 'Login - Port Community System',
            description: 'Secure access to Port Community System'
          },
          analytics: {
            pageView: true,
            events: ['login_view', 'login_attempt']
          }
        })
      },
      {
        path: 'dashboard',
        element: wrapWithSuspense(Dashboard, {
          roles: ['all'],
          errorBoundary: true,
          meta: {
            title: 'Dashboard - Port Community System',
            description: 'Operational overview dashboard'
          },
          analytics: {
            pageView: true,
            events: ['dashboard_view']
          },
          breadcrumb: {
            title: 'Dashboard'
          }
        })
      },
      {
        path: 'vessel-management/*',
        element: wrapWithSuspense(VesselManagement, {
          roles: ['Port Authority', 'Terminal Operator', 'Shipping Line'],
          errorBoundary: true,
          meta: {
            title: 'Vessel Management - Port Community System',
            description: 'Vessel operations and scheduling'
          },
          analytics: {
            pageView: true,
            events: ['vessel_view', 'vessel_operation']
          },
          breadcrumb: {
            title: 'Vessel Management',
            parent: 'dashboard'
          }
        })
      },
      {
        path: 'document-center/*',
        element: wrapWithSuspense(DocumentCenter, {
          roles: ['Port Authority', 'Customs', 'Shipping Line'],
          errorBoundary: true,
          meta: {
            title: 'Document Center - Port Community System',
            description: 'Document management and processing'
          },
          analytics: {
            pageView: true,
            events: ['document_view', 'document_upload']
          },
          breadcrumb: {
            title: 'Document Center',
            parent: 'dashboard'
          }
        })
      },
      {
        path: 'financial-portal/*',
        element: wrapWithSuspense(FinancialPortal, {
          roles: ['Port Authority', 'Finance'],
          errorBoundary: true,
          meta: {
            title: 'Financial Portal - Port Community System',
            description: 'Billing and payment management'
          },
          analytics: {
            pageView: true,
            events: ['finance_view', 'payment_process']
          },
          breadcrumb: {
            title: 'Financial Portal',
            parent: 'dashboard'
          }
        })
      },
      {
        path: 'operations/*',
        element: wrapWithSuspense(Operations, {
          roles: ['Port Authority', 'Terminal Operator'],
          errorBoundary: true,
          meta: {
            title: 'Operations - Port Community System',
            description: 'Port operations management'
          },
          analytics: {
            pageView: true,
            events: ['operations_view', 'operation_execute']
          },
          breadcrumb: {
            title: 'Operations',
            parent: 'dashboard'
          }
        })
      },
      {
        path: '*',
        element: wrapWithSuspense(lazy(() => import('@pages/not-found')), {
          roles: ['public'],
          meta: {
            title: 'Not Found - Port Community System',
            description: 'Page not found'
          },
          analytics: {
            pageView: true,
            events: ['not_found_view']
          }
        })
      }
    ]
  }
];

// Helper function to filter routes based on user roles and authentication
export const getAuthorizedRoutes = (
  userRoles: string[],
  isAuthenticated: boolean
): RouteConfig[] => {
  const filterRoutes = (routes: RouteConfig[]): RouteConfig[] => {
    return routes.filter(route => {
      // Allow public routes
      if (route.roles?.includes('public')) {
        return true;
      }

      // Require authentication for protected routes
      if (!isAuthenticated) {
        return false;
      }

      // Allow routes marked for all authenticated users
      if (route.roles?.includes('all')) {
        return true;
      }

      // Check specific role permissions
      return route.roles?.some(role => userRoles.includes(role));
    }).map(route => ({
      ...route,
      children: route.children ? filterRoutes(route.children) : undefined
    }));
  };

  return filterRoutes(routes);
};

export default routes;