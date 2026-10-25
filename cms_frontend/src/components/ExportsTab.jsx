import React, { useState } from 'react';
import { 
  DocumentArrowDownIcon, 
  CalendarIcon, 
  ServerIcon, 
  BuildingOfficeIcon,
  DocumentTextIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

const ExportsTab = ({ allFiles, onRefresh, apiBase }) => {
  const [loading, setLoading] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [deviceFilters, setDeviceFilters] = useState({
    deviceName: '',
    ip: '',
    days: 7
  });
  const [siteFilters, setSiteFilters] = useState({
    site: '',
    days: 7
  });

  // 🎯 Generate Report (supports CSV, PDF, DOCX)
  const generateReport = async (format, type = 'today', customParams = {}) => {
    const loadingKey = `${format}_${type}`;
    setLoading({ ...loading, [loadingKey]: true });
    
    try {
      let url = '';
      let params = new URLSearchParams();
      
      switch (type) {
        case 'today':
          url = `${apiBase}/${format}/today`;
          break;
        case 'date':
          url = `${apiBase}/${format}/date`;
          params.append('date', selectedDate);
          break;
        case 'device':
          if (!deviceFilters.deviceName || !deviceFilters.ip) {
            alert('Please enter device name and IP address');
            return;
          }
          url = `${apiBase}/${format}/device`;
          params.append('deviceName', deviceFilters.deviceName);
          params.append('ip', deviceFilters.ip);
          params.append('days', deviceFilters.days);
          break;
        case 'site':
          if (!siteFilters.site) {
            alert('Please enter site name');
            return;
          }
          url = `${apiBase}/${format}/site`;
          params.append('site', siteFilters.site);
          params.append('days', siteFilters.days);
          break;
        case 'all':
          url = `${apiBase}/${format}/generate`;
          params.append('days', customParams.days || 7);
          break;
      }
      
      const response = await fetch(`${url}?${params}`, { method: 'POST' });
      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ ${result.message}`);
        onRefresh();
        
        // Auto-download the file
        if (result.fileName) {
          setTimeout(() => {
            window.open(`${apiBase}/${format}/download/${result.fileName}`, '_blank');
          }, 1000);
        }
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Failed to generate ${format.toUpperCase()}: ${error.message}`);
    }
    
    setLoading({ ...loading, [loadingKey]: false });
  };

  // 🔥 Generate ALL FORMATS at once
  const generateAllFormats = async (type) => {
    const loadingKey = `all_${type}`;
    setLoading({ ...loading, [loadingKey]: true });
    
    try {
      let params = new URLSearchParams({ type });
      
      switch (type) {
        case 'device':
          if (!deviceFilters.deviceName || !deviceFilters.ip) {
            alert('Please enter device name and IP address');
            return;
          }
          params.append('deviceName', deviceFilters.deviceName);
          params.append('ip', deviceFilters.ip);
          params.append('days', deviceFilters.days);
          break;
        case 'site':
          if (!siteFilters.site) {
            alert('Please enter site name');
            return;
          }
          params.append('site', siteFilters.site);
          params.append('days', siteFilters.days);
          break;
        case 'date':
          params.append('date', selectedDate);
          break;
        case 'today':
          // No additional params needed
          break;
        default:
          params.append('days', 7);
      }
      
      const response = await fetch(`${apiBase}/reports/generate-all?${params}`, { 
        method: 'POST' 
      });
      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ ${result.message} - All formats generated!`);
        onRefresh();
        
        // Auto-download all files
        if (result.files) {
          Object.entries(result.files).forEach(([format, filePath], index) => {
            const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            setTimeout(() => {
              window.open(`${apiBase}/${format}/download/${fileName}`, '_blank');
            }, (index + 1) * 1000); // Stagger downloads
          });
        }
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Failed to generate all formats: ${error.message}`);
    }
    
    setLoading({ ...loading, [loadingKey]: false });
  };

  // 📥 Download File
  const downloadFile = (fileName, format) => {
    window.open(`${apiBase}/${format}/download/${fileName}`, '_blank');
  };

  // 🎨 Format Badge
  const getFormatBadge = (fileName) => {
    if (fileName.endsWith('.csv')) return 'bg-green-100 text-green-800';
    if (fileName.endsWith('.pdf')) return 'bg-red-100 text-red-800';
    // if (fileName.endsWith('.docx')) return 'bg-blue-100 text-blue-800'; // DOCX functionality commented out - might use back later
    return 'bg-gray-100 text-gray-800';
  };

  const getFormatIcon = (fileName) => {
    if (fileName.endsWith('.csv')) return <DocumentTextIcon className="w-4 h-4" />;
    if (fileName.endsWith('.pdf')) return <DocumentIcon className="w-4 h-4" />;
    // if (fileName.endsWith('.docx')) return <DocumentIcon className="w-4 h-4" />; // DOCX functionality commented out - might use back later
    return <DocumentIcon className="w-4 h-4" />;
  };

  const getFileFormat = (fileName) => {
    if (fileName.endsWith('.csv')) return 'csv';
    if (fileName.endsWith('.pdf')) return 'pdf';
    // if (fileName.endsWith('.docx')) return 'docx'; // DOCX functionality commented out - might use back later
    return 'unknown';
  };

  return (
    <div className="space-y-8">
      {/* 🚀 Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CalendarIcon className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-900">Today's Data</h3>
          </div>
          <p className="text-blue-700 mb-4">Export all device data from today</p>
          
          {loading.all_today ? (
            <div className="grid grid-cols-3 gap-2 mb-3 animate-pulse">
              {/* Skeleton for format buttons */}
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['csv', 'pdf' /* , 'docx' */].map(format => ( // DOCX functionality commented out - might use back later
                <button
                  key={format}
                  onClick={() => generateReport(format, 'today')}
                  disabled={loading[`${format}_today`]}
                  className={`px-3 py-2 rounded text-sm font-medium disabled:opacity-50 ${
                    format === 'csv' ? 'bg-green-600 hover:bg-green-700' :
                    format === 'pdf' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {loading[`${format}_today`] ? '...' : format.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          
          {/* All Formats Button */}
          <button
            onClick={() => generateAllFormats('today')}
            disabled={loading.all_today}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading.all_today ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <DocumentArrowDownIcon className="w-4 h-4" />
            )}
            <span>{loading.all_today ? 'Generating All...' : 'Generate All Formats'}</span>
          </button>
        </div>

        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CalendarIcon className="w-6 h-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-purple-900">Specific Date</h3>
          </div>
          <div className="space-y-3">
            {loading.all_date ? (
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md animate-pulse"></div>
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}
            
            {loading.all_date ? (
              <div className="grid grid-cols-3 gap-2 animate-pulse">
                {/* Skeleton for format buttons */}
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {['csv', 'pdf' /* , 'docx' */].map(format => ( // DOCX functionality commented out - might use back later
                  <button
                    key={format}
                    onClick={() => generateReport(format, 'date')}
                    disabled={loading[`${format}_date`]}
                    className={`px-3 py-2 rounded text-sm font-medium disabled:opacity-50 ${
                      format === 'csv' ? 'bg-green-600 hover:bg-green-700' :
                      format === 'pdf' ? 'bg-red-600 hover:bg-red-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {loading[`${format}_date`] ? '...' : format.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            
            {/* All Formats Button */}
            <button
              onClick={() => generateAllFormats('date')}
              disabled={loading.all_date}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading.all_date ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <DocumentArrowDownIcon className="w-4 h-4" />
              )}
              <span>{loading.all_date ? 'Generating All...' : 'Generate All Formats'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🎯 Advanced Exports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 🖥️ Device Export */}
        {/* <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ServerIcon className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-green-900">Specific Device</h3>
          </div>
          
          {loading.all_device ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md"></div>
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md"></div>
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md"></div>
              <div className="grid grid-cols-3 gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                ))}
              </div>
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Device Name (e.g., Exit-207)"
                value={deviceFilters.deviceName}
                onChange={(e) => setDeviceFilters({ ...deviceFilters, deviceName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                placeholder="IP Address (e.g., 10.10.8.237)"
                value={deviceFilters.ip}
                onChange={(e) => setDeviceFilters({ ...deviceFilters, ip: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                value={deviceFilters.days}
                onChange={(e) => setDeviceFilters({ ...deviceFilters, days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={1}>Last 1 day</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
              
              {/* Individual Format Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {['csv', 'pdf' /* , 'docx' */].map(format => ( // DOCX functionality commented out - might use back later
                  <button
                    key={format}
                    onClick={() => generateReport(format, 'device')}
                    disabled={loading[`${format}_device`]}
                    className={`px-3 py-2 rounded text-sm font-medium disabled:opacity-50 ${
                      format === 'csv' ? 'bg-green-600 hover:bg-green-700' :
                      format === 'pdf' ? 'bg-red-600 hover:bg-red-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {loading[`${format}_device`] ? '...' : format.toUpperCase()}
                  </button>
                ))}
              </div>
              
              {/* All Formats Button */}
              <button
                onClick={() => generateAllFormats('device')}
                disabled={loading.all_device}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading.all_device ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <DocumentArrowDownIcon className="w-4 h-4" />
                )}
                <span>{loading.all_device ? 'Generating All...' : 'Generate All Formats'}</span>
              </button>
            </div>
          )}
        </div> */}

        {/* 🏢 Site Export */}
        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BuildingOfficeIcon className="w-6 h-6 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-orange-900">Specific Site</h3>
          </div>
          
          {loading.all_site ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md"></div>
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md"></div>
              <div className="grid grid-cols-3 gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                ))}
              </div>
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Site Name (e.g., Office SIT Devices)"
                value={siteFilters.site}
                onChange={(e) => setSiteFilters({ ...siteFilters, site: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <select
                value={siteFilters.days}
                onChange={(e) => setSiteFilters({ ...siteFilters, days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={1}>Last 1 day</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
              
              {/* Individual Format Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {['csv', 'pdf' /* , 'docx' */].map(format => ( // DOCX functionality commented out - might use back later
                  <button
                    key={format}
                    onClick={() => generateReport(format, 'site')}
                    disabled={loading[`${format}_site`]}
                    className={`px-3 py-2 rounded text-sm font-medium disabled:opacity-50 ${
                      format === 'csv' ? 'bg-green-600 hover:bg-green-700' :
                      format === 'pdf' ? 'bg-red-600 hover:bg-red-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {loading[`${format}_site`] ? '...' : format.toUpperCase()}
                  </button>
                ))}
              </div>
              
              {/* All Formats Button */}
              <button
                onClick={() => generateAllFormats('site')}
                disabled={loading.all_site}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading.all_site ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <DocumentArrowDownIcon className="w-4 h-4" />
                )}
                <span>{loading.all_site ? 'Generating All...' : 'Generate All Formats'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 📁 Generated Files */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Generated Files</h3>
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {(!allFiles?.csv?.length && !allFiles?.pdf?.length /* && !allFiles?.docx?.length */) ? ( // DOCX functionality commented out - might use back later
            <div className="px-6 py-8 text-center text-gray-500">
              No files generated yet
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {/* CSV Files */}
              {allFiles?.csv?.map((file, index) => (
                <div key={`csv-${index}`} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {getFormatIcon(file)}
                    <div>
                      <p className="font-medium text-gray-900">{file}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFormatBadge(file)}`}>
                          CSV
                        </span>
                        <span className="text-sm text-gray-500">
                          {file.includes('device-changes') ? 'Device Report' :
                           file.includes('site-changes') ? 'Site Report' :
                           file.includes('daily') ? 'Daily Report' : 'General Report'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(file, 'csv')}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
              
              {/* PDF Files */}
              {allFiles?.pdf?.map((file, index) => (
                <div key={`pdf-${index}`} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {getFormatIcon(file)}
                    <div>
                      <p className="font-medium text-gray-900">{file}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFormatBadge(file)}`}>
                          PDF
                        </span>
                        <span className="text-sm text-gray-500">
                          {file.includes('device-changes') ? 'Device Report' :
                           file.includes('site-changes') ? 'Site Report' :
                           file.includes('daily') ? 'Daily Report' : 'General Report'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(file, 'pdf')}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
              
              {/* DOCX functionality commented out - might use back later
              {allFiles?.docx?.map((file, index) => (
                <div key={`docx-${index}`} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {getFormatIcon(file)}
                    <div>
                      <p className="font-medium text-gray-900">{file}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFormatBadge(file)}`}>
                          DOCX
                        </span>
                        <span className="text-sm text-gray-500">
                          {file.includes('device-changes') ? 'Device Report' :
                           file.includes('site-changes') ? 'Site Report' :
                           file.includes('daily') ? 'Daily Report' : 'General Report'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(file, 'docx')}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
              */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportsTab;