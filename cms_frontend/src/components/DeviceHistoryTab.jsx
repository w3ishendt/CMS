import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

const DeviceHistoryTab = ({ data, loading, filters, setFilters, getStatusBadge, getStatusIcon }) => {
  const { isDarkMode } = useTheme();
  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleSortChange = (field) => {
    const newSortDir = filters.sortBy === field && filters.sortDir === 'desc' ? 'asc' : 'desc';
    setFilters({ ...filters, sortBy: field, sortDir: newSortDir });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* 🔍 Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select 
          value={filters.size}
          onChange={(e) => setFilters({ ...filters, size: parseInt(e.target.value), page: 0 })}
          className={`px-3 py-2 border rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 ${
            isDarkMode 
              ? 'bg-gray-700/70 border-gray-600 text-gray-200 hover:bg-gray-700/90' 
              : 'bg-white/70 border-gray-300 text-gray-900 hover:bg-white/90'
          }`}
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      {/* 📊 Data Table */}
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y transition-colors duration-300 ${
          isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
        }`}>
          <thead className={`transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'
          }`}>
            <tr>
              {[
                { key: 'site', label: 'Site' },
                { key: 'category', label: 'Type' },
                { key: 'deviceName', label: 'Device Name' },
                { key: 'ip', label: 'IP Address' },
                { key: 'status', label: 'Status' },
                { key: 'duration', label: 'Duration' },
                { key: 'logTime', label: 'Log Time' }
              ].map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSortChange(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-all duration-300 hover:scale-105 ${
                    isDarkMode 
                      ? 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {filters.sortBy === column.key && (
                      <span>{filters.sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/30 divide-gray-700' 
              : 'bg-white divide-gray-200'
          }`}>
            {data.content?.map((device, index) => (
                <tr key={index} className={`transition-all duration-300 hover:scale-[1.02] ${
                  isDarkMode 
                    ? 'hover:bg-gray-700/30' 
                    : 'hover:bg-gray-50'
                }`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {device.site}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full transition-all duration-300 hover:scale-105 ${
                      isDarkMode 
                        ? 'bg-blue-900/50 text-blue-300' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {device.category}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {device.deviceName}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {device.ip}
                  </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(device.status)}
                    <span className={getStatusBadge(device.status)}>
                      {device.status}
                    </span>
                  </div>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {device.duration}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {new Date(device.logTime).toLocaleString()}
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📄 Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className={`text-sm transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Showing {data.currentPage * data.pageSize + 1} to{' '}
            {Math.min((data.currentPage + 1) * data.pageSize, data.totalElements)} of{' '}
            {data.totalElements} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(data.currentPage - 1)}
              disabled={!data.hasPrevious}
              className={`px-3 py-2 border rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className={`px-3 py-2 text-sm rounded-md transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
                : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              Page {data.currentPage + 1} of {data.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(data.currentPage + 1)}
              disabled={!data.hasNext}
              className={`px-3 py-2 border rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceHistoryTab;