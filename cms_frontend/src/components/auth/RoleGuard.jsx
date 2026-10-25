// (new) Role guard component for role-based UI rendering
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const RoleGuard = ({ 
  children, 
  allowedRoles = [], 
  requiredPermissions = [],
  fallback = null,
  requireAll = false // If true, user must have ALL roles/permissions; if false, ANY will suffice
}) => {
  const { 
    user, 
    isAuthenticated, 
    hasRole, 
    hasAnyRole,
    canAccessAdmin,
    canManageUsers,
    // REMOVED: canManageSites,
    // REMOVED: canViewAllSites,
    canManageDevices
  } = useAuth();

  // If not authenticated, don't render anything
  if (!isAuthenticated || !user) {
    return fallback;
  }

  // Check roles if specified
  if (allowedRoles.length > 0) {
    let hasRequiredRoles;
    
    if (requireAll) {
      // User must have ALL specified roles
      hasRequiredRoles = allowedRoles.every(role => hasRole(role));
    } else {
      // User must have ANY of the specified roles
      hasRequiredRoles = hasAnyRole(allowedRoles);
    }
    
    if (!hasRequiredRoles) {
      return fallback;
    }
  }

  // Check permissions if specified
  if (requiredPermissions.length > 0) {
    const permissionChecks = {
      canAccessAdmin,
      canManageUsers,
      // REMOVED: canManageSites,
      // REMOVED: canViewAllSites,
      canManageDevices
    };

    let hasRequiredPermissions;
    
    if (requireAll) {
      // User must have ALL specified permissions
      hasRequiredPermissions = requiredPermissions.every(permission => 
        permissionChecks[permission] && permissionChecks[permission]()
      );
    } else {
      // User must have ANY of the specified permissions
      hasRequiredPermissions = requiredPermissions.some(permission => 
        permissionChecks[permission] && permissionChecks[permission]()
      );
    }
    
    if (!hasRequiredPermissions) {
      return fallback;
    }
  }

  // All checks passed, render children
  return children;
};

// Convenience components for common role checks
export const SuperAdminOnly = ({ children, fallback = null }) => (
  <RoleGuard allowedRoles={['SUPER_ADMIN']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const AdminOnly = ({ children, fallback = null }) => (
  <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMINISTRATOR']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const DistributorAndAbove = ({ children, fallback = null }) => (
  <RoleGuard 
    allowedRoles={['SUPER_ADMIN', 'ADMINISTRATOR', 'DISTRIBUTOR']} 
    fallback={fallback}
  >
    {children}
  </RoleGuard>
);

// REMOVED: MultiSiteOperatorAndAbove component

export const OperatorAndAbove = ({ children, fallback = null }) => (
  <RoleGuard 
    allowedRoles={['SUPER_ADMIN', 'ADMINISTRATOR', 'DISTRIBUTOR', 'OPERATOR']} 
    fallback={fallback}
  >
    {children}
  </RoleGuard>
);

export const OperatorOnly = ({ children, fallback = null }) => (
  <RoleGuard allowedRoles={['OPERATOR']} fallback={fallback}>
    {children}
  </RoleGuard>
);

// Permission-based guards
export const CanManageUsers = ({ children, fallback = null }) => {
  const { canManageUsers } = useAuth();
  
  const canManage = canManageUsers();
  
  if (!canManage) {
    return fallback || <div className="text-red-500 p-4">Access Denied</div>;
  }
  
  return children;
};

// REMOVED: CanManageSites and CanViewAllSites components

export const CanManageDevices = ({ children, fallback = null }) => (
  <RoleGuard requiredPermissions={['canManageDevices']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export default RoleGuard;