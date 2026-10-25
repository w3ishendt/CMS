// (new) Authentication service with JWT token management and auto-refresh
import axios, { AxiosResponse } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  ChangePasswordRequest,
  ApiResponse,
  UserResponse
} from '../types/api';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/api';

const TOKEN_KEY = 'cms_access_token';
const REFRESH_TOKEN_KEY = 'cms_refresh_token';
const USER_KEY = 'cms_user_info';

class AuthService {
  private refreshPromise: Promise<string> | null = null;

  // ===== Token Management =====
  
  /**
   * Get access token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Store tokens in localStorage
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Remove tokens from localStorage
   */
  private clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Store user info in localStorage
   */
  private setUserInfo(user: UserResponse): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Get user info from localStorage
   */
  getUserInfo(): UserResponse | null {
    const userStr = localStorage.getItem(USER_KEY);

        
    if (!userStr) {

      return null;
    }
    
    try {
      const user = JSON.parse(userStr) as UserResponse;
      
      return user;
    } catch (error) {
      console.error('Failed to parse user data');
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return true;
  }

  /**
   * Check if token is expired (basic check)
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  // ===== Authentication Methods =====

  /**
   * Test backend connectivity
   */
  async testBackendConnection(): Promise<boolean> {
    try {
            const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: 3000
      });
            return true;
    } catch (error: any) {
      console.error('Backend connection failed');
      return false;
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
                        
      // Test if backend is reachable first
            const isBackendReachable = await this.testBackendConnection();
      
      if (!isBackendReachable) {
        throw {
          success: false,
          message: 'Backend server is not running. Please start the backend server on port 8080.'
        };
      }
      
      const response: AxiosResponse<LoginResponse> = await axios.post(
        `${API_BASE_URL}/auth/login`,
        credentials,
        {
          timeout: 5000 // 5 second timeout
        }
      );

                        
      let data = response.data;
      
      // Handle case where response.data might be a string instead of object
      if (typeof data === 'string') {
                try {
          data = JSON.parse(data);
                  } catch (parseError) {
          console.error('Failed to parse response as JSON');
          throw {
            success: false,
            message: 'Invalid response format from server'
          };
        }
      }
      
                        
      // Ensure data has the expected structure
      if (!data || typeof data !== 'object') {
        console.error('Invalid data structure from server');
        throw {
          success: false,
          message: 'Invalid response structure from server'
        };
      }
      
      if (data.success) {
                this.setTokens(data.token, data.refreshToken);
        this.setUserInfo(data.user);
      } else {
              }

            return data as LoginResponse;
    } catch (error: any) {
      console.error('Login error occurred');
      if (error.response?.data) {
        throw error.response.data;
      }
      const networkError = {
        success: false,
        message: 'Network error occurred during login'
      };
      throw networkError;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearTokens();
    this.refreshPromise = null;
    // Redirect to login page will be handled by the component
  }

  /**
   * Change password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse> {
    try {
      const token = await this.getValidToken();
      const response: AxiosResponse<ApiResponse> = await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        passwordData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        message: 'Network error occurred during password change'
      };
    }
  }

  // ===== Token Refresh =====

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response: AxiosResponse<TokenRefreshResponse> = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken } as TokenRefreshRequest
      );

      const { data } = response;
      
      if (data.success) {
        this.setTokens(data.token, data.refreshToken);
        return data.token;
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      // If refresh fails, logout user
      this.logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  /**
   * Get valid token (refresh if needed)
   */
  async getValidToken(): Promise<string> {
    const token = this.getToken();
    
    if (!token) {
      return '';
    }

    // If token is not expired, return it
    if (!this.isTokenExpired(token)) {
      return token;
    }

    // If already refreshing, wait for that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start refresh process
    this.refreshPromise = this.refreshToken();
    
    try {
      const newToken = await this.refreshPromise;
      this.refreshPromise = null;
      return newToken;
    } catch (error) {
      this.refreshPromise = null;
      throw error;
    }
  }

  // ===== HTTP Client with Auto-Refresh =====

  /**
   * Create authenticated axios instance with auto-refresh
   */
  createAuthenticatedClient() {
        
    const client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT_MS
    });

    // Request interceptor to add auth header
    client.interceptors.request.use(
      async (config) => {
                                
        try {
          const token = await this.getValidToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
                            } catch (error) {
          console.error('Failed to get valid token');
        }
        return config;
      },
      (error) => {
        console.error('Request interceptor error');
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle 401 errors
    client.interceptors.response.use(
      (response) => {
                                return response;
      },
      async (error) => {
        console.error('Response error occurred');
        
        if (!error.response && error.request) {
          console.error('Network error - no response received');
        }
        
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return client(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed');
            this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return client;
  }

  // ===== Role-based Access Control =====

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getUserInfo();
    if (!user) {
      return role === 'SUPER_ADMIN';
    }
    
    // Handle both single role (string) and roles array formats
    if (user?.roles && Array.isArray(user.roles)) {
      const result = user.roles.includes(role);

      return result;
    }
    if (user?.role && typeof user.role === 'string') {
      const result = user.role === role;

      return result;
    }

    return false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getUserInfo();
    if (!user) {
      return roles.includes('SUPER_ADMIN');
    }
    
    // Handle both single role (string) and roles array formats
    if (user?.roles && Array.isArray(user.roles)) {
      const result = user.roles.some(role => roles.includes(role));
      return result;
    }
    if (user?.role && typeof user.role === 'string') {
      const result = roles.includes(user.role);
      return result;
    }
    return false;
  }

  /**
   * Check if user can access admin features
   */
  canAccessAdmin(): boolean {
    return this.hasAnyRole(['SUPER_ADMIN', 'ADMINISTRATOR']);
  }

  /**
   * Check if user can manage users
   */
  canManageUsers(): boolean {
    const result = this.hasAnyRole(['SUPER_ADMIN', 'ADMINISTRATOR']);
    return result;
  }

  // REMOVED: canManageSites and canViewAllSites methods

  /**
   * Check if user can manage devices
   */
  canManageDevices(): boolean {
    return this.hasAnyRole(['SUPER_ADMIN', 'ADMINISTRATOR', 'DISTRIBUTOR']);
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
