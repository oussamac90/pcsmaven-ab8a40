// External imports - version comments included as per IE2
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.3

// Internal imports
import { AuthService, UserRole } from '../../services/auth.service';
import { AuthState } from '../../types/auth.types';
import { ApiError, ErrorCode } from '../../utils/api.utils';

// Constants
const SESSION_TIMEOUT = 3600000; // 1 hour in milliseconds
const MAX_LOGIN_ATTEMPTS = 3;

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  mfaRequired: false,
  sessionExpiry: 0,
  lastActivity: 0,
  roleVerified: false
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string; mfaCode?: string }, { rejectWithValue }) => {
    try {
      const response = await AuthService.login(credentials);
      return response;
    } catch (error) {
      return rejectWithValue(ApiError.handleAuthError(error as Error));
    }
  }
);

export const verifyMFA = createAsyncThunk(
  'auth/verifyMFA',
  async (mfaCode: string, { rejectWithValue }) => {
    try {
      const response = await AuthService.verifyMFA(mfaCode);
      return response;
    } catch (error) {
      return rejectWithValue(ApiError.handleAuthError(error as Error));
    }
  }
);

export const refreshSession = createAsyncThunk(
  'auth/refreshSession',
  async (_, { rejectWithValue }) => {
    try {
      const response = await AuthService.refreshToken();
      return response;
    } catch (error) {
      return rejectWithValue(ApiError.handleAuthError(error as Error));
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.logout();
    } catch (error) {
      return rejectWithValue(ApiError.handleAuthError(error as Error));
    }
  }
);

export const verifyRole = createAsyncThunk(
  'auth/verifyRole',
  async (requiredRole: UserRole, { rejectWithValue }) => {
    try {
      const hasAccess = await AuthService.verifyRole(requiredRole);
      return hasAccess;
    } catch (error) {
      return rejectWithValue(ApiError.handleAuthError(error as Error));
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    clearError: (state) => {
      state.error = null;
    },
    resetMFAStatus: (state) => {
      state.mfaRequired = false;
    }
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      if (action.payload.mfaRequired) {
        state.mfaRequired = true;
        state.loading = false;
      } else {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.sessionExpiry = Date.now() + SESSION_TIMEOUT;
        state.lastActivity = Date.now();
        state.loading = false;
        state.mfaRequired = false;
      }
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as AuthError;
    });

    // MFA Verification
    builder.addCase(verifyMFA.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(verifyMFA.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.sessionExpiry = Date.now() + SESSION_TIMEOUT;
      state.lastActivity = Date.now();
      state.loading = false;
      state.mfaRequired = false;
    });
    builder.addCase(verifyMFA.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as AuthError;
    });

    // Session Refresh
    builder.addCase(refreshSession.fulfilled, (state, action) => {
      state.sessionExpiry = Date.now() + SESSION_TIMEOUT;
      state.lastActivity = Date.now();
    });
    builder.addCase(refreshSession.rejected, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.sessionExpiry = 0;
      state.lastActivity = 0;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.sessionExpiry = 0;
      state.lastActivity = 0;
      state.roleVerified = false;
    });

    // Role Verification
    builder.addCase(verifyRole.fulfilled, (state, action) => {
      state.roleVerified = action.payload;
    });
    builder.addCase(verifyRole.rejected, (state) => {
      state.roleVerified = false;
    });
  }
});

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectUserRole = (state: { auth: AuthState }) => state.auth.user?.role;
export const selectSessionStatus = (state: { auth: AuthState }) => ({
  expiry: state.auth.sessionExpiry,
  lastActivity: state.auth.lastActivity
});
export const selectMFARequired = (state: { auth: AuthState }) => state.auth.mfaRequired;
export const selectRoleVerified = (state: { auth: AuthState }) => state.auth.roleVerified;

// Export actions and reducer
export const { updateLastActivity, clearError, resetMFAStatus } = authSlice.actions;
export default authSlice.reducer;