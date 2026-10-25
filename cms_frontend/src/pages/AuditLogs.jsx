import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, MapPin, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';

const AuditLogs = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    totalElements: 0,
    totalPages: 0,
    size: 20,
    number: 0
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    page: 0,
    size: 20,
    action: '',
    level: '',
    status: '',
    startDate: '',
    endDate: '',
    userId: ''
  });
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetail, setShowLogDetail] = useState(false);
  const [apiNotAvailable, setApiNotAvailable] = useState(false);

  // Action types for filter dropdown
  const actionTypes = [
    // User Management Actions
    'USER_CREATED',
    'USER_UPDATED', 
    'USER_DELETED',
    
    // Authentication & Security Actions
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'ACCOUNT_LOCKED',
    'ACCOUNT_UNLOCKED',
    'ACCOUNT_AUTO_UNLOCKED',
    
    // Password Management Actions
    'PASSWORD_CHANGED',
    'PASSWORD_CHANGE_FAILED',
    'PASSWORD_RESET',
    
    // Role & Permission Actions
    'ROLE_CHANGED',
    
    // Site Management Actions
    'SITE_ASSIGNED',
    'SITE_REMOVED',
    'ALL_SITES_REMOVED',
    'SITES_INHERITED',
    'SITE_INHERITANCE_SKIPPED'
  ];
  
  // Log levels for filter dropdown (updated to match backend enum)
  const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
  
  // Status types for filter dropdown (updated to match backend enum)
  const statusTypes = ['SUCCESS', 'FAILURE', 'ERROR', 'PENDING', 'CANCELLED'];

  // Check if user is super admin
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      setError('Access denied. Super admin privileges required.');
      setLoading(false);
      return;
    }
    fetchAuditLogs();
  }, [user, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (searchKeyword.trim()) {
        response = await apiService.searchAuditLogs(searchKeyword, {
          page: filters.page,
          size: filters.size,
          action: filters.action || undefined,
          level: filters.level || undefined,
          status: filters.status || undefined
        });
      } else if (hasActiveFilters()) {
        // Prepare filter data with proper null values and date formatting
        const filterData = {
          action: filters.action || null,
          resource: null,
          level: filters.level || null,
          status: filters.status || null,
          userId: filters.userId ? parseInt(filters.userId) : null,
          username: null,
          siteId: null,
          ipAddress: null,
          startDate: filters.startDate ? new Date(filters.startDate).toISOString() : null,
          endDate: filters.endDate ? new Date(filters.endDate).toISOString() : null,
          keyword: null
        };
        
        const paginationParams = {
          page: filters.page,
          size: filters.size,
          sortBy: 'timestamp',
          sortDir: 'desc'
        };
        
        response = await apiService.filterAuditLogs(filterData, paginationParams);
      } else {
        response = await apiService.getAuditLogs({
          page: filters.page,
          size: filters.size,
          sortBy: 'timestamp',
          sortDir: 'desc',
          action: filters.action || undefined,
          level: filters.level || undefined,
          status: filters.status || undefined
        });
      }
      
      setLogs(response.content || []);
      setPagination({
        totalElements: response.totalElements || 0,
        totalPages: response.totalPages || 0,
        size: response.size || 20,
        number: response.number || 0
      });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      if (err.response && err.response.status === 404) {
        setApiNotAvailable(true);
        setError('The audit log feature is not yet implemented in the backend. This feature will be available once the audit endpoints are deployed.');
      } else {
        setError('Failed to fetch audit logs. Please try again.');
      }
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = () => {
    return filters.startDate || filters.endDate || filters.userId || 
           filters.action || filters.level || filters.status;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 0 }));
    fetchAuditLogs();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 0 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleRecentLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      setSearchKeyword('');
      setFilters({
        page: 0,
        size: 20,
        action: '',
        level: '',
        status: '',
        startDate: '',
        endDate: '',
        userId: ''
      });
      
      const response = await apiService.getRecentAuditLogs({ page: 0, size: 20 });
      setLogs(response.content || []);
      setPagination({
        totalElements: response.totalElements || 0,
        totalPages: response.totalPages || 0,
        size: response.size || 20,
        number: response.number || 0
      });
      toast.success('Recent logs loaded');
    } catch (err) {
      console.error('Error fetching recent logs:', err);
      if (err.response && err.response.status === 404) {
        setApiNotAvailable(true);
        setError('The audit log feature is not yet implemented in the backend. This feature will be available once the audit endpoints are deployed.');
      } else {
        setError('Failed to fetch recent logs');
      }
      toast.error('Failed to fetch recent logs');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      page: 0,
      size: 20,
      action: '',
      level: '',
      status: '',
      startDate: '',
      endDate: '',
      userId: ''
    });
    setSearchKeyword('');
  };

  const viewLogDetail = async (logId) => {
    try {
      const logDetail = await apiService.getAuditLogById(logId);
      setSelectedLog(logDetail);
      setShowLogDetail(true);
    } catch (err) {
      console.error('Failed to fetch log details');
      if (err.response && err.response.status === 404) {
        toast.error('The audit log feature is not yet implemented in the backend. This feature will be available once the audit endpoints are deployed.');
      } else {
        toast.error('Failed to fetch log details');
      }
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLevelBadgeColor = (level) => {
    if (isDarkMode) {
      switch (level) {
        case 'ERROR': return 'bg-red-900/50 text-red-300 border border-red-700';
        case 'CRITICAL': return 'bg-red-900/70 text-red-200 border border-red-600';
        case 'WARNING': return 'bg-yellow-900/50 text-yellow-300 border border-yellow-700';
        case 'INFO': return 'bg-blue-900/50 text-blue-300 border border-blue-700';
        default: return 'bg-gray-700 text-gray-300 border border-gray-600';
      }
    } else {
      switch (level) {
        case 'ERROR': return 'bg-red-100 text-red-800';
        case 'CRITICAL': return 'bg-red-200 text-red-900';
        case 'WARNING': return 'bg-yellow-100 text-yellow-800';
        case 'INFO': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const getStatusBadgeColor = (status) => {
    if (isDarkMode) {
      switch (status) {
        case 'SUCCESS': return 'bg-green-900/50 text-green-300 border border-green-700';
        case 'FAILURE': return 'bg-red-900/50 text-red-300 border border-red-700';
        case 'ERROR': return 'bg-red-900/70 text-red-200 border border-red-600';
        case 'PENDING': return 'bg-yellow-900/50 text-yellow-300 border border-yellow-700';
        case 'CANCELLED': return 'bg-gray-700 text-gray-300 border border-gray-600';
        default: return 'bg-gray-700 text-gray-300 border border-gray-600';
      }
    } else {
      switch (status) {
        case 'SUCCESS': return 'bg-green-100 text-green-800';
        case 'FAILURE': return 'bg-red-100 text-red-800';
        case 'ERROR': return 'bg-red-200 text-red-900';
        case 'PENDING': return 'bg-yellow-100 text-yellow-800';
        case 'CANCELLED': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
  };

  if (user && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page. Super admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Audit Logs</h1>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Monitor and review system activities and user actions</p>
        </div>

        {/* API Not Available Warning */}
        {apiNotAvailable && (
          <div className={`mb-6 border rounded-lg p-4 ${
            isDarkMode 
              ? 'bg-yellow-900/20 border-yellow-700' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className={`h-5 w-5 ${
                  isDarkMode ? 'text-yellow-400' : 'text-yellow-400'
                }`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
                }`}>
                  Feature Under Development
                </h3>
                <div className={`mt-2 text-sm ${
                  isDarkMode ? 'text-yellow-400' : 'text-yellow-700'
                }`}>
                  <p>
                    The audit log feature is currently under development. The backend API endpoints are not yet implemented. 
                    This feature will be available once the audit endpoints are deployed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className={`rounded-lg shadow-sm border p-6 mb-6 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs by keyword..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleRecentLogs}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Recent (24h)
              </button>
            </div>
          </form>

          {/* Filter Toggle */}
          <div className="flex justify-between items-center">
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className={`mt-4 pt-4 border-t ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Start Date</label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>End Date</label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Action Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Action</label>
                  <select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Actions</option>
                    {actionTypes.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>

                {/* Level Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Level</label>
                  <select
                    value={filters.level}
                    onChange={(e) => handleFilterChange('level', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Levels</option>
                    {logLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Status</option>
                    {statusTypes.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                {/* User ID Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>User ID</label>
                  <input
                    type="number"
                    placeholder="Enter user ID"
                    value={filters.userId}
                    onChange={(e) => handleFilterChange('userId', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>



                {/* Page Size */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Page Size</label>
                  <select
                    value={filters.size}
                    onChange={(e) => handleFilterChange('size', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className={`border rounded-lg p-4 mb-6 ${
            isDarkMode 
              ? 'bg-red-900/20 border-red-700' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className={isDarkMode ? 'text-red-400' : 'text-red-700'}>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className={`rounded-lg shadow-sm border p-8 text-center ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Loading audit logs...</p>
          </div>
        )}

        {/* Audit Logs Table */}
        {!loading && !error && (
          <div className={`rounded-lg shadow-sm border overflow-hidden ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            {/* Table Header */}
            <div className={`px-6 py-4 border-b ${
              isDarkMode 
                ? 'border-gray-700 bg-gray-700' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Audit Logs ({pagination.totalElements} total)
                </h3>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>ID</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>Action</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>Resource</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>User</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>Site</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>Level</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>Status</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>IP Address</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>Timestamp</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isDarkMode 
                    ? 'bg-gray-800 divide-gray-700' 
                    : 'bg-white divide-gray-200'
                }`}>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="10" className={`px-6 py-12 text-center ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className={`${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {log.id}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isDarkMode 
                              ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {log.resource}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          <div className="flex items-center">
                            <User className={`h-4 w-4 mr-2 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-400'
                            }`} />
                            {log.username || 'N/A'}
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          <div className="flex items-center">
                            <MapPin className={`h-4 w-4 mr-2 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-400'
                            }`} />
                            {log.siteName || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(log.level)}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {log.ipAddress || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          <button
                            onClick={() => viewLogDetail(log.id)}
                            className={`transition-colors ${
                              isDarkMode 
                                ? 'text-blue-400 hover:text-blue-300' 
                                : 'text-blue-600 hover:text-blue-900'
                            }`}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className={`px-6 py-4 border-t ${
                isDarkMode 
                  ? 'border-gray-700 bg-gray-700' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Showing {pagination.number * pagination.size + 1} to{' '}
                    {Math.min((pagination.number + 1) * pagination.size, pagination.totalElements)} of{' '}
                    {pagination.totalElements} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.number - 1)}
                      disabled={pagination.number === 0}
                      className={`px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkMode 
                          ? 'border-gray-600 hover:bg-gray-600 text-white' 
                          : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    {(() => {
                      const currentPage = pagination.number;
                      const totalPages = pagination.totalPages;
                      const maxVisiblePages = 5;
                      
                      // Calculate start and end page numbers
                      let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
                      
                      // Adjust start page if we're near the end
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(0, endPage - maxVisiblePages + 1);
                      }
                      
                      // Generate unique page numbers
                      const pageNumbers = [];
                      for (let i = startPage; i <= endPage; i++) {
                        pageNumbers.push(i);
                      }
                      
                      return pageNumbers.map((pageNum) => (
                        <button
                          key={`page-${pageNum}`}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm border rounded-md ${
                            pageNum === pagination.number
                              ? 'bg-blue-600 text-white border-blue-600'
                              : isDarkMode 
                                ? 'border-gray-600 hover:bg-gray-600 text-white' 
                                : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      ));
                    })()}
                    
                    <button
                      onClick={() => handlePageChange(pagination.number + 1)}
                      disabled={pagination.number >= pagination.totalPages - 1}
                      className={`px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkMode 
                          ? 'border-gray-600 hover:bg-gray-600 text-white' 
                          : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Log Detail Modal */}
        {showLogDetail && selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className={`px-6 py-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex justify-between items-center">
                  <h3 className={`text-lg font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Audit Log Details</h3>
                  <button
                    onClick={() => setShowLogDetail(false)}
                    className={isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>ID</dt>
                    <dd className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedLog.id}</dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Action</dt>
                    <dd className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedLog.action}</dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Resource</dt>
                    <dd className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedLog.resource}</dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Resource ID</dt>
                    <dd className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedLog.resourceId || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>User</dt>
                    <dd className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedLog.username || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>User ID</dt>
                    <dd className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedLog.userId || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Site Name</dt>
                    <dd className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedLog.siteName || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>IP Address</dt>
                    <dd className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedLog.ipAddress || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Level</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(selectedLog.level)}`}>
                        {selectedLog.level}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedLog.status)}`}>
                        {selectedLog.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Timestamp</dt>
                    <dd className={`mt-1 text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{formatTimestamp(selectedLog.timestamp)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Details</dt>
                    <dd className={`mt-1 text-sm p-3 rounded-lg ${
                      isDarkMode 
                        ? 'text-white bg-gray-700' 
                        : 'text-gray-900 bg-gray-50'
                    }`}>
                      {selectedLog.details || 'No additional details available'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;