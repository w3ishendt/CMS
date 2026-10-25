// (new) Profile page for user settings and password change
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';
import { apiService } from '../services/apiService';
import { RoleGuard } from '../components/auth/RoleGuard';
import { useTheme } from '../contexts/ThemeContext';
import {
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Key,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Edit3,
  Camera,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { isDarkMode } = useTheme();
  const { loading, setLoading } = useAppStore();
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: ''
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // UI state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Initialize profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        department: user.department || ''
      });
    }
  }, [user]);
  
  // Validation functions
  const validateProfile = () => {
    const newErrors = {};
    
    if (!profileData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!profileData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (profileData.phoneNumber && !/^[\+]?[1-9][\d]{0,15}$/.test(profileData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validatePassword = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (!validateProfile()) {
      toast.error('Please fix the validation errors');
      return;
    }
    
    setProfileLoading(true);
    
    try {
      const response = await apiService.updateUser(user.id, profileData);
      
      if (response.success) {
        updateUser(response.data);
        setIsEditingProfile(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('An error occurred while updating profile');
    } finally {
      setProfileLoading(false);
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      toast.error('Please fix the validation errors');
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      const response = await apiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.success) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        toast.success('Password changed successfully');
      } else {
        toast.error(response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('An error occurred while changing password');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  // Handle input changes
  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  const handlePasswordInputChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  // Get role badge color
  const getRoleBadgeColor = (role) => {
    const colors = {
      SUPER_ADMIN: 'from-purple-600 to-indigo-600',
      ADMINISTRATOR: 'from-blue-600 to-cyan-600',
      DISTRIBUTOR: 'from-green-600 to-emerald-600',
      // REMOVED: MULTI_SITE_OPERATOR: 'from-yellow-600 to-orange-600',
      OPERATOR: 'from-gray-600 to-slate-600'
    };
    return colors[role] || 'from-gray-600 to-slate-600';
  };
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Profile Settings</h1>
                <p className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Manage your account settings and preferences</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${
                getRoleBadgeColor(user.role)
              } text-white`}>
                {user.role.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="text-center">
                {/* Avatar */}
                <div className="relative mx-auto w-24 h-24 mb-4">
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${
                    getRoleBadgeColor(user.role)
                  } flex items-center justify-center text-white text-2xl font-bold`}>
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <button className={`absolute bottom-0 right-0 p-2 rounded-full shadow-lg transition-colors duration-300 ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'
                  } border`}>
                    <Camera className={`w-4 h-4 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`} />
                  </button>
                </div>
                
                <h3 className={`text-lg font-semibold mb-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {user.firstName} {user.lastName}
                </h3>
                
                <p className={`text-sm mb-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  @{user.username}
                </p>
                
                {/* User Info */}
                <div className="space-y-3 text-left">
                  <div className="flex items-center space-x-3">
                    <Mail className={`w-4 h-4 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <span className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>{user.email}</span>
                  </div>
                  
                  {user.phoneNumber && (
                    <div className="flex items-center space-x-3">
                      <Phone className={`w-4 h-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <span className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>{user.phoneNumber}</span>
                    </div>
                  )}
                  
                  {user.department && (
                    <div className="flex items-center space-x-3">
                      <Building className={`w-4 h-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <span className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>{user.department}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <Shield className={`w-4 h-4 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <span className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>{user.role.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile Form & Password Change */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Information */}
            <div className={`rounded-xl shadow-lg transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Settings className={`w-5 h-5 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>Profile Information</h3>
                  </div>
                  
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleProfileUpdate}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => handleProfileChange('firstName', e.target.value)}
                        disabled={!isEditingProfile}
                        className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.firstName ? 'border-red-500' : ''
                        }`}
                        placeholder="Enter your first name"
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.firstName}
                        </p>
                      )}
                    </div>
                    
                    {/* Last Name */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => handleProfileChange('lastName', e.target.value)}
                        disabled={!isEditingProfile}
                        className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.lastName ? 'border-red-500' : ''
                        }`}
                        placeholder="Enter your last name"
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleProfileChange('email', e.target.value)}
                        disabled={!isEditingProfile}
                        className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.email ? 'border-red-500' : ''
                        }`}
                        placeholder="Enter your email address"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                    
                    {/* Phone Number */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phoneNumber}
                        onChange={(e) => handleProfileChange('phoneNumber', e.target.value)}
                        disabled={!isEditingProfile}
                        className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.phoneNumber ? 'border-red-500' : ''
                        }`}
                        placeholder="Enter your phone number"
                      />
                      {errors.phoneNumber && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.phoneNumber}
                        </p>
                      )}
                    </div>
                    
                    {/* Department */}
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Department
                      </label>
                      <input
                        type="text"
                        value={profileData.department}
                        onChange={(e) => handleProfileChange('department', e.target.value)}
                        disabled={!isEditingProfile}
                        className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                        placeholder="Enter your department"
                      />
                    </div>
                  </div>
                  
                  {isEditingProfile && (
                    <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setErrors({});
                          // Reset form data
                          setProfileData({
                            firstName: user.firstName || '',
                            lastName: user.lastName || '',
                            email: user.email || '',
                            phoneNumber: user.phoneNumber || '',
                            department: user.department || ''
                          });
                        }}
                        className={`px-6 py-2 rounded-lg border transition-all duration-200 ${
                          isDarkMode 
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Cancel
                      </button>
                      
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {profileLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>{profileLoading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
            
            {/* Password Change */}
            <div className={`rounded-xl shadow-lg transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <Key className={`w-5 h-5 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Change Password</h3>
                </div>
                <p className={`mt-1 text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Update your password to keep your account secure</p>
              </div>
              
              <div className="p-6">
                <form onSubmit={handlePasswordChange}>
                  <div className="space-y-6">
                    {/* Current Password */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Current Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                          className={`w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-200 ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                          } focus:ring-2 focus:ring-blue-500/20 ${
                            errors.currentPassword ? 'border-red-500' : ''
                          }`}
                          placeholder="Enter your current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                            isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.currentPassword}
                        </p>
                      )}
                    </div>
                    
                    {/* New Password */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                          className={`w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-200 ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                          } focus:ring-2 focus:ring-blue-500/20 ${
                            errors.newPassword ? 'border-red-500' : ''
                          }`}
                          placeholder="Enter your new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                            isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.newPassword && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.newPassword}
                        </p>
                      )}
                      <p className={`mt-1 text-xs transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Password must be at least 8 characters with uppercase, lowercase, and number
                      </p>
                    </div>
                    
                    {/* Confirm Password */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Confirm New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                          className={`w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-200 ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                          } focus:ring-2 focus:ring-blue-500/20 ${
                            errors.confirmPassword ? 'border-red-500' : ''
                          }`}
                          placeholder="Confirm your new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                            isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {passwordLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Key className="w-4 h-4" />
                      )}
                      <span>{passwordLoading ? 'Changing...' : 'Change Password'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;