import React from 'react';

const SiteSelector = ({ 
  role, 
  selectedSites, 
  availableSites, 
  onSiteChange, 
  loading = false, 
  error = null 
}) => {
  if (role !== 'OPERATOR' && role !== 'MULTI_SITE_OPERATOR') {
    return null;
  }

  const handleSingleSiteChange = (siteValue) => {
    onSiteChange(siteValue ? [siteValue] : []);
  };

  const handleMultiSiteChange = (site, checked) => {
    if (checked) {
      onSiteChange([...selectedSites, site]);
    } else {
      onSiteChange(selectedSites.filter(s => s !== site));
    }
  };

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Site Assignment *
      </label>
      <div className="mt-1">
        {role === 'OPERATOR' ? (
          // Single site selection for OPERATOR
          <select
            value={selectedSites[0] || ''}
            onChange={(e) => handleSingleSiteChange(e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={loading}
          >
            <option value="">Select a site</option>
            {availableSites.map(site => (
              <option key={site} value={site}>{site}</option>
            ))}
          </select>
        ) : (
          // Multi-site selection for MULTI_SITE_OPERATOR
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 dark:border-gray-600">
            {loading ? (
              <div className="text-center py-2 text-gray-500">Loading sites...</div>
            ) : availableSites.length === 0 ? (
              <div className="text-center py-2 text-gray-500">No sites available</div>
            ) : (
              availableSites.map(site => (
                <label key={site} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedSites.includes(site)}
                    onChange={(e) => handleMultiSiteChange(site, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{site}</span>
                </label>
              ))
            )}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        
        {/* Help text */}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {role === 'OPERATOR' 
            ? 'OPERATOR role requires exactly 1 site'
            : 'MULTI_SITE_OPERATOR role requires at least 1 site'
          }
        </p>
      </div>
    </div>
  );
};

export default SiteSelector;