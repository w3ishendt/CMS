import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchTab = ({ apiBase }) => {
  const [searchType, setSearchType] = useState('device');
  const [searchParams, setSearchParams] = useState({
    deviceName: '',
    ip: '',
    site: '',
    days: 7
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      let url = '';
      if (searchType === 'device') {
        url = `${apiBase}/device?deviceName=${searchParams.deviceName}&ip=${searchParams.ip}&days=${searchParams.days}`;
      } else if (searchType === 'site') {
        url = `${apiBase}/site?site=${searchParams.site}&days=${searchParams.days}`;
      } else if (searchType === 'transitions') {
        url = `${apiBase}/transitions?days=${searchParams.days}`;
        if (searchParams.deviceName && searchParams.ip) {
          url += `&deviceName=${searchParams.deviceName}&ip=${searchParams.ip}`;
        }
      }

      const response = await fetch(url);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* 🔍 Search Form */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Device History</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="device">Specific Device</option>
            <option value="site">Site Devices</option>
            <option value="transitions">Status Transitions</option>
          </select>

          <select
            value={searchParams.days}
            onChange={(e) => setSearchParams({ ...searchParams, days: parseInt(e.target.value) })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Last 1 day</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>

          {(searchType === 'device' || searchType === 'transitions') && (
            <>
              <input
                type="text"
                placeholder="Device Name"
                value={searchParams.deviceName}
                onChange={(e) => setSearchParams({ ...searchParams, deviceName: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="IP Address"
                value={searchParams.ip}
                onChange={(e) => setSearchParams({ ...searchParams, ip: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}

          {searchType === 'site' && (
            <input
              type="text"
              placeholder="Site Name"
              value={searchParams.site}
              onChange={(e) => setSearchParams({ ...searchParams, site: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
            />
          )}
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <MagnifyingGlassIcon className="w-4 h-4" />
          )}
          <span>{loading ? 'Searching...' : 'Search'}</span>
        </button>
      </div>

      {/* 📊 Search Results */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
          </div>
          <div className="overflow-x-auto">
            <div className="animate-pulse">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 px-6 py-3 border-b">
                <div className="grid grid-cols-7 gap-4">
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="bg-white divide-y divide-gray-200">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="grid grid-cols-7 gap-4 items-center">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
                      <div className="h-4 bg-gradient-to-r from-blue-200 to-blue-300 rounded w-1/2"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                      <div className="h-6 bg-gradient-to-r from-green-200 to-green-300 rounded-full w-16"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Loading indicator */}
          <div className="flex items-center justify-center py-6">
            <MagnifyingGlassIcon className="w-5 h-5 animate-pulse text-blue-500 mr-2" />
            <span className="text-blue-600 font-medium">Searching</span>
            <span className="ml-1 text-blue-500 animate-bounce">...</span>
          </div>
        </div>
      )}
      
      {!loading && searchResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results ({searchResults.length} records)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.site}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.deviceName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.ip}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                        record.status === 'OFFLINE' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(record.logTime).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchTab;