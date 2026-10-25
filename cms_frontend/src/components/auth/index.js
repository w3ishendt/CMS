// (new) Auth components exports
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as RequireAuth } from './RequireAuth';
export { 
  default as RoleGuard,
  SuperAdminOnly,
  AdminOnly,
  DistributorAndAbove,
  // REMOVED: MultiSiteOperatorAndAbove,
  OperatorAndAbove,
  OperatorOnly,
  CanManageUsers,
  // REMOVED: CanManageSites,
  // REMOVED: CanViewAllSites,
  CanManageDevices
} from './RoleGuard';