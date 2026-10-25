import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const DeviceLogs = () => {
  const { isAuthenticated, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState({
    site: '',
    category: '',
    status: '',
    deviceName: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  const fetchLogs = async () => {
    if (!isAuthenticated) {
      setError('Please log in to view device logs');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        size: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      };

      const data = await apiService.getDeviceStatusLogs(params);
      
      setLogs(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error.response?.data?.message || 'Failed to fetch device logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0); // Reset to first page when filtering
  };

  const exportLogs = async () => {
    if (!isAuthenticated) {
      setError('Please log in to export logs');
      return;
    }

    try {
      const blob = await apiService.exportDeviceStatusLogs();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `device_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
      setError(error.response?.data?.message || 'Failed to export logs');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📋 Device Logs</h2>
            <p className="mt-1 text-sm text-gray-600">Historical device status logs</p>
          </div>
          <button
            onClick={exportLogs}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <input
              type="text"
              placeholder="Filter by site..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.site}
              onChange={(e) => handleFilterChange('site', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              placeholder="Filter by category..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
            <input
              type="text"
              placeholder="Filter by device..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.deviceName}
              onChange={(e) => handleFilterChange('deviceName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Check */}
      {!isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-400 mr-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Authentication Required</h3>
              <p className="text-sm text-yellow-700 mt-1">Please log in to view device logs.</p>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="animate-pulse">
            {/* Table Header Skeleton */}
            <div className="bg-gray-50 px-6 py-3">
              <div className="grid grid-cols-6 gap-4">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-12"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-10"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-14"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-18"></div>
              </div>
            </div>
            
            {/* Table Rows Skeleton */}
            <div className="bg-white divide-y divide-gray-200">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="px-6 py-4">
                  <div className="grid grid-cols-6 gap-4 items-center">
                    {/* Device column */}
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 mb-1"></div>
                        <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
                      </div>
                    </div>
                    
                    {/* Status column */}
                    <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-16"></div>
                    
                    {/* Site column */}
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
                    
                    {/* Category column */}
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-12"></div>
                    
                    {/* Duration column */}
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                    
                    {/* Timestamp column */}
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-28"></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Skeleton */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex space-x-2">
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${
                            log.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{log.deviceName}</div>
                            <div className="text-sm text-gray-500">{log.ip}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.status === 'ONLINE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.site}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.duration}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage + 1}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeviceLogs;