import React, { useState, useEffect } from 'react';
import { 
  Search, Download, Filter, Calendar, RefreshCw, 
  FileText, Database, Clock, 
  Server, MapPin, AlertCircle,
  ChevronLeft, ChevronRight, Eye,
  File, FileImage, BarChart3
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import Select from 'react-select';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';

const DEFAULT_FILTERS = {
  deviceName: '',
  ip: '',
  site: '',
  status: '',
  days: 7,
  source: 'google_sheet',
  sortBy: 'changeTime',
  sortDir: 'desc'
};



const DeviceHistoryDashboard = () => {
  const { isDarkMode } = useTheme();
  
  // State management
  const [activeTab, setActiveTab] = useState('history');
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [allFiles, setAllFiles] = useState({ 
    csv: [], 
    pdf: [] 
    /* DOCX functionality commented out - might use back later
    , docx: []
    */
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 0,
    size: 50,
    totalElements: 0,
    totalPages: 0
  });

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Report Generation Loading
  const [reportLoading, setReportLoading] = useState({});

  // Available Sites for dropdown
  const [availableSites, setAvailableSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [sitesError, setSitesError] = useState('');

  // Analytics report form state
  const [analyticsForm, setAnalyticsForm] = useState({
    status: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    site: ''
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsResults, setAnalyticsResults] = useState(null);



  const { user, isAuthenticated } = useAuth();

  // Fetch available sites
  const fetchAvailableSites = async () => {
    if (!isAuthenticated) {
      setSitesError('Please log in to access site data');
      return;
    }

    setSitesLoading(true);
    setSitesError('');
    try {
      const response = await apiService.client.get('/analytics/available-sites');
      
      if (!response.data) {
        throw new Error('No data received from API');
      }
      
      if (!Array.isArray(response.data)) {
        throw new Error('API returned invalid data format (expected array)');
      }
      
      // Handle both string array and object array formats
      const siteOptions = response.data.map(site => {
        if (typeof site === 'string') {
          return {
            value: site,
            label: site
          };
        } else if (site && typeof site === 'object' && site.value && site.label) {
          return {
            value: site.value,
            label: site.label
          };
        } else {
          console.warn('Unexpected site format:', site);
          return {
            value: site.toString(),
            label: site.toString()
          };
        }
      });
      
      setAvailableSites(siteOptions);
    } catch (err) {
      console.error('Failed to fetch available sites:', err);
      const errorMessage = `Failed to load available sites: ${err.message}. You can still type manually.`;
      setSitesError(errorMessage);
    } finally {
      setSitesLoading(false);
    }
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchAvailableSites(); // Fetch sites on component mount
    if (activeTab === 'history') {
      fetchDeviceHistory();
    } else if (activeTab === 'reports') {
      fetchAllFiles();
    }
  }, [activeTab, pagination.page, pagination.size, filters.days, filters.sortBy, filters.sortDir, filters.source, filters.status]);

  const formatRowTimestamp = (row) => {
    const raw = row.changeTime || row.logTime;
    if (!raw) {
      return '-';
    }

    const dateValue = new Date(raw);
    if (Number.isNaN(dateValue.getTime())) {
      return String(raw);
    }

    return format(dateValue, 'MMM dd, yyyy HH:mm:ss');
  };

  const formatDurationValue = (rawDuration) => {
    if (rawDuration === null || rawDuration === undefined || rawDuration === '') {
      return '-';
    }

    const text = String(rawDuration).trim();

    if (/^\d{2}:\d{2}:\d{2}$/.test(text)) {
      return text;
    }

    // Google Sheets can return duration-like values as a date-time string.
    const durationDate = new Date(text);
    if (!Number.isNaN(durationDate.getTime())) {
      const hh = String(durationDate.getUTCHours()).padStart(2, '0');
      const mm = String(durationDate.getUTCMinutes()).padStart(2, '0');
      const ss = String(durationDate.getUTCSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    }

    // Also handle numeric day-fraction values from spreadsheets.
    const numeric = Number(text);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      const totalSeconds = Math.round(numeric * 24 * 60 * 60);
      const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const ss = String(totalSeconds % 60).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    }

    return text;
  };



  const fetchDeviceHistory = async (overrides = {}) => {
    if (!isAuthenticated) {
      setError('Please log in to access device history');
      return;
    }

    const activeFilters = overrides.filters || filters;
    const activePagination = overrides.pagination || pagination;

    setLoading(true);
    setError('');
    try {
      const commonParams = {
        page: activePagination.page,
        size: activePagination.size,
        _t: Date.now()
      };

      if (activeFilters.source === 'heartbeat') {
        const response = await apiService.client.get('/device-status/logs', {
          params: {
            ...commonParams,
            site: activeFilters.site || undefined,
            deviceName: activeFilters.deviceName || undefined,
            ip: activeFilters.ip || undefined,
            status: activeFilters.status || undefined,
          },
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        setDeviceHistory(response.data.content || []);
        setPagination(prev => ({
          ...prev,
          totalElements: response.data.totalItems || 0,
          totalPages: response.data.totalPages || 0
        }));
      } else if (activeFilters.source === 'google_sheet') {
        try {
          const response = await apiService.client.get('/device-status/google-sheet-logs', {
            params: {
              ...commonParams,
              site: activeFilters.site || undefined,
              deviceName: activeFilters.deviceName || undefined,
              ip: activeFilters.ip || undefined,
              status: activeFilters.status || undefined,
            },
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          setDeviceHistory(response.data.content || []);
          setPagination(prev => ({
            ...prev,
            totalElements: response.data.totalItems || 0,
            totalPages: response.data.totalPages || 0
          }));

        } catch (googleErr) {
          const fallbackResponse = await apiService.client.get('/device-status/logs', {
            params: {
              ...commonParams,
              site: activeFilters.site || undefined,
              deviceName: activeFilters.deviceName || undefined,
              ip: activeFilters.ip || undefined,
              status: activeFilters.status || undefined,
            },
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          setDeviceHistory(fallbackResponse.data.content || []);
          setPagination(prev => ({
            ...prev,
            totalElements: fallbackResponse.data.totalItems || 0,
            totalPages: fallbackResponse.data.totalPages || 0
          }));
        }
      } else {
        const params = {
          ...commonParams,
          site: activeFilters.site || undefined,
          deviceName: activeFilters.deviceName || undefined,
          ip: activeFilters.ip || undefined,
          status: activeFilters.status || undefined,
          sortBy: activeFilters.sortBy,
          sortDir: activeFilters.sortDir
        };

        if (activeFilters.days > 0) {
          const now = new Date();
          const start = subDays(now, activeFilters.days);
          params.startDate = format(start, "yyyy-MM-dd'T'HH:mm:ss");
          params.endDate = format(now, "yyyy-MM-dd'T'HH:mm:ss");
        }

        const response = await apiService.client.get('/device-history/all', {
          params,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        setDeviceHistory(response.data.content || []);
        setPagination(prev => ({
          ...prev,
          totalElements: response.data.totalElements || 0,
          totalPages: response.data.totalPages || 0
        }));
      }
    } catch (err) {
      setError('Failed to fetch device history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 📁 FETCH ALL FILES (CSV, PDF, DOCX)
  const fetchAllFiles = async () => {
    if (!isAuthenticated) {
      setError('Please log in to access files');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.client.get('/device-history/files/list');
      setAllFiles(response.data);
    } catch (err) {
      setError('Failed to fetch files: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 SEARCH SPECIFIC DEVICE
  const searchDevice = async () => {
    if (!isAuthenticated) {
      alert('Please log in to search devices');
      return;
    }

    if (!filters.deviceName || !filters.ip) {
      alert('Please enter both device name and IP address');
      return;
    }

    setLoading(true);
    try {
      const daysParam = filters.days === 0 ? 36500 : filters.days;
      if (filters.source === 'heartbeat') {
        const response = await apiService.client.get('/device-status/logs', {
          params: {
            page: 0,
            size: pagination.size,
            site: filters.site || undefined,
            deviceName: filters.deviceName,
            ip: filters.ip,
            status: filters.status || undefined,
            _t: Date.now()
          }
        });
        setDeviceHistory(response.data.content || []);
        setPagination(prev => ({
          ...prev,
          page: 0,
          totalElements: response.data.totalItems || 0,
          totalPages: response.data.totalPages || 0
        }));
      } else if (filters.source === 'google_sheet') {
        const response = await apiService.client.get('/device-status/google-sheet-logs', {
          params: {
            page: 0,
            size: pagination.size,
            site: filters.site || undefined,
            deviceName: filters.deviceName,
            ip: filters.ip,
            status: filters.status || undefined,
            _t: Date.now()
          }
        });
        setDeviceHistory(response.data.content || []);
        setPagination(prev => ({
          ...prev,
          page: 0,
          totalElements: response.data.totalItems || 0,
          totalPages: response.data.totalPages || 0
        }));
      } else {
        const response = await apiService.client.get('/device-history/device', {
          params: {
            deviceName: filters.deviceName,
            ip: filters.ip,
            days: daysParam
          }
        });
        setDeviceHistory(response.data);
        setPagination({ page: 0, size: 50, totalElements: response.data.length, totalPages: 1 });
      }
    } catch (err) {
      setError('Failed to search device: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🏢 SEARCH BY SITE
  const searchSite = async () => {
    if (!isAuthenticated) {
      alert('Please log in to search sites');
      return;
    }

    if (!filters.site) {
      alert('Please enter site name');
      return;
    }

    setLoading(true);
    try {
      const daysParam = filters.days === 0 ? 36500 : filters.days;
      const response = await apiService.client.get('/device-history/site', {
        params: {
          site: filters.site,
          days: daysParam
        }
      });
      setDeviceHistory(response.data);
      setPagination({ page: 0, size: 50, totalElements: response.data.length, totalPages: 1 });
    } catch (err) {
      setError('Failed to search site: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 GET STATUS TRANSITIONS
  const getTransitions = async () => {
    if (!isAuthenticated) {
      setError('Please log in to access transitions data');
      return;
    }

    setLoading(true);
    try {
      const daysParam = filters.days === 0 ? 36500 : filters.days;
      const params = {
        days: daysParam
      };
      if (filters.deviceName && filters.ip) {
        params.deviceName = filters.deviceName;
        params.ip = filters.ip;
      }

      const response = await apiService.client.get('/device-history/transitions', { params });
      setDeviceHistory(response.data);
      setPagination({ page: 0, size: 50, totalElements: response.data.length, totalPages: 1 });
    } catch (err) {
      setError('Failed to fetch transitions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 📥 GENERATE REPORT (CSV, PDF, DOCX)
  const generateReport = async (format, type, params = {}) => {
    if (!isAuthenticated) {
      alert('Please log in to generate reports');
      return;
    }

            
    const loadingKey = `${format}_${type}`;
    setReportLoading(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      let endpoint = '';
      let requestParams = {};

      switch (type) {
        case 'all':
          endpoint = `/device-history/${format}/generate`;
          requestParams = { days: filters.days };
          break;
        case 'device':
          endpoint = `/device-history/${format}/device`;
          requestParams = {
            deviceName: params.deviceName || filters.deviceName,
            ip: params.ip || filters.ip,
            days: filters.days
          };
          break;
        case 'site':
          endpoint = `/device-history/${format}/site`;
          requestParams = {
            site: params.site || filters.site,
            days: filters.days
          };
          break;
        case 'today':
          endpoint = `/device-history/${format}/today`;
          break;
        case 'date':
          endpoint = `/device-history/${format}/date`;
          requestParams = { date: params.date };
          break;
        default:
          console.error('❌ Unknown report type:', type);
          throw new Error('Unknown report type');
      }

                  
      const response = await apiService.client.post(endpoint, null, { 
        params: requestParams,
        timeout: 30000 // 30 second timeout
      });
      
            
      // Show success message with better formatting
      const successMessage = `✅ Report Generated Successfully!\n\n📄 Format: ${format.toUpperCase()}\n📁 File: ${response.data.fileName}\n📊 Type: ${type}\n\n⬇️ Download will start automatically...`;
      alert(successMessage);
      
      // Refresh file list if on reports tab
      if (activeTab === 'reports') {
                fetchAllFiles();
      }

      // Auto-download the file
      if (response.data.fileName) {
                setTimeout(() => {
          downloadFile(response.data.fileName, format);
        }, 1000);
      }

    } catch (err) {
      console.error('❌ Error in generateReport:', err);
      console.error('📊 Error response:', err.response?.data);
      console.error('🔍 Error status:', err.response?.status);
      console.error('🌐 Error config:', err.config);
      
      let errorMessage = 'Unknown error occurred';
      let errorDetails = '';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - Server took too long to respond';
        errorDetails = 'Please try again or contact support if the issue persists.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error - Cannot connect to server';
        errorDetails = 'Please check your internet connection and ensure the backend server is running.';
      } else if (err.response?.status === 404) {
        errorMessage = 'API endpoint not found';
        errorDetails = `Endpoint: ${endpoint}\nPlease verify the backend server is running and the API routes are configured correctly.`;
      } else if (err.response?.status === 500) {
        errorMessage = 'Internal server error';
        errorDetails = err.response?.data?.error || err.response?.data?.message || 'Please check the server logs for more details.';
      } else if (err.response?.data) {
        errorMessage = err.response.data.error || err.response.data.message || `Server returned status ${err.response.status}`;
        errorDetails = `Status: ${err.response.status}\nEndpoint: ${endpoint}`;
      } else {
        errorMessage = err.message;
        errorDetails = `Request failed for: ${endpoint}`;
      }
      
      const fullErrorMessage = `❌ Failed to Generate ${format.toUpperCase()} Report\n\n🔍 Error: ${errorMessage}\n\n📋 Details:\n${errorDetails}\n\n🛠️ Troubleshooting:\n• Check browser console for detailed logs\n• Verify backend server is running on port 8080\n• Ensure API endpoints are accessible`;
      
      alert(fullErrorMessage);
    } finally {
            setReportLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // 🔥 GENERATE ALL FORMATS AT ONCE
  const generateAllFormats = async (type, params = {}) => {
    if (!isAuthenticated) {
      alert('Please log in to generate reports');
      return;
    }

    const loadingKey = `all_${type}`;
    setReportLoading(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      let requestParams = { type };
      
      switch (type) {
        case 'device':
          if (!filters.deviceName || !filters.ip) {
            alert('Please enter device name and IP address');
            return;
          }
          requestParams = {
            ...requestParams,
            deviceName: filters.deviceName,
            ip: filters.ip,
            days: filters.days
          };
          break;
        case 'site':
          if (!filters.site) {
            alert('Please enter site name');
            return;
          }
          requestParams = {
            ...requestParams,
            site: filters.site,
            days: filters.days
          };
          break;
        case 'date':
          requestParams = {
            ...requestParams,
            date: params.date
          };
          break;
        case 'all':
          requestParams = {
            ...requestParams,
            days: filters.days
          };
          break;
      }
      
      const response = await apiService.client.post('/device-history/reports/generate-all', null, { 
        params: requestParams 
      });
      
      alert(`✅ ${response.data.message} - All formats generated!`);
      
      // Refresh file list
      if (activeTab === 'reports') {
        fetchAllFiles();
      }
      
      // Auto-download all files
      if (response.data.files) {
        Object.entries(response.data.files).forEach(([format, filePath], index) => {
          const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
          setTimeout(() => {
            downloadFile(fileName, format);
          }, (index + 1) * 1000); // Stagger downloads
        });
      }

    } catch (err) {
      alert(`❌ Failed to generate all formats: ${err.response?.data?.error || err.message}`);
    } finally {
      setReportLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // 📊 GENERATE ANALYTICS REPORT
  const generateAnalyticsReport = async () => {
    if (!isAuthenticated) {
      alert('Please log in to generate analytics reports');
      return;
    }

    // Validation
    if (!analyticsForm.status) {
      alert('Please select a status (OFFLINE, ONLINE, or STALE)');
      return;
    }
    if (!analyticsForm.startDate) {
      alert('Please select a start date');
      return;
    }
    if (!analyticsForm.endDate) {
      alert('Please select an end date');
      return;
    }
    if (new Date(analyticsForm.startDate) > new Date(analyticsForm.endDate)) {
      alert('Start date cannot be after end date');
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsResults(null);
    
    try {
      const params = {
        status: analyticsForm.status,
        startDate: analyticsForm.startDate,
        endDate: analyticsForm.endDate
      };
      
      // Add optional site parameter if provided
      if (analyticsForm.site && analyticsForm.site.trim()) {
        params.site = analyticsForm.site.trim();
      }
      
            
      const response = await apiService.client.get('/analytics/generate-report', {
        params,
        timeout: 30000
      });
      
            
      setAnalyticsResults(response.data);
      alert(`✅ Analytics report generated successfully! Found ${response.data.totalElements || 0} records.`);
      
    } catch (err) {
      console.error('❌ Error generating analytics report:', err);
      
      let errorMessage = 'Failed to generate analytics report';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // 📊 ENHANCED ANALYTICS FUNCTIONS


  // 📥 DOWNLOAD FILE
  const downloadFile = async (fileName, format) => {
    if (!isAuthenticated) {
      alert('Please log in to download files');
      return;
    }

    try {
      const response = await apiService.client.get(`/device-history/${format}/download/${fileName}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      alert(`Failed to download ${format.toUpperCase()}: ` + err.message);
    }
  };

  // 🎨 STATUS COLOR HELPER
  const getStatusColor = (status) => {
    const colors = {
      'ONLINE': 'text-green-600 bg-green-100',
      'OFFLINE': 'text-red-600 bg-red-100',
      'STALE': 'text-yellow-600 bg-yellow-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  // 🎨 FORMAT BADGE HELPER
  const getFormatBadge = (fileName) => {
    if (fileName.endsWith('.csv')) return 'bg-green-100 text-green-800';
    if (fileName.endsWith('.pdf')) return 'bg-red-100 text-red-800';
    /* DOCX functionality commented out - might use back later
    if (fileName.endsWith('.docx')) return 'bg-blue-100 text-blue-800';
    */
    return 'bg-gray-100 text-gray-800';
  };

  const getFormatIcon = (fileName) => {
    if (fileName.endsWith('.csv')) return <FileText className="w-4 h-4" />;
    if (fileName.endsWith('.pdf')) return <FileImage className="w-4 h-4" />;
    /* DOCX functionality commented out - might use back later
    if (fileName.endsWith('.docx')) return <File className="w-4 h-4" />;
    */
    return <File className="w-4 h-4" />;
  };

  const getFileFormat = (fileName) => {
    if (fileName.endsWith('.csv')) return 'csv';
    if (fileName.endsWith('.pdf')) return 'pdf';
    /* DOCX functionality commented out - might use back later
    if (fileName.endsWith('.docx')) return 'docx';
    */
    return 'unknown';
  };

  // 📄 PAGINATION HANDLER
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const updateHistoryFilters = (updates) => {
    setFilters(prev => ({ ...prev, ...updates }));
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const clearFilters = () => {
    updateHistoryFilters({
      deviceName: '',
      ip: '',
      site: '',
      status: ''
    });
    setError('');
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'
    }`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' 
            : 'text-gray-900'
        }`}>Device History Dashboard</h1>
        <p className={`transition-colors duration-300 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>Monitor device status history, generate reports in multiple formats, and export data</p>
      </div>

      {/* Tab Navigation */}
      <div className={`border-b mb-6 transition-colors duration-300 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'history', label: 'Device History', icon: Database },
            { id: 'reports', label: 'Multi-Format Reports', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 transform hover:scale-105 ${
                  activeTab === tab.id
                    ? isDarkMode
                      ? 'border-blue-400 text-blue-400'
                      : 'border-blue-500 text-blue-600'
                    : isDarkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`border px-4 py-3 rounded mb-4 transition-all duration-300 ${
          isDarkMode 
            ? 'bg-red-900/50 border-red-700 text-red-300' 
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {/* DEVICE HISTORY TAB */}
      {activeTab === 'history' && (
        <div>
          {/* Search Controls */}
          <div className={`rounded-lg shadow-sm border p-4 mb-6 transition-all duration-300 hover:shadow-md transform hover:scale-[1.01] ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/50 backdrop-blur-sm' 
              : 'bg-white/70 border-gray-200/50 backdrop-blur-sm'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Device Name</label>
                <input
                  type="text"
                  placeholder="Enter device name..."
                  value={filters.deviceName}
                  onChange={(e) => updateHistoryFilters({ deviceName: e.target.value })}
                  className={`w-full border rounded px-3 py-2 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 ${
                    isDarkMode 
                      ? 'bg-gray-700/70 border-gray-600 text-gray-100 placeholder-gray-400 hover:bg-gray-700/90' 
                      : 'bg-white/70 border-gray-300 text-gray-900 placeholder-gray-500 hover:bg-white/90'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>IP Address</label>
                <input
                  type="text"
                  placeholder="Enter IP address..."
                  value={filters.ip}
                  onChange={(e) => updateHistoryFilters({ ip: e.target.value })}
                  className={`w-full border rounded px-3 py-2 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 ${
                    isDarkMode 
                      ? 'bg-gray-700/70 border-gray-600 text-gray-100 placeholder-gray-400 hover:bg-gray-700/90' 
                      : 'bg-white/70 border-gray-300 text-gray-900 placeholder-gray-500 hover:bg-white/90'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Site</label>
                <select
                  value={filters.site}
                  onChange={(e) => updateHistoryFilters({ site: e.target.value })}
                  disabled={sitesLoading}
                  className={`w-full border rounded px-3 py-2 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 ${
                    isDarkMode
                      ? 'bg-gray-700/70 border-gray-600 text-gray-100 hover:bg-gray-700/90'
                      : 'bg-white/70 border-gray-300 text-gray-900 hover:bg-white/90'
                  }`}
                >
                  <option value="">All Sites</option>
                  {availableSites
                    .filter((siteOption) => siteOption.value !== 'ALL_SITES')
                    .map((siteOption) => (
                    <option key={siteOption.value} value={siteOption.value}>
                      {siteOption.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Days</label>
                <select
                  value={filters.days}
                  onChange={(e) => updateHistoryFilters({ days: parseInt(e.target.value) })}
                  className={`w-full border rounded px-3 py-2 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 ${
                    isDarkMode 
                      ? 'bg-gray-700/70 border-gray-600 text-gray-100 hover:bg-gray-700/90' 
                      : 'bg-white/70 border-gray-300 text-gray-900 hover:bg-white/90'
                  }`}
                >
                  <option value={0}>All Time</option>
                  <option value={1}>Last 24 Hours</option>
                  <option value={3}>Last 3 Days</option>
                  <option value={7}>Last 7 Days</option>
                  <option value={14}>Last 14 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={60}>Last 60 Days</option>
                  <option value={90}>Last 90 Days</option>
                  <option value={180}>Last 180 Days</option>
                  <option value={365}>Last 365 Days</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => updateHistoryFilters({ status: e.target.value })}
                  className={`w-full border rounded px-3 py-2 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 ${
                    isDarkMode
                      ? 'bg-gray-700/70 border-gray-600 text-gray-100 hover:bg-gray-700/90'
                      : 'bg-white/70 border-gray-300 text-gray-900 hover:bg-white/90'
                  }`}
                >
                  <option value="">All Statuses</option>
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="STALE">Stale</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Data Source</label>
                <select
                  value={filters.source}
                  onChange={(e) => updateHistoryFilters({ source: e.target.value })}
                  className={`w-full border rounded px-3 py-2 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400 ${
                    isDarkMode
                      ? 'bg-gray-700/70 border-gray-600 text-gray-100 hover:bg-gray-700/90'
                      : 'bg-white/70 border-gray-300 text-gray-900 hover:bg-white/90'
                  }`}
                >
                  <option value="google_sheet">Google Sheet (Apps Script Read)</option>
                  <option value="heartbeat">Current Heartbeat Logs</option>
                  <option value="history">Status Changes (Device History)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchDeviceHistory}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {filters.source === 'heartbeat'
                  ? 'Refresh Heartbeat Logs'
                  : filters.source === 'google_sheet'
                    ? 'Refresh Google Sheet'
                    : 'Refresh All'}
              </button>
              
              <button
                onClick={searchDevice}
                disabled={loading || !filters.deviceName || !filters.ip}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 disabled:opacity-50 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                <Server className="w-4 h-4" />
                Search Device
              </button>
              
              <button
                onClick={searchSite}
                disabled={loading || !filters.site}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                <MapPin className="w-4 h-4" />
                Search Site
              </button>
              

              
              <button
                onClick={getTransitions}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 disabled:opacity-50 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                <Eye className="w-4 h-4" />
                View Transitions
              </button>

              <button
                onClick={clearFilters}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                <img src="/clear-icon.svg" alt="Clear" className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>



          {/* Table Controls */}
          <div className={`rounded-lg shadow-sm border p-4 mb-4 transition-all duration-300 hover:shadow-md ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/50 backdrop-blur-sm' 
              : 'bg-white/70 border-gray-200/50 backdrop-blur-sm'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <label className={`text-sm font-medium mr-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Page Size:</label>
                  <select
                    value={pagination.size}
                    onChange={(e) => setPagination({...pagination, size: parseInt(e.target.value), page: 0})}
                    className={`border rounded px-3 py-1 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 ${
                      isDarkMode 
                        ? 'bg-gray-700/70 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                
                <div>
                  <label className={`text-sm font-medium mr-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Sort By:</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateHistoryFilters({ sortBy: e.target.value })}
                    className={`border rounded px-3 py-1 text-sm mr-2 transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 ${
                      isDarkMode 
                        ? 'bg-gray-700/70 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="changeTime">Change Time</option>
                    <option value="deviceName">Device Name</option>
                    <option value="site">Site</option>
                    <option value="newStatus">New Status</option>
                    <option value="changeType">Change Type</option>
                  </select>
                  
                  <select
                    value={filters.sortDir}
                    onChange={(e) => updateHistoryFilters({ sortDir: e.target.value })}
                    className={`border rounded px-3 py-1 text-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 ${
                      isDarkMode 
                        ? 'bg-gray-700/70 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>

              <div className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {pagination.totalElements} total records
              </div>
            </div>
          </div>

          {/* Device History Table */}
          <div className={`rounded-lg shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-md ${
            isDarkMode 
              ? 'bg-gray-800/70 border-gray-700/50 backdrop-blur-sm' 
              : 'bg-white/70 border-gray-200/50 backdrop-blur-sm'
          }`}>
            {loading ? (
              <div className="p-6">
                {/* Skeleton Loader for Device History Table */}
                <div className="animate-pulse">
                  {/* Table Header Skeleton */}
                  <div className="bg-gray-50 border-b p-4">
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
                  <div className="divide-y divide-gray-200">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="p-4">
                        <div className="grid grid-cols-7 gap-4 items-center">
                          {/* Device Info */}
                          <div className="space-y-2">
                            <div className="h-4 bg-gradient-to-r from-blue-200 to-blue-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/3"></div>
                          </div>
                          {/* Site */}
                          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
                          {/* Status Badge */}
                          <div className="h-6 bg-gradient-to-r from-green-200 to-green-300 rounded-full w-16"></div>
                          {/* Change Type */}
                          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-20"></div>
                          {/* Duration */}
                          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                          {/* Time */}
                          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
                          {/* Export Buttons */}
                          <div className="flex gap-1">
                            <div className="h-6 bg-gradient-to-r from-green-200 to-green-300 rounded w-10"></div>
                            <div className="h-6 bg-gradient-to-r from-red-200 to-red-300 rounded w-10"></div>
                            <div className="h-6 bg-gradient-to-r from-blue-200 to-blue-300 rounded w-12"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination Skeleton */}
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48"></div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
                      <div className="h-8 bg-gradient-to-r from-blue-200 to-blue-300 rounded w-16"></div>
                      <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                </div>
                
                {/* Loading indicator */}
                <div className="flex items-center justify-center mt-4">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                  <span className="text-blue-600 font-medium">Loading device history</span>
                  <span className="ml-1 text-blue-500">...</span>
                </div>
              </div>
            ) : deviceHistory.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No device history found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={`border-b transition-colors duration-300 ${
                      isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                    }`}>
                      <tr>
                        <th className={`px-4 py-3 text-left font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>Device</th>
                        <th className={`px-4 py-3 text-left font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>Site</th>
                        <th className={`px-4 py-3 text-left font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>Status</th>
                        <th className={`px-4 py-3 text-left font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>Change Type</th>
                        <th className={`px-4 py-3 text-left font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>Duration</th>
                        <th className={`px-4 py-3 text-left font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>Change Time</th>
                        <th className={`px-4 py-3 text-left font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>Export</th>
                      </tr>
                    </thead>
                    <tbody className={`transition-colors duration-300 ${
                      isDarkMode ? 'divide-y divide-gray-600/50' : 'divide-y divide-gray-200'
                    }`}>
                      {deviceHistory.map((device, index) => (
                        <tr key={device.id || index} className={`transition-all duration-300 transform hover:scale-[1.01] ${
                          isDarkMode 
                            ? 'hover:bg-gray-700/30' 
                            : 'hover:bg-gray-50'
                        }`}>
                          <td className="px-4 py-3">
                            <div className={`font-medium transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-100' : 'text-gray-900'
                            }`}>{device.deviceName}</div>
                            <div className={`text-xs transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>{device.ip}</div>
                            <div className={`text-xs transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>{device.category}</div>
                          </td>
                          <td className={`px-4 py-3 transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>{device.site}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 transform hover:scale-105 ${getStatusColor(device.newStatus || device.status)}`}>
                              {device.newStatus || device.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 transform hover:scale-105 ${
                              isDarkMode 
                                ? 'bg-gray-600/70 text-gray-200' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {device.changeType || 'Status Change'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 font-mono transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>{formatDurationValue(device.duration)}</td>
                          <td className={`px-4 py-3 transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {formatRowTimestamp(device)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => generateReport('csv', 'device', { deviceName: device.deviceName, ip: device.ip })}
                                disabled={reportLoading.csv_device}
                                className={`text-xs px-2 py-1 rounded transition-all duration-300 transform hover:scale-105 disabled:opacity-50 ${
                                  isDarkMode 
                                    ? 'bg-green-600/70 text-green-200 hover:bg-green-600/90' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                                title="Export CSV"
                              >
                                CSV
                              </button>
                              <button
                                onClick={() => generateReport('pdf', 'device', { deviceName: device.deviceName, ip: device.ip })}
                                disabled={reportLoading.pdf_device}
                                className={`text-xs px-2 py-1 rounded transition-all duration-300 transform hover:scale-105 disabled:opacity-50 ${
                                  isDarkMode 
                                    ? 'bg-red-600/70 text-red-200 hover:bg-red-600/90' 
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                                title="Export PDF"
                              >
                                PDF
                              </button>
                              {/* DOCX functionality commented out - might use back later
                              <button
                                onClick={() => generateReport('docx', 'device', { deviceName: device.deviceName, ip: device.ip })}
                                disabled={reportLoading.docx_device}
                                className={`text-xs px-2 py-1 rounded transition-all duration-300 transform hover:scale-105 disabled:opacity-50 ${
                                  isDarkMode 
                                    ? 'bg-blue-600/70 text-blue-200 hover:bg-blue-600/90' 
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                                title="Export Word"
                              >
                                DOCX
                              </button>
                              */}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className={`flex items-center justify-between px-4 py-3 border-t transition-colors duration-300 ${
                    isDarkMode 
                      ? 'border-gray-700 bg-gray-800/50' 
                      : 'border-gray-200 bg-white'
                  }`}>
                    <div className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Showing {pagination.page * pagination.size + 1} to{' '}
                      {Math.min((pagination.page + 1) * pagination.size, pagination.totalElements)} of{' '}
                      {pagination.totalElements} entries
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(Math.max(0, pagination.page - 1))}
                        disabled={pagination.page === 0}
                        className={`flex items-center gap-1 px-3 py-1 border rounded transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${
                          isDarkMode
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className={`px-3 py-1 border rounded transition-all duration-300 ${
                        isDarkMode
                          ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                          : 'border-blue-300 bg-blue-50 text-blue-600'
                      }`}>
                        {pagination.page + 1} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(Math.min(pagination.totalPages - 1, pagination.page + 1))}
                        disabled={pagination.page >= pagination.totalPages - 1}
                        className={`flex items-center gap-1 px-3 py-1 border rounded transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${
                          isDarkMode
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MULTI-FORMAT REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-8">
          {/* 🚀 Quick Report Generation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`rounded-lg p-6 transition-all duration-300 backdrop-blur-sm ${
              isDarkMode
                ? 'bg-blue-900/20 border border-blue-500/30'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center mb-4">
                <Calendar className={`w-6 h-6 mr-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-900'
                }`}>Today's Data</h3>
              </div>
              <p className={`mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-blue-300/80' : 'text-blue-700'
              }`}>Export all device data from today</p>
              
              {/* Individual Format Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {['csv', 'pdf'/* DOCX functionality commented out - might use back later, 'docx' */].map(format => (
                  <button
                    key={format}
                    onClick={() => generateReport(format, 'today')}
                    disabled={reportLoading[`${format}_today`]}
                    className={`px-3 py-2 rounded text-sm font-medium disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${
                      format === 'csv' ? 'bg-green-600 hover:bg-green-700' :
                      format === 'pdf' ? 'bg-red-600 hover:bg-red-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {reportLoading[`${format}_today`] ? '...' : format.toUpperCase()}
                  </button>
                ))}
              </div>
              
              {/* All Formats Button */}
              <button
                onClick={() => generateAllFormats('today')}
                disabled={reportLoading.all_today}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                {reportLoading.all_today ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{reportLoading.all_today ? 'Generating All...' : 'Generate All Formats'}</span>
              </button>
            </div>

            {/* 🏢 Site Report */}
            <div className={`rounded-lg p-6 transition-all duration-300 backdrop-blur-sm ${
              isDarkMode
                ? 'bg-orange-900/20 border border-orange-500/30'
                : 'bg-orange-50 border border-orange-200'
            }`}>
              <div className="flex items-center mb-4">
                <MapPin className={`w-6 h-6 mr-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-orange-400' : 'text-orange-600'
                }`} />
                <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-orange-300' : 'text-orange-900'
                }`}>Specific Site</h3>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Select
                    options={availableSites}
                    value={availableSites.find(option => option.value === filters.site) || null}
                    onChange={(selectedOption) => {
                      setFilters({ ...filters, site: selectedOption ? selectedOption.value : '' });
                    }}
                    onInputChange={(inputValue) => {
                      // Allow manual typing by updating the filter directly
                      if (inputValue && !availableSites.find(option => option.value === inputValue)) {
                        setFilters({ ...filters, site: inputValue });
                      }
                    }}
                    placeholder="Select or type site name..."
                    isClearable
                    isSearchable
                    isLoading={sitesLoading}
                    noOptionsMessage={() => "No sites found - you can type to add manually"}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                        borderColor: state.isFocused 
                          ? (isDarkMode ? '#f97316' : '#f97316')
                          : (isDarkMode ? '#4b5563' : '#d1d5db'),
                        color: isDarkMode ? '#e5e7eb' : '#111827',
                        boxShadow: state.isFocused ? `0 0 0 1px ${isDarkMode ? '#f97316' : '#f97316'}` : 'none',
                        '&:hover': {
                          borderColor: isDarkMode ? '#f97316' : '#f97316'
                        }
                      }),
                      menu: (provided) => ({
                        ...provided,
                        backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                        border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isSelected 
                          ? (isDarkMode ? '#f97316' : '#f97316')
                          : state.isFocused 
                          ? (isDarkMode ? '#4b5563' : '#f3f4f6')
                          : 'transparent',
                        color: state.isSelected 
                          ? '#ffffff'
                          : (isDarkMode ? '#e5e7eb' : '#111827'),
                        '&:hover': {
                          backgroundColor: state.isSelected 
                            ? (isDarkMode ? '#f97316' : '#f97316')
                            : (isDarkMode ? '#4b5563' : '#f3f4f6')
                        }
                      }),
                      singleValue: (provided) => ({
                        ...provided,
                        color: isDarkMode ? '#e5e7eb' : '#111827'
                      }),
                      placeholder: (provided) => ({
                        ...provided,
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                      }),
                      input: (provided) => ({
                        ...provided,
                        color: isDarkMode ? '#e5e7eb' : '#111827'
                      })
                    }}
                   />
                   {sitesError && (
                     <div className={`text-sm mt-1 transition-colors duration-300 ${
                       isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                     }`}>
                       ⚠️ {sitesError}
                     </div>
                   )}
                 </div>
                <select
                  value={filters.days}
                  onChange={(e) => setFilters({ ...filters, days: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-md transition-all duration-300 focus:outline-none focus:ring-2 ${
                    isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-gray-200 focus:ring-orange-500 focus:border-orange-500'
                      : 'border-gray-300 bg-white text-gray-900 focus:ring-orange-500 focus:border-orange-500'
                  }`}
                >
                  <option value={1}>Last 1 day</option>
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
                
                {/* Individual Format Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {['csv', 'pdf'/* DOCX functionality commented out - might use back later, 'docx' */].map(format => (
                    <button
                      key={format}
                      onClick={() => generateReport(format, 'site')}
                      disabled={reportLoading[`${format}_site`] || !filters.site}
                      className={`px-3 py-2 rounded text-sm font-medium disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${
                        format === 'csv' ? 'bg-green-600 hover:bg-green-700' :
                        format === 'pdf' ? 'bg-red-600 hover:bg-red-700' :
                        'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                    >
                      {reportLoading[`${format}_site`] ? '...' : format.toUpperCase()}
                    </button>
                  ))}
                </div>
                
                {/* All Formats Button */}
                <button
                  onClick={() => generateAllFormats('site')}
                  disabled={reportLoading.all_site || !filters.site}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  {reportLoading.all_site ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{reportLoading.all_site ? 'Generating All...' : 'Generate All Formats'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Analytics Report Results */}
          {analyticsResults && (
            <div className={`rounded-lg p-6 transition-all duration-300 backdrop-blur-sm ${isDarkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
              <div className="flex items-center mb-4">
                <BarChart3 className={`w-6 h-6 mr-2 transition-colors duration-300 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                <h3 className={`text-lg font-semibold transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-purple-900'}`}>Analytics Report Results</h3>
              </div>
              <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <pre className={`text-sm overflow-auto max-h-96 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {JSON.stringify(analyticsResults, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* 🎯 Advanced Reports */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {/* 🖥️ Device Report - Commented out as requested */}
            {/* <div className={`rounded-lg p-6 transition-all duration-300 backdrop-blur-sm ${
              isDarkMode
                ? 'bg-green-900/20 border border-green-500/30'
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center mb-4">
                <Server className={`w-6 h-6 mr-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`} />
                <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-green-300' : 'text-green-900'
                }`}>Specific Device</h3>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Device Name (e.g., Exit-207)"
                  value={filters.deviceName}
                  onChange={(e) => setFilters({ ...filters, deviceName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md transition-all duration-300 focus:outline-none focus:ring-2 ${
                    isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:ring-green-500 focus:border-green-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-green-500 focus:border-green-500'
                  }`}
                />
                <input
                  type="text"
                  placeholder="IP Address (e.g., 10.10.8.237)"
                  value={filters.ip}
                  onChange={(e) => setFilters({ ...filters, ip: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md transition-all duration-300 focus:outline-none focus:ring-2 ${
                    isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:ring-green-500 focus:border-green-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-green-500'
                  }`}
                />
                <select
                  value={filters.days}
                  onChange={(e) => setFilters({ ...filters, days: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-md transition-all duration-300 focus:outline-none focus:ring-2 ${
                    isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-gray-200 focus:ring-green-500 focus:border-green-500'
                      : 'border-gray-300 bg-white text-gray-900 focus:ring-green-500 focus:border-green-500'
                  }`}
                >
                  <option value={1}>Last 1 day</option>
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
                
                <div className="grid grid-cols-2 gap-2">
                  {['csv', 'pdf'].map(format => (
                    <button
                      key={format}
                      onClick={() => generateReport(format, 'device')}
                      disabled={reportLoading[`${format}_device`] || !filters.deviceName || !filters.ip}
                      className={`px-3 py-2 rounded text-sm font-medium disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${
                        format === 'csv' ? 'bg-green-600 hover:bg-green-700' :
                        format === 'pdf' ? 'bg-red-600 hover:bg-red-700' :
                        'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                    >
                      {reportLoading[`${format}_device`] ? '...' : format.toUpperCase()}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => generateAllFormats('device')}
                  disabled={reportLoading.all_device || !filters.deviceName || !filters.ip}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  {reportLoading.all_device ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{reportLoading.all_device ? 'Generating All...' : 'Generate All Formats'}</span>
                </button>
              </div>
            </div> */}
          </div>

          {/* 📁 Generated Files */}
          <div className={`rounded-lg border transition-all duration-300 backdrop-blur-sm ${
            isDarkMode
              ? 'bg-gray-800/50 border-gray-600'
              : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              isDarkMode ? 'border-gray-600' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-900'
              }`}>Generated Files</h3>
              <button
                onClick={fetchAllFiles}
                disabled={loading}
                className={`px-3 py-1 text-sm rounded-md disabled:opacity-50 flex items-center gap-2 transition-all duration-300 transform hover:scale-105 ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className={`divide-y ${
              isDarkMode ? 'divide-gray-600' : 'divide-gray-200'
            }`}>
              {(!allFiles?.csv?.length && !allFiles?.pdf?.length /* DOCX functionality commented out - might use back later && !allFiles?.docx?.length */) ? (
                <div className={`px-6 py-8 text-center transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No files generated yet
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {/* CSV Files */}
                  {allFiles?.csv?.map((file, index) => (
                    <div key={`csv-${index}`} className={`px-6 py-4 flex justify-between items-center transition-all duration-300 ${
                      isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        {getFormatIcon(file)}
                        <div>
                          <p className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-200' : 'text-gray-900'
                          }`}>{file}</p>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFormatBadge(file)}`}>
                              CSV
                            </span>
                            <span className={`text-sm transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {file.includes('device-changes') ? 'Device Report' :
                               file.includes('site-changes') ? 'Site Report' :
                               file.includes('daily') ? 'Daily Report' : 'General Report'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadFile(file, 'csv')}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                  
                  {/* PDF Files */}
                  {allFiles?.pdf?.map((file, index) => (
                    <div key={`pdf-${index}`} className={`px-6 py-4 flex justify-between items-center transition-all duration-300 ${
                      isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        {getFormatIcon(file)}
                        <div>
                          <p className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-200' : 'text-gray-900'
                          }`}>{file}</p>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFormatBadge(file)}`}>
                              PDF
                            </span>
                            <span className={`text-sm transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {file.includes('device-changes') ? 'Device Report' :
                               file.includes('site-changes') ? 'Site Report' :
                               file.includes('daily') ? 'Daily Report' : 'General Report'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadFile(file, 'pdf')}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                  
                  {/* DOCX Files - commented out - might use back later
                  {allFiles?.docx?.map((file, index) => (
                    <div key={`docx-${index}`} className={`px-6 py-4 flex justify-between items-center transition-all duration-300 ${
                      isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        {getFormatIcon(file)}
                        <div>
                          <p className={`font-medium transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-200' : 'text-gray-900'
                          }`}>{file}</p>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFormatBadge(file)}`}>
                              DOCX
                            </span>
                            <span className={`text-sm transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {file.includes('device-changes') ? 'Device Report' :
                               file.includes('site-changes') ? 'Site Report' :
                               file.includes('daily') ? 'Daily Report' : 'General Report'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadFile(file, 'docx')}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                      >
                        <Download className="w-4 h-4" />
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
      )}
    </div>
  );
};

export default DeviceHistoryDashboard;