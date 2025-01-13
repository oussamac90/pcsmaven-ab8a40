/**
 * @fileoverview Type definitions for authentication-related interfaces and enums
 * Used throughout the Port Community System web application for managing user roles,
 * authentication states, and request/response payloads.
 * @version 1.0.0
 */

/**
 * Enum defining all possible user roles in the system.
 * Maps to the Role-Based Access Control Matrix from security specifications.
 */
export enum UserRole {
  PORT_AUTHORITY = 'PORT_AUTHORITY',
  TERMINAL_OPERATOR = 'TERMINAL_OPERATOR',
  SHIPPING_LINE = 'SHIPPING_LINE',
  CUSTOMS = 'CUSTOMS',
  FINANCE = 'FINANCE',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN'
}

/**
 * Interface defining the core user data structure.
 * Includes role-based access control information and company affiliation.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for login request payload.
 * Supports username/password authentication method.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Interface for authentication response data.
 * Includes JWT tokens for OAuth 2.0/OIDC implementation.
 */
export interface AuthResponse {
  user: User;
  token: string; // JWT access token
  refreshToken: string; // JWT refresh token
}

/**
 * Interface for managing authentication state in Redux store.
 * Tracks authentication status, user information, loading state, and errors.
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}