import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userService } from '../services/userService';
import { UserResponse, UserPermissions } from '../types/user';
import { useAuth } from './AuthContext';

interface UserPermissions {
  canCreateUsers: boolean;
  canManageUsers: boolean;
  canDeleteUsers: boolean;
  canManageSites: boolean;
  canAccessAnalytics: boolean;
  canViewReports: boolean;
  canManageDevices: boolean;
  canAccessAdmin: boolean;
  canViewHistory: boolean;
  canGenerateScripts: boolean;
  availableRoles: string[];
}

interface UserContextType {
  // Current user info
  currentUser: UserResponse | null;
  permissions: UserPermissions | null;
  
  // Loading states
  loading: boolean;
  permissionsLoading: boolean;
  
  // Error states
  error: string | null;
  permissionsError: string | null;
  
  // Initialization state
  isInitialized: boolean;
  
  // Actions
  fetchUser: (user: UserResponse) => Promise<void>;
  fetchPermissions: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  clearUserData: () => void;
  
  // Permission helpers
  hasPermission: (permission: keyof UserPermissions) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canCreateRole: (role: string) => boolean;
  getAvailableRoles: () => string[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const { user: authUser, isLoading: authLoading } = useAuth();

  // Auto-fetch permissions when currentUser changes
  useEffect(() => {
    if (currentUser) {
      fetchPermissions(currentUser);
    } else {
      setPermissions(null);
    }
  }, [currentUser]);

  // Sync with AuthContext when user changes
  useEffect(() => {
    // Wait for AuthContext to finish loading before proceeding
    if (authLoading) {
      setIsInitialized(false);
      return;
    }
    
    if (authUser) {
      setCurrentUser(authUser);
      fetchPermissions(authUser);
      setIsInitialized(true);
    } else {
      setCurrentUser(null);
      setPermissions([]);
      setIsInitialized(true);
    }
  }, [authUser, authLoading]);

  // Sync with AuthContext on mount
  useEffect(() => {
    const initializeFromAuth = () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('cms_user_info') || 'null');
        if (userInfo) {
          setCurrentUser(userInfo);
        }
      } catch (error) {
        console.error('Failed to sync with AuthContext');
      }
    };
    
    initializeFromAuth();
  }, []);



  /**
   * Fetch current user information
   */
  const fetchCurrentUser = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const userData = await apiService.getCurrentUser();
      setCurrentUser(userData);
    } catch (err: any) {
      console.error('Failed to fetch current user:', err);
      setError(err.response?.data?.message || 'Failed to fetch user information');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch user permissions
   */
  const fetchPermissions = async (userOverride?: UserResponse | null): Promise<void> => {
    try {
      const userForPermissionCheck = userOverride || currentUser;
  

      setPermissionsLoading(true);
      setPermissionsError(null);
      
      let permissionsData;
      try {
        permissionsData = await apiService.getEffectivePermissions();
  
      } catch (apiError) {
        console.warn('API permissions fetch failed, using fallback for SUPER_ADMIN');
        permissionsData = null;
      }
      
      // Fallback: If user is SUPER_ADMIN, grant all permissions
      if (userForPermissionCheck?.roles?.includes('SUPER_ADMIN') || userForPermissionCheck?.role === 'SUPER_ADMIN') {

        const superAdminPermissions: UserPermissions = {
          canCreateUsers: true,
          canManageUsers: true,
          canDeleteUsers: true,
          canManageSites: true,
          canAccessAnalytics: true,
          canViewReports: true,
          canManageDevices: true,
          canAccessAdmin: true,
          canViewHistory: true,
          canGenerateScripts: true,
          availableRoles: ['ADMINISTRATOR', 'DISTRIBUTOR', 'MULTI_SITE_OPERATOR', 'OPERATOR']
        };
        
        // Check if API permissions have the expected structure
        let finalPermissions = superAdminPermissions;
        if (permissionsData) {
          // If API returns structured permissions, use combined_permissions or super_admin_permissions
          if (permissionsData.combined_permissions) {
            finalPermissions = { ...superAdminPermissions, ...permissionsData.combined_permissions };
          } else if (permissionsData.super_admin_permissions) {
            finalPermissions = { ...superAdminPermissions, ...permissionsData.super_admin_permissions };
          } else if (typeof permissionsData === 'object' && permissionsData.canCreateUsers !== undefined) {
            // If API returns flat permissions object
            finalPermissions = { ...superAdminPermissions, ...permissionsData };
          }
        }
        

        setPermissions(finalPermissions);
      } else if (userForPermissionCheck?.roles?.includes('ADMINISTRATOR') || userForPermissionCheck?.role === 'ADMINISTRATOR') {
        // Fallback: If user is ADMINISTRATOR, grant all permissions except canManageUsers
        const administratorPermissions: UserPermissions = {
          canCreateUsers: true,
          canManageUsers: true,         // Allow ADMINISTRATOR to manage users
          canDeleteUsers: true,
          canManageSites: true,
          canAccessAnalytics: true,
          canViewReports: true,
          canManageDevices: true,
          canAccessAdmin: true,
          canViewHistory: true,
          canGenerateScripts: true,
          availableRoles: ['DISTRIBUTOR', 'MULTI_SITE_OPERATOR', 'OPERATOR']
        };
        
        // Use API permissions if available
        let finalPermissions = administratorPermissions;
        if (permissionsData) {
          if (permissionsData.combined_permissions) {
            finalPermissions = { ...administratorPermissions, ...permissionsData.combined_permissions };
          } else if (typeof permissionsData === 'object' && permissionsData.canCreateUsers !== undefined) {
            finalPermissions = { ...administratorPermissions, ...permissionsData };
          }
        }
        
        setPermissions(finalPermissions);
      } else if (userForPermissionCheck?.roles?.includes('DISTRIBUTOR') || userForPermissionCheck?.role === 'DISTRIBUTOR') {
        // Fallback: If user is DISTRIBUTOR, grant very limited permissions

        const distributorPermissions: UserPermissions = {
          canCreateUsers: false,        // Cannot create users
          canManageUsers: false,        // Cannot access User Management
          canDeleteUsers: false,        // Cannot delete users
          canManageSites: false,        // Cannot assign sites
          canAccessAnalytics: false,    // Limited access
          canViewReports: false,        // Limited access
          canManageDevices: true,       // Can manage devices
          canAccessAdmin: false,        // No admin access
          canViewHistory: true,         // Can view device history
          canGenerateScripts: false,    // Cannot generate scripts
          availableRoles: []            // Cannot create any roles
        };
        
        // Use API permissions if available, but enforce restrictions
        let finalPermissions = distributorPermissions;
        if (permissionsData) {
          if (permissionsData.combined_permissions) {
            finalPermissions = { ...distributorPermissions, ...permissionsData.combined_permissions };
          } else if (typeof permissionsData === 'object' && permissionsData.canCreateUsers !== undefined) {
            finalPermissions = { ...distributorPermissions, ...permissionsData };
          }
          
          // Enforce restrictions for Distributors regardless of API response
          finalPermissions.canCreateUsers = false;
          finalPermissions.canManageUsers = false;
          finalPermissions.canDeleteUsers = false;
          finalPermissions.canManageSites = false;
          finalPermissions.canGenerateScripts = false;
          finalPermissions.canAccessAdmin = false;
          finalPermissions.availableRoles = [];
        }
        

        setPermissions(finalPermissions);
      } else if (userForPermissionCheck?.roles?.includes('MULTI_SITE_OPERATOR') || userForPermissionCheck?.role === 'MULTI_SITE_OPERATOR') {
        // MULTI_SITE_OPERATOR role: Similar to OPERATOR but for multiple sites
        const multiSiteOperatorPermissions: UserPermissions = {
          canCreateUsers: false,
          canManageUsers: false,
          canDeleteUsers: false,
          canManageDevices: true,     // Allow device management for Live Monitor
          canManageSites: true,       // Allow managing multiple sites
          canViewHistory: true,       // Allow viewing device history
          canGenerateScripts: false,  // Cannot generate scripts
          canAccessAnalytics: true,   // Allow access to analytics/dashboard
          canViewReports: true,       // Allow viewing reports
          canAccessAdmin: false,
          availableRoles: []          // Cannot create any roles
        };
        
        // Use API permissions if available, but ensure MULTI_SITE_OPERATOR gets required permissions
        let finalPermissions = multiSiteOperatorPermissions;
        if (permissionsData) {
          if (permissionsData.combined_permissions) {
            finalPermissions = { ...multiSiteOperatorPermissions, ...permissionsData.combined_permissions };
          } else if (typeof permissionsData === 'object' && permissionsData.canCreateUsers !== undefined) {
            finalPermissions = { ...multiSiteOperatorPermissions, ...permissionsData };
          }
          
          // Ensure MULTI_SITE_OPERATOR always has these critical permissions
          finalPermissions.canManageDevices = true;
          finalPermissions.canViewHistory = true;
          finalPermissions.canGenerateScripts = false;
          finalPermissions.canAccessAnalytics = true;
        }
        
        setPermissions(finalPermissions);
      } else if (userForPermissionCheck?.roles?.includes('OPERATOR') || userForPermissionCheck?.role === 'OPERATOR') {
        // OPERATOR role: Grant specific permissions for Live Monitor, Device History, etc.
        const operatorPermissions: UserPermissions = {
          canCreateUsers: false,
          canManageUsers: false,
          canDeleteUsers: false,
          canManageDevices: true,     // Allow device management for Live Monitor
          canManageSites: false,
          canViewHistory: true,       // Allow viewing device history
          canGenerateScripts: false,  // Cannot generate scripts
          canAccessAnalytics: true,   // Allow access to analytics/dashboard
          canViewReports: true,       // Allow viewing reports
          canAccessAdmin: false,
          availableRoles: []          // Cannot create any roles
        };
        
        // Use API permissions if available, but ensure OPERATOR gets required permissions
        let finalPermissions = operatorPermissions;
        if (permissionsData) {
          if (permissionsData.combined_permissions) {
            finalPermissions = { ...operatorPermissions, ...permissionsData.combined_permissions };
          } else if (typeof permissionsData === 'object' && permissionsData.canCreateUsers !== undefined) {
            finalPermissions = { ...operatorPermissions, ...permissionsData };
          }
          
          // Ensure OPERATOR always has these critical permissions
          finalPermissions.canManageDevices = true;
          finalPermissions.canViewHistory = true;
          finalPermissions.canGenerateScripts = false;
          finalPermissions.canAccessAnalytics = true;
        }
        
        setPermissions(finalPermissions);
      } else {
        // For other users, use API permissions
        let finalPermissions = permissionsData;
        if (permissionsData && permissionsData.combined_permissions) {
          finalPermissions = permissionsData.combined_permissions;
        }
        setPermissions(finalPermissions);
      }
    } catch (err: any) {
      console.error('Failed to fetch permissions:', err);
      setPermissionsError(err.response?.data?.message || 'Failed to fetch permissions');
      
      // Provide fallback permissions for non-SUPER_ADMIN and non-DISTRIBUTOR users
      if (userForPermissionCheck && !userForPermissionCheck.roles?.includes('SUPER_ADMIN') && userForPermissionCheck.role !== 'SUPER_ADMIN' && 
          !userForPermissionCheck.roles?.includes('DISTRIBUTOR') && userForPermissionCheck.role !== 'DISTRIBUTOR') {

        const fallbackPermissions: UserPermissions = {
          canCreateUsers: false,
          canManageUsers: false,
          canDeleteUsers: false,
          canManageDevices: true,     // OPERATOR: Allow device management for Live Monitor
          canManageSites: false,
          canViewHistory: true,       // OPERATOR: Allow viewing device history
          canGenerateScripts: false,  // OPERATOR: Cannot generate scripts
          canAccessAnalytics: true,   // OPERATOR: Allow access to analytics/dashboard
          canAccessAdmin: false,
          availableRoles: []          // Cannot create any roles
        };
    
        setPermissions(fallbackPermissions);
      } else {
        setPermissions(null);
      }
    } finally {
      setPermissionsLoading(false);
    }
  };

  /**
   * Refresh both user data and permissions sequentially
   */
  const refreshUserData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const userData = await apiService.getCurrentUser();
      setCurrentUser(userData);
      
      // Now fetch permissions with the fresh user data
      await fetchPermissions(userData);
    } catch (err: any) {
      console.error('Failed to refresh user data:', err);
      setError(err.response?.data?.message || 'Failed to refresh user data');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear all user data
   */
  const clearUserData = (): void => {
    setCurrentUser(null);
    setPermissions(null);
    setError(null);
    setPermissionsError(null);
  };

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: keyof UserPermissions): boolean => {
    // Fallback: If user is SUPER_ADMIN and permissions haven't loaded yet, grant permission
    if (!permissions && currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.roles?.includes('SUPER_ADMIN'))) {
      if (permission === 'availableRoles') return true;
      return true; // Grant all permissions to SUPER_ADMIN when permissions are not loaded
    }
    
    if (!permissions) {
      return false;
    }
    if (permission === 'availableRoles') {
      return permissions.availableRoles.length > 0;
    }
    const result = permissions[permission] as boolean;
    return result;
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: string): boolean => {
    // If UserContext is not initialized yet, fall back to AuthContext user
    const userToCheck = isInitialized ? currentUser : authUser;
    
    if (!userToCheck) {
      return false;
    }
    
    const userRole = userToCheck.role;
    const userRoles = userToCheck.roles;
    const result = userRole === role || (userRoles && userRoles.includes(role));
    
    return result;
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    if (!currentUser || !roles || roles.length === 0) {
      return false;
    }
    
    // Check if user has any of the specified roles
    return roles.some(role => {
      const hasRoleInArray = currentUser.roles?.includes(role);
      const hasRoleInField = currentUser.role === role;
      return hasRoleInArray || hasRoleInField;
    });
  };

  /**
   * Check if user can create a specific role
   */
  const canCreateRole = (role: string): boolean => {
    if (!permissions || !currentUser) return false;
    
    // SUPER_ADMIN can create all roles
    if (currentUser.roles?.includes('SUPER_ADMIN') || currentUser.role === 'SUPER_ADMIN') {
      return ['ADMINISTRATOR', 'DISTRIBUTOR', 'MULTI_SITE_OPERATOR', 'OPERATOR'].includes(role);
    }
    
    // DISTRIBUTOR cannot create any users
    if (currentUser.roles?.includes('DISTRIBUTOR') || currentUser.role === 'DISTRIBUTOR') {
      return false; // Distributors cannot create any users
    }
    
    return false;
  };

  /**
   * Get available roles for current user
   */
  const getAvailableRoles = (): string[] => {
    if (!permissions) return [];
    return permissions.availableRoles || [];
  };

  const contextValue: UserContextType = {
    // State
    currentUser,
    permissions,
    loading,
    permissionsLoading,
    error,
    permissionsError,
    isInitialized,
    
    // Actions
    fetchCurrentUser,
    fetchPermissions,
    refreshUserData,
    clearUserData,
    
    // Helpers
    hasPermission,
    hasRole,
    hasAnyRole,
    canCreateRole,
    getAvailableRoles
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext };