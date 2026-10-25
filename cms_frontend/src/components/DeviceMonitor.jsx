import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { Monitor, Wifi, WifiOff, AlertTriangle, Search, Filter, ArrowLeft, ArrowRight, Play, Pause, RotateCcw, Copy, CheckCircle } from 'lucide-react';


const IDLE_RIGHT_ANIMATIONS = [
  { src: '/bot-pointing.webm' },
  { src: '/bot-waving.webm' },
  { src: '/bot-waving-sign.webm', sizeClass: 'w-40 sm:w-48 lg:w-56' }
];

const IDLE_LEFT_ANIMATIONS = [
  { src: '/bot-double-hand-wave.webm' },
  { src: '/bot-waving-left.webm' },
  { src: '/bot-sleeping.webm' }
];

// Random index that never equals the previous one, so a clip is not repeated back to back.
const pickNextIndex = (length, previousIndex) => {
  if (length <= 1) {
    return 0;
  }
  const offset = 1 + Math.floor(Math.random() * (length - 1));
  return (previousIndex + offset) % length;
};

const DeviceMonitor = () => {
  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const IDLE_TIMEOUT_MS = 6 * 60 * 1000;
  const IDLE_SET_DURATION_MS = 8 * 60 * 1000;
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [previousDevices, setPreviousDevices] = useState([]);
  const [copiedIP, setCopiedIP] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAutoLoop, setIsAutoLoop] = useState(false);
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [isIdle, setIsIdle] = useState(false);
  const [idleAnimationIndexes, setIdleAnimationIndexes] = useState({ right: 0, left: 0 });
  const previousDevicesRef = useRef([]);
  const idleTimeoutRef = useRef(null);
  const idleAnimationSwapRef = useRef(null);

  const categoryColumns = [
    { key: 'LPR', label: 'LPR' },
    { key: 'DMC', label: 'DMC' },
    { key: 'Vega', label: 'Vega' },
    { key: 'Intercom', label: 'Intercom' },
    { key: 'GW', label: 'Router' },
    { key: 'PMS', label: 'PMS' },
    { key: 'UPT/U2K', label: 'UPT/U2K' },
    { key: 'S&B', label: 'S&B' },
    { key: 'RFID', label: 'RFID' },
    { key: 'Reader', label: 'Reader' },
    { key: 'Others', label: 'Others' }
  ];
  

  
    const SITES_PER_PAGE = 25;

  // Add smooth blinking animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes smoothBlinkRed {
        0%, 100% { 
          background-color: rgb(254 226 226); 
          box-shadow: 0 0 0 rgba(239, 68, 68, 0.5);
        }
        50% { 
          background-color: rgb(248 113 113); 
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.7);
        }
      }
      @keyframes smoothBlinkGreen {
        0%, 100% { 
          background-color: rgb(220 252 231); 
          box-shadow: 0 0 0 rgba(34, 197, 94, 0.5);
        }
        50% { 
          background-color: rgb(134 239 172); 
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.7);
        }
      }
      @keyframes smoothBlinkYellow {
        0%, 100% { 
          background-color: rgb(254 243 199); 
          box-shadow: 0 0 0 rgba(245, 158, 11, 0.5);
        }
        50% { 
          background-color: rgb(252 211 77); 
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.7);
        }
      }
      
      .smooth-blink-red { 
        animation: smoothBlinkRed 3s ease-in-out infinite; 
        border: 2px solid rgb(239, 68, 68);
      }
      .smooth-blink-green { 
        animation: smoothBlinkGreen 3s ease-in-out infinite; 
        border: 2px solid rgb(34, 197, 94);
      }
      .smooth-blink-yellow { 
        animation: smoothBlinkYellow 3s ease-in-out infinite; 
        border: 2px solid rgb(245, 158, 11);
      }

      @keyframes urgentCardBreathe {
        0%, 100% {
          background-color: #FF0808;
          box-shadow: 0 0 22px rgba(255, 8, 8, 0.68);
        }
        50% {
          background-color: #FF6161;
          box-shadow: 0 0 14px rgba(255, 97, 97, 0.35);
        }
      }

      .urgent-card-breathe {
        animation: urgentCardBreathe 4.8s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const markIdle = () => {
      setIdleAnimationIndexes((current) => ({
        right: pickNextIndex(IDLE_RIGHT_ANIMATIONS.length, current.right),
        left: pickNextIndex(IDLE_LEFT_ANIMATIONS.length, current.left)
      }));
      setIsIdle(true);
    };

    const resetIdleTimer = () => {
      setIsIdle(false);

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      if (idleAnimationSwapRef.current) {
        clearInterval(idleAnimationSwapRef.current);
      }

      idleTimeoutRef.current = setTimeout(markIdle, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      if (idleAnimationSwapRef.current) {
        clearInterval(idleAnimationSwapRef.current);
      }
    };
  }, [IDLE_TIMEOUT_MS]);

  useEffect(() => {
    if (!isIdle) {
      return undefined;
    }

    idleAnimationSwapRef.current = setInterval(() => {
      setIdleAnimationIndexes((current) => ({
        right: pickNextIndex(IDLE_RIGHT_ANIMATIONS.length, current.right),
        left: pickNextIndex(IDLE_LEFT_ANIMATIONS.length, current.left)
      }));
    }, IDLE_SET_DURATION_MS);

    return () => {
      if (idleAnimationSwapRef.current) {
        clearInterval(idleAnimationSwapRef.current);
      }
    };
  }, [isIdle, IDLE_SET_DURATION_MS]);

  const currentRightAnimation = IDLE_RIGHT_ANIMATIONS[idleAnimationIndexes.right];
  const currentLeftAnimation = IDLE_LEFT_ANIMATIONS[idleAnimationIndexes.left];

  const normalizeCategory = (category) => {
    if (category === 'Gateway' || category === 'Router') {
      return 'GW';
    }

    return ['LPR', 'DMC', 'Vega', 'Intercom', 'GW', 'PMS', 'UPT/U2K', 'S&B', 'RFID', 'Reader'].includes(category)
      ? category
      : 'Others';
  };

  const getStatusPriority = (devicesForScope) => {
    const offlineCount = devicesForScope.filter(device => device.status === 'OFFLINE').length;
    const staleCount = devicesForScope.filter(device => device.status === 'STALE').length;
    const onlineCount = devicesForScope.filter(device => device.status === 'ONLINE').length;

    if (offlineCount > 0) {
      return 'OFFLINE';
    }
    if (staleCount > 0) {
      return 'STALE';
    }
    if (onlineCount > 0) {
      return 'ONLINE';
    }

    return 'UNKNOWN';
  };

  const getStatusAccentClasses = (status) => {
    switch (status) {
      case 'OFFLINE':
        return isDarkMode
          ? 'border-red-400 bg-[#F5CC0D] text-[#24324A] shadow-[0_0_20px_rgba(239,68,68,0.45)]'
          : 'border-red-300 bg-red-50 text-red-700';
      case 'STALE':
        return isDarkMode
          ? 'border-amber-300 bg-[#F5CC0D] text-[#24324A] shadow-[0_0_20px_rgba(245,158,11,0.4)]'
          : 'border-amber-300 bg-amber-50 text-amber-700';
      case 'ONLINE':
        return isDarkMode
          ? 'border-[#23BF60] bg-[#F5CC0D] text-[#24324A] shadow-[0_0_20px_rgba(0,202,75,0.42)]'
          : 'border-emerald-300 bg-emerald-50 text-emerald-700';
      default:
        return isDarkMode
          ? 'border-gray-600 bg-[#F5CC0D] text-[#24324A]'
          : 'border-gray-200 bg-white text-gray-700';
    }
  };

  const getIndicatorClasses = (status) => {
    switch (status) {
      case 'OFFLINE':
        return 'border-red-500 bg-red-500 text-white shadow-[0_0_18px_rgba(239,68,68,0.45)]';
      case 'STALE':
        return 'border-amber-400 bg-amber-400 text-[#24324A] shadow-[0_0_18px_rgba(245,158,11,0.4)]';
      case 'ONLINE':
        return 'border-[#23BF60] bg-[#23BF60] text-[#24324A] shadow-[0_0_18px_rgba(0,202,75,0.4)]';
      default:
        return isDarkMode
          ? 'border-gray-600 bg-transparent text-gray-500'
          : 'border-gray-300 bg-transparent text-gray-400';
    }
  };

  const getLatestTimestamp = (devicesForScope) => devicesForScope.reduce((latest, device) => {
    if (!device?.logTime) {
      return latest;
    }

    const deviceTime = new Date(device.logTime);
    if (Number.isNaN(deviceTime.getTime())) {
      return latest;
    }

    if (!latest || deviceTime > latest) {
      return deviceTime;
    }

    return latest;
  }, null);

  const formatLastUpdate = (devicesForScope) => {
    const latest = getLatestTimestamp(devicesForScope);
    if (!latest) {
      return '-';
    }

    const day = String(latest.getDate()).padStart(2, '0');
    const month = String(latest.getMonth() + 1).padStart(2, '0');
    const year = latest.getFullYear();
    const hours = String(latest.getHours()).padStart(2, '0');
    const minutes = String(latest.getMinutes()).padStart(2, '0');
    const seconds = String(latest.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const spreadsheetDurationOffsetMinutes = 8 * 60;

  const parseSpreadsheetDurationToMinutes = (durationText) => {
    const durationDate = new Date(durationText);
    if (Number.isNaN(durationDate.getTime())) {
      return null;
    }

    const baseDateUtc = Date.UTC(1899, 11, 30, 0, 0, 0, 0);
    const adjustedDurationMs = durationDate.getTime() + (spreadsheetDurationOffsetMinutes * 60 * 1000);

    return (adjustedDurationMs - baseDateUtc) / (60 * 1000);
  };

  const parseDurationToMinutes = (duration) => {
    if (!duration || typeof duration !== 'string') {
      return null;
    }

    const normalizedDuration = duration.replace(/[()]/g, '').trim();

    if (/^\d{2}:\d{2}:\d{2}$/.test(normalizedDuration)) {
      const [hours, minutes, seconds] = normalizedDuration.split(':').map(Number);
      return (hours * 60) + minutes + (seconds / 60);
    }

    const days = Number(normalizedDuration.match(/(\d+)d/i)?.[1] || 0);
    const hours = Number(normalizedDuration.match(/(\d+)h/i)?.[1] || 0);
    const minutes = Number(normalizedDuration.match(/(\d+)m/i)?.[1] || 0);
    const seconds = Number(normalizedDuration.match(/(\d+)s/i)?.[1] || 0);

    if (days || hours || minutes || seconds) {
      return (days * 24 * 60) + (hours * 60) + minutes + (seconds / 60);
    }

    const spreadsheetDurationMinutes = parseSpreadsheetDurationToMinutes(normalizedDuration);
    if (spreadsheetDurationMinutes !== null) {
      return spreadsheetDurationMinutes;
    }

    const numericDuration = Number(normalizedDuration);
    if (!Number.isNaN(numericDuration) && Number.isFinite(numericDuration)) {
      return numericDuration * 24 * 60;
    }

    return null;
  };

  const isOfflineForMoreThan15Minutes = (device) => {
    if (device.status !== 'OFFLINE') {
      return false;
    }

    const durationMinutes = parseDurationToMinutes(device.duration);
    return durationMinutes !== null && durationMinutes > 15;
  };

  const normalizeStationId = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim();
  };

  const sortStationIds = (stationIds) => [...stationIds].sort((left, right) => {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    const leftIsNumber = !Number.isNaN(leftNumber);
    const rightIsNumber = !Number.isNaN(rightNumber);

    if (leftIsNumber && rightIsNumber) {
      return leftNumber - rightNumber;
    }

    if (leftIsNumber) {
      return -1;
    }

    if (rightIsNumber) {
      return 1;
    }

    return left.localeCompare(right);
  });

  const inferStationIdFromDevice = (device) => {
    const explicitStationId = normalizeStationId(device.stationId);
    if (explicitStationId) {
      return explicitStationId;
    }

    const deviceName = String(device.deviceName || '').trim();
    if (!deviceName) {
      return '';
    }

    const namedStationMap = {
      'Entry Loading': '8',
      'Exit Loading': '30',
      'Entry Motor Resident': '9',
      'Exit Motor Resident': '31'
    };

    if (namedStationMap[deviceName]) {
      return namedStationMap[deviceName];
    }

    const numberedLaneMatch = deviceName.match(/^(Entry|Exit)-(\d+)$/i);
    if (numberedLaneMatch) {
      return numberedLaneMatch[2];
    }

    return '';
  };

  const buildUrgentSiteSummary = (offlineDevices) => {
    const stationIds = sortStationIds(
      Array.from(new Set(
        offlineDevices
          .map(inferStationIdFromDevice)
          .filter(Boolean)
      ))
    );

    const unlabeledDevices = Array.from(new Set(
      offlineDevices
        .filter((device) => !inferStationIdFromDevice(device))
        .map((device) => String(device.deviceName || '').trim())
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right));

    const summaryParts = [];
    if (stationIds.length > 0) {
      summaryParts.push(stationIds.join(', '));
    }
    if (unlabeledDevices.length > 0) {
      summaryParts.push(unlabeledDevices.join(', '));
    }

    return {
      stationIds,
      unlabeledDevices,
      summaryText: summaryParts.join(' | ')
    };
  };

  const getCategorySummary = (siteDevices, categoryKey) => {
    const categoryDevices = siteDevices.filter(device => {
      const category = normalizeCategory(device.category);
      return category === categoryKey;
    });

    return {
      count: categoryDevices.length,
      status: getStatusPriority(categoryDevices)
    };
  };

  const fetchDevices = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Please log in to view device monitor');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const latestDevices = await apiService.getLatestDeviceStatuses();

      if (Array.isArray(latestDevices)) {
        const deviceMap = new Map();
        latestDevices.forEach(device => {
          const key = `${device.site}_${device.category}_${device.deviceName}_${device.ip}`;
          if (!deviceMap.has(key) || new Date(device.logTime) > new Date(deviceMap.get(key).logTime)) {
            deviceMap.set(key, device);
          }
        });
        
        const newDevices = Array.from(deviceMap.values());

        setPreviousDevices(previousDevicesRef.current);
        previousDevicesRef.current = newDevices;
        setDevices(newDevices);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      const nextError = error.response?.data?.message || 'Failed to refresh device data';
      setError(nextError);
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, [fetchDevices]);



  const copyToClipboard = (ip, deviceName) => {
    navigator.clipboard.writeText(ip);
    setCopiedIP(`${deviceName}_${ip}`);
    setTimeout(() => setCopiedIP(null), 2000);
  };

  const getDeviceStatus = useCallback((device, previousDevices) => {
    const isOnline = device.status === 'ONLINE';
    const isStale = device.status === 'STALE';
    const isOffline = device.status === 'OFFLINE';
    
    const previousDevice = previousDevices.find(prev => 
      prev.deviceName === device.deviceName && prev.ip === device.ip
    );
    const durationUpdated = !previousDevice || previousDevice.duration !== device.duration;
    
    return {
      isOnline,
      isStale,
      isOffline,
      durationUpdated
    };
  }, []);

  // Group devices by site and category
  const groupedDevices = devices.reduce((acc, device) => {
    if (!acc[device.site]) {
      acc[device.site] = {};
    }
    
    const category = normalizeCategory(device.category);
    
    if (!acc[device.site][category]) {
      acc[device.site][category] = [];
    }
    acc[device.site][category].push(device);
    return acc;
  }, {});

  // Filter and sort sites
  const filteredAndSortedSites = Object.keys(groupedDevices)
    .filter(site => {
      if (!site.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      const siteDevices = Object.values(groupedDevices[site]).flat();
      const siteStatus = getStatusPriority(siteDevices);
      
      if (filter === 'online' && siteStatus !== 'ONLINE') return false;
      if (filter === 'offline' && siteStatus !== 'OFFLINE') return false;
      if (filter === 'stale' && siteStatus !== 'STALE') return false;
      
      return true;
    })
    .sort((a, b) => {
      if (sortOrder.startsWith('name')) {
        const comparison = a.localeCompare(b);
        return sortOrder === 'name-asc' ? comparison : -comparison;
      } else {
        const aDeviceCount = Object.values(groupedDevices[a]).flat().length;
        const bDeviceCount = Object.values(groupedDevices[b]).flat().length;
        const comparison = aDeviceCount - bDeviceCount;
        return sortOrder === 'devices-asc' ? comparison : -comparison;
      }
    });

  // Auto-loop through pages
  useEffect(() => {
    if (!isAutoLoop || selectedSite || filteredAndSortedSites.length === 0) return;
    
    const autoLoopInterval = setInterval(() => {
      setCurrentPage(prev => {
        const totalPages = Math.ceil(filteredAndSortedSites.length / SITES_PER_PAGE);
        return totalPages > 0 ? (prev + 1) % totalPages : 0;
      });
    }, 15000);

    return () => clearInterval(autoLoopInterval);
  }, [isAutoLoop, selectedSite, filteredAndSortedSites.length]);

  const totalPages = Math.ceil(filteredAndSortedSites.length / SITES_PER_PAGE);
  const startIndex = currentPage * SITES_PER_PAGE;
  const currentSites = filteredAndSortedSites.slice(startIndex, startIndex + SITES_PER_PAGE);
  const visibleStart = filteredAndSortedSites.length === 0 ? 0 : startIndex + 1;
  const visibleEnd = filteredAndSortedSites.length === 0 ? 0 : Math.min(startIndex + currentSites.length, filteredAndSortedSites.length);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (totalPages === 0) {
        return 0;
      }

      return Math.min(prev, totalPages - 1);
    });
  }, [totalPages]);
  const urgentSites = filteredAndSortedSites
    .map((site) => {
      const siteDevices = Object.values(groupedDevices[site]).flat();
      const offlineDevices = siteDevices.filter(isOfflineForMoreThan15Minutes);
      const urgentSummary = buildUrgentSiteSummary(offlineDevices);

      return {
        site,
        offlineCount: offlineDevices.length,
        stationIds: urgentSummary.stationIds,
        unlabeledDevices: urgentSummary.unlabeledDevices,
        summaryText: urgentSummary.summaryText
      };
    })
    .filter((site) => site.offlineCount > 0)
    .sort((a, b) => b.offlineCount - a.offlineCount || a.site.localeCompare(b.site));
  const hasUrgentSites = urgentSites.length > 0;
  const handlePageChange = (nextPage) => {
    setIsAutoLoop(false);
    setCurrentPage(() => {
      if (totalPages === 0) {
        return 0;
      }

      return Math.min(Math.max(nextPage, 0), totalPages - 1);
    });
  };
  const visiblePageNumbers = (() => {
    if (totalPages === 0) {
      return [];
    }

    if (totalPages <= 4) {
      return Array.from({ length: totalPages }, (_, index) => index);
    }

    const pages = [];
    let startPage = 0;
    let endPage = Math.min(2, totalPages - 1);

    if (currentPage > 2) {
      endPage = currentPage;
      startPage = Math.max(endPage - 2, 0);
    }

    if (currentPage >= totalPages - 2) {
      endPage = totalPages - 1;
      startPage = Math.max(endPage - 2, 0);
    }

    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      pages.push(pageNumber);
    }

    const lastPage = totalPages - 1;
    if (!pages.includes(lastPage)) {
      pages.push(lastPage);
    }

    return pages;
  })();

  // Helper function to get category display name
  const getCategoryDisplayName = (category) => {
    const categoryMap = {
      'DMC': 'Motherboard (DMC)',
      'LPR': 'License Plate Recognition (LPR)',
      'Vega': 'Vega',
      'Intercom': 'Intercom',
      'UPT': 'Payment Machine (UPT/U2K)',
      'U2K': 'Payment Machine (UPT/U2K)',
      'PMS': 'PC (PMS)',
      'GW': 'Router (GW)',
      'RFID': 'RFID',
      'Reader': 'Reader'
    };
    return categoryMap[category] || category;
  };

  // Helper function to get category abbreviation for badges
  const getCategoryAbbreviation = (category) => {
    const categoryMap = {
      'DMC': 'MB',
      'LPR': 'LP',
      'Vega': 'VG',
      'Intercom': 'IC',
      'UPT': 'MC',
      'U2K': 'MC',
      'PMS': 'PC',
      'GW': 'GW',
      'RFID': 'RF',
      'Reader': 'RD'
    };
    return categoryMap[category] || category.substring(0, 2).toUpperCase();
  };

  const getDeviceIcon = (category) => {
    const icons = {
      'LPR': 'LP',
      'DMC': 'MB', 
      'Vega': 'VG',
      'Intercom': 'IC',
      'GW': 'GW',
      'PMS': 'PC',
      'UPT/U2K': 'MC',
      'RFID': 'RF',
      'Reader': 'RD',
      'Others': 'OT'
    };
    return icons[category] || 'UN';
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className={`text-center p-8 rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}>
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-500">Please log in to access the device monitor.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Loading device data...</p>
        </div>
      </div>
    );
  }

  if (error && devices.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className={`text-center p-8 rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}>
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchDevices}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {isIdle && (
        <>
          <div className="pointer-events-none fixed right-0 top-24 z-30">
            <video
              key={currentRightAnimation.src}
              className={`h-auto object-contain ${currentRightAnimation.sizeClass || 'w-36 sm:w-44 lg:w-52'}`}
              autoPlay
              loop
              muted
              playsInline
            >
              <source src={currentRightAnimation.src} type="video/webm" />
            </video>
          </div>
          <div className="pointer-events-none fixed bottom-20 left-0 z-30">
            <video
              key={currentLeftAnimation.src}
              className="h-auto w-36 object-contain sm:w-44 lg:w-52"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src={currentLeftAnimation.src} type="video/webm" />
            </video>
          </div>
        </>
      )}
      <div className="w-full max-w-none mx-auto px-1 sm:px-2 lg:px-3 xl:px-4 py-8">
        <div className="space-y-6">
          {error && devices.length > 0 && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${
              isDarkMode
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                : 'border-amber-300 bg-amber-50 text-amber-800'
            }`}>
              {error}. Showing last successful device snapshot.
            </div>
          )}

          {/* Header with Search and Filters */}
          <div className={`shadow rounded-lg p-6 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <Monitor className="inline h-6 w-6 mr-2" />
                  Device Monitor
                </h2>
                <p className={`text-base ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Page {currentPage + 1} of {totalPages} • {filteredAndSortedSites.length} sites showing
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsAutoLoop(!isAutoLoop)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    isAutoLoop 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {isAutoLoop ? <Pause className="h-4 w-4 inline mr-1" /> : <Play className="h-4 w-4 inline mr-1" />}
                  {isAutoLoop ? 'Auto' : 'Manual'}
                </button>
                <div className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <span className="text-green-600">{devices.filter(d => d.status === 'ONLINE').length} Online</span>
                  <span className="mx-2">•</span>
                  <span className="text-red-600">{devices.filter(d => d.status === 'OFFLINE').length} Offline</span>
                  <span className="mx-2">•</span>
                  <span className="text-yellow-600">{devices.filter(d => d.status === 'STALE').length} Stale</span>
                </div>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 gap-4">
              {/* Status Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Sites
                </button>
                <button
                  onClick={() => setFilter('online')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filter === 'online'
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Wifi className="h-4 w-4 inline mr-1" />
                  Online
                </button>
                <button
                  onClick={() => setFilter('offline')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filter === 'offline'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <WifiOff className="h-4 w-4 inline mr-1" />
                  Offline
                </button>
                <button
                  onClick={() => setFilter('stale')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    filter === 'stale'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Stale
                </button>
              </div>

              {/* Search and Sort */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="text"
                    placeholder="Search sites..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  disabled={!searchTerm}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Clear site search"
                  title="Clear site search"
                >
                  <img src="/clear-icon.svg" alt="" className="h-4 w-4" />
                  Clear
                </button>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="devices-asc">Devices ↑</option>
                  <option value="devices-desc">Devices ↓</option>
                </select>
              </div>
            </div>


          </div>



          {/* Sites Grid or Device Details */}
          {selectedSite ? (
            /* Device Details View */
            <div className="space-y-6">
              {/* Back Button and Site Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedSite(null)}
                  className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sites
                </button>
                <h3 className={`text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {selectedSite} Devices
                </h3>
              </div>

              {/* Device Categories in Selected Site */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {Object.entries(groupedDevices[selectedSite] || {}).map(([category, devices]) => (
                  <div key={category} className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  } shadow`}>
                    <h4 className={`text-sm font-semibold mb-3 flex items-center ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <span className={`text-xs px-2 py-1 rounded mr-2 ${
                        isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getCategoryAbbreviation(category)}
                      </span>
                      <span className="truncate">{getCategoryDisplayName(category)} ({devices.length})</span>
                    </h4>
                    
                    {/* Individual Device Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                      {devices.map((device) => {
                        const detailCardClasses = device.status === 'ONLINE'
                          ? 'border-[#23BF60] bg-[#23BF60] text-white shadow-[0_0_18px_rgba(35,191,96,0.42)]'
                          : device.status === 'OFFLINE'
                            ? 'border-[#F60031] bg-[#F60031] text-white shadow-[0_0_18px_rgba(250,37,37,0.42)]'
                            : 'border-[#F49324] bg-[#F49324] text-white shadow-[0_0_18px_rgba(244,147,36,0.4)]';
                        
                        return (
                          <div
                            key={device.id}
                            onClick={() => copyToClipboard(device.ip, device.deviceName)}
                            className={`rounded border p-2 cursor-pointer transition-transform duration-300 hover:scale-105 ${detailCardClasses}`}
                            title={`Click to copy IP: ${device.ip}`}
                          >
                            <div className="mb-1">
                              <h5 className="truncate text-xs font-semibold text-white">
                                {device.deviceName}
                              </h5>
                            </div>
                            
                            <div className="text-center">
                              <span className="text-xs font-mono text-white/90">
                                {device.ip}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Sites Summary Table */
            <div className="relative left-1/2 w-[calc(100vw-2rem)] max-w-[1720px] -translate-x-1/2 sm:w-[calc(100vw-3rem)] lg:w-[calc(100vw-4rem)]">
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className={`overflow-x-auto rounded-2xl border shadow-lg ${
                  isDarkMode ? 'border-gray-800 bg-transparent' : 'border-gray-200 bg-white'
                }`}>
                  <table className="w-full min-w-[1400px] border-separate border-spacing-y-2 px-2">
                  <thead>
                    <tr>
                      <th className="w-20 px-3 py-4 text-center text-sm font-semibold text-gray-300">No.</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-300">Site</th>
                      <th colSpan={categoryColumns.length + 2} className="px-3 py-4 text-gray-300">
                        <div className="grid grid-cols-[2fr_1fr_repeat(11,minmax(0,1fr))] items-center gap-3 text-sm font-semibold">
                          <span className="text-left">Last Update</span>
                          <span className="text-center">Total Devices</span>
                          {categoryColumns.map((column) => (
                            <span key={column.key} className="text-center">{column.label}</span>
                          ))}
                        </div>
                      </th>
                    </tr>
                  </thead>
                          <tbody>
                            {currentSites.map((site, index) => {
                              const siteDevices = Object.values(groupedDevices[site]).flat();
                              const siteStatus = getStatusPriority(siteDevices);
                              const totalDevices = siteDevices.length;
                              const rowNumber = startIndex + index + 1;

                              return (
                                <tr
                                  key={site}
                                  onClick={() => setSelectedSite(site)}
                                  className={`cursor-pointer transition-transform duration-300 hover:scale-[1.01] ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                  }`}
                                >
                                  <td className="px-2 py-0 align-middle">
                                    <div className={`rounded-2xl border px-1 py-2 text-center text-lg font-semibold ${
                                      isDarkMode
                                        ? 'border-blue-500/40 bg-gray-800/90 text-gray-100 shadow-[0_0_18px_rgba(37,99,235,0.22)]'
                                        : 'border-blue-200 bg-white text-gray-800'
                                    }`}>
                                      {rowNumber}
                                    </div>
                                  </td>
                                  <td className="px-2 py-0 align-middle">
                                    <div className={`rounded-2xl border px-3 py-1.5 text-lg font-semibold ${getStatusAccentClasses(siteStatus)}`}>
                                              <div>{site}</div>
                                    </div>
                                  </td>
                                  <td colSpan={categoryColumns.length + 2} className="px-2 py-0 align-middle">
                                    <div className={`rounded-2xl border px-5 py-1.5 ${
                                      isDarkMode
                                        ? 'border-blue-500/40 bg-gray-800/90 text-gray-100 shadow-[0_0_18px_rgba(37,99,235,0.22)]'
                                        : 'border-blue-200 bg-white text-gray-800'
                                    }`}>
                                      <div className="grid grid-cols-[2fr_1fr_repeat(11,minmax(0,1fr))] items-center gap-3">
                                        <div className="text-base font-semibold leading-tight">
                                          {formatLastUpdate(siteDevices)}
                                        </div>
                                        <div className="text-center text-xl font-semibold">
                                          {totalDevices}
                                        </div>
                                        {categoryColumns.map((column) => {
                                          const summary = getCategorySummary(siteDevices, column.key);
                                          return (
                                            <div key={`${site}-${column.key}`} className="flex justify-center">
                                              <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-semibold transition-all duration-300 ${getIndicatorClasses(summary.status)}`}>
                                                {summary.count > 0 ? summary.count : ''}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className={`mt-6 flex flex-col gap-4 px-2 pb-3 lg:flex-row lg:items-center lg:justify-between ${
                          isDarkMode ? 'text-gray-100' : 'text-gray-800'
                        }`}>
                          <div className="text-base font-semibold">
                            Showing {visibleStart} to {visibleEnd} of {filteredAndSortedSites.length} sites
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 0 || totalPages === 0}
                                aria-label="Previous page"
                                title="Previous page"
                                className={`rounded-2xl border px-4 py-3 text-base font-semibold transition-colors ${
                                  currentPage === 0 || totalPages === 0
                                    ? isDarkMode
                                      ? 'cursor-not-allowed border-gray-800 bg-gray-900/40 text-gray-500'
                                      : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                                    : isDarkMode
                                      ? 'border-blue-500/40 bg-gray-800/90 text-gray-100 shadow-[0_0_18px_rgba(37,99,235,0.22)] hover:bg-gray-700'
                                      : 'border-blue-200 bg-white text-gray-800 hover:bg-gray-50'
                                }`}
                              >
                                {/* Sites Summary Table */}
                                <img src="/previous-arrow.svg" alt="" className="w-10 object-contain" />
                              </button>

                              {visiblePageNumbers.map((pageNumber, index) => {
                                const showEllipsis = index > 0 && pageNumber - visiblePageNumbers[index - 1] > 1;
                                const isActive = pageNumber === currentPage;

                                return (
                                  <React.Fragment key={`page-${pageNumber}`}>
                                    {showEllipsis && (
                                      <span className={`px-1 text-xl font-semibold ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                      }`}>
                                        ...
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handlePageChange(pageNumber)}
                                      className={`min-w-14 rounded-2xl border px-4 py-3 text-base font-semibold transition-colors ${
                                        isActive
                                          ? 'border-indigo-400 bg-indigo-500 text-white shadow-[0_0_18px_rgba(99,102,241,0.35)]'
                                          : isDarkMode
                                            ? 'border-blue-500/40 bg-gray-800/90 text-gray-100 shadow-[0_0_18px_rgba(37,99,235,0.22)] hover:bg-gray-700'
                                            : 'border-blue-200 bg-white text-gray-800 hover:bg-gray-50'
                                      }`}
                                    >
                                      {pageNumber + 1}
                                    </button>
                                  </React.Fragment>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={totalPages === 0 || currentPage >= totalPages - 1}
                                aria-label="Next page"
                                title="Next page"
                                className={`rounded-2xl border px-4 py-3 text-base font-semibold transition-colors ${
                                  totalPages === 0 || currentPage >= totalPages - 1
                                    ? isDarkMode
                                      ? 'cursor-not-allowed border-gray-800 bg-gray-900/40 text-gray-500'
                                      : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                                    : isDarkMode
                                      ? 'border-blue-500/40 bg-gray-800/90 text-gray-100 shadow-[0_0_18px_rgba(37,99,235,0.22)] hover:bg-gray-700'
                                      : 'border-blue-200 bg-white text-gray-800 hover:bg-gray-50'
                                }`}
                              >
                                <img src="/next-arrow.svg" alt="" className="w-10 object-contain" />
                              </button>
                            </div>

                            <div className="flex items-center justify-end gap-3 text-base font-semibold">
                              <select
                                value={totalPages === 0 ? '' : String(currentPage + 1)}
                                onChange={(event) => handlePageChange(Number(event.target.value) - 1)}
                                disabled={totalPages === 0}
                                className={`rounded-2xl border px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                                  isDarkMode
                                    ? 'border-blue-500/40 bg-gray-800/90 text-gray-100'
                                    : 'border-blue-200 bg-white text-gray-800'
                                }`}
                              >
                                {Array.from({ length: totalPages }, (_, index) => (
                                  <option key={`page-option-${index + 1}`} value={index + 1}>
                                    {index + 1}
                                  </option>
                                ))}
                              </select>
                              <span>of {totalPages}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                        <aside className={`self-start rounded-2xl border p-4 shadow-lg ${
                          isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'
                        }`}>
                          <div className="mb-4 flex items-start gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={hasUrgentSites ? '/warning-icon.svg' : '/thumbs-up-icon.svg'}
                                alt={hasUrgentSites ? 'Urgent status' : 'Healthy status'}
                                className={`h-14 w-14 object-contain ${
                                  hasUrgentSites
                                    ? 'drop-shadow-[0_0_18px_rgba(249,30,30,0.9)]'
                                    : 'drop-shadow-[0_0_18px_rgba(7,215,84,0.9)]'
                                }`}
                              />
                              <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {hasUrgentSites ? 'Urgent' : 'Healthy'}
                              </h3>
                            </div>
                          </div>
                          
                          {hasUrgentSites && (
                            <p className={`mb-6 text-base font-medium leading-7 ${
                              isDarkMode ? 'text-gray-200' : 'text-gray-700'
                            }`}>
                              Sites below have devices offline for more than 15 minutes
                            </p>
                          )}

                          <div className="space-y-5">
                            {hasUrgentSites ? urgentSites.map(({ site, offlineCount, stationIds, unlabeledDevices, summaryText }) => (
                              <button
                                key={`urgent-${site}`}
                                type="button"
                                onClick={() => setSelectedSite(site)}
                                /* Urgent section block/button */
                                className="urgent-card-breathe block w-full rounded-2xl border border-red-400 px-2 py-1 text-left text-white transition-transform duration-300 hover:scale-[1.01]"
                              >
                                <div className="text-2xl font-bold leading-tight">{`${site} (${offlineCount})`}</div>
                                
                                <div className="mt-1 text-xl font-semibold leading-snug">
                                  {summaryText || `${offlineCount} ${offlineCount === 1 ? 'device' : 'devices'}`}
                                </div>
                              </button>
                            )) : (
                              <div className="rounded-2xl border border-[#00CA4B] bg-[#00CA4B] px-3 py-1 text-[#24324A] shadow-[0_0_20px_rgba(0,202,75,0.35)]">
                                <div className="text-base font-semibold leading-relaxed">
                                  No site with offline devices for more than 15 minutes
                                </div>
                              </div>
                            )}
                          </div>
                        </aside>
                      </div>
                    </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceMonitor;