/**
 * WordPress Authentication Hook
 *
 * Provides authentication state and methods for React components.
 * Uses WordPress Application Passwords (built-in WP 5.6+)
 *
 * Usage:
 * ```jsx
 * import { useAuth, AuthProvider } from './hooks/useAuth';
 *
 * // Wrap your app
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 *
 * // In components
 * const { user, isAuthenticated, login, logout, loading } = useAuth();
 * ```
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as wordpress from '../api/wordpress';

// Create auth context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Wrap your app with this to provide auth context
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing auth on mount
  useEffect(() => {
    const storedUser = wordpress.getStoredUser();
    if (storedUser && wordpress.isAuthenticated()) {
      setUser(storedUser);
      // Optionally verify the token is still valid
      wordpress.getCurrentUser()
        .then(freshUser => setUser(freshUser))
        .catch(() => {
          // Token expired or invalid
          wordpress.logout();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for auth expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setError('Your session has expired. Please log in again.');
    };

    window.addEventListener('wp-auth-expired', handleAuthExpired);
    return () => window.removeEventListener('wp-auth-expired', handleAuthExpired);
  }, []);

  /**
   * Login with WordPress credentials
   * @param {string} username - WordPress username
   * @param {string} appPassword - Application Password (from WordPress admin)
   */
  const login = useCallback(async (username, appPassword) => {
    setLoading(true);
    setError(null);

    try {
      const loggedInUser = await wordpress.login(username, appPassword);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout and clear credentials
   */
  const logout = useCallback(() => {
    wordpress.logout();
    setUser(null);
    setError(null);
  }, []);

  /**
   * Clear any error messages
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    if (!wordpress.isAuthenticated()) return null;

    try {
      const freshUser = await wordpress.getCurrentUser();
      setUser(freshUser);
      return freshUser;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    clearError,
    refreshUser,
    // Expose capabilities for easy checking
    canEditPosts: user?.capabilities?.can_edit_posts || false,
    canPublishPosts: user?.capabilities?.can_publish_posts || false,
    canEditOthersPosts: user?.capabilities?.can_edit_others_posts || false,
    canManageOptions: user?.capabilities?.can_manage_options || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook for protected routes/components
 * Redirects to login or shows message if not authenticated
 *
 * Usage:
 * ```jsx
 * function AdminPanel() {
 *   const { canAccess, message } = useRequireAuth('edit_posts');
 *   if (!canAccess) return <div>{message}</div>;
 *   return <AdminContent />;
 * }
 * ```
 */
export function useRequireAuth(requiredCapability = null) {
  const { user, isAuthenticated, loading, canEditPosts, canPublishPosts, canEditOthersPosts, canManageOptions } = useAuth();

  if (loading) {
    return { canAccess: false, message: 'Checking authentication...', loading: true };
  }

  if (!isAuthenticated) {
    return { canAccess: false, message: 'Please log in to access this feature.', loading: false };
  }

  // Check specific capability if required
  if (requiredCapability) {
    const capabilities = {
      'edit_posts': canEditPosts,
      'publish_posts': canPublishPosts,
      'edit_others_posts': canEditOthersPosts,
      'manage_options': canManageOptions
    };

    if (!capabilities[requiredCapability]) {
      return {
        canAccess: false,
        message: `You don't have permission to perform this action. Required: ${requiredCapability}`,
        loading: false
      };
    }
  }

  return { canAccess: true, message: null, loading: false, user };
}

export default useAuth;
