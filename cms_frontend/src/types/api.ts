// (new) TypeScript interfaces for Central Monitoring System API

// User Roles
export type UserRole = 
  | 'SUPER_ADMIN'
  | 'ADMINISTRATOR'
  | 'DISTRIBUTOR'
  | 'MULTI_SITE_OPERATOR'
  | 'OPERATOR';

// Sort Direction
export type SortDirection = 'asc' | 'desc';

// ===== Authentication Types =====

// Login Request
export interface LoginRequest {
  username: string;
  password: string;
}

// User Info from Login Response
export interface UserInfo {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  lastLoginDate: string; // ISO datetime
}

// Login Response
export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  refreshToken: string;
  user: UserInfo;
}

// Change Password Request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Token Refresh Request
export interface TokenRefreshRequest {
  refreshToken: string;
}

// Token Refresh Response
export interface TokenRefreshResponse {
  success: boolean;
  message: string;
  token: string;
  refreshToken: string;
}

// Generic API Response
export interface ApiResponse {
  success: boolean;
  message: string;
}

// ===== User Management Types =====

// User Query Parameters
export interface UserQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: SortDirection;
  search?: string;
  role?: UserRole;
  active?: boolean;
  includeHierarchy?: boolean;
  parentUserId?: number;
}

// User Response (detailed user info)
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  locked: boolean;
  roles: UserRole[];
  parentUserId?: number | null;
  parentUser?: UserResponse | null;
  childUsers?: UserResponse[];
  sites: SiteInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface DistributorResponse extends UserResponse {
  roles: ['DISTRIBUTOR'];
  parentUserId: null;
  childUsers: UserResponse[];
}

export interface OperatorResponse extends UserResponse {
  roles: ['OPERATOR'] | ['MULTI_SITE_OPERATOR'];
  parentUserId: number;
  parentUser: UserResponse;
}

// Paginated Response
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// User List Response
export type UserListResponse = PaginatedResponse<UserResponse>;

// Create User Request
export interface CreateUserRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  active: boolean;
  roles: UserRole[];
  parentUserId?: number | null;
  siteIds?: string[];
}

export interface CreateDistributorRequest extends CreateUserRequest {
  roles: ['DISTRIBUTOR'];
  parentUserId: null;
  siteIds: string[];
}

export interface CreateOperatorRequest extends CreateUserRequest {
  roles: ['OPERATOR'] | ['MULTI_SITE_OPERATOR'];
  parentUserId: number;
  siteIds: string[];
}

// Update User Request
export interface UpdateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber: string;
  department: string;
  siteNames: string[];
  active: boolean;
}

// Change User Password Request
export interface ChangeUserPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ===== Site Management Types =====

// Site Info
export interface SiteInfo {
  id: string;
  name: string;
  location?: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssignableSiteInfo extends SiteInfo {
  canAssign: boolean;
  assignedToParent: boolean;
}

export interface SiteAssignmentRequest {
  siteIds: string[];
}

export interface SiteAssignmentResponse {
  assignedSites: SiteInfo[];
  removedSites: SiteInfo[];
  message: string;
}

// Available Sites Response
export interface AvailableSitesResponse {
  sites: string[];
}

// Site Assignment Request
export interface SiteAssignmentRequest {
  userId: number;
  siteNames: string[];
}

// ===== Device Management Types =====

// Device Status
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';

// Device Type
export type DeviceType = 'SENSOR' | 'CONTROLLER' | 'GATEWAY' | 'ACTUATOR';

// Device Info
export interface DeviceInfo {
  id: number;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  // REMOVED: siteId: number;
  // REMOVED: siteName: string;
  ipAddress: string;
  macAddress: string;
  firmwareVersion: string;
  lastSeen: string; // ISO datetime
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// Device Query Parameters
export interface DeviceQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: SortDirection;
  search?: string;
  // REMOVED: siteId?: number;
  status?: DeviceStatus;
  type?: DeviceType;
}

// Device List Response
export type DeviceListResponse = PaginatedResponse<DeviceInfo>;

// Create Device Request
export interface CreateDeviceRequest {
  name: string;
  type: DeviceType;
  // REMOVED: siteId: number;
  ipAddress: string;
  macAddress: string;
  firmwareVersion: string;
  metadata?: Record<string, any>;
}

// Update Device Request
export interface UpdateDeviceRequest {
  name: string;
  type: DeviceType;
  // REMOVED: siteId: number;
  ipAddress: string;
  macAddress: string;
  firmwareVersion: string;
  metadata?: Record<string, any>;
}

// ===== Error Types =====

// API Error Response
export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  timestamp?: string;
  path?: string;
}

// Form Validation Error
export interface ValidationError {
  field: string;
  message: string;
}

// ===== Dashboard Types =====

// Dashboard Statistics
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  // REMOVED: totalSites: number;
  // REMOVED: activeSites: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  errorDevices: number;
}

// Recent Activity
export interface RecentActivity {
  id: number;
  type: 'USER_LOGIN' | 'DEVICE_STATUS_CHANGE' | 'USER_CREATED';
  description: string;
  timestamp: string;
  userId?: number;
  userName?: string;
}

// Dashboard Data
export interface DashboardData {
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkStatus: 'GOOD' | 'WARNING' | 'ERROR';
  };
}

// ===== Form Types =====

// Login Form Data
export interface LoginFormData {
  username: string;
  password: string;
  rememberMe?: boolean;
}

// User Form Data
export interface UserFormData {
  username?: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber: string;
  department: string;
  siteNames: string[];
  active: boolean;
}

// REMOVED: Site Form Data interface
// Device Form Data
export interface DeviceFormData {
  name: string;
  type: DeviceType;
  // REMOVED: siteId: number;
  ipAddress: string;
  macAddress: string;
  firmwareVersion: string;
  metadata: Record<string, any>;
}

// Profile Form Data
export interface ProfileFormData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  department: string;
}

// Change Password Form Data
export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}