// import React, { useState, useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
// import DeviceMonitor from './components/DeviceMonitor';
// import ScriptGenerator from './components/ScriptGenerator';
// import DeviceLogs from './components/DeviceLogs';
// import SystemHealth from './components/SystemHealth';
// // import DeviceHistoryDashboard from './components/DeviceHistoryDashboard';
// import Dashboard from './components/Dashboard';
// import './utils/chartConfig'; // Import chart config




// function App() {
//   const [activeTab, setActiveTab] = useState('dashboard');

//   return (
//     <Router>
//       <div className="min-h-screen bg-gray-50">
//         {/* Navigation Header */}
//         <nav className="bg-white shadow-lg">
//           <div className="max-w-7xl mx-auto px-4">
//             <div className="flex justify-between h-16">
//               <div className="flex items-center">
//                 <h1 className="text-xl font-bold text-gray-800">
//                   🏢 Central Monitoring System
//                 </h1>
//               </div>
              
//               <div className="flex space-x-8">
//                 <NavLink to="/" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
//                   📊 Dashboard
//                 </NavLink>
//                 <NavLink to="/monitor" active={activeTab === 'monitor'} onClick={() => setActiveTab('monitor')}>
//                   📡 Live Monitor
//                 </NavLink>
//                 <NavLink to="/logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>
//                   📋 Device Logs
//                 </NavLink>
//                 <NavLink to="/generator" active={activeTab === 'generator'} onClick={() => setActiveTab('generator')}>
//                   🐍 Script Generator
//                 </NavLink>
//                 <NavLink to="/health" active={activeTab === 'health'} onClick={() => setActiveTab('health')}>
//                   ⚡ System Health
//                 </NavLink>
//               </div>
//             </div>
//           </div>
//         </nav>

//         {/* Main Content */}
//         <main className="max-w-7xl mx-auto py-6 px-4">
//           <Routes>
//             <Route path="/" element={<Dashboard />} />
//             <Route path="/monitor" element={<DeviceMonitor />} />
//             <Route path="/logs" element={<DeviceLogs />} />
//             <Route path="/generator" element={<ScriptGenerator />} />
//             <Route path="/health" element={<SystemHealth />} />
//           </Routes>
//         </main>
//       </div>
//     </Router>
//   );
// }

// const NavLink = ({ to, children, active, onClick }) => (
//   <Link
//     to={to}
//     onClick={onClick}
//     className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
//       active
//         ? 'border-blue-500 text-gray-900'
//         : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//     }`}
//   >
//     {children}
//   </Link>
// );

// export default App;


import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  ChartBarIcon,
  ComputerDesktopIcon,
  ClockIcon,
  CodeBracketIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
  // BuildingOfficeIcon, // Removed - no longer needed
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import DeviceMonitor from './components/DeviceMonitor';
import ScriptGenerator from './components/ScriptGenerator';
import DeviceHistoryDashboard from './components/DeviceHistoryDashboard';
import Dashboard from './components/Dashboard';

import ApiTest from './components/ApiTest';
import ApiConnectivityTest from './components/ApiConnectivityTest';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
// import SiteManagement from './pages/SiteManagement'; // Removed - site functionality disabled
// import Profile from './pages/Profile';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider, useUser } from './contexts/UserContext.tsx';
import { RequireAuth, ProtectedRoute } from './components/auth';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { Toaster } from 'sonner';
import NotificationManager from './components/NotificationManager';

import './utils/chartConfig'; // Import chart config

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { permissions, hasPermission, permissionsLoading } = useUser();





  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <Router>
      <div className={`min-h-screen transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800' 
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
      }`}>
        {/* Navigation Header */}
        <nav className={`backdrop-blur-md shadow-xl border-b transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gray-800/80 border-gray-700/20' 
            : 'bg-white/80 border-white/20'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex justify-between h-16 sm:h-18">
              <div className="flex items-center">
                <Link
                  to="/dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className="group flex items-center space-x-2 sm:space-x-3"
                  title="Go to Dashboard"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:drop-shadow-[0_0_14px_rgba(96,165,250,0.9)] group-hover:scale-105">
                    <img src="/cms-icon.svg" alt="CMS" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className={`text-lg sm:text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-300 group-hover:drop-shadow-[0_0_14px_rgba(147,197,253,0.9)] ${
                      isDarkMode 
                        ? 'from-gray-100 to-gray-300' 
                        : 'from-gray-800 to-gray-600'
                    }`}>
                      Central Monitoring System
                    </h1>
                  </div>
                  <div className="sm:hidden">
                    <h1 className={`text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(147,197,253,0.9)] ${
                      isDarkMode 
                        ? 'from-gray-100 to-gray-300' 
                        : 'from-gray-800 to-gray-600'
                    }`}>
                      CMS
                    </h1>
                  </div>
                </Link>
              </div>
              
              {/* Desktop Navigation */}
              {isAuthenticated && (
                <div className="flex items-center space-x-2">

                  
                  <NavLink to="/dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={ChartBarIcon}>
                    Dashboard
                  </NavLink>

                  {/* Show basic navigation for SUPER_ADMIN or when permissions are loading */}
                  {(user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN') || permissionsLoading || hasPermission('canManageDevices')) && (
                    <NavLink to="/monitor" active={activeTab === 'monitor'} onClick={() => setActiveTab('monitor')} icon={ComputerDesktopIcon}>
                      Live Monitor
                    </NavLink>
                  )}
                  {(user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN') || permissionsLoading || hasPermission('canViewHistory')) && (
                    <NavLink to="/history" active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={ClockIcon}>
                      Device History
                    </NavLink>
                  )}
                  {(() => {
                    const canShowGenerator = user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN') || permissionsLoading || hasPermission('canGenerateScripts');
                    return canShowGenerator;
                  })() && (
                    <NavLink to="/generator" active={activeTab === 'generator'} onClick={() => setActiveTab('generator')} icon={CodeBracketIcon}>
                      Script Generator
                    </NavLink>
                  )}
                  
                  {/* Admin-only routes - Always show for SUPER_ADMIN */}
                  {(() => {
                    const canShowUsers = user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN') || hasPermission('canManageUsers');
                    return canShowUsers;
                  })() && (
                    <NavLink to="/users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={UserIcon}>
                      Users
                    </NavLink>
                  )}
                  {(user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN')) && (
                    <NavLink to="/audit-logs" active={activeTab === 'audit-logs'} onClick={() => setActiveTab('audit-logs')} icon={DocumentTextIcon}>
                      Audit Logs
                    </NavLink>
                  )}
                  
                  {/* Profile */}
                  {/* <NavLink to="/profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={Cog6ToothIcon}>
                    Profile
                  </NavLink> */}
                  
                  {/* Theme Toggle Button */}
                  <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                      isDarkMode 
                        ? 'bg-gray-700/60 hover:bg-gray-600/60 text-yellow-400' 
                        : 'bg-white/60 hover:bg-white/80 text-gray-600 hover:text-gray-900'
                    } hover:shadow-md`}
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {isDarkMode ? (
                      <SunIcon className="w-5 h-5" />
                    ) : (
                      <MoonIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              )}
              
              {/* Always visible theme toggle for when not authenticated */}
              {!isAuthenticated && (
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    isDarkMode 
                      ? 'bg-gray-700/60 hover:bg-gray-600/60 text-yellow-400' 
                      : 'bg-white/60 hover:bg-white/80 text-gray-600 hover:text-gray-900'
                  } hover:shadow-md`}
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? (
                    <SunIcon className="w-5 h-5" />
                  ) : (
                    <MoonIcon className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Mobile menu button and theme toggle */}
              <div className="hidden flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    isDarkMode 
                      ? 'bg-gray-700/60 hover:bg-gray-600/60 text-yellow-400' 
                      : 'bg-white/60 hover:bg-white/80 text-gray-600 hover:text-gray-900'
                  } hover:shadow-md`}
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? (
                    <SunIcon className="w-5 h-5" />
                  ) : (
                    <MoonIcon className="w-5 h-5" />
                  )}
                </button>
                {isAuthenticated && (
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className={`p-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                      isDarkMode 
                        ? 'bg-gray-700/60 hover:bg-gray-600/60 text-gray-300' 
                        : 'bg-white/60 hover:bg-white/80 text-gray-600 hover:text-gray-900'
                    } hover:shadow-md`}
                  >
                    {isMobileMenuOpen ? (
                      <XMarkIcon className="w-6 h-6" />
                    ) : (
                      <Bars3Icon className="w-6 h-6" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && isAuthenticated && (
              <div className={`lg:hidden absolute top-full left-0 right-0 z-50 backdrop-blur-md shadow-xl border-b transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800/95 border-gray-700/20' 
                  : 'bg-white/95 border-white/20'
              }`}>
                <div className="px-4 py-4 space-y-2">
                  <MobileNavLink 
                    to="/dashboard" 
                    active={activeTab === 'dashboard'} 
                    onClick={() => {
                      setActiveTab('dashboard');
                      setIsMobileMenuOpen(false);
                    }} 
                    icon={ChartBarIcon}
                  >
                    Dashboard
                  </MobileNavLink>

                  {(user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN') || permissionsLoading || hasPermission('canManageDevices')) && (
                    <MobileNavLink 
                      to="/monitor" 
                      active={activeTab === 'monitor'} 
                      onClick={() => {
                        setActiveTab('monitor');
                        setIsMobileMenuOpen(false);
                      }} 
                      icon={ComputerDesktopIcon}
                    >
                      Live Monitor
                    </MobileNavLink>
                  )}
                  {(user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN') || permissionsLoading || hasPermission('canViewHistory')) && (
                    <MobileNavLink 
                      to="/history" 
                      active={activeTab === 'history'} 
                      onClick={() => {
                        setActiveTab('history');
                        setIsMobileMenuOpen(false);
                      }} 
                      icon={ClockIcon}
                    >
                      Device History
                    </MobileNavLink>
                  )}
                  {(user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN') || permissionsLoading || hasPermission('canGenerateScripts')) && (
                    <MobileNavLink 
                      to="/generator" 
                      active={activeTab === 'generator'} 
                      onClick={() => {
                        setActiveTab('generator');
                        setIsMobileMenuOpen(false);
                      }} 
                      icon={CodeBracketIcon}
                    >
                      Script Generator
                    </MobileNavLink>
                  )}
                  
                  {/* Admin-only routes - Always show for SUPER_ADMIN */}
                  {(user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN') || hasPermission('canManageUsers')) && (
                    <MobileNavLink to="/users" active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} icon={UserIcon}>
                      Users
                    </MobileNavLink>
                  )}
                  {(user?.role === 'SUPER_ADMIN' || user?.roles?.includes('SUPER_ADMIN')) && (
                    <MobileNavLink to="/audit-logs" active={activeTab === 'audit-logs'} onClick={() => { setActiveTab('audit-logs'); setIsMobileMenuOpen(false); }} icon={DocumentTextIcon}>
                      Audit Logs
                    </MobileNavLink>
                  )}
                  
                  {/* Profile */}
                  {/* <MobileNavLink to="/profile" active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} icon={Cog6ToothIcon}>
                    Profile
                  </MobileNavLink> */}
                  
                </div>
              </div>
            )}
          </div>
        </nav>


        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            } />

            <Route path="/monitor" element={
              <RequireAuth>
                <DeviceMonitor />
              </RequireAuth>
            } />
            <Route path="/history" element={
              <RequireAuth>
                <DeviceHistoryDashboard />
              </RequireAuth>
            } />
            <Route path="/generator" element={
              <RequireAuth>
                <ScriptGenerator />
              </RequireAuth>
            } />
            {/* <Route path="/profile" element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            } /> */}
            
            {/* Admin-only routes */}
            <Route path="/users" element={
                <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMINISTRATOR']}>
                  <UserManagement />
                </ProtectedRoute>
              } />
            <Route path="/audit-logs" element={
                <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
                  <AuditLogs />
                </ProtectedRoute>
              } />
            
            {/* API Test route - for debugging */}
            <Route path="/api-test" element={<ApiTest />} />
            <Route path="/connectivity-test" element={<ApiConnectivityTest />} />
            {/* Site management route removed */}
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider>
          <AppContent />
          <NotificationManager />
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}

const NavLink = ({ to, children, active, onClick, icon: Icon }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group relative px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105 ${
        active
          ? isDarkMode
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
          : isDarkMode
            ? 'text-gray-300 hover:text-white hover:bg-gray-700/60'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
      } hover:shadow-md flex items-center space-x-2`}
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl animate-pulse" />
      )}
    </Link>
  );
};

const MobileNavLink = ({ to, children, active, onClick, icon: Icon }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group relative w-full px-4 py-3 rounded-xl font-medium text-base transition-all duration-300 ${
        active
          ? isDarkMode
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
          : isDarkMode
            ? 'text-gray-300 hover:text-white hover:bg-gray-700/60'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
      } hover:shadow-md flex items-center space-x-3 border ${
        active
          ? 'border-transparent'
          : isDarkMode
            ? 'border-gray-700/30 hover:border-gray-600/50'
            : 'border-gray-200/30 hover:border-gray-300/50'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{children}</span>
      {active && (
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      )}
    </Link>
  );
};

export default App;
