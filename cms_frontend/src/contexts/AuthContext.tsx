// (new) Authentication context for user state management
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService from '../services/authService';
import { UserResponse, LoginRequest, ChangePasswordRequest } from '../types/api';

const guestUser = {
  id: 1,
  username: 'local-admin',
  email: 'local-admin@cms.local',
  firstName: 'Local',
  lastName: 'Admin',
  active: true,
  locked: false,
  role: 'SUPER_ADMIN',
  roles: ['SUPER_ADMIN'],
  sites: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
} as UserResponse & { role: string };

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; user?: UserResponse; message?: string }>;
  logout: () => void;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<any>;
  updateUser: (updatedUser: UserResponse) => void;
  clearError: () => void;
  hasRole: (role: string | string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAccessAdmin: () => boolean;
  canManageUsers: () => boolean;
  canManageDevices: () => boolean;
  // Site-related functions removed
  userRole: string | undefined;
  userId: number | undefined;
  userName: string | undefined;
  userFullName: string | null;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(guestUser);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication is disabled for this CMS build. Use a local admin identity.
  useEffect(() => {
    setUser(guestUser);
    setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  // Login is intentionally bypassed; keep the function for existing callers.
  const login = async (credentials) => {
    setError(null);
    setUser(guestUser);
    setIsAuthenticated(true);
    setIsLoading(false);
    return { success: true, user: guestUser };
  };

  // Logout is disabled because there is no login screen in this build.
  const logout = () => {
    authService.logout();
    setUser(guestUser);
    setIsAuthenticated(true);
    setError(null);
  };

  // Change password function
  const changePassword = async (passwordData) => {
    setError(null);
    
    try {
      const response = await authService.changePassword(passwordData);
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Password change failed. Please try again.';
      setError(errorMessage);
      throw error;
    }
  };

  // Update user info (for profile updates)
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    // Update localStorage as well
    localStorage.setItem('cms_user_info', JSON.stringify(updatedUser));
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Role-based access control helpers
  const hasRole = (role) => {
    const result = authService.hasRole(role);
    return result;
  };

  const hasAnyRole = (roles) => {
    const result = authService.hasAnyRole(roles);
    return result;
  };

  const canAccessAdmin = () => {
    const result = authService.canAccessAdmin();
    return result;
  };

  const canManageUsers = () => {
    const result = authService.canManageUsers();
    return result;
  };

  // Site management functions removed

  const canManageDevices = () => {
    return authService.canManageDevices();
  };

  // Site access functions removed

  const value = {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    logout,
    changePassword,
    updateUser,
    clearError,
    
    // Role-based access control
    hasRole,
    hasAnyRole,
    canAccessAdmin,
    canManageUsers,
    canManageDevices,
    // Site-related functions removed
    
    // User info helpers
    userRole: user?.role,
    userId: user?.id,
    userName: user?.username,
    userFullName: user ? `${user.firstName} ${user.lastName}` : null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
