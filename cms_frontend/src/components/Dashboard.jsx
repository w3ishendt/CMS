import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement,
  LineElement,
  PointElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  RefreshCw, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  Clock,
  MapPin,
  BarChart3,
  Filter,
  PieChart
} from 'lucide-react';
import 'chartjs-adapter-date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/authService';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement,
  LineElement,
  PointElement
);

const Dashboard = () => {
  const { isDarkMode } = useTheme();
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [availableSites, setAvailableSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('ALL_SITES');
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [rawApiData, setRawApiData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  const API_BASE = '/analytics';
  const authenticatedClient = authService.createAuthenticatedClient();

  // 🎯 Extended time range options
  const timeRangeOptions = [
    { value: 12, label: "Last 12 Hours", emoji: "🕐" },
    { value: 24, label: "Last 24 Hours", emoji: "📅" },
    { value: 48, label: "Last 48 Hours", emoji: "📊" },
    { value: 72, label: "Last 3 Days", emoji: "📈" },
    { value: 168, label: "Last 1 Week", emoji: "📉" },
    { value: 336, label: "Last 2 Weeks", emoji: "📋" },
    { value: 720, label: "Last 1 Month", emoji: "📆" }
  ];

  // 🔥 NEW: Format backend data for Chart.js
  const formatChartData = (backendData) => {
    if (!backendData || !backendData.timestamps) {
            return null;
    }

    // Format timestamps to readable labels starting from 12am
    const labels = backendData.timestamps.map(timestamp => {
      const date = new Date(timestamp);
      
      if (hours >= 168) { // 1 week or more
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }) + '\n' + date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true
        });
      } else if (hours >= 48) { // 2+ days
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'numeric',
          day: 'numeric'
        }) + '\n' + date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true
        });
      } else { // Less than 2 days
        // Ensure time starts from 12:00 AM
        const hour = date.getHours();
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 ? 'AM' : 'PM';
        return `${displayHour}:00 ${ampm}`;
      }
    });

    
    return {
      labels,
      timestamps: backendData.timestamps, // Preserve original timestamps for tooltip
      datasets: [
        {
          label: 'Online',
          data: backendData.onlineData,
          backgroundColor: 'rgba(16, 185, 129, 0.9)',
          borderColor: 'rgba(5, 150, 105, 1)',
          borderWidth: 2,
          hoverBackgroundColor: 'rgba(16, 185, 129, 1)',
          hoverBorderColor: 'rgba(4, 120, 87, 1)',
          hoverBorderWidth: 3
        },
        {
          label: 'Offline',
          data: backendData.offlineData,
          backgroundColor: 'rgba(239, 68, 68, 0.9)',
          borderColor: 'rgba(220, 38, 38, 1)',
          borderWidth: 2,
          hoverBackgroundColor: 'rgba(239, 68, 68, 1)',
          hoverBorderColor: 'rgba(185, 28, 28, 1)',
          hoverBorderWidth: 3
        },
        {
          label: 'Stale',
          data: backendData.staleData,
          backgroundColor: 'rgba(245, 158, 11, 0.9)',
          borderColor: 'rgba(217, 119, 6, 1)',
          borderWidth: 2,
          hoverBackgroundColor: 'rgba(245, 158, 11, 1)',
          hoverBorderColor: 'rgba(180, 83, 9, 1)',
          hoverBorderWidth: 3
        }
      ]
    };
  };

  // Fetch available sites
  const fetchAvailableSites = async () => {
    try {
      const data = await apiService.getAnalyticsAvailableSites();
            
      if (Array.isArray(data)) {
        setAvailableSites(data);
        // Set first site as default if none selected
        if (data.length > 0 && !selectedSite) {
          setSelectedSite(data[0]);
        }
      } else {
        console.error('Invalid sites data format:', data);
        setAvailableSites([]);
      }
    } catch (error) {
      console.error('Error fetching available sites:', error);
      setError(`Failed to load sites: ${error.message}`);
      setAvailableSites([]);
    }
  };

  // Fetch timeline analytics data
  const fetchTimelineAnalytics = async () => {
    try {
      const data = await apiService.getTimelineAnalytics({ period: selectedPeriod });
            
      if (Array.isArray(data) && data.length > 0) {
        // Format data for Line chart
        const formattedData = {
          labels: data.map(item => new Date(item.timestamp).toLocaleDateString()),
          datasets: [
            {
              label: 'Online Devices',
              data: data.map(item => item.online || 0),
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.1
            },
            {
              label: 'Offline Devices',
              data: data.map(item => item.offline || 0),
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.1
            },
            {
              label: 'Stale Devices',
              data: data.map(item => item.stale || 0),
              borderColor: 'rgb(245, 158, 11)',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              tension: 0.1
            }
          ]
        };
        setTimelineData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching timeline analytics:', error);
      toast.error('Failed to load timeline analytics');
    }
  };

  // Fetch category performance data
  const fetchCategoryPerformance = async () => {
    try {
      const data = await apiService.getCategoryPerformance({ period: selectedPeriod });
            
      if (Array.isArray(data) && data.length > 0) {
        // Format data for Pie chart
        const categories = data.map(item => item.category || item.name || 'Unknown');
        const values = data.map(item => item.count || item.value || 0);
        
        const formattedData = {
          labels: categories,
          datasets: [
            {
              data: values,
              backgroundColor: [
                'rgb(34, 197, 94)',
                'rgb(59, 130, 246)',
                'rgb(239, 68, 68)',
                'rgb(245, 158, 11)',
                'rgb(168, 85, 247)',
                'rgb(236, 72, 153)'
              ],
              borderWidth: 2,
              borderColor: isDarkMode ? '#374151' : '#ffffff'
            }
          ]
        };
        setCategoryData(formattedData);
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Handle object format
        const categories = Object.keys(data);
        const values = Object.values(data);
        
        const formattedData = {
          labels: categories,
          datasets: [
            {
              data: values,
              backgroundColor: [
                'rgb(34, 197, 94)',
                'rgb(59, 130, 246)',
                'rgb(239, 68, 68)',
                'rgb(245, 158, 11)',
                'rgb(168, 85, 247)',
                'rgb(236, 72, 153)'
              ],
              borderWidth: 2,
              borderColor: isDarkMode ? '#374151' : '#ffffff'
            }
          ]
        };
        setCategoryData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching category performance:', error);
      toast.error('Failed to load category performance');
    }
  };

  // Fetch chart data
  const fetchChartData = async () => {
    if (!selectedSite) {
            return;
    }

    try {
      setLoading(true);
      setError(null);

      
      const data = await apiService.getHourlyStatusChart({
        site: selectedSite,
        hours: parseInt(hours)
      });
      
            
      // Store raw API data for debugging
      setRawApiData(data);
      
      // Format data for Chart.js using the formatChartData function
      const formattedData = formatChartData(data);
      
      if (formattedData) {
        setChartData(formattedData);
        setLastUpdated(new Date());
      } else {
        console.warn('⚠️ Invalid chart data format:', data);
        setChartData(null);
      }
    } catch (err) {
      console.error('❌ Failed to fetch chart data:', err);
      setError('Failed to load chart data: ' + err.message);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all analytics data
  const fetchAllAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      await Promise.all([
        fetchTimelineAnalytics(),
        fetchCategoryPerformance()
      ]);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // 🔧 Initial load
  useEffect(() => {
        fetchAvailableSites();
    fetchAllAnalytics();
  }, []);

  // 🔧 Fetch chart data when selections change
  useEffect(() => {
        if (selectedSite && selectedSite !== '') {
      fetchChartData();
    }
  }, [selectedSite, hours]);

  // 🔧 Fetch analytics data when period changes
  useEffect(() => {
    fetchAllAnalytics();
  }, [selectedPeriod]);

  // 🔧 Auto-refresh every 5 minutes (increased from 30s to be less aggressive)
  useEffect(() => {
    const interval = setInterval(() => {
            if (selectedSite && selectedSite !== '') {
        fetchChartData();
      }
      fetchAllAnalytics();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [selectedSite, hours, selectedPeriod]);

  // 🔧 Chart cleanup to prevent canvas reuse errors
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [selectedSite, hours]);

  // Manual refresh
  const handleRefresh = () => {
        fetchChartData();
  };

  // Get selected time range info
  const getSelectedTimeRange = () => {
    return timeRangeOptions.find(option => option.value === hours) || timeRangeOptions[1];
  };

  // Enhanced Chart.js configuration with modern styling
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 25,
          font: {
            size: 13,
            weight: '600',
            family: 'Inter, system-ui, sans-serif'
          },
          color: '#374151',
          // Simplified legend without custom generateLabels
        }
      },
      title: {
        display: true,
        text: `${getSelectedTimeRange().emoji} Device Status - ${getSelectedTimeRange().label}`,
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          bottom: 30
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)', // slate-900 with opacity
        titleColor: '#f8fafc', // slate-50
        bodyColor: '#e2e8f0', // slate-200
        borderColor: 'rgba(59, 130, 246, 0.5)', // blue-500 with opacity
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: true,
        padding: 16,
        titleFont: {
          size: 14,
          weight: '600',
          family: 'Inter, system-ui, sans-serif'
        },
        bodyFont: {
          size: 13,
          family: 'Inter, system-ui, sans-serif'
        },
        callbacks: {
          title: function(context) {
            const timestamp = context[0].label;
            const dataIndex = context[0].dataIndex;
            
            // Get the original timestamp from backend data
            if (chartData && chartData.timestamps && chartData.timestamps[dataIndex]) {
              const originalDate = new Date(chartData.timestamps[dataIndex]);
              
              if (hours >= 48) {
                // For 48+ hours, show full date and time
                const dateStr = originalDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                });
                const timeStr = originalDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                return `📅 ${dateStr} at ${timeStr}`;
              } else {
                // For shorter periods, just show time
                const timeStr = originalDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                return `📅 Time: ${timeStr}`;
              }
            }
            
            // Fallback to label if no timestamp data
            return `📅 Time: ${timestamp}`;
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const emoji = label === 'Online' ? '🟢' : label === 'Offline' ? '🔴' : '🟡';
            return `${emoji} ${label}: ${value} devices`;
          },
          footer: function(context) {
            const total = context.reduce((sum, item) => sum + item.parsed.y, 0);
            return `📊 Total: ${total} devices`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: hours >= 168 ? 'Date & Time' : 'Time (Hours)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: false
        },
        border: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: {
            size: 12,
            weight: '500',
            family: 'Inter, system-ui, sans-serif'
          },
          color: '#6b7280' // gray-500
        }
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Number of Devices',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        beginAtZero: true,
        border: {
          display: false
        },
        ticks: {
          stepSize: 1, // Show integer device counts
          font: {
            size: 12,
            weight: '500',
            family: 'Inter, system-ui, sans-serif'
          },
          color: '#6b7280', // gray-500
          padding: 8
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)', // slate-400 with opacity
          lineWidth: 1,
          drawBorder: false
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutCubic',
      delay: (context) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = context.dataIndex * 50;
        }
        return delay;
      }
    },
    elements: {
      bar: {
        borderRadius: {
          topLeft: 4,
          topRight: 4,
          bottomLeft: 0,
          bottomRight: 0
        },
        borderSkipped: false
      }
    }
  };

  // Get current site info
  const getCurrentSite = () => {
    return availableSites.find(site => site.value === selectedSite) || 
           { label: 'All Sites', deviceCount: 0 };
  };

  return (
    <div className={`min-h-screen p-3 sm:p-4 lg:p-6 transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25"></div>
              <div className={`relative backdrop-blur-sm rounded-lg p-4 sm:p-6 border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800/80 border-gray-700/20' 
                  : 'bg-white/80 border-white/20'
              }`}>
                <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent mb-2 ${
                  isDarkMode 
                    ? 'from-gray-100 to-gray-300' 
                    : 'from-gray-800 to-gray-600'
                }`}>
                  📊 Device Status Dashboard
                </h1>
                <div className={`transition-colors duration-300 text-sm sm:text-base ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span>Real-time performance monitoring</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Site: <strong className="text-blue-400">{selectedSite}</strong></span>
                    <span className="hidden sm:inline">•</span>
                    <span>Hours: <strong className="text-indigo-400">{hours}</strong></span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              {/* Live indicator */}
              <div className={`flex items-center justify-center sm:justify-start backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800/60 border-gray-700/20' 
                  : 'bg-white/60 border-white/20'
              }`}>
                <div className="relative">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <span className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <span className="sm:hidden">Live</span>
                  <span className="hidden sm:inline">
                    Live • {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()}`}
                  </span>
                </span>
              </div>
              
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="group relative flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <RefreshCw className={`w-4 h-4 transition-transform duration-300 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                <span className="sm:hidden">{loading ? '...' : 'Refresh'}</span>
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="relative mb-6 sm:mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-20"></div>
          <div className={`relative backdrop-blur-md rounded-xl shadow-xl p-4 sm:p-6 border transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/80 border-gray-700/20' 
              : 'bg-white/80 border-white/20'
          }`}>
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className={`text-base sm:text-lg font-semibold bg-gradient-to-r bg-clip-text text-transparent transition-colors duration-300 ${
                isDarkMode 
                  ? 'from-gray-100 to-gray-300' 
                  : 'from-gray-800 to-gray-600'
              }`}>Performance Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Site Selector */}
              <div className="group">
                <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span>Select Site</span>
                  </div>
                </label>
                <div className="relative">
                  <select
                    value={selectedSite}
                    onChange={(e) => {
                                            setSelectedSite(e.target.value);
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300 hover:shadow-md group-hover:border-blue-300 ${
                      isDarkMode 
                        ? 'bg-gray-700/90 border-gray-600 text-gray-200' 
                        : 'bg-white/90 border-gray-200 text-gray-900'
                    }`}
                  >
                    {availableSites.map(site => (
                      <option key={site.value} value={site.value}>
                        {site.label} ({site.deviceCount} devices)
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
              
              {/* Time Range Selector */}
              <div className="group">
                <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Time Range</span>
                  </div>
                </label>
                <div className="relative">
                  <select
                    value={hours}
                    onChange={(e) => {
                                            setHours(parseInt(e.target.value));
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all duration-300 hover:shadow-md group-hover:border-indigo-300 ${
                      isDarkMode 
                        ? 'bg-gray-700/90 border-gray-600 text-gray-200' 
                        : 'bg-white/90 border-gray-200 text-gray-900'
                    }`}
                  >
                    {timeRangeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.emoji} {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {loading || !rawApiData ? (
            // Skeleton loaders for summary cards
            Array.from({ length: 4 }).map((_, index) => {
              const colors = [
                'from-green-600 to-emerald-600',
                'from-red-600 to-rose-600', 
                'from-yellow-600 to-amber-600',
                'from-blue-600 to-indigo-600'
              ];
              return (
                <div key={index} className="group relative">
                  <div className={`absolute -inset-1 bg-gradient-to-r ${colors[index]} rounded-xl blur opacity-25`}></div>
                  <div className={`relative backdrop-blur-sm rounded-xl shadow-xl p-6 border transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-800/90 border-gray-700/20' 
                      : 'bg-white/90 border-white/20'
                  }`}>
                    <div className="animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className={`h-4 bg-gradient-to-r rounded w-24 mb-3 ${
                            isDarkMode 
                              ? 'from-gray-600 to-gray-700' 
                              : 'from-gray-200 to-gray-300'
                          }`}></div>
                          <div className={`h-8 bg-gradient-to-r rounded w-16 mb-3 ${
                            isDarkMode 
                              ? 'from-gray-600 to-gray-700' 
                              : 'from-gray-200 to-gray-300'
                          }`}></div>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                            }`}></div>
                            <div className={`h-3 bg-gradient-to-r rounded w-12 ${
                              isDarkMode 
                                ? 'from-gray-600 to-gray-700' 
                                : 'from-gray-200 to-gray-300'
                            }`}></div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className={`w-16 h-16 bg-gradient-to-r rounded-xl ${
                            isDarkMode 
                              ? 'from-gray-600 to-gray-700' 
                              : 'from-gray-200 to-gray-300'
                          }`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // Actual summary cards
            <>
              {/* Online Devices */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className={`relative backdrop-blur-sm rounded-xl shadow-xl p-6 border hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-800/90 border-gray-700/20' 
                    : 'bg-white/90 border-white/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium mb-1 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Online Devices</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {rawApiData.currentOnline}
                      </p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                        <span className="text-xs text-green-600 font-medium">Active</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                        <Activity className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-green-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Offline Devices */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className={`relative backdrop-blur-sm rounded-xl shadow-xl p-6 border hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-800/90 border-gray-700/20' 
                    : 'bg-white/90 border-white/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium mb-1 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Offline Devices</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                        {rawApiData.currentOffline}
                      </p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-xs text-red-600 font-medium">Inactive</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="p-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
                        <AlertTriangle className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-red-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stale Devices */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className={`relative backdrop-blur-sm rounded-xl shadow-xl p-6 border hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-800/90 border-gray-700/20' 
                    : 'bg-white/90 border-white/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium mb-1 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Stale Devices</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                        {rawApiData.currentStale}
                      </p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
                        <span className="text-xs text-yellow-600 font-medium">Warning</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="p-4 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg">
                        <Clock className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-yellow-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Devices */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className={`relative backdrop-blur-sm rounded-xl shadow-xl p-6 border hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-800/90 border-gray-700/20' 
                    : 'bg-white/90 border-white/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium mb-1 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Total Devices</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {rawApiData.totalDevices}
                      </p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                        <span className="text-xs text-blue-600 font-medium">Monitored</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <TrendingUp className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-blue-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="relative mb-8">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl blur opacity-25"></div>
            <div className={`relative backdrop-blur-sm border rounded-xl p-6 transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-800/30' 
                : 'bg-red-50/90 border-red-200/50'
            }`}>
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg mr-4">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className={`font-semibold mb-1 transition-colors duration-300 ${
                    isDarkMode ? 'text-red-400' : 'text-red-800'
                  }`}>Error Loading Data</h4>
                  <p className={`transition-colors duration-300 ${
                    isDarkMode ? 'text-red-300' : 'text-red-700'
                  }`}>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Chart */}
        <div className="relative mb-6 sm:mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-20"></div>
          <div className={`relative backdrop-blur-md rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 border transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/90 border-gray-700/20' 
              : 'bg-white/90 border-white/20'
          }`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className={`text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent mb-2 transition-colors duration-300 ${
                  isDarkMode 
                    ? 'from-gray-100 to-gray-300' 
                    : 'from-gray-800 to-gray-600'
                }`}>
                  📈 Device Status Over Time
                </h3>
                <p className={`transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Real-time monitoring across all connected devices</p>
              </div>
              <div className={`rounded-xl px-4 py-2 border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-700/50' 
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50'
              }`}>
                <div className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-700'
                }`}>
                  {chartData?.datasets?.[0]?.data?.length || 0} data points
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-96 space-y-6">
                {/* Chart skeleton */}
                <div className="animate-pulse">
                  {/* Y-axis labels skeleton */}
                  <div className="flex items-end justify-between h-80 mb-4">
                    <div className="flex flex-col justify-between h-full py-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-3 w-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                      ))}
                    </div>
                    {/* Chart bars skeleton */}
                    <div className="flex items-end justify-between flex-1 h-full ml-4 space-x-2">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const heights = ['h-16', 'h-24', 'h-32', 'h-20', 'h-28', 'h-36', 'h-24', 'h-40', 'h-20', 'h-32', 'h-28', 'h-24'];
                        return (
                          <div key={i} className="flex flex-col items-center space-y-2 flex-1">
                            <div className={`w-full ${heights[i]} bg-gradient-to-t from-blue-200 to-blue-300 rounded-t opacity-60`}></div>
                            <div className={`w-full h-8 bg-gradient-to-t from-green-200 to-green-300 rounded-t opacity-60`}></div>
                            <div className={`w-full h-4 bg-gradient-to-t from-red-200 to-red-300 rounded-t opacity-60`}></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* X-axis labels skeleton */}
                  <div className="flex justify-between ml-12">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-3 w-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                    ))}
                  </div>
                </div>
                {/* Loading indicator */}
                <div className="flex items-center justify-center space-x-3 pt-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600"></div>
                  <p className="text-gray-600 font-medium">Loading chart data...</p>
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            ) : chartData && chartData.datasets && chartData.datasets.length > 0 ? (
              <div className="h-96 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-blue-50/30 to-transparent rounded-lg pointer-events-none"></div>
                <Bar 
                  ref={chartRef}
                  key={`chart-${selectedSite}-${hours}`}
                  data={chartData} 
                  options={chartOptions} 
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="text-8xl opacity-20">📊</div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-16 h-16 bg-gradient-to-br rounded-full flex items-center justify-center transition-colors duration-300 ${
                        isDarkMode 
                          ? 'from-gray-600 to-gray-700' 
                          : 'from-gray-200 to-gray-300'
                      }`}>
                        <div className={`w-8 h-8 rounded-full transition-colors duration-300 ${
                          isDarkMode ? 'bg-gray-800' : 'bg-white'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                  <h4 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>No data available</h4>
                  <p className={`text-lg mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>No data found for the selected time range</p>
                  <p className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-500'
                  }`}>Try selecting a different time period or site</p>
                  {selectedSite && (
                    <button
                      onClick={handleRefresh}
                      className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Chart Footer Info */}
            {rawApiData && (
              <div className={`mt-8 pt-6 border-t transition-colors duration-300 ${
                isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'
              }`}>
                <div className="flex flex-wrap items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center group">
                      <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mr-3 shadow-sm group-hover:shadow-md transition-shadow"></div>
                      <span className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Online: {rawApiData.currentOnline}</span>
                    </div>
                    <div className="flex items-center group">
                      <div className="w-4 h-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-full mr-3 shadow-sm group-hover:shadow-md transition-shadow"></div>
                      <span className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Offline: {rawApiData.currentOffline}</span>
                    </div>
                    <div className="flex items-center group">
                      <div className="w-4 h-4 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full mr-3 shadow-sm group-hover:shadow-md transition-shadow"></div>
                      <span className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Stale: {rawApiData.currentStale}</span>
                    </div>
                    <div className="flex items-center group">
                      <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mr-3 shadow-sm group-hover:shadow-md transition-shadow"></div>
                      <span className={`text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Total: {rawApiData.totalDevices}</span>
                    </div>
                  </div>
                  <div className={`rounded-lg px-4 py-2 mt-4 md:mt-0 transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-gray-800/50 to-blue-900/50' 
                      : 'bg-gradient-to-r from-gray-50 to-blue-50'
                  }`}>
                    <div className={`text-xs font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Data refreshed every 5 minutes • Last update: {lastUpdated?.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                {/* Explanatory text for device counts */}
                <div className="mt-4 text-center">
                  <p className={`text-xs italic transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    *Number of devices merely shows the total number of devices for the particular sites, it does not represent any device, to see more about device status, kindly head towards Device History tab.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Analytics Section - Commented Out */}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Device Status Dashboard • Real-time monitoring system</p>
          <p>Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;