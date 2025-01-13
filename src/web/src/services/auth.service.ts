// External imports
import axios, { AxiosError, AxiosResponse } from 'axios'; // v1.3.4
import CryptoJS from 'crypto-js'; // v4.1.1
import { createLogger, format, transports } from 'winston'; // v3.8.2

// Internal imports
import { apiConfig } from '../config/api.config';
import { handleApiError, ErrorCode } from '../utils/api.utils';

// Types and Interfaces
interface LoginCredentials {
  username: string;
  password: string;
  mfaCode?: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    companyId: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  sessionId: string;
  mfaRequired?: boolean;
}

enum UserRole {
  PORT_AUTHORITY = 'PORT_AUTHORITY',
  TERMINAL_OPERATOR = 'TERMINAL_OPERATOR',
  SHIPPING_LINE = 'SHIPPING_LINE',
  CUSTOMS = 'CUSTOMS',
  FINANCE = 'FINANCE',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN'
}

// Constants
const AUTH_TOKEN_KEY = 'pcs_auth_token_encrypted';
const REFRESH_TOKEN_KEY = 'pcs_refresh_token_encrypted';
const SESSION_TIMEOUT = 3600000; // 1 hour
const MAX_LOGIN_ATTEMPTS = 3;
const REFRESH_RETRY_DELAYS = [1000, 2000, 4000, 8000];
const ENCRYPTION_KEY = process.env.REACT_APP_TOKEN_ENCRYPTION_KEY || 'default-key';

const AUTH_ENDPOINTS = {
  login: '/auth/login',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
  verify: '/auth/verify',
  me: '/auth/me',
  mfa: '/auth/mfa',
  session: '/auth/session'
};

// Configure security logger
const securityLogger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'security.log' })
  ]
});

// Helper functions
const encryptToken = (token: string): string => {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
};

const decryptToken = (encryptedToken: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Auth Service Implementation
class AuthService {
  private static instance: AuthService;
  private loginAttempts: number = 0;
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeAxiosInterceptors();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private initializeAxiosInterceptors(): void {
    axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${decryptToken(token)}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          return this.handleUnauthorizedError(error);
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorizedError(error: AxiosError): Promise<any> {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        const newTokens = await this.refreshToken(refreshToken);
        const originalRequest = error.config;
        if (originalRequest) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.tokens.accessToken}`;
          return axios(originalRequest);
        }
      }
    } catch (refreshError) {
      await this.logout();
    }
    return Promise.reject(error);
  }

  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        throw new Error('Maximum login attempts exceeded. Please try again later.');
      }

      const response = await axios.post<AuthResponse>(
        `${apiConfig.baseURL}${AUTH_ENDPOINTS.login}`,
        credentials,
        {
          headers: {
            ...apiConfig.headers,
            'X-CSRF-Token': this.generateCSRFToken()
          }
        }
      );

      const { data } = response;

      if (data.mfaRequired && !credentials.mfaCode) {
        return { ...data, tokens: { accessToken: '', refreshToken: '' } };
      }

      this.loginAttempts = 0;
      this.storeTokens(data.tokens);
      this.initializeSessionCheck();

      securityLogger.info('User logged in successfully', {
        userId: data.user.id,
        role: data.user.role,
        sessionId: data.sessionId
      });

      return data;
    } catch (error) {
      this.loginAttempts++;
      securityLogger.warn('Login attempt failed', {
        username: credentials.username,
        attemptNumber: this.loginAttempts
      });
      throw handleApiError(error as Error);
    }
  }

  public async logout(): Promise<void> {
    try {
      await axios.post(`${apiConfig.baseURL}${AUTH_ENDPOINTS.logout}`);
      this.clearSession();
      
      securityLogger.info('User logged out successfully');
    } catch (error) {
      securityLogger.error('Logout error', { error });
    } finally {
      this.clearSession();
    }
  }

  public async refreshToken(encryptedRefreshToken: string): Promise<AuthResponse> {
    let retryCount = 0;
    
    while (retryCount < REFRESH_RETRY_DELAYS.length) {
      try {
        const refreshToken = decryptToken(encryptedRefreshToken);
        const response = await axios.post<AuthResponse>(
          `${apiConfig.baseURL}${AUTH_ENDPOINTS.refresh}`,
          { refreshToken }
        );

        this.storeTokens(response.data.tokens);
        return response.data;
      } catch (error) {
        retryCount++;
        if (retryCount < REFRESH_RETRY_DELAYS.length) {
          await new Promise(resolve => setTimeout(resolve, REFRESH_RETRY_DELAYS[retryCount]));
        } else {
          throw handleApiError(error as Error);
        }
      }
    }

    throw new Error('Token refresh failed after maximum retries');
  }

  public async verifyRole(requiredRole: UserRole): Promise<boolean> {
    try {
      const response = await axios.post(`${apiConfig.baseURL}${AUTH_ENDPOINTS.verify}`, {
        role: requiredRole
      });
      return response.data.hasAccess;
    } catch (error) {
      return false;
    }
  }

  public async checkSession(): Promise<boolean> {
    try {
      const response = await axios.get(`${apiConfig.baseURL}${AUTH_ENDPOINTS.session}`);
      return response.data.active;
    } catch (error) {
      this.clearSession();
      return false;
    }
  }

  private storeTokens(tokens: { accessToken: string; refreshToken: string }): void {
    localStorage.setItem(AUTH_TOKEN_KEY, encryptToken(tokens.accessToken));
    localStorage.setItem(REFRESH_TOKEN_KEY, encryptToken(tokens.refreshToken));
  }

  private clearSession(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  private initializeSessionCheck(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    this.sessionCheckInterval = setInterval(
      () => this.checkSession(),
      SESSION_TIMEOUT / 2
    );
  }

  private generateCSRFToken(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export { UserRole };