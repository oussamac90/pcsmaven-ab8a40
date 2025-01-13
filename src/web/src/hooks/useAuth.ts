// External imports - versions specified in package.json
import { useDispatch, useSelector } from 'react-redux'; // v8.0.5
import { useCallback, useMemo } from 'react'; // v18.2.0
import { SecurityUtils } from '@auth0/security-utils'; // v1.0.0

// Internal imports
import { authService, UserRole } from '../services/auth.service';
import { ApiError, ErrorCode } from '../utils/api.utils';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
}

interface LoginCredentials {
  username: string;
  password: string;
  mfaCode?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: ApiError | null;
  mfaRequired: boolean;
  sessionExpiry: number | null;
}

// Constants
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const MAX_RETRY_ATTEMPTS = 3;
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

/**
 * Custom hook for managing authentication state and operations
 * Provides comprehensive authentication functionality with enhanced security features
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const authState = useSelector((state: { auth: AuthState }) => state.auth);

  // Memoized session expiry check
  const isSessionExpired = useMemo(() => {
    if (!authState.sessionExpiry) return true;
    return Date.now() >= authState.sessionExpiry;
  }, [authState.sessionExpiry]);

  /**
   * Handles user login with optional MFA support
   * @param credentials User login credentials
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'auth/loginStart' });

      // Validate credentials before sending
      if (!SecurityUtils.validateCredentials(credentials)) {
        throw new Error('Invalid credentials format');
      }

      const response = await authService.login(credentials);

      if (response.mfaRequired && !credentials.mfaCode) {
        dispatch({ type: 'auth/mfaRequired' });
        return;
      }

      dispatch({
        type: 'auth/loginSuccess',
        payload: {
          user: response.user,
          sessionExpiry: Date.now() + SESSION_TIMEOUT
        }
      });

      // Initialize token refresh cycle
      initializeTokenRefresh();

    } catch (error) {
      dispatch({
        type: 'auth/loginFailure',
        payload: error instanceof Error ? error : new Error('Login failed')
      });
      throw error;
    }
  }, [dispatch]);

  /**
   * Verifies MFA code during two-factor authentication
   * @param mfaCode MFA verification code
   */
  const verifyMFA = useCallback(async (mfaCode: string) => {
    try {
      dispatch({ type: 'auth/verifyMFAStart' });

      if (!SecurityUtils.validateMFACode(mfaCode)) {
        throw new Error('Invalid MFA code format');
      }

      await authService.verifyMFA(mfaCode);
      dispatch({ type: 'auth/verifyMFASuccess' });

    } catch (error) {
      dispatch({
        type: 'auth/verifyMFAFailure',
        payload: error instanceof Error ? error : new Error('MFA verification failed')
      });
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles user logout and session cleanup
   */
  const logout = useCallback(async () => {
    try {
      dispatch({ type: 'auth/logoutStart' });
      await authService.logout();
      
      // Clean up session and tokens
      SecurityUtils.clearSecureStorage();
      
      dispatch({ type: 'auth/logoutSuccess' });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      dispatch({ type: 'auth/logoutSuccess' });
    }
  }, [dispatch]);

  /**
   * Checks if user has required role for access
   * @param requiredRole Role to check against
   */
  const checkRole = useCallback(async (requiredRole: UserRole): Promise<boolean> => {
    if (!authState.isAuthenticated || !authState.user) {
      return false;
    }

    try {
      return await authService.verifyRole(requiredRole);
    } catch (error) {
      console.error('Role verification error:', error);
      return false;
    }
  }, [authState.isAuthenticated, authState.user]);

  /**
   * Refreshes the authentication session
   */
  const refreshSession = useCallback(async () => {
    let retryCount = 0;
    
    while (retryCount < MAX_RETRY_ATTEMPTS) {
      try {
        dispatch({ type: 'auth/refreshStart' });
        
        const response = await authService.refreshToken(
          SecurityUtils.getRefreshToken()
        );

        dispatch({
          type: 'auth/refreshSuccess',
          payload: {
            user: response.user,
            sessionExpiry: Date.now() + SESSION_TIMEOUT
          }
        });
        
        return;
      } catch (error) {
        retryCount++;
        
        if (retryCount === MAX_RETRY_ATTEMPTS) {
          dispatch({ type: 'auth/refreshFailure' });
          await logout();
          throw error;
        }
        
        // Exponential backoff before retry
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
      }
    }
  }, [dispatch, logout]);

  /**
   * Initializes automatic token refresh cycle
   */
  const initializeTokenRefresh = useCallback(() => {
    const refreshInterval = setInterval(() => {
      if (isSessionExpired) {
        clearInterval(refreshInterval);
        return;
      }
      refreshSession().catch(console.error);
    }, TOKEN_REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => clearInterval(refreshInterval);
  }, [isSessionExpired, refreshSession]);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.loading,
    error: authState.error,
    mfaRequired: authState.mfaRequired,
    login,
    logout,
    verifyMFA,
    checkRole,
    refreshSession
  };
};

export type { User, LoginCredentials, AuthState };