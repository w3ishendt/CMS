// (new) API service layer for all endpoints (auth, users, sites, devices)
import { AxiosInstance } from 'axios';
import axios from 'axios';
import authService from './authService';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/api';

import {
  // User Management
  UserQueryParams,
  UserListResponse,
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  ChangeUserPasswordRequest,
  SiteAssignmentResponse,
  DistributorResponse,
  OperatorResponse,
  CreateDistributorRequest,
  CreateOperatorRequest,
  GetUsersParams,
  PaginatedResponse,
  // Site Management
  SiteInfo,
  AvailableSitesResponse,
  SiteAssignmentRequest,
  AssignableSiteInfo,
  // Device Management
  DeviceQueryParams,
  DeviceListResponse,
  DeviceInfo,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  GetDevicesParams,
  // Dashboard
  DashboardData,
  // Common
  ApiResponse
} from '../types/api';

class ApiService {
  private _client: AxiosInstance;
  private _publicClient: AxiosInstance;

  constructor() {
    this._client = authService.createAuthenticatedClient();
    
    // Create public client for endpoints that don't require authentication
    this._publicClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT_MS
    });
  }

  /**
   * Get the authenticated axios client
   */
  get client(): AxiosInstance {
    return this._client;
  }

  // ===== User Management API =====

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(params: UserQueryParams = {}): Promise<UserListResponse> {
        
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy && params.sortBy !== null) queryParams.append('sortBy', params.sortBy);
    if (params.sortDir && params.sortDir !== null) queryParams.append('sortDir', params.sortDir);
    if (params.search && params.search !== null && params.search !== '') queryParams.append('search', params.search);
    if (params.role && params.role !== null && params.role !== '') queryParams.append('role', params.role);
    if (params.active !== undefined && params.active !== null) queryParams.append('active', params.active.toString());

    const finalUrl = `/users?${queryParams.toString()}`;
        
    try {
      const response = await this._client.get(finalUrl);
                  return response.data;
    } catch (error: any) {
      console.error('❌ ApiService: getUsers failed with error:', error);
      console.error('❌ ApiService: Error type:', typeof error);
      console.error('❌ ApiService: Error message:', error.message);
      console.error('❌ ApiService: Error code:', error.code);
      console.error('❌ ApiService: Has response:', !!error.response);
      console.error('❌ ApiService: Has request:', !!error.request);
      
      if (error.response) {
        console.error('❌ ApiService: Response status:', error.response.status);
        console.error('❌ ApiService: Response data:', error.response.data);
      } else if (error.request) {
        console.error('❌ ApiService: Request made but no response received');
        console.error('❌ ApiService: This indicates a network/CORS issue');
      }
      
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<UserResponse> {
    const response = await this._client.get(`/users/${id}`);
    return response.data;
  }

  /**
   * Create new user
   */
  async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    const response = await this._client.post('/users', userData);
    return response.data;
  }

  /**
   * Update user
   */
  async updateUser(id: number, userData: UpdateUserRequest): Promise<UserResponse> {
    const response = await this._client.put(`/users/${id}`, userData);
    return response.data;
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<ApiResponse> {
    const response = await this._client.delete(`/users/${id}`);
    return response.data;
  }

  /**
   * Change user password
   */
  async changeUserPassword(id: number, passwordData: ChangeUserPasswordRequest): Promise<ApiResponse> {
    const response = await this._client.post(`/users/${id}/change-password`, passwordData);
    return response.data;
  }

  // Site assignment methods removed

  /**
   * Toggle user active status
   */
  async toggleUserStatus(id: number): Promise<UserResponse> {
    const response = await this._client.patch(`/users/${id}/toggle-status`);
    return response.data;
  }

  /**
   * Lock/unlock user account
   */
  async toggleUserLock(id: number): Promise<UserResponse> {
    const response = await this._client.patch(`/users/${id}/toggle-lock`);
    return response.data;
  }

  // ===== Password Reset API (Public - No Authentication Required) =====

  /**
   * Request password reset - sends reset email (Public endpoint)
   */
  async requestPasswordReset(email: string, captchaToken: string, captchaAnswer: string): Promise<{
    success: boolean;
    message: string;
    rateLimitRemaining: number;
  }> {
    // Create a completely fresh axios instance to avoid any interceptors
    const freshClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const response = await freshClient.post('/password/reset-request', {
      email,
      captchaToken,
      captchaAnswer
    });
    return response.data;
  }

  /**
   * Confirm password reset with token (Public endpoint)
   */
  async confirmPasswordReset(token: string, newPassword: string, confirmPassword: string): Promise<{
    success: boolean;
    message: string;
    redirectUrl: string;
  }> {
    // Create a completely fresh axios instance to avoid any interceptors
    const freshClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const response = await freshClient.post('/password/reset-confirm', {
      token,
      newPassword,
      confirmPassword
    });
    return response.data;
  }

  /**
   * Get password policy requirements (Public endpoint)
   */
  async getPasswordPolicy(): Promise<{
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigit: boolean;
    requireSpecialChar: boolean;
    allowedSpecialChars: string;
    passwordHistoryCount: number;
  }> {
    // Create a completely fresh axios instance to avoid any interceptors
    const freshClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const response = await freshClient.get('/password/policy');
    return response.data;
  }

  // ===== CAPTCHA API (Public - No Authentication Required) =====

  /**
   * Generate new CAPTCHA image and token (Public endpoint)
   */
  async generateCaptcha(): Promise<{
    token: string;
    imageBase64: string;
  }> {
    // Create a completely fresh axios instance to avoid any interceptors
    const freshClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    try {
      const response = await freshClient.get('/password/captcha');
      return response.data;
    } catch (error) {
      console.error('❌ ApiService: CAPTCHA generation failed:', error);
      
      // If it's a 401 error, the backend CAPTCHA endpoint is incorrectly configured
      // to require authentication when it should be public
      if (error.response?.status === 401) {
        throw new Error('CAPTCHA endpoint requires backend configuration fix - it should be publicly accessible');
      }
      
      throw error;
    }
  }

  /**
   * Validate CAPTCHA (Public endpoint)
   */
  async validateCaptcha(token: string, captcha: string): Promise<{
    valid: boolean;
    message?: string;
  }> {
    // Create a completely fresh axios instance to avoid any interceptors
    const freshClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const response = await freshClient.post('/password/captcha/validate', {
      token,
      captcha
    });
    return response.data;
  }

  // ===== Site Management API =====

  /**
   * Get all available sites from device status logs
   */
  async getAvailableSites(): Promise<AvailableSitesResponse> {
    const response = await this._client.get('/sites/available');
    return response.data;
  }

  /**
   * Get all distributors
   */
  async getDistributors(): Promise<DistributorResponse[]> {
    const response = await this._client.get('/users/distributors');
    return response.data;
  }

  /**
   * Get assignable sites for a specific distributor
   */
  async getDistributorAssignableSites(distributorId: number): Promise<AssignableSiteInfo[]> {
    const response = await this._client.get(`/users/${distributorId}/assignable-sites`);
    return response.data;
  }

  /**
   * Get all available sites from device status endpoint
   * Only accessible by SUPER_ADMIN and ADMINISTRATOR roles
   */
  async getDeviceStatusSites(): Promise<string[]> {
    const response = await this._client.get('/device-status/sites');
    return response.data;
  }

  /**
   * Get users with hierarchy (parent-child relationships)
   */
  async getUsersWithHierarchy(params: GetUsersParams = {}): Promise<PaginatedResponse<UserResponse>> {
    const queryParams = new URLSearchParams();
    
        
    if (params.page !== undefined && params.page !== null) queryParams.append('page', params.page.toString());
    if (params.size !== undefined && params.size !== null) queryParams.append('size', params.size.toString());
    if (params.sortBy && params.sortBy !== null) queryParams.append('sortBy', params.sortBy);
    if (params.sortDir && params.sortDir !== null) queryParams.append('sortDir', params.sortDir);
    if (params.search && params.search !== null && params.search !== '') queryParams.append('search', params.search);
    if (params.role && params.role !== null && params.role !== '') queryParams.append('role', params.role);
    if (params.active !== undefined && params.active !== null) queryParams.append('active', params.active.toString());
    if (params.includeHierarchy !== undefined && params.includeHierarchy !== null) queryParams.append('includeHierarchy', params.includeHierarchy.toString());

        const response = await this._client.get(`/users?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Assign sites to user
   */
  async assignSitesToUser(userId: number, siteData: SiteAssignmentRequest): Promise<UserResponse> {
    const response = await this._client.post(`/users/${userId}/sites`, siteData);
    return response.data;
  }

  /**
   * Remove sites from user
   */
  async removeSitesFromUser(userId: number, siteNames: string[]): Promise<UserResponse> {
    const response = await this._client.delete(`/users/${userId}/sites`, {
      data: { siteNames }
    });
    return response.data;
  }

  // ===== Device Management API =====

  /**
   * Get all devices with pagination and filtering
   */
  async getDevices(params: DeviceQueryParams = {}): Promise<DeviceListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDir) queryParams.append('sortDir', params.sortDir);
    if (params.search) queryParams.append('search', params.search);
    // siteId parameter removed
    if (params.status) queryParams.append('status', params.status);
    if (params.type) queryParams.append('type', params.type);

    const response = await this._client.get(`/devices?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get device by ID
   */
  async getDeviceById(id: number): Promise<DeviceInfo> {
    const response = await this._client.get(`/devices/${id}`);
    return response.data;
  }

  /**
   * Create new device
   */
  async createDevice(deviceData: CreateDeviceRequest): Promise<DeviceInfo> {
    const response = await this._client.post('/devices', deviceData);
    return response.data;
  }

  /**
   * Update device
   */
  async updateDevice(id: number, deviceData: UpdateDeviceRequest): Promise<DeviceInfo> {
    const response = await this._client.put(`/devices/${id}`, deviceData);
    return response.data;
  }

  /**
   * Delete device
   */
  async deleteDevice(id: number): Promise<ApiResponse> {
    const response = await this._client.delete(`/devices/${id}`);
    return response.data;
  }

  // getDevicesBySite method removed

  /**
   * Update device status
   */
  async updateDeviceStatus(id: number, status: string): Promise<DeviceInfo> {
    const response = await this._client.patch(`/devices/${id}/status`, { status });
    return response.data;
  }

  /**
   * Get device history/logs
   */
  async getDeviceHistory(id: number, params: { startDate?: string; endDate?: string; limit?: number } = {}): Promise<any[]> {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await this._client.get(`/devices/${id}/history?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get device status logs with pagination and filtering
   */
  async getDeviceStatusLogs(params: {
    page?: number;
    size?: number;
    site?: string;
    category?: string;
    status?: string;
    deviceName?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.site) queryParams.append('site', params.site);
    if (params.category) queryParams.append('category', params.category);
    if (params.status) queryParams.append('status', params.status);
    if (params.deviceName) queryParams.append('deviceName', params.deviceName);

    const response = await this._client.get(`/device-status/logs?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get latest status row for each device.
   */
  async getLatestDeviceStatuses(): Promise<any[]> {
    const response = await this._publicClient.get('/device-status/devices/latest');
    return response.data;
  }

  /**
   * Export device status logs as CSV
   */
  async exportDeviceStatusLogs(): Promise<Blob> {
    const response = await this._client.get('/device-status/export/csv', {
      responseType: 'blob'
    });
    return response.data;
  }

  // ===== Dashboard API =====

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const response = await this._client.get('/dashboard');
    return response.data;
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<any> {
    const response = await this._client.get('/dashboard/stats');
    return response.data;
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(limit: number = 10): Promise<any[]> {
    const response = await this._client.get(`/dashboard/activities?limit=${limit}`);
    return response.data;
  }

  /**
   * Get hourly status chart data
   */
  async getHourlyStatusChart(params: { siteName?: string; site?: string; hours?: number } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.siteName) queryParams.append('siteName', params.siteName);
    if (params.site) queryParams.append('site', params.site);
    if (params.hours) queryParams.append('hours', params.hours.toString());

    const response = await this._client.get(`/analytics/hourly-status-chart?${queryParams.toString()}`);
    return response.data;
  }

  // ===== Analytics API =====

  /**
   * Get timeline analytics data
   */
  async getTimelineAnalytics(params: { period?: string; deviceType?: string } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.period) queryParams.append('period', params.period);
    if (params.deviceType) queryParams.append('deviceType', params.deviceType);

    const response = await this._client.get(`/analytics/timeline?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get category performance analytics data
   */
  async getCategoryPerformance(params: { period?: string } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.period) queryParams.append('period', params.period);

    const response = await this._client.get(`/analytics/category-performance?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get available sites for analytics
   */
  async getAnalyticsAvailableSites(): Promise<any> {
    const response = await this._client.get('/analytics/available-sites');
    return response.data;
  }

  // ===== RBAC API =====

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<UserResponse> {
    const response = await this._client.get('/users/current');
    return response.data;
  }

  /**
   * Get user's effective permissions
   */
  async getEffectivePermissions(): Promise<{
    canCreateUsers: boolean;
    canManageUsers: boolean;
    canDeleteUsers: boolean;
    canManageSites: boolean;
    canAccessAnalytics: boolean;
    canViewReports: boolean;
    canManageDevices: boolean;
    canAccessAdmin: boolean;
    availableRoles: string[];
  }> {
    const response = await this._client.get('/users/effective-permissions');
    return response.data;
  }

  /**
   * Validate site access for user
   */
  async validateSiteAccess(siteIds: string[]): Promise<{
    validSites: string[];
    invalidSites: string[];
  }> {
    const response = await this._client.post('/sites/validate', { siteIds });
    return response.data;
  }

  // ===== Profile API =====

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserResponse> {
    const response = await this._client.get('/profile');
    return response.data;
  }

  /**
   * Update current user profile
   */
  async updateProfile(profileData: Partial<UpdateUserRequest>): Promise<UserResponse> {
    const response = await this._client.put('/profile', profileData);
    return response.data;
  }

  // ===== Audit Logs API =====

  /**
   * Get all audit logs with pagination
   */
  async getAuditLogs(params: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
    action?: string;
    level?: string;
    status?: string;
  } = {}): Promise<{
    content: any[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDir) queryParams.append('sortDir', params.sortDir);
    if (params.action) queryParams.append('action', params.action);
    if (params.level) queryParams.append('level', params.level);
    if (params.status) queryParams.append('status', params.status);

    const response = await this._client.get(`/audit?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get specific audit log by ID
   */
  async getAuditLogById(id: number): Promise<any> {
    const response = await this._client.get(`/audit/${id}`);
    return response.data;
  }

  /**
   * Advanced filtering with date ranges
   */
  async filterAuditLogs(
    filterData: {
      action?: string | null;
      resource?: string | null;
      level?: string | null;
      status?: string | null;
      userId?: number | null;
      username?: string | null;
      siteId?: number | null;
      ipAddress?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      keyword?: string | null;
      siteName?: string | null;
    },
    paginationParams: {
      page?: number;
      size?: number;
      sortBy?: string;
      sortDir?: string;
    } = {}
  ): Promise<{
    content: any[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    const queryParams = new URLSearchParams();
    
    // Add pagination parameters to query string
    if (paginationParams.page !== undefined) queryParams.append('page', paginationParams.page.toString());
    if (paginationParams.size !== undefined) queryParams.append('size', paginationParams.size.toString());
    if (paginationParams.sortBy) queryParams.append('sortBy', paginationParams.sortBy);
    if (paginationParams.sortDir) queryParams.append('sortDir', paginationParams.sortDir);

    // Clean filter data - convert empty strings to null
    const cleanFilterData = {
      action: filterData.action || null,
      resource: filterData.resource || null,
      level: filterData.level || null,
      status: filterData.status || null,
      userId: filterData.userId || null,
      username: filterData.username || null,
      siteId: filterData.siteId || null,
      ipAddress: filterData.ipAddress || null,
      startDate: filterData.startDate || null,
      endDate: filterData.endDate || null,
      keyword: filterData.keyword || null,
      siteName: filterData.siteName || null
    };

    const response = await this._client.post(`/audit/filter?${queryParams.toString()}`, cleanFilterData);
    return response.data;
  }

  /**
   * Get logs for specific user
   */
  async getAuditLogsByUser(userId: number, params: {
    page?: number;
    size?: number;
  } = {}): Promise<{
    content: any[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    const response = await this._client.get(`/audit/user/${userId}?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get logs for specific site
   */
  async getAuditLogsBySite(siteName: string, params: {
    page?: number;
    size?: number;
  } = {}): Promise<{
    content: any[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/audit/site/${encodeURIComponent(siteName)}?${queryString}` : `/audit/site/${encodeURIComponent(siteName)}`;
    const response = await this._client.get(url);
    return response.data;
  }

  /**
   * Get recent logs (last 24 hours)
   */
  async getRecentAuditLogs(params: {
    limit?: number;
    page?: number;
    size?: number;
  } = {}): Promise<{
    content: any[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    const response = await this._client.get(`/audit/recent?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Search logs by keyword
   */
  async searchAuditLogs(keyword: string, params: {
    page?: number;
    size?: number;
    action?: string;
    level?: string;
    status?: string;
  } = {}): Promise<{
    content: any[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('keyword', keyword);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.action) queryParams.append('action', params.action);
    if (params.level) queryParams.append('level', params.level);
    if (params.status) queryParams.append('status', params.status);

    const response = await this._client.get(`/audit/search?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get audit log statistics
   */
  async getAuditStatistics(): Promise<any> {
    const response = await this._client.get('/audit/statistics');
    return response.data;
  }

  // ===== Utility Methods =====

  /**
   * Get all available roles
   */
  async getRoles(): Promise<string[]> {
    const response = await this._client.get('/roles');
    return response.data;
  }

  /**
   * Get all device types
   */
  async getDeviceTypes(): Promise<string[]> {
    const response = await this._client.get('/device-types');
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this._client.get('/health');
    return response.data;
  }

  /**
   * Search across all entities
   */
  async globalSearch(query: string, entityTypes: string[] = ['users', 'devices']): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    entityTypes.forEach(type => queryParams.append('types', type));

    const response = await this._client.get(`/search?${queryParams.toString()}`);
    return response.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;